/**
 * Rule Templates API Endpoints
 *
 * Provides REST API for validation rule template management:
 * - GET /api/admin/rule-templates - List templates (ProjectAdmin only)
 * - POST /api/admin/rule-templates - Create new template (ProjectAdmin only)
 * - Templates are project-wide resources used to create fandom-specific rules
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { AdminPermissions } from '@/lib/admin/permissions';
import { AdminQueries } from '@/lib/database/admin-queries';
import { getDatabase } from '@/lib/database';
import type { AdminUser } from '@/types/admin';
import { z } from 'zod';

// Template creation validation schema
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
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
  category: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * GET /api/admin/rule-templates
 * Lists rule templates (ProjectAdmin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and validate admin access
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = user as AdminUser;

    // Only ProjectAdmin can access templates
    if (adminUser.role !== 'ProjectAdmin') {
      return NextResponse.json(
        { success: false, error: 'ProjectAdmin access required for templates' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = querySchema.parse(queryParams);

    // Get database connection and query templates
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);

    const result = await adminQueries.ruleTemplates.list({
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      filters: {
        category: validatedQuery.category,
        isActive: validatedQuery.isActive,
      },
      sortBy: validatedQuery.sortBy,
      sortOrder: validatedQuery.sortOrder,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching rule templates:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rule-templates
 * Creates a new rule template (ProjectAdmin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and validate admin access
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = user as AdminUser;

    // Only ProjectAdmin can create templates
    if (adminUser.role !== 'ProjectAdmin') {
      return NextResponse.json(
        {
          success: false,
          error: 'ProjectAdmin access required for template creation',
        },
        { status: 403 }
      );
    }

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

    const validationResult = createTemplateSchema.safeParse(body);
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

    // Create the template
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);

    const newTemplate = await adminQueries.ruleTemplates.create(
      validationResult.data as any, // Type assertion for complex nested type
      adminUser.id
    );

    return NextResponse.json(
      {
        success: true,
        template: newTemplate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating rule template:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
