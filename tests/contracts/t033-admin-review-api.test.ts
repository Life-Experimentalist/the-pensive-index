/**
 * T033 Contract Test: Admin Review API Endpoint
 *
 * Tests for POST /api/v1/admin/submissions/{id}/review
 * Validates moderation decisions, GitHub integration, and database updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock all services used in the endpoint
vi.mock('../../../../../../../src/lib/services/submission-service', () => ({
  SubmissionService: vi.fn(() => ({
    getSubmissionById: vi.fn(),
    updateSubmissionStatus: vi.fn(),
    logModerationAction: vi.fn(),
  })),
}));

vi.mock('../../../../../../../src/lib/services/queue-service', () => ({
  QueueService: vi.fn(() => ({
    getQueueEntryBySubmissionId: vi.fn(),
    completeQueueEntry: vi.fn(),
    getQueueStatistics: vi.fn(),
    getModeratorStats: vi.fn(),
  })),
}));

vi.mock('../../../../../../../src/lib/admin/models/AdminUser', () => ({
  AdminUserModel: {
    getInstance: vi.fn(() => ({
      getByClerkId: vi.fn(),
    })),
  },
}));

vi.mock('../../../../../../../src/lib/admin/utils/PermissionValidator', () => ({
  PermissionValidator: {
    getInstance: vi.fn(() => ({
      hasPermission: vi.fn(),
    })),
  },
}));

vi.mock('../../../../../../../src/lib/github/github-service', () => ({
  GitHubService: vi.fn(() => ({
    addIssueLabel: vi.fn(),
    addIssueComment: vi.fn(),
    closeIssue: vi.fn(),
  })),
}));

vi.mock('../../../../../../../src/lib/notifications/email-service', () => ({
  EmailService: vi.fn(() => ({
    sendApprovalNotification: vi.fn(),
    sendRejectionNotification: vi.fn(),
    sendChangesRequestedNotification: vi.fn(),
  })),
}));

vi.mock('../../../../../../../src/lib/database/database-service', () => ({
  DatabaseService: vi.fn(() => ({
    transaction: vi.fn(),
    createStory: vi.fn(),
  })),
}));

import { auth } from '@clerk/nextjs/server';
import { POST } from '../../app/api/v1/admin/submissions/[id]/review/route';

describe('T033 Contract: Admin Review API Endpoint', () => {
  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = vi.mocked(auth);
  });

  // Helper function to create test request
  const createRequest = (body: any) => {
    return new NextRequest(
      'http://localhost:3000/api/v1/admin/submissions/sub-123/review',
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
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should require admin user record', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

      const { AdminUserModel } = await import(
        '../../../../../../../src/lib/admin/models/AdminUser'
      );
      const mockAdminModel = vi.mocked(AdminUserModel.getInstance());
      mockAdminModel.getByClerkId.mockResolvedValue(null);

      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Admin user not found');
    });

    it('should require valid submission', async () => {
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
      mockSubmissionService.getSubmissionById.mockResolvedValue(null);

      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('non-existent'));

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Submission not found');
    });

    it('should require review permissions', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'admin-user' } as any);

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

      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'under_review',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(false);

      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
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
        status: 'under_review',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);
    });

    it('should require decision field', async () => {
      const request = createRequest({
        // Missing decision
        reviewNotes: 'Great story!',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('decision'))).toBe(
        true
      );
    });

    it('should validate decision enum', async () => {
      const request = createRequest({
        decision: 'invalid-decision',
        reviewNotes: 'Notes',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('decision'))).toBe(
        true
      );
    });

    it('should require reviewNotes', async () => {
      const request = createRequest({
        decision: 'approve',
        // Missing reviewNotes
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('reviewNotes'))).toBe(
        true
      );
    });

    it('should validate reviewNotes length', async () => {
      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'x'.repeat(2001), // Over 2000 character limit
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
      expect(data.details.some((d: string) => d.includes('reviewNotes'))).toBe(
        true
      );
    });

    it('should require storyData for approval', async () => {
      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        // Missing storyData
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing story data');
    });

    it('should require feedbackDetails for rejection', async () => {
      const request = createRequest({
        decision: 'reject',
        reviewNotes: 'Not suitable',
        // Missing feedbackDetails
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing feedback details');
    });

    it('should validate storyData structure for approval', async () => {
      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: '', // Invalid: empty title
          author: 'Test Author',
          summary: 'A test story',
          tags: [], // Invalid: empty tags array
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('Submission State Validation', () => {
    beforeEach(async () => {
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

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);
    });

    it('should reject review of already approved submission', async () => {
      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'approved', // Already reviewed
      });

      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Invalid submission state');
      expect(data.details).toContain('cannot be reviewed');
    });

    it('should allow review of under_review submission', async () => {
      const { SubmissionService } = await import(
        '../../../../../../../src/lib/services/submission-service'
      );
      const mockSubmissionService = vi.mocked(SubmissionService).prototype;
      mockSubmissionService.getSubmissionById.mockResolvedValue({
        id: 'sub-123',
        fandomId: 'harry-potter',
        title: 'Test Story',
        status: 'under_review',
        submitterEmail: 'user@test.com',
      });

      const { DatabaseService } = await import(
        '../../../../../../../src/lib/database/database-service'
      );
      const mockDatabaseService = vi.mocked(DatabaseService).prototype;
      mockDatabaseService.transaction.mockImplementation(async callback => {
        return callback({} as any); // Mock transaction context
      });

      const { QueueService } = await import(
        '../../../../../../../src/lib/services/queue-service'
      );
      const mockQueueService = vi.mocked(QueueService).prototype;
      mockQueueService.getQueueEntryBySubmissionId.mockResolvedValue({
        id: 'queue-1',
        submissionId: 'sub-123',
        queuedAt: new Date().toISOString(),
      });
      mockQueueService.getQueueStatistics.mockResolvedValue({
        totalPending: 5,
        totalAssigned: 3,
        completedToday: 2,
        averageReviewTime: 120,
      });
      mockQueueService.getModeratorStats.mockResolvedValue({
        reviewsCompletedToday: 1,
        reviewsCompletedThisWeek: 5,
        averageReviewTime: 90,
        currentActiveAssignments: 2,
      });

      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.review.decision).toBe('approve');
    });
  });

  describe('Decision Processing', () => {
    beforeEach(async () => {
      // Setup successful flow
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
        status: 'under_review',
        submitterEmail: 'user@test.com',
        githubIssueNumber: 42,
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);

      const { DatabaseService } = await import(
        '../../../../../../../src/lib/database/database-service'
      );
      const mockDatabaseService = vi.mocked(DatabaseService).prototype;
      mockDatabaseService.transaction.mockImplementation(async callback => {
        return callback({} as any);
      });

      const { QueueService } = await import(
        '../../../../../../../src/lib/services/queue-service'
      );
      const mockQueueService = vi.mocked(QueueService).prototype;
      mockQueueService.getQueueEntryBySubmissionId.mockResolvedValue({
        id: 'queue-1',
        submissionId: 'sub-123',
        queuedAt: new Date().toISOString(),
      });
      mockQueueService.getQueueStatistics.mockResolvedValue({
        totalPending: 5,
        totalAssigned: 3,
        completedToday: 2,
        averageReviewTime: 120,
      });
      mockQueueService.getModeratorStats.mockResolvedValue({
        reviewsCompletedToday: 1,
        reviewsCompletedThisWeek: 5,
        averageReviewTime: 90,
        currentActiveAssignments: 2,
      });
    });

    it('should process approval decision correctly', async () => {
      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Excellent story with great character development!',
        storyData: {
          title: 'The Adventures of Harry',
          author: 'J.K. Rowling',
          summary: 'A magical story about a boy wizard',
          tags: ['harry-potter', 'adventure', 'magic'],
          wordCount: 50000,
          chapterCount: 12,
          completionStatus: 'complete',
          rating: 'teen',
        },
        qualityScore: 85,
        updateGitHubIssue: true,
        notifySubmitter: true,
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.review.decision).toBe('approve');
      expect(data.data.review.newStatus).toBe('approved');
      expect(data.data.review.qualityScore).toBe(85);
      expect(data.data.integrations.githubUpdated).toBe(true);
      expect(data.data.integrations.emailSent).toBe(true);
    });

    it('should process rejection decision correctly', async () => {
      const request = createRequest({
        decision: 'reject',
        reviewNotes: 'Story does not meet quality standards',
        feedbackDetails: {
          issues: [
            {
              category: 'content',
              description: 'Plot is inconsistent with established canon',
              severity: 'major',
            },
            {
              category: 'formatting',
              description: 'Poor grammar and spelling throughout',
              severity: 'critical',
            },
          ],
          suggestedActions: [
            'Review canon timeline carefully',
            'Use spell-check and grammar tools',
          ],
          resubmissionAllowed: false,
        },
        updateGitHubIssue: true,
        notifySubmitter: true,
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.review.decision).toBe('reject');
      expect(data.data.review.newStatus).toBe('rejected');
      expect(data.data.integrations.githubUpdated).toBe(true);
      expect(data.data.integrations.emailSent).toBe(true);
      expect(data.data.integrations.storyAddedToDatabase).toBe(false);
    });

    it('should process changes requested decision correctly', async () => {
      const request = createRequest({
        decision: 'request_changes',
        reviewNotes: 'Good concept but needs some improvements',
        feedbackDetails: {
          issues: [
            {
              category: 'tags',
              description: 'Missing important character tags',
              severity: 'minor',
            },
          ],
          suggestedActions: ['Add tags for main characters mentioned in story'],
          resubmissionAllowed: true,
        },
        complexityRating: 'moderate',
        updateGitHubIssue: true,
        notifySubmitter: true,
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.review.decision).toBe('request_changes');
      expect(data.data.review.newStatus).toBe('changes_requested');
      expect(data.data.review.complexityRating).toBe('moderate');
      expect(data.data.integrations.githubUpdated).toBe(true);
      expect(data.data.integrations.emailSent).toBe(true);
    });
  });

  describe('Response Structure', () => {
    it('should return comprehensive review data', async () => {
      // Use same setup as previous test
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
        status: 'under_review',
        submitterEmail: 'user@test.com',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);

      const { DatabaseService } = await import(
        '../../../../../../../src/lib/database/database-service'
      );
      const mockDatabaseService = vi.mocked(DatabaseService).prototype;
      mockDatabaseService.transaction.mockImplementation(async callback => {
        return { newStatus: 'approved', storyId: 'story-456' };
      });

      const { QueueService } = await import(
        '../../../../../../../src/lib/services/queue-service'
      );
      const mockQueueService = vi.mocked(QueueService).prototype;
      mockQueueService.getQueueEntryBySubmissionId.mockResolvedValue({
        id: 'queue-1',
        submissionId: 'sub-123',
        queuedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        assignedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      });
      mockQueueService.getQueueStatistics.mockResolvedValue({
        totalPending: 8,
        totalAssigned: 4,
        completedToday: 3,
        averageReviewTime: 45,
      });
      mockQueueService.getModeratorStats.mockResolvedValue({
        reviewsCompletedToday: 2,
        reviewsCompletedThisWeek: 8,
        averageReviewTime: 42,
        currentActiveAssignments: 3,
      });

      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Outstanding work!',
        storyData: {
          title: 'Amazing Story',
          author: 'Great Author',
          summary: 'An incredible tale',
          tags: ['adventure', 'magic'],
        },
        qualityScore: 95,
        complexityRating: 'complex',
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('review');
      expect(data.data).toHaveProperty('queueImpact');
      expect(data.data).toHaveProperty('moderatorMetrics');
      expect(data.data).toHaveProperty('integrations');

      expect(data.data.review).toHaveProperty('submissionId', 'sub-123');
      expect(data.data.review).toHaveProperty('decision', 'approve');
      expect(data.data.review).toHaveProperty('newStatus', 'approved');
      expect(data.data.review).toHaveProperty('reviewedBy', 'admin-user');
      expect(data.data.review).toHaveProperty('storyId', 'story-456');
      expect(data.data.review).toHaveProperty('qualityScore', 95);
      expect(data.data.review).toHaveProperty('complexityRating', 'complex');

      expect(data.data.queueImpact).toHaveProperty('fandomId');
      expect(data.data.queueImpact).toHaveProperty('totalPending');
      expect(data.data.queueImpact).toHaveProperty('totalAssigned');
      expect(data.data.queueImpact).toHaveProperty('completedToday');

      expect(data.data.moderatorMetrics).toHaveProperty(
        'reviewsCompletedToday'
      );
      expect(data.data.moderatorMetrics).toHaveProperty('averageReviewTime');

      expect(data.data.integrations).toHaveProperty('githubUpdated');
      expect(data.data.integrations).toHaveProperty('emailSent');
      expect(data.data.integrations).toHaveProperty('storyAddedToDatabase');

      expect(data.metadata).toHaveProperty('reviewedBy', 'admin-user');
      expect(data.metadata).toHaveProperty('reviewerEmail', 'admin@test.com');
      expect(data.metadata).toHaveProperty('reviewedAt');
      expect(data.metadata).toHaveProperty('reviewDuration');
    });
  });

  describe('Error Handling', () => {
    it('should handle database transaction errors', async () => {
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
        status: 'under_review',
      });

      const { PermissionValidator } = await import(
        '../../../../../../../src/lib/admin/utils/PermissionValidator'
      );
      const mockPermissionValidator = vi.mocked(
        PermissionValidator.getInstance()
      );
      mockPermissionValidator.hasPermission.mockResolvedValue(true);

      const { DatabaseService } = await import(
        '../../../../../../../src/lib/database/database-service'
      );
      const mockDatabaseService = vi.mocked(DatabaseService).prototype;
      mockDatabaseService.transaction.mockRejectedValue(
        new Error('Transaction failed')
      );

      const request = createRequest({
        decision: 'approve',
        reviewNotes: 'Great story!',
        storyData: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'A test story',
          tags: ['test'],
        },
      });

      const response = await POST(request, createContext('sub-123'));

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Transaction error');
      expect(data.details).toContain('could not be completed atomically');
    });
  });
});
