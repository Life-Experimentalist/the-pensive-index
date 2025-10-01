/**
 * T037: Email Service Integration
 *
 * Comprehensive email notification system for community submission workflow
 * with template-based emails, admin notifications, and delivery tracking
 */

import {
  StorySubmission,
  SubmissionStatus,
  ModerationActionType,
} from '../../types/submission';

/**
 * Email template types
 */
export type EmailTemplateType =
  | 'submission-received'
  | 'submission-approved'
  | 'submission-rejected'
  | 'changes-requested'
  | 'moderator-assigned'
  | 'admin-notification'
  | 'queue-alert'
  | 'welcome'
  | 'reminder';

/**
 * Email template data structures
 */
export interface EmailTemplateData {
  submission?: StorySubmission & {
    fandomName?: string;
    submitterName?: string;
    moderatorName?: string;
    githubIssueUrl?: string;
    rejectionReason?: string;
    requestedChanges?: string[];
    qualityScore?: number;
    queuePosition?: number;
    estimatedReviewTime?: string;
  };
  user?: {
    id: string;
    email: string;
    name: string;
    preferences?: {
      emailNotifications: boolean;
      digestFrequency: 'immediate' | 'daily' | 'weekly';
    };
  };
  moderator?: {
    id: string;
    name: string;
    email: string;
    githubUsername?: string;
  };
  admin?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  metadata?: {
    timestamp: Date;
    reason?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionType?: ModerationActionType;
    githubIssueNumber?: number;
    queueStats?: {
      totalPending: number;
      averageReviewTime: number;
      backlogAlert: boolean;
    };
  };
}

/**
 * Email delivery options
 */
export interface EmailOptions {
  priority?: 'low' | 'normal' | 'high';
  retryAttempts?: number;
  deliveryTime?: Date; // For scheduled emails
  trackOpening?: boolean;
  trackClicks?: boolean;
  suppressDuplicates?: boolean;
  batchId?: string;
}

/**
 * Email delivery result
 */
export interface EmailDeliveryResult {
  messageId: string;
  status: 'sent' | 'queued' | 'failed' | 'rejected';
  recipient: string;
  timestamp: Date;
  error?: string;
  trackingId?: string;
}

/**
 * Email Service Implementation
 */
export class EmailService {
  private templates: Map<EmailTemplateType, EmailTemplate> = new Map();
  private provider: EmailProvider;
  private deliveryTracker: EmailDeliveryTracker;

  constructor(provider?: EmailProvider) {
    this.provider = provider || new DefaultEmailProvider();
    this.deliveryTracker = new EmailDeliveryTracker();
    this.initializeTemplates();
  }

  /**
   * Send submission received confirmation
   */
  async sendSubmissionConfirmation(
    submission: StorySubmission,
    submitterEmail: string,
    options?: EmailOptions
  ): Promise<EmailDeliveryResult> {
    console.log(
      `[Email Service] Sending submission confirmation for: ${submission.id}`
    );

    const templateData: EmailTemplateData = {
      submission: {
        ...submission,
        queuePosition: await this.getQueuePosition(submission.id),
        estimatedReviewTime: await this.getEstimatedReviewTime(),
      },
      user: {
        id: submission.submittedBy,
        email: submitterEmail,
        name: submission.submitterName || 'Contributor',
      },
      metadata: {
        timestamp: new Date(),
        reason: 'submission-received',
      },
    };

    return await this.sendTemplatedEmail(
      'submission-received',
      submitterEmail,
      templateData,
      {
        ...options,
        trackOpening: true,
        suppressDuplicates: true,
      }
    );
  }

  /**
   * Send approval notification
   */
  async sendApprovalNotification(
    submission: StorySubmission,
    approvalData: {
      reason?: string;
      approvalDate: Date;
      moderatorName?: string;
      githubIssueUrl?: string;
    },
    options?: EmailOptions
  ): Promise<EmailDeliveryResult> {
    console.log(
      `[Email Service] Sending approval notification for: ${submission.id}`
    );

    const templateData: EmailTemplateData = {
      submission: {
        ...submission,
        moderatorName: approvalData.moderatorName,
        githubIssueUrl: approvalData.githubIssueUrl,
      },
      user: {
        id: submission.submittedBy,
        email: submission.submitterEmail,
        name: submission.submitterName || 'Contributor',
      },
      metadata: {
        timestamp: approvalData.approvalDate,
        reason: approvalData.reason || 'Quality standards met',
        actionType: 'approved',
      },
    };

    return await this.sendTemplatedEmail(
      'submission-approved',
      submission.submitterEmail,
      templateData,
      {
        ...options,
        priority: 'high',
        trackOpening: true,
      }
    );
  }

  /**
   * Send rejection notification
   */
  async sendRejectionNotification(
    submission: StorySubmission,
    rejectionData: {
      reason: string;
      rejectionDate: Date;
      moderatorName?: string;
      githubIssueUrl?: string;
      appealProcess?: boolean;
    },
    options?: EmailOptions
  ): Promise<EmailDeliveryResult> {
    console.log(
      `[Email Service] Sending rejection notification for: ${submission.id}`
    );

    const templateData: EmailTemplateData = {
      submission: {
        ...submission,
        rejectionReason: rejectionData.reason,
        moderatorName: rejectionData.moderatorName,
        githubIssueUrl: rejectionData.githubIssueUrl,
      },
      user: {
        id: submission.submittedBy,
        email: submission.submitterEmail,
        name: submission.submitterName || 'Contributor',
      },
      metadata: {
        timestamp: rejectionData.rejectionDate,
        reason: rejectionData.reason,
        actionType: 'rejected',
      },
    };

    return await this.sendTemplatedEmail(
      'submission-rejected',
      submission.submitterEmail,
      templateData,
      {
        ...options,
        priority: 'high',
        trackOpening: true,
      }
    );
  }

  /**
   * Send changes requested notification
   */
  async sendChangesRequestedNotification(
    submission: StorySubmission,
    changesData: {
      reason: string;
      requestDate: Date;
      requestedChanges?: string[];
      moderatorName?: string;
      githubIssueUrl?: string;
    },
    options?: EmailOptions
  ): Promise<EmailDeliveryResult> {
    console.log(
      `[Email Service] Sending changes requested notification for: ${submission.id}`
    );

    const templateData: EmailTemplateData = {
      submission: {
        ...submission,
        requestedChanges: changesData.requestedChanges,
        moderatorName: changesData.moderatorName,
        githubIssueUrl: changesData.githubIssueUrl,
      },
      user: {
        id: submission.submittedBy,
        email: submission.submitterEmail,
        name: submission.submitterName || 'Contributor',
      },
      metadata: {
        timestamp: changesData.requestDate,
        reason: changesData.reason,
        actionType: 'changes_requested',
      },
    };

    return await this.sendTemplatedEmail(
      'changes-requested',
      submission.submitterEmail,
      templateData,
      {
        ...options,
        priority: 'high',
        trackOpening: true,
      }
    );
  }

  /**
   * Send moderator assignment notification
   */
  async sendModeratorAssignmentNotification(
    submission: StorySubmission,
    moderator: {
      id: string;
      name: string;
      email: string;
      githubUsername?: string;
    },
    assignmentData: {
      assignmentDate: Date;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      queuePosition: number;
      estimatedReviewTime: string;
    },
    options?: EmailOptions
  ): Promise<EmailDeliveryResult> {
    console.log(
      `[Email Service] Sending moderator assignment notification: ${submission.id} → ${moderator.name}`
    );

    const templateData: EmailTemplateData = {
      submission: {
        ...submission,
        queuePosition: assignmentData.queuePosition,
        estimatedReviewTime: assignmentData.estimatedReviewTime,
      },
      moderator,
      metadata: {
        timestamp: assignmentData.assignmentDate,
        priority: assignmentData.priority || 'normal',
        reason: 'moderator-assignment',
      },
    };

    return await this.sendTemplatedEmail(
      'moderator-assigned',
      moderator.email,
      templateData,
      {
        ...options,
        priority: assignmentData.priority === 'urgent' ? 'high' : 'normal',
        trackOpening: true,
      }
    );
  }

  /**
   * Send admin notification for system events
   */
  async sendAdminNotification(
    notification: {
      type:
        | 'queue-alert'
        | 'system-error'
        | 'moderation-alert'
        | 'performance-alert';
      title: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      data?: Record<string, any>;
    },
    adminEmails: string[],
    options?: EmailOptions
  ): Promise<EmailDeliveryResult[]> {
    console.log(
      `[Email Service] Sending admin notification: ${notification.type} (${notification.severity})`
    );

    const templateData: EmailTemplateData = {
      metadata: {
        timestamp: new Date(),
        reason: notification.type,
        priority: notification.severity === 'critical' ? 'urgent' : 'normal',
        queueStats: notification.data?.queueStats,
      },
      admin: {
        id: 'system',
        name: 'System Administrator',
        email: adminEmails[0],
        role: 'admin',
      },
    };

    const results: EmailDeliveryResult[] = [];
    for (const email of adminEmails) {
      const result = await this.sendTemplatedEmail(
        'admin-notification',
        email,
        {
          ...templateData,
          admin: { ...templateData.admin!, email },
        },
        {
          ...options,
          priority: notification.severity === 'critical' ? 'high' : 'normal',
          suppressDuplicates: false,
        }
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Send queue backlog alert
   */
  async sendQueueBacklogAlert(
    queueStats: {
      totalPending: number;
      averageReviewTime: number;
      oldestSubmissionDays: number;
      moderatorCount: number;
    },
    moderatorEmails: string[],
    options?: EmailOptions
  ): Promise<EmailDeliveryResult[]> {
    console.log(
      `[Email Service] Sending queue backlog alert: ${queueStats.totalPending} pending submissions`
    );

    const templateData: EmailTemplateData = {
      metadata: {
        timestamp: new Date(),
        reason: 'queue-backlog-alert',
        priority: queueStats.oldestSubmissionDays > 7 ? 'high' : 'normal',
        queueStats: {
          totalPending: queueStats.totalPending,
          averageReviewTime: queueStats.averageReviewTime,
          backlogAlert: true,
        },
      },
    };

    const results: EmailDeliveryResult[] = [];
    for (const email of moderatorEmails) {
      const result = await this.sendTemplatedEmail(
        'queue-alert',
        email,
        templateData,
        {
          ...options,
          priority: queueStats.oldestSubmissionDays > 7 ? 'high' : 'normal',
          batchId: `queue-alert-${Date.now()}`,
        }
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Send templated email
   */
  private async sendTemplatedEmail(
    templateType: EmailTemplateType,
    recipient: string,
    templateData: EmailTemplateData,
    options: EmailOptions = {}
  ): Promise<EmailDeliveryResult> {
    try {
      const template = this.templates.get(templateType);
      if (!template) {
        throw new Error(`Email template not found: ${templateType}`);
      }

      const compiledEmail = await template.compile(templateData);

      const result = await this.provider.sendEmail({
        to: recipient,
        subject: compiledEmail.subject,
        html: compiledEmail.htmlBody,
        text: compiledEmail.textBody,
        from: this.getFromAddress(templateType),
        replyTo: this.getReplyToAddress(templateType),
        ...options,
      });

      // Track delivery
      await this.deliveryTracker.trackDelivery({
        messageId: result.messageId,
        recipient,
        templateType,
        status: result.status,
        timestamp: new Date(),
        trackingId: result.trackingId,
      });

      return result;
    } catch (error) {
      console.error(
        `[Email Service] Error sending ${templateType} email to ${recipient}:`,
        error
      );

      const failureResult: EmailDeliveryResult = {
        messageId: `failed-${Date.now()}`,
        status: 'failed',
        recipient,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.deliveryTracker.trackDelivery({
        messageId: failureResult.messageId,
        recipient,
        templateType,
        status: 'failed',
        timestamp: new Date(),
        error: failureResult.error,
      });

      return failureResult;
    }
  }

  /**
   * Get sender address for template type
   */
  private getFromAddress(templateType: EmailTemplateType): string {
    const fromAddresses = {
      'submission-received': 'submissions@pensieve-index.com',
      'submission-approved': 'moderation@pensieve-index.com',
      'submission-rejected': 'moderation@pensieve-index.com',
      'changes-requested': 'moderation@pensieve-index.com',
      'moderator-assigned': 'admin@pensieve-index.com',
      'admin-notification': 'system@pensieve-index.com',
      'queue-alert': 'alerts@pensieve-index.com',
      welcome: 'welcome@pensieve-index.com',
      reminder: 'reminders@pensieve-index.com',
    };

    return fromAddresses[templateType] || 'noreply@pensieve-index.com';
  }

  /**
   * Get reply-to address for template type
   */
  private getReplyToAddress(templateType: EmailTemplateType): string {
    const supportEmail = 'support@pensieve-index.com';
    const moderationEmail = 'moderation@pensieve-index.com';

    const replyToAddresses = {
      'submission-received': supportEmail,
      'submission-approved': moderationEmail,
      'submission-rejected': moderationEmail,
      'changes-requested': moderationEmail,
      'moderator-assigned': moderationEmail,
      'admin-notification': supportEmail,
      'queue-alert': moderationEmail,
      welcome: supportEmail,
      reminder: supportEmail,
    };

    return replyToAddresses[templateType] || supportEmail;
  }

  /**
   * Get queue position for submission
   */
  private async getQueuePosition(submissionId: string): Promise<number> {
    // This would integrate with QueueService to get actual position
    // Placeholder implementation
    return Math.floor(Math.random() * 20) + 1;
  }

  /**
   * Get estimated review time
   */
  private async getEstimatedReviewTime(): Promise<string> {
    // This would calculate based on current queue stats
    // Placeholder implementation
    return '2-3 business days';
  }

  /**
   * Initialize email templates
   */
  private initializeTemplates(): void {
    // Initialize all email templates
    this.templates.set('submission-received', new SubmissionReceivedTemplate());
    this.templates.set('submission-approved', new SubmissionApprovedTemplate());
    this.templates.set('submission-rejected', new SubmissionRejectedTemplate());
    this.templates.set('changes-requested', new ChangesRequestedTemplate());
    this.templates.set('moderator-assigned', new ModeratorAssignedTemplate());
    this.templates.set('admin-notification', new AdminNotificationTemplate());
    this.templates.set('queue-alert', new QueueAlertTemplate());
    this.templates.set('welcome', new WelcomeTemplate());
    this.templates.set('reminder', new ReminderTemplate());
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(
    dateRange: { start: Date; end: Date },
    templateType?: EmailTemplateType
  ): Promise<{
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> {
    return await this.deliveryTracker.getStats(dateRange, templateType);
  }

  /**
   * Resend failed emails
   */
  async resendFailedEmails(
    filters: {
      templateType?: EmailTemplateType;
      recipient?: string;
      dateRange?: { start: Date; end: Date };
    },
    options?: EmailOptions
  ): Promise<EmailDeliveryResult[]> {
    const failedEmails = await this.deliveryTracker.getFailedDeliveries(
      filters
    );
    const results: EmailDeliveryResult[] = [];

    for (const failed of failedEmails) {
      // Retry sending with original template data
      const result = await this.sendTemplatedEmail(
        failed.templateType,
        failed.recipient,
        failed.templateData,
        { ...options, retryAttempts: 1 }
      );
      results.push(result);
    }

    return results;
  }
}

/**
 * Abstract Email Template
 */
abstract class EmailTemplate {
  abstract compile(data: EmailTemplateData): Promise<{
    subject: string;
    htmlBody: string;
    textBody: string;
  }>;

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Submission Received Template
 */
class SubmissionReceivedTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const { submission, user } = data;

    return {
      subject: `Submission Received: "${submission?.title}"`,
      htmlBody: `
        <h2>Thank you for your submission!</h2>
        <p>Hello ${user?.name || 'Contributor'},</p>
        <p>We've received your story submission and added it to our review queue.</p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Submission Details</h3>
          <p><strong>Title:</strong> ${submission?.title}</p>
          <p><strong>Fandom:</strong> ${submission?.fandomName || 'N/A'}</p>
          <p><strong>Submitted:</strong> ${this.formatDate(
            data.metadata?.timestamp || new Date()
          )}</p>
          <p><strong>Queue Position:</strong> #${
            submission?.queuePosition || 'TBD'
          }</p>
          <p><strong>Estimated Review Time:</strong> ${
            submission?.estimatedReviewTime || '2-3 business days'
          }</p>
        </div>

        <p>Our moderation team will review your submission for quality and accuracy. You'll receive an email notification once the review is complete.</p>

        <p>Thank you for contributing to The Pensieve Index!</p>
      `,
      textBody: `
        Submission Received: "${submission?.title}"

        Hello ${user?.name || 'Contributor'},

        We've received your story submission and added it to our review queue.

        Submission Details:
        - Title: ${submission?.title}
        - Fandom: ${submission?.fandomName || 'N/A'}
        - Submitted: ${this.formatDate(data.metadata?.timestamp || new Date())}
        - Queue Position: #${submission?.queuePosition || 'TBD'}
        - Estimated Review Time: ${
          submission?.estimatedReviewTime || '2-3 business days'
        }

        Our moderation team will review your submission for quality and accuracy. You'll receive an email notification once the review is complete.

        Thank you for contributing to The Pensieve Index!
      `,
    };
  }
}

/**
 * Submission Approved Template
 */
class SubmissionApprovedTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const { submission, user, metadata } = data;

    return {
      subject: `✅ Submission Approved: "${submission?.title}"`,
      htmlBody: `
        <h2 style="color: #28a745;">Submission Approved! 🎉</h2>
        <p>Hello ${user?.name || 'Contributor'},</p>
        <p>Great news! Your story submission has been approved and added to The Pensieve Index.</p>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3>Approved Submission</h3>
          <p><strong>Title:</strong> ${submission?.title}</p>
          <p><strong>Fandom:</strong> ${submission?.fandomName || 'N/A'}</p>
          <p><strong>Approved:</strong> ${this.formatDate(
            metadata?.timestamp || new Date()
          )}</p>
          ${
            submission?.moderatorName
              ? `<p><strong>Reviewed by:</strong> ${submission.moderatorName}</p>`
              : ''
          }
          ${
            metadata?.reason
              ? `<p><strong>Notes:</strong> ${metadata.reason}</p>`
              : ''
          }
        </div>

        <p>Your contribution helps make fanfiction more discoverable for readers and writers alike. Thank you for being part of our community!</p>

        ${
          submission?.githubIssueUrl
            ? `<p><a href="${submission.githubIssueUrl}">View moderation details</a></p>`
            : ''
        }
      `,
      textBody: `
        Submission Approved: "${submission?.title}"

        Hello ${user?.name || 'Contributor'},

        Great news! Your story submission has been approved and added to The Pensieve Index.

        Approved Submission:
        - Title: ${submission?.title}
        - Fandom: ${submission?.fandomName || 'N/A'}
        - Approved: ${this.formatDate(metadata?.timestamp || new Date())}
        ${
          submission?.moderatorName
            ? `- Reviewed by: ${submission.moderatorName}`
            : ''
        }
        ${metadata?.reason ? `- Notes: ${metadata.reason}` : ''}

        Your contribution helps make fanfiction more discoverable for readers and writers alike. Thank you for being part of our community!

        ${
          submission?.githubIssueUrl
            ? `View moderation details: ${submission.githubIssueUrl}`
            : ''
        }
      `,
    };
  }
}

/**
 * Submission Rejected Template
 */
class SubmissionRejectedTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const { submission, user, metadata } = data;

    return {
      subject: `Submission Update: "${submission?.title}"`,
      htmlBody: `
        <h2 style="color: #dc3545;">Submission Update</h2>
        <p>Hello ${user?.name || 'Contributor'},</p>
        <p>Thank you for your submission to The Pensieve Index. After review, we're unable to approve this submission at this time.</p>

        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3>Submission Details</h3>
          <p><strong>Title:</strong> ${submission?.title}</p>
          <p><strong>Fandom:</strong> ${submission?.fandomName || 'N/A'}</p>
          <p><strong>Reviewed:</strong> ${this.formatDate(
            metadata?.timestamp || new Date()
          )}</p>
          ${
            submission?.moderatorName
              ? `<p><strong>Reviewed by:</strong> ${submission.moderatorName}</p>`
              : ''
          }
          ${
            submission?.rejectionReason
              ? `<p><strong>Reason:</strong> ${submission.rejectionReason}</p>`
              : ''
          }
        </div>

        <p>We encourage you to review our submission guidelines and try again. Common reasons for rejection include:</p>
        <ul>
          <li>Incomplete or inaccurate story information</li>
          <li>Missing required tags or metadata</li>
          <li>Story doesn't meet our quality standards</li>
          <li>Duplicate submission already in our database</li>
        </ul>

        <p>If you believe this decision was made in error, please reply to this email with additional information.</p>

        ${
          submission?.githubIssueUrl
            ? `<p><a href="${submission.githubIssueUrl}">View moderation details</a></p>`
            : ''
        }
      `,
      textBody: `
        Submission Update: "${submission?.title}"

        Hello ${user?.name || 'Contributor'},

        Thank you for your submission to The Pensieve Index. After review, we're unable to approve this submission at this time.

        Submission Details:
        - Title: ${submission?.title}
        - Fandom: ${submission?.fandomName || 'N/A'}
        - Reviewed: ${this.formatDate(metadata?.timestamp || new Date())}
        ${
          submission?.moderatorName
            ? `- Reviewed by: ${submission.moderatorName}`
            : ''
        }
        ${
          submission?.rejectionReason
            ? `- Reason: ${submission.rejectionReason}`
            : ''
        }

        We encourage you to review our submission guidelines and try again. Common reasons for rejection include:
        - Incomplete or inaccurate story information
        - Missing required tags or metadata
        - Story doesn't meet our quality standards
        - Duplicate submission already in our database

        If you believe this decision was made in error, please reply to this email with additional information.

        ${
          submission?.githubIssueUrl
            ? `View moderation details: ${submission.githubIssueUrl}`
            : ''
        }
      `,
    };
  }
}

/**
 * Changes Requested Template
 */
class ChangesRequestedTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const { submission, user, metadata } = data;

    return {
      subject: `Changes Requested: "${submission?.title}"`,
      htmlBody: `
        <h2 style="color: #fd7e14;">Changes Requested</h2>
        <p>Hello ${user?.name || 'Contributor'},</p>
        <p>We've reviewed your submission and would like you to make some adjustments before we can approve it.</p>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #fd7e14;">
          <h3>Submission Details</h3>
          <p><strong>Title:</strong> ${submission?.title}</p>
          <p><strong>Fandom:</strong> ${submission?.fandomName || 'N/A'}</p>
          <p><strong>Reviewed:</strong> ${this.formatDate(
            metadata?.timestamp || new Date()
          )}</p>
          ${
            submission?.moderatorName
              ? `<p><strong>Reviewed by:</strong> ${submission.moderatorName}</p>`
              : ''
          }
        </div>

        ${
          submission?.requestedChanges && submission.requestedChanges.length > 0
            ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Requested Changes</h3>
          <ul>
            ${submission.requestedChanges
              .map(change => `<li>${change}</li>`)
              .join('')}
          </ul>
        </div>
        `
            : ''
        }

        <p>Please make the requested changes and resubmit your story. Once you've made the updates, our team will review it again promptly.</p>

        <p>Thank you for your patience and for helping us maintain quality in our database!</p>

        ${
          submission?.githubIssueUrl
            ? `<p><a href="${submission.githubIssueUrl}">View moderation details</a></p>`
            : ''
        }
      `,
      textBody: `
        Changes Requested: "${submission?.title}"

        Hello ${user?.name || 'Contributor'},

        We've reviewed your submission and would like you to make some adjustments before we can approve it.

        Submission Details:
        - Title: ${submission?.title}
        - Fandom: ${submission?.fandomName || 'N/A'}
        - Reviewed: ${this.formatDate(metadata?.timestamp || new Date())}
        ${
          submission?.moderatorName
            ? `- Reviewed by: ${submission.moderatorName}`
            : ''
        }

        ${
          submission?.requestedChanges && submission.requestedChanges.length > 0
            ? `
        Requested Changes:
        ${submission.requestedChanges.map(change => `- ${change}`).join('\n')}
        `
            : ''
        }

        Please make the requested changes and resubmit your story. Once you've made the updates, our team will review it again promptly.

        Thank you for your patience and for helping us maintain quality in our database!

        ${
          submission?.githubIssueUrl
            ? `View moderation details: ${submission.githubIssueUrl}`
            : ''
        }
      `,
    };
  }
}

/**
 * Moderator Assignment Template
 */
class ModeratorAssignedTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const { submission, moderator, metadata } = data;

    return {
      subject: `New Submission Assigned: "${submission?.title}"`,
      htmlBody: `
        <h2>New Moderation Assignment</h2>
        <p>Hello ${moderator?.name},</p>
        <p>You've been assigned a new submission to review.</p>

        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196f3;">
          <h3>Assignment Details</h3>
          <p><strong>Title:</strong> ${submission?.title}</p>
          <p><strong>Fandom:</strong> ${submission?.fandomName || 'N/A'}</p>
          <p><strong>Priority:</strong> ${metadata?.priority || 'normal'}</p>
          <p><strong>Queue Position:</strong> #${
            submission?.queuePosition || 'TBD'
          }</p>
          <p><strong>Estimated Review Time:</strong> ${
            submission?.estimatedReviewTime || '2-3 business days'
          }</p>
          <p><strong>Assigned:</strong> ${this.formatDate(
            metadata?.timestamp || new Date()
          )}</p>
        </div>

        <p>Please review the submission according to our moderation guidelines and update the status when complete.</p>

        <p><a href="/admin/submissions/${
          submission?.id
        }" style="background-color: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Submission</a></p>
      `,
      textBody: `
        New Moderation Assignment

        Hello ${moderator?.name},

        You've been assigned a new submission to review.

        Assignment Details:
        - Title: ${submission?.title}
        - Fandom: ${submission?.fandomName || 'N/A'}
        - Priority: ${metadata?.priority || 'normal'}
        - Queue Position: #${submission?.queuePosition || 'TBD'}
        - Estimated Review Time: ${
          submission?.estimatedReviewTime || '2-3 business days'
        }
        - Assigned: ${this.formatDate(metadata?.timestamp || new Date())}

        Please review the submission according to our moderation guidelines and update the status when complete.

        View Submission: /admin/submissions/${submission?.id}
      `,
    };
  }
}

// Additional template classes would be implemented similarly...
class AdminNotificationTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    // Implementation for admin notifications
    return {
      subject: 'Admin Alert: System Notification',
      htmlBody: '<p>Admin notification content...</p>',
      textBody: 'Admin notification content...',
    };
  }
}

class QueueAlertTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    // Implementation for queue alerts
    return {
      subject: 'Queue Alert: Review Backlog',
      htmlBody: '<p>Queue alert content...</p>',
      textBody: 'Queue alert content...',
    };
  }
}

class WelcomeTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    // Implementation for welcome emails
    return {
      subject: 'Welcome to The Pensieve Index',
      htmlBody: '<p>Welcome content...</p>',
      textBody: 'Welcome content...',
    };
  }
}

class ReminderTemplate extends EmailTemplate {
  async compile(
    data: EmailTemplateData
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    // Implementation for reminder emails
    return {
      subject: 'Reminder: Pending Action Required',
      htmlBody: '<p>Reminder content...</p>',
      textBody: 'Reminder content...',
    };
  }
}

/**
 * Email Provider Interface
 */
interface EmailProvider {
  sendEmail(
    email: {
      to: string;
      subject: string;
      html: string;
      text: string;
      from: string;
      replyTo?: string;
    } & EmailOptions
  ): Promise<EmailDeliveryResult>;
}

/**
 * Default Email Provider (placeholder implementation)
 */
class DefaultEmailProvider implements EmailProvider {
  async sendEmail(
    email: {
      to: string;
      subject: string;
      html: string;
      text: string;
      from: string;
      replyTo?: string;
    } & EmailOptions
  ): Promise<EmailDeliveryResult> {
    // This would integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(
      `[Email Provider] Sending email: ${email.subject} to ${email.to}`
    );

    return {
      messageId: `msg-${Date.now()}-${Math.random()}`,
      status: 'sent',
      recipient: email.to,
      timestamp: new Date(),
      trackingId: email.trackOpening ? `track-${Date.now()}` : undefined,
    };
  }
}

/**
 * Email Delivery Tracker
 */
class EmailDeliveryTracker {
  async trackDelivery(delivery: {
    messageId: string;
    recipient: string;
    templateType: EmailTemplateType;
    status: 'sent' | 'queued' | 'failed' | 'rejected';
    timestamp: Date;
    trackingId?: string;
    error?: string;
  }): Promise<void> {
    // This would store delivery records in database
    console.log(
      `[Email Tracker] Tracking delivery: ${delivery.messageId} -> ${delivery.status}`
    );
  }

  async getStats(
    dateRange: { start: Date; end: Date },
    templateType?: EmailTemplateType
  ): Promise<{
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> {
    // This would query delivery statistics from database
    return {
      sent: 100,
      failed: 5,
      opened: 75,
      clicked: 25,
      bounced: 2,
    };
  }

  async getFailedDeliveries(filters: {
    templateType?: EmailTemplateType;
    recipient?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<
    Array<{
      messageId: string;
      recipient: string;
      templateType: EmailTemplateType;
      templateData: EmailTemplateData;
      error: string;
      timestamp: Date;
    }>
  > {
    // This would query failed deliveries from database
    return [];
  }
}
