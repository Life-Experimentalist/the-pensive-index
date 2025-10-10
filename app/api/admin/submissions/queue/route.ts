/**
 * Admin Submissions Queue API Route
 * Handles submission queue retrieval with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SubmissionService } from '@/lib/services/submission-service';
import { QueueService } from '@/lib/services/queue-service';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';

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
    const { filters } = await request.json();

    // Initialize services
    const submissionService = new SubmissionService();
    const queueService = new QueueService();

    // Get queue data with filters
    const queueData = await queueService.getModeratorQueue({
      status: filters.status !== 'all' ? filters.status : undefined,
      priority: filters.priority !== 'all' ? filters.priority : undefined,
      assignedTo: filters.assignedTo !== 'all' ? filters.assignedTo : undefined,
      fandom: filters.fandom !== 'all' ? filters.fandom : undefined,
      searchTerm: filters.searchTerm || undefined,
      dateRange: filters.dateRange,
      sortBy: filters.sortBy || 'submissionDate',
      sortOrder: filters.sortOrder || 'desc',
      limit: 50, // Reasonable limit for admin interface
    });

    // Get queue statistics
    const stats = await queueService.getQueueStatistics();

    // Transform submissions for admin interface
    const transformedSubmissions = queueData.submissions.map(submission => ({
      ...submission,
      queuePosition: queueData.queuePositions[submission.id] || 0,
      assignedModerator: submission.assignedModeratorId
        ? {
            id: submission.assignedModeratorId,
            name:
              queueData.moderators[submission.assignedModeratorId]?.name ||
              'Unknown',
            githubUsername:
              queueData.moderators[submission.assignedModeratorId]
                ?.githubUsername,
          }
        : undefined,
      githubIssue: submission.githubIssueNumber
        ? {
            number: submission.githubIssueNumber,
            url: `https://github.com/${process.env.GITHUB_REPO}/issues/${submission.githubIssueNumber}`,
            state: submission.githubIssueState || 'open',
            labels: submission.githubIssueLabels || [],
          }
        : undefined,
      moderationHistory: queueData.moderationHistory[submission.id] || [],
      qualityScore: submission.qualityScore,
      estimatedReviewTime: queueService.getEstimatedReviewTime(submission),
      priority: submission.priority || 'normal',
      flags: submission.flags || [],
    }));

    return NextResponse.json({
      submissions: transformedSubmissions,
      stats: {
        totalPending: stats.pendingCount,
        totalUnderReview: stats.underReviewCount,
        totalApproved: stats.approvedCount,
        totalRejected: stats.rejectedCount,
        averageReviewTime: stats.averageReviewTimeHours / 24,
        oldestSubmissionDays: stats.oldestSubmissionHours / 24,
        moderatorWorkload: stats.moderatorWorkload.map(m => ({
          moderatorId: m.moderatorId,
          moderatorName: m.moderatorName,
          assignedCount: m.assignedCount,
          completedToday: m.completedToday,
        })),
        dailyStats: stats.dailyStats,
      },
      pagination: {
        total: queueData.total,
        limit: 50,
        offset: 0,
      },
    });
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json(
      { error: 'Failed to load queue data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Simple health check for the queue API
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      features: [
        'submission_queue',
        'filtering',
        'statistics',
        'moderation_actions',
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
