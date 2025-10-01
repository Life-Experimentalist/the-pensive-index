import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

// Import the API handlers we need to test
// Note: These imports will fail initially - that's expected in TDD
import { POST as createSubmission } from '@/app/api/v1/submissions/route';
import { GET as getSubmissions } from '@/app/api/v1/submissions/route';
import {
  GET as getSubmission,
  PATCH as updateSubmission,
} from '@/app/api/v1/submissions/[id]/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(),
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

describe('Story Submission API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated user by default
    vi.mocked(auth).mockReturnValue({
      userId: 'user_test123',
      sessionId: 'session_test123',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/submissions', () => {
    it('should create a new story submission with valid data', async () => {
      // Arrange
      const validSubmissionData = {
        storyUrl: 'https://archiveofourown.org/works/12345',
        storyTitle: 'Test Story Title',
        fandomId: 'harry-potter',
        author: 'TestAuthor',
        summary: 'A test story summary that is long enough to be valid',
        wordCount: 50000,
        chapterCount: 15,
        completionStatus: 'complete' as const,
        publishDate: '2023-01-01',
        lastUpdateDate: '2023-06-01',
        tags: ['angst', 'romance', 'time-travel'],
        submissionNotes: 'This is a great story that fits the criteria',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validSubmissionData),
        }
      );

      // Act
      const response = await createSubmission(request);

      // Assert
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        id: expect.any(String),
        status: 'pending-review',
        githubIssueNumber: expect.any(Number),
        qualityScore: expect.any(Number),
        submittedAt: expect.any(String),
        reviewedAt: null,
        moderatorComments: null,
        storyData: expect.objectContaining(validSubmissionData),
      });

      // Validate UUID format
      expect(responseData.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Validate quality score range
      expect(responseData.qualityScore).toBeGreaterThanOrEqual(0);
      expect(responseData.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should return 400 for invalid submission data - missing required fields', async () => {
      // Arrange
      const invalidSubmissionData = {
        storyUrl: 'https://archiveofourown.org/works/12345',
        // Missing required fields: storyTitle, fandomId, tags
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidSubmissionData),
        }
      );

      // Act
      const response = await createSubmission(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        message: expect.any(String),
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'storyTitle',
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: 'fandomId',
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: 'tags',
            message: expect.any(String),
          }),
        ]),
      });
    });

    it('should return 400 for invalid submission data - invalid field formats', async () => {
      // Arrange
      const invalidSubmissionData = {
        storyUrl: 'not-a-valid-url',
        storyTitle: '', // Empty title
        fandomId: 'harry-potter',
        wordCount: -1, // Negative word count
        chapterCount: 0, // Zero chapters
        completionStatus: 'invalid-status', // Invalid enum value
        tags: ['single-tag'], // Too few tags (minimum 3)
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidSubmissionData),
        }
      );

      // Act
      const response = await createSubmission(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Validation Error');
      expect(responseData.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'storyUrl' }),
          expect.objectContaining({ field: 'storyTitle' }),
          expect.objectContaining({ field: 'wordCount' }),
          expect.objectContaining({ field: 'chapterCount' }),
          expect.objectContaining({ field: 'completionStatus' }),
          expect.objectContaining({ field: 'tags' }),
        ])
      );
    });

    it('should return 409 for duplicate story submission', async () => {
      // Arrange
      const duplicateSubmissionData = {
        storyUrl: 'https://archiveofourown.org/works/existing',
        storyTitle: 'Existing Story',
        fandomId: 'harry-potter',
        tags: ['angst', 'romance', 'time-travel'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duplicateSubmissionData),
        }
      );

      // Act
      const response = await createSubmission(request);

      // Assert
      expect(response.status).toBe(409);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Duplicate Story',
        message: expect.stringContaining('already exists'),
        existingSubmissionId: expect.any(String),
        storyUrl: duplicateSubmissionData.storyUrl,
      });
    });

    it('should return 429 for rate limit exceeded', async () => {
      // Arrange - simulate multiple rapid requests
      const submissionData = {
        storyUrl: 'https://archiveofourown.org/works/rate-limit-test',
        storyTitle: 'Rate Limit Test',
        fandomId: 'harry-potter',
        tags: ['test', 'rate-limit', 'validation'],
      };

      // Make multiple requests rapidly
      const requests = Array.from(
        { length: 6 },
        () =>
          new NextRequest('http://localhost:3000/api/v1/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...submissionData,
              storyUrl: `${submissionData.storyUrl}-${Math.random()}`,
            }),
          })
      );

      // Act - make requests in quick succession
      const responses = await Promise.all(
        requests.map(request => createSubmission(request))
      );

      // Assert - at least one should be rate limited
      const rateLimitedResponse = responses.find(
        response => response.status === 429
      );
      expect(rateLimitedResponse).toBeDefined();

      if (rateLimitedResponse) {
        const responseData = await rateLimitedResponse.json();
        expect(responseData).toMatchObject({
          error: 'Rate Limit Exceeded',
          message: expect.any(String),
          retryAfter: expect.any(Number),
          limit: expect.any(Number),
          remaining: 0,
        });
      }
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(auth).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const submissionData = {
        storyUrl: 'https://archiveofourown.org/works/12345',
        storyTitle: 'Test Story',
        fandomId: 'harry-potter',
        tags: ['test', 'auth', 'validation'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
        }
      );

      // Act
      const response = await createSubmission(request);

      // Assert
      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    });
  });

  describe('GET /api/v1/submissions', () => {
    it('should return user submission history with default pagination', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions'
      );

      // Act
      const response = await getSubmissions(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        submissions: expect.any(Array),
        pagination: {
          total: expect.any(Number),
          limit: 20, // default limit
          offset: 0, // default offset
          hasMore: expect.any(Boolean),
        },
      });

      // Validate submission structure if any exist
      if (responseData.submissions.length > 0) {
        expect(responseData.submissions[0]).toMatchObject({
          id: expect.any(String),
          status: expect.any(String),
          submittedAt: expect.any(String),
          storyData: expect.objectContaining({
            storyTitle: expect.any(String),
            fandomId: expect.any(String),
          }),
        });
      }
    });

    it('should filter submissions by status', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions?status=approved'
      );

      // Act
      const response = await getSubmissions(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.submissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'approved',
          }),
        ])
      );
    });

    it('should filter submissions by fandom', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions?fandom=harry-potter'
      );

      // Act
      const response = await getSubmissions(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.submissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            storyData: expect.objectContaining({
              fandomId: 'harry-potter',
            }),
          }),
        ])
      );
    });

    it('should respect custom pagination parameters', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions?limit=5&offset=10'
      );

      // Act
      const response = await getSubmissions(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.pagination).toMatchObject({
        limit: 5,
        offset: 10,
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
      expect(responseData.submissions.length).toBeLessThanOrEqual(5);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(auth).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/v1/submissions'
      );

      // Act
      const response = await getSubmissions(request);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/submissions/{id}', () => {
    it('should return specific submission details', async () => {
      // Arrange
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${submissionId}`
      );

      // Act
      const response = await getSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        id: submissionId,
        status: expect.any(String),
        githubIssueNumber: expect.any(Number),
        qualityScore: expect.any(Number),
        submittedAt: expect.any(String),
        storyData: expect.objectContaining({
          storyTitle: expect.any(String),
          fandomId: expect.any(String),
          tags: expect.any(Array),
        }),
      });
    });

    it('should return 404 for non-existent submission', async () => {
      // Arrange
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${nonExistentId}`
      );

      // Act
      const response = await getSubmission(request, {
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

    it('should return 400 for invalid UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-uuid';
      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${invalidId}`
      );

      // Act
      const response = await getSubmission(request, {
        params: { id: invalidId },
      });

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        message: expect.stringContaining('Invalid UUID format'),
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(auth).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${submissionId}`
      );

      // Act
      const response = await getSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    it("should return 403 when accessing another user's submission", async () => {
      // Arrange
      const otherUserSubmissionId = '456e4567-e89b-12d3-a456-426614174001';
      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${otherUserSubmissionId}`
      );

      // Act
      const response = await getSubmission(request, {
        params: { id: otherUserSubmissionId },
      });

      // Assert
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Forbidden',
        message: 'Access denied to this submission',
      });
    });
  });

  describe('PATCH /api/v1/submissions/{id}', () => {
    it('should update submission with valid data', async () => {
      // Arrange
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        storyTitle: 'Updated Story Title',
        tags: ['updated', 'tags', 'new-genre'],
        submissionNotes: 'Updated notes with additional context',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${submissionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      // Act
      const response = await updateSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        id: submissionId,
        status: 'pending-review', // Should still be pending after update
        storyData: expect.objectContaining(updateData),
      });
    });

    it('should return 400 for invalid update data', async () => {
      // Arrange
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUpdateData = {
        storyTitle: '', // Empty title
        wordCount: -500, // Negative word count
        tags: [], // Too few tags
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${submissionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidUpdateData),
        }
      );

      // Act
      const response = await updateSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Validation Error');
    });

    it('should return 403 for submissions that cannot be modified', async () => {
      // Arrange - submission that's already approved
      const approvedSubmissionId = '789e4567-e89b-12d3-a456-426614174002';
      const updateData = {
        storyTitle: 'Trying to update approved submission',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${approvedSubmissionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      // Act
      const response = await updateSubmission(request, {
        params: { id: approvedSubmissionId },
      });

      // Assert
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Forbidden',
        message: expect.stringContaining('cannot be modified'),
        currentStatus: 'approved',
      });
    });

    it('should return 404 for non-existent submission', async () => {
      // Arrange
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const updateData = {
        storyTitle: 'Update non-existent submission',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${nonExistentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      // Act
      const response = await updateSubmission(request, {
        params: { id: nonExistentId },
      });

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(auth).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const request = new NextRequest(
        `http://localhost:3000/api/v1/submissions/${submissionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyTitle: 'Updated Title' }),
        }
      );

      // Act
      const response = await updateSubmission(request, {
        params: { id: submissionId },
      });

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
