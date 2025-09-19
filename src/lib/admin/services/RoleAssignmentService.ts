/**
 * Role Assignment Service
 *
 * Service for managing admin role assignments in the hierarchical admin system.
 * Handles assignment, revocation, and validation of admin roles.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import type { AdminAssignment, AdminRole } from '@/types/admin';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { AuditLogService } from '@/lib/admin/services/AuditLogService';

export class RoleAssignmentService {
  private adminModel: AdminUserModel;
  private auditService: AuditLogService;

  constructor() {
    this.adminModel = AdminUserModel.getInstance();
    this.auditService = new AuditLogService();
  }

  /**
   * Assign a role to a user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    fandomId?: string,
    expiresAt?: Date
  ): Promise<AdminAssignment> {
    try {
      // Validate assigning user has permission
      const hasPermission = await this.adminModel.hasPermission(
        assignedBy,
        'admin:assign'
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to assign roles');
      }

      // Validate target user exists
      const userExists = await this.adminModel.validateUserExists(userId);
      if (!userExists) {
        throw new Error('User not found');
      }

      // Validate role exists
      const role = await this.adminModel.getRoleById(roleId);
      if (!role) {
        throw new Error('Invalid role');
      }

      // Validate fandom requirements
      if (role.name === 'FandomAdmin' && !fandomId) {
        throw new Error('Fandom required for FandomAdmin role');
      }

      if (role.name === 'ProjectAdmin' && fandomId) {
        throw new Error('Fandom not allowed for ProjectAdmin role');
      }

      // Check for existing active assignment
      const existingAssignments = await this.adminModel.getUserAssignments(
        userId
      );
      const duplicateAssignment = existingAssignments.find(
        a => a.is_active && a.role.id === roleId && a.fandom_id === fandomId
      );

      if (duplicateAssignment) {
        throw new Error(
          'User already has active assignment for this role and fandom'
        );
      }

      // Create assignment record
      const assignmentId = this.generateAssignmentId();
      const assignment: AdminAssignment = {
        id: assignmentId,
        user_id: userId,
        role,
        fandom_id: fandomId,
        assigned_by: assignedBy,
        is_active: true,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Save to database (would be implemented with actual DB operations)
      await this.saveAssignment(assignment);

      // Log the action
      await this.auditService.logAction({
        user_id: assignedBy,
        user_email: '', // Would be fetched from user info
        action: 'admin:assign',
        resource_type: 'admin_assignment',
        resource_id: assignmentId,
        fandom_id: fandomId,
        details: {
          assigned_user_id: userId,
          role_id: roleId,
          fandom_id: fandomId,
          expires_at: expiresAt?.toISOString(),
        },
      });

      return assignment;
    } catch (error) {
      // Log failed action
      await this.auditService.logAction({
        user_id: assignedBy,
        user_email: '',
        action: 'admin:assign',
        resource_type: 'admin_assignment',
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Revoke a role assignment
   */
  async revokeRole(assignmentId: string, revokedBy: string): Promise<boolean> {
    try {
      // Validate revoking user has permission
      const hasPermission = await this.adminModel.hasPermission(
        revokedBy,
        'admin:revoke'
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to revoke roles');
      }

      // Get assignment details
      const assignment = await this.getAssignmentById(assignmentId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      if (!assignment.is_active) {
        throw new Error('Assignment is already inactive');
      }

      // Deactivate assignment
      await this.deactivateAssignment(assignmentId, revokedBy);

      // Log the action
      await this.auditService.logAction({
        user_id: revokedBy,
        user_email: '',
        action: 'admin:revoke',
        resource_type: 'admin_assignment',
        resource_id: assignmentId,
        fandom_id: assignment.fandom_id,
        details: {
          revoked_user_id: assignment.user_id,
          role_id: assignment.role.id,
          fandom_id: assignment.fandom_id,
        },
      });

      return true;
    } catch (error) {
      // Log failed action
      await this.auditService.logAction({
        user_id: revokedBy,
        user_email: '',
        action: 'admin:revoke',
        resource_type: 'admin_assignment',
        resource_id: assignmentId,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(
    assignmentId: string
  ): Promise<AdminAssignment | null> {
    try {
      // Query database for assignment
      // This would be implemented with actual database queries
      return null;
    } catch (error) {
      console.error('Error fetching assignment:', error);
      return null;
    }
  }

  /**
   * Get all assignments with filters
   */
  async getAssignments(filters: {
    user_id?: string;
    role_id?: string;
    fandom_id?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    assignments: AdminAssignment[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // This would implement database queries with filters and pagination
      const assignments: AdminAssignment[] = [];

      return {
        assignments,
        total: assignments.length,
        page: filters.page || 1,
        limit: filters.limit || 10,
      };
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return {
        assignments: [],
        total: 0,
        page: 1,
        limit: 10,
      };
    }
  }

  /**
   * Update assignment expiration
   */
  async updateAssignmentExpiration(
    assignmentId: string,
    expiresAt: Date | null,
    updatedBy: string
  ): Promise<boolean> {
    try {
      // Validate user has permission
      const hasPermission = await this.adminModel.hasPermission(
        updatedBy,
        'admin:assign'
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to update assignments');
      }

      // Update assignment expiration
      await this.updateAssignmentField(assignmentId, 'expires_at', expiresAt);

      // Log the action
      await this.auditService.logAction({
        user_id: updatedBy,
        user_email: '',
        action: 'admin:update_expiration',
        resource_type: 'admin_assignment',
        resource_id: assignmentId,
        details: {
          new_expires_at: expiresAt?.toISOString() || null,
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating assignment expiration:', error);
      throw error;
    }
  }

  /**
   * Get assignments expiring soon
   */
  async getExpiringAssignments(
    daysAhead: number = 7
  ): Promise<AdminAssignment[]> {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysAhead);

      // Query for assignments expiring within the specified timeframe
      const assignments: AdminAssignment[] = [];

      return assignments;
    } catch (error) {
      console.error('Error fetching expiring assignments:', error);
      return [];
    }
  }

  /**
   * Bulk revoke assignments (e.g., when user leaves)
   */
  async bulkRevokeUserAssignments(
    userId: string,
    revokedBy: string
  ): Promise<string[]> {
    try {
      const userAssignments = await this.adminModel.getUserAssignments(userId);
      const activeAssignments = userAssignments.filter(a => a.is_active);

      const revokedIds: string[] = [];

      for (const assignment of activeAssignments) {
        await this.revokeRole(assignment.id, revokedBy);
        revokedIds.push(assignment.id);
      }

      return revokedIds;
    } catch (error) {
      console.error('Error bulk revoking assignments:', error);
      throw error;
    }
  }

  /**
   * Transfer assignments between users (for succession planning)
   */
  async transferAssignments(
    fromUserId: string,
    toUserId: string,
    transferredBy: string,
    specificFandomId?: string
  ): Promise<{
    revoked: string[];
    created: string[];
  }> {
    try {
      // Validate permissions
      const hasPermission = await this.adminModel.hasPermission(
        transferredBy,
        'admin:assign'
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to transfer assignments');
      }

      // Get assignments to transfer
      const assignments = await this.adminModel.getUserAssignments(fromUserId);
      const assignmentsToTransfer = assignments.filter(
        a =>
          a.is_active && (!specificFandomId || a.fandom_id === specificFandomId)
      );

      const revokedIds: string[] = [];
      const createdIds: string[] = [];

      for (const assignment of assignmentsToTransfer) {
        // Revoke old assignment
        await this.revokeRole(assignment.id, transferredBy);
        revokedIds.push(assignment.id);

        // Create new assignment
        const newAssignment = await this.assignRole(
          toUserId,
          assignment.role.id,
          transferredBy,
          assignment.fandom_id,
          assignment.expires_at || undefined
        );
        createdIds.push(newAssignment.id);
      }

      // Log the transfer
      await this.auditService.logAction({
        user_id: transferredBy,
        user_email: '',
        action: 'admin:transfer',
        resource_type: 'admin_assignment',
        details: {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          fandom_id: specificFandomId,
          revoked_assignments: revokedIds,
          created_assignments: createdIds,
        },
      });

      return {
        revoked: revokedIds,
        created: createdIds,
      };
    } catch (error) {
      console.error('Error transferring assignments:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateAssignmentId(): string {
    return `assignment-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  private async saveAssignment(assignment: AdminAssignment): Promise<void> {
    // This would save the assignment to the database
    // Implementation would depend on the database layer
  }

  private async deactivateAssignment(
    assignmentId: string,
    revokedBy: string
  ): Promise<void> {
    // This would update the assignment to set is_active = false
    // and update the updated_at timestamp
  }

  private async updateAssignmentField(
    assignmentId: string,
    field: string,
    value: any
  ): Promise<void> {
    // This would update a specific field in the assignment record
  }
}
