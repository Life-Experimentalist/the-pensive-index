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
import { checkAdminAuth } from '@/lib/api/clerk-auth';
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
    // Check admin authentication
    const authResult = await checkAdminAuth();

    if (!authResult.success) {
      return authResult.response!;
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

    // For now, simplified permission check - all authenticated users have admin permissions
    // In a full implementation, you'd check user metadata from Clerk
    const hasPermission = true; // Simplified for now

    return NextResponse.json({
      success: true,
      hasPermission,
      scope: 'admin',
      resource: resource || 'global',
      reason: hasPermission ? 'Permission granted' : 'Permission denied',
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
