/**
 * GitHub Webhook Handler
 *
 * Processes webhook events from GitHub issues to synchronize
 * submission status and trigger workflow actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGitHubClient } from './client';
import {
  updateSubmissionStatus,
  getSubmissionByGitHubIssue,
} from '../database/submissions';
import type {
  GitHubWebhookPayload,
  SubmissionStatus,
} from '@/types/submission';
import { SubmissionStatus as StatusEnum } from '@/types/submission';

/**
 * Webhook event handlers for different GitHub issue actions
 */
export class GitHubWebhookHandler {
  private gitHubClient = getGitHubClient();

  /**
   * Handle incoming webhook from GitHub
   */
  async handleWebhook(request: NextRequest): Promise<NextResponse> {
    try {
      // Parse and validate webhook payload
      const payload = await this.gitHubClient.parseWebhookPayload(request);

      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or unsupported webhook payload' },
          { status: 400 }
        );
      }

      // Process the webhook event
      await this.processWebhookEvent(payload);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      );
    }
  }

  /**
   * Process different types of webhook events
   */
  private async processWebhookEvent(
    payload: GitHubWebhookPayload
  ): Promise<void> {
    // Find the submission associated with this GitHub issue
    const submission = await getSubmissionByGitHubIssue(payload.issueNumber);

    if (!submission) {
      console.warn(
        `No submission found for GitHub issue #${payload.issueNumber}`
      );
      return;
    }

    console.log(
      `Processing webhook event: ${payload.action} for issue #${payload.issueNumber}`
    );

    switch (payload.action) {
      case 'opened':
        await this.handleIssueOpened(payload, submission.id);
        break;

      case 'closed':
        await this.handleIssueClosed(payload, submission.id);
        break;

      case 'labeled':
        await this.handleIssueLabeled(payload, submission.id);
        break;

      case 'unlabeled':
        await this.handleIssueUnlabeled(payload, submission.id);
        break;

      case 'assigned':
        await this.handleIssueAssigned(payload, submission.id);
        break;

      case 'edited':
        await this.handleIssueEdited(payload, submission.id);
        break;

      default:
        console.log(`Unhandled webhook action: ${payload.action as string}`);
    }
  }

  /**
   * Handle issue opened event
   */
  private async handleIssueOpened(
    payload: GitHubWebhookPayload,
    submissionId: string
  ): Promise<void> {
    console.log(`Issue opened for submission ${submissionId}`);

    // Update submission status to under review
    await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
      githubIssueNumber: payload.issueNumber,
      moderatorNotes: 'GitHub issue created and awaiting moderation',
    });
  }

  /**
   * Handle issue closed event
   */
  private async handleIssueClosed(
    payload: GitHubWebhookPayload,
    submissionId: string
  ): Promise<void> {
    console.log(`Issue closed for submission ${submissionId}`);

    // Determine final status based on labels
    const hasApprovedLabel = payload.labels.includes('approved');
    const hasRejectedLabel = payload.labels.includes('rejected');

    let finalStatus: SubmissionStatus;
    if (hasApprovedLabel) {
      finalStatus = StatusEnum.APPROVED;
    } else if (hasRejectedLabel) {
      finalStatus = StatusEnum.REJECTED;
    } else {
      finalStatus = StatusEnum.REJECTED; // Closed without explicit approval/rejection
    }

    await updateSubmissionStatus(submissionId, finalStatus, {
      moderatorNotes: `Issue closed via GitHub webhook. Final status: ${finalStatus}`,
    });
  }

  /**
   * Handle issue labeled event
   */
  private async handleIssueLabeled(
    payload: GitHubWebhookPayload,
    submissionId: string
  ): Promise<void> {
    console.log(
      `Issue labeled for submission ${submissionId}:`,
      payload.labels
    );

    // Check for specific status-changing labels
    if (payload.labels.includes('approved')) {
      await updateSubmissionStatus(submissionId, StatusEnum.APPROVED, {
        moderatorNotes: 'Approved via GitHub label',
      });
    } else if (payload.labels.includes('rejected')) {
      await updateSubmissionStatus(submissionId, StatusEnum.REJECTED, {
        moderatorNotes: 'Rejected via GitHub label',
      });
    } else if (payload.labels.includes('changes-requested')) {
      await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
        moderatorNotes: 'Changes requested via GitHub label',
      });
    } else if (payload.labels.includes('priority-high')) {
      await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
        moderatorNotes: 'Marked as high priority',
      });
    }
  }

  /**
   * Handle issue unlabeled event
   */
  private async handleIssueUnlabeled(
    payload: GitHubWebhookPayload,
    submissionId: string
  ): Promise<void> {
    console.log(
      `Issue unlabeled for submission ${submissionId}:`,
      payload.labels
    );

    // If approval label is removed, revert to under review
    if (
      !payload.labels.includes('approved') &&
      !payload.labels.includes('rejected')
    ) {
      await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
        moderatorNotes: 'Status reverted due to label removal',
      });
    }
  }

  /**
   * Handle issue assigned event
   */
  private async handleIssueAssigned(
    payload: GitHubWebhookPayload,
    submissionId: string
  ): Promise<void> {
    console.log(
      `Issue assigned for submission ${submissionId}:`,
      payload.assignees
    );

    const assigneesList = payload.assignees.join(', ');
    await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
      moderatorNotes: `Assigned to moderator(s): ${assigneesList}`,
    });
  }

  /**
   * Handle issue edited event
   */
  private async handleIssueEdited(
    payload: GitHubWebhookPayload,
    submissionId: string
  ): Promise<void> {
    console.log(`Issue edited for submission ${submissionId}`);

    // Could potentially parse updated submission data from issue body
    // For now, just log the event
    await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
      moderatorNotes: 'GitHub issue updated',
    });
  }
}

/**
 * Command parser for processing moderator commands in issue comments
 */
export class GitHubCommandParser {
  private gitHubClient = getGitHubClient();

  /**
   * Parse and execute commands from GitHub issue comments
   */
  async parseCommand(
    issueNumber: number,
    comment: string,
    author: string
  ): Promise<boolean> {
    const trimmedComment = comment.trim();

    if (!trimmedComment.startsWith('/')) {
      return false; // Not a command
    }

    const [command, ...args] = trimmedComment.split(' ');
    const submission = await getSubmissionByGitHubIssue(issueNumber);

    if (!submission) {
      console.warn(`No submission found for issue #${issueNumber}`);
      return false;
    }

    console.log(
      `Executing command: ${command} for submission ${submission.id}`
    );

    try {
      switch (command.toLowerCase()) {
        case '/approve':
          return await this.executeApproveCommand(
            submission.id,
            issueNumber,
            author,
            args
          );

        case '/approve-with-changes':
          return await this.executeApproveWithChangesCommand(
            submission.id,
            issueNumber,
            author,
            args
          );

        case '/reject':
          return await this.executeRejectCommand(
            submission.id,
            issueNumber,
            author,
            args
          );

        case '/request-changes':
          return await this.executeRequestChangesCommand(
            submission.id,
            issueNumber,
            author,
            args
          );

        case '/assign':
          return await this.executeAssignCommand(issueNumber, author, args);

        case '/add-label':
          return await this.executeAddLabelCommand(issueNumber, author, args);

        case '/remove-label':
          return await this.executeRemoveLabelCommand(
            issueNumber,
            author,
            args
          );

        case '/priority':
          return await this.executePriorityCommand(
            submission.id,
            issueNumber,
            author,
            args
          );

        default:
          console.warn(`Unknown command: ${command}`);
          return false;
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      await this.gitHubClient.addIssueComment(
        issueNumber,
        `❌ Error executing command \`${command}\`: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return false;
    }
  }

  /**
   * Execute /approve command
   */
  private async executeApproveCommand(
    submissionId: string,
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    const reason = args.length > 0 ? args.join(' ') : 'Approved by moderator';

    await updateSubmissionStatus(submissionId, StatusEnum.APPROVED, {
      moderatorNotes: `Approved by @${moderator}: ${reason}`,
      reviewedBy: moderator,
    });

    await this.gitHubClient.addIssueComment(
      issueNumber,
      `✅ **Submission Approved**\n\nApproved by @${moderator}\n\nReason: ${reason}\n\nThis story has been added to the database and is now available for discovery.`
    );

    // Close the issue
    await this.gitHubClient.closeSubmissionIssue(
      issueNumber,
      'Approved and added to database',
      'Thank you for your submission! 🎉'
    );

    return true;
  }

  /**
   * Execute /approve-with-changes command
   */
  private async executeApproveWithChangesCommand(
    submissionId: string,
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    const changes = args.join(' ');

    await updateSubmissionStatus(submissionId, StatusEnum.APPROVED, {
      moderatorNotes: `Approved with changes by @${moderator}: ${changes}`,
      reviewedBy: moderator,
    });

    await this.gitHubClient.addIssueComment(
      issueNumber,
      `✅ **Submission Approved with Changes**\n\nApproved by @${moderator}\n\nChanges made: ${changes}\n\nThis story has been added to the database with corrections.`
    );

    await this.gitHubClient.closeSubmissionIssue(
      issueNumber,
      'Approved with minor corrections'
    );

    return true;
  }

  /**
   * Execute /reject command
   */
  private async executeRejectCommand(
    submissionId: string,
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    const reason = args.length > 0 ? args.join(' ') : 'Rejected by moderator';

    await updateSubmissionStatus(submissionId, StatusEnum.REJECTED, {
      moderatorNotes: `Rejected by @${moderator}: ${reason}`,
      reviewedBy: moderator,
    });

    await this.gitHubClient.addIssueComment(
      issueNumber,
      `❌ **Submission Rejected**\n\nRejected by @${moderator}\n\nReason: ${reason}\n\nPlease review our submission guidelines and feel free to resubmit if you address the concerns.`
    );

    await this.gitHubClient.closeSubmissionIssue(
      issueNumber,
      'Rejected by moderator',
      'This submission has been rejected. See comments above for details.'
    );

    return true;
  }

  /**
   * Execute /request-changes command
   */
  private async executeRequestChangesCommand(
    submissionId: string,
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    const changes = args.join(' ');

    await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
      moderatorNotes: `Changes requested by @${moderator}: ${changes}`,
      reviewedBy: moderator,
    });

    await this.gitHubClient.addIssueComment(
      issueNumber,
      `📝 **Changes Requested**\n\nRequested by @${moderator}\n\nRequired changes: ${changes}\n\nPlease update your submission and resubmit through the browser extension.`
    );

    return true;
  }

  /**
   * Execute /assign command
   */
  private async executeAssignCommand(
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    if (args.length === 0) {
      throw new Error(
        'Please specify a username to assign (e.g., /assign @username)'
      );
    }

    const assignee = args[0].replace('@', '');

    // Note: This would require additional GitHub API permissions
    await this.gitHubClient.addIssueComment(
      issueNumber,
      `👥 **Assignment Request**\n\n@${moderator} requested assignment to @${assignee}\n\nPlease manually assign this issue in the GitHub interface.`
    );

    return true;
  }

  /**
   * Execute /add-label command
   */
  private async executeAddLabelCommand(
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    if (args.length === 0) {
      throw new Error(
        'Please specify a label to add (e.g., /add-label priority-high)'
      );
    }

    const label = args[0];

    await this.gitHubClient.addIssueComment(
      issueNumber,
      `🏷️ **Label Addition Request**\n\n@${moderator} requested adding label: \`${label}\`\n\nPlease manually add this label in the GitHub interface.`
    );

    return true;
  }

  /**
   * Execute /remove-label command
   */
  private async executeRemoveLabelCommand(
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    if (args.length === 0) {
      throw new Error(
        'Please specify a label to remove (e.g., /remove-label needs-review)'
      );
    }

    const label = args[0];

    await this.gitHubClient.addIssueComment(
      issueNumber,
      `🏷️ **Label Removal Request**\n\n@${moderator} requested removing label: \`${label}\`\n\nPlease manually remove this label in the GitHub interface.`
    );

    return true;
  }

  /**
   * Execute /priority command
   */
  private async executePriorityCommand(
    submissionId: string,
    issueNumber: number,
    moderator: string,
    args: string[]
  ): Promise<boolean> {
    const priority = args[0]?.toLowerCase() || 'normal';

    await updateSubmissionStatus(submissionId, StatusEnum.UNDER_REVIEW, {
      moderatorNotes: `Priority set to ${priority} by @${moderator}`,
    });

    await this.gitHubClient.addIssueComment(
      issueNumber,
      `⚡ **Priority Updated**\n\n@${moderator} set priority to: **${priority}**\n\nThis submission will be reviewed accordingly.`
    );

    return true;
  }
}

// Create singleton instances
export const webhookHandler = new GitHubWebhookHandler();
export const commandParser = new GitHubCommandParser();
