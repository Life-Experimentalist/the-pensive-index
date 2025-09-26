import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { tagClassSchema, createTagClassSchema } from '@/lib/validation/schemas';
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
    const db = dbManager.getConnection();

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
    const validatedData = createTagClassSchema.parse(body);

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    // Ensure fandom_id is provided (since it's required in creation)
    if (!validatedData.fandom_id) {
      throw ErrorFactory.businessRule(
        'missing_fandom_id',
        'Fandom ID is required for tag class creation'
      );
    }

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

    // Generate ID and slug
    const id = crypto.randomUUID();
    const slug =
      validatedData.slug ||
      validatedData.name.toLowerCase().replace(/\s+/g, '-');

    // Transform validation rules to match database schema
    const dbValidationRules = validatedData.validation_rules
      ? {
          mutual_exclusion: validatedData.validation_rules.mutual_exclusion
            ? {
                within_class: true,
                conflicting_tags: Array.isArray(
                  validatedData.validation_rules.mutual_exclusion
                )
                  ? validatedData.validation_rules.mutual_exclusion
                  : [],
              }
            : undefined,
          required_context: validatedData.validation_rules.required_context
            ? {
                required_tags: Array.isArray(
                  validatedData.validation_rules.required_context
                )
                  ? validatedData.validation_rules.required_context
                  : [],
              }
            : undefined,
          instance_limits:
            validatedData.validation_rules.instance_limits ||
            validatedData.validation_rules.max_instances
              ? {
                  max_instances:
                    validatedData.validation_rules.max_instances ||
                    validatedData.validation_rules.instance_limits
                      ?.max_instances,
                }
              : undefined,
          category_restrictions: validatedData.validation_rules
            .category_restrictions
            ? {
                applicable_categories:
                  validatedData.validation_rules.applicable_categories ||
                  validatedData.validation_rules.category_restrictions
                    .applicable_categories,
              }
            : undefined,
          dependencies: validatedData.validation_rules.dependencies,
        }
      : {};

    // Create tag class
    const [newTagClass] = await db
      .insert(tagClasses)
      .values({
        id,
        name: validatedData.name,
        fandom_id: validatedData.fandom_id,
        description: validatedData.description || '',
        validation_rules: dbValidationRules,
        is_active: validatedData.is_active ?? true,
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
