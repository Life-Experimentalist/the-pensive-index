/**
 * T032 Contract Test: Admin Assignment API Endpoint
 *
 * Tests for POST /api/v1/admin/submissions/{id}/assign
 * Validates moderator assignment, workload balancing, and notification workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock services
vi.mock('../../../../../../../src/lib/services/queue-service', () => {
  return {
    QueueService: vi.fn(() => ({
      assignSubmission: vi.fn(),
      getModeratorWorkload: vi.fn(),
      getWorkloadThreshold: vi.fn(),
      suggestAlternateModerators: vi.fn(),
      getQueueStatistics: vi.fn(),
    })),
  };
});

vi.mock('../../../../../../../src/lib/services/submission-service', () => {
  return {
    SubmissionService: vi.fn(() => ({
      getSubmissionById: vi.fn(),
      updateSubmissionStatus: vi.fn(),
      logModerationAction: vi.fn(),
    })),
  };
});

vi.mock('../../../../../../../src/lib/admin/models/AdminUser', () => {
  return {
    AdminUserModel: {
      getInstance: vi.fn(() => ({
        getByClerkId: vi.fn(),
      })),
    },
  };
});

vi.mock('../../../../../../../src/lib/admin/utils/PermissionValidator', () => {
  return {
    PermissionValidator: {
      getInstance: vi.fn(() => ({
        hasPermission: vi.fn(),
      })),
    },
  };
});

vi.mock('../../../../../../../src/lib/notifications/email-service', () => {
  return {
    EmailService: vi.fn(() => ({
      sendModeratorAssignmentNotification: vi.fn(),
    })),
  };
});

import { auth } from '@clerk/nextjs/server';
import { POST } from '../../app/api/v1/admin/submissions/[id]/assign/route';

describe('T032 Contract: Admin Assignment API Endpoint', () => {
  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = vi.mocked(auth);
  });

  // Helper function to create test request
  const createRequest = (body: any) => {
    return new NextRequest(
      'http://localhost:3000/api/v1/admin/submissions/sub-123/assign',
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  };

  // Helper to create test context with submission ID
  const createContext = (id: string) => ({ params: { id } });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = createRequest({
        moderatorId: 'mod-123',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should require admin user record', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      // Mock AdminUserModel to return null
      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValue(null);

      const request = createRequest({
        moderatorId: 'mod-123',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Admin user not found');
    });

    it('should require valid submission', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      // Mock admin user
      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValue({
        id: 'admin-1',
        clerkId: 'admin-user',
        email: 'admin@test.com',
        role: { name: 'SuperAdmin' },
      });

      // Mock submission not found
      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue(null);

      const request = createRequest({
        moderatorId: 'mod-123',
      });

      const response = await POST(request, createContext('non-existent'));

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Submission not found');
    });

    it('should require assignment permissions', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      // Mock admin user
      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValue({
        id: 'admin-1',
        clerkId: 'admin-user',
        email: 'admin@test.com',
        role: { name: 'FandomAdmin' },
      });

      // Mock submission exists
      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'pending',
        priority: 'medium',
      });

      // Mock permission denied
      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(false);

      const request = createRequest({
        moderatorId: 'mod-123',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Insufficient permissions');
    });
  });

  describe('Request Validation', () => {
    beforeEach(async () => {
      // Setup successful auth and permissions
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValue({
        id: 'admin-1',
        clerkId: 'admin-user',
        email: 'admin@test.com',
        role: { name: 'SuperAdmin' },
      });

      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'pending',
        priority: 'medium',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);
    });

    it('should require moderatorId', async () => {
      const request = createRequest({
        // Missing moderatorId
        priority: 'high',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('moderatorId'))).toBe(
        true
      );
    });

    it('should validate priority enum', async () => {
      const request = createRequest({
        moderatorId: 'mod-123',
        priority: 'invalid-priority',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('priority'))).toBe(
        true
      );
    });

    it('should validate estimatedReviewTime range', async () => {
      const request = createRequest({
        moderatorId: 'mod-123',
        estimatedReviewTime: 500, // Over 480 minute max
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(
        data.details.some((d: string) => d.includes('estimatedReviewTime'))
      ).toBe(true);
    });

    it('should validate notes length', async () => {
      const request = createRequest({
        moderatorId: 'mod-123',
        notes: 'a'.repeat(501), // Over 500 character limit
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('notes'))).toBe(true);
    });

    it('should validate datetime format for deadline', async () => {
      const request = createRequest({
        moderatorId: 'mod-123',
        deadline: 'invalid-date-format',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('deadline'))).toBe(
        true
      );
    });
  });

  describe('Moderator Validation', () => {
    beforeEach(async () => {
      // Setup successful auth and permissions
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValueOnce({
        id: 'admin-1',
        clerkId: 'admin-user',
        email: 'admin@test.com',
        role: { name: 'SuperAdmin' },
      });

      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'pending',
        priority: 'medium',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValueOnce(true); // For admin assignment permission
    });

    it('should require valid target moderator', async () => {
      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValueOnce(null); // Target moderator not found

      const request = createRequest({
        moderatorId: 'non-existent-mod',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Target moderator not found');
    });

    it('should validate moderator fandom permissions', async () => {
      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValueOnce({
        id: 'mod-1',
        clerkId: 'mod-123',
        email: 'mod@test.com',
        role: { name: 'FandomAdmin' },
      }); // Target moderator exists

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValueOnce(false); // Moderator can't moderate this fandom

      const request = createRequest({
        moderatorId: 'mod-123',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid moderator assignment');
      expect(data.details).toContain('cannot moderate submissions');
    });
  });

  describe('Workload Balancing', () => {
    beforeEach(async () => {
      // Setup successful auth, permissions, and moderator
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId
        .mockResolvedValueOnce({
          id: 'admin-1',
          clerkId: 'admin-user',
          email: 'admin@test.com',
          role: { name: 'SuperAdmin' },
        })
        .mockResolvedValueOnce({
          id: 'mod-1',
          clerkId: 'mod-123',
          email: 'mod@test.com',
          role: { name: 'FandomAdmin' },
        });

      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'pending',
        priority: 'medium',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);
    });

    it('should check moderator workload before assignment', async () => {
      const { QueueService } = await import(
        '../../../../../../../src/lib/services/queue-service'
      );
      const mockQueueService = vi.mocked(QueueService).prototype;

      // Mock excessive workload
      mockQueueService.getModeratorWorkload.mockResolvedValue({
        moderatorId: 'mod-123',
        activeAssignments: 10,
        averageReviewTime: 120,
        completedThisWeek: 5,
      });

      mockQueueService.getWorkloadThreshold.mockResolvedValue({
        maxActiveAssignments: 5,
        maxWeeklyAssignments: 20,
        warningThreshold: 0.8,
      });

      mockQueueService.suggestAlternateModerators.mockResolvedValue([
        {
          moderatorId: 'alt-mod-1',
          email: 'alt1@test.com',
          currentWorkload: 2,
          estimatedCapacity: 3,
        },
      ]);

      const request = createRequest({
        moderatorId: 'mod-123',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Moderator workload exceeded');
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
    });

    it('should allow assignment when workload is within limits', async () => {
      const { QueueService } = await import(
        '../../../../../../../src/lib/services/queue-service'
      );
      const mockQueueService = vi.mocked(QueueService).prototype;

      // Mock acceptable workload
      mockQueueService.getModeratorWorkload
        .mockResolvedValueOnce({
          moderatorId: 'mod-123',
          activeAssignments: 3,
          averageReviewTime: 90,
          completedThisWeek: 2,
        })
        .mockResolvedValueOnce({
          moderatorId: 'mod-123',
          activeAssignments: 4,
          averageReviewTime: 95,
          completedThisWeek: 2,
        });

      mockQueueService.getWorkloadThreshold.mockResolvedValue({
        maxActiveAssignments: 5,
        maxWeeklyAssignments: 20,
        warningThreshold: 0.8,
      });

      mockQueueService.assignSubmission.mockResolvedValue({
        id: 'assignment-1',
        submissionId: 'sub-123',
        moderatorId: 'mod-123',
        assignedAt: new Date().toISOString(),
      });

      mockQueueService.getQueueStatistics.mockResolvedValue({
        totalPending: 9,
        totalAssigned: 6,
        totalOverdue: 1,
        averageWaitTime: 240,
        averageReviewTime: 120,
        priorityDistribution: {},
        complexityDistribution: {},
      });

      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.updateSubmissionStatus.mockResolvedValue(undefined);
      mockSubmissionService.logModerationAction.mockResolvedValue(undefined);

      const request = createRequest({
        moderatorId: 'mod-123',
        priority: 'high',
        estimatedReviewTime: 60,
        notes: 'Urgent review needed',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.assignment).toBeDefined();
      expect(data.data.workloadUpdate).toBeDefined();
      expect(data.data.queueImpact).toBeDefined();
      expect(data.data.assignment.moderatorId).toBe('mod-123');
      expect(data.data.assignment.priority).toBe('high');
    });
  });

  describe('Response Structure', () => {
    it('should return comprehensive assignment data', async () => {
      // Setup successful flow
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId
        .mockResolvedValueOnce({
          id: 'admin-1',
          clerkId: 'admin-user',
          email: 'admin@test.com',
          role: { name: 'SuperAdmin' },
        })
        .mockResolvedValueOnce({
          id: 'mod-1',
          clerkId: 'mod-123',
          email: 'mod@test.com',
          displayName: 'Mod User',
          role: { name: 'FandomAdmin' },
        });

      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'pending',
        priority: 'medium',
        fandomName: 'Harry Potter',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);

      const { QueueService } = await import(
        '../../../../../../../src/lib/services/queue-service'
      );
      const mockQueueService = vi.mocked(QueueService).prototype;
      mockQueueService.getModeratorWorkload
        .mockResolvedValueOnce({ activeAssignments: 2 })
        .mockResolvedValueOnce({ activeAssignments: 3 });
      mockQueueService.getWorkloadThreshold.mockResolvedValue({
        maxActiveAssignments: 5,
      });
      mockQueueService.assignSubmission.mockResolvedValue({
        id: 'assignment-1',
        submissionId: 'sub-123',
        moderatorId: 'mod-123',
        assignedAt: new Date().toISOString(),
      });
      mockQueueService.getQueueStatistics.mockResolvedValue({
        totalPending: 9,
        totalAssigned: 6,
        averageWaitTime: 240,
      });

      mockSubmissionService.updateSubmissionStatus.mockResolvedValue(undefined);
      mockSubmissionService.logModerationAction.mockResolvedValue(undefined);

      const { EmailService } = await import(
        '../../../../../../../src/lib/notifications/email-service'
      );
      const mockEmailService = vi.mocked(EmailService).prototype;
      mockEmailService.sendModeratorAssignmentNotification.mockResolvedValue(
        undefined
      );

      const request = createRequest({
        moderatorId: 'mod-123',
        priority: 'high',
        estimatedReviewTime: 60,
        deadline: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        notes: 'Urgent review needed',
        notifyModerator: true,
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('assignment');
      expect(data.data).toHaveProperty('workloadUpdate');
      expect(data.data).toHaveProperty('queueImpact');

      expect(data.data.assignment).toHaveProperty('id');
      expect(data.data.assignment).toHaveProperty('submissionId', 'sub-123');
      expect(data.data.assignment).toHaveProperty('moderatorId', 'mod-123');
      expect(data.data.assignment).toHaveProperty(
        'moderatorEmail',
        'mod@test.com'
      );
      expect(data.data.assignment).toHaveProperty('priority', 'high');
      expect(data.data.assignment).toHaveProperty('estimatedReviewTime', 60);
      expect(data.data.assignment).toHaveProperty('deadline');
      expect(data.data.assignment).toHaveProperty(
        'notes',
        'Urgent review needed'
      );

      expect(data.data.workloadUpdate).toHaveProperty('moderatorId', 'mod-123');
      expect(data.data.workloadUpdate).toHaveProperty('previousActive', 2);
      expect(data.data.workloadUpdate).toHaveProperty('currentActive', 3);
      expect(data.data.workloadUpdate).toHaveProperty('capacityUsed');

      expect(data.data.queueImpact).toHaveProperty('fandomId');
      expect(data.data.queueImpact).toHaveProperty('totalPending');
      expect(data.data.queueImpact).toHaveProperty('totalAssigned');

      expect(data.metadata).toHaveProperty('assignedBy', 'admin-user');
      expect(data.metadata).toHaveProperty('assignedAt');
      expect(data.metadata).toHaveProperty('notificationSent', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest({
        moderatorId: 'mod-123',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
      expect(data.details).toContain('Unable to process assignment');
    });
  });
});
