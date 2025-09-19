/**
 * Invitation Service
 *
 * Service for managing admin invitations and onboarding workflow.
 * Handles invitation creation, validation, and user activation.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import type { AdminInvitation, AdminRole } from '@/types/admin';
import { RoleAssignmentService } from '@/lib/admin/services/RoleAssignmentService';
import { AuditLogService } from '@/lib/admin/services/AuditLogService';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';

export class InvitationService {
  private roleService: RoleAssignmentService;
  private auditService: AuditLogService;
  private adminModel: AdminUserModel;

  constructor() {
    this.roleService = new RoleAssignmentService();
    this.auditService = new AuditLogService();
    this.adminModel = AdminUserModel.getInstance();
  }

  /**
   * Create a new admin invitation
   */
  async createInvitation(
    email: string,
    role: AdminRole,
    invitedBy: string,
    fandomId?: string,
    expiresInDays: number = 7
  ): Promise<AdminInvitation> {
    try {
      // Validate inviting user has permission
      const hasPermission = await this.adminModel.hasPermission(
        invitedBy,
        'admin:invite'
      );

      if (!hasPermission) {
        throw new Error('Insufficient permissions to create invitations');
      }

      // Validate role and fandom requirements
      if (role === 'FandomAdmin' && !fandomId) {
        throw new Error('Fandom ID required for fandom admin invitations');
      }

      if (role === 'ProjectAdmin' && fandomId) {
        throw new Error('Project admin invitations should not specify fandom');
      }

      // Check if invitation already exists for this email
      const existingInvitation = await this.getActiveInvitation(
        email,
        fandomId
      );
      if (existingInvitation) {
        throw new Error('Active invitation already exists for this email');
      }

      // Generate unique token
      const token = this.generateInvitationToken();

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const invitation: AdminInvitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        role_id: `role_${role.toLowerCase()}`,
        role_name: role,
        fandom_id: fandomId,
        invitation_token: token,
        invited_by: invitedBy,
        invited_at: new Date(),
        expires_at: expiresAt,
        status: 'pending',
        accepted_at: undefined,
        accepted_by: undefined,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Save invitation to database
      await this.saveInvitation(invitation);

      // Send invitation email (would integrate with email service)
      await this.sendInvitationEmail(invitation);

      // Log the invitation creation
      await this.auditService.logAction({
        user_id: invitedBy,
        user_email: '',
        action: 'invitation:create',
        resource_type: 'admin_invitation',
        resource_id: invitation.id,
        fandom_id: fandomId,
        details: {
          invited_email: email,
          role_name: role,
          fandom_id: fandomId,
          expires_at: expiresAt.toISOString(),
        },
      });

      return invitation;
    } catch (error) {
      // Log failed action
      await this.auditService.logAction({
        user_id: invitedBy,
        user_email: '',
        action: 'invitation:create',
        resource_type: 'admin_invitation',
        fandom_id: fandomId,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Accept an invitation and activate admin role
   */
  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{
    invitation: AdminInvitation;
    assignment: any;
  }> {
    try {
      // Find invitation by token
      const invitation = await this.getInvitationByToken(token);
      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      // Validate invitation status
      if (invitation.status !== 'pending') {
        throw new Error('Invitation has already been processed');
      }

      // Check expiration
      if (invitation.expires_at < new Date()) {
        await this.markInvitationExpired(invitation.id);
        throw new Error('Invitation has expired');
      }

      // Create admin role assignment
      const assignment = await this.roleService.assignRole(
        userId,
        invitation.role_name,
        invitation.invited_by,
        invitation.fandom_id || undefined
      );

      // Update invitation status
      const updatedInvitation = await this.markInvitationAccepted(
        invitation.id,
        userId
      );

      // Log the acceptance
      await this.auditService.logAction({
        user_id: userId,
        user_email: invitation.email,
        action: 'invitation:accept',
        resource_type: 'admin_invitation',
        resource_id: invitation.id,
        fandom_id: invitation.fandom_id,
        details: {
          invitation_id: invitation.id,
          role_name: invitation.role_name,
          assignment_id: assignment.id,
        },
      });

      return {
        invitation: updatedInvitation,
        assignment,
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Reject an invitation
   */
  async rejectInvitation(
    token: string,
    reason?: string
  ): Promise<AdminInvitation> {
    try {
      const invitation = await this.getInvitationByToken(token);
      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation has already been processed');
      }

      const updatedInvitation = await this.markInvitationRejected(
        invitation.id,
        reason
      );

      // Log the rejection
      await this.auditService.logAction({
        user_id: invitation.invited_by,
        user_email: invitation.email,
        action: 'invitation:reject',
        resource_type: 'admin_invitation',
        resource_id: invitation.id,
        fandom_id: invitation.fandom_id,
        details: {
          invitation_id: invitation.id,
          rejection_reason: reason,
        },
      });

      return updatedInvitation;
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(
    invitationId: string,
    cancelledBy: string
  ): Promise<AdminInvitation> {
    try {
      const invitation = await this.getInvitationById(invitationId);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Only pending invitations can be cancelled');
      }

      // Verify permission to cancel
      const canCancel =
        invitation.invited_by === cancelledBy ||
        (await this.adminModel.hasPermission(cancelledBy, 'admin:invite'));

      if (!canCancel) {
        throw new Error('Insufficient permissions to cancel invitation');
      }

      const updatedInvitation = await this.markInvitationCancelled(
        invitationId
      );

      // Log the cancellation
      await this.auditService.logAction({
        user_id: cancelledBy,
        user_email: '',
        action: 'invitation:cancel',
        resource_type: 'admin_invitation',
        resource_id: invitation.id,
        fandom_id: invitation.fandom_id,
        details: {
          invitation_id: invitationId,
          cancelled_by: cancelledBy,
          original_inviter: invitation.invited_by,
        },
      });

      return updatedInvitation;
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw error;
    }
  }

  /**
   * Resend an invitation email
   */
  async resendInvitation(
    invitationId: string,
    resentBy: string
  ): Promise<AdminInvitation> {
    try {
      const invitation = await this.getInvitationById(invitationId);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Only pending invitations can be resent');
      }

      if (invitation.expires_at < new Date()) {
        throw new Error('Cannot resend expired invitation');
      }

      // Verify permission to resend
      const canResend =
        invitation.invited_by === resentBy ||
        (await this.adminModel.hasPermission(resentBy, 'admin:invite'));

      if (!canResend) {
        throw new Error('Insufficient permissions to resend invitation');
      }

      // Send invitation email again
      await this.sendInvitationEmail(invitation);

      // Log the resend action
      await this.auditService.logAction({
        user_id: resentBy,
        user_email: '',
        action: 'invitation:resend',
        resource_type: 'admin_invitation',
        resource_id: invitation.id,
        fandom_id: invitation.fandom_id,
        details: {
          invitation_id: invitationId,
          resent_by: resentBy,
          email: invitation.email,
        },
      });

      return invitation;
    } catch (error) {
      console.error('Error resending invitation:', error);
      throw error;
    }
  }

  /**
   * Get all invitations (with filtering)
   */
  async getInvitations(filters?: {
    status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
    fandom_id?: string;
    invited_by?: string;
    role?: AdminRole;
    limit?: number;
    offset?: number;
  }): Promise<{
    invitations: AdminInvitation[];
    total: number;
  }> {
    try {
      // This would query the database with filters
      // For now, returning empty result
      return {
        invitations: [],
        total: 0,
      };
    } catch (error) {
      console.error('Error fetching invitations:', error);
      return {
        invitations: [],
        total: 0,
      };
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    cancelled: number;
    expired: number;
  }> {
    try {
      // This would query the database for statistics
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        cancelled: 0,
        expired: 0,
      };
    } catch (error) {
      console.error('Error fetching invitation stats:', error);
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        cancelled: 0,
        expired: 0,
      };
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const now = new Date();
      const expiredInvitations = await this.getExpiredInvitations();

      let cleanedCount = 0;
      for (const invitation of expiredInvitations) {
        if (invitation.status === 'pending') {
          await this.markInvitationExpired(invitation.id);
          cleanedCount++;
        }
      }

      // Log cleanup operation
      await this.auditService.logAction({
        user_id: 'system',
        user_email: '',
        action: 'invitation:cleanup',
        resource_type: 'admin_invitation',
        details: {
          cleaned_count: cleanedCount,
          cleanup_date: now.toISOString(),
        },
      });

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      return 0;
    }
  }

  // Private helper methods

  private generateInvitationToken(): string {
    // Generate a secure random token
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 15);
    return `inv_${timestamp}_${randomPart}`;
  }

  private async sendInvitationEmail(
    invitation: AdminInvitation
  ): Promise<void> {
    try {
      // This would integrate with email service (SendGrid, SES, etc.)
      console.log(`Sending invitation email to ${invitation.email}`);
      console.log(`Role: ${invitation.role_name}`);
      console.log(`Token: ${invitation.invitation_token}`);
      console.log(`Expires: ${invitation.expires_at}`);
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
  }

  private async saveInvitation(invitation: AdminInvitation): Promise<void> {
    // This would save to database
    console.log('Saving invitation:', invitation.id);
  }

  private async getActiveInvitation(
    email: string,
    fandomId?: string
  ): Promise<AdminInvitation | null> {
    // This would query database for active invitation
    return null;
  }

  private async getInvitationByToken(
    token: string
  ): Promise<AdminInvitation | null> {
    // This would query database by token
    return null;
  }

  private async getInvitationById(id: string): Promise<AdminInvitation | null> {
    // This would query database by ID
    return null;
  }

  private async markInvitationAccepted(
    id: string,
    userId: string
  ): Promise<AdminInvitation> {
    // This would update invitation status in database
    const invitation: AdminInvitation = {
      id,
      email: '',
      role_id: 'role_fandomadmin',
      role_name: 'FandomAdmin',
      fandom_id: undefined,
      invitation_token: '',
      invited_by: '',
      expires_at: new Date(),
      status: 'accepted',
      accepted_at: new Date(),
      accepted_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    };
    return invitation;
  }

  private async markInvitationRejected(
    id: string,
    reason?: string
  ): Promise<AdminInvitation> {
    // This would update invitation status in database
    const invitation: AdminInvitation = {
      id,
      email: '',
      role_id: 'role_fandomadmin',
      role_name: 'FandomAdmin',
      fandom_id: undefined,
      invitation_token: '',
      invited_by: '',
      expires_at: new Date(),
      status: 'revoked', // Using 'revoked' as closest to 'rejected'
      accepted_at: undefined,
      accepted_by: undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };
    return invitation;
  }

  private async markInvitationCancelled(id: string): Promise<AdminInvitation> {
    // This would update invitation status in database
    const invitation: AdminInvitation = {
      id,
      email: '',
      role_id: 'role_fandomadmin',
      role_name: 'FandomAdmin',
      fandom_id: undefined,
      invitation_token: '',
      invited_by: '',
      expires_at: new Date(),
      status: 'revoked', // Using 'revoked' as closest to 'cancelled'
      accepted_at: undefined,
      accepted_by: undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };
    return invitation;
  }

  private async markInvitationExpired(id: string): Promise<AdminInvitation> {
    // This would update invitation status in database
    const invitation: AdminInvitation = {
      id,
      email: '',
      role_id: 'role_fandomadmin',
      role_name: 'FandomAdmin',
      fandom_id: undefined,
      invitation_token: '',
      invited_by: '',
      expires_at: new Date(),
      status: 'expired',
      accepted_at: undefined,
      accepted_by: undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };
    return invitation;
  }

  private async getExpiredInvitations(): Promise<AdminInvitation[]> {
    // This would query database for expired invitations
    return [];
  }
}
