/**
 * T036: GitHub Webhook Handler
 *
 * Processes GitHub webhook events for the community submission system
 * with signature validation, issue label processing, comment handling,
 * and submission status updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { headers } from 'next/headers';
import { SubmissionService } from '../../../src/lib/services/submission-service';
import { QueueService } from '../../../src/lib/services/queue-service';
import { EmailService } from '../../../src/lib/notifications/email-service';
import { AdminUserModel } from '../../../src/lib/admin/models/AdminUser';
import type {
  GitHubWebhookPayload,
  SubmissionStatus,
  ModerationActionType,
} from '../../../src/types/submission';

// GitHub webhook event types we handle
type GitHubEventType = 'issues' | 'issue_comment' | 'label' | 'ping';

// GitHub webhook action subtypes
type GitHubActionType =
  | 'opened'
  | 'closed'
  | 'labeled'
  | 'unlabeled'
  | 'edited'
  | 'created'
  | 'synchronize';

interface GitHubWebhookEvent {
  action: GitHubActionType;
  issue?: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    labels: Array<{
      id: number;
      name: string;
      color: string;
    }>;
    user: {
      login: string;
      id: number;
    };
    assignee?: {
      login: string;
      id: number;
    };
  };
  comment?: {
    id: number;
    body: string;
    user: {
      login: string;
      id: number;
    };
  };
  label?: {
    id: number;
    name: string;
    color: string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
  };
  sender: {
    login: string;
    id: number;
  };
}

/**
 * GitHub Webhook Handler Service
 */
class GitHubWebhookHandler {
  private submissionService: SubmissionService;
  private queueService: QueueService;
  private emailService: EmailService;

  constructor() {
    this.submissionService = new SubmissionService();
    this.queueService = new QueueService();
    this.emailService = new EmailService();
  }

  /**
   * Process GitHub webhook event
   */
  async processWebhookEvent(
    event: GitHubWebhookEvent,
    eventType: GitHubEventType
  ): Promise<void> {
    console.log(
      `[GitHub Webhook] Processing ${eventType} event with action: ${event.action}`
    );

    try {
      switch (eventType) {
        case 'issues':
          await this.handleIssueEvent(event);
          break;
        case 'issue_comment':
          await this.handleCommentEvent(event);
          break;
        case 'label':
          await this.handleLabelEvent(event);
          break;
        case 'ping':
          console.log(
            '[GitHub Webhook] Ping event received - webhook is active'
          );
          break;
        default:
          console.log(`[GitHub Webhook] Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      console.error(
        `[GitHub Webhook] Error processing ${eventType} event:`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle GitHub issue events (opened, closed, labeled, unlabeled, etc.)
   */
  private async handleIssueEvent(event: GitHubWebhookEvent): Promise<void> {
    if (!event.issue) {
      console.warn('[GitHub Webhook] Issue event received without issue data');
      return;
    }

    const issue = event.issue;
    const submissionId = await this.extractSubmissionId(issue);

    if (!submissionId) {
      console.log(
        '[GitHub Webhook] Issue does not appear to be related to a submission'
      );
      return;
    }

    console.log(
      `[GitHub Webhook] Processing issue event for submission: ${submissionId}`
    );

    switch (event.action) {
      case 'labeled':
        await this.handleIssueLabelAdded(
          submissionId,
          issue,
          event.label?.name
        );
        break;
      case 'unlabeled':
        await this.handleIssueLabelRemoved(
          submissionId,
          issue,
          event.label?.name
        );
        break;
      case 'closed':
        await this.handleIssueClosed(submissionId, issue);
        break;
      case 'opened':
        await this.handleIssueOpened(submissionId, issue);
        break;
      case 'edited':
        await this.handleIssueEdited(submissionId, issue);
        break;
      default:
        console.log(`[GitHub Webhook] Unhandled issue action: ${event.action}`);
    }
  }

  /**
   * Handle GitHub issue comment events
   */
  private async handleCommentEvent(event: GitHubWebhookEvent): Promise<void> {
    if (!event.issue || !event.comment) {
      console.warn(
        '[GitHub Webhook] Comment event received without issue or comment data'
      );
      return;
    }

    const issue = event.issue;
    const comment = event.comment;
    const submissionId = await this.extractSubmissionId(issue);

    if (!submissionId) {
      console.log('[GitHub Webhook] Comment on non-submission issue');
      return;
    }

    console.log(
      `[GitHub Webhook] Processing comment event for submission: ${submissionId}`
    );

    switch (event.action) {
      case 'created':
        await this.handleCommentAdded(
          submissionId,
          issue,
          comment,
          event.sender
        );
        break;
      default:
        console.log(
          `[GitHub Webhook] Unhandled comment action: ${event.action}`
        );
    }
  }

  /**
   * Handle GitHub label events (not commonly used but included for completeness)
   */
  private async handleLabelEvent(event: GitHubWebhookEvent): Promise<void> {
    console.log(
      `[GitHub Webhook] Label event: ${event.action} for label: ${event.label?.name}`
    );
    // Label events are handled through issue events, so this is mainly for logging
  }

  /**
   * Handle when a label is added to a submission issue
   */
  private async handleIssueLabelAdded(
    submissionId: string,
    issue: GitHubWebhookEvent['issue'],
    labelName?: string
  ): Promise<void> {
    if (!labelName || !issue) return;

    console.log(
      `[GitHub Webhook] Label added: ${labelName} to submission: ${submissionId}`
    );

    // Handle moderation decision labels
    const moderationDecisions = {
      'status:approved': 'approved' as SubmissionStatus,
      'status:rejected': 'rejected' as SubmissionStatus,
      'status:changes-requested': 'changes_requested' as SubmissionStatus,
      approved: 'approved' as SubmissionStatus,
      rejected: 'rejected' as SubmissionStatus,
      'changes-requested': 'changes_requested' as SubmissionStatus,
    };

    const newStatus = moderationDecisions[labelName];
    if (newStatus) {
      await this.updateSubmissionStatus(
        submissionId,
        newStatus,
        issue,
        labelName
      );
      return;
    }

    // Handle priority changes
    if (labelName.startsWith('priority:')) {
      const priority = labelName.replace('priority:', '') as
        | 'low'
        | 'normal'
        | 'high'
        | 'urgent';
      await this.updateSubmissionPriority(submissionId, priority);
      return;
    }

    // Handle assignment labels
    if (labelName === 'assigned' || labelName.startsWith('assigned:')) {
      await this.handleAssignmentLabel(submissionId, issue, labelName);
      return;
    }

    // Handle quality labels
    if (labelName.startsWith('quality:')) {
      const quality = labelName.replace('quality:', '');
      await this.recordQualityAssessment(submissionId, quality);
      return;
    }

    // Log other label additions for audit purposes
    await this.logModerationAction(submissionId, 'label-added', {
      labelName,
      issueNumber: issue.number,
      actor: issue.assignee?.login || 'system',
    });
  }

  /**
   * Handle when a label is removed from a submission issue
   */
  private async handleIssueLabelRemoved(
    submissionId: string,
    issue: GitHubWebhookEvent['issue'],
    labelName?: string
  ): Promise<void> {
    if (!labelName || !issue) return;

    console.log(
      `[GitHub Webhook] Label removed: ${labelName} from submission: ${submissionId}`
    );

    // Handle status label removal (might indicate status change reversal)
    if (
      labelName.startsWith('status:') ||
      ['approved', 'rejected', 'changes-requested'].includes(labelName)
    ) {
      // If a final status label is removed, revert to under-review
      const currentSubmission = await this.submissionService.getSubmissionById(
        submissionId
      );
      if (currentSubmission?.status !== 'pending') {
        await this.updateSubmissionStatus(
          submissionId,
          'under_review',
          issue,
          `${labelName}-removed`
        );
      }
      return;
    }

    // Log label removal for audit purposes
    await this.logModerationAction(submissionId, 'label-removed', {
      labelName,
      issueNumber: issue.number,
      actor: issue.assignee?.login || 'system',
    });
  }

  /**
   * Handle when a submission issue is closed
   */
  private async handleIssueClosed(
    submissionId: string,
    issue: GitHubWebhookEvent['issue']
  ): Promise<void> {
    if (!issue) return;

    console.log(
      `[GitHub Webhook] Issue closed for submission: ${submissionId}`
    );

    // Check if issue was closed with a resolution label
    const labels = issue.labels.map(l => l.name);
    const hasApprovalLabel = labels.some(l =>
      ['approved', 'status:approved'].includes(l)
    );
    const hasRejectionLabel = labels.some(l =>
      ['rejected', 'status:rejected'].includes(l)
    );

    // Update submission status based on closure reason
    let finalStatus: SubmissionStatus;
    if (hasApprovalLabel) {
      finalStatus = 'approved';
    } else if (hasRejectionLabel) {
      finalStatus = 'rejected';
    } else {
      // Issue closed without clear resolution - mark as abandoned
      finalStatus = 'rejected';
    }

    await this.updateSubmissionStatus(
      submissionId,
      finalStatus,
      issue,
      'issue-closed'
    );

    // Complete any pending queue entries
    const queueEntry = await this.queueService.getQueueEntryBySubmissionId(
      submissionId
    );
    if (queueEntry) {
      await this.queueService.completeQueueEntry(queueEntry.id, {
        completedBy: issue.assignee?.login || 'system',
        completionReason: 'GitHub issue closed',
        finalStatus,
      });
    }
  }

  /**
   * Handle when a submission issue is opened (usually automatic, but could be reopened)
   */
  private async handleIssueOpened(
    submissionId: string,
    issue: GitHubWebhookEvent['issue']
  ): Promise<void> {
    if (!issue) return;

    console.log(
      `[GitHub Webhook] Issue opened for submission: ${submissionId}`
    );

    // If this is a reopened issue, reset status to under review
    const currentSubmission = await this.submissionService.getSubmissionById(
      submissionId
    );
    if (
      currentSubmission?.status &&
      ['approved', 'rejected'].includes(currentSubmission.status)
    ) {
      await this.updateSubmissionStatus(
        submissionId,
        'under_review',
        issue,
        'issue-reopened'
      );
    }

    await this.logModerationAction(submissionId, 'issue-opened', {
      issueNumber: issue.number,
      actor: 'system',
    });
  }

  /**
   * Handle when a submission issue is edited
   */
  private async handleIssueEdited(
    submissionId: string,
    issue: GitHubWebhookEvent['issue']
  ): Promise<void> {
    if (!issue) return;

    console.log(
      `[GitHub Webhook] Issue edited for submission: ${submissionId}`
    );

    // Parse updated issue body for any metadata changes
    const updatedMetadata = await this.parseIssueBody(issue.body);
    if (updatedMetadata) {
      await this.submissionService.updateSubmissionMetadata(
        submissionId,
        updatedMetadata
      );
    }

    await this.logModerationAction(submissionId, 'issue-edited', {
      issueNumber: issue.number,
      actor: 'system',
    });
  }

  /**
   * Handle when a comment is added to a submission issue
   */
  private async handleCommentAdded(
    submissionId: string,
    issue: GitHubWebhookEvent['issue'],
    comment: GitHubWebhookEvent['comment'],
    sender: GitHubWebhookEvent['sender']
  ): Promise<void> {
    if (!issue || !comment) return;

    console.log(
      `[GitHub Webhook] Comment added to submission: ${submissionId} by: ${sender.login}`
    );

    // Check if comment contains moderation commands
    const commands = this.extractModerationCommands(comment.body);
    for (const command of commands) {
      await this.processModerationCommand(
        submissionId,
        command,
        sender.login,
        issue
      );
    }

    // Check if this is a moderator providing feedback
    const isModeratorComment = await this.isUserModerator(sender.login);
    if (isModeratorComment) {
      await this.handleModeratorComment(submissionId, comment, sender, issue);
    }

    await this.logModerationAction(submissionId, 'comment-added', {
      commentId: comment.id,
      issueNumber: issue.number,
      actor: sender.login,
      commentPreview: comment.body.substring(0, 100),
    });
  }

  /**
   * Update submission status and notify relevant parties
   */
  private async updateSubmissionStatus(
    submissionId: string,
    newStatus: SubmissionStatus,
    issue: GitHubWebhookEvent['issue'],
    reason: string
  ): Promise<void> {
    try {
      console.log(
        `[GitHub Webhook] Updating submission ${submissionId} status to: ${newStatus}`
      );

      const submission = await this.submissionService.updateSubmissionStatus(
        submissionId,
        newStatus,
        {
          reason,
          actor: issue?.assignee?.login || 'system',
          githubIssueNumber: issue?.number,
          timestamp: new Date(),
        }
      );

      if (!submission) {
        console.error(
          `[GitHub Webhook] Failed to update submission status: submission not found`
        );
        return;
      }

      // Send notification emails based on status change
      await this.sendStatusChangeNotification(submission, newStatus, reason);

      // Update queue status
      const queueEntry = await this.queueService.getQueueEntryBySubmissionId(
        submissionId
      );
      if (queueEntry && ['approved', 'rejected'].includes(newStatus)) {
        await this.queueService.completeQueueEntry(queueEntry.id, {
          completedBy: issue?.assignee?.login || 'system',
          completionReason: reason,
          finalStatus: newStatus,
        });
      }
    } catch (error) {
      console.error(
        `[GitHub Webhook] Error updating submission status:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update submission priority in the queue
   */
  private async updateSubmissionPriority(
    submissionId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ): Promise<void> {
    try {
      const queueEntry = await this.queueService.getQueueEntryBySubmissionId(
        submissionId
      );
      if (queueEntry) {
        await this.queueService.updateQueuePriority(queueEntry.id, priority);
        console.log(
          `[GitHub Webhook] Updated submission ${submissionId} priority to: ${priority}`
        );
      }
    } catch (error) {
      console.error(
        `[GitHub Webhook] Error updating submission priority:`,
        error
      );
    }
  }

  /**
   * Handle assignment label changes
   */
  private async handleAssignmentLabel(
    submissionId: string,
    issue: GitHubWebhookEvent['issue'],
    labelName: string
  ): Promise<void> {
    if (!issue) return;

    try {
      const assigneeLogin = issue.assignee?.login;
      if (assigneeLogin && labelName === 'assigned') {
        // Assign moderator to submission
        const adminUser =
          await AdminUserModel.getInstance().getByGitHubUsername(assigneeLogin);
        if (adminUser) {
          await this.queueService.assignModerator(
            submissionId,
            adminUser.id,
            'github-webhook'
          );
          console.log(
            `[GitHub Webhook] Assigned moderator ${assigneeLogin} to submission ${submissionId}`
          );
        }
      }
    } catch (error) {
      console.error(`[GitHub Webhook] Error handling assignment:`, error);
    }
  }

  /**
   * Record quality assessment from labels
   */
  private async recordQualityAssessment(
    submissionId: string,
    quality: string
  ): Promise<void> {
    try {
      const qualityScores = {
        low: 30,
        medium: 70,
        high: 90,
      };

      const score = qualityScores[quality as keyof typeof qualityScores];
      if (score) {
        await this.submissionService.updateQualityScore(submissionId, score, {
          source: 'github-label',
          assessor: 'moderator',
          timestamp: new Date(),
        });
        console.log(
          `[GitHub Webhook] Recorded quality assessment for ${submissionId}: ${quality} (${score})`
        );
      }
    } catch (error) {
      console.error(
        `[GitHub Webhook] Error recording quality assessment:`,
        error
      );
    }
  }

  /**
   * Extract moderation commands from comment text
   */
  private extractModerationCommands(
    commentBody: string
  ): Array<{ command: string; args: string[] }> {
    const commands: Array<{ command: string; args: string[] }> = [];
    const commandRegex = /\/(\w+)(?:\s+(.+))?/g;

    let match;
    while ((match = commandRegex.exec(commentBody)) !== null) {
      const command = match[1].toLowerCase();
      const args = match[2] ? match[2].split(/\s+/) : [];
      commands.push({ command, args });
    }

    return commands;
  }

  /**
   * Process moderation commands from comments
   */
  private async processM(
    submissionId: string,
    command: { command: string; args: string[] },
    actor: string,
    issue: GitHubWebhookEvent['issue']
  ): Promise<void> {
    if (!issue) return;

    console.log(
      `[GitHub Webhook] Processing command: /${
        command.command
      } ${command.args.join(' ')}`
    );

    try {
      switch (command.command) {
        case 'approve':
          await this.updateSubmissionStatus(
            submissionId,
            'approved',
            issue,
            'moderator-command'
          );
          break;
        case 'reject':
          const reason = command.args.join(' ') || 'Rejected by moderator';
          await this.submissionService.updateRejectionReason(
            submissionId,
            reason
          );
          await this.updateSubmissionStatus(
            submissionId,
            'rejected',
            issue,
            'moderator-command'
          );
          break;
        case 'changes':
        case 'request-changes':
          await this.updateSubmissionStatus(
            submissionId,
            'changes_requested',
            issue,
            'moderator-command'
          );
          break;
        case 'priority':
          if (command.args.length > 0) {
            const priority = command.args[0] as
              | 'low'
              | 'normal'
              | 'high'
              | 'urgent';
            await this.updateSubmissionPriority(submissionId, priority);
          }
          break;
        case 'assign':
          if (command.args.length > 0) {
            const moderatorUsername = command.args[0];
            const adminUser =
              await AdminUserModel.getInstance().getByGitHubUsername(
                moderatorUsername
              );
            if (adminUser) {
              await this.queueService.assignModerator(
                submissionId,
                adminUser.id,
                'command'
              );
            }
          }
          break;
        default:
          console.log(
            `[GitHub Webhook] Unknown moderation command: ${command.command}`
          );
      }
    } catch (error) {
      console.error(
        `[GitHub Webhook] Error processing moderation command:`,
        error
      );
    }
  }

  /**
   * Handle comments from moderators
   */
  private async handleModeratorComment(
    submissionId: string,
    comment: GitHubWebhookEvent['comment'],
    sender: GitHubWebhookEvent['sender'],
    issue: GitHubWebhookEvent['issue']
  ): Promise<void> {
    if (!comment || !issue) return;

    // Record moderator feedback
    await this.submissionService.addModeratorFeedback(submissionId, {
      moderatorId: sender.login,
      feedback: comment.body,
      timestamp: new Date(),
      githubCommentId: comment.id,
    });

    console.log(
      `[GitHub Webhook] Recorded moderator feedback from ${sender.login} for submission ${submissionId}`
    );
  }

  /**
   * Send status change notification emails
   */
  private async sendStatusChangeNotification(
    submission: any,
    newStatus: SubmissionStatus,
    reason: string
  ): Promise<void> {
    try {
      switch (newStatus) {
        case 'approved':
          await this.emailService.sendApprovalNotification(submission, {
            reason,
            approvalDate: new Date(),
          });
          break;
        case 'rejected':
          await this.emailService.sendRejectionNotification(submission, {
            reason,
            rejectionDate: new Date(),
          });
          break;
        case 'changes_requested':
          await this.emailService.sendChangesRequestedNotification(submission, {
            reason,
            requestDate: new Date(),
          });
          break;
      }
    } catch (error) {
      console.error(
        `[GitHub Webhook] Error sending notification email:`,
        error
      );
      // Don't throw - email failures shouldn't break webhook processing
    }
  }

  /**
   * Log moderation actions for audit trail
   */
  private async logModerationAction(
    submissionId: string,
    actionType: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await this.submissionService.logModerationAction(submissionId, {
        actionType: actionType as ModerationActionType,
        actionDetails: details,
        timestamp: new Date(),
        source: 'github-webhook',
      });
    } catch (error) {
      console.error(`[GitHub Webhook] Error logging moderation action:`, error);
      // Don't throw - logging failures shouldn't break webhook processing
    }
  }

  /**
   * Extract submission ID from GitHub issue
   */
  private async extractSubmissionId(
    issue: GitHubWebhookEvent['issue']
  ): Promise<string | null> {
    if (!issue) return null;

    // Try to extract from YAML frontmatter in issue body
    const yamlMatch = issue.body.match(/---\n([\s\S]*?)\n---/);
    if (yamlMatch) {
      const yamlContent = yamlMatch[1];
      const submissionIdMatch = yamlContent.match(
        /submission_id:\s*"?([^"\n]+)"?/
      );
      if (submissionIdMatch) {
        return submissionIdMatch[1];
      }
    }

    // Try to extract from issue title or labels
    const titleMatch = issue.title.match(/\[([A-Z0-9-]+)\]/);
    if (titleMatch) {
      // Check if this looks like a submission ID
      const potentialId = titleMatch[1];
      if (
        potentialId.startsWith('SUB-') ||
        potentialId.match(/^[a-f0-9-]{36}$/)
      ) {
        return potentialId;
      }
    }

    return null;
  }

  /**
   * Parse issue body for metadata updates
   */
  private async parseIssueBody(
    issueBody: string
  ): Promise<Record<string, any> | null> {
    try {
      // Extract YAML frontmatter
      const yamlMatch = issueBody.match(/---\n([\s\S]*?)\n---/);
      if (!yamlMatch) return null;

      const yamlContent = yamlMatch[1];
      const metadata: Record<string, any> = {};

      // Simple YAML parsing for key fields
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
        if (match) {
          const [, key, value] = match;
          metadata[key] = value;
        }
      }

      return Object.keys(metadata).length > 0 ? metadata : null;
    } catch (error) {
      console.error('[GitHub Webhook] Error parsing issue body:', error);
      return null;
    }
  }

  /**
   * Check if user is a moderator
   */
  private async isUserModerator(githubUsername: string): Promise<boolean> {
    try {
      const adminUser = await AdminUserModel.getInstance().getByGitHubUsername(
        githubUsername
      );
      return adminUser !== null;
    } catch (error) {
      console.error('[GitHub Webhook] Error checking moderator status:', error);
      return false;
    }
  }
}

/**
 * Webhook signature validation
 */
function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  const actualSignature = signature.slice(7); // Remove 'sha256=' prefix

  if (expectedSignature.length !== actualSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(actualSignature, 'hex')
  );
}

/**
 * POST handler for GitHub webhooks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[GitHub Webhook] Received webhook request');

    // Get headers
    const headersList = headers();
    const githubEvent = headersList.get('x-github-event') as GitHubEventType;
    const githubSignature = headersList.get('x-github-signature-256');
    const githubDelivery = headersList.get('x-github-delivery');

    if (!githubEvent) {
      console.error('[GitHub Webhook] Missing X-GitHub-Event header');
      return NextResponse.json(
        { error: 'Missing X-GitHub-Event header' },
        { status: 400 }
      );
    }

    // Read request body
    const payload = await request.text();

    // Validate webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && githubSignature) {
      const isValidSignature = validateWebhookSignature(
        payload,
        githubSignature,
        webhookSecret
      );
      if (!isValidSignature) {
        console.error('[GitHub Webhook] Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error(
        '[GitHub Webhook] Webhook signature validation required in production'
      );
      return NextResponse.json(
        { error: 'Webhook signature required' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let webhookEvent: GitHubWebhookEvent;
    try {
      webhookEvent = JSON.parse(payload) as GitHubWebhookEvent;
    } catch (error) {
      console.error('[GitHub Webhook] Invalid JSON payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Process the webhook event
    const webhookHandler = new GitHubWebhookHandler();
    await webhookHandler.processWebhookEvent(webhookEvent, githubEvent);

    console.log(
      `[GitHub Webhook] Successfully processed ${githubEvent} event (delivery: ${githubDelivery})`
    );

    return NextResponse.json({
      success: true,
      eventType: githubEvent,
      action: webhookEvent.action,
      deliveryId: githubDelivery,
    });
  } catch (error) {
    console.error('[GitHub Webhook] Error processing webhook:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - webhook endpoint info (for testing/debugging)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: 'GitHub Webhook Handler',
    version: '1.0.0',
    status: 'active',
    supportedEvents: ['issues', 'issue_comment', 'label', 'ping'],
    environment: process.env.NODE_ENV,
    signatureValidation: !!process.env.GITHUB_WEBHOOK_SECRET,
  });
}
