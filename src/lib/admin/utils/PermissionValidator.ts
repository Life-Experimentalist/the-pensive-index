/**
 * Permission Validator
 *
 * Utility class for validating admin permissions and role-based access control.
 * Provides centralized permission checking logic for the hierarchical admin system.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import type { AdminUser, AdminRole, PermissionCheck } from '@/types/admin';
import { ADMIN_PERMISSIONS } from '@/types/admin';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';

export class PermissionValidator {
  private static instance: PermissionValidator;
  private adminModel: AdminUserModel;

  constructor() {
    this.adminModel = AdminUserModel.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PermissionValidator {
    if (!PermissionValidator.instance) {
      PermissionValidator.instance = new PermissionValidator();
    }
    return PermissionValidator.instance;
  }

  /**
   * Check if user has a specific permission (async version for user ID)
   */
  static async checkPermissionAsync(
    userId: string,
    permission: string,
    options?: { fandomId?: string }
  ): Promise<boolean> {
    try {
      const adminModel = AdminUserModel.getInstance();
      const userObj = await adminModel.getAdminUser(userId);

      if (!userObj) {
        return false;
      }

      return this.checkPermission(userObj, permission, options);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has a specific permission (sync version for AdminUser object)
   */
  static checkPermission(
    user: AdminUser,
    permission: string,
    options?: { fandomId?: string }
  ): boolean {
    try {
      if (!user || !user.assignments || user.assignments.length === 0) {
        return false;
      }

      const fandomId = options?.fandomId;

      // Check each assignment for the permission
      for (const assignment of user.assignments) {
        if (!assignment.is_active) continue;

        // Check if assignment has expired
        if (
          assignment.expires_at &&
          new Date(assignment.expires_at) < new Date()
        ) {
          continue;
        }

        // Check direct permission match
        if (assignment.role.permissions.includes(permission)) {
          // For global permissions (ProjectAdmin), always grant access
          if (!assignment.fandom_id) {
            return true;
          }

          // For fandom-specific permissions, check fandom match
          if (fandomId && assignment.fandom_id === fandomId) {
            return true;
          }
        }

        // Project Admins can access any fandom content
        if (assignment.role.name === 'ProjectAdmin' && !assignment.fandom_id) {
          const fandomPermissions = [
            'tags:manage',
            'plotblocks:manage',
            'validation:fandom',
            'submissions:review',
            'content:moderate',
          ];

          if (fandomPermissions.includes(permission)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has a specific permission (legacy method for backward compatibility)
   */
  async checkPermission(
    userId: string,
    permission: string,
    fandomId?: string
  ): Promise<PermissionCheck> {
    try {
      const hasPermission = await this.adminModel.hasPermission(
        userId,
        permission,
        fandomId
      );

      return {
        user_id: userId,
        permission,
        fandom_id: fandomId,
        granted: hasPermission,
        last_updated: new Date(),
      };
    } catch (error) {
      console.error('Error checking permission:', error);
      return {
        user_id: userId,
        permission,
        fandom_id: fandomId,
        granted: false,
        last_updated: new Date(),
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    userId: string,
    permissions: string[],
    fandomId?: string
  ): Promise<PermissionCheck[]> {
    try {
      const results: PermissionCheck[] = [];

      for (const permission of permissions) {
        const check = await this.checkPermission(userId, permission, fandomId);
        results.push(check);
      }

      return results;
    } catch (error) {
      console.error('Error checking multiple permissions:', error);
      return permissions.map(permission => ({
        user_id: userId,
        permission,
        fandom_id: fandomId,
        granted: false,
        last_updated: new Date(),
      }));
    }
  }

  /**
   * Check if user can access admin dashboard
   */
  async canAccessAdminDashboard(userId: string): Promise<boolean> {
    try {
      const user = await this.adminModel.getAdminUser(userId);
      return user !== null;
    } catch (error) {
      console.error('Error checking admin dashboard access:', error);
      return false;
    }
  }

  /**
   * Check if user can access fandom management
   */
  async canAccessFandomManagement(
    userId: string,
    fandomId?: string
  ): Promise<boolean> {
    try {
      // Project admins can access all fandom management
      const hasGlobalAccess = await this.adminModel.hasPermission(
        userId,
        'validation:global'
      );

      if (hasGlobalAccess) return true;

      // If specific fandom, check fandom-specific permissions
      if (fandomId) {
        return await this.adminModel.hasPermission(
          userId,
          'validation:fandom',
          fandomId
        );
      }

      // Without specific fandom, check if user has any fandom assignments
      const assignments = await this.adminModel.getUserAssignments(userId);
      return assignments.some(a => a.is_active && a.fandom_id);
    } catch (error) {
      console.error('Error checking fandom management access:', error);
      return false;
    }
  }

  /**
   * Check if user can invite other admins
   */
  async canInviteAdmins(
    userId: string,
    targetRole: AdminRole,
    fandomId?: string
  ): Promise<boolean> {
    try {
      const hasInvitePermission = await this.adminModel.hasPermission(
        userId,
        'admin:assign' // Using admin:assign as closest to invite permission
      );

      if (!hasInvitePermission) return false;

      // Project Admins can invite anyone
      const isProjectAdmin = await this.adminModel.hasPermission(
        userId,
        'validation:global'
      );

      if (isProjectAdmin) return true;

      // Fandom Admins can only invite other Fandom Admins to their fandoms
      if (targetRole === 'FandomAdmin' && fandomId) {
        return await this.adminModel.hasPermission(
          userId,
          'validation:fandom',
          fandomId
        );
      }

      return false;
    } catch (error) {
      console.error('Error checking invite permissions:', error);
      return false;
    }
  }

  /**
   * Check if user can assign roles
   */
  async canAssignRole(
    userId: string,
    targetRole: AdminRole,
    fandomId?: string
  ): Promise<boolean> {
    try {
      const hasAssignPermission = await this.adminModel.hasPermission(
        userId,
        'admin:assign'
      );

      if (!hasAssignPermission) return false;

      // Project Admins can assign any role
      const isProjectAdmin = await this.adminModel.hasPermission(
        userId,
        'validation:global'
      );

      if (isProjectAdmin) return true;

      // Fandom Admins cannot assign Project Admin roles
      if (targetRole === 'ProjectAdmin') return false;

      // Fandom Admins can assign Fandom Admin roles only to their fandoms
      if (targetRole === 'FandomAdmin' && fandomId) {
        return await this.adminModel.hasPermission(
          userId,
          'validation:fandom',
          fandomId
        );
      }

      return false;
    } catch (error) {
      console.error('Error checking role assignment permissions:', error);
      return false;
    }
  }

  /**
   * Check if user can revoke roles
   */
  async canRevokeRole(
    userId: string,
    targetAssignmentId: string,
    targetUserId: string,
    fandomId?: string
  ): Promise<boolean> {
    try {
      // Users cannot revoke their own roles (prevents lockout)
      if (userId === targetUserId) return false;

      const hasRevokePermission = await this.adminModel.hasPermission(
        userId,
        'admin:revoke'
      );

      if (!hasRevokePermission) return false;

      // Project Admins can revoke any role
      const isProjectAdmin = await this.adminModel.hasPermission(
        userId,
        'validation:global'
      );

      if (isProjectAdmin) return true;

      // Fandom Admins can only revoke roles within their fandoms
      if (fandomId) {
        return await this.adminModel.hasPermission(
          userId,
          'validation:fandom',
          fandomId
        );
      }

      return false;
    } catch (error) {
      console.error('Error checking role revocation permissions:', error);
      return false;
    }
  }

  /**
   * Check if user can manage validation rules
   */
  async canManageValidationRules(
    userId: string,
    fandomId?: string
  ): Promise<boolean> {
    try {
      // Global validation rules require Project Admin
      if (!fandomId) {
        return await this.adminModel.hasPermission(userId, 'validation:global');
      }

      // Fandom-specific rules require fandom access
      const hasGlobalAccess = await this.adminModel.hasPermission(
        userId,
        'validation:global'
      );

      if (hasGlobalAccess) return true;

      return await this.adminModel.hasPermission(
        userId,
        'validation:fandom',
        fandomId
      );
    } catch (error) {
      console.error('Error checking validation rule permissions:', error);
      return false;
    }
  }

  /**
   * Check if user can view audit logs
   */
  async canViewAuditLogs(userId: string, fandomId?: string): Promise<boolean> {
    try {
      // Global audit logs require Project Admin
      if (!fandomId) {
        return await this.adminModel.hasPermission(userId, 'audit:view');
      }

      // Fandom-specific audit logs
      const hasGlobalAccess = await this.adminModel.hasPermission(
        userId,
        'audit:view'
      );

      if (hasGlobalAccess) return true;

      return await this.adminModel.hasPermission(
        userId,
        'validation:fandom',
        fandomId
      );
    } catch (error) {
      console.error('Error checking audit log view permissions:', error);
      return false;
    }
  }

  /**
   * Get user's effective permissions
   */
  async getUserEffectivePermissions(
    userId: string,
    fandomId?: string
  ): Promise<{
    global_permissions: string[];
    fandom_permissions: string[];
    effective_role: AdminRole | null;
    can_access_dashboard: boolean;
    can_manage_global: boolean;
    can_manage_fandom: boolean;
  }> {
    try {
      const user = await this.adminModel.getAdminUser(userId);

      if (!user) {
        return {
          global_permissions: [],
          fandom_permissions: [],
          effective_role: null,
          can_access_dashboard: false,
          can_manage_global: false,
          can_manage_fandom: false,
        };
      }

      const assignments = await this.adminModel.getUserAssignments(userId);
      const globalPermissions: string[] = [];
      const fandomPermissions: string[] = [];
      let effectiveRole: AdminRole | null = null;

      // Check all permissions
      for (const permission of Object.values(ADMIN_PERMISSIONS)) {
        const hasGlobal = await this.adminModel.hasPermission(
          userId,
          permission
        );
        if (hasGlobal) {
          globalPermissions.push(permission);
        }

        if (fandomId) {
          const hasFandom = await this.adminModel.hasPermission(
            userId,
            permission,
            fandomId
          );
          if (hasFandom) {
            fandomPermissions.push(permission);
          }
        }
      }

      // Determine effective role
      if (globalPermissions.includes('validation:global')) {
        effectiveRole = 'ProjectAdmin';
      } else if (
        fandomPermissions.length > 0 ||
        assignments.some(a => a.is_active && a.fandom_id)
      ) {
        effectiveRole = 'FandomAdmin';
      }

      return {
        global_permissions: globalPermissions,
        fandom_permissions: fandomPermissions,
        effective_role: effectiveRole,
        can_access_dashboard: true,
        can_manage_global: globalPermissions.includes('validation:global'),
        can_manage_fandom:
          fandomPermissions.includes('validation:fandom') ||
          globalPermissions.includes('validation:global'),
      };
    } catch (error) {
      console.error('Error getting user effective permissions:', error);
      return {
        global_permissions: [],
        fandom_permissions: [],
        effective_role: null,
        can_access_dashboard: false,
        can_manage_global: false,
        can_manage_fandom: false,
      };
    }
  }

  /**
   * Validate permission string format
   */
  validatePermissionFormat(permission: string): boolean {
    const validPermissions = Object.values(ADMIN_PERMISSIONS) as string[];
    return validPermissions.includes(permission);
  }

  /**
   * Get all available permissions
   */
  getAvailablePermissions(): string[] {
    return Object.values(ADMIN_PERMISSIONS);
  }

  /**
   * Get permissions by role
   */
  getPermissionsByRole(role: AdminRole): string[] {
    switch (role) {
      case 'ProjectAdmin':
        return [
          ADMIN_PERMISSIONS.VALIDATION_GLOBAL,
          ADMIN_PERMISSIONS.VALIDATION_FANDOM,
          ADMIN_PERMISSIONS.ADMIN_ASSIGN,
          ADMIN_PERMISSIONS.ADMIN_REVOKE,
          ADMIN_PERMISSIONS.FANDOM_CREATE,
          ADMIN_PERMISSIONS.FANDOM_EDIT,
          ADMIN_PERMISSIONS.FANDOM_DELETE,
          ADMIN_PERMISSIONS.AUDIT_VIEW,
          ADMIN_PERMISSIONS.USERS_MANAGE,
        ];
      case 'FandomAdmin':
        return [
          ADMIN_PERMISSIONS.VALIDATION_FANDOM,
          ADMIN_PERMISSIONS.TAGS_MANAGE,
          ADMIN_PERMISSIONS.PLOTBLOCKS_MANAGE,
          ADMIN_PERMISSIONS.SUBMISSIONS_REVIEW,
          ADMIN_PERMISSIONS.CONTENT_MODERATE,
        ];
      default:
        return [];
    }
  }

  /**
   * Check if role hierarchy allows action
   */
  canRoleActOnRole(actorRole: AdminRole, targetRole: AdminRole): boolean {
    const roleHierarchy = {
      ProjectAdmin: 1,
      FandomAdmin: 2,
    };

    return roleHierarchy[actorRole] <= roleHierarchy[targetRole];
  }
}
