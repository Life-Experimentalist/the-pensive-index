import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { tagSchema, createTagSchema } from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';
import { and, eq, ilike } from 'drizzle-orm';
import { tags, fandoms } from '@/lib/database/schema';

/**
 * GET /api/v1/tags
 * List tags with filtering and pagination
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const fandomId = searchParams.get('fandom_id');
    const tagClassId = searchParams.get('tag_class_id');
    const name = searchParams.get('name');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    // Build filter conditions
    const conditions = [];

    if (fandomId) {
      conditions.push(eq(tags.fandom_id, fandomId));
    }

    if (tagClassId) {
      conditions.push(eq(tags.tag_class_id, tagClassId));
    }

    if (name) {
      conditions.push(ilike(tags.name, `%${name}%`));
    }

    // Always filter to active tags
    conditions.push(eq(tags.is_active, true));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get tags with fandom information
    const tagList = await db.query.tags.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [tags.name],
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
    const totalQuery = await db.query.tags.findMany({
      where: whereClause,
      columns: { id: true },
    });
    const total = totalQuery.length;

    return ResponseHandler.paginated(tagList, {
      page,
      limit,
      total,
    });
  })
);

/**
 * POST /api/v1/tags
 * Create a new tag (Admin only)
 */
export const POST = CommonMiddleware.admin(
  withErrorHandling(async (request: NextRequest, authContext: any) => {
    const body = await request.json();
    const validatedData = createTagSchema.parse(body);

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    // Ensure fandom_id is provided (since it's required in creation)
    if (!validatedData.fandom_id) {
      throw ErrorFactory.businessRule(
        'missing_fandom_id',
        'Fandom ID is required for tag creation'
      );
    }

    // Verify fandom exists
    const fandom = await db.query.fandoms.findFirst({
      where: eq(fandoms.id, validatedData.fandom_id),
    });

    if (!fandom) {
      throw ErrorFactory.notFound('Fandom', validatedData.fandom_id);
    }

    // Check for duplicate tag name within fandom
    const existingTag = await db.query.tags.findFirst({
      where: and(
        eq(tags.fandom_id, validatedData.fandom_id),
        eq(tags.name, validatedData.name)
      ),
    });

    if (existingTag) {
      throw ErrorFactory.businessRule(
        'duplicate_tag_name',
        `Tag with name "${validatedData.name}" already exists in this fandom`
      );
    }

    // Generate ID
    const id = crypto.randomUUID();

    // Create tag
    const [newTag] = await db
      .insert(tags)
      .values({
        id,
        name: validatedData.name,
        fandom_id: validatedData.fandom_id,
        description: validatedData.description,
        category: validatedData.category,
        is_active: validatedData.is_active ?? true,
        requires: validatedData.requires,
        enhances: validatedData.enhances,
        tag_class_id: validatedData.tag_class_id,
      })
      .returning();

    // Return tag with fandom information
    const tagWithFandom = await db.query.tags.findFirst({
      where: eq(tags.id, newTag.id),
      with: {
        fandom: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return ResponseHandler.success(tagWithFandom, { status: 201 });
  })
);
