/**
 * Error Logs API
 *
 * Admin endpoint for retrieving error logs with filtering and pagination.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { ErrorService } from '@/lib/monitoring/error-service';
import { getPerformanceDatabase } from '@/lib/database/performance-db';

// Request validation schema
const ErrorsQuerySchema = z.object({
  level: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  category: z
    .enum(['database', 'cache', 'api', 'auth', 'validation', 'ratelimit'])
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0 && val <= 100,
      'Limit must be between 1 and 100'
    )
    .default('50'),
  offset: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 0, 'Offset must be 0 or greater')
    .default('0'),
  search: z
    .string()
    .max(100, 'Search query must be 100 characters or less')
    .optional(),
});

// Initialize services
const adminModel = AdminUserModel.getInstance();

/**
 * GET /api/admin/performance/errors
 * Retrieve error logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Authorization check - require admin role
    const hasPermission = await adminModel.hasPermission(
      currentUserId,
      'VIEW_PERFORMANCE_METRICS'
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin role required',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validationResult = ErrorsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const error = validationResult.error.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: error.message,
            details: {
              field: error.path.join('.'),
            },
          },
        },
        { status: 400 }
      );
    }

    const { level, category, limit, offset, search } = validationResult.data;

    // Get performance database connection
    const db = getPerformanceDatabase();
    const errorService = new ErrorService(db);

    // Query error logs
    const errorLogs = await errorService.getErrors({
      level,
      category,
      limit,
      offset,
      search,
    });

    // Get total count for pagination (use last 30 days)
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 30 * 24 * 60 * 60;
    const stats = await errorService.getErrorStats(startTime, endTime);
    const total = stats.totalErrors;
    const hasMore = offset + limit < total;

    const errors = errorLogs.map(log => ({
      id: log.id || 0,
      timestamp: log.timestamp,
      level: log.level,
      category: log.category,
      message: log.message,
      stackTrace: log.stackTrace,
      errorHash: log.errorHash,
      occurrenceCount: log.occurrenceCount,
      firstSeen: log.timestamp, // First seen is creation timestamp
      lastSeen: log.lastSeen || log.timestamp,
      context: log.context,
    }));

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          errors,
          pagination: {
            total,
            limit,
            offset,
            hasMore,
          },
        },
      },
      {
        status: 200,
        headers: {
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching error logs:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch error logs',
        },
      },
      { status: 500 }
    );
  }
}
