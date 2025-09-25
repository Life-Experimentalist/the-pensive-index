/**
 * Admin Permissions Hook
 *
 * React hook for checking admin permissions and role-based access control.
 * Provides real-time permission checking and role validation.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import type { AdminPermission } from '@/types/admin';

interface PermissionsHookReturn {
  hasPermission: (action: string, resource?: string) => boolean;
  permissions: AdminPermission[];
  isProjectAdmin: boolean;
  isFandomAdmin: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for checking admin permissions
 */
export function usePermissions(): PermissionsHookReturn {
  const { user, isLoaded } = useUser();
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = user?.publicMetadata?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin'
    | undefined;

  // Determine user roles
  const isAdmin = Boolean(
    userRole && ['ProjectAdmin', 'FandomAdmin'].includes(userRole)
  );
  const isProjectAdmin = userRole === 'ProjectAdmin';
  const isFandomAdmin = userRole === 'FandomAdmin';

  /**
   * Fetch user permissions from the API
   */
  const fetchPermissions = async () => {
    if (!isLoaded || !isAdmin) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/permissions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setPermissions(data.permissions || []);
      } else {
        throw new Error(data.error || 'Failed to fetch permissions');
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (action: string, resource?: string): boolean => {
    if (!isAdmin) return false;

    // ProjectAdmin has all permissions
    if (isProjectAdmin) return true;

    // Check specific permissions for FandomAdmin
    return permissions.some(permission => {
      const actionMatches = permission.action === action;

      // If no resource specified, just check action
      if (!resource) return actionMatches && permission.granted;

      // If resource specified, check both action and resource
      return (
        actionMatches && permission.resource === resource && permission.granted
      );
    });
  };

  // Fetch permissions when user data changes
  useEffect(() => {
    fetchPermissions();
  }, [isLoaded, isAdmin]);

  return {
    hasPermission,
    permissions,
    isProjectAdmin,
    isFandomAdmin,
    isAdmin,
    isLoading,
    error,
    refetch: fetchPermissions,
  };
}
