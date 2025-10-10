/**
 * T033: Admin Review API Endpoint
 *
 * POST /api/v1/admin/submissions/{id}/review - Complete moderation review
 *
 * This endpoint handles the final moderation decision with:
 * - Approval, rejection, change request processing
 * - GitHub issue label management
 * - Database integration for approved stories
 * - Email notification to submitters
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import { SubmissionService } from '@/lib/services/submission-service';
import { QueueService } from '@/lib/services/queue-service';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';
import { GitHubService } from '@/lib/github/github-service';
import { EmailService } from '@/lib/notifications/email-service';
import { DatabaseService } from '@/lib/database/database-service';
import { ModerationAction, SubmissionStatus } from '@/types/submission';

// Request validation schema
const reviewRequestSchema = z.object({
  decision: z.enum(['approve', 'reject', 'request_changes']),
  reviewNotes: z.string().min(1).max(2000),

  // For approval - story integration data
  storyData: z
    .object({
      title: z.string().min(1).max(200),
      author: z.string().min(1).max(100),
      summary: z.string().max(1000),
      tags: z.array(z.string()).min(1),
      wordCount: z.number().min(1).optional(),
      chapterCount: z.number().min(1).optional(),
      completionStatus: z
        .enum(['complete', 'incomplete', 'oneshot'])
        .optional(),
      rating: z.enum(['general', 'teen', 'mature', 'explicit']).optional(),
      warnings: z.array(z.string()).optional(),
    })
    .optional(),

  // For rejection/changes - feedback details
  feedbackDetails: z
    .object({
      issues: z
        .array(
          z.object({
            category: z.enum([
              'metadata',
              'tags',
              'content',
              'formatting',
              'duplicate',
              'policy',
            ]),
            description: z.string().min(1).max(500),
            severity: z.enum(['minor', 'major', 'critical']),
          })
        )
        .min(1),
      suggestedActions: z.array(z.string()).optional(),
      resubmissionAllowed: z.boolean().default(true),
    })
    .optional(),

  // GitHub integration
  updateGitHubIssue: z.boolean().default(true),
  closeGitHubIssue: z.boolean().default(false),

  // Notifications
  notifySubmitter: z.boolean().default(true),

  // Quality assessment
  qualityScore: z.number().min(0).max(100).optional(),
  complexityRating: z
    .enum(['simple', 'moderate', 'complex', 'expert'])
    .optional(),
});

type ReviewRequest = z.infer<typeof reviewRequestSchema>;

// Initialize services
const submissionService = new SubmissionService();
const queueService = new QueueService();
const adminModel = AdminUserModel.getInstance();
const permissionValidator = PermissionValidator.getInstance();
const githubService = new GitHubService();
const emailService = new EmailService();
const databaseService = new DatabaseService();

/**
 * POST /api/v1/admin/submissions/{id}/review
 * Complete moderation review with decision processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Extract submission ID from params
    const submissionId = params.id;
    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let reviewData: ReviewRequest;
    try {
      const body = await request.json();
      reviewData = reviewRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Get admin user information
    const adminUser = await adminModel.getByClerkId(userId);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Get submission details
    const submission = await submissionService.getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check if submission is in reviewable state
    if (!['under_review', 'pending'].includes(submission.status)) {
      return NextResponse.json(
        {
          error: 'Invalid submission state',
          details: `Submission status '${submission.status}' cannot be reviewed`,
        },
        { status: 409 }
      );
    }

    // Check if user has permission to review submissions in this fandom
    const canReview = await permissionValidator.hasPermission(
      userId,
      'review_submissions',
      submission.fandomId
    );

    if (!canReview) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          details:
            'You do not have permission to review submissions in this fandom',
        },
        { status: 403 }
      );
    }

    // Validate decision-specific requirements
    if (reviewData.decision === 'approve' && !reviewData.storyData) {
      return NextResponse.json(
        {
          error: 'Missing story data',
          details: 'Story data is required for approval',
        },
        { status: 400 }
      );
    }

    if (
      ['reject', 'request_changes'].includes(reviewData.decision) &&
      !reviewData.feedbackDetails
    ) {
      return NextResponse.json(
        {
          error: 'Missing feedback details',
          details:
            'Feedback details are required for rejection or change requests',
        },
        { status: 400 }
      );
    }

    // Get queue entry for completion tracking
    const queueEntry = await queueService.getQueueEntryBySubmissionId(
      submissionId
    );

    // Start transaction for atomic operations
    const transactionResult = await databaseService.transaction(async tx => {
      let newStatus: SubmissionStatus;
      let storyId: string | null = null;

      // Process based on decision
      switch (reviewData.decision) {
        case 'approve':
          newStatus = 'approved';

          // Create story entry in main database
          if (reviewData.storyData) {
            storyId = await databaseService.createStory(
              {
                ...reviewData.storyData,
                fandomId: submission.fandomId,
                url: submission.storyUrl || '',
                submissionId: submissionId,
                moderatedBy: userId,
                qualityScore: reviewData.qualityScore,
                addedAt: new Date().toISOString(),
              },
              tx
            );
          }
          break;

        case 'reject':
          newStatus = 'rejected';
          break;

        case 'request_changes':
          newStatus = 'changes_requested';
          break;

        default:
          throw new Error(`Invalid decision: ${reviewData.decision}`);
      }

      // Update submission status
      await submissionService.updateSubmissionStatus(
        submissionId,
        newStatus,
        {
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          reviewNotes: reviewData.reviewNotes,
          storyId: storyId,
          qualityScore: reviewData.qualityScore,
          complexityRating: reviewData.complexityRating,
        },
        tx
      );

      // Complete queue entry
      if (queueEntry) {
        await queueService.completeQueueEntry(
          queueEntry.id,
          {
            completedBy: userId,
            completedAt: new Date().toISOString(),
            decision: reviewData.decision,
            reviewTime:
              Date.now() -
              new Date(queueEntry.assignedAt || queueEntry.queuedAt).getTime(),
          },
          tx
        );
      }

      // Log moderation action
      const moderationAction: Omit<ModerationAction, 'id' | 'createdAt'> = {
        submissionId: submissionId,
        moderatorId: userId,
        action: reviewData.decision,
        details: {
          reviewNotes: reviewData.reviewNotes,
          storyId: storyId,
          qualityScore: reviewData.qualityScore,
          complexityRating: reviewData.complexityRating,
          feedbackDetails: reviewData.feedbackDetails,
        },
        fandomId: submission.fandomId,
      };

      await submissionService.logModerationAction(moderationAction, tx);

      return { newStatus, storyId };
    });

    // Update GitHub issue if requested
    if (reviewData.updateGitHubIssue && submission.githubIssueNumber) {
      try {
        let labelToAdd: string;
        let commentBody: string;

        switch (reviewData.decision) {
          case 'approve':
            labelToAdd = 'approved';
            commentBody = `✅ **Story Approved**\n\n${reviewData.reviewNotes}\n\n`;
            if (transactionResult.storyId) {
              commentBody += `Story ID: \`${transactionResult.storyId}\`\n`;
              commentBody += `Added to database successfully.`;
            }
            break;

          case 'reject':
            labelToAdd = 'rejected';
            commentBody = `❌ **Submission Rejected**\n\n${reviewData.reviewNotes}\n\n`;
            if (reviewData.feedbackDetails) {
              commentBody += `**Issues found:**\n`;
              reviewData.feedbackDetails.issues.forEach((issue, index) => {
                commentBody += `${index + 1}. **${issue.category}** (${
                  issue.severity
                }): ${issue.description}\n`;
              });
            }
            break;

          case 'request_changes':
            labelToAdd = 'changes-requested';
            commentBody = `🔄 **Changes Requested**\n\n${reviewData.reviewNotes}\n\n`;
            if (reviewData.feedbackDetails) {
              commentBody += `**Required changes:**\n`;
              reviewData.feedbackDetails.issues.forEach((issue, index) => {
                commentBody += `${index + 1}. **${issue.category}**: ${
                  issue.description
                }\n`;
              });

              if (reviewData.feedbackDetails.suggestedActions?.length) {
                commentBody += `\n**Suggested actions:**\n`;
                reviewData.feedbackDetails.suggestedActions.forEach(
                  (action, index) => {
                    commentBody += `${index + 1}. ${action}\n`;
                  }
                );
              }

              if (reviewData.feedbackDetails.resubmissionAllowed) {
                commentBody += `\n*You may resubmit this story after making the requested changes.*`;
              }
            }
            break;

          default:
            throw new Error('Invalid decision for GitHub update');
        }

        // Add label and comment
        await githubService.addIssueLabel(
          submission.githubIssueNumber,
          labelToAdd
        );
        await githubService.addIssueComment(
          submission.githubIssueNumber,
          commentBody
        );

        // Close issue if requested
        if (reviewData.closeGitHubIssue) {
          await githubService.closeIssue(submission.githubIssueNumber);
        }
      } catch (githubError) {
        console.error('Failed to update GitHub issue:', githubError);
        // Don't fail the review if GitHub fails
      }
    }

    // Send notification to submitter if requested
    if (reviewData.notifySubmitter && submission.submitterEmail) {
      try {
        switch (reviewData.decision) {
          case 'approve':
            await emailService.sendApprovalNotification({
              submitterEmail: submission.submitterEmail,
              submissionId: submissionId,
              storyTitle: submission.title || 'Your story',
              reviewNotes: reviewData.reviewNotes,
              storyId: transactionResult.storyId,
              browseUrl: transactionResult.storyId
                ? `${process.env.NEXT_PUBLIC_APP_URL}/fandom/${submission.fandomSlug}`
                : undefined,
            });
            break;

          case 'reject':
            await emailService.sendRejectionNotification({
              submitterEmail: submission.submitterEmail,
              submissionId: submissionId,
              storyTitle: submission.title || 'Your submission',
              reviewNotes: reviewData.reviewNotes,
              feedbackDetails: reviewData.feedbackDetails,
            });
            break;

          case 'request_changes':
            await emailService.sendChangesRequestedNotification({
              submitterEmail: submission.submitterEmail,
              submissionId: submissionId,
              storyTitle: submission.title || 'Your submission',
              reviewNotes: reviewData.reviewNotes,
              feedbackDetails: reviewData.feedbackDetails,
              resubmitUrl: reviewData.feedbackDetails?.resubmissionAllowed
                ? `${process.env.NEXT_PUBLIC_APP_URL}/submit?resubmit=${submissionId}`
                : undefined,
            });
            break;
        }
      } catch (emailError) {
        console.error('Failed to send review notification:', emailError);
        // Don't fail the review if email fails
      }
    }

    // Get updated queue statistics for response
    const queueStats = await queueService.getQueueStatistics(
      submission.fandomId
    );
    const moderatorStats = await queueService.getModeratorStats(userId);

    // Prepare success response
    const response = {
      success: true,
      data: {
        review: {
          submissionId: submissionId,
          decision: reviewData.decision,
          newStatus: transactionResult.newStatus,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          reviewNotes: reviewData.reviewNotes,
          storyId: transactionResult.storyId,
          qualityScore: reviewData.qualityScore,
          complexityRating: reviewData.complexityRating,
        },
        queueImpact: {
          fandomId: submission.fandomId,
          totalPending: queueStats.totalPending,
          totalAssigned: queueStats.totalAssigned - 1, // One less assigned after completion
          completedToday: queueStats.completedToday + 1,
          averageReviewTime: queueStats.averageReviewTime,
        },
        moderatorMetrics: {
          reviewsCompletedToday: moderatorStats.reviewsCompletedToday + 1,
          reviewsCompletedThisWeek: moderatorStats.reviewsCompletedThisWeek + 1,
          averageReviewTime: moderatorStats.averageReviewTime,
          currentActiveAssignments: moderatorStats.currentActiveAssignments - 1,
        },
        integrations: {
          githubUpdated:
            reviewData.updateGitHubIssue && submission.githubIssueNumber
              ? true
              : false,
          githubIssueNumber: submission.githubIssueNumber,
          emailSent:
            reviewData.notifySubmitter && submission.submitterEmail
              ? true
              : false,
          storyAddedToDatabase:
            reviewData.decision === 'approve' && transactionResult.storyId
              ? true
              : false,
        },
      },
      metadata: {
        reviewedBy: userId,
        reviewerEmail: adminUser.email,
        reviewedAt: new Date().toISOString(),
        reviewDuration: queueEntry
          ? Date.now() -
            new Date(queueEntry.assignedAt || queueEntry.queuedAt).getTime()
          : null,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error processing review:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('database')) {
        return NextResponse.json(
          {
            error: 'Database error',
            details: 'Unable to process review decision',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('transaction')) {
        return NextResponse.json(
          {
            error: 'Transaction error',
            details: 'Review operation could not be completed atomically',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          {
            error: 'Permission error',
            details: 'Unable to validate review permissions',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('github')) {
        return NextResponse.json(
          {
            error: 'GitHub integration error',
            details: 'Review completed but GitHub update failed',
          },
          { status: 207 } // Multi-status: partial success
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
