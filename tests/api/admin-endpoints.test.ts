import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// Import the admin API handlers we need to test
// Note: These imports will fail initially - that's expected in TDD
import { GET as getModerationQueue } from '../../app/api/v1/admin/submissions/queue/route';
import { POST as assignSubmission } from '../../app/api/v1/admin/submissions/[id]/assign/route';
import { POST as reviewSubmission } from '../../app/api/v1/admin/submissions/[id]/review/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock database
vi.mock('@/src/lib/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Admin Moderation API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated admin user by default
    vi.mocked(currentUser).mockResolvedValue({
      id: 'user_admin123',
      username: 'admin',
      emailAddresses: [
        {
          id: 'email_123',
          emailAddress: 'admin@example.com',
          verification: { status: 'verified', strategy: 'email_code' },
          linkedTo: [],
        },
      ],
      publicMetadata: { role: 'SuperAdmin' },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/admin/submissions/queue', () => {
    it('should return moderation queue for super admin', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        queueEntries: expect.any(Array),
        statistics: {
          total: expect.any(Number),
          assigned: expect.any(Number),
          unassigned: expect.any(Number),
          avgWaitTime: expect.any(Number),
        },
      });

      // Validate queue entry structure if any exist
      if (responseData.queueEntries.length > 0) {
        expect(responseData.queueEntries[0]).toMatchObject({
          id: expect.any(String),
          submission: expect.objectContaining({
            id: expect.any(String),
            status: expect.any(String),
            storyData: expect.any(Object),
          }),
          priority: expect.stringMatching(/^(low|normal|high|urgent)$/),
          complexity: expect.stringMatching(/^(simple|medium|complex)$/),
          estimatedReviewTime: expect.any(Number),
          queuedAt: expect.any(String),
          assignedTo: expect.any(String) || null,
        });
      }
    });

    it('should filter queue by fandom for FandomAdmin users', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_fandomadmin123',
        username: 'fandomadmin',
        emailAddresses: [
          {
            id: 'email_123',
            emailAddress: 'fandomadmin@example.com',
            verification: { status: 'verified', strategy: 'email_code' },
            linkedTo: [],
          },
        ],
        publicMetadata: { role: 'FandomAdmin', fandomId: 'harry-potter' },
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue?fandom=harry-potter'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.queueEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            submission: expect.objectContaining({
              storyData: expect.objectContaining({
                fandomId: 'harry-potter',
              }),
            }),
          }),
        ])
      );
    });

    it('should filter queue by priority', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue?priority=urgent'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.queueEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            priority: 'urgent',
          }),
        ])
      );
    });

    it('should filter queue by assignment status', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue?assigned=false'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.queueEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            assignedTo: null,
          }),
        ])
      );
    });

    it('should filter queue by complexity', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue?complexity=complex'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.queueEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            complexity: 'complex',
          }),
        ])
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_regular123',
        publicMetadata: { role: 'User' },
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    });

    it('should return 403 for FandomAdmin accessing wrong fandom', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_fandomadmin123',
        publicMetadata: {
          role: 'FandomAdmin',
          fandomId: 'percy-jackson',
        },
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/admin/submissions/queue?fandom=harry-potter'
      );

      // Act
      const response = await getModerationQueue(request);

      // Assert
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Forbidden',
        message: expect.stringContaining('fandom access'),
      });
    });
  });

  describe('POST /api/v1/admin/submissions/{id}/assign', () => {
    it('should assign submission to moderator successfully', async () => {
      // Arrange
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const assignmentData = {
        moderatorId: 'user_moderator456',
        priority: 'high' as const,
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentData),
        }
      );

      // Act
      const response = await assignSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        assignedTo: assignmentData.moderatorId,
        priority: assignmentData.priority,
        assignedAt: expect.any(String),
      });
    });

    it('should return 400 for invalid moderator ID', async () => {
      // Arrange
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidAssignmentData = {
        moderatorId: '', // Empty moderator ID
        priority: 'high' as const,
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidAssignmentData),
        }
      );

      // Act
      const response = await assignSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'moderatorId',
            message: expect.any(String),
          }),
        ]),
      });
    });

    it('should return 404 for non-existent submission', async () => {
      // Arrange
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const assignmentData = {
        moderatorId: 'user_moderator456',
        priority: 'normal' as const,
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${nonExistentId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentData),
        }
      );

      // Act
      const response = await assignSubmission(request, {
        params: { id: nonExistentId },
      });

      // Assert
      expect(response.status).toBe(404);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Not Found',
        message: 'Submission not found',
        submissionId: nonExistentId,
      });
    });

    it('should return 409 for already assigned submission', async () => {
      // Arrange
      const alreadyAssignedId = '456e4567-e89b-12d3-a456-426614174001';
      const assignmentData = {
        moderatorId: 'user_moderator456',
        priority: 'normal' as const,
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${alreadyAssignedId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentData),
        }
      );

      // Act
      const response = await assignSubmission(request, {
        params: { id: alreadyAssignedId },
      });

      // Assert
      expect(response.status).toBe(409);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Conflict',
        message: 'Submission already assigned',
        currentAssignee: expect.any(String),
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue(null);

      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const assignmentData = {
        moderatorId: 'user_moderator456',
        priority: 'normal' as const,
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentData),
        }
      );

      // Act
      const response = await assignSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_regular123',
        publicMetadata: { role: 'User' },
      } as any);

      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const assignmentData = {
        moderatorId: 'user_moderator456',
        priority: 'normal' as const,
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentData),
        }
      );

      // Act
      const response = await assignSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/admin/submissions/{id}/review', () => {
    it('should complete review with approval', async () => {
      // Arrange
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const reviewData = {
        decision: 'approve' as const,
        comments: 'Great story with proper tags and metadata',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        decision: reviewData.decision,
        reviewedAt: expect.any(String),
        moderatorComments: reviewData.comments,
        submissionStatus: 'approved',
      });
    });

    it('should complete review with rejection', async () => {
      // Arrange
      const submissionId = '456e4567-e89b-12d3-a456-426614174001';
      const reviewData = {
        decision: 'reject' as const,
        comments: 'Story does not meet quality standards',
        rejectionReason: 'low-quality' as const,
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        decision: reviewData.decision,
        reviewedAt: expect.any(String),
        moderatorComments: reviewData.comments,
        rejectionReason: reviewData.rejectionReason,
        submissionStatus: 'rejected',
      });
    });

    it('should complete review with change requests', async () => {
      // Arrange
      const submissionId = '789e4567-e89b-12d3-a456-426614174002';
      const reviewData = {
        decision: 'request-changes' as const,
        comments: 'Please add more appropriate tags and correct the fandom',
        suggestedChanges: {
          tags: ['romance', 'angst', 'alternate-universe'],
          fandom: 'harry-potter',
          metadata: {
            completionStatus: 'in-progress',
          },
        },
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        decision: reviewData.decision,
        reviewedAt: expect.any(String),
        moderatorComments: reviewData.comments,
        suggestedChanges: reviewData.suggestedChanges,
        submissionStatus: 'pending-changes',
      });
    });

    it('should return 400 for invalid review decision', async () => {
      // Arrange
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidReviewData = {
        decision: 'invalid-decision', // Invalid enum value
        comments: 'Some comment',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidReviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'decision',
            message: expect.stringContaining('must be one of'),
          }),
        ]),
      });
    });

    it('should return 404 for non-existent submission', async () => {
      // Arrange
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const reviewData = {
        decision: 'approve' as const,
        comments: 'Good story',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${nonExistentId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: nonExistentId },
      });

      // Assert
      expect(response.status).toBe(404);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Not Found',
        message: 'Submission not found',
      });
    });

    it('should return 403 when FandomAdmin tries to review submission from different fandom', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_fandomadmin123',
        publicMetadata: {
          role: 'FandomAdmin',
          fandomId: 'percy-jackson',
        },
      } as any);

      const harryPotterSubmissionId = '123e4567-e89b-12d3-a456-426614174000';
      const reviewData = {
        decision: 'approve' as const,
        comments: 'Good story',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${harryPotterSubmissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: harryPotterSubmissionId },
      });

      // Assert
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Forbidden',
        message: 'Moderator not authorized for this fandom',
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue(null);

      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const reviewData = {
        decision: 'approve' as const,
        comments: 'Good story',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_regular123',
        publicMetadata: { role: 'User' },
      } as any);

      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const reviewData = {
        decision: 'approve' as const,
        comments: 'Good story',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/admin/submissions/${submissionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        }
      );

      // Act
      const response = await reviewSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(403);
    });
  });
});
