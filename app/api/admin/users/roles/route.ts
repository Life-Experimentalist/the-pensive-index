/**
 * User Role Management Endpoint
 *
 * Allows admins to assign roles to users with proper permission checks:
 * - ProjectAdmin: Can manage all users and assign any role
 * - FandomAdmin: Can only manage users within their assigned fandoms
 * - Regular users: Cannot access this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize database connection
const dbPath = path.join(process.cwd(), 'data', 'the-pensive-index.db');
const db = new Database(dbPath);

// Helper function to get user's fandom assignments
function getUserFandomAssignments(userId: string) {
  const stmt = db.prepare(`
    SELECT ufa.*, f.name as fandom_name, f.slug as fandom_slug
    FROM user_fandom_assignments ufa
    JOIN fandoms f ON ufa.fandom_id = f.id
    WHERE ufa.user_id = ? AND ufa.is_active = 1
  `);
  return stmt.all(userId);
}

// Helper function to check if user can manage target user
function canManageUser(
  currentUserId: string,
  targetUserId: string,
  currentUserRole: string
) {
  if (currentUserRole === 'ProjectAdmin') {
    return true; // ProjectAdmin can manage anyone
  }

  if (currentUserRole === 'FandomAdmin') {
    // FandomAdmin can only manage users in their assigned fandoms
    const currentUserFandoms = getUserFandomAssignments(currentUserId);
    const targetUserFandoms = getUserFandomAssignments(targetUserId);

    // Check if there's any overlap in fandom assignments
    return currentUserFandoms.some((currentFandom: any) =>
      targetUserFandoms.some(
        (targetFandom: any) =>
          currentFandom.fandom_id === targetFandom.fandom_id
      )
    );
  }

  return false; // Regular users cannot manage anyone
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    const currentUserRole = currentUser.publicMetadata?.role as string;

    // Only admins can access user management
    if (
      currentUserRole !== 'ProjectAdmin' &&
      currentUserRole !== 'FandomAdmin'
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all users from Clerk
    const usersResponse = await client.users.getUserList({ limit: 100 });

    // Get fandom assignments for all users
    const usersWithAssignments = await Promise.all(
      usersResponse.data.map(user => {
        const fandomAssignments = getUserFandomAssignments(user.id);

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddresses: user.emailAddresses,
          role: user.publicMetadata?.role || 'User',
          fandomAssignments: fandomAssignments,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
          canManage: canManageUser(userId, user.id, currentUserRole),
        };
      })
    );

    // If FandomAdmin, filter to only users they can manage
    let filteredUsers = usersWithAssignments;
    if (currentUserRole === 'FandomAdmin') {
      filteredUsers = usersWithAssignments.filter(
        user => user.canManage || user.id === userId
      );
    }

    return NextResponse.json({
      users: filteredUsers,
      currentUserRole,
      currentUserFandoms: getUserFandomAssignments(userId),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    const currentUserRole = currentUser.publicMetadata?.role as string;

    // Only admins can assign roles
    if (
      currentUserRole !== 'ProjectAdmin' &&
      currentUserRole !== 'FandomAdmin'
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { targetUserId, role, fandomIds } = await request.json();

    if (!targetUserId || !role) {
      return NextResponse.json(
        { error: 'targetUserId and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['User', 'FandomAdmin', 'ProjectAdmin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Permission checks based on current user role
    if (currentUserRole === 'FandomAdmin') {
      // FandomAdmin cannot promote users to ProjectAdmin
      if (role === 'ProjectAdmin') {
        return NextResponse.json(
          { error: 'FandomAdmin cannot assign ProjectAdmin role' },
          { status: 403 }
        );
      }

      // FandomAdmin can only manage users within their fandoms
      if (!canManageUser(userId, targetUserId, currentUserRole)) {
        return NextResponse.json(
          { error: 'You can only manage users within your assigned fandoms' },
          { status: 403 }
        );
      }
    }

    // Update user role in Clerk
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        role: role,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      },
    });

    // Handle fandom assignments for FandomAdmin role
    if (role === 'FandomAdmin' && fandomIds && Array.isArray(fandomIds)) {
      // Clear existing assignments
      const clearStmt = db.prepare(
        'UPDATE user_fandom_assignments SET is_active = 0 WHERE user_id = ?'
      );
      clearStmt.run(targetUserId);

      // Add new assignments
      const insertStmt = db.prepare(`
        INSERT INTO user_fandom_assignments (user_id, fandom_id, role, assigned_by)
        VALUES (?, ?, 'FandomAdmin', ?)
      `);

      for (const fandomId of fandomIds) {
        insertStmt.run(targetUserId, fandomId, userId);
      }
    } else if (role !== 'FandomAdmin') {
      // Clear fandom assignments for non-FandomAdmin roles
      const clearStmt = db.prepare(
        'UPDATE user_fandom_assignments SET is_active = 0 WHERE user_id = ?'
      );
      clearStmt.run(targetUserId);
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role} successfully`,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  } finally {
    // Note: We don't close the database connection as it's shared
  }
}
