import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Get user role assignments and permissions
 * GET /api/admin/permissions/user
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from Clerk to access metadata
    const user = await clerkClient.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;

    if (!userRole) {
      return NextResponse.json({
        role: 'none',
        permissions: [],
        fandoms: [],
      });
    }

    // Convert role format for consistency
    const normalizedRole = normalizeRole(userRole);

    // Define permissions based on role
    const permissions = getPermissionsForRole(normalizedRole);

    return NextResponse.json({
      role: normalizedRole,
      permissions,
      fandoms: user.publicMetadata?.fandoms || [],
    });
  } catch (error) {
    console.error('Failed to get user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to get user permissions' },
      { status: 500 }
    );
  }
}

/**
 * Update user role assignment
 * POST /api/admin/permissions/user
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user has admin privileges
    const currentUser = await clerkClient.users.getUser(userId);
    const currentUserRole = normalizeRole(
      currentUser.publicMetadata?.role as string
    );

    if (
      !['super-admin', 'project-admin', 'projectadmin'].includes(
        currentUserRole
      )
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, role, fandoms } = body;

    // Update user metadata via Clerk
    await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        role: role,
        fandoms: fandoms || [],
      },
    });

    return NextResponse.json({
      success: true,
      assignment: { userId: targetUserId, role, fandoms },
    });
  } catch (error) {
    console.error('Failed to update user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update user permissions' },
      { status: 500 }
    );
  }
}

function normalizeRole(role: string): string {
  if (!role) return 'none';

  const roleMap: { [key: string]: string } = {
    ProjectAdmin: 'project-admin',
    projectadmin: 'project-admin',
    FandomAdmin: 'fandom-admin',
    fandomadmin: 'fandom-admin',
    SuperAdmin: 'super-admin',
    superadmin: 'super-admin',
    Moderator: 'moderator',
    moderator: 'moderator',
  };

  return roleMap[role] || role.toLowerCase();
}

function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'super-admin':
      return [
        'admin:all',
        'fandom:all',
        'content:all',
        'canManageUsers',
        'canManageRoles',
        'canManageFandoms',
        'canManageInvitations',
      ];
    case 'project-admin':
      return [
        'admin:manage',
        'fandom:all',
        'content:all',
        'canManageUsers',
        'canManageRoles',
        'canManageFandoms',
        'canManageInvitations',
      ];
    case 'fandom-admin':
      return [
        'fandom:manage',
        'content:moderate',
        'canManageFandoms',
        'canManageInvitations',
      ];
    case 'moderator':
      return ['content:moderate'];
    default:
      return [];
  }
}