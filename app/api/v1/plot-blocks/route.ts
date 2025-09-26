import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import {
  plotBlockSchema,
  createPlotBlockSchema,
} from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';
import { and, eq, ilike } from 'drizzle-orm';
import { plotBlocks, fandoms } from '@/lib/database/schema';
import crypto from 'crypto';

/**
 * GET /api/v1/plot-blocks
 * List plot blocks with filtering and pagination
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const fandomId = searchParams.get('fandom_id');
    const category = searchParams.get('category');
    const name = searchParams.get('name');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    // Build filter conditions
    const conditions = [];

    if (fandomId) {
      conditions.push(eq(plotBlocks.fandom_id, fandomId));
    }

    if (category) {
      conditions.push(eq(plotBlocks.category, category));
    }

    if (name) {
      conditions.push(ilike(plotBlocks.name, `%${name}%`));
    }

    // Always filter to active plot blocks
    conditions.push(eq(plotBlocks.is_active, true));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get plot blocks with fandom information
    const plotBlockList = await db.query.plotBlocks.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [plotBlocks.category, plotBlocks.name],
      with: {
        fandom: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalQuery = await db.query.plotBlocks.findMany({
      where: whereClause,
      columns: { id: true },
    });
    const total = totalQuery.length;

    return ResponseHandler.paginated(plotBlockList, {
      page,
      limit,
      total,
    });
  })
);

/**
 * POST /api/v1/plot-blocks
 * Create a new plot block (Admin only)
 */
export const POST = CommonMiddleware.admin(
  withErrorHandling(async (request: NextRequest, authContext: any) => {
    const body = await request.json();
    const validatedData = createPlotBlockSchema.parse(body);

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    // Ensure fandom_id is provided
    if (!validatedData.fandom_id) {
      throw ErrorFactory.validation('fandom_id is required');
    }

    // Verify fandom exists
    const fandom = await db.query.fandoms.findFirst({
      where: eq(fandoms.id, validatedData.fandom_id),
    });

    if (!fandom) {
      throw ErrorFactory.notFound('Fandom', validatedData.fandom_id);
    }

    // Check for duplicate plot block name within fandom
    const existingPlotBlock = await db.query.plotBlocks.findFirst({
      where: and(
        eq(plotBlocks.fandom_id, validatedData.fandom_id),
        eq(plotBlocks.name, validatedData.name)
      ),
    });

    if (existingPlotBlock) {
      throw ErrorFactory.businessRule(
        'duplicate_plot_block_name',
        `Plot block with name "${validatedData.name}" already exists in this fandom`
      );
    }

    // Create plot block
    const [newPlotBlock] = await db
      .insert(plotBlocks)
      .values({
        id: crypto.randomUUID(),
        name: validatedData.name,
        description: validatedData.description || '',
        fandom_id: validatedData.fandom_id,
        parent_id: validatedData.parent_id,
        category: validatedData.category || '',
        is_active: validatedData.is_active ?? true,
        requires: validatedData.requires,
        enhances: validatedData.enhances,
        soft_requires: validatedData.soft_requires,
        enabled_by: validatedData.enabled_by,
        conflicts_with: validatedData.conflicts_with,
        excludes_categories: validatedData.excludes_categories,
        max_instances: validatedData.max_instances,
        children: validatedData.children,
      })
      .returning();

    // Return plot block with fandom information
    const plotBlockWithFandom = await db.query.plotBlocks.findFirst({
      where: eq(plotBlocks.id, newPlotBlock.id),
      with: {
        fandom: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return ResponseHandler.success(plotBlockWithFandom, { status: 201 });
  })
);
