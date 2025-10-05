import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
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

    // TODO: Implement actual GitHub integration status check
    const githubStatus = {
      connected: true,
      lastSync: new Date().toISOString(),
      webhookActive: true,
      apiRateLimit: {
        remaining: 4995,
        reset: new Date(Date.now() + 3600000).toISOString(),
      },
      repositories: {
        issuesRepo: 'configured',
        dataRepo: 'configured',
      },
    };

    return NextResponse.json(githubStatus);
  } catch (error) {
    console.error('GitHub status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
