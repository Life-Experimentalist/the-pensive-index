import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { plotBlockSchema } from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';
import { and, eq } from 'drizzle-orm';
import { plotBlocks } from '@/lib/database/schema';

/**
 * GET /api/v1/plot-blocks/[id]
 * Get a specific plot block by ID
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const plotBlockId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      const plotBlock = await db.query.plotBlocks.findFirst({
        where: eq(plotBlocks.id, plotBlockId),
        with: {
          fandom: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!plotBlock) {
        throw ErrorFactory.notFound('PlotBlock', plotBlockId);
      }

      return ResponseHandler.success(plotBlock);
    }
  )
);

/**
 * PUT /api/v1/plot-blocks/[id]
 * Update a specific plot block (Admin only)
 */
export const PUT = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const plotBlockId = params.id;
      const body = await request.json();
      const validatedData = plotBlockSchema.partial().parse(body);

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if plot block exists
      const existingPlotBlock = await db.query.plotBlocks.findFirst({
        where: eq(plotBlocks.id, plotBlockId),
      });

      if (!existingPlotBlock) {
        throw ErrorFactory.notFound('PlotBlock', plotBlockId);
      }

      // Check for name conflicts if name is being updated
      if (validatedData.name && validatedData.name !== existingPlotBlock.name) {
        const conflictingPlotBlock = await db.query.plotBlocks.findFirst({
          where: and(
            eq(plotBlocks.fandom_id, existingPlotBlock.fandom_id),
            eq(plotBlocks.name, validatedData.name)
          ),
        });

        if (conflictingPlotBlock) {
          throw ErrorFactory.businessRule(
            'duplicate_plot_block_name',
            `Plot block with name "${validatedData.name}" already exists in this fandom`
          );
        }
      }

      // Update plot block
      const [updatedPlotBlock] = await db
        .update(plotBlocks)
        .set({
          ...validatedData,
          updated_at: new Date(),
        })
        .where(eq(plotBlocks.id, plotBlockId))
        .returning();

      // Return updated plot block with fandom information
      const plotBlockWithFandom = await db.query.plotBlocks.findFirst({
        where: eq(plotBlocks.id, updatedPlotBlock.id),
        with: {
          fandom: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      return ResponseHandler.success(plotBlockWithFandom);
    }
  )
);

/**
 * DELETE /api/v1/plot-blocks/[id]
 * Delete a specific plot block (Admin only)
 */
export const DELETE = CommonMiddleware.admin(
  withErrorHandling(
    async (
      request: NextRequest,
      authContext: any,
      { params }: { params: { id: string } }
    ) => {
      const plotBlockId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      // Check if plot block exists
      const existingPlotBlock = await db.query.plotBlocks.findFirst({
        where: eq(plotBlocks.id, plotBlockId),
      });

      if (!existingPlotBlock) {
        throw ErrorFactory.notFound('PlotBlock', plotBlockId);
      }

      // Check for dependencies (this would include child plot blocks and story references)
      // For now, we'll just do a soft delete

      // Soft delete by setting is_active to false
      const [deletedPlotBlock] = await db
        .update(plotBlocks)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(plotBlocks.id, plotBlockId))
        .returning();

      return ResponseHandler.success(deletedPlotBlock);
    }
  )
);
