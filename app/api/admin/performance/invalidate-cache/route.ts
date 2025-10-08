/**
 * Cache Invalidation API
 *
 * Admin endpoint for manually invalidating cache entries.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { KVCacheService } from '@/lib/cache/cache-service';
import {
  getPerformanceKV,
  getPerformanceDatabase,
} from '@/lib/database/performance-db';

// Request validation schema
const InvalidateCacheSchema = z
  .object({
    type: z.enum(['KEY', 'TAG', 'PREFIX', 'FULL']),
    target: z.string().min(1, 'Target is required'),
    reason: z.string().optional(),
  })
  .refine(
    data => {
      // FULL invalidation must have a reason
      if (data.type === 'FULL' && !data.reason) {
        return false;
      }
      return true;
    },
    {
      message: 'Reason is required for FULL cache invalidation',
      path: ['reason'],
    }
  );

// Initialize services
const adminModel = AdminUserModel.getInstance();

/**
 * POST /api/admin/performance/invalidate-cache
 * Manually invalidate cache entries
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = InvalidateCacheSchema.safeParse(body);

    if (!validationResult.success) {
      const error = validationResult.error.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: error.message,
            details: {
              field: error.path.join('.'),
            },
          },
        },
        { status: 400 }
      );
    }

    const { type, target, reason } = validationResult.data;

    // Authorization check based on invalidation type
    if (type === 'FULL') {
      // FULL invalidation requires ProjectAdmin role
      const hasPermission = await adminModel.hasPermission(
        currentUserId,
        'MANAGE_SYSTEM_SETTINGS'
      );

      if (!hasPermission) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only ProjectAdmins can perform full cache invalidation',
              requiredRole: 'ProjectAdmin',
            },
          },
          { status: 403 }
        );
      }
    } else {
      // Other types require admin role
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
    }

    // Initialize cache service
    const kv = getPerformanceKV();
    const db = getPerformanceDatabase();

    // If KV is not available (development), return mock response
    if (!kv) {
      console.warn(
        '[Cache] KV namespace not available - skipping invalidation'
      );
      return NextResponse.json(
        {
          success: true,
          data: {
            invalidated: 0,
            target,
            timestamp: Math.floor(Date.now() / 1000),
            auditId: 0,
          },
        },
        {
          status: 200,
          headers: {
            'X-Response-Time': `${Date.now() - startTime}ms`,
            'X-Cache-Available': 'false',
          },
        }
      );
    }

    const cacheService = new KVCacheService(kv);

    // Perform cache invalidation based on type
    let invalidated = 0;
    let auditId = 0;

    try {
      switch (type) {
        case 'KEY':
          await cacheService.invalidate(target);
          invalidated = 1;
          break;

        case 'TAG':
          invalidated = await cacheService.invalidateByTag(target);
          break;

        case 'PREFIX':
          invalidated = await cacheService.invalidateByPrefix(target);
          break;

        case 'FULL':
          // Delete all cache keys (dangerous - requires reason)
          invalidated = await cacheService.invalidateByPrefix('');
          break;
      }

      // Log invalidation to database for audit trail
      await db
        .prepare(
          `
          INSERT INTO cache_invalidations (
            timestamp,
            invalidation_type,
            invalidation_target,
            reason,
            admin_id,
            affected_keys_count
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          Math.floor(Date.now() / 1000),
          type,
          target,
          reason || null,
          currentUserId,
          invalidated
        )
        .run();

      const auditResult = await db
        .prepare(
          `
          SELECT id FROM cache_invalidations
          WHERE admin_id = ? AND timestamp >= ?
          ORDER BY timestamp DESC
          LIMIT 1
        `
        )
        .bind(currentUserId, Math.floor(Date.now() / 1000) - 1)
        .first<{ id: number }>();

      auditId = auditResult?.id || 0;
    } catch (error) {
      console.error('[Cache] Invalidation error:', error);
      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALIDATION_FAILED',
            message: 'Failed to invalidate cache',
          },
        },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          invalidated,
          target,
          timestamp: Math.floor(Date.now() / 1000),
          auditId,
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
    console.error('Error invalidating cache:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to invalidate cache',
        },
      },
      { status: 500 }
    );
  }
}
