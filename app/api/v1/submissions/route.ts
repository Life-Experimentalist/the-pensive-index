import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import {
  SubmissionService,
  CreateSubmissionRequest,
  SubmissionQueryFilters,
} from '../../../../src/lib/services/submission-service';
import { QueueService } from '../../../../src/lib/services/queue-service';
import { DuplicateDetector } from '../../../../src/lib/validation/duplicate-detector';
import { QualityScorer } from '../../../../src/lib/validation/quality-scorer';
import { TagSuggester } from '../../../../src/lib/validation/tag-suggester';
import {
  SubmissionStatus,
  CompletionStatus,
  QueuePriority,
  QueueComplexity,
  StorySubmission,
} from '../../../../src/types/submission';

// Request validation schema
const createSubmissionSchema = z.object({
  storyUrl: z.string().url(),
  storyTitle: z.string().min(1).max(500),
  authorName: z.string().min(1).max(100),
  fandomId: z.string().min(1),
  summary: z.string().optional(),
  wordCount: z.number().int().positive().optional(),
  chapterCount: z.number().int().positive().optional(),
  completionStatus: z.nativeEnum(CompletionStatus).optional(),
  publishDate: z.string().datetime().optional(),
  lastUpdateDate: z.string().datetime().optional(),
  tags: z.array(z.string()).min(1),
  submissionNotes: z.string().optional(),
});

// Response type for API
interface SubmissionResponse {
  id: string;
  status: SubmissionStatus;
  githubIssueNumber?: number;
  qualityScore?: number;
  submittedAt: Date;
  reviewedAt?: Date;
  moderatorComments?: string;
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
}

// Initialize services
const submissionService = new SubmissionService();
const queueService = new QueueService();
const duplicateDetector = new DuplicateDetector();
const qualityScorer = new QualityScorer();
const tagSuggester = new TagSuggester();

/**
 * POST /api/v1/submissions
 * Create a new story submission
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createSubmissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const submissionData = validationResult.data;

    // Check for duplicates
    const duplicateResult = await duplicateDetector.checkForDuplicates(
      submissionData.storyUrl,
      submissionData.storyTitle,
      submissionData.fandomId
    );

    if (duplicateResult.isDuplicate && duplicateResult.confidence > 0.8) {
      return NextResponse.json(
        {
          error: 'Duplicate submission detected',
          duplicateId: duplicateResult.matchedSubmissions[0]?.submissionId,
          confidence: duplicateResult.confidence,
          details: duplicateResult.matchedSubmissions,
        },
        { status: 409 }
      );
    }

    // Create submission request
    const submissionRequest: CreateSubmissionRequest = {
      submitterUserId: userId,
      storyUrl: submissionData.storyUrl,
      storyTitle: submissionData.storyTitle,
      authorName: submissionData.authorName,
      fandomId: submissionData.fandomId,
      summary: submissionData.summary,
      wordCount: submissionData.wordCount,
      chapterCount: submissionData.chapterCount,
      completionStatus: submissionData.completionStatus,
      publishDate: submissionData.publishDate
        ? new Date(submissionData.publishDate)
        : undefined,
      lastUpdateDate: submissionData.lastUpdateDate
        ? new Date(submissionData.lastUpdateDate)
        : undefined,
      tags: submissionData.tags,
      submissionNotes: submissionData.submissionNotes,
    };

    // Create the submission (handles rate limiting and validation internally)
    const createdSubmission = await submissionService.createSubmission(
      submissionRequest
    );

    // Calculate quality score after creation
    const qualityScore = await qualityScorer.calculateQualityScore(
      createdSubmission.id
    );

    // Add to moderation queue
    await queueService.createQueueEntry({
      submissionId: createdSubmission.id,
      priority:
        qualityScore.overallScore < 50
          ? QueuePriority.HIGH
          : QueuePriority.NORMAL,
      complexity:
        submissionData.tags.length > 10
          ? QueueComplexity.COMPLEX
          : QueueComplexity.MEDIUM,
    });

    // Return success response
    const response: SubmissionResponse = {
      id: createdSubmission.id,
      status: createdSubmission.status as SubmissionStatus,
      githubIssueNumber: createdSubmission.githubIssueNumber ?? undefined,
      qualityScore: createdSubmission.qualityScore ?? undefined,
      submittedAt: createdSubmission.submittedAt ?? new Date(),
      reviewedAt: createdSubmission.reviewedAt ?? undefined,
      moderatorComments: undefined,
      storyData: {
        storyUrl: createdSubmission.storyUrl,
        storyTitle: createdSubmission.storyTitle,
        authorName: createdSubmission.authorName,
        fandomId: createdSubmission.fandomId,
        summary: createdSubmission.summary ?? undefined,
        wordCount: createdSubmission.wordCount ?? undefined,
        chapterCount: createdSubmission.chapterCount ?? undefined,
        completionStatus: createdSubmission.completionStatus ?? undefined,
        publishDate: createdSubmission.publishDate?.toISOString(),
        lastUpdateDate: createdSubmission.lastUpdateDate?.toISOString(),
        tags: createdSubmission.tags ?? [],
        submissionNotes: createdSubmission.submissionNotes ?? undefined,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating submission:', error);

    if (error instanceof Error) {
      if (error.message.includes('Rate limit exceeded')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

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

/**
 * GET /api/v1/submissions
 * Get user's submission history with pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const status = searchParams.get('status') as SubmissionStatus | null;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Build filters
    const filters: SubmissionQueryFilters = {
      submitterUserId: userId,
    };

    if (status) {
      filters.status = [status];
    }

    // Get user's submissions
    const result = await submissionService.getSubmissions(filters, page, limit);

    // Transform to response format
    const responseSubmissions: SubmissionResponse[] = result.submissions.map(
      submission => ({
        id: submission.id,
        status: submission.status as SubmissionStatus,
        githubIssueNumber: submission.githubIssueNumber ?? undefined,
        qualityScore: submission.qualityScore ?? undefined,
        submittedAt: submission.submittedAt ?? new Date(),
        reviewedAt: submission.reviewedAt ?? undefined,
        moderatorComments: undefined,
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
      })
    );

    return NextResponse.json({
      submissions: responseSubmissions,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page * limit < result.total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
