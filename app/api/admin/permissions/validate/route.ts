/**
 * Admin Permission Validation API Endpoint
 *
 * POST /api/admin/permissions/validate
 * Validates if a user has permission to perform a specific action on a resource
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { AdminPermissions } from '@/lib/admin/permissions';
import type { AdminUser } from '@/types/admin';
import { z } from 'zod';

// Request validation schema
const validatePermissionSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  resource: z.string().optional(),
});

/**
 * POST /api/admin/permissions/validate
 * Validates user permission for specific action
 */
export async function POST(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const validationResult = validatePermissionSchema.safeParse(body);
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

    const { action, resource } = validationResult.data;

    // Check if user is admin
    const user = session.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required',
        },
        { status: 403 }
      );
    }

    // Validate the permission request format
    if (!AdminPermissions.isValidPermissionRequest(action, resource)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid permission request format',
        },
        { status: 400 }
      );
    }

    // Check permission
    const permissionResult = AdminPermissions.validatePermission(
      user as AdminUser,
      action,
      resource
    );

    return NextResponse.json({
      success: true,
      hasPermission: permissionResult.hasPermission,
      scope: permissionResult.scope,
      resource: permissionResult.resource,
      reason: permissionResult.reason,
    });
  } catch (error) {
    console.error('Error validating permission:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
