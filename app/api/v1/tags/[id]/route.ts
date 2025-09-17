import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { tagSchema } from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';
import { and, eq } from 'drizzle-orm';
import { tags, fandoms } from '@/lib/database/schema';

/**
 * GET /api/v1/tags/[id]
 * Get a specific tag by ID
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const tagId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      const tag = await db.query.tags.findFirst({
        where: eq(tags.id, tagId),
        with: {
          fandom: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!tag) {
        throw ErrorFactory.notFound('Tag', tagId);
      }

      return ResponseHandler.success(tag);
    }
  )
);

/**
 * PUT /api/v1/tags/[id]
 * Update a specific tag (Admin only)
 */
export const PUT = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const tagId = params.id;
      const body = await request.json();
      const validatedData = tagSchema.partial().parse(body);

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if tag exists
      const existingTag = await db.query.tags.findFirst({
        where: eq(tags.id, tagId),
      });

      if (!existingTag) {
        throw ErrorFactory.notFound('Tag', tagId);
      }

      // Check for name conflicts if name is being updated
      if (validatedData.name && validatedData.name !== existingTag.name) {
        const conflictingTag = await db.query.tags.findFirst({
          where: and(
            eq(tags.fandom_id, existingTag.fandom_id),
            eq(tags.name, validatedData.name)
          ),
        });

        if (conflictingTag) {
          throw ErrorFactory.businessRule(
            'duplicate_tag_name',
            `Tag with name "${validatedData.name}" already exists in this fandom`
          );
        }
      }

      // Update tag
      const [updatedTag] = await db
        .update(tags)
        .set({
          ...validatedData,
          updated_at: new Date(),
        })
        .where(eq(tags.id, tagId))
        .returning();

      // Return updated tag with fandom information
      const tagWithFandom = await db.query.tags.findFirst({
        where: eq(tags.id, updatedTag.id),
        with: {
          fandom: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      return ResponseHandler.success(tagWithFandom);
    }
  )
);

/**
 * DELETE /api/v1/tags/[id]
 * Delete a specific tag (Admin only)
 */
export const DELETE = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const tagId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if tag exists
      const existingTag = await db.query.tags.findFirst({
        where: eq(tags.id, tagId),
      });

      if (!existingTag) {
        throw ErrorFactory.notFound('Tag', tagId);
      }

      // Check for dependencies (stories using this tag)
      // Note: This would require a story_tags junction table in a real implementation
      // For now, we'll just do a soft delete

      // Soft delete by setting is_active to false
      const [deletedTag] = await db
        .update(tags)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(tags.id, tagId))
        .returning();

      return ResponseHandler.success(deletedTag);
    }
  )
);
