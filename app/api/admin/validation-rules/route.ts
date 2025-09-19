/**
 * Validation Rules API Endpoints
 *
 * Provides REST API for validation rule management:
 * - GET /api/admin/validation-rules - List rules with fandom scoping
 * - POST /api/admin/validation-rules - Create new validation rule
 * - Authentication and role-based access control
 * - Fandom scoping for FandomAdmin users
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api/clerk-auth';
import { AdminPermissions } from '@/lib/admin/permissions';
import { AdminQueries } from '@/lib/database/admin-queries';
import { getDatabase } from '@/lib/database';
import type { AdminUser, ValidationRule } from '@/types/admin';
import { z } from 'zod';

// Request validation schemas
const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  fandomId: z.string().min(1, 'Fandom ID is required'),
  category: z.string().min(1, 'Category is required'),
  priority: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  appliesTo: z.array(z.string()).default([]),
  version: z.string().default('1.0.0'),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  conditions: z
    .array(
      z.object({
        type: z.string(),
        target: z.string(),
        operator: z.string(),
        value: z.any(),
        weight: z.number().optional(),
        groupId: z.string().optional(),
        isNegated: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .optional(),
  actions: z
    .array(
      z.object({
        type: z.string(),
        severity: z.string(),
        message: z.string(),
        data: z.record(z.any()).optional(),
        conditionGroup: z.string().optional(),
      })
    )
    .optional(),
});

const querySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 20)),
  fandomId: z.string().optional(),
  category: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  sortBy: z.string().optional().default('priority'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * GET /api/admin/validation-rules
 * Lists validation rules with fandom scoping
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();
    
    if (!authResult.success) {
      return authResult.response!;
    }

    const user = authResult.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = authResult.user;

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = querySchema.parse(queryParams);

    // Validate fandom access for FandomAdmin
    if (adminUser.role === 'FandomAdmin' && validatedQuery.fandomId) {
      if (!AdminPermissions.isFandomAdmin(adminUser, validatedQuery.fandomId)) {
        return NextResponse.json(
          { success: false, error: 'No access to specified fandom' },
          { status: 403 }
        );
      }
    }

    // Get database connection and query rules
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);

    let result;
    if (validatedQuery.fandomId) {
      // Fandom-specific query
      result = await adminQueries.validationRules.listByFandom(
        validatedQuery.fandomId,
        {
          is_active: validatedQuery.isActive,
          category: validatedQuery.category,
        },
        {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          sortBy: validatedQuery.sortBy,
          sortOrder: validatedQuery.sortOrder,
        }
      );
    } else {
      // Query based on user access
      result = await adminQueries.validationRules.getByUserAccess(adminUser, {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        sortBy: validatedQuery.sortBy,
        sortOrder: validatedQuery.sortOrder,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching validation rules:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/validation-rules
 * Creates a new validation rule
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();
    
    if (!authResult.success) {
      return authResult.response!;
    }

    const user = authResult.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = authResult.user;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = createRuleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const ruleData = validationResult.data;

    // Check permission to create rule for this fandom
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'rule:create',
      ruleData.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to create rule for this fandom',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    // Create the rule
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);

    const newRule = await adminQueries.validationRules.create(
      ruleData as any, // Type assertion for complex nested type
      adminUser.id
    );

    return NextResponse.json(
      {
        success: true,
        rule: newRule,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating validation rule:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
