/**
 * Tag Classes API Endpoints
 *
 * Provides REST API for tag class management:
 * - GET /api/admin/tag-classes - List tag classes with fandom scoping
 * - POST /api/admin/tag-classes - Create new tag class
 * - Supports both ProjectAdmin (all fandoms) and FandomAdmin (scoped) access
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api/clerk-auth';
import { AdminPermissions } from '@/lib/admin/permissions';
import { AdminQueries } from '@/lib/database/admin-queries';
import { getDatabase } from '@/lib/database';

import { z } from 'zod';

// Tag class creation validation schema
const createTagClassSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  fandomId: z.string().min(1, 'Fandom ID is required'),
  category: z.string().min(1, 'Category is required'),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  validationRules: z
    .array(
      z.object({
        type: z.string(),
        message: z.string(),
        severity: z.enum(['error', 'warning', 'info']),
        data: z.record(z.any()).optional(),
      })
    )
    .default([]),
  metadata: z.record(z.any()).optional(),
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
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * GET /api/admin/tag-classes
 * Lists tag classes with fandom scoping
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();

    if (!authResult.success) {
      return (
        authResult.response ??
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    const user = authResult.user;

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

    // Get database connection and query tag classes
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);

    let result;
    if (validatedQuery.fandomId) {
      // Fandom-specific query
      result = await adminQueries.tagClasses.listByFandom(
        validatedQuery.fandomId,
        {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          sortBy: validatedQuery.sortBy,
          sortOrder: validatedQuery.sortOrder,
        }
      );
    } else {
      // Query based on user access
      result = await adminQueries.tagClasses.getByUserAccess(adminUser, {
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
    console.error('Error fetching tag classes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tag-classes
 * Creates a new tag class
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();

    if (!authResult.success) {
      return (
        authResult.response ??
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    const user = authResult.user;

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

    const validationResult = createTagClassSchema.safeParse(body);
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

    const tagClassData = validationResult.data;

    // Check permission to create tag class for this fandom
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'tag-class:create',
      tagClassData.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to create tag class for this fandom',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    // Create the tag class
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);

    const newTagClass = await adminQueries.tagClasses.create(
      tagClassData as any // Type assertion for complex nested type
    );

    return NextResponse.json(
      {
        success: true,
        tagClass: newTagClass,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tag class:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
