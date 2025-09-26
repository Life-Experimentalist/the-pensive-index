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
import { checkAdminAuth } from '@/lib/api/clerk-auth';

/**
 * GET /api/admin/permissions
 * Returns available permissions for the current admin user
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await checkAdminAuth();

    if (!authResult.success) {
      return (
        authResult.response ??
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    // For now, return a simplified permissions structure
    // In a full implementation, you'd check the user's role from Clerk metadata
    const permissions = [
      {
        id: 'rule:read',
        action: 'read',
        resource: 'rules',
        granted: true,
      },
      {
        id: 'rule:write',
        action: 'write',
        resource: 'rules',
        granted: true,
      },
      {
        id: 'template:read',
        action: 'read',
        resource: 'templates',
        granted: true,
      },
      {
        id: 'template:write',
        action: 'write',
        resource: 'templates',
        granted: true,
      },
    ];

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
