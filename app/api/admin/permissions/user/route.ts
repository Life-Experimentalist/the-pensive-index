import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This would typically come from your database
interface UserRoleAssignment {
  userId: string;
  role: string;
  fandoms: string[];
}

// Mock data - replace with actual database queries
const userRoleAssignments: UserRoleAssignment[] = [
  {
    userId: 'user_1',
    role: 'super_admin',
    fandoms: []
  },
  {
    userId: 'user_2',
    role: 'fandom_admin',
    fandoms: ['harry-potter', 'naruto']
  },
  {
    userId: 'user_3',
    role: 'content_moderator',
    fandoms: ['harry-potter']
  }
];

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

    // Find user's role assignment
    const assignment = userRoleAssignments.find(a => a.userId === userId);

    if (!assignment) {
      return NextResponse.json({
        role: 'none',
        permissions: [],
        fandoms: []
      });
    }

    // Define permissions based on role
    const permissions = getPermissionsForRole(assignment.role);

    return NextResponse.json({
      role: assignment.role,
      permissions,
      fandoms: assignment.fandoms
    });

  } catch (error) {
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

    // Only super_admin can modify permissions
    const adminAssignment = userRoleAssignments.find(a => a.userId === userId);
    if (!adminAssignment || adminAssignment.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, role, fandoms } = body;

    // Update or create assignment
    const existingIndex = userRoleAssignments.findIndex(a => a.userId === targetUserId);
    const newAssignment = { userId: targetUserId, role, fandoms };

    if (existingIndex >= 0) {
      userRoleAssignments[existingIndex] = newAssignment;
    } else {
      userRoleAssignments.push(newAssignment);
    }

    return NextResponse.json({
      success: true,
      assignment: newAssignment
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user permissions' },
      { status: 500 }
    );
  }
}

function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'super_admin':
      return ['admin:all', 'fandom:all', 'content:all'];
    case 'fandom_admin':
      return ['fandom:manage', 'content:moderate'];
    case 'content_moderator':
      return ['content:moderate'];
    default:
      return [];
  }
}