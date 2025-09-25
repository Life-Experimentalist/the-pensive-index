/**
 * Test Suite: Audit Logging Functionality
 *
 * Tests the audit logging system for tracking all admin actions
 * with proper attribution, context, and access controls.
 *
 * @package the-pensive-index
 * @group admin
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AdminAuditLog, AdminUser } from '@/types/admin';
import { ADMIN_PERMISSIONS } from '@/types/admin';

// Mock services that will be implemented later
import { AuditLogService } from '@/lib/admin/services/AuditLogService';
import { AdminPermissionService } from '@/lib/admin/services/AdminPermissionService';

describe('Audit Logging Functionality', () => {
  let auditService: AuditLogService;
  let projectAdminUser: AdminUser;
  let fandomAdminUser: AdminUser;
  let testFandomId: string;

  beforeEach(async () => {
    auditService = new AuditLogService();
    testFandomId = 'fandom-harry-potter';

    projectAdminUser = {
      id: 'project-admin-audit',
      email: 'project@audit.test',
      name: 'Project Admin Audit',
      assignments: [
        {
          id: 'assignment-project-audit',
          user_id: 'project-admin-audit',
          role: {
            id: 'project-admin',
            name: 'ProjectAdmin',
            description: 'Global admin with full platform permissions',
            level: 1,
            permissions: [ADMIN_PERMISSIONS.AUDIT_VIEW],
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
      id: 'fandom-admin-audit',
      email: 'fandom@audit.test',
      name: 'Fandom Admin Audit',
      assignments: [
        {
          id: 'assignment-fandom-audit',
          user_id: 'fandom-admin-audit',
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
          assigned_by: 'project-admin-audit',
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
    // Cleanup test audit logs
  });

  describe('Audit Log Creation', () => {
    it('should log admin role assignment actions', async () => {
      const logEntry = await auditService.logAction({
        user_id: projectAdminUser.id,
        user_email: projectAdminUser.email,
        action: 'admin:assign',
        resource_type: 'admin_assignment',
        resource_id: 'assignment-new-123',
        fandom_id: testFandomId,
        details: {
          assigned_user_id: 'new-admin-user',
          role_id: 'fandom-admin',
          fandom_id: testFandomId,
        },
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 Test Browser',
      });

      expect(logEntry).toBeDefined();
      expect(logEntry.user_id).toBe(projectAdminUser.id);
      expect(logEntry.user_email).toBe(projectAdminUser.email);
      expect(logEntry.action).toBe('admin:assign');
      expect(logEntry.resource_type).toBe('admin_assignment');
      expect(logEntry.resource_id).toBe('assignment-new-123');
      expect(logEntry.fandom_id).toBe(testFandomId);
      expect(logEntry.success).toBe(true);
      expect(logEntry.timestamp).toBeInstanceOf(Date);
      expect(logEntry.details).toEqual({
        assigned_user_id: 'new-admin-user',
        role_id: 'fandom-admin',
        fandom_id: testFandomId,
      });
    });

    it('should log fandom creation actions', async () => {
      const logEntry = await auditService.logAction({
        user_id: projectAdminUser.id,
        user_email: projectAdminUser.email,
        action: 'fandom:create',
        resource_type: 'fandom',
        resource_id: 'new-fandom-id',
        details: {
          fandom_name: 'New Test Fandom',
          description: 'A test fandom for validation',
        },
      });

      expect(logEntry.action).toBe('fandom:create');
      expect(logEntry.resource_type).toBe('fandom');
      expect(logEntry.details.fandom_name).toBe('New Test Fandom');
    });

    it('should log validation rule changes', async () => {
      const logEntry = await auditService.logAction({
        user_id: fandomAdminUser.id,
        user_email: fandomAdminUser.email,
        action: 'validation:update',
        resource_type: 'validation_rule',
        resource_id: 'rule-123',
        fandom_id: testFandomId,
        details: {
          rule_name: 'Character shipping conflict',
          old_definition: {
            /* old rule */
          },
          new_definition: {
            /* new rule */
          },
        },
      });

      expect(logEntry.action).toBe('validation:update');
      expect(logEntry.fandom_id).toBe(testFandomId);
      expect(logEntry.details.rule_name).toBe('Character shipping conflict');
    });

    it('should log failed actions with error details', async () => {
      const logEntry = await auditService.logAction({
        user_id: fandomAdminUser.id,
        user_email: fandomAdminUser.email,
        action: 'admin:assign',
        resource_type: 'admin_assignment',
        success: false,
        error_message: 'Insufficient permissions: cannot assign admin roles',
      });

      expect(logEntry.success).toBe(false);
      expect(logEntry.error_message).toBe(
        'Insufficient permissions: cannot assign admin roles'
      );
    });
  });

  describe('Audit Log Retrieval', () => {
    beforeEach(async () => {
      // Create test audit logs
      await auditService.logAction({
        user_id: projectAdminUser.id,
        user_email: projectAdminUser.email,
        action: 'fandom:create',
        resource_type: 'fandom',
        resource_id: 'fandom-1',
      });

      await auditService.logAction({
        user_id: fandomAdminUser.id,
        user_email: fandomAdminUser.email,
        action: 'tags:create',
        resource_type: 'tag',
        resource_id: 'tag-1',
        fandom_id: testFandomId,
      });

      await auditService.logAction({
        user_id: fandomAdminUser.id,
        user_email: fandomAdminUser.email,
        action: 'tags:update',
        resource_type: 'tag',
        resource_id: 'tag-2',
        fandom_id: testFandomId,
      });
    });

    it('should allow Project Admin to view all audit logs', async () => {
      const logs = await auditService.getAuditLogs(projectAdminUser.id);

      expect(logs.length).toBeGreaterThanOrEqual(3);

      // Should see logs from all users and actions
      const userIds = [...new Set(logs.map(log => log.user_id))];
      expect(userIds).toContain(projectAdminUser.id);
      expect(userIds).toContain(fandomAdminUser.id);
    });

    it('should restrict Fandom Admin to fandom-specific logs only', async () => {
      const logs = await auditService.getAuditLogs(fandomAdminUser.id);

      // Should only see logs related to their fandom
      expect(
        logs.every(
          log =>
            log.fandom_id === testFandomId ||
            (log.user_id === fandomAdminUser.id && log.fandom_id === null)
        )
      ).toBe(true);
    });

    it('should filter logs by action type', async () => {
      const tagLogs = await auditService.getAuditLogs(projectAdminUser.id, {
        action: 'tags:create',
      });

      expect(tagLogs.every(log => log.action === 'tags:create')).toBe(true);
    });

    it('should filter logs by fandom', async () => {
      const fandomLogs = await auditService.getAuditLogs(projectAdminUser.id, {
        fandom_id: testFandomId,
      });

      expect(fandomLogs.every(log => log.fandom_id === testFandomId)).toBe(
        true
      );
    });

    it('should filter logs by date range', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);

      const recentLogs = await auditService.getAuditLogs(projectAdminUser.id, {
        start_date: yesterday,
        end_date: tomorrow,
      });

      expect(recentLogs.length).toBeGreaterThan(0);
      expect(
        recentLogs.every(
          log => log.timestamp >= yesterday && log.timestamp <= tomorrow
        )
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await auditService.getAuditLogs(projectAdminUser.id, {
        page: 1,
        limit: 2,
      });

      const page2 = await auditService.getAuditLogs(projectAdminUser.id, {
        page: 2,
        limit: 2,
      });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);

      // Ensure no overlap
      const page1Ids = page1.map(log => log.id);
      const page2Ids = page2.map(log => log.id);
      expect(page1Ids.every(id => !page2Ids.includes(id))).toBe(true);
    });
  });

  describe('Audit Log Access Control', () => {
    it('should deny audit log access to regular users', async () => {
      const regularUser = {
        id: 'regular-user',
        email: 'regular@test.com',
        name: 'Regular User',
        assignments: [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await expect(auditService.getAuditLogs(regularUser.id)).rejects.toThrow(
        'Insufficient permissions to view audit logs'
      );
    });

    it('should deny audit log creation by unauthorized users', async () => {
      await expect(
        auditService.logAction({
          user_id: 'unauthorized-user',
          user_email: 'unauthorized@test.com',
          action: 'unauthorized:action',
          resource_type: 'test',
        })
      ).rejects.toThrow('Unauthorized audit log creation');
    });
  });

  describe('Audit Log Security', () => {
    it('should not allow modification of existing audit logs', async () => {
      const logEntry = await auditService.logAction({
        user_id: projectAdminUser.id,
        user_email: projectAdminUser.email,
        action: 'test:action',
        resource_type: 'test',
      });

      await expect(
        auditService.updateAuditLog(logEntry.id, {
          action: 'modified:action',
        })
      ).rejects.toThrow('Audit logs are immutable');
    });

    it('should not allow deletion of audit logs', async () => {
      const logEntry = await auditService.logAction({
        user_id: projectAdminUser.id,
        user_email: projectAdminUser.email,
        action: 'test:action',
        resource_type: 'test',
      });

      await expect(auditService.deleteAuditLog(logEntry.id)).rejects.toThrow(
        'Audit logs cannot be deleted'
      );
    });

    it('should sanitize sensitive data in log details', async () => {
      const logEntry = await auditService.logAction({
        user_id: projectAdminUser.id,
        user_email: projectAdminUser.email,
        action: 'user:update',
        resource_type: 'user',
        details: {
          user_id: 'test-user',
          password: 'secret123', // Should be sanitized
          email: 'test@example.com',
          api_key: 'sk-1234567890', // Should be sanitized
        },
      });

      expect(logEntry.details.password).toBe('[REDACTED]');
      expect(logEntry.details.api_key).toBe('[REDACTED]');
      expect(logEntry.details.email).toBe('test@example.com'); // Should remain
    });
  });

  describe('Automated Audit Logging', () => {
    it('should automatically log admin assignment changes via database triggers', async () => {
      // This would test that the database triggers are working
      // For now, we'll test the expected behavior

      // Simulate an admin assignment
      const assignmentId = 'auto-assignment-123';

      // The trigger should have created an audit log
      const logs = await auditService.getAuditLogs(projectAdminUser.id, {
        action: 'admin:assign',
        resource_id: assignmentId,
      });

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('admin:assign');
      expect(logs[0].resource_id).toBe(assignmentId);
    });

    it('should automatically log permission changes', async () => {
      const permissionService = new AdminPermissionService();

      // This should trigger automatic audit logging
      await permissionService.updateUserPermissions(
        'test-user-id',
        ['new:permission'],
        projectAdminUser.id
      );

      const logs = await auditService.getAuditLogs(projectAdminUser.id, {
        action: 'permissions:update',
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('permissions:update');
    });
  });

  describe('Audit Log Retention and Cleanup', () => {
    it('should support audit log retention policies', async () => {
      // Create old audit log
      const oldDate = new Date(Date.now() - (365 * 2 + 1) * 86400000); // 2+ years ago

      await auditService.logAction({
        user_id: projectAdminUser.id,
        user_email: projectAdminUser.email,
        action: 'old:action',
        resource_type: 'test',
        timestamp: oldDate,
      });

      // Run cleanup process
      const cleanupResult = await auditService.cleanupOldLogs(
        2 * 365 // 2 years retention
      );

      expect(cleanupResult.deleted_count).toBeGreaterThan(0);
    });

    it('should preserve critical audit logs beyond retention period', async () => {
      const criticalActions = [
        'admin:assign',
        'admin:revoke',
        'fandom:delete',
        'security:violation',
      ];

      // These should never be cleaned up regardless of age
      for (const action of criticalActions) {
        const preservedLogs = await auditService.getAuditLogs(
          projectAdminUser.id,
          { action }
        );

        // Verify they exist and are preserved
        expect(preservedLogs.every(log => log.action === action)).toBe(true);
      }
    });
  });
});
