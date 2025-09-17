import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { schema } from '@/lib/database/schema';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { fandomSchema } from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';
import { eq } from 'drizzle-orm';
import { fandoms, tags, plotBlocks, stories } from '@/lib/database/schema';

/**
 * GET /api/v1/fandoms/[id]
 * Get a specific fandom by ID
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const fandomId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      const fandom = await db.query.fandoms.findFirst({
        where: eq(fandoms.id, fandomId),
      });

      if (!fandom) {
        throw ErrorFactory.notFound('Fandom', fandomId);
      }

      return ResponseHandler.success(fandom);
    }
  )
);

/**
 * PUT /api/v1/fandoms/[id]
 * Update a specific fandom (Admin only)
 */
export const PUT = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const fandomId = params.id;
      const body = await request.json();
      const validatedData = fandomSchema.partial().parse(body);

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if fandom exists
      const existingFandom = await db.query.fandoms.findFirst({
        where: eq(fandoms.id, fandomId),
      });

      if (!existingFandom) {
        throw ErrorFactory.notFound('Fandom', fandomId);
      }

      // Check for slug conflicts if slug is being updated
      if (validatedData.slug && validatedData.slug !== existingFandom.slug) {
        const conflictingFandom = await db.query.fandoms.findFirst({
          where: eq(fandoms.slug, validatedData.slug),
        });

        if (conflictingFandom) {
          throw ErrorFactory.businessRule(
            'duplicate_fandom_slug',
            `Fandom with slug "${validatedData.slug}" already exists`
          );
        }
      }

      // Update fandom
      const [updatedFandom] = await db
        .update(fandoms)
        .set({
          ...validatedData,
          updated_at: new Date(),
        })
        .where(eq(fandoms.id, fandomId))
        .returning();

      return ResponseHandler.success(updatedFandom);
    }
  )
);

/**
 * DELETE /api/v1/fandoms/[id]
 * Delete a specific fandom (Admin only)
 */
export const DELETE = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const fandomId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if fandom exists
      const existingFandom = await db.query.fandoms.findFirst({
        where: eq(fandoms.id, fandomId),
      });

      if (!existingFandom) {
        throw ErrorFactory.notFound('Fandom', fandomId);
      }

      // Check for dependencies (tags, plot blocks, stories)
      const [tagCount, plotBlockCount, storyCount] = await Promise.all([
        db.query.tags.findMany({ where: eq(tags.fandom_id, fandomId) }),
        db.query.plotBlocks.findMany({
          where: eq(plotBlocks.fandom_id, fandomId),
        }),
        db.query.stories.findMany({ where: eq(stories.fandom_id, fandomId) }),
      ]);

      if (
        tagCount.length > 0 ||
        plotBlockCount.length > 0 ||
        storyCount.length > 0
      ) {
        throw ErrorFactory.businessRule(
          'fandom_has_dependencies',
          `Cannot delete fandom with existing tags (${tagCount.length}), plot blocks (${plotBlockCount.length}), or stories (${storyCount.length})`
        );
      }

      // Soft delete by setting is_active to false
      const [deletedFandom] = await db
        .update(fandoms)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(fandoms.id, fandomId))
        .returning();

      return ResponseHandler.success(deletedFandom);
    }
  )
);
