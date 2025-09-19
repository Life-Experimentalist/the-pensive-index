/**
 * Fandom Assignment Service
 *
 * Service for managing fandom-specific admin assignments and operations.
 * Handles fandom ownership, reassignment, and access control.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import type { AdminAssignment, AdminUser } from '@/types/admin';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { RoleAssignmentService } from '@/lib/admin/services/RoleAssignmentService';
import { AuditLogService } from '@/lib/admin/services/AuditLogService';

export class FandomAssignmentService {
  private adminModel: AdminUserModel;
  private roleService: RoleAssignmentService;
  private auditService: AuditLogService;

  constructor() {
    this.adminModel = AdminUserModel.getInstance();
    this.roleService = new RoleAssignmentService();
    this.auditService = new AuditLogService();
  }

  /**
   * Assign a user as Fandom Admin to a specific fandom
   */
  async assignFandomAdmin(
    userId: string,
    fandomId: string,
    assignedBy: string
  ): Promise<AdminAssignment> {
    try {
      // Validate assigning user has permission
      const hasPermission = await this.adminModel.hasPermission(
        assignedBy,
        'admin:assign'
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to assign fandom admins');
      }

      // Validate fandom exists
      const fandomExists = await this.validateFandomExists(fandomId);
      if (!fandomExists) {
        throw new Error('Fandom not found');
      }

      // Check if user is already assigned to this fandom
      const existingAssignment = await this.getUserFandomAssignment(
        userId,
        fandomId
      );
      if (existingAssignment && existingAssignment.is_active) {
        throw new Error('User already assigned to this fandom');
      }

      // Create the role assignment
      const assignment = await this.roleService.assignRole(
        userId,
        'fandom-admin',
        assignedBy,
        fandomId
      );

      // Log the fandom assignment
      await this.auditService.logAction({
        user_id: assignedBy,
        user_email: '',
        action: 'fandom:assign_admin',
        resource_type: 'fandom_assignment',
        resource_id: assignment.id,
        fandom_id: fandomId,
        details: {
          assigned_user_id: userId,
          fandom_id: fandomId,
          assignment_id: assignment.id,
        },
      });

      return assignment;
    } catch (error) {
      // Log failed action
      await this.auditService.logAction({
        user_id: assignedBy,
        user_email: '',
        action: 'fandom:assign_admin',
        resource_type: 'fandom_assignment',
        fandom_id: fandomId,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Reassign fandom ownership to a new admin
   */
  async reassignFandom(
    fandomId: string,
    newUserId: string,
    assignedBy: string,
    previousAssignmentId?: string
  ): Promise<AdminAssignment> {
    try {
      // Validate permissions
      const hasPermission = await this.adminModel.hasPermission(
        assignedBy,
        'admin:assign'
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to reassign fandoms');
      }

      // If previous assignment specified, revoke it
      if (previousAssignmentId) {
        await this.roleService.revokeRole(previousAssignmentId, assignedBy);
      } else {
        // Find and revoke existing assignments for this fandom
        const existingAssignments = await this.getFandomAssignments(fandomId);
        for (const assignment of existingAssignments) {
          if (assignment.is_active) {
            await this.roleService.revokeRole(assignment.id, assignedBy);
          }
        }
      }

      // Create new assignment
      const newAssignment = await this.assignFandomAdmin(
        newUserId,
        fandomId,
        assignedBy
      );

      // Log the reassignment
      await this.auditService.logAction({
        user_id: assignedBy,
        user_email: '',
        action: 'fandom:reassign',
        resource_type: 'fandom_assignment',
        resource_id: newAssignment.id,
        fandom_id: fandomId,
        details: {
          new_user_id: newUserId,
          previous_assignment_id: previousAssignmentId,
          fandom_id: fandomId,
        },
      });

      return newAssignment;
    } catch (error) {
      console.error('Error reassigning fandom:', error);
      throw error;
    }
  }

  /**
   * Get all assignments for a specific fandom
   */
  async getFandomAssignments(fandomId: string): Promise<AdminAssignment[]> {
    try {
      const result = await this.roleService.getAssignments({
        fandom_id: fandomId,
        active: true,
      });

      return result.assignments;
    } catch (error) {
      console.error('Error fetching fandom assignments:', error);
      return [];
    }
  }

  /**
   * Get user's assignment for a specific fandom
   */
  async getUserFandomAssignment(
    userId: string,
    fandomId: string
  ): Promise<AdminAssignment | null> {
    try {
      const userAssignments = await this.adminModel.getUserAssignments(userId);
      return (
        userAssignments.find(a => a.fandom_id === fandomId && a.is_active) ||
        null
      );
    } catch (error) {
      console.error('Error fetching user fandom assignment:', error);
      return null;
    }
  }

  /**
   * Get all fandoms a user is assigned to
   */
  async getUserFandoms(userId: string): Promise<
    Array<{
      fandom_id: string;
      fandom_name: string;
      assignment: AdminAssignment;
    }>
  > {
    try {
      const assignments = await this.adminModel.getUserAssignments(userId);
      const fandomAssignments = assignments.filter(
        a => a.is_active && a.fandom_id
      );

      const fandoms = [];
      for (const assignment of fandomAssignments) {
        const fandomInfo = await this.getFandomInfo(assignment.fandom_id!);
        if (fandomInfo) {
          fandoms.push({
            fandom_id: assignment.fandom_id!,
            fandom_name: fandomInfo.name,
            assignment,
          });
        }
      }

      return fandoms;
    } catch (error) {
      console.error('Error fetching user fandoms:', error);
      return [];
    }
  }

  /**
   * Check if user has access to a specific fandom
   */
  async hasAccessToFandom(userId: string, fandomId: string): Promise<boolean> {
    try {
      // Check if user is Project Admin (has access to all fandoms)
      const hasGlobalAccess = await this.adminModel.hasPermission(
        userId,
        'validation:global'
      );

      if (hasGlobalAccess) return true;

      // Check if user is assigned to this specific fandom
      const assignment = await this.getUserFandomAssignment(userId, fandomId);
      return assignment !== null;
    } catch (error) {
      console.error('Error checking fandom access:', error);
      return false;
    }
  }

  /**
   * Get orphaned fandoms (fandoms without active admins)
   */
  async getOrphanedFandoms(): Promise<
    Array<{
      fandom_id: string;
      fandom_name: string;
      last_admin_removed: Date;
    }>
  > {
    try {
      // Query for fandoms that have no active admin assignments
      const orphanedFandoms: Array<{
        fandom_id: string;
        fandom_name: string;
        last_admin_removed: Date;
      }> = [];

      return orphanedFandoms;
    } catch (error) {
      console.error('Error fetching orphaned fandoms:', error);
      return [];
    }
  }

  /**
   * Get fandom assignment statistics
   */
  async getFandomStats(): Promise<{
    total_fandoms: number;
    assigned_fandoms: number;
    orphaned_fandoms: number;
    multi_admin_fandoms: number;
  }> {
    try {
      // This would query the database for various statistics
      return {
        total_fandoms: 0,
        assigned_fandoms: 0,
        orphaned_fandoms: 0,
        multi_admin_fandoms: 0,
      };
    } catch (error) {
      console.error('Error fetching fandom stats:', error);
      return {
        total_fandoms: 0,
        assigned_fandoms: 0,
        orphaned_fandoms: 0,
        multi_admin_fandoms: 0,
      };
    }
  }

  /**
   * Bulk assign multiple users to a fandom
   */
  async bulkAssignFandomAdmins(
    userIds: string[],
    fandomId: string,
    assignedBy: string
  ): Promise<{
    successful: AdminAssignment[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const successful: AdminAssignment[] = [];
    const failed: Array<{ userId: string; error: string }> = [];

    for (const userId of userIds) {
      try {
        const assignment = await this.assignFandomAdmin(
          userId,
          fandomId,
          assignedBy
        );
        successful.push(assignment);
      } catch (error) {
        failed.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log bulk assignment
    await this.auditService.logAction({
      user_id: assignedBy,
      user_email: '',
      action: 'fandom:bulk_assign',
      resource_type: 'fandom_assignment',
      fandom_id: fandomId,
      details: {
        total_users: userIds.length,
        successful_count: successful.length,
        failed_count: failed.length,
        user_ids: userIds,
      },
    });

    return { successful, failed };
  }

  /**
   * Remove user from fandom (revoke fandom admin role)
   */
  async removeFandomAdmin(
    userId: string,
    fandomId: string,
    removedBy: string
  ): Promise<boolean> {
    try {
      const assignment = await this.getUserFandomAssignment(userId, fandomId);
      if (!assignment) {
        throw new Error('User is not assigned to this fandom');
      }

      await this.roleService.revokeRole(assignment.id, removedBy);

      // Log the removal
      await this.auditService.logAction({
        user_id: removedBy,
        user_email: '',
        action: 'fandom:remove_admin',
        resource_type: 'fandom_assignment',
        resource_id: assignment.id,
        fandom_id: fandomId,
        details: {
          removed_user_id: userId,
          fandom_id: fandomId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error removing fandom admin:', error);
      throw error;
    }
  }

  // Private helper methods

  private async validateFandomExists(fandomId: string): Promise<boolean> {
    try {
      // This would check if the fandom exists in the database
      // For now, assuming all provided fandoms exist
      return true;
    } catch (error) {
      console.error('Error validating fandom existence:', error);
      return false;
    }
  }

  private async getFandomInfo(
    fandomId: string
  ): Promise<{ name: string } | null> {
    try {
      // This would fetch fandom information from the database
      // For now, returning mock data
      return {
        name: `Fandom ${fandomId}`,
      };
    } catch (error) {
      console.error('Error fetching fandom info:', error);
      return null;
    }
  }
}
