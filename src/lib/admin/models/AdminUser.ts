/**
 * Hierarchical Admin User Model
 *
 * Core model for managing admin users with hierarchical role assignments
 * in the admin system.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import type {
  AdminUser,
  AdminAssignment,
  AdminRoleDefinition,
  AdminPermission,
  AdminContext,
} from '@/types/admin';
import { ADMIN_PERMISSIONS } from '@/types/admin';

export class AdminUserModel {
  private static instance: AdminUserModel;
  private testUsers: Map<string, AdminUser> = new Map();

  private constructor() {}

  static getInstance(): AdminUserModel {
    if (!AdminUserModel.instance) {
      AdminUserModel.instance = new AdminUserModel();
    }
    return AdminUserModel.instance;
  }

  /**
   * Set test data (for testing only)
   */
  setTestUser(user: AdminUser): void {
    this.testUsers.set(user.id, user);
  }

  /**
   * Clear test data (for testing only)
   */
  clearTestUsers(): void {
    this.testUsers.clear();
  }

  /**
   * Get admin user by ID with all assignments and permissions
   */
  async getAdminUser(userId: string): Promise<AdminUser | null> {
    try {
      // Check if we have test data for this user
      if (this.testUsers.has(userId)) {
        return this.testUsers.get(userId)!;
      }

      // This would query the database for the user and their assignments
      // For now, returning a mock structure that matches our tests

      const user: AdminUser = {
        id: userId,
        email: '', // Would be fetched from Clerk or database
        name: '', // Would be fetched from Clerk or database
        assignments: await this.getUserAssignments(userId),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      return user;
    } catch (error) {
      console.error('Error fetching admin user:', error);
      return null;
    }
  }

  /**
   * Get all active assignments for a user
   */
  async getUserAssignments(userId: string): Promise<AdminAssignment[]> {
    try {
      // Query database for active admin assignments
      // This would use the admin_assignments table with joins

      // Mock implementation for now
      const assignments: AdminAssignment[] = [];

      return assignments;
    } catch (error) {
      console.error('Error fetching user assignments:', error);
      return [];
    }
  }

  /**
   * Create admin context for permission checking
   */
  async getAdminContext(
    userId: string,
    currentFandom?: string
  ): Promise<AdminContext | null> {
    try {
      const user = await this.getAdminUser(userId);
      if (!user) return null;

      const activeAssignments = user.assignments.filter(
        a => a.is_active && (!a.expires_at || a.expires_at > new Date())
      );

      const permissions = await this.getUserPermissions(
        userId,
        activeAssignments
      );

      return {
        user,
        activeAssignments,
        permissions,
        currentFandom,
      };
    } catch (error) {
      console.error('Error creating admin context:', error);
      return null;
    }
  }

  /**
   * Get all permissions for a user based on their assignments
   */
  private async getUserPermissions(
    userId: string,
    assignments: AdminAssignment[]
  ): Promise<AdminPermission[]> {
    const permissions: AdminPermission[] = [];

    for (const assignment of assignments) {
      for (const permissionString of assignment.role.permissions) {
        permissions.push({
          action: permissionString,
          resource: assignment.fandom_id,
          granted: true,
          scope: assignment.fandom_id ? 'fandom' : 'global',
        });
      }
    }

    return permissions;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    fandomId?: string
  ): Promise<boolean> {
    try {
      const context = await this.getAdminContext(userId, fandomId);
      if (!context) return false;

      // Check for exact permission match
      const hasExactPermission = context.permissions.some(
        p =>
          p.action === permission &&
          (p.scope === 'global' || p.resource === fandomId)
      );

      if (hasExactPermission) return true;

      // Check for hierarchical permissions (Project Admin can do Fandom Admin tasks)
      const hasProjectAdminRole = context.activeAssignments.some(
        a => a.role.name === 'ProjectAdmin'
      );

      if (hasProjectAdminRole) {
        // Project Admins can perform any fandom-scoped action
        const fandomPermissions = [
          ADMIN_PERMISSIONS.TAGS_MANAGE,
          ADMIN_PERMISSIONS.PLOTBLOCKS_MANAGE,
          ADMIN_PERMISSIONS.VALIDATION_FANDOM,
          ADMIN_PERMISSIONS.SUBMISSIONS_REVIEW,
          ADMIN_PERMISSIONS.CONTENT_MODERATE,
        ];

        if (fandomPermissions.includes(permission as any)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get users by role type
   */
  async getUsersByRole(
    roleName: 'ProjectAdmin' | 'FandomAdmin'
  ): Promise<AdminUser[]> {
    try {
      // This would query the database for users with specific role assignments
      const users: AdminUser[] = [];

      return users;
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  /**
   * Get users assigned to a specific fandom
   */
  async getUsersByFandom(fandomId: string): Promise<AdminUser[]> {
    try {
      // Query for users with active assignments to the specified fandom
      const users: AdminUser[] = [];

      return users;
    } catch (error) {
      console.error('Error fetching users by fandom:', error);
      return [];
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Record<string, any>
  ): Promise<boolean> {
    try {
      // Update user preferences in database
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(
    userId: string,
    deactivatedBy: string
  ): Promise<boolean> {
    try {
      // Mark user as inactive and revoke all assignments
      // This should also trigger audit logging
      return true;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  /**
   * Get admin role definitions
   */
  async getAdminRoles(): Promise<AdminRoleDefinition[]> {
    try {
      // Fetch role definitions from database
      const roles: AdminRoleDefinition[] = [
        {
          id: 'project-admin',
          name: 'ProjectAdmin',
          description: 'Global admin with full platform permissions',
          level: 1,
          permissions: [
            ADMIN_PERMISSIONS.FANDOM_CREATE,
            ADMIN_PERMISSIONS.FANDOM_EDIT,
            ADMIN_PERMISSIONS.FANDOM_DELETE,
            ADMIN_PERMISSIONS.ADMIN_ASSIGN,
            ADMIN_PERMISSIONS.ADMIN_REVOKE,
            ADMIN_PERMISSIONS.VALIDATION_GLOBAL,
            ADMIN_PERMISSIONS.AUDIT_VIEW,
            ADMIN_PERMISSIONS.USERS_MANAGE,
          ],
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'fandom-admin',
          name: 'FandomAdmin',
          description:
            'Fandom-specific admin with content management permissions',
          level: 2,
          permissions: [
            ADMIN_PERMISSIONS.TAGS_MANAGE,
            ADMIN_PERMISSIONS.PLOTBLOCKS_MANAGE,
            ADMIN_PERMISSIONS.VALIDATION_FANDOM,
            ADMIN_PERMISSIONS.SUBMISSIONS_REVIEW,
            ADMIN_PERMISSIONS.CONTENT_MODERATE,
          ],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      return roles;
    } catch (error) {
      console.error('Error fetching admin roles:', error);
      return [];
    }
  }

  /**
   * Get role definition by ID
   */
  async getRoleById(roleId: string): Promise<AdminRoleDefinition | null> {
    try {
      const roles = await this.getAdminRoles();
      return roles.find(role => role.id === roleId) || null;
    } catch (error) {
      console.error('Error fetching role by ID:', error);
      return null;
    }
  }

  /**
   * Validate user exists (check with Clerk)
   */
  async validateUserExists(userId: string): Promise<boolean> {
    try {
      // This would check with Clerk to ensure the user exists
      // For now, assuming all users exist
      return true;
    } catch (error) {
      console.error('Error validating user existence:', error);
      return false;
    }
  }

  /**
   * Get user information from Clerk
   */
  async getUserInfo(
    userId: string
  ): Promise<{ email: string; name: string } | null> {
    try {
      // This would fetch user info from Clerk
      // For now, returning mock data
      return {
        email: `user-${userId}@example.com`,
        name: `User ${userId}`,
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Search admin users with filters
   */
  async searchAdminUsers(filters: {
    role?: 'ProjectAdmin' | 'FandomAdmin';
    fandom_id?: string;
    active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // This would implement complex database queries with filters
      const users: AdminUser[] = [];

      return {
        users,
        total: users.length,
        page: filters.page || 1,
        limit: filters.limit || 10,
      };
    } catch (error) {
      console.error('Error searching admin users:', error);
      return {
        users: [],
        total: 0,
        page: 1,
        limit: 10,
      };
    }
  }
}
