import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { ErrorFactory } from '@/lib/errors';
import { eq, and } from 'drizzle-orm';
import { validationRules, fandoms } from '@/lib/database/schema';
import {
  CreateValidationRuleRequestSchema,
  UpdateValidationRuleRequestSchema,
} from '@/types/validation-rules';

/**
 * GET /api/v1/validation-rules
 * Get all validation rules for admin interface
 */
export const GET = CommonMiddleware.admin(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const fandomId = searchParams.get('fandom_id');
    const isActive = searchParams.get('is_active');

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    let query = db.query.validationRules.findMany({
      with: {
        conditions: true,
        actions: true,
      },
      orderBy: (rules, { asc }) => [asc(rules.priority), asc(rules.name)],
    });

    // Apply filters
    const filters = [];
    if (fandomId) {
      filters.push(eq(validationRules.fandom_id, fandomId));
    }
    if (isActive !== null) {
      filters.push(eq(validationRules.is_active, isActive === 'true'));
    }

    if (filters.length > 0) {
      query = db.query.validationRules.findMany({
        where: and(...filters),
        with: {
          conditions: true,
          actions: true,
        },
        orderBy: (rules, { asc }) => [asc(rules.priority), asc(rules.name)],
      });
    }

    const rules = await query;

    return ResponseHandler.success({
      rules,
      total: rules.length,
      filters: {
        fandom_id: fandomId,
        is_active: isActive,
      },
    });
  })
);

/**
 * POST /api/v1/validation-rules
 * Create a new validation rule
 */
export const POST = CommonMiddleware.admin(
  withErrorHandling(async (request: NextRequest) => {
    const body = await request.json();

    // Validate request body
    const validatedData = CreateValidationRuleRequestSchema.parse(body);

    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    // Verify fandom exists and user has access
    const fandom = await db.query.fandoms.findFirst({
      where: eq(fandoms.id, validatedData.fandomId),
    });

    if (!fandom) {
      throw ErrorFactory.notFound('Fandom', validatedData.fandomId);
    }

    // Create the validation rule
    // Use ruleType as category and omit applies_to (defaults to empty array)
    const [newRule] = await db
      .insert(validationRules)
      .values({
        id: crypto.randomUUID(),
        fandom_id: validatedData.fandomId,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.ruleType, // map ruleType to category
        priority: validatedData.priority || 1,
        is_active: true,
        applies_to: [], // default no specific applies_to when not provided
        created_by: 'admin',
        version: '1.0.0',
      })
      .returning();

    return ResponseHandler.success(
      {
        rule: newRule,
        message: 'Validation rule created successfully',
      },
      { status: 201 }
    );
  })
);
