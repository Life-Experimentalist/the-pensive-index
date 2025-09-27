/**
 * Temporary First User Admin Endpoint
 *
 * This endpoint grants admin access to the first user who accesses it
 * Only works if no other ProjectAdmin exists in the system
 */

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be authenticated' },
        { status: 401 }
      );
    }

    const client = await clerkClient();

    // Check if any ProjectAdmin already exists
    const users = await client.users.getUserList({ limit: 100 });
    const existingProjectAdmins = users.data.filter(
      user => user.publicMetadata?.role === 'ProjectAdmin'
    );

    if (existingProjectAdmins.length > 0) {
      return NextResponse.json(
        {
          error:
            'ProjectAdmin already exists. Contact existing admin for access.',
        },
        { status: 403 }
      );
    }

    // Grant ProjectAdmin role to current user
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'ProjectAdmin',
        firstAdmin: true,
        grantedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ProjectAdmin role granted successfully',
      role: 'ProjectAdmin',
    });
  } catch (error) {
    console.error('First user admin error:', error);
    return NextResponse.json(
      { error: 'Failed to grant admin access' },
      { status: 500 }
    );
  }
}
