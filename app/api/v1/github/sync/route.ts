import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const userRole = user.publicMetadata?.role;
    if (
      !userRole ||
      !['global_admin', 'GlobalAdmin'].includes(userRole as string)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { forceSync } = body;

    // TODO: Implement actual GitHub sync functionality
    const syncResult = {
      success: true,
      syncId: `sync_${Date.now()}`,
      startTime: new Date().toISOString(),
      status: 'completed',
      itemsProcessed: {
        issues: forceSync ? 250 : 15,
        stories: forceSync ? 180 : 8,
        tags: forceSync ? 45 : 3,
      },
      errors: [],
      nextScheduledSync: new Date(Date.now() + 3600000).toISOString(),
    };

    return NextResponse.json(syncResult);
  } catch (error) {
    console.error('GitHub sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
