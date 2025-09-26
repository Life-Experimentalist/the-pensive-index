/**
 * Admin Permission Gate Component
 *
 * Higher-order component that wraps admin routes to ensure only
 * authenticated admin users can access them.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { AdminUser } from '@/types/admin';

interface AdminPermissionGateProps {
  children: React.ReactNode;
  requiredPermission?: string;
  projectAdminOnly?: boolean;
  fallbackPath?: string;
}

export function AdminPermissionGate({
  children,
  requiredPermission,
  projectAdminOnly = false,
  fallbackPath = '/sign-in',
}: AdminPermissionGateProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const userRole = user?.publicMetadata?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin'
    | undefined;
  const isAdmin = Boolean(
    userRole && ['ProjectAdmin', 'FandomAdmin'].includes(userRole)
  );
  const isProjectAdmin = userRole === 'ProjectAdmin';

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      router.push(fallbackPath);
      return;
    }

    if (!isAdmin) {
      router.push('/unauthorized');
      return;
    }

    if (projectAdminOnly && !isProjectAdmin) {
      router.push('/admin/unauthorized');
      return;
    }
  }, [
    isLoaded,
    user,
    isAdmin,
    isProjectAdmin,
    router,
    fallbackPath,
    projectAdminOnly,
  ]);

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated or not admin
  if (!user || !isAdmin) {
    return null;
  }

  // Don't render if ProjectAdmin required but user is not ProjectAdmin
  if (projectAdminOnly && !isProjectAdmin) {
    return null;
  }

  return <>{children}</>;
}
