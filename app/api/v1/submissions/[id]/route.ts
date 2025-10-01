import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import {
  SubmissionService,
  UserUpdateSubmissionRequest,
} from '../../../../../src/lib/services/submission-service';
import {
  SubmissionStatus,
  CompletionStatus,
  StorySubmission,
} from '../../../../../src/types/submission';

// Update request validation schema
const updateSubmissionSchema = z.object({
  summary: z.string().optional(),
  wordCount: z.number().int().positive().optional(),
  chapterCount: z.number().int().positive().optional(),
  completionStatus: z.nativeEnum(CompletionStatus).optional(),
  publishDate: z.string().datetime().optional(),
  lastUpdateDate: z.string().datetime().optional(),
  tags: z.array(z.string()).min(1).optional(),
  submissionNotes: z.string().optional(),
});

// Response type for submission details
interface SubmissionDetailsResponse {
  id: string;
  status: SubmissionStatus;
  githubIssueNumber?: number;
  qualityScore?: number;
  submittedAt: Date;
  reviewedAt?: Date;
  storyData: {
    storyUrl: string;
    storyTitle: string;
    authorName: string;
    fandomId: string;
    summary?: string;
    wordCount?: number;
    chapterCount?: number;
    completionStatus?: string;
    publishDate?: string;
    lastUpdateDate?: string;
    tags: string[];
    submissionNotes?: string;
  };
  moderationHistory: Array<{
    action: string;
    timestamp: Date;
    moderatorId?: string;
    comments?: string;
  }>;
  canEdit: boolean;
}

// Initialize services
const submissionService = new SubmissionService();

/**
 * GET /api/v1/submissions/[id]
 * Get submission details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const submissionId = params.id;

    // Get submission details
    const submission = await submissionService.getSubmission(submissionId);

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this submission
    if (submission.submitterUserId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only view your own submissions.' },
        { status: 403 }
      );
    }

    // Check if submission can be edited (only pending submissions)
    const canEdit = submission.status === SubmissionStatus.PENDING;

    // Get moderation history (mock implementation - would need ModerationAction service)
    const moderationHistory = [
      {
        action: 'submitted',
        timestamp: submission.submittedAt ?? new Date(),
        comments: 'Story submitted for review',
      },
    ];

    if (submission.reviewedAt) {
      moderationHistory.push({
        action:
          submission.status === SubmissionStatus.APPROVED
            ? 'approved'
            : 'reviewed',
        timestamp: submission.reviewedAt,
        comments: 'Moderation review completed',
      });
    }

    // Build response
    const response: SubmissionDetailsResponse = {
      id: submission.id,
      status: submission.status as SubmissionStatus,
      githubIssueNumber: submission.githubIssueNumber ?? undefined,
      qualityScore: submission.qualityScore ?? undefined,
      submittedAt: submission.submittedAt ?? new Date(),
      reviewedAt: submission.reviewedAt ?? undefined,
      storyData: {
        storyUrl: submission.storyUrl,
        storyTitle: submission.storyTitle,
        authorName: submission.authorName,
        fandomId: submission.fandomId,
        summary: submission.summary ?? undefined,
        wordCount: submission.wordCount ?? undefined,
        chapterCount: submission.chapterCount ?? undefined,
        completionStatus: submission.completionStatus ?? undefined,
        publishDate: submission.publishDate?.toISOString(),
        lastUpdateDate: submission.lastUpdateDate?.toISOString(),
        tags: submission.tags ?? [],
        submissionNotes: submission.submissionNotes ?? undefined,
      },
      moderationHistory,
      canEdit,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching submission details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/submissions/[id]
 * Update submission details (only for pending submissions)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const submissionId = params.id;

    // Get current submission
    const currentSubmission = await submissionService.getSubmission(
      submissionId
    );

    if (!currentSubmission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check if user owns this submission
    if (currentSubmission.submitterUserId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only update your own submissions.' },
        { status: 403 }
      );
    }

    // Check if submission can be edited
    if (currentSubmission.status !== SubmissionStatus.PENDING) {
      return NextResponse.json(
        {
          error:
            'Cannot update submission. Only pending submissions can be modified.',
          currentStatus: currentSubmission.status,
        },
        { status: 409 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateSubmissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Build user update request
    const updateRequest: UserUpdateSubmissionRequest = {
      id: submissionId,
      summary: updateData.summary,
      wordCount: updateData.wordCount,
      chapterCount: updateData.chapterCount,
      completionStatus: updateData.completionStatus,
      publishDate: updateData.publishDate
        ? new Date(updateData.publishDate)
        : undefined,
      lastUpdateDate: updateData.lastUpdateDate
        ? new Date(updateData.lastUpdateDate)
        : undefined,
      tags: updateData.tags,
      submissionNotes: updateData.submissionNotes,
    };

    // Update submission with user-allowed fields
    const updatedSubmission = await submissionService.updateUserSubmission(
      updateRequest
    );

    // Return updated submission details
    const response: SubmissionDetailsResponse = {
      id: updatedSubmission.id,
      status: updatedSubmission.status as SubmissionStatus,
      githubIssueNumber: updatedSubmission.githubIssueNumber ?? undefined,
      qualityScore: updatedSubmission.qualityScore ?? undefined,
      submittedAt: updatedSubmission.submittedAt ?? new Date(),
      reviewedAt: updatedSubmission.reviewedAt ?? undefined,
      storyData: {
        storyUrl: updatedSubmission.storyUrl,
        storyTitle: updatedSubmission.storyTitle,
        authorName: updatedSubmission.authorName,
        fandomId: updatedSubmission.fandomId,
        summary: updatedSubmission.summary ?? undefined,
        wordCount: updatedSubmission.wordCount ?? undefined,
        chapterCount: updatedSubmission.chapterCount ?? undefined,
        completionStatus: updatedSubmission.completionStatus ?? undefined,
        publishDate: updatedSubmission.publishDate?.toISOString(),
        lastUpdateDate: updatedSubmission.lastUpdateDate?.toISOString(),
        tags: updatedSubmission.tags ?? [],
        submissionNotes: updatedSubmission.submissionNotes ?? undefined,
      },
      moderationHistory: [
        {
          action: 'submitted',
          timestamp: updatedSubmission.submittedAt ?? new Date(),
          comments: 'Story submitted for review',
        },
        {
          action: 'updated',
          timestamp: new Date(),
          comments: 'Submission details updated',
        },
      ],
      canEdit: true, // Still pending, so still editable
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating submission:', error);

    if (error instanceof Error) {
      if (error.message.includes('validation failed')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
