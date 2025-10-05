import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// Import the GitHub integration handlers we need to test
// Note: These imports will fail initially - that's expected in TDD
import { POST as handleGitHubWebhook } from '../../app/webhooks/github/route';
import { GET as getGitHubIntegrationStatus } from '../../app/api/v1/github/status/route';
import { POST as syncWithGitHub } from '../../app/api/v1/github/sync/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock GitHub service
vi.mock('@/src/lib/github/client', () => ({
  githubClient: {
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    addLabels: vi.fn(),
    removeLabels: vi.fn(),
    getIssue: vi.fn(),
  },
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

describe('GitHub Integration API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated admin user by default for admin endpoints
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

  describe('POST /api/webhooks/github', () => {
    it('should handle story submission approval via label addition', async () => {
      // Arrange
      const webhookPayload = {
        action: 'labeled',
        issue: {
          number: 12345,
          title: '[SUBMISSION] Harry Potter Time Travel Story by TestAuthor',
          body: `---
submission_id: "123e4567-e89b-12d3-a456-426614174000"
story_url: "https://archiveofourown.org/works/12345"
fandom: "harry-potter"
submitter: "testuser123"
submitted_at: "2024-01-01T12:00:00Z"
quality_score: 85
duplicate_check: true
---

# Story Submission: Harry Potter Time Travel Story

**Author:** TestAuthor
...rest of issue body...`,
          labels: [
            { name: 'story-submission' },
            { name: 'pending-review' },
            { name: 'approved' },
            { name: 'harry-potter' },
          ],
          assignees: [{ login: 'moderator123' }],
          user: { login: 'github-actions[bot]' },
        },
        label: { name: 'approved' },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'issues',
            'X-GitHub-Delivery': 'webhook-delivery-123',
            'X-Hub-Signature-256': 'sha256=valid-signature',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        processed: true,
        action: 'submission-approved',
        submissionId: '123e4567-e89b-12d3-a456-426614174000',
        githubIssueNumber: 12345,
      });
    });

    it('should handle story submission rejection via label addition', async () => {
      // Arrange
      const webhookPayload = {
        action: 'labeled',
        issue: {
          number: 12346,
          title: '[SUBMISSION] Low Quality Story by BadAuthor',
          body: `---
submission_id: "456e4567-e89b-12d3-a456-426614174001"
story_url: "https://example.com/story/456"
fandom: "percy-jackson"
submitter: "testuser456"
submitted_at: "2024-01-02T12:00:00Z"
quality_score: 25
duplicate_check: false
---

# Story Submission: Low Quality Story`,
          labels: [
            { name: 'story-submission' },
            { name: 'rejected' },
            { name: 'percy-jackson' },
          ],
          assignees: [{ login: 'moderator456' }],
          user: { login: 'github-actions[bot]' },
        },
        label: { name: 'rejected' },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'issues',
            'X-GitHub-Delivery': 'webhook-delivery-124',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        processed: true,
        action: 'submission-rejected',
        submissionId: '456e4567-e89b-12d3-a456-426614174001',
        githubIssueNumber: 12346,
      });
    });

    it('should handle change request via label addition', async () => {
      // Arrange
      const webhookPayload = {
        action: 'labeled',
        issue: {
          number: 12347,
          title: '[SUBMISSION] Story Needs Changes by Author123',
          body: `---
submission_id: "789e4567-e89b-12d3-a456-426614174002"
story_url: "https://fanfiction.net/s/789/1/"
fandom: "naruto"
submitter: "testuser789"
submitted_at: "2024-01-03T12:00:00Z"
quality_score: 65
duplicate_check: true
---

# Story Submission: Story Needs Changes`,
          labels: [
            { name: 'story-submission' },
            { name: 'needs-changes' },
            { name: 'naruto' },
          ],
          assignees: [{ login: 'moderator789' }],
          user: { login: 'github-actions[bot]' },
        },
        label: { name: 'needs-changes' },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'issues',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        processed: true,
        action: 'changes-requested',
        submissionId: '789e4567-e89b-12d3-a456-426614174002',
        githubIssueNumber: 12347,
      });
    });

    it('should ignore non-submission issues', async () => {
      // Arrange
      const nonSubmissionPayload = {
        action: 'labeled',
        issue: {
          number: 99999,
          title: 'Regular Bug Report: Fix the login button',
          body: 'This is just a regular issue, not a story submission',
          labels: [{ name: 'bug' }, { name: 'frontend' }],
          assignees: [],
          user: { login: 'regular-user' },
        },
        label: { name: 'bug' },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'issues',
          },
          body: JSON.stringify(nonSubmissionPayload),
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        processed: false,
        reason: 'not-submission-issue',
      });
    });

    it('should return 400 for invalid webhook signature', async () => {
      // Arrange
      const webhookPayload = {
        action: 'labeled',
        issue: {
          number: 12345,
          title: '[SUBMISSION] Test Story',
          body: '---\nsubmission_id: "test-id"\n---\n# Test',
          labels: [{ name: 'story-submission' }],
          assignees: [],
          user: { login: 'github-actions[bot]' },
        },
        label: { name: 'approved' },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'issues',
            'X-Hub-Signature-256': 'sha256=invalid-signature',
          },
          body: JSON.stringify(webhookPayload),
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Invalid Signature',
        message: 'Webhook signature validation failed',
      });
    });

    it('should return 400 for malformed webhook payload', async () => {
      // Arrange
      const malformedPayload = {
        action: 'labeled',
        // Missing required 'issue' field
        label: { name: 'approved' },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'issues',
          },
          body: JSON.stringify(malformedPayload),
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Invalid Payload',
        message: 'Malformed webhook payload',
        details: expect.any(Object),
      });
    });

    it('should handle issue comment events for command processing', async () => {
      // Arrange
      const commentPayload = {
        action: 'created',
        issue: {
          number: 12345,
          title: '[SUBMISSION] Test Story by TestAuthor',
          body: `---
submission_id: "123e4567-e89b-12d3-a456-426614174000"
---
# Test Story`,
          labels: [{ name: 'story-submission' }],
          assignees: [{ login: 'moderator123' }],
          user: { login: 'github-actions[bot]' },
        },
        comment: {
          body: '/assign @moderator456\n/priority high\n/complexity simple',
          user: { login: 'moderator123' },
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'issue_comment',
          },
          body: JSON.stringify(commentPayload),
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        processed: true,
        commandsProcessed: expect.arrayContaining([
          expect.objectContaining({
            command: 'assign',
            target: 'moderator456',
          }),
          expect.objectContaining({
            command: 'priority',
            value: 'high',
          }),
          expect.objectContaining({
            command: 'complexity',
            value: 'simple',
          }),
        ]),
      });
    });

    it('should return 405 for non-POST requests', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/github',
        {
          method: 'GET',
        }
      );

      // Act
      const response = await handleGitHubWebhook(request);

      // Assert
      expect(response.status).toBe(405);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Method Not Allowed',
        message: 'Only POST requests are allowed',
      });
    });
  });

  describe('GET /api/v1/github/status', () => {
    it('should return GitHub integration status for admin users', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/status'
      );

      // Act
      const response = await getGitHubIntegrationStatus(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        connected: expect.any(Boolean),
        repository: {
          owner: expect.any(String),
          name: expect.any(String),
          url: expect.any(String),
        },
        webhook: {
          configured: expect.any(Boolean),
          url: expect.any(String),
          events: expect.arrayContaining(['issues', 'issue_comment']),
        },
        rateLimits: {
          core: {
            limit: expect.any(Number),
            remaining: expect.any(Number),
            resetTime: expect.any(String),
          },
        },
        lastSync: expect.any(String),
        pendingIssues: expect.any(Number),
        statistics: {
          totalSubmissions: expect.any(Number),
          approvedSubmissions: expect.any(Number),
          rejectedSubmissions: expect.any(Number),
          pendingReview: expect.any(Number),
        },
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/status'
      );

      // Act
      const response = await getGitHubIntegrationStatus(request);

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
        'http://localhost:3000/api/v1/github/status'
      );

      // Act
      const response = await getGitHubIntegrationStatus(request);

      // Assert
      expect(response.status).toBe(403);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    });

    it('should handle GitHub API connection failures gracefully', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/status'
      );

      // Act
      const response = await getGitHubIntegrationStatus(request);

      // Assert - Should still return 200 but with connection: false
      if (response.status === 200) {
        const responseData = await response.json();
        expect(responseData).toMatchObject({
          connected: false,
          error: expect.any(String),
          lastConnectionAttempt: expect.any(String),
        });
      } else {
        expect(response.status).toBe(503);
        const responseData = await response.json();
        expect(responseData).toMatchObject({
          error: 'Service Unavailable',
          message: 'GitHub API connection failed',
        });
      }
    });
  });

  describe('POST /api/v1/github/sync', () => {
    it('should sync pending submissions with GitHub issues', async () => {
      // Arrange
      const syncRequest = {
        forceSync: false,
        syncPendingOnly: true,
        maxSyncCount: 10,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequest),
        }
      );

      // Act
      const response = await syncWithGitHub(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        syncedCount: expect.any(Number),
        failedCount: expect.any(Number),
        skippedCount: expect.any(Number),
        totalProcessed: expect.any(Number),
        syncDetails: expect.any(Array),
        nextSyncAllowed: expect.any(String), // ISO timestamp
      });

      // Validate sync details structure if any synced
      if (responseData.syncedCount > 0) {
        expect(responseData.syncDetails[0]).toMatchObject({
          submissionId: expect.any(String),
          githubIssueNumber: expect.any(Number),
          action: expect.stringMatching(/^(created|updated|skipped|failed)$/),
          details: expect.any(String),
        });
      }
    });

    it('should handle force sync of all submissions', async () => {
      // Arrange
      const forceSyncRequest = {
        forceSync: true,
        syncPendingOnly: false,
        maxSyncCount: 50,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(forceSyncRequest),
        }
      );

      // Act
      const response = await syncWithGitHub(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        syncedCount: expect.any(Number),
        totalProcessed: expect.any(Number),
        warnings: expect.any(Array), // May contain rate limit warnings
      });
    });

    it('should return 429 when sync rate limit is exceeded', async () => {
      // Arrange - make rapid sync requests
      const syncRequest = { forceSync: false };
      const requests = Array.from(
        { length: 3 },
        () =>
          new NextRequest('http://localhost:3000/api/v1/github/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncRequest),
          })
      );

      // Act - make requests rapidly
      const responses = await Promise.all(
        requests.map(request => syncWithGitHub(request))
      );

      // Assert - later requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (response: any) => response.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const rateLimitedResponse = rateLimitedResponses[0];
      const responseData = await rateLimitedResponse.json();
      expect(responseData).toMatchObject({
        error: 'Rate Limit Exceeded',
        message: 'Sync operations are rate limited',
        retryAfter: expect.any(Number),
      });
    });

    it('should return 400 for invalid sync parameters', async () => {
      // Arrange
      const invalidSyncRequest = {
        maxSyncCount: -5, // Invalid negative value
        forceSync: 'invalid-boolean', // Invalid type
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidSyncRequest),
        }
      );

      // Act
      const response = await syncWithGitHub(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'maxSyncCount',
            message: expect.stringContaining('must be positive'),
          }),
          expect.objectContaining({
            field: 'forceSync',
            message: expect.stringContaining('must be boolean'),
          }),
        ]),
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue(null);

      const syncRequest = { forceSync: false };
      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequest),
        }
      );

      // Act
      const response = await syncWithGitHub(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_regular123',
        publicMetadata: { role: 'User' },
      } as any);

      const syncRequest = { forceSync: false };
      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequest),
        }
      );

      // Act
      const response = await syncWithGitHub(request);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should handle GitHub API rate limit gracefully', async () => {
      // Arrange
      const syncRequest = {
        forceSync: true,
        maxSyncCount: 1000, // Large number that might hit rate limits
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/github/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncRequest),
        }
      );

      // Act
      const response = await syncWithGitHub(request);

      // Assert
      expect([200, 429, 503]).toContain(response.status);

      const responseData = await response.json();

      if (response.status === 200) {
        // Partial success with rate limit warnings
        expect(responseData).toMatchObject({
          success: true,
          warnings: expect.arrayContaining([
            expect.stringContaining('rate limit'),
          ]),
        });
      } else if (response.status === 429) {
        // Rate limited
        expect(responseData).toMatchObject({
          error: 'Rate Limit Exceeded',
          retryAfter: expect.any(Number),
        });
      } else {
        // Service unavailable
        expect(responseData).toMatchObject({
          error: 'Service Unavailable',
          message: expect.stringContaining('GitHub API'),
        });
      }
    });
  });
});
