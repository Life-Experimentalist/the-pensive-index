/**
 * Clerk Authentication Utilities for API Routes
 *
 * Helper functions for checking authentication and authorization in API routes
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export interface AuthResult {
  success: boolean;
  userId?: string;
  user?: any;
  role?: 'ProjectAdmin' | 'FandomAdmin';
  error?: string;
  response?: NextResponse;
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<AuthResult> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: 'Authentication required',
        response: NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        ),
      };
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as
      | 'ProjectAdmin'
      | 'FandomAdmin'
      | undefined;

    return {
      success: true,
      userId,
      user,
      role,
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      success: false,
      error: 'Authentication error',
      response: NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Check if user has admin access
 */
export async function checkAdminAuth(): Promise<AuthResult> {
  const authResult = await checkAuth();

  if (!authResult.success) {
    return authResult;
  }

  const isAdmin =
    authResult.role &&
    ['ProjectAdmin', 'FandomAdmin'].includes(authResult.role);

  if (!isAdmin) {
    return {
      success: false,
      error: 'Admin access required',
      response: NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * Check if user has ProjectAdmin access
 */
export async function checkProjectAdminAuth(): Promise<AuthResult> {
  const authResult = await checkAdminAuth();

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.role !== 'ProjectAdmin') {
    return {
      success: false,
      error: 'Project admin access required',
      response: NextResponse.json(
        { success: false, error: 'Project admin access required' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}
