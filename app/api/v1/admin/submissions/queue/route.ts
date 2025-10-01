/**
 * T031: Admin Moderation Queue API Endpoint
 *
 * GET /api/v1/admin/submissions/queue - Moderation queue display
 *
 * This endpoint provides access to the moderation queue for admin users with:
 * - Filtering by fandom, priority, complexity
 * - FandomAdmin scope validation
 * - Pagination and sorting support
 * - Queue statistics and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import { QueueService } from '../../../../../../src/lib/services/queue-service';
import { AdminUserModel } from '../../../../../../src/lib/admin/models/AdminUser';
import { PermissionValidator } from '../../../../../../src/lib/admin/utils/PermissionValidator';
import {
  QueuePriority,
  QueueComplexity,
} from '../../../../../../src/types/submission';

// Request validation schema for query parameters
const queueQuerySchema = z.object({
  // Filtering options
  fandomId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  complexity: z.enum(['simple', 'moderate', 'complex', 'expert']).optional(),
  assignedModeratorId: z.string().optional(),
  unassignedOnly: z
    .enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional(),
  overdueOnly: z
    .enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional(),

  // Pagination options
  page: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => val > 0)
    .optional()
    .default('1'),
  limit: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 100)
    .optional()
    .default('20'),

  // Sorting options
  sortBy: z
    .enum([
      'priority',
      'complexity',
      'queuedAt',
      'deadline',
      'estimatedReviewTime',
    ])
    .optional()
    .default('queuedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Include additional data
  includeSubmissionDetails: z
    .enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional()
    .default('true'),
  includeStatistics: z
    .enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional()
    .default('false'),
});

type QueueQueryParams = z.infer<typeof queueQuerySchema>;

// Initialize services
const queueService = new QueueService();
const adminModel = AdminUserModel.getInstance();
const permissionValidator = PermissionValidator.getInstance();

/**
 * GET /api/v1/admin/submissions/queue
 * Get moderation queue with filtering, pagination, and admin scope validation
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

    // Parse and validate query parameters
    let queryParams: QueueQueryParams;
    try {
      const { searchParams } = new URL(request.url);
      const rawParams = Object.fromEntries(searchParams.entries());
      queryParams = queueQuerySchema.parse(rawParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Get admin user information
    const adminUser = await adminModel.getByClerkId(userId);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Check if user has moderation permissions
    const canModerate = await permissionValidator.hasPermission(
      userId,
      'moderate_submissions',
      queryParams.fandomId
    );

    if (!canModerate) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          details: 'You do not have permission to access the moderation queue',
        },
        { status: 403 }
      );
    }

    // Apply fandom scope validation for FandomAdmin users
    let effectiveFandomFilter = queryParams.fandomId;

    // Check if user is FandomAdmin and needs fandom scope restriction
    const userAssignments = await adminModel.getFandomAssignments(userId);
    const isFandomAdmin = userAssignments.some(
      assignment => assignment.role.name === 'FandomAdmin'
    );

    if (isFandomAdmin && !queryParams.fandomId) {
      // FandomAdmin users can only see their assigned fandoms
      const assignedFandomIds = userAssignments
        .filter(assignment => assignment.role.name === 'FandomAdmin')
        .map(assignment => assignment.fandomId)
        .filter(Boolean);

      if (assignedFandomIds.length === 0) {
        return NextResponse.json(
          {
            error: 'No fandom assignments',
            details:
              'FandomAdmin users must have assigned fandoms to access the queue',
          },
          { status: 403 }
        );
      }

      // For now, return entries from all assigned fandoms if no specific fandom requested
      // In a more sophisticated implementation, this could be handled differently
      effectiveFandomFilter = assignedFandomIds[0]; // Use first assigned fandom as default
    } else if (isFandomAdmin && queryParams.fandomId) {
      // Verify FandomAdmin has access to requested fandom
      const hasAccessToFandom = userAssignments.some(
        assignment =>
          assignment.role.name === 'FandomAdmin' &&
          assignment.fandomId === queryParams.fandomId
      );

      if (!hasAccessToFandom) {
        return NextResponse.json(
          {
            error: 'Fandom access denied',
            details:
              "You do not have permission to access this fandom's moderation queue",
          },
          { status: 403 }
        );
      }
    }

    // Build queue filters
    const queueFilters = {
      fandomId: effectiveFandomFilter,
      priority: queryParams.priority as QueuePriority | undefined,
      complexity: queryParams.complexity as QueueComplexity | undefined,
      assignedModeratorId: queryParams.assignedModeratorId,
      unassignedOnly: queryParams.unassignedOnly,
      overdueOnly: queryParams.overdueOnly,
    };

    // Get queue entries with pagination
    const { entries, total } = await queueService.getQueueEntries(
      queueFilters,
      queryParams.page,
      queryParams.limit
    );

    // Apply sorting (if different from default)
    const sortedEntries = [...entries].sort((a, b) => {
      let compareValue = 0;

      switch (queryParams.sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          compareValue =
            (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) -
            (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'complexity':
          const complexityOrder = {
            expert: 4,
            complex: 3,
            moderate: 2,
            simple: 1,
          };
          compareValue =
            (complexityOrder[a.complexity as keyof typeof complexityOrder] ||
              0) -
            (complexityOrder[b.complexity as keyof typeof complexityOrder] ||
              0);
          break;
        case 'queuedAt':
          compareValue =
            new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
          break;
        case 'deadline':
          const aDeadline = a.deadline ? new Date(a.deadline).getTime() : 0;
          const bDeadline = b.deadline ? new Date(b.deadline).getTime() : 0;
          compareValue = aDeadline - bDeadline;
          break;
        case 'estimatedReviewTime':
          compareValue =
            (a.estimatedReviewTime || 0) - (b.estimatedReviewTime || 0);
          break;
      }

      return queryParams.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    // Get additional submission details if requested
    let enrichedEntries = sortedEntries;
    if (queryParams.includeSubmissionDetails) {
      // This would require additional service calls to get submission details
      // For now, we'll include the basic queue entry information
      enrichedEntries = sortedEntries.map(entry => ({
        ...entry,
        // Add submission details that might be available
        submissionDetails: {
          // These would come from the submission service
          title: null, // Would be populated from submission data
          authorEmail: null, // Would be populated from submission data
          fandomName: null, // Would be populated from fandom data
          submittedAt: null, // Would be populated from submission data
        },
      }));
    }

    // Get queue statistics if requested
    let statistics;
    if (queryParams.includeStatistics) {
      const stats = await queueService.getQueueStatistics(
        effectiveFandomFilter
      );
      statistics = {
        totalEntries: stats.totalPending + stats.totalAssigned,
        pendingEntries: stats.totalPending,
        assignedEntries: stats.totalAssigned,
        overdueEntries: stats.totalOverdue,
        averageWaitTime: stats.averageWaitTime,
        averageReviewTime: stats.averageReviewTime,
        priorityDistribution: stats.priorityDistribution,
        complexityDistribution: stats.complexityDistribution,
      };
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / queryParams.limit);
    const hasNextPage = queryParams.page < totalPages;
    const hasPreviousPage = queryParams.page > 1;

    // Prepare response
    const response = {
      success: true,
      data: {
        entries: enrichedEntries,
        pagination: {
          currentPage: queryParams.page,
          totalPages,
          totalEntries: total,
          entriesPerPage: queryParams.limit,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          applied: queueFilters,
          available: {
            priorities: ['low', 'medium', 'high', 'urgent'],
            complexities: ['simple', 'moderate', 'complex', 'expert'],
            sortOptions: [
              'priority',
              'complexity',
              'queuedAt',
              'deadline',
              'estimatedReviewTime',
            ],
          },
        },
        sorting: {
          sortBy: queryParams.sortBy,
          sortOrder: queryParams.sortOrder,
        },
      },
      metadata: {
        requestedBy: userId,
        requestedAt: new Date().toISOString(),
        fandomScope: effectiveFandomFilter,
        userRole: adminUser.role?.name || 'unknown',
        userAssignments: userAssignments.map(a => ({
          fandomId: a.fandomId,
          role: a.role.name,
        })),
      },
    };

    // Add statistics if requested
    if (statistics) {
      response.data.statistics = statistics;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching moderation queue:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('database')) {
        return NextResponse.json(
          {
            error: 'Database error',
            details: 'Unable to retrieve moderation queue data',
          },
          { status: 500 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          {
            error: 'Permission error',
            details: 'Unable to validate user permissions',
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
