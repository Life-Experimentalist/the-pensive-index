/**
 * Resource Usage API
 *
 * Admin endpoint for monitoring free-tier resource consumption and capacity planning.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { ResourceMonitoringService } from '@/lib/monitoring/resource-service';
import { getPerformanceDatabase } from '@/lib/database/performance-db';

// Request validation schema
const ResourceUsageQuerySchema = z.object({
  period: z.enum(['DAILY', 'MONTHLY']).default('DAILY'),
});

// Initialize services
const adminModel = AdminUserModel.getInstance();

/**
 * GET /api/admin/performance/resource-usage
 * Monitor free-tier resource consumption
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

    // Authorization check - require ProjectAdmin for resource usage
    const hasPermission = await adminModel.hasPermission(
      currentUserId,
      'MANAGE_SYSTEM_SETTINGS'
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'ProjectAdmin role required to view resource usage',
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

    const validationResult = ResourceUsageQuerySchema.safeParse(queryParams);
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

    const { period } = validationResult.data;

    // Initialize resource monitoring service with D1 database
    const db = getPerformanceDatabase();
    const resourceService = new ResourceMonitoringService(db);

    // Get current resource usage
    const currentUsageMap = await resourceService.getCurrentUsage();

    // Transform to API response format with status indicators
    const usage: Array<{
      resourceType: string;
      usageCount: number;
      limitTotal: number;
      percentUsed: number;
      periodStart: number;
      periodEnd: number;
      status: 'OK' | 'WARNING' | 'CRITICAL';
    }> = [];

    const now = Date.now();
    const periodStart =
      period === 'DAILY'
        ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
        : new Date(new Date().setDate(1)).getTime();
    const periodEnd =
      period === 'DAILY'
        ? new Date(new Date().setHours(23, 59, 59, 999)).getTime()
        : new Date(
            new Date(new Date().setMonth(new Date().getMonth() + 1)).setDate(0)
          ).getTime();

    // Define free-tier limits
    const limits: Record<string, number> = {
      D1_READS: 5_000_000,
      D1_WRITES: 100_000,
      D1_STORAGE: 500 * 1024 * 1024,
      KV_READS: 100_000,
      KV_WRITES: 1_000,
      KV_STORAGE: 1024 * 1024 * 1024,
      DURABLE_OBJECT_REQUESTS: 1_000_000,
      WORKER_REQUESTS: 100_000,
      WORKER_CPU_TIME: 50,
    };

    // Convert to array format
    Object.entries(currentUsageMap).forEach(([resourceType, usageCount]) => {
      const limitTotal = limits[resourceType] || 0;
      const percentUsed = limitTotal > 0 ? (usageCount / limitTotal) * 100 : 0;

      usage.push({
        resourceType,
        usageCount,
        limitTotal,
        percentUsed,
        periodStart,
        periodEnd,
        status:
          percentUsed >= 95 ? 'CRITICAL' : percentUsed >= 80 ? 'WARNING' : 'OK',
      });
    });

    // Generate alerts for resources near limits
    const alerts: Array<{
      resourceType: string;
      message: string;
      severity: 'WARNING' | 'CRITICAL';
      recommendedAction: string;
    }> = [];

    usage.forEach(resource => {
      if (resource.percentUsed >= 95) {
        alerts.push({
          resourceType: resource.resourceType,
          message: `${
            resource.resourceType
          } usage is CRITICAL at ${resource.percentUsed.toFixed(1)}%`,
          severity: 'CRITICAL',
          recommendedAction:
            'Immediate action required. Consider upgrading to paid tier or optimizing usage.',
        });
      } else if (resource.percentUsed >= 80) {
        alerts.push({
          resourceType: resource.resourceType,
          message: `${
            resource.resourceType
          } usage is at ${resource.percentUsed.toFixed(1)}%`,
          severity: 'WARNING',
          recommendedAction:
            'Monitor closely. Consider implementing usage optimization strategies.',
        });
      }
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          usage,
          alerts,
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
    console.error('Error fetching resource usage:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch resource usage',
        },
      },
      { status: 500 }
    );
  }
}
