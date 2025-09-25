import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { QueryBuilder } from '@/lib/database/queries';
import { schema } from '@/lib/database/schema';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { fandomSchema, createFandomSchema } from '@/lib/validation/schemas';
import { ErrorFactory } from '@/lib/errors';

/**
 * GET /api/v1/fandoms
 * List all fandoms with pagination and search
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    if (page < 1 || limit < 1 || limit > 100) {
      throw ErrorFactory.validation('Invalid pagination parameters');
    }

    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();
    const queryBuilder = new QueryBuilder(db);

    if (search) {
      const fandoms = await queryBuilder.fandoms.search(search, limit);
      return ResponseHandler.success(fandoms, {
        metadata: { search_term: search, total_results: fandoms.length },
      });
    }

    const fandomsWithCounts = await queryBuilder.fandoms.findWithStoryCounts();

    // Manual pagination since we're getting counts
    const offset = (page - 1) * limit;
    const paginatedFandoms = fandomsWithCounts.slice(offset, offset + limit);
    const total = fandomsWithCounts.length;

    return ResponseHandler.paginated(paginatedFandoms, {
      page,
      limit,
      total,
    });
  })
);

/**
 * POST /api/v1/fandoms
 * Create a new fandom (Admin only)
 */
export const POST = CommonMiddleware.admin(
  withErrorHandling(async (request: NextRequest, authContext: any) => {
    const body = await request.json();
    const validatedData = createFandomSchema.parse(body);

    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Generate slug if not provided
    const slug =
      validatedData.slug ||
      validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    // Check if fandom already exists
    const existingFandom = await db.query.fandoms.findFirst({
      where: (fandoms, { eq }) => eq(fandoms.slug, slug),
    });

    if (existingFandom) {
      throw ErrorFactory.businessRule(
        'duplicate_fandom',
        `Fandom with slug "${slug}" already exists`
      );
    }

    // Insert new fandom
    const [newFandom] = await db
      .insert(schema.fandoms)
      .values({
        id: crypto.randomUUID(),
        name: validatedData.name,
        slug: slug,
        description: validatedData.description || '',
        is_active: validatedData.is_active ?? true,
      })
      .returning();

    return ResponseHandler.success(newFandom, { status: 201 });
  })
);
