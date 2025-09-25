/**
 * Test Suite: Admin Invitation Workflow
 *
 * Tests the invitation system for adding new administrators
 * with role-specific access and proper workflow handling.
 *
 * @package the-pensive-index
 * @group admin
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type {
  AdminInvitation,
  AdminUser,
  AdminAssignment,
} from '@/types/admin';
import { ADMIN_PERMISSIONS } from '@/types/admin';

// Mock services that will be implemented later
import { InvitationService } from '@/lib/admin/services/InvitationService';
import { AdminPermissionService } from '@/lib/admin/services/AdminPermissionService';
import { EmailService } from '@/lib/admin/services/EmailService';

describe('Admin Invitation Workflow', () => {
  let projectAdminUser: AdminUser;
  let fandomAdminUser: AdminUser;
  let testFandomId: string;
  let invitationService: InvitationService;

  beforeEach(async () => {
    testFandomId = 'fandom-harry-potter';
    invitationService = new InvitationService();

    projectAdminUser = {
      id: 'project-admin-test',
      email: 'project@test.com',
      name: 'Project Admin',
      assignments: [
        {
          id: 'assignment-project',
          user_id: 'project-admin-test',
          role: {
            id: 'project-admin',
            name: 'ProjectAdmin',
            description: 'Global admin with full platform permissions',
            level: 1,
            permissions: [
              ADMIN_PERMISSIONS.FANDOM_CREATE,
              ADMIN_PERMISSIONS.ADMIN_ASSIGN,
              ADMIN_PERMISSIONS.ADMIN_REVOKE,
            ],
            created_at: new Date(),
            updated_at: new Date(),
          },
          assigned_by: 'system',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    fandomAdminUser = {
      id: 'fandom-admin-test',
      email: 'fandom@test.com',
      name: 'Fandom Admin',
      assignments: [
        {
          id: 'assignment-fandom',
          user_id: 'fandom-admin-test',
          role: {
            id: 'fandom-admin',
            name: 'FandomAdmin',
            description:
              'Fandom-specific admin with content management permissions',
            level: 2,
            permissions: [
              ADMIN_PERMISSIONS.TAGS_MANAGE,
              ADMIN_PERMISSIONS.PLOTBLOCKS_MANAGE,
            ],
            created_at: new Date(),
            updated_at: new Date(),
          },
          fandom_id: testFandomId,
          assigned_by: 'project-admin-test',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
  });

  afterEach(async () => {
    // Cleanup test invitations
  });

  describe('Project Admin Invitation Creation', () => {
    it('should allow Project Admin to invite new Project Admin', async () => {
      const invitation = await invitationService.createInvitation({
        email: 'newproject@test.com',
        role_id: 'project-admin',
        invited_by: projectAdminUser.id,
        message: 'Welcome to the admin team!',
        expires_in_days: 7,
      });

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe('newproject@test.com');
      expect(invitation.role_id).toBe('project-admin');
      expect(invitation.role_name).toBe('ProjectAdmin');
      expect(invitation.fandom_id).toBeUndefined();
      expect(invitation.invited_by).toBe(projectAdminUser.id);
      expect(invitation.status).toBe('pending');
      expect(invitation.invitation_token).toBeDefined();
      expect(invitation.expires_at).toBeInstanceOf(Date);
    });

    it('should allow Project Admin to invite new Fandom Admin', async () => {
      const invitation = await invitationService.createInvitation({
        email: 'newfandom@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
        message: 'Welcome as Harry Potter fandom admin!',
        expires_in_days: 14,
      });

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe('newfandom@test.com');
      expect(invitation.role_id).toBe('fandom-admin');
      expect(invitation.role_name).toBe('FandomAdmin');
      expect(invitation.fandom_id).toBe(testFandomId);
      expect(invitation.invited_by).toBe(projectAdminUser.id);
      expect(invitation.status).toBe('pending');
    });

    it('should send invitation email when creating invitation', async () => {
      const emailService = new EmailService();
      const emailSpy = jest.spyOn(emailService, 'sendInvitationEmail');

      const invitation = await invitationService.createInvitation({
        email: 'test@example.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      expect(emailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        invitation_token: invitation.invitation_token,
        role_name: 'FandomAdmin',
        fandom_name: expect.any(String),
        invited_by_name: projectAdminUser.name,
        expires_at: invitation.expires_at,
        message: invitation.message,
      });
    });
  });

  describe('Fandom Admin Invitation Restrictions', () => {
    it('should NOT allow Fandom Admin to create invitations', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.ADMIN_ASSIGN
      );

      expect(hasPermission).toBe(false);

      await expect(
        invitationService.createInvitation({
          email: 'unauthorized@test.com',
          role_id: 'fandom-admin',
          fandom_id: testFandomId,
          invited_by: fandomAdminUser.id,
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Invitation Acceptance Workflow', () => {
    it('should allow valid invitation acceptance', async () => {
      const invitation = await invitationService.createInvitation({
        email: 'accept@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      const acceptedInvitation = await invitationService.acceptInvitation(
        invitation.invitation_token,
        'new-user-id'
      );

      expect(acceptedInvitation).toBeDefined();
      expect(acceptedInvitation.status).toBe('accepted');
      expect(acceptedInvitation.accepted_by).toBe('new-user-id');
      expect(acceptedInvitation.accepted_at).toBeInstanceOf(Date);
    });

    it('should create admin assignment when invitation is accepted', async () => {
      const invitation = await invitationService.createInvitation({
        email: 'assign@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      const assignment = await invitationService.acceptInvitation(
        invitation.invitation_token,
        'new-admin-user-id'
      );

      expect(assignment).toBeDefined();
      expect(assignment.user_id).toBe('new-admin-user-id');
      expect(assignment.role.name).toBe('FandomAdmin');
      expect(assignment.fandom_id).toBe(testFandomId);
      expect(assignment.assigned_by).toBe(projectAdminUser.id);
      expect(assignment.is_active).toBe(true);
    });

    it('should reject expired invitation acceptance', async () => {
      const expiredInvitation = await invitationService.createInvitation({
        email: 'expired@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
        expires_in_days: -1, // Already expired
      });

      await expect(
        invitationService.acceptInvitation(
          expiredInvitation.invitation_token,
          'user-id'
        )
      ).rejects.toThrow('Invitation has expired');
    });

    it('should reject invalid invitation token', async () => {
      await expect(
        invitationService.acceptInvitation('invalid-token', 'user-id')
      ).rejects.toThrow('Invalid invitation token');
    });

    it('should reject already accepted invitation', async () => {
      const invitation = await invitationService.createInvitation({
        email: 'duplicate@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      // Accept once
      await invitationService.acceptInvitation(
        invitation.invitation_token,
        'first-user-id'
      );

      // Try to accept again
      await expect(
        invitationService.acceptInvitation(
          invitation.invitation_token,
          'second-user-id'
        )
      ).rejects.toThrow('Invitation already accepted');
    });
  });

  describe('Invitation Management', () => {
    it('should allow listing pending invitations', async () => {
      await invitationService.createInvitation({
        email: 'pending1@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      await invitationService.createInvitation({
        email: 'pending2@test.com',
        role_id: 'project-admin',
        invited_by: projectAdminUser.id,
      });

      const pendingInvitations =
        await invitationService.getPendingInvitations();

      expect(pendingInvitations).toHaveLength(2);
      expect(pendingInvitations.every(inv => inv.status === 'pending')).toBe(
        true
      );
      expect(pendingInvitations.every(inv => inv.expires_at > new Date())).toBe(
        true
      );
    });

    it('should allow revoking pending invitation', async () => {
      const invitation = await invitationService.createInvitation({
        email: 'revoke@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      const revokedInvitation = await invitationService.revokeInvitation(
        invitation.id,
        projectAdminUser.id
      );

      expect(revokedInvitation.status).toBe('revoked');
    });

    it('should NOT allow revoking invitation by unauthorized user', async () => {
      const invitation = await invitationService.createInvitation({
        email: 'unauthorized@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      await expect(
        invitationService.revokeInvitation(
          invitation.id,
          'unauthorized-user-id'
        )
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should filter invitations by fandom for Project Admin', async () => {
      const otherFandomId = 'fandom-percy-jackson';

      await invitationService.createInvitation({
        email: 'hp@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      await invitationService.createInvitation({
        email: 'pj@test.com',
        role_id: 'fandom-admin',
        fandom_id: otherFandomId,
        invited_by: projectAdminUser.id,
      });

      const hpInvitations = await invitationService.getInvitationsByFandom(
        testFandomId,
        projectAdminUser.id
      );

      expect(hpInvitations).toHaveLength(1);
      expect(hpInvitations[0].email).toBe('hp@test.com');
      expect(hpInvitations[0].fandom_id).toBe(testFandomId);
    });
  });

  describe('Invitation Validation', () => {
    it('should validate email format', async () => {
      await expect(
        invitationService.createInvitation({
          email: 'invalid-email',
          role_id: 'fandom-admin',
          fandom_id: testFandomId,
          invited_by: projectAdminUser.id,
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate role existence', async () => {
      await expect(
        invitationService.createInvitation({
          email: 'valid@test.com',
          role_id: 'non-existent-role',
          fandom_id: testFandomId,
          invited_by: projectAdminUser.id,
        })
      ).rejects.toThrow('Invalid role');
    });

    it('should require fandom for FandomAdmin invitations', async () => {
      await expect(
        invitationService.createInvitation({
          email: 'valid@test.com',
          role_id: 'fandom-admin',
          // Missing fandom_id
          invited_by: projectAdminUser.id,
        })
      ).rejects.toThrow('Fandom required for FandomAdmin role');
    });

    it('should reject fandom for ProjectAdmin invitations', async () => {
      await expect(
        invitationService.createInvitation({
          email: 'valid@test.com',
          role_id: 'project-admin',
          fandom_id: testFandomId, // Should not be provided
          invited_by: projectAdminUser.id,
        })
      ).rejects.toThrow('Fandom not allowed for ProjectAdmin role');
    });

    it('should prevent duplicate pending invitations', async () => {
      await invitationService.createInvitation({
        email: 'duplicate@test.com',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
        invited_by: projectAdminUser.id,
      });

      await expect(
        invitationService.createInvitation({
          email: 'duplicate@test.com',
          role_id: 'fandom-admin',
          fandom_id: testFandomId,
          invited_by: projectAdminUser.id,
        })
      ).rejects.toThrow('Pending invitation already exists');
    });
  });
});
