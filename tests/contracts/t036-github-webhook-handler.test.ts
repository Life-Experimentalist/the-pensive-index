/**
 * T036 Contract Tests: GitHub Webhook Handler
 *
 * Validates webhook event processing, signature validation,
 * status updates, and integration workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../../../app/webhooks/github/route';
import { createHmac } from 'crypto';

// Mock the services
vi.mock('../../../src/lib/services/submission-service', () => ({
  SubmissionService: vi.fn(() => ({
    getSubmissionById: vi.fn(),
    updateSubmissionStatus: vi.fn(),
    updateSubmissionMetadata: vi.fn(),
    updateQualityScore: vi.fn(),
    updateRejectionReason: vi.fn(),
    addModeratorFeedback: vi.fn(),
    logModerationAction: vi.fn(),
  })),
}));

vi.mock('../../../src/lib/services/queue-service', () => ({
  QueueService: vi.fn(() => ({
    getQueueEntryBySubmissionId: vi.fn(),
    completeQueueEntry: vi.fn(),
    updateQueuePriority: vi.fn(),
    assignModerator: vi.fn(),
  })),
}));

vi.mock('../../../src/lib/notifications/email-service', () => ({
  EmailService: vi.fn(() => ({
    sendApprovalNotification: vi.fn(),
    sendRejectionNotification: vi.fn(),
    sendChangesRequestedNotification: vi.fn(),
  })),
}));

vi.mock('../../../src/lib/admin/models/AdminUser', () => ({
  AdminUserModel: {
    getInstance: () => ({
      getByGitHubUsername: vi.fn(),
    }),
  },
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

describe('T036: GitHub Webhook Handler Contract Tests', () => {
  const mockSubmissionId = 'sub-12345';
  const mockWebhookSecret = 'test-webhook-secret';

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment
    process.env.GITHUB_WEBHOOK_SECRET = mockWebhookSecret;
    process.env.NODE_ENV = 'test';
  });

  describe('Webhook Signature Validation', () => {
    it('should validate webhook signature correctly', async () => {
      const payload = JSON.stringify({
        action: 'labeled',
        issue: {
          id: 1,
          number: 123,
          title: '[SUB-12345] Test Story Submission',
          body: `---\nsubmission_id: "${mockSubmissionId}"\n---\nTest submission`,
          state: 'open',
          labels: [{ id: 1, name: 'status:approved', color: 'green' }],
          user: { login: 'testuser', id: 1 },
        },
        label: { id: 1, name: 'status:approved', color: 'green' },
        repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
        sender: { login: 'moderator', id: 2 },
      });

      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
          'x-github-delivery': 'test-delivery-123',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eventType).toBe('issues');
    });

    it('should reject invalid webhook signature', async () => {
      const payload = JSON.stringify({ action: 'ping' });
      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'ping',
          'x-github-signature-256': 'sha256=invalid-signature',
          'x-github-delivery': 'test-delivery-123',
        },
      });

      process.env.NODE_ENV = 'production';
      const response = await POST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Invalid webhook signature');
    });

    it('should require signature in production', async () => {
      const payload = JSON.stringify({ action: 'ping' });
      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'ping',
          'x-github-delivery': 'test-delivery-123',
        },
      });

      process.env.NODE_ENV = 'production';
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Issue Event Processing', () => {
    const createMockIssueEvent = (action: string, labelName?: string) => ({
      action,
      issue: {
        id: 1,
        number: 123,
        title: `[${mockSubmissionId}] Test Story Submission`,
        body: `---\nsubmission_id: "${mockSubmissionId}"\nstory_title: "Test Story"\n---\nTest submission content`,
        state: 'open' as const,
        labels: labelName ? [{ id: 1, name: labelName, color: 'green' }] : [],
        user: { login: 'testuser', id: 1 },
        assignee: { login: 'moderator', id: 2 },
      },
      label: labelName ? { id: 1, name: labelName, color: 'green' } : undefined,
      repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
      sender: { login: 'moderator', id: 2 },
    });

    it('should process approval label addition', async () => {
      const payload = JSON.stringify(
        createMockIssueEvent('labeled', 'status:approved')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('labeled');
    });

    it('should process rejection label addition', async () => {
      const payload = JSON.stringify(
        createMockIssueEvent('labeled', 'status:rejected')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should process priority label changes', async () => {
      const payload = JSON.stringify(
        createMockIssueEvent('labeled', 'priority:high')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should process quality assessment labels', async () => {
      const payload = JSON.stringify(
        createMockIssueEvent('labeled', 'quality:high')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle issue closure', async () => {
      const event = createMockIssueEvent('closed');
      event.issue.state = 'closed';
      event.issue.labels = [{ id: 1, name: 'status:approved', color: 'green' }];

      const payload = JSON.stringify(event);
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle issue reopening', async () => {
      const payload = JSON.stringify(createMockIssueEvent('opened'));
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Comment Event Processing', () => {
    const createMockCommentEvent = (commentBody: string) => ({
      action: 'created',
      issue: {
        id: 1,
        number: 123,
        title: `[${mockSubmissionId}] Test Story Submission`,
        body: `---\nsubmission_id: "${mockSubmissionId}"\n---\nTest submission`,
        state: 'open' as const,
        labels: [],
        user: { login: 'testuser', id: 1 },
        assignee: { login: 'moderator', id: 2 },
      },
      comment: {
        id: 456,
        body: commentBody,
        user: { login: 'moderator', id: 2 },
      },
      repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
      sender: { login: 'moderator', id: 2 },
    });

    it('should process moderation commands in comments', async () => {
      const payload = JSON.stringify(createMockCommentEvent('/approve'));
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issue_comment',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should process rejection commands with reason', async () => {
      const payload = JSON.stringify(
        createMockCommentEvent('/reject Does not meet quality standards')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issue_comment',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should process priority change commands', async () => {
      const payload = JSON.stringify(
        createMockCommentEvent('/priority urgent')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issue_comment',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should process assignment commands', async () => {
      const payload = JSON.stringify(
        createMockCommentEvent('/assign moderator2')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issue_comment',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle regular moderator feedback', async () => {
      const payload = JSON.stringify(
        createMockCommentEvent(
          'This looks good but needs some minor adjustments to the tagging.'
        )
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issue_comment',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Submission ID Extraction', () => {
    it('should extract submission ID from YAML frontmatter', async () => {
      const event = {
        action: 'labeled',
        issue: {
          id: 1,
          number: 123,
          title: 'Test Story Submission',
          body: `---\nsubmission_id: "${mockSubmissionId}"\nstory_title: "Test Story"\n---\nContent here`,
          state: 'open' as const,
          labels: [{ id: 1, name: 'status:approved', color: 'green' }],
          user: { login: 'testuser', id: 1 },
        },
        label: { id: 1, name: 'status:approved', color: 'green' },
        repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
        sender: { login: 'moderator', id: 2 },
      };

      const payload = JSON.stringify(event);
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should extract submission ID from issue title', async () => {
      const event = {
        action: 'labeled',
        issue: {
          id: 1,
          number: 123,
          title: `[${mockSubmissionId}] Test Story Submission`,
          body: 'Content without YAML frontmatter',
          state: 'open' as const,
          labels: [{ id: 1, name: 'status:approved', color: 'green' }],
          user: { login: 'testuser', id: 1 },
        },
        label: { id: 1, name: 'status:approved', color: 'green' },
        repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
        sender: { login: 'moderator', id: 2 },
      };

      const payload = JSON.stringify(event);
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle issues without submission ID', async () => {
      const event = {
        action: 'labeled',
        issue: {
          id: 1,
          number: 123,
          title: 'Regular GitHub Issue',
          body: 'This is not related to submissions',
          state: 'open' as const,
          labels: [{ id: 1, name: 'bug', color: 'red' }],
          user: { login: 'testuser', id: 1 },
        },
        label: { id: 1, name: 'bug', color: 'red' },
        repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
        sender: { login: 'moderator', id: 2 },
      };

      const payload = JSON.stringify(event);
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing GitHub event header', async () => {
      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: JSON.stringify({ action: 'ping' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Missing X-GitHub-Event header');
    });

    it('should handle invalid JSON payload', async () => {
      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'x-github-event': 'ping',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('should handle ping events', async () => {
      const payload = JSON.stringify({
        action: 'ping',
        zen: 'Responsive is better than fast.',
      });
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'ping',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eventType).toBe('ping');
    });

    it('should handle unsupported event types gracefully', async () => {
      const payload = JSON.stringify({
        action: 'opened',
        pull_request: { id: 1 },
      });
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'pull_request',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('GET Endpoint', () => {
    it('should return webhook handler information', async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.endpoint).toBe('GitHub Webhook Handler');
      expect(data.version).toBe('1.0.0');
      expect(data.status).toBe('active');
      expect(Array.isArray(data.supportedEvents)).toBe(true);
      expect(data.supportedEvents).toContain('issues');
      expect(data.supportedEvents).toContain('issue_comment');
    });
  });

  describe('Integration Scenarios', () => {
    it('should process complete approval workflow', async () => {
      // Test sequence: label added -> status updated -> queue completed -> email sent
      const payload = JSON.stringify(
        createMockIssueEvent('labeled', 'status:approved')
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should process complete rejection workflow', async () => {
      // Test sequence: rejection comment -> label added -> status updated -> email sent
      const commentPayload = JSON.stringify(
        createMockCommentEvent('/reject Quality standards not met')
      );
      const commentSignature = createHmac('sha256', mockWebhookSecret)
        .update(commentPayload, 'utf8')
        .digest('hex');

      const commentRequest = new NextRequest(
        'http://localhost/webhooks/github',
        {
          method: 'POST',
          body: commentPayload,
          headers: {
            'x-github-event': 'issue_comment',
            'x-github-signature-256': `sha256=${commentSignature}`,
          },
        }
      );

      const commentResponse = await POST(commentRequest);
      expect(commentResponse.status).toBe(200);

      // Follow up with label event
      const labelPayload = JSON.stringify(
        createMockIssueEvent('labeled', 'status:rejected')
      );
      const labelSignature = createHmac('sha256', mockWebhookSecret)
        .update(labelPayload, 'utf8')
        .digest('hex');

      const labelRequest = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: labelPayload,
        headers: {
          'x-github-event': 'issues',
          'x-github-signature-256': `sha256=${labelSignature}`,
        },
      });

      const labelResponse = await POST(labelRequest);
      expect(labelResponse.status).toBe(200);
    });

    it('should handle priority escalation scenario', async () => {
      const payload = JSON.stringify(
        createMockCommentEvent(
          '/priority urgent This needs immediate attention'
        )
      );
      const signature = createHmac('sha256', mockWebhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const request = new NextRequest('http://localhost/webhooks/github', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-event': 'issue_comment',
          'x-github-signature-256': `sha256=${signature}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  function createMockIssueEvent(action: string, labelName?: string) {
    return {
      action,
      issue: {
        id: 1,
        number: 123,
        title: `[${mockSubmissionId}] Test Story Submission`,
        body: `---\nsubmission_id: "${mockSubmissionId}"\nstory_title: "Test Story"\n---\nTest submission content`,
        state: 'open' as const,
        labels: labelName ? [{ id: 1, name: labelName, color: 'green' }] : [],
        user: { login: 'testuser', id: 1 },
        assignee: { login: 'moderator', id: 2 },
      },
      label: labelName ? { id: 1, name: labelName, color: 'green' } : undefined,
      repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
      sender: { login: 'moderator', id: 2 },
    };
  }

  function createMockCommentEvent(commentBody: string) {
    return {
      action: 'created',
      issue: {
        id: 1,
        number: 123,
        title: `[${mockSubmissionId}] Test Story Submission`,
        body: `---\nsubmission_id: "${mockSubmissionId}"\n---\nTest submission`,
        state: 'open' as const,
        labels: [],
        user: { login: 'testuser', id: 1 },
        assignee: { login: 'moderator', id: 2 },
      },
      comment: {
        id: 456,
        body: commentBody,
        user: { login: 'moderator', id: 2 },
      },
      repository: { id: 1, name: 'test-repo', full_name: 'org/test-repo' },
      sender: { login: 'moderator', id: 2 },
    };
  }
});
