import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

// This would typically come from your database
interface UserRoleAssignment {
  userId: string;
  role: string;
  fandoms: string[];
  customPermissions: Record<string, boolean>;
}

// Mock data - replace with actual database queries
const mockUserAssignments: UserRoleAssignment[] = [
  {
    userId: 'user_1',
    role: 'super-admin',
    fandoms: ['all'],
    customPermissions: {},
  },
  {
    userId: 'user_2',
    role: 'project-admin',
    fandoms: ['harry-potter', 'percy-jackson'],
    customPermissions: {},
  },
  {
    userId: 'user_3',
    role: 'fandom-admin',
    fandoms: ['harry-potter'],
    customPermissions: {},
  },
];

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's role assignment from database
    const userAssignment = mockUserAssignments.find(
      ua => ua.userId === userId
    ) || {
      userId,
      role: 'user',
      fandoms: [],
      customPermissions: {},
    };

    return NextResponse.json({
      role: userAssignment.role,
      fandoms: userAssignment.fandoms,
      customPermissions: userAssignment.customPermissions,
    });
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { permissions } = await request.json();

    // Check specific permissions for the current user
    const userAssignment = mockUserAssignments.find(ua => ua.userId === userId);

    if (!userAssignment) {
      return NextResponse.json({
        hasAccess: false,
        reason: 'User not found',
      });
    }

    // This would implement your permission checking logic
    const results: Record<string, boolean> = {};

    for (const permission of permissions) {
      // Mock permission checking - replace with actual logic
      results[permission] =
        userAssignment.role === 'super-admin' ||
        (userAssignment.role === 'project-admin' &&
          permission !== 'canDeleteUsers') ||
        (userAssignment.role === 'fandom-admin' &&
          permission.includes('Fandom'));
    }

    return NextResponse.json({
      hasAccess: true,
      permissions: results,
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
