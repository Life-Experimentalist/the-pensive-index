/**
 * Performance Tracking Middleware
 * Feature: 003-optimize-the-platform
 *
 * Tracks request metrics for all API endpoints:
 * - Response time
 * - Cache status
 * - Error rates
 * - User types (anonymous/authenticated/admin)
 *
 * Features:
 * - Asynchronous logging (non-blocking)
 * - Batch writes to D1 (max 100 requests/batch)
 * - Automatic aggregation every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  PerformanceMetric,
  UserType,
  CacheStatus,
  HttpMethod,
} from '@/types/performance';

/**
 * Batch queue for metrics
 */
interface MetricsBatch {
  metrics: PerformanceMetric[];
  flushPromise: Promise<void> | null;
}

/**
 * Performance tracking middleware
 *
 * Usage in middleware.ts:
 * ```typescript
 * import { performanceMiddleware } from '@/middleware/performance-tracking';
 *
 * export async function middleware(request: NextRequest) {
 *   return performanceMiddleware(request, env);
 * }
 * ```
 */
export async function performanceMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>,
  env?: {
    DB?: D1Database;
  }
): Promise<NextResponse> {
  const startTime = Date.now();
  const endpoint = request.nextUrl.pathname;

  // Determine user type (simplified - enhance with actual auth)
  const userType: UserType = getUserType(request);

  let response: NextResponse;
  let statusCode = 500; // Default to error status
  let cacheStatus: CacheStatus | null = null;

  try {
    // Execute request
    response = await next();
    statusCode = response.status;

    // Extract cache status from response headers
    const cacheHeader = response.headers.get('X-Cache-Status');
    if (
      cacheHeader &&
      (cacheHeader === 'HIT' ||
        cacheHeader === 'MISS' ||
        cacheHeader === 'BYPASS' ||
        cacheHeader === 'STALE')
    ) {
      cacheStatus = cacheHeader as CacheStatus;
    }

    return response;
  } catch (error) {
    // Log error and re-throw
    statusCode = 500;
    throw error;
  } finally {
    // Calculate response time
    const responseTimeMs = Date.now() - startTime;

    // Create metric entry
    const metric: PerformanceMetric = {
      timestamp: startTime,
      endpoint,
      method: request.method as HttpMethod,
      responseTimeMs,
      statusCode,
      userType,
      cacheStatus: cacheStatus || undefined,
      metadata: {
        userAgent: request.headers.get('user-agent') || undefined,
      },
    };

    // Add to batch (async, non-blocking)
    if (env?.DB) {
      queueMetric(metric, env.DB);
    }
  }
}

// =============================================================================
// BATCHING LOGIC
// =============================================================================

const BATCH_SIZE = 100;
const BATCH_FLUSH_INTERVAL = 5000; // 5 seconds
const metricsBatch: MetricsBatch = {
  metrics: [],
  flushPromise: null,
};

/**
 * Queue metric for batched write
 */
function queueMetric(metric: PerformanceMetric, db: D1Database): void {
  metricsBatch.metrics.push(metric);

  // Flush if batch is full
  if (metricsBatch.metrics.length >= BATCH_SIZE) {
    flushMetrics(db);
  } else if (!metricsBatch.flushPromise) {
    // Schedule flush after interval
    metricsBatch.flushPromise = new Promise(resolve => {
      setTimeout(() => {
        flushMetrics(db);
        resolve();
      }, BATCH_FLUSH_INTERVAL);
    });
  }
}

/**
 * Flush metrics batch to D1
 */
async function flushMetrics(db: D1Database): Promise<void> {
  if (metricsBatch.metrics.length === 0) {
    return;
  }

  const batch = [...metricsBatch.metrics];
  metricsBatch.metrics = [];
  metricsBatch.flushPromise = null;

  try {
    // Build batch insert query
    const values = batch
      .map(m => {
        const metadata = m.metadata ? JSON.stringify(m.metadata) : null;
        const method = m.method || 'GET';
        return `(
        ${m.timestamp},
        '${m.endpoint}',
        '${method}',
        ${m.statusCode},
        ${m.responseTimeMs},
        ${m.cacheStatus ? `'${m.cacheStatus}'` : 'NULL'},
        ${m.userType ? `'${m.userType}'` : 'NULL'},
        ${metadata ? `'${metadata.replace(/'/g, "''")}'` : 'NULL'}
      )`;
      })
      .join(',\n');

    const query = `
      INSERT INTO performance_metrics (
        timestamp,
        endpoint,
        method,
        status_code,
        response_time_ms,
        cache_status,
        user_type,
        metadata
      ) VALUES ${values}
    `;

    await db.prepare(query).run();

    console.log(`[PerformanceTracking] Flushed ${batch.length} metrics to D1`);
  } catch (error) {
    console.error('[PerformanceTracking] Error flushing metrics:', error);
    // Re-queue failed metrics
    metricsBatch.metrics.unshift(...batch);
  }
}

/**
 * Force flush all pending metrics
 * Call during shutdown or testing
 */
export async function flushPendingMetrics(db: D1Database): Promise<void> {
  await flushMetrics(db);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine user type from request
 * TODO: Integrate with actual auth system
 */
function getUserType(request: NextRequest): UserType {
  // Check for authentication
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('session');

  if (!authHeader && !sessionCookie) {
    return 'ANONYMOUS';
  }

  // Check for admin role (simplified)
  const adminCookie = request.cookies.get('admin_role');
  if (adminCookie) {
    return 'ADMIN';
  }

  return 'AUTHENTICATED';
}

/**
 * Check if endpoint should be tracked
 * Skip static assets and health checks
 */
export function shouldTrackEndpoint(pathname: string): boolean {
  // Skip static assets
  if (pathname.startsWith('/_next/')) return false;
  if (pathname.startsWith('/static/')) return false;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)) {
    return false;
  }

  // Skip health checks
  if (pathname === '/health') return false;
  if (pathname === '/api/health') return false;

  return true;
}

/**
 * Enhanced middleware with endpoint filtering
 */
export async function trackPerformance(
  request: NextRequest,
  next: () => Promise<NextResponse>,
  env?: {
    DB?: D1Database;
  }
): Promise<NextResponse> {
  // Check if should track
  if (!shouldTrackEndpoint(request.nextUrl.pathname)) {
    return next();
  }

  return performanceMiddleware(request, next, env);
}

// =============================================================================
// AGGREGATION HELPERS
// =============================================================================

/**
 * Aggregate metrics into 5-minute buckets
 * Should be called by background job
 */
export async function aggregateMetrics(
  db: D1Database,
  startTime: number,
  endTime: number
): Promise<void> {
  try {
    const query = `
      INSERT INTO performance_aggregates (
        period_start,
        period_end,
        endpoint,
        request_count,
        avg_response_time,
        p50_response_time,
        p95_response_time,
        p99_response_time,
        error_count,
        cache_hit_count,
        cache_miss_count
      )
      SELECT
        ${startTime} as period_start,
        ${endTime} as period_end,
        endpoint,
        COUNT(*) as request_count,
        AVG(response_time) as avg_response_time,
        (
          SELECT response_time
          FROM performance_metrics
          WHERE timestamp >= ${startTime}
            AND timestamp < ${endTime}
            AND endpoint = pm.endpoint
          ORDER BY response_time
          LIMIT 1
          OFFSET (COUNT(*) * 0.5)
        ) as p50_response_time,
        (
          SELECT response_time
          FROM performance_metrics
          WHERE timestamp >= ${startTime}
            AND timestamp < ${endTime}
            AND endpoint = pm.endpoint
          ORDER BY response_time
          LIMIT 1
          OFFSET (COUNT(*) * 0.95)
        ) as p95_response_time,
        (
          SELECT response_time
          FROM performance_metrics
          WHERE timestamp >= ${startTime}
            AND timestamp < ${endTime}
            AND endpoint = pm.endpoint
          ORDER BY response_time
          LIMIT 1
          OFFSET (COUNT(*) * 0.99)
        ) as p99_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END) as cache_hit_count,
        SUM(CASE WHEN cache_status = 'MISS' THEN 1 ELSE 0 END) as cache_miss_count
      FROM performance_metrics pm
      WHERE timestamp >= ${startTime}
        AND timestamp < ${endTime}
      GROUP BY endpoint
    `;

    await db.prepare(query).run();

    console.log(
      `[PerformanceTracking] Aggregated metrics for ${startTime} - ${endTime}`
    );
  } catch (error) {
    console.error('[PerformanceTracking] Error aggregating metrics:', error);
  }
}

// Types for D1Database/D1PreparedStatement are provided globally in
// src/types/ambient.d.ts during the migration. Do not redeclare here.

