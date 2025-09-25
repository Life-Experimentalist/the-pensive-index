/**
 * Admin Permission Service
 *
 * Service for checking and managing admin permissions.
 * Provides permission validation for the hierarchical admin system.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import type { AdminPermission } from '@/types/admin';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';

export class AdminPermissionService {
  private static instance: AdminPermissionService;

  constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AdminPermissionService {
    if (!AdminPermissionService.instance) {
      AdminPermissionService.instance = new AdminPermissionService();
    }
    return AdminPermissionService.instance;
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    fandomId?: string
  ): Promise<boolean> {
    return PermissionValidator.checkPermissionAsync(userId, permission, {
      fandomId,
    });
  }

  /**
   * Check if user has specific permission (alias for hasPermission)
   */
  async checkPermission(
    userId: string,
    permission: string,
    fandomId?: string
  ): Promise<boolean> {
    return this.hasPermission(userId, permission, fandomId);
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(
    userId: string,
    fandomId?: string
  ): Promise<AdminPermission[]> {
    // Mock implementation - would fetch from database
    return [];
  }

  /**
   * Grant permission to user
   */
  async grantPermission(
    userId: string,
    permission: string,
    fandomId?: string,
    grantedBy?: string
  ): Promise<void> {
    // Mock implementation - would update database
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(
    userId: string,
    permission: string,
    fandomId?: string,
    revokedBy?: string
  ): Promise<void> {
    // Mock implementation - would update database
  }
}
