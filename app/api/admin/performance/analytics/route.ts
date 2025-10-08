/**
 * Analytics API
 *
 * Admin endpoint for retrieving analytics data for growth insights and engagement metrics.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { AnalyticsService } from '@/lib/analytics/analytics-service';
import { getPerformanceDatabase } from '@/lib/database/performance-db';

// Request validation schema
const AnalyticsQuerySchema = z
  .object({
    start: z
      .string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0, 'Invalid start timestamp'),
    end: z
      .string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0, 'Invalid end timestamp'),
    fandomId: z
      .string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0, 'Invalid fandom ID')
      .optional(),
    eventType: z.string().optional(),
    groupBy: z.enum(['hour', 'day', 'week']).default('day'),
  })
  .refine(data => data.end > data.start, {
    message: 'End time must be after start time',
    path: ['end'],
  });

// Initialize services
const adminModel = AdminUserModel.getInstance();

/**
 * GET /api/admin/performance/analytics
 * Retrieve analytics data with filtering and aggregation
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

    const validationResult = AnalyticsQuerySchema.safeParse(queryParams);
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

    const { start, end, fandomId, eventType, groupBy } = validationResult.data;

    // Initialize analytics service with D1 database
    const db = getPerformanceDatabase();
    const analyticsService = new AnalyticsService(db);

    // Get analytics events from the database
    const events = await analyticsService.getEvents({
      start,
      end,
      fandomId,
      eventType: eventType as any, // Type will be validated by service
    });

    // Calculate summary statistics
    const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
    const totalEvents = events.length;

    // Group events by fandom for top fandoms
    const fandomCounts = events.reduce((acc, event) => {
      if (event.fandomId) {
        const key = `${event.fandomId}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topFandoms = Object.entries(fandomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([fandomId, count]) => ({
        fandomId: parseInt(fandomId),
        name: `Fandom ${fandomId}`, // TODO: Get actual fandom names from database
        count,
      }));

    // Calculate conversion rate (pathway_created / pathway_started)
    const pathwayStarted = events.filter(
      e => (e.eventType as string) === 'PATHWAY_STARTED'
    ).length;
    const pathwayCreated = events.filter(
      e => (e.eventType as string) === 'PATHWAY_CREATED'
    ).length;
    const conversionRate =
      pathwayStarted > 0 ? (pathwayCreated / pathwayStarted) * 100 : 0;

    // Group events by time period
    const groupedEvents: Array<{
      timestamp: number;
      eventType: string;
      fandomId?: number;
      fandomName?: string;
      count: number;
      uniqueSessions: number;
    }> = [];

    // Group by specified period
    const timeGroups = new Map<string, typeof events>();
    events.forEach(event => {
      const date = new Date(event.timestamp * 1000);
      let key: string;

      if (groupBy === 'hour') {
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      } else if (groupBy === 'day') {
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      } else {
        // week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
      }

      if (!timeGroups.has(key)) {
        timeGroups.set(key, []);
      }
      const group = timeGroups.get(key);
      if (group) {
        group.push(event);
      }
    });

    // Convert groups to response format
    timeGroups.forEach((groupEvents, key) => {
      const eventTypeGroups = groupEvents.reduce((acc, e) => {
        if (!acc[e.eventType]) {
          acc[e.eventType] = [];
        }
        acc[e.eventType].push(e);
        return acc;
      }, {} as Record<string, typeof events>);

      Object.entries(eventTypeGroups).forEach(([type, typeEvents]) => {
        groupedEvents.push({
          timestamp: typeEvents[0].timestamp,
          eventType: type,
          count: typeEvents.length,
          uniqueSessions: new Set(typeEvents.map(e => e.sessionId)).size,
        });
      });
    });

    const summary = {
      totalEvents,
      uniqueSessions,
      topFandoms,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          events,
          summary,
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
    console.error('Error fetching analytics:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics',
        },
      },
      { status: 500 }
    );
  }
}
