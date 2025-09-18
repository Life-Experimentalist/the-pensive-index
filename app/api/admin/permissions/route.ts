/**
 * Admin Permissions API Endpoints
 *
 * Provides REST API for admin permission management:
 * - GET /api/admin/permissions - List user permissions
 * - Authentication and role-based access control
 * - Error handling with proper status codes
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { AdminPermissions } from '@/lib/admin/permissions';
import type { AdminUser } from '@/types/admin';

/**
 * GET /api/admin/permissions
 * Returns available permissions for the current admin user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the session (this would be configured with NextAuth.js)
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

    // Check if user is admin (this would come from your user database)
    const user = session.user as any; // Type assertion for demo

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required',
        },
        { status: 403 }
      );
    }

    // Get user permissions based on role
    const permissions = AdminPermissions.getUserPermissions(user as AdminUser);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error('Error fetching admin permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
