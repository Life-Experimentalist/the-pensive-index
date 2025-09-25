'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

// Permission definitions
interface Permissions {
  // User Management
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canDeactivateUsers: boolean;
  canActivateUsers: boolean;
  canExportUsers: boolean;

  // Role Management
  canViewRoles: boolean;
  canAssignRoles: boolean;
  canRevokeRoles: boolean;
  canCreateRoles: boolean;
  canEditRoles: boolean;
  canDeleteRoles: boolean;

  // Fandom Management
  canViewFandoms: boolean;
  canAssignFandoms: boolean;
  canRemoveFandoms: boolean;
  canCreateFandoms: boolean;
  canEditFandoms: boolean;
  canDeleteFandoms: boolean;

  // Invitation Management
  canViewInvitations: boolean;
  canCreateInvitations: boolean;
  canCancelInvitations: boolean;
  canResendInvitations: boolean;
  canApproveInvitations: boolean;
  canRejectInvitations: boolean;

  // Audit Logs
  canViewAuditLogs: boolean;
  canExportAuditLogs: boolean;
  canDeleteAuditLogs: boolean;

  // Analytics
  canViewAnalytics: boolean;
  canExportAnalytics: boolean;
  canViewAdvancedAnalytics: boolean;

  // System Settings
  canAccessSettings: boolean;
  canModifySettings: boolean;
  canViewSystemHealth: boolean;
  canManageBackups: boolean;

  // Validation Rules (existing system)
  canViewValidationRules: boolean;
  canCreateValidationRules: boolean;
  canEditValidationRules: boolean;
  canDeleteValidationRules: boolean;
  canTestValidationRules: boolean;

  // Special Permissions
  canImpersonateUsers: boolean;
  canAccessDangerZone: boolean;
  canManagePermissions: boolean;
}

// Role-based permission mappings
const ROLE_PERMISSIONS: Record<string, Partial<Permissions>> = {
  'super-admin': {
    // Super Admin: Full access to everything
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canDeactivateUsers: true,
    canActivateUsers: true,
    canExportUsers: true,
    canViewRoles: true,
    canAssignRoles: true,
    canRevokeRoles: true,
    canCreateRoles: true,
    canEditRoles: true,
    canDeleteRoles: true,
    canViewFandoms: true,
    canAssignFandoms: true,
    canRemoveFandoms: true,
    canCreateFandoms: true,
    canEditFandoms: true,
    canDeleteFandoms: true,
    canViewInvitations: true,
    canCreateInvitations: true,
    canCancelInvitations: true,
    canResendInvitations: true,
    canApproveInvitations: true,
    canRejectInvitations: true,
    canViewAuditLogs: true,
    canExportAuditLogs: true,
    canDeleteAuditLogs: true,
    canViewAnalytics: true,
    canExportAnalytics: true,
    canViewAdvancedAnalytics: true,
    canAccessSettings: true,
    canModifySettings: true,
    canViewSystemHealth: true,
    canManageBackups: true,
    canViewValidationRules: true,
    canCreateValidationRules: true,
    canEditValidationRules: true,
    canDeleteValidationRules: true,
    canTestValidationRules: true,
    canImpersonateUsers: true,
    canAccessDangerZone: true,
    canManagePermissions: true,
  },

  'project-admin': {
    // Project Admin: Broad access but no dangerous operations
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeactivateUsers: true,
    canActivateUsers: true,
    canExportUsers: true,
    canViewRoles: true,
    canAssignRoles: true,
    canRevokeRoles: true,
    canViewFandoms: true,
    canAssignFandoms: true,
    canRemoveFandoms: true,
    canCreateFandoms: true,
    canEditFandoms: true,
    canViewInvitations: true,
    canCreateInvitations: true,
    canCancelInvitations: true,
    canResendInvitations: true,
    canApproveInvitations: true,
    canRejectInvitations: true,
    canViewAuditLogs: true,
    canExportAuditLogs: true,
    canViewAnalytics: true,
    canExportAnalytics: true,
    canViewAdvancedAnalytics: true,
    canAccessSettings: true,
    canViewSystemHealth: true,
    canViewValidationRules: true,
    canCreateValidationRules: true,
    canEditValidationRules: true,
    canDeleteValidationRules: true,
    canTestValidationRules: true,
  },

  'fandom-admin': {
    // Fandom Admin: Limited to specific fandom management
    canViewUsers: true,
    canViewRoles: true,
    canViewFandoms: true,
    canAssignFandoms: true, // Only for their fandoms
    canRemoveFandoms: true, // Only for their fandoms
    canViewInvitations: true,
    canCreateInvitations: true, // Only for their fandoms
    canCancelInvitations: true, // Only their invitations
    canResendInvitations: true, // Only their invitations
    canViewAuditLogs: true, // Only for their fandoms
    canViewAnalytics: true, // Only for their fandoms
    canViewValidationRules: true,
    canCreateValidationRules: true, // Only for their fandoms
    canEditValidationRules: true, // Only for their fandoms
    canTestValidationRules: true,
  },

  moderator: {
    // Moderator: Basic access for content moderation
    canViewUsers: true,
    canViewRoles: true,
    canViewFandoms: true,
    canViewInvitations: true,
    canViewAuditLogs: true, // Limited scope
    canViewAnalytics: true, // Limited scope
    canViewValidationRules: true,
    canTestValidationRules: true,
  },
};

// Default permissions (all false)
const DEFAULT_PERMISSIONS: Permissions = {
  canViewUsers: false,
  canCreateUsers: false,
  canEditUsers: false,
  canDeleteUsers: false,
  canDeactivateUsers: false,
  canActivateUsers: false,
  canExportUsers: false,
  canViewRoles: false,
  canAssignRoles: false,
  canRevokeRoles: false,
  canCreateRoles: false,
  canEditRoles: false,
  canDeleteRoles: false,
  canViewFandoms: false,
  canAssignFandoms: false,
  canRemoveFandoms: false,
  canCreateFandoms: false,
  canEditFandoms: false,
  canDeleteFandoms: false,
  canViewInvitations: false,
  canCreateInvitations: false,
  canCancelInvitations: false,
  canResendInvitations: false,
  canApproveInvitations: false,
  canRejectInvitations: false,
  canViewAuditLogs: false,
  canExportAuditLogs: false,
  canDeleteAuditLogs: false,
  canViewAnalytics: false,
  canExportAnalytics: false,
  canViewAdvancedAnalytics: false,
  canAccessSettings: false,
  canModifySettings: false,
  canViewSystemHealth: false,
  canManageBackups: false,
  canViewValidationRules: false,
  canCreateValidationRules: false,
  canEditValidationRules: false,
  canDeleteValidationRules: false,
  canTestValidationRules: false,
  canImpersonateUsers: false,
  canAccessDangerZone: false,
  canManagePermissions: false,
};

interface PermissionContextType {
  permissions: Permissions;
  hasPermission: (permission: keyof Permissions) => boolean;
  hasAnyPermission: (permissions: (keyof Permissions)[]) => boolean;
  hasAllPermissions: (permissions: (keyof Permissions)[]) => boolean;
  canAccessResource: (resource: string, action: string) => boolean;
  loading: boolean;
  userRole: string | null;
  userFandoms: string[];
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

interface PermissionProviderProps {
  children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user, isLoaded } = useUser();
  const [permissions, setPermissions] =
    useState<Permissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userFandoms, setUserFandoms] = useState<string[]>([]);

  useEffect(() => {
    if (isLoaded && user) {
      loadUserPermissions();
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, user]);

  const loadUserPermissions = async () => {
    try {
      setLoading(true);

      // Get user's role and fandom assignments from API
      const response = await fetch('/api/admin/permissions/user', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const { role, fandoms = [], customPermissions = {} } = data;

        setUserRole(role);
        setUserFandoms(fandoms);

        // Get base permissions for the role
        const rolePermissions = ROLE_PERMISSIONS[role] || {};

        // Merge with custom permissions
        const finalPermissions: Permissions = {
          ...DEFAULT_PERMISSIONS,
          ...rolePermissions,
          ...customPermissions,
        };

        setPermissions(finalPermissions);
      } else {
        // Fallback to role from Clerk metadata
        const clerkRole = user?.publicMetadata?.role as string;
        if (clerkRole) {
          setUserRole(clerkRole);
          const rolePermissions =
            ROLE_PERMISSIONS[clerkRole.toLowerCase()] || {};
          setPermissions({
            ...DEFAULT_PERMISSIONS,
            ...rolePermissions,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      // Fallback to Clerk metadata
      const clerkRole = user?.publicMetadata?.role as string;
      if (clerkRole) {
        setUserRole(clerkRole);
        const rolePermissions = ROLE_PERMISSIONS[clerkRole.toLowerCase()] || {};
        setPermissions({
          ...DEFAULT_PERMISSIONS,
          ...rolePermissions,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: keyof Permissions): boolean => {
    return permissions[permission] || false;
  };

  const hasAnyPermission = (permissionList: (keyof Permissions)[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (
    permissionList: (keyof Permissions)[]
  ): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  const canAccessResource = (resource: string, action: string): boolean => {
    // Special handling for fandom-specific resources
    if (userRole === 'fandom-admin' && resource.includes('fandom')) {
      // Check if the user has access to this specific fandom
      const resourceFandom = extractFandomFromResource(resource);
      if (resourceFandom && !userFandoms.includes(resourceFandom)) {
        return false;
      }
    }

    // Map resource and action to permission
    const permission = mapResourceActionToPermission(resource, action);
    return permission ? hasPermission(permission) : false;
  };

  const extractFandomFromResource = (resource: string): string | null => {
    // Extract fandom identifier from resource string
    // This would depend on your resource naming convention
    const match = resource.match(/fandom:([^:]+)/);
    return match ? match[1] : null;
  };

  const mapResourceActionToPermission = (
    resource: string,
    action: string
  ): keyof Permissions | null => {
    // Map combinations of resource and action to specific permissions
    const mapping: Record<string, keyof Permissions> = {
      'users:view': 'canViewUsers',
      'users:create': 'canCreateUsers',
      'users:edit': 'canEditUsers',
      'users:delete': 'canDeleteUsers',
      'users:export': 'canExportUsers',
      'roles:view': 'canViewRoles',
      'roles:assign': 'canAssignRoles',
      'roles:revoke': 'canRevokeRoles',
      'fandoms:view': 'canViewFandoms',
      'fandoms:assign': 'canAssignFandoms',
      'fandoms:remove': 'canRemoveFandoms',
      'invitations:view': 'canViewInvitations',
      'invitations:create': 'canCreateInvitations',
      'invitations:cancel': 'canCancelInvitations',
      'audit:view': 'canViewAuditLogs',
      'audit:export': 'canExportAuditLogs',
      'analytics:view': 'canViewAnalytics',
      'settings:view': 'canAccessSettings',
      'settings:modify': 'canModifySettings',
    };

    return mapping[`${resource}:${action}`] || null;
  };

  const value: PermissionContextType = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    loading,
    userRole,
    userFandoms,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// Higher-order component for permission-based rendering
interface WithPermissionProps {
  permission?: keyof Permissions;
  permissions?: (keyof Permissions)[];
  requireAll?: boolean;
  resource?: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function WithPermission({
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  fallback = null,
  children,
}: WithPermissionProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
  } = usePermissions();

  let hasAccess = false;

  if (resource && action) {
    hasAccess = canAccessResource(resource, action);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Hook for permission-based navigation filtering
export function useFilteredNavigation(navigationItems: any[]) {
  const { hasPermission, canAccessResource } = usePermissions();

  return navigationItems.filter(item => {
    if (item.permission) {
      return hasPermission(item.permission);
    }
    if (item.resource && item.action) {
      return canAccessResource(item.resource, item.action);
    }
    return true;
  });
}

// Utility functions for common permission checks
export const PermissionUtils = {
  canManageUsers: (permissions: Permissions) =>
    permissions.canViewUsers && permissions.canEditUsers,
  canManageRoles: (permissions: Permissions) =>
    permissions.canViewRoles && permissions.canAssignRoles,
  canManageFandoms: (permissions: Permissions) =>
    permissions.canViewFandoms && permissions.canAssignFandoms,
  canManageInvitations: (permissions: Permissions) =>
    permissions.canViewInvitations && permissions.canCreateInvitations,
  canViewAuditSystem: (permissions: Permissions) =>
    permissions.canViewAuditLogs,
  canAccessAnalytics: (permissions: Permissions) =>
    permissions.canViewAnalytics,
  canModifySystem: (permissions: Permissions) =>
    permissions.canAccessSettings && permissions.canModifySettings,
  isAdmin: (role: string | null) =>
    ['super-admin', 'project-admin'].includes(role || ''),
  isFandomAdmin: (role: string | null) => role === 'fandom-admin',
  isModerator: (role: string | null) => role === 'moderator',
};

export type { Permissions };
export { ROLE_PERMISSIONS, DEFAULT_PERMISSIONS };
