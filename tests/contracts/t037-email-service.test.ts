/**
 * T037 Contract Tests: Email Service Integration
 *
 * Validates email template compilation, delivery tracking,
 * notification workflows, and service integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EmailService,
  EmailTemplateType,
  EmailTemplateData,
  EmailOptions,
} from '../../../src/lib/notifications/email-service';
import type {
  StorySubmission,
  SubmissionStatus,
} from '../../../src/types/submission';

// Mock the email provider
const mockEmailProvider = {
  sendEmail: vi.fn(),
};

// Mock DOM for template compilation
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      textContent: '',
      get innerHTML() {
        return this.textContent;
      },
    })),
  },
});

describe('T037: Email Service Integration Contract Tests', () => {
  let emailService: EmailService;

  const mockSubmission: StorySubmission = {
    id: 'sub-12345',
    title: 'The Last Horcrux',
    url: 'https://archiveofourown.org/works/12345',
    fandom: 'harry-potter',
    tags: ['harry/hermione', 'time-travel', 'fix-it'],
    description: 'Harry goes back in time to fix everything',
    wordCount: 50000,
    status: 'pending' as SubmissionStatus,
    submittedBy: 'user-123',
    submitterEmail: 'user@example.com',
    submitterName: 'Test User',
    submissionDate: new Date('2024-01-15'),
    lastModified: new Date('2024-01-15'),
  };

  const mockModerator = {
    id: 'mod-456',
    name: 'Jane Moderator',
    email: 'moderator@pensieve-index.com',
    githubUsername: 'jmoderator',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Configure mock email provider
    mockEmailProvider.sendEmail.mockResolvedValue({
      messageId: 'msg-12345',
      status: 'sent',
      recipient: 'test@example.com',
      timestamp: new Date(),
      trackingId: 'track-12345',
    });

    emailService = new EmailService(mockEmailProvider as any);
  });

  describe('Email Template Compilation', () => {
    it('should compile submission received template with correct data', async () => {
      const result = await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com'
      );

      expect(result.status).toBe('sent');
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('The Last Horcrux'),
          html: expect.stringContaining('Thank you for your submission'),
          text: expect.stringContaining('Thank you for your submission'),
          from: 'submissions@pensieve-index.com',
          replyTo: 'support@pensieve-index.com',
        })
      );
    });

    it('should compile approval notification template', async () => {
      const approvalData = {
        reason: 'Excellent quality and accurate tags',
        approvalDate: new Date('2024-01-20'),
        moderatorName: 'Jane Moderator',
        githubIssueUrl: 'https://github.com/org/repo/issues/123',
      };

      const result = await emailService.sendApprovalNotification(
        mockSubmission,
        approvalData
      );

      expect(result.status).toBe('sent');
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('✅ Submission Approved'),
          html: expect.stringContaining('Submission Approved! 🎉'),
          html: expect.stringContaining('Jane Moderator'),
          html: expect.stringContaining(approvalData.reason),
          priority: 'high',
        })
      );
    });

    it('should compile rejection notification template', async () => {
      const rejectionData = {
        reason: 'Incomplete tagging - missing character relationships',
        rejectionDate: new Date('2024-01-20'),
        moderatorName: 'Jane Moderator',
        githubIssueUrl: 'https://github.com/org/repo/issues/123',
        appealProcess: true,
      };

      const result = await emailService.sendRejectionNotification(
        mockSubmission,
        rejectionData
      );

      expect(result.status).toBe('sent');
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Submission Update'),
          html: expect.stringContaining('unable to approve'),
          html: expect.stringContaining(rejectionData.reason),
          html: expect.stringContaining('Jane Moderator'),
          priority: 'high',
        })
      );
    });

    it('should compile changes requested template', async () => {
      const changesData = {
        reason: 'Minor adjustments needed',
        requestDate: new Date('2024-01-20'),
        requestedChanges: [
          'Add missing character tags',
          'Update word count',
          'Clarify story description',
        ],
        moderatorName: 'Jane Moderator',
        githubIssueUrl: 'https://github.com/org/repo/issues/123',
      };

      const result = await emailService.sendChangesRequestedNotification(
        mockSubmission,
        changesData
      );

      expect(result.status).toBe('sent');
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Changes Requested'),
          html: expect.stringContaining('make some adjustments'),
          html: expect.stringContaining('Add missing character tags'),
          html: expect.stringContaining('Update word count'),
          priority: 'high',
        })
      );
    });

    it('should compile moderator assignment template', async () => {
      const assignmentData = {
        assignmentDate: new Date('2024-01-18'),
        priority: 'high' as const,
        queuePosition: 3,
        estimatedReviewTime: '1-2 business days',
      };

      const result = await emailService.sendModeratorAssignmentNotification(
        mockSubmission,
        mockModerator,
        assignmentData
      );

      expect(result.status).toBe('sent');
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'moderator@pensieve-index.com',
          subject: expect.stringContaining('New Submission Assigned'),
          html: expect.stringContaining('New Moderation Assignment'),
          html: expect.stringContaining('Priority: high'),
          html: expect.stringContaining('Queue Position: #3'),
          priority: 'high',
        })
      );
    });
  });

  describe('Admin Notifications', () => {
    it('should send admin notifications for critical alerts', async () => {
      const notification = {
        type: 'system-error' as const,
        title: 'Database Connection Failed',
        message: 'Unable to connect to submission database',
        severity: 'critical' as const,
        data: { errorCode: 'DB_CONN_001' },
      };

      const adminEmails = [
        'admin1@pensieve-index.com',
        'admin2@pensieve-index.com',
      ];

      const results = await emailService.sendAdminNotification(
        notification,
        adminEmails
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledTimes(2);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Admin Alert'),
          priority: 'high', // Critical severity maps to high priority
        })
      );
    });

    it('should send queue backlog alerts to moderators', async () => {
      const queueStats = {
        totalPending: 15,
        averageReviewTime: 4.5,
        oldestSubmissionDays: 8,
        moderatorCount: 3,
      };

      const moderatorEmails = [
        'mod1@pensieve-index.com',
        'mod2@pensieve-index.com',
      ];

      const results = await emailService.sendQueueBacklogAlert(
        queueStats,
        moderatorEmails
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high', // Old submissions > 7 days trigger high priority
          batchId: expect.stringMatching(/queue-alert-\d+/),
        })
      );
    });

    it('should batch admin notifications with same batch ID', async () => {
      const notification = {
        type: 'queue-alert' as const,
        title: 'Review Backlog Alert',
        message: 'Queue has exceeded normal capacity',
        severity: 'medium' as const,
      };

      const adminEmails = [
        'admin1@pensieve-index.com',
        'admin2@pensieve-index.com',
      ];

      await emailService.sendAdminNotification(notification, adminEmails);

      const calls = mockEmailProvider.sendEmail.mock.calls;
      expect(calls).toHaveLength(2);

      // Both calls should have different recipients but same template content
      expect(calls[0][0].to).toBe('admin1@pensieve-index.com');
      expect(calls[1][0].to).toBe('admin2@pensieve-index.com');
    });
  });

  describe('Email Delivery Options', () => {
    it('should respect priority settings', async () => {
      const options: EmailOptions = {
        priority: 'high',
        trackOpening: true,
        suppressDuplicates: true,
      };

      await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com',
        options
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
          trackOpening: true,
          suppressDuplicates: true,
        })
      );
    });

    it('should handle delivery time scheduling', async () => {
      const scheduledTime = new Date('2024-01-20T10:00:00Z');
      const options: EmailOptions = {
        deliveryTime: scheduledTime,
        retryAttempts: 3,
      };

      await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com',
        options
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryTime: scheduledTime,
          retryAttempts: 3,
        })
      );
    });

    it('should suppress duplicate emails when enabled', async () => {
      const options: EmailOptions = {
        suppressDuplicates: true,
        batchId: 'test-batch-123',
      };

      await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com',
        options
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          suppressDuplicates: true,
          batchId: 'test-batch-123',
        })
      );
    });
  });

  describe('Email Address Configuration', () => {
    it('should use correct sender addresses for each template type', async () => {
      // Test submission confirmation
      await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com'
      );
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'submissions@pensieve-index.com',
          replyTo: 'support@pensieve-index.com',
        })
      );

      // Test moderation emails
      const approvalData = {
        reason: 'Test approval',
        approvalDate: new Date(),
      };
      await emailService.sendApprovalNotification(mockSubmission, approvalData);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'moderation@pensieve-index.com',
          replyTo: 'moderation@pensieve-index.com',
        })
      );

      // Test admin notifications
      const notification = {
        type: 'system-error' as const,
        title: 'Test Alert',
        message: 'Test message',
        severity: 'low' as const,
      };
      await emailService.sendAdminNotification(notification, [
        'admin@pensieve-index.com',
      ]);
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'system@pensieve-index.com',
          replyTo: 'support@pensieve-index.com',
        })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle email provider failures gracefully', async () => {
      mockEmailProvider.sendEmail.mockRejectedValue(
        new Error('SMTP connection failed')
      );

      const result = await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com'
      );

      expect(result.status).toBe('failed');
      expect(result.error).toBe('SMTP connection failed');
      expect(result.messageId).toMatch(/^failed-\d+$/);
    });

    it('should track failed deliveries for retry', async () => {
      mockEmailProvider.sendEmail.mockRejectedValue(
        new Error('Recipient not found')
      );

      const result = await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'invalid@example.com'
      );

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Recipient not found');
      expect(result.recipient).toBe('invalid@example.com');
    });

    it('should handle template compilation errors', async () => {
      // Test with invalid submission data
      const invalidSubmission = { ...mockSubmission, title: null } as any;

      const result = await emailService.sendSubmissionConfirmation(
        invalidSubmission,
        'user@example.com'
      );

      // Should handle gracefully and still attempt to send
      expect(result).toBeDefined();
    });

    it('should retry failed emails with proper configuration', async () => {
      // First call fails, second succeeds
      mockEmailProvider.sendEmail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          messageId: 'msg-retry-12345',
          status: 'sent',
          recipient: 'user@example.com',
          timestamp: new Date(),
        });

      // Mock the retry functionality
      const filters = {
        templateType: 'submission-received' as EmailTemplateType,
      };
      const retryOptions: EmailOptions = { retryAttempts: 1 };

      // This would normally query failed deliveries from the tracker
      const mockFailedDeliveries = [
        {
          messageId: 'failed-123',
          recipient: 'user@example.com',
          templateType: 'submission-received' as EmailTemplateType,
          templateData: {
            submission: mockSubmission,
            user: {
              id: 'user-123',
              email: 'user@example.com',
              name: 'Test User',
            },
          },
          error: 'Temporary failure',
          timestamp: new Date(),
        },
      ];

      // Mock the tracker method
      const mockTracker = emailService['deliveryTracker'] as any;
      mockTracker.getFailedDeliveries = vi
        .fn()
        .mockResolvedValue(mockFailedDeliveries);

      const results = await emailService.resendFailedEmails(
        filters,
        retryOptions
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('sent');
    });
  });

  describe('Delivery Statistics and Tracking', () => {
    it('should provide delivery statistics for date range', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const stats = await emailService.getDeliveryStats(dateRange);

      expect(stats).toEqual({
        sent: 100,
        failed: 5,
        opened: 75,
        clicked: 25,
        bounced: 2,
      });
    });

    it('should filter statistics by template type', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const stats = await emailService.getDeliveryStats(
        dateRange,
        'submission-received'
      );

      expect(stats).toBeDefined();
      expect(typeof stats.sent).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });

    it('should track email deliveries with proper metadata', async () => {
      const trackingOptions: EmailOptions = {
        trackOpening: true,
        trackClicks: true,
      };

      const result = await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com',
        trackingOptions
      );

      expect(result.trackingId).toBeDefined();
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          trackOpening: true,
          trackClicks: true,
        })
      );
    });
  });

  describe('Template Data Validation', () => {
    it('should handle missing optional template data gracefully', async () => {
      const minimalSubmission = {
        ...mockSubmission,
        submitterName: undefined,
        fandomName: undefined,
      };

      const result = await emailService.sendSubmissionConfirmation(
        minimalSubmission,
        'user@example.com'
      );

      expect(result.status).toBe('sent');
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Contributor'), // Default name
          html: expect.stringContaining('N/A'), // Default fandom
        })
      );
    });

    it('should format dates consistently across templates', async () => {
      const specificDate = new Date('2024-01-15T14:30:00Z');
      const submissionWithDate = {
        ...mockSubmission,
        submissionDate: specificDate,
      };

      await emailService.sendSubmissionConfirmation(
        submissionWithDate,
        'user@example.com'
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('January 15, 2024'),
        })
      );
    });

    it('should escape HTML content in templates', async () => {
      const submissionWithHtml = {
        ...mockSubmission,
        title: 'Test Story <script>alert("xss")</script>',
        description: 'Description with <b>HTML</b> content',
      };

      const result = await emailService.sendSubmissionConfirmation(
        submissionWithHtml,
        'user@example.com'
      );

      expect(result.status).toBe('sent');
      // HTML should be escaped in templates
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.not.stringContaining('<script>'),
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete approval workflow email sequence', async () => {
      // 1. Initial submission confirmation
      const confirmationResult = await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com'
      );
      expect(confirmationResult.status).toBe('sent');

      // 2. Moderator assignment
      const assignmentData = {
        assignmentDate: new Date(),
        queuePosition: 1,
        estimatedReviewTime: '1-2 days',
      };
      const assignmentResult =
        await emailService.sendModeratorAssignmentNotification(
          mockSubmission,
          mockModerator,
          assignmentData
        );
      expect(assignmentResult.status).toBe('sent');

      // 3. Final approval
      const approvalData = {
        reason: 'Excellent submission',
        approvalDate: new Date(),
        moderatorName: 'Jane Moderator',
      };
      const approvalResult = await emailService.sendApprovalNotification(
        mockSubmission,
        approvalData
      );
      expect(approvalResult.status).toBe('sent');

      // Verify all three emails were sent
      expect(mockEmailProvider.sendEmail).toHaveBeenCalledTimes(3);
    });

    it('should handle rejection with changes workflow', async () => {
      // 1. Initial submission confirmation
      await emailService.sendSubmissionConfirmation(
        mockSubmission,
        'user@example.com'
      );

      // 2. Request changes
      const changesData = {
        reason: 'Minor adjustments needed',
        requestDate: new Date(),
        requestedChanges: ['Fix tagging', 'Update description'],
        moderatorName: 'Jane Moderator',
      };
      await emailService.sendChangesRequestedNotification(
        mockSubmission,
        changesData
      );

      // 3. Final rejection after no response
      const rejectionData = {
        reason: 'No response to requested changes',
        rejectionDate: new Date(),
        moderatorName: 'Jane Moderator',
      };
      await emailService.sendRejectionNotification(
        mockSubmission,
        rejectionData
      );

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledTimes(3);
    });

    it('should batch notifications for multiple events', async () => {
      const submissions = [
        { ...mockSubmission, id: 'sub-1', title: 'Story 1' },
        { ...mockSubmission, id: 'sub-2', title: 'Story 2' },
        { ...mockSubmission, id: 'sub-3', title: 'Story 3' },
      ];

      const batchOptions: EmailOptions = {
        batchId: 'daily-digest-123',
        suppressDuplicates: true,
      };

      // Send multiple confirmations with same batch ID
      for (const submission of submissions) {
        await emailService.sendSubmissionConfirmation(
          submission,
          'user@example.com',
          batchOptions
        );
      }

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledTimes(3);

      // All calls should have same batch ID
      const calls = mockEmailProvider.sendEmail.mock.calls;
      expect(calls.every(call => call[0].batchId === 'daily-digest-123')).toBe(
        true
      );
    });
  });
});
