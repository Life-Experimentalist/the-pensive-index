import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { tagClassSchema } from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';
import { and, eq, ilike } from 'drizzle-orm';
import { tagClasses, fandoms } from '@/lib/database/schema';

/**
 * GET /api/v1/tag-classes
 * List tag classes with filtering and pagination
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const fandomId = searchParams.get('fandom_id');
    const name = searchParams.get('name');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Build filter conditions
    const conditions = [];

    if (fandomId) {
      conditions.push(eq(tagClasses.fandom_id, fandomId));
    }

    if (name) {
      conditions.push(ilike(tagClasses.name, `%${name}%`));
    }

    // Always filter to active tag classes
    conditions.push(eq(tagClasses.is_active, true));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get tag classes with fandom information
    const tagClassList = await db.query.tagClasses.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [tagClasses.name],
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
    const totalQuery = await db.query.tagClasses.findMany({
      where: whereClause,
      columns: { id: true },
    });
    const total = totalQuery.length;

    return ResponseHandler.paginated(tagClassList, {
      page,
      limit,
      total,
    });
  })
);

/**
 * POST /api/v1/tag-classes
 * Create a new tag class (Admin only)
 */
export const POST = CommonMiddleware.admin(
  withErrorHandling(async (request: NextRequest, authContext: any) => {
    const body = await request.json();
    const validatedData = tagClassSchema.parse(body);

    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Verify fandom exists
    const fandom = await db.query.fandoms.findFirst({
      where: eq(fandoms.id, validatedData.fandom_id),
    });

    if (!fandom) {
      throw ErrorFactory.notFound('Fandom', validatedData.fandom_id);
    }

    // Check for duplicate tag class name within fandom
    const existingTagClass = await db.query.tagClasses.findFirst({
      where: and(
        eq(tagClasses.fandom_id, validatedData.fandom_id),
        eq(tagClasses.name, validatedData.name)
      ),
    });

    if (existingTagClass) {
      throw ErrorFactory.businessRule(
        'duplicate_tag_class_name',
        `Tag class with name "${validatedData.name}" already exists in this fandom`
      );
    }

    // Create tag class
    const [newTagClass] = await db
      .insert(tagClasses)
      .values({
        ...validatedData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Return tag class with fandom information
    const tagClassWithFandom = await db.query.tagClasses.findFirst({
      where: eq(tagClasses.id, newTagClass.id),
      with: {
        fandom: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return ResponseHandler.success(tagClassWithFandom, { status: 201 });
  })
);
