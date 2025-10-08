/**
 * Performance Metrics API
 *
 * Admin endpoint for retrieving performance metrics with filtering and time range selection.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { PerformanceMetricsService } from '@/lib/monitoring/performance-service';
import { getPerformanceDatabase } from '@/lib/database/performance-db';

// Request validation schema
const MetricsQuerySchema = z
  .object({
    start: z
      .string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0, 'Invalid start timestamp'),
    end: z
      .string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0, 'Invalid end timestamp'),
    endpoint: z.string().optional(),
    groupBy: z.enum(['minute', 'hour', 'day']).default('hour'),
    userType: z.enum(['ANONYMOUS', 'AUTHENTICATED', 'ADMIN']).optional(),
  })
  .refine(data => data.end > data.start, {
    message: 'End time must be after start time',
    path: ['end'],
  })
  .refine(
    data => {
      const rangeDays = (data.end - data.start) / (60 * 60 * 24);
      return rangeDays <= 30;
    },
    { message: 'Time range cannot exceed 30 days', path: ['end'] }
  );

// Initialize services
const adminModel = AdminUserModel.getInstance();

/**
 * GET /api/admin/performance/metrics
 * Retrieve performance metrics for admin dashboard
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

    const validationResult = MetricsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const error = validationResult.error.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TIME_RANGE',
            message: error.message,
            details: {
              field: error.path.join('.'),
              start: queryParams.start,
              end: queryParams.end,
            },
          },
        },
        { status: 400 }
      );
    }

    const { start, end, endpoint, groupBy, userType } = validationResult.data;

    // Get performance database connection
    const db = getPerformanceDatabase();
    const performanceService = new PerformanceMetricsService(db);

    // Query performance metrics
    const metricsData = await performanceService.getMetrics({
      start,
      end,
      endpoint,
      groupBy,
      userType,
    });

    // Transform MetricsSummary to match API contract
    const metrics = metricsData.endpointBreakdown.map(item => ({
      timestamp: start,
      endpoint: item.endpoint,
      totalRequests: item.requestCount,
      avgResponseTimeMs: item.avgResponseTime,
      p50ResponseTimeMs: metricsData.p50ResponseTime,
      p95ResponseTimeMs: metricsData.p95ResponseTime,
      p99ResponseTimeMs: metricsData.p99ResponseTime,
      errorCount: item.errorCount,
      errorRate: item.errorCount / item.requestCount || 0,
      cacheHitCount: 0, // TODO: Add to service response
      cacheMissCount: 0,
      cacheHitRate: metricsData.cacheHitRate,
    }));

    // Calculate summary statistics
    const summary = {
      totalRequests: metricsData.totalRequests,
      avgResponseTimeMs: Math.round(metricsData.avgResponseTime),
      p95ResponseTimeMs: metricsData.p95ResponseTime,
      errorRate: metricsData.errorRate,
      cacheHitRate: metricsData.cacheHitRate,
    };

    const responseTime = Date.now() - startTime;

    // Return cached response with 5-minute TTL
    return NextResponse.json(
      {
        success: true,
        data: {
          metrics,
          summary,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 minutes
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching performance metrics:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch performance metrics',
        },
      },
      { status: 500 }
    );
  }
}
