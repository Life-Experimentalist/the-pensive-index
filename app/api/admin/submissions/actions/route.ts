/**
 * Admin Moderation Actions API Route
 * Handles moderation actions on submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SubmissionService } from '../../../../src/lib/services/submission-service';
import { QueueService } from '../../../../src/lib/services/queue-service';
import { AdminUserModel } from '../../../../src/lib/admin/models/AdminUser';
import { EmailService } from '../../../../src/lib/notifications/email-service';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin permissions
    const adminUser = await AdminUserModel.getInstance().getByClerkId(userId);
    if (!adminUser || !adminUser.hasPermission('moderate_submissions')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const { action, submissionId, data } = await request.json();

    // Validate required fields
    if (!action || !submissionId) {
      return NextResponse.json(
        { error: 'Action and submission ID are required' },
        { status: 400 }
      );
    }

    // Initialize services
    const submissionService = new SubmissionService();
    const queueService = new QueueService();
    const emailService = new EmailService();

    // Get submission
    const submission = await submissionService.getSubmission(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case 'approve':
        result = await submissionService.approveSubmission(submissionId, {
          moderatorId: adminUser.id,
          approvalNote: data?.note,
          githubIssueNumber: submission.githubIssueNumber,
        });

        // Send approval email
        await emailService.sendNotification('submission_approved', {
          recipientEmail: submission.submitterEmail,
          templateData: {
            submissionId: submission.id,
            storyTitle: submission.storyTitle,
            storyUrl: submission.storyUrl,
            approvalNote: data?.note,
            moderatorName: adminUser.name,
            githubUrl: submission.githubIssueNumber
              ? `https://github.com/${process.env.GITHUB_REPO}/issues/${submission.githubIssueNumber}`
              : undefined,
          },
        });
        break;

      case 'reject':
        result = await submissionService.rejectSubmission(submissionId, {
          moderatorId: adminUser.id,
          rejectionReason: data?.reason,
          rejectionNote: data?.note,
          githubIssueNumber: submission.githubIssueNumber,
        });

        // Send rejection email
        await emailService.sendNotification('submission_rejected', {
          recipientEmail: submission.submitterEmail,
          templateData: {
            submissionId: submission.id,
            storyTitle: submission.storyTitle,
            storyUrl: submission.storyUrl,
            rejectionReason: data?.reason,
            rejectionNote: data?.note,
            moderatorName: adminUser.name,
            resubmissionAllowed: true,
            githubUrl: submission.githubIssueNumber
              ? `https://github.com/${process.env.GITHUB_REPO}/issues/${submission.githubIssueNumber}`
              : undefined,
          },
        });
        break;

      case 'request_changes':
        result = await submissionService.requestChanges(submissionId, {
          moderatorId: adminUser.id,
          requestedChanges: data?.changes,
          note: data?.note,
          githubIssueNumber: submission.githubIssueNumber,
        });

        // Send changes request email
        await emailService.sendNotification('changes_requested', {
          recipientEmail: submission.submitterEmail,
          templateData: {
            submissionId: submission.id,
            storyTitle: submission.storyTitle,
            storyUrl: submission.storyUrl,
            requestedChanges: data?.changes,
            note: data?.note,
            moderatorName: adminUser.name,
            githubUrl: submission.githubIssueNumber
              ? `https://github.com/${process.env.GITHUB_REPO}/issues/${submission.githubIssueNumber}`
              : undefined,
          },
        });
        break;

      case 'assign':
        const targetModeratorId = data?.moderatorId;
        if (!targetModeratorId) {
          return NextResponse.json(
            { error: 'Moderator ID is required for assignment' },
            { status: 400 }
          );
        }

        result = await queueService.assignModerator(
          submissionId,
          targetModeratorId,
          {
            assignedBy: adminUser.id,
            note: data?.note,
          }
        );

        // Get target moderator for notification
        const targetModerator = await AdminUserModel.getInstance().getById(
          targetModeratorId
        );
        if (targetModerator && targetModerator.email) {
          await emailService.sendNotification('moderator_assigned', {
            recipientEmail: targetModerator.email,
            templateData: {
              submissionId: submission.id,
              storyTitle: submission.storyTitle,
              storyUrl: submission.storyUrl,
              assignedByName: adminUser.name,
              priority: submission.priority || 'normal',
              estimatedTime: queueService.getEstimatedReviewTime(submission),
              githubUrl: submission.githubIssueNumber
                ? `https://github.com/${process.env.GITHUB_REPO}/issues/${submission.githubIssueNumber}`
                : undefined,
            },
          });
        }
        break;

      case 'unassign':
        result = await queueService.unassignModerator(submissionId, {
          unassignedBy: adminUser.id,
          reason: data?.reason,
        });
        break;

      case 'change_priority':
        const newPriority = data?.priority;
        if (!['low', 'normal', 'high', 'urgent'].includes(newPriority)) {
          return NextResponse.json(
            { error: 'Invalid priority level' },
            { status: 400 }
          );
        }

        result = await queueService.updatePriority(submissionId, newPriority, {
          changedBy: adminUser.id,
          reason: data?.reason,
        });
        break;

      case 'add_flag':
        const flagType = data?.flagType;
        if (!flagType) {
          return NextResponse.json(
            { error: 'Flag type is required' },
            { status: 400 }
          );
        }

        result = await submissionService.addFlag(submissionId, {
          type: flagType,
          reason: data?.reason,
          flaggedBy: adminUser.id,
        });
        break;

      case 'remove_flag':
        const flagId = data?.flagId;
        if (!flagId) {
          return NextResponse.json(
            { error: 'Flag ID is required' },
            { status: 400 }
          );
        }

        result = await submissionService.removeFlag(flagId, {
          removedBy: adminUser.id,
          reason: data?.reason,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update queue position and statistics
    await queueService.updateQueuePositions();

    return NextResponse.json({
      success: true,
      action,
      submissionId,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Moderation action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute moderation action' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Get available moderation actions for a user
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await AdminUserModel.getInstance().getByClerkId(userId);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    const availableActions = [];

    if (adminUser.hasPermission('moderate_submissions')) {
      availableActions.push('approve', 'reject', 'request_changes');
    }

    if (adminUser.hasPermission('assign_moderators')) {
      availableActions.push('assign', 'unassign');
    }

    if (adminUser.hasPermission('manage_queue')) {
      availableActions.push('change_priority', 'add_flag', 'remove_flag');
    }

    return NextResponse.json({
      availableActions,
      permissions: adminUser.permissions,
      moderatorId: adminUser.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
