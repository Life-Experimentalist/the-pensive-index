/**
 * T032: Admin Assignment API Endpoint
 *
 * POST /api/v1/admin/submissions/{id}/assign - Assign submission to moderator
 *
 * This endpoint handles assignment of submissions to moderators with:
 * - Workload balancing logic
 * - Priority adjustment capability
 * - Notification sending to assigned moderator
 * - Audit logging for assignment actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import { QueueService } from '../../../../../../../src/lib/services/queue-service';
import { SubmissionService } from '../../../../../../../src/lib/services/submission-service';
import { AdminUserModel } from '../../../../../../../src/lib/admin/models/AdminUser';
import { PermissionValidator } from '../../../../../../../src/lib/admin/utils/PermissionValidator';
import { EmailService } from '../../../../../../../src/lib/notifications/email-service';
import { ModerationAction } from '../../../../../../../src/types/submission';

// Request validation schema
const assignmentRequestSchema = z.object({
  moderatorId: z.string().min(1, 'Moderator ID is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  estimatedReviewTime: z.number().min(1).max(480).optional(), // 1-480 minutes (8 hours max)
  deadline: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  notifyModerator: z.boolean().optional().default(true),
});

type AssignmentRequest = z.infer<typeof assignmentRequestSchema>;

// Initialize services
const queueService = new QueueService();
const submissionService = new SubmissionService();
const adminModel = AdminUserModel.getInstance();
const permissionValidator = PermissionValidator.getInstance();
const emailService = new EmailService();

/**
 * POST /api/v1/admin/submissions/{id}/assign
 * Assign a submission to a moderator with workload balancing
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
    let assignmentData: AssignmentRequest;
    try {
      const body = await request.json();
      assignmentData = assignmentRequestSchema.parse(body);
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

    // Get submission details to check permissions
    const submission = await submissionService.getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to assign submissions in this fandom
    const canAssign = await permissionValidator.hasPermission(
      userId,
      'assign_submissions',
      submission.fandomId
    );

    if (!canAssign) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          details:
            'You do not have permission to assign submissions in this fandom',
        },
        { status: 403 }
      );
    }

    // Validate that the target moderator exists and has appropriate permissions
    const targetModerator = await adminModel.getByClerkId(
      assignmentData.moderatorId
    );
    if (!targetModerator) {
      return NextResponse.json(
        { error: 'Target moderator not found' },
        { status: 400 }
      );
    }

    // Check if target moderator can moderate this fandom
    const canModerate = await permissionValidator.hasPermission(
      assignmentData.moderatorId,
      'moderate_submissions',
      submission.fandomId
    );

    if (!canModerate) {
      return NextResponse.json(
        {
          error: 'Invalid moderator assignment',
          details:
            'Target moderator cannot moderate submissions for this fandom',
        },
        { status: 400 }
      );
    }

    // Check current workload and apply balancing logic
    const moderatorWorkload = await queueService.getModeratorWorkload(
      assignmentData.moderatorId
    );
    const workloadThreshold = await queueService.getWorkloadThreshold();

    if (
      moderatorWorkload.activeAssignments >
      workloadThreshold.maxActiveAssignments
    ) {
      return NextResponse.json(
        {
          error: 'Moderator workload exceeded',
          details: `Moderator has ${moderatorWorkload.activeAssignments} active assignments (max: ${workloadThreshold.maxActiveAssignments})`,
          suggestions: await queueService.suggestAlternateModerators(
            submission.fandomId
          ),
        },
        { status: 409 }
      );
    }

    // Calculate deadline if not provided
    let assignmentDeadline = assignmentData.deadline;
    if (!assignmentDeadline && assignmentData.estimatedReviewTime) {
      const deadline = new Date();
      deadline.setMinutes(
        deadline.getMinutes() + assignmentData.estimatedReviewTime
      );
      assignmentDeadline = deadline.toISOString();
    }

    // Create assignment in queue
    const assignment = await queueService.assignSubmission({
      submissionId: submissionId,
      moderatorId: assignmentData.moderatorId,
      assignedBy: userId,
      priority: assignmentData.priority || submission.priority,
      estimatedReviewTime: assignmentData.estimatedReviewTime,
      deadline: assignmentDeadline,
      notes: assignmentData.notes,
    });

    // Update submission status
    await submissionService.updateSubmissionStatus(
      submissionId,
      'under_review',
      {
        moderatorId: assignmentData.moderatorId,
        assignedAt: new Date().toISOString(),
        assignedBy: userId,
      }
    );

    // Log moderation action for audit trail
    const moderationAction: Omit<ModerationAction, 'id' | 'createdAt'> = {
      submissionId: submissionId,
      moderatorId: userId,
      action: 'assigned',
      details: {
        assignedTo: assignmentData.moderatorId,
        assignedToEmail: targetModerator.email,
        priority: assignmentData.priority,
        estimatedReviewTime: assignmentData.estimatedReviewTime,
        deadline: assignmentDeadline,
        notes: assignmentData.notes,
      },
      fandomId: submission.fandomId,
    };

    await submissionService.logModerationAction(moderationAction);

    // Send notification to assigned moderator if requested
    if (assignmentData.notifyModerator) {
      try {
        await emailService.sendModeratorAssignmentNotification({
          moderatorEmail: targetModerator.email,
          moderatorName: targetModerator.displayName || targetModerator.email,
          submissionId: submissionId,
          submissionTitle: submission.title || 'Untitled Story',
          fandomName: submission.fandomName || 'Unknown Fandom',
          priority: assignmentData.priority || submission.priority,
          deadline: assignmentDeadline,
          notes: assignmentData.notes,
          reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/submissions/${submissionId}`,
        });
      } catch (emailError) {
        console.error('Failed to send assignment notification:', emailError);
        // Don't fail the assignment if email fails
      }
    }

    // Get updated workload stats for response
    const updatedWorkload = await queueService.getModeratorWorkload(
      assignmentData.moderatorId
    );
    const queueStats = await queueService.getQueueStatistics(
      submission.fandomId
    );

    // Prepare success response
    const response = {
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          submissionId: submissionId,
          moderatorId: assignmentData.moderatorId,
          moderatorEmail: targetModerator.email,
          priority: assignmentData.priority || submission.priority,
          estimatedReviewTime: assignmentData.estimatedReviewTime,
          deadline: assignmentDeadline,
          assignedAt: assignment.assignedAt,
          assignedBy: userId,
          notes: assignmentData.notes,
        },
        workloadUpdate: {
          moderatorId: assignmentData.moderatorId,
          previousActive: moderatorWorkload.activeAssignments,
          currentActive: updatedWorkload.activeAssignments,
          capacityUsed:
            (updatedWorkload.activeAssignments /
              workloadThreshold.maxActiveAssignments) *
            100,
        },
        queueImpact: {
          fandomId: submission.fandomId,
          totalPending: queueStats.totalPending - 1,
          totalAssigned: queueStats.totalAssigned + 1,
          averageWaitTime: queueStats.averageWaitTime,
        },
      },
      metadata: {
        assignedBy: userId,
        assignedAt: new Date().toISOString(),
        notificationSent: assignmentData.notifyModerator,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error assigning submission:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('database')) {
        return NextResponse.json(
          {
            error: 'Database error',
            details: 'Unable to process assignment',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          {
            error: 'Permission error',
            details: 'Unable to validate permissions for assignment',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('workload')) {
        return NextResponse.json(
          {
            error: 'Workload calculation error',
            details: 'Unable to calculate moderator workload',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
