/**
 * Bootstrap Admin Endpoint
 *
 * This endpoint allows the first user to become an admin.
 * For security, it only works in development mode and when no other admins exist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Bootstrap endpoint only available in development' },
        { status: 403 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be authenticated' },
        { status: 401 }
      );
    }

    // Get all users to check if any admin already exists
    const clerk = await clerkClient();
    const users = await clerk.users.getUserList();
    const existingAdmins = users.data.filter(
      (user: any) =>
        user.publicMetadata?.role === 'ProjectAdmin' ||
        user.publicMetadata?.role === 'FandomAdmin'
    );

    // Only allow bootstrap if no admins exist, or if current user is already an admin
    const currentUser = await clerk.users.getUser(userId);
    const isCurrentUserAdmin =
      currentUser.publicMetadata?.role === 'ProjectAdmin' ||
      currentUser.publicMetadata?.role === 'FandomAdmin';

    if (existingAdmins.length > 0 && !isCurrentUserAdmin) {
      return NextResponse.json(
        { error: 'Admin already exists. Contact existing admin for access.' },
        { status: 403 }
      );
    }

    // Set the user as ProjectAdmin
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'ProjectAdmin',
        bootstrapAdmin: true,
        grantedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin role granted successfully',
      role: 'ProjectAdmin',
    });
  } catch (error) {
    console.error('Bootstrap admin error:', error);
    return NextResponse.json(
      { error: 'Failed to grant admin access' },
      { status: 500 }
    );
  }
}
