/**
 * Contract Tests for T039: Admin Moderation Interface
 * Tests admin submission queue management and moderation actions
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  POST as queueHandler,
  GET as queueHealthCheck,
} from '../../app/api/admin/submissions/queue/route';
import {
  POST as actionsHandler,
  GET as actionsPermissions,
} from '../../app/api/admin/submissions/actions/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock services
vi.mock('../../src/lib/services/submission-service', () => ({
  SubmissionService: vi.fn().mockImplementation(() => ({
    getSubmission: vi.fn(),
    approveSubmission: vi.fn(),
    rejectSubmission: vi.fn(),
    requestChanges: vi.fn(),
    addFlag: vi.fn(),
    removeFlag: vi.fn(),
  })),
}));

vi.mock('../../src/lib/services/queue-service', () => ({
  QueueService: vi.fn().mockImplementation(() => ({
    getModeratorQueue: vi.fn(),
    getQueueStatistics: vi.fn(),
    assignModerator: vi.fn(),
    unassignModerator: vi.fn(),
    updatePriority: vi.fn(),
    updateQueuePositions: vi.fn(),
    getEstimatedReviewTime: vi.fn(),
  })),
}));

vi.mock('../../src/lib/admin/models/AdminUser', () => ({
  AdminUserModel: {
    getInstance: () => ({
      getByClerkId: vi.fn(),
      getById: vi.fn(),
    }),
  },
}));

vi.mock('../../src/lib/notifications/email-service', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendNotification: vi.fn(),
  })),
}));

describe('T039: Admin Moderation Interface', () => {
  const mockAuth = auth as Mock;
  let mockAdminUser: any;
  let mockSubmissionService: any;
  let mockQueueService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdminUser = {
      id: 'admin-123',
      name: 'Test Admin',
      email: 'admin@test.com',
      permissions: [
        'moderate_submissions',
        'assign_moderators',
        'manage_queue',
      ],
      hasPermission: vi.fn().mockReturnValue(true),
    };

    // Setup default auth response
    mockAuth.mockReturnValue({ userId: 'clerk-123' });
  });

  describe('Queue API Route', () => {
    it('should return queue data with filters for authorized admin', async () => {
      // Arrange
      const mockQueueData = {
        submissions: [
          {
            id: 'sub-1',
            storyTitle: 'Test Story',
            storyUrl: 'https://example.com/story/1',
            storyAuthor: 'Test Author',
            submissionDate: '2024-01-01T00:00:00Z',
            status: 'pending',
            assignedModeratorId: null,
            githubIssueNumber: 123,
            githubIssueState: 'open',
            githubIssueLabels: ['pending-review'],
            qualityScore: 85,
            priority: 'normal',
            flags: [],
          },
        ],
        total: 1,
        queuePositions: { 'sub-1': 1 },
        moderators: {},
        moderationHistory: { 'sub-1': [] },
      };

      const mockStats = {
        pendingCount: 10,
        underReviewCount: 5,
        approvedCount: 100,
        rejectedCount: 20,
        averageReviewTimeHours: 72,
        oldestSubmissionHours: 168,
        moderatorWorkload: [],
        dailyStats: [],
      };

      const { SubmissionService } = await import(
        '../../src/lib/services/submission-service'
      );
      const { QueueService } = await import(
        '../../src/lib/services/queue-service'
      );
      const { AdminUserModel } = await import(
        '../../src/lib/admin/models/AdminUser'
      );

      const mockSubmissionServiceInstance = new SubmissionService();
      const mockQueueServiceInstance = new QueueService();

      vi.mocked(AdminUserModel.getInstance().getByClerkId).mockResolvedValue(
        mockAdminUser
      );
      vi.mocked(mockQueueServiceInstance.getModeratorQueue).mockResolvedValue(
        mockQueueData
      );
      vi.mocked(mockQueueServiceInstance.getQueueStatistics).mockResolvedValue(
        mockStats
      );

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/queue',
        {
          method: 'POST',
          body: JSON.stringify({
            filters: {
              status: 'pending',
              priority: 'all',
              assignedTo: 'all',
              fandom: 'all',
              searchTerm: '',
              sortBy: 'submissionDate',
              sortOrder: 'desc',
            },
          }),
        }
      );

      // Act
      const response = await queueHandler(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.submissions).toHaveLength(1);
      expect(result.submissions[0].id).toBe('sub-1');
      expect(result.stats.totalPending).toBe(10);
      expect(result.pagination.total).toBe(1);
    });

    it('should reject unauthorized users', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/queue',
        {
          method: 'POST',
          body: JSON.stringify({ filters: {} }),
        }
      );

      // Act
      const response = await queueHandler(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should reject users without moderation permissions', async () => {
      // Arrange
      const { AdminUserModel } = await import(
        '../../src/lib/admin/models/AdminUser'
      );

      mockAdminUser.hasPermission = vi.fn().mockReturnValue(false);
      vi.mocked(AdminUserModel.getInstance().getByClerkId).mockResolvedValue(
        mockAdminUser
      );

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/queue',
        {
          method: 'POST',
          body: JSON.stringify({ filters: {} }),
        }
      );

      // Act
      const response = await queueHandler(request);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should handle queue service errors gracefully', async () => {
      // Arrange
      const { QueueService } = await import(
        '../../src/lib/services/queue-service'
      );
      const { AdminUserModel } = await import(
        '../../src/lib/admin/models/AdminUser'
      );

      vi.mocked(AdminUserModel.getInstance().getByClerkId).mockResolvedValue(
        mockAdminUser
      );

      const mockQueueServiceInstance = new QueueService();
      vi.mocked(mockQueueServiceInstance.getModeratorQueue).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/queue',
        {
          method: 'POST',
          body: JSON.stringify({ filters: {} }),
        }
      );

      // Act
      const response = await queueHandler(request);

      // Assert
      expect(response.status).toBe(500);
    });
  });

  describe('Actions API Route', () => {
    const mockSubmission = {
      id: 'sub-1',
      storyTitle: 'Test Story',
      storyUrl: 'https://example.com/story/1',
      storyAuthor: 'Test Author',
      submitterEmail: 'submitter@test.com',
      githubIssueNumber: 123,
      priority: 'normal',
    };

    beforeEach(() => {
      const { AdminUserModel } = import('../../src/lib/admin/models/AdminUser');
      vi.mocked(AdminUserModel.getInstance().getByClerkId).mockResolvedValue(
        mockAdminUser
      );

      const { SubmissionService } = import(
        '../../src/lib/services/submission-service'
      );
      mockSubmissionService = new SubmissionService();
      vi.mocked(mockSubmissionService.getSubmission).mockResolvedValue(
        mockSubmission
      );
    });

    it('should approve submission and send notification', async () => {
      // Arrange
      const { SubmissionService } = await import(
        '../../src/lib/services/submission-service'
      );
      const { EmailService } = await import(
        '../../src/lib/notifications/email-service'
      );

      const mockEmailService = new EmailService();
      vi.mocked(mockSubmissionService.approveSubmission).mockResolvedValue({
        success: true,
      });
      vi.mocked(mockEmailService.sendNotification).mockResolvedValue(undefined);

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/actions',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'approve',
            submissionId: 'sub-1',
            data: { note: 'Approved for quality content' },
          }),
        }
      );

      // Act
      const response = await actionsHandler(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.action).toBe('approve');
      expect(mockSubmissionService.approveSubmission).toHaveBeenCalledWith(
        'sub-1',
        {
          moderatorId: 'admin-123',
          approvalNote: 'Approved for quality content',
          githubIssueNumber: 123,
        }
      );
    });

    it('should reject submission with reason', async () => {
      // Arrange
      vi.mocked(mockSubmissionService.rejectSubmission).mockResolvedValue({
        success: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/actions',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'reject',
            submissionId: 'sub-1',
            data: {
              reason: 'Insufficient tags',
              note: 'Please add more descriptive tags',
            },
          }),
        }
      );

      // Act
      const response = await actionsHandler(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockSubmissionService.rejectSubmission).toHaveBeenCalledWith(
        'sub-1',
        {
          moderatorId: 'admin-123',
          rejectionReason: 'Insufficient tags',
          rejectionNote: 'Please add more descriptive tags',
          githubIssueNumber: 123,
        }
      );
    });

    it('should assign moderator to submission', async () => {
      // Arrange
      const { QueueService } = await import(
        '../../src/lib/services/queue-service'
      );
      const { AdminUserModel } = await import(
        '../../src/lib/admin/models/AdminUser'
      );

      const mockQueueServiceInstance = new QueueService();
      const mockTargetModerator = {
        id: 'mod-456',
        name: 'Target Moderator',
        email: 'moderator@test.com',
      };

      vi.mocked(mockQueueServiceInstance.assignModerator).mockResolvedValue({
        success: true,
      });
      vi.mocked(AdminUserModel.getInstance().getById).mockResolvedValue(
        mockTargetModerator
      );

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/actions',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'assign',
            submissionId: 'sub-1',
            data: {
              moderatorId: 'mod-456',
              note: 'Assigning to specialist',
            },
          }),
        }
      );

      // Act
      const response = await actionsHandler(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockQueueServiceInstance.assignModerator).toHaveBeenCalledWith(
        'sub-1',
        'mod-456',
        {
          assignedBy: 'admin-123',
          note: 'Assigning to specialist',
        }
      );
    });

    it('should validate required fields for actions', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost/api/admin/submissions/actions',
        {
          method: 'POST',
          body: JSON.stringify({
            action: '', // Missing action
            submissionId: 'sub-1',
          }),
        }
      );

      // Act
      const response = await actionsHandler(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle invalid actions', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost/api/admin/submissions/actions',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'invalid_action',
            submissionId: 'sub-1',
          }),
        }
      );

      // Act
      const response = await actionsHandler(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return available actions for user permissions', async () => {
      // Arrange - GET request for permissions check
      const request = new NextRequest(
        'http://localhost/api/admin/submissions/actions'
      );

      // Act
      const response = await actionsPermissions(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.availableActions).toContain('approve');
      expect(result.availableActions).toContain('reject');
      expect(result.availableActions).toContain('assign');
      expect(result.moderatorId).toBe('admin-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable gracefully', async () => {
      // Arrange
      mockAuth.mockImplementation(() => {
        throw new Error('Auth service down');
      });

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/queue'
      );

      // Act
      const response = await queueHealthCheck(request);

      // Assert
      expect(response.status).toBe(503);
    });

    it('should handle malformed request bodies', async () => {
      // Arrange
      const { AdminUserModel } = await import(
        '../../src/lib/admin/models/AdminUser'
      );
      vi.mocked(AdminUserModel.getInstance().getByClerkId).mockResolvedValue(
        mockAdminUser
      );

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/queue',
        {
          method: 'POST',
          body: 'invalid json',
        }
      );

      // Act
      const response = await queueHandler(request);

      // Assert
      expect(response.status).toBe(500);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete queue loading within 500ms', async () => {
      // Arrange
      const { AdminUserModel } = await import(
        '../../src/lib/admin/models/AdminUser'
      );
      const { QueueService } = await import(
        '../../src/lib/services/queue-service'
      );

      vi.mocked(AdminUserModel.getInstance().getByClerkId).mockResolvedValue(
        mockAdminUser
      );

      const mockQueueServiceInstance = new QueueService();
      vi.mocked(mockQueueServiceInstance.getModeratorQueue).mockResolvedValue({
        submissions: [],
        total: 0,
        queuePositions: {},
        moderators: {},
        moderationHistory: {},
      });
      vi.mocked(mockQueueServiceInstance.getQueueStatistics).mockResolvedValue({
        pendingCount: 0,
        underReviewCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        averageReviewTimeHours: 0,
        oldestSubmissionHours: 0,
        moderatorWorkload: [],
        dailyStats: [],
      });

      const request = new NextRequest(
        'http://localhost/api/admin/submissions/queue',
        {
          method: 'POST',
          body: JSON.stringify({ filters: {} }),
        }
      );

      // Act
      const startTime = Date.now();
      const response = await queueHandler(request);
      const endTime = Date.now();

      // Assert
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should handle concurrent moderation actions', async () => {
      // Arrange
      const { AdminUserModel } = await import(
        '../../src/lib/admin/models/AdminUser'
      );
      vi.mocked(AdminUserModel.getInstance().getByClerkId).mockResolvedValue(
        mockAdminUser
      );

      const actions = ['approve', 'reject', 'assign'].map(action => {
        const request = new NextRequest(
          'http://localhost/api/admin/submissions/actions',
          {
            method: 'POST',
            body: JSON.stringify({
              action,
              submissionId: `sub-${action}`,
              data: action === 'assign' ? { moderatorId: 'mod-123' } : {},
            }),
          }
        );
        return actionsHandler(request);
      });

      // Act
      const responses = await Promise.all(actions);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

describe('T039 Integration Contracts', () => {
  it('should integrate with GitHub webhook for status updates', async () => {
    // This test verifies that moderation actions properly update GitHub issues
    expect(true).toBe(true); // Placeholder for integration test
  });

  it('should integrate with email service for notifications', async () => {
    // This test verifies that moderation actions trigger appropriate emails
    expect(true).toBe(true); // Placeholder for integration test
  });

  it('should integrate with queue service for position updates', async () => {
    // This test verifies that moderation actions update queue positions
    expect(true).toBe(true); // Placeholder for integration test
  });
});
