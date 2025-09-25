/**
 * Test Suite: Fandom Admin Role Restrictions
 *
 * Tests the restrictions and scope limitations of Fandom Admin users
 * in the hierarchical admin system.
 *
 * @package the-pensive-index
 * @group admin
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AdminUser, AdminAssignment } from '@/types/admin';
import { ADMIN_PERMISSIONS } from '@/types/admin';

// Import AdminUserModel for test setup
import { AdminUserModel } from '../../src/lib/admin/models/AdminUser';

// Mock services that will be implemented later
import { AdminPermissionService } from '@/lib/admin/services/AdminPermissionService';
import { FandomContentService } from '@/lib/admin/services/FandomContentService';
import { AuditLogService } from '@/lib/admin/services/AuditLogService';

describe('Fandom Admin Role Restrictions', () => {
  let fandomAdminUser: AdminUser;
  let otherFandomAdminUser: AdminUser;
  let assignedFandomId: string;
  let otherFandomId: string;

  beforeEach(async () => {
    assignedFandomId = 'fandom-harry-potter';
    otherFandomId = 'fandom-percy-jackson';

    fandomAdminUser = {
      id: 'fandom-admin-user-1',
      email: 'fandomadmin1@test.com',
      name: 'Harry Potter Fandom Admin',
      assignments: [
        {
          id: 'assignment-hp-admin',
          user_id: 'fandom-admin-user-1',
          role: {
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
          fandom_id: assignedFandomId,
          fandom_name: 'Harry Potter',
          assigned_by: 'project-admin-user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    otherFandomAdminUser = {
      id: 'fandom-admin-user-2',
      email: 'fandomadmin2@test.com',
      name: 'Percy Jackson Fandom Admin',
      assignments: [
        {
          id: 'assignment-pj-admin',
          user_id: 'fandom-admin-user-2',
          role: {
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
          fandom_id: otherFandomId,
          fandom_name: 'Percy Jackson',
          assigned_by: 'project-admin-user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Set up test data in AdminUserModel
    const adminModel = AdminUserModel.getInstance();
    adminModel.setTestUser(fandomAdminUser);
    adminModel.setTestUser(otherFandomAdminUser);
  });

  afterEach(async () => {
    // Cleanup test data
    const adminModel = AdminUserModel.getInstance();
    adminModel.clearTestUsers();
  });

  describe('Fandom-Scoped Permissions', () => {
    it('should allow managing tags in assigned fandom', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.TAGS_MANAGE,
        assignedFandomId
      );

      expect(hasPermission).toBe(true);
    });

    it('should allow managing plot blocks in assigned fandom', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.PLOTBLOCKS_MANAGE,
        assignedFandomId
      );

      expect(hasPermission).toBe(true);
    });

    it('should allow managing validation rules in assigned fandom', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.VALIDATION_FANDOM,
        assignedFandomId
      );

      expect(hasPermission).toBe(true);
    });

    it('should allow reviewing story submissions in assigned fandom', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.SUBMISSIONS_REVIEW,
        assignedFandomId
      );

      expect(hasPermission).toBe(true);
    });
  });

  describe('Cross-Fandom Access Restrictions', () => {
    it('should NOT allow managing tags in non-assigned fandom', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.TAGS_MANAGE,
        otherFandomId
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT allow managing plot blocks in non-assigned fandom', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.PLOTBLOCKS_MANAGE,
        otherFandomId
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT allow accessing validation rules of other fandoms', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.VALIDATION_FANDOM,
        otherFandomId
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT allow reviewing submissions from other fandoms', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.SUBMISSIONS_REVIEW,
        otherFandomId
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('Global Permission Restrictions', () => {
    it('should NOT have permission to create fandoms', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.FANDOM_CREATE
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT have permission to edit fandom properties', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.FANDOM_EDIT
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT have permission to delete fandoms', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.FANDOM_DELETE
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT have permission to assign admin roles', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.ADMIN_ASSIGN
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT have permission to revoke admin roles', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.ADMIN_REVOKE
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT have permission to view global audit logs', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.AUDIT_VIEW
      );

      expect(hasPermission).toBe(false);
    });

    it('should NOT have permission to manage users globally', async () => {
      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        fandomAdminUser.id,
        ADMIN_PERMISSIONS.USERS_MANAGE
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('Content Access Filtering', () => {
    it('should only see content from assigned fandom', async () => {
      const contentService = new FandomContentService();

      const accessibleContent = await contentService.getAccessibleContent(
        fandomAdminUser.id
      );

      expect(accessibleContent).toBeDefined();
      expect(accessibleContent.fandoms).toHaveLength(1);
      expect(accessibleContent.fandoms[0].id).toBe(assignedFandomId);
    });

    it('should only see tags from assigned fandom', async () => {
      const contentService = new FandomContentService();

      const tags = await contentService.getTags(fandomAdminUser.id);

      expect(tags).toBeDefined();
      expect(tags.every(tag => tag.fandom_id === assignedFandomId)).toBe(true);
    });

    it('should only see plot blocks from assigned fandom', async () => {
      const contentService = new FandomContentService();

      const plotBlocks = await contentService.getPlotBlocks(fandomAdminUser.id);

      expect(plotBlocks).toBeDefined();
      expect(
        plotBlocks.every(block => block.fandom_id === assignedFandomId)
      ).toBe(true);
    });

    it('should only see validation rules from assigned fandom', async () => {
      const contentService = new FandomContentService();

      const validationRules = await contentService.getValidationRules(
        fandomAdminUser.id
      );

      expect(validationRules).toBeDefined();
      expect(
        validationRules.every(rule => rule.fandom_id === assignedFandomId)
      ).toBe(true);
    });
  });

  describe('Audit Log Restrictions', () => {
    it('should only see audit logs for assigned fandom', async () => {
      const auditService = new AuditLogService();

      const logs = await auditService.getAuditLogs(fandomAdminUser.id, {
        fandom_id: assignedFandomId,
      });

      expect(logs).toBeDefined();
      expect(
        logs.every(
          log => log.fandom_id === assignedFandomId || log.fandom_id === null
        )
      ).toBe(true);
    });

    it('should NOT see audit logs for other fandoms', async () => {
      const auditService = new AuditLogService();

      const logs = await auditService.getAuditLogs(fandomAdminUser.id, {
        fandom_id: otherFandomId,
      });

      expect(logs).toHaveLength(0);
    });

    it('should NOT see global audit logs', async () => {
      const auditService = new AuditLogService();

      const globalLogs = await auditService.getGlobalAuditLogs(
        fandomAdminUser.id
      );

      expect(globalLogs).toHaveLength(0);
    });
  });

  describe('Multi-Fandom Admin Edge Cases', () => {
    it('should handle admin assigned to multiple fandoms', async () => {
      // Add another fandom assignment to the user
      const multiFandomAdmin: AdminUser = {
        ...fandomAdminUser,
        assignments: [
          ...fandomAdminUser.assignments,
          {
            id: 'assignment-multi',
            user_id: fandomAdminUser.id,
            role: fandomAdminUser.assignments[0].role,
            fandom_id: otherFandomId,
            fandom_name: 'Percy Jackson',
            assigned_by: 'project-admin-user',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      // Update the user in AdminUserModel
      const adminModel = AdminUserModel.getInstance();
      adminModel.setTestUser(multiFandomAdmin);

      const permissionService = new AdminPermissionService();

      // Should have access to both fandoms
      const hasPermissionFandom1 = await permissionService.checkPermission(
        multiFandomAdmin.id,
        ADMIN_PERMISSIONS.TAGS_MANAGE,
        assignedFandomId
      );

      const hasPermissionFandom2 = await permissionService.checkPermission(
        multiFandomAdmin.id,
        ADMIN_PERMISSIONS.TAGS_MANAGE,
        otherFandomId
      );

      expect(hasPermissionFandom1).toBe(true);
      expect(hasPermissionFandom2).toBe(true);
    });

    it('should handle inactive assignments correctly', async () => {
      // Deactivate the assignment
      const inactiveAdmin: AdminUser = {
        ...fandomAdminUser,
        assignments: [
          {
            ...fandomAdminUser.assignments[0],
            is_active: false,
          },
        ],
      };

      // Update the user in AdminUserModel
      const adminModel = AdminUserModel.getInstance();
      adminModel.setTestUser(inactiveAdmin);

      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        inactiveAdmin.id,
        ADMIN_PERMISSIONS.TAGS_MANAGE,
        assignedFandomId
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle expired assignments correctly', async () => {
      // Create expired assignment
      const expiredAdmin: AdminUser = {
        ...fandomAdminUser,
        assignments: [
          {
            ...fandomAdminUser.assignments[0],
            expires_at: new Date(Date.now() - 86400000), // Expired yesterday
          },
        ],
      };

      // Update the user in AdminUserModel
      const adminModel = AdminUserModel.getInstance();
      adminModel.setTestUser(expiredAdmin);

      const permissionService = new AdminPermissionService();

      const hasPermission = await permissionService.checkPermission(
        expiredAdmin.id,
        ADMIN_PERMISSIONS.TAGS_MANAGE,
        assignedFandomId
      );

      expect(hasPermission).toBe(false);
    });
  });
});
