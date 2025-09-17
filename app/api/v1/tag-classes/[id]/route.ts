import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { tagClassSchema } from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';
import { and, eq } from 'drizzle-orm';
import { tagClasses, tags } from '@/lib/database/schema';

/**
 * GET /api/v1/tag-classes/[id]
 * Get a specific tag class by ID
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const tagClassId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      const tagClass = await db.query.tagClasses.findFirst({
        where: eq(tagClasses.id, tagClassId),
        with: {
          fandom: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!tagClass) {
        throw ErrorFactory.notFound('TagClass', tagClassId);
      }

      return ResponseHandler.success(tagClass);
    }
  )
);

/**
 * PUT /api/v1/tag-classes/[id]
 * Update a specific tag class (Admin only)
 */
export const PUT = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const tagClassId = params.id;
      const body = await request.json();
      const validatedData = tagClassSchema.partial().parse(body);

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if tag class exists
      const existingTagClass = await db.query.tagClasses.findFirst({
        where: eq(tagClasses.id, tagClassId),
      });

      if (!existingTagClass) {
        throw ErrorFactory.notFound('TagClass', tagClassId);
      }

      // Check for name conflicts if name is being updated
      if (validatedData.name && validatedData.name !== existingTagClass.name) {
        const conflictingTagClass = await db.query.tagClasses.findFirst({
          where: and(
            eq(tagClasses.fandom_id, existingTagClass.fandom_id),
            eq(tagClasses.name, validatedData.name)
          ),
        });

        if (conflictingTagClass) {
          throw ErrorFactory.businessRule(
            'duplicate_tag_class_name',
            `Tag class with name "${validatedData.name}" already exists in this fandom`
          );
        }
      }

      // Update tag class
      const [updatedTagClass] = await db
        .update(tagClasses)
        .set({
          ...validatedData,
          updated_at: new Date(),
        })
        .where(eq(tagClasses.id, tagClassId))
        .returning();

      // Return updated tag class with fandom information
      const tagClassWithFandom = await db.query.tagClasses.findFirst({
        where: eq(tagClasses.id, updatedTagClass.id),
        with: {
          fandom: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      return ResponseHandler.success(tagClassWithFandom);
    }
  )
);

/**
 * DELETE /api/v1/tag-classes/[id]
 * Delete a specific tag class (Admin only)
 */
export const DELETE = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const tagClassId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if tag class exists
      const existingTagClass = await db.query.tagClasses.findFirst({
        where: eq(tagClasses.id, tagClassId),
      });

      if (!existingTagClass) {
        throw ErrorFactory.notFound('TagClass', tagClassId);
      }

      // Check for dependencies (tags using this tag class)
      const tagsUsingClass = await db.query.tags.findMany({
        where: eq(tags.tag_class_id, tagClassId),
      });

      if (tagsUsingClass.length > 0) {
        throw ErrorFactory.businessRule(
          'tag_class_has_dependencies',
          `Cannot delete tag class with existing tags (${tagsUsingClass.length})`
        );
      }

      // Soft delete by setting is_active to false
      const [deletedTagClass] = await db
        .update(tagClasses)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(tagClasses.id, tagClassId))
        .returning();

      return ResponseHandler.success(deletedTagClass);
    }
  )
);
