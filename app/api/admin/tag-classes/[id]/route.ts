/**
 * Individual Tag Class API Endpoints
 *
 * Provides REST API for individual tag class operations:
 * - GET /api/admin/tag-classes/[id] - Get specific tag class
 * - PUT /api/admin/tag-classes/[id] - Update tag class
 * - DELETE /api/admin/tag-classes/[id] - Delete tag class
 * - Role-based access control and fandom scoping
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

// Update tag class validation schema
const updateTagClassSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  validationRules: z
    .array(
      z.object({
        type: z.string(),
        message: z.string(),
        severity: z.enum(['error', 'warning', 'info']),
        data: z.record(z.any()).optional(),
      })
    )
    .optional(),
  metadata: z.record(z.any()).optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/admin/tag-classes/[id]
 * Retrieves a specific tag class
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const tagClassId = params.id;

    // Get the tag class
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const tagClass = await adminQueries.tagClasses.getById(tagClassId);

    if (!tagClass) {
      return NextResponse.json(
        { success: false, error: 'Tag class not found' },
        { status: 404 }
      );
    }

    // Check permission to view tag class
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'tag-class:read',
      tagClass.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to view this tag class',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      tagClass,
    });
  } catch (error) {
    console.error('Error fetching tag class:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tag-classes/[id]
 * Updates a tag class
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const tagClassId = params.id;

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

    const validationResult = updateTagClassSchema.safeParse(body);
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

    // Get existing tag class to check permissions
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const existingTagClass = await adminQueries.tagClasses.getById(tagClassId);

    if (!existingTagClass) {
      return NextResponse.json(
        { success: false, error: 'Tag class not found' },
        { status: 404 }
      );
    }

    // Check permission to update tag class
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'tag-class:update',
      existingTagClass.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to update this tag class',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    // Update the tag class
    const updatedTagClass = await adminQueries.tagClasses.update(
      tagClassId,
      validationResult.data as any, // Type assertion for complex nested type
      adminUser.id
    );

    return NextResponse.json({
      success: true,
      tagClass: updatedTagClass,
    });
  } catch (error) {
    console.error('Error updating tag class:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tag-classes/[id]
 * Deletes a tag class
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const tagClassId = params.id;

    // Get existing tag class to check permissions
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const existingTagClass = await adminQueries.tagClasses.getById(tagClassId);

    if (!existingTagClass) {
      return NextResponse.json(
        { success: false, error: 'Tag class not found' },
        { status: 404 }
      );
    }

    // Check permission to delete tag class
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'tag-class:delete',
      existingTagClass.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to delete this tag class',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    // Delete the tag class
    await adminQueries.tagClasses.delete(tagClassId, adminUser.id);

    return NextResponse.json({
      success: true,
      message: 'Tag class deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tag class:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
