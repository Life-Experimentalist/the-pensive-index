/**
 * Resource Usage Monitoring Cron Job
 *
 * Runs hourly to track Cloudflare free-tier resource consumption
 * and alert when nearing limits
 *
 * @module worker/cron/resource-monitoring
 */

import { resourceUsage } from '@/lib/database/schemas/performance-schema';
import { ErrorService } from '@/lib/services/error-service';

/**
 * Cloudflare Free Tier Limits
 * https://developers.cloudflare.com/workers/platform/limits/
 */
const FREE_TIER_LIMITS = {
  // D1 Database
  d1_rows_read_daily: 5_000_000, // 5M reads/day
  d1_rows_written_daily: 100_000, // 100K writes/day
  d1_storage_mb: 500, // 500 MB total storage

  // KV Namespace
  kv_reads_daily: 100_000, // 100K reads/day
  kv_writes_daily: 1_000, // 1K writes/day
  kv_storage_mb: 1024, // 1 GB total storage

  // Durable Objects
  do_requests_daily: 1_000_000, // 1M requests/day
  do_duration_seconds_daily: 400_000, // 400K CPU seconds/day

  // Workers
  workers_requests_daily: 100_000, // 100K requests/day
  workers_cpu_ms_daily: 10_000_000, // 10M CPU ms/day (10K seconds)
} as const;

/**
 * Warning threshold (percentage of limit)
 */
const WARNING_THRESHOLD = 0.8; // 80%

/**
 * Critical threshold (percentage of limit)
 */
const CRITICAL_THRESHOLD = 0.95; // 95%

type ResourceType = keyof typeof FREE_TIER_LIMITS;

interface ResourceMetrics {
  type: ResourceType;
  current: number;
  limit: number;
  percentage: number;
  period: 'daily' | 'monthly';
}

/**
 * Get D1 database usage metrics
 *
 * @param db - D1 database instance
 * @returns D1 resource metrics
 */
async function getD1Usage(db: D1Database): Promise<ResourceMetrics[]> {
  console.log('[Resource Monitor] Checking D1 usage...');

  try {
    // Query database size (approximate)
    const sizeResult = await db
      .prepare(
        `
      SELECT SUM(pgsize) as total_bytes
      FROM dbstat
      WHERE aggregate = TRUE
    `
      )
      .first<{ total_bytes: number }>();

    const storageMB = sizeResult?.total_bytes
      ? Math.round(sizeResult.total_bytes / (1024 * 1024))
      : 0;

    // Note: D1 doesn't provide read/write counters via SQL
    // These would need to be tracked in our application code
    // For now, we'll return storage only

    return [
      {
        type: 'd1_storage_mb',
        current: storageMB,
        limit: FREE_TIER_LIMITS.d1_storage_mb,
        percentage: (storageMB / FREE_TIER_LIMITS.d1_storage_mb) * 100,
        period: 'monthly',
      },
    ];
  } catch (error) {
    console.error('[Resource Monitor] D1 usage check failed:', error);
    return [];
  }
}

/**
 * Get KV namespace usage metrics
 *
 * @param kv - KV namespace
 * @returns KV resource metrics
 */
async function getKVUsage(kv: KVNamespace): Promise<ResourceMetrics[]> {
  console.log('[Resource Monitor] Checking KV usage...');

  try {
    // KV doesn't provide built-in usage metrics
    // We need to track these in our application code
    // For now, return placeholder metrics

    // Try to get usage stats from a monitoring key
    const stats = (await kv.get('_internal:usage_stats', 'json')) as {
      reads_daily?: number;
      writes_daily?: number;
      storage_mb?: number;
    } | null;

    return [
      {
        type: 'kv_reads_daily',
        current: stats?.reads_daily || 0,
        limit: FREE_TIER_LIMITS.kv_reads_daily,
        percentage:
          ((stats?.reads_daily || 0) / FREE_TIER_LIMITS.kv_reads_daily) * 100,
        period: 'daily',
      },
      {
        type: 'kv_writes_daily',
        current: stats?.writes_daily || 0,
        limit: FREE_TIER_LIMITS.kv_writes_daily,
        percentage:
          ((stats?.writes_daily || 0) / FREE_TIER_LIMITS.kv_writes_daily) * 100,
        period: 'daily',
      },
      {
        type: 'kv_storage_mb',
        current: stats?.storage_mb || 0,
        limit: FREE_TIER_LIMITS.kv_storage_mb,
        percentage:
          ((stats?.storage_mb || 0) / FREE_TIER_LIMITS.kv_storage_mb) * 100,
        period: 'monthly',
      },
    ];
  } catch (error) {
    console.error('[Resource Monitor] KV usage check failed:', error);
    return [];
  }
}

/**
 * Get Workers usage metrics
 *
 * @param db - D1 database (to query performance_metrics table)
 * @returns Workers resource metrics
 */
async function getWorkersUsage(db: D1Database): Promise<ResourceMetrics[]> {
  console.log('[Resource Monitor] Checking Workers usage...');

  try {
    // Count requests from last 24 hours
    const requestsResult = await db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM performance_metrics
      WHERE timestamp > datetime('now', '-1 day')
    `
      )
      .first<{ count: number }>();

    const requestsDaily = requestsResult?.count || 0;

    // Estimate CPU time from response times (very approximate)
    const cpuResult = await db
      .prepare(
        `
      SELECT SUM(response_time) as total_ms
      FROM performance_metrics
      WHERE timestamp > datetime('now', '-1 day')
    `
      )
      .first<{ total_ms: number }>();

    const cpuMsDaily = cpuResult?.total_ms || 0;

    return [
      {
        type: 'workers_requests_daily',
        current: requestsDaily,
        limit: FREE_TIER_LIMITS.workers_requests_daily,
        percentage:
          (requestsDaily / FREE_TIER_LIMITS.workers_requests_daily) * 100,
        period: 'daily',
      },
      {
        type: 'workers_cpu_ms_daily',
        current: cpuMsDaily,
        limit: FREE_TIER_LIMITS.workers_cpu_ms_daily,
        percentage: (cpuMsDaily / FREE_TIER_LIMITS.workers_cpu_ms_daily) * 100,
        period: 'daily',
      },
    ];
  } catch (error) {
    console.error('[Resource Monitor] Workers usage check failed:', error);
    return [];
  }
}

/**
 * Record resource usage snapshot
 *
 * @param db - D1 database instance
 * @param metrics - Resource metrics to record
 */
async function recordUsageSnapshot(
  db: D1Database,
  metrics: ResourceMetrics[]
): Promise<void> {
  const timestamp = new Date();

  for (const metric of metrics) {
    try {
      await db
        .insert(resourceUsage)
        .values({
          timestamp,
          resourceType: metric.type,
          currentUsage: metric.current,
          limitValue: metric.limit,
          percentage: Math.round(metric.percentage * 100) / 100,
          period: metric.period,
        })
        .run();

      console.log(
        `[Resource Monitor] Recorded ${metric.type}: ${metric.current}/${
          metric.limit
        } (${metric.percentage.toFixed(1)}%)`
      );
    } catch (error) {
      console.error(
        `[Resource Monitor] Failed to record ${metric.type}:`,
        error
      );
    }
  }
}

/**
 * Check for threshold violations and log errors
 *
 * @param db - D1 database instance
 * @param errorService - Error logging service
 * @param metrics - Resource metrics to check
 */
async function checkThresholds(
  db: D1Database,
  errorService: ErrorService,
  metrics: ResourceMetrics[]
): Promise<void> {
  for (const metric of metrics) {
    const percentage = metric.percentage / 100;

    if (percentage >= CRITICAL_THRESHOLD) {
      // Critical: >= 95% usage
      await errorService.logError({
        level: 'CRITICAL',
        message: `Resource ${metric.type} at ${metric.percentage.toFixed(
          1
        )}% of limit`,
        category: 'RESOURCE_LIMIT',
        context: {
          resource: metric.type,
          current: metric.current,
          limit: metric.limit,
          percentage: metric.percentage,
          period: metric.period,
        },
      });

      console.error(
        `[Resource Monitor] CRITICAL: ${
          metric.type
        } at ${metric.percentage.toFixed(1)}%`
      );
    } else if (percentage >= WARNING_THRESHOLD) {
      // Warning: >= 80% usage
      await errorService.logError({
        level: 'WARNING',
        message: `Resource ${metric.type} at ${metric.percentage.toFixed(
          1
        )}% of limit`,
        category: 'RESOURCE_LIMIT',
        context: {
          resource: metric.type,
          current: metric.current,
          limit: metric.limit,
          percentage: metric.percentage,
          period: metric.period,
        },
      });

      console.warn(
        `[Resource Monitor] WARNING: ${
          metric.type
        } at ${metric.percentage.toFixed(1)}%`
      );
    }
  }
}

/**
 * Cleanup old usage records (older than 30 days)
 *
 * @param db - D1 database instance
 * @returns Number of records deleted
 */
async function cleanupOldUsageRecords(db: D1Database): Promise<number> {
  console.log('[Resource Monitor] Cleaning up old usage records...');

  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await db
      .prepare(
        `
      DELETE FROM resource_usage
      WHERE timestamp < ?
    `
      )
      .bind(cutoffDate.toISOString())
      .run();

    const deletedCount = result.meta.changes || 0;
    console.log(`[Resource Monitor] Deleted ${deletedCount} old records`);

    return deletedCount;
  } catch (error) {
    console.error('[Resource Monitor] Cleanup failed:', error);
    return 0;
  }
}

/**
 * Main cron handler - called by Cloudflare Workers scheduled event
 *
 * @param env - Worker environment with bindings
 */
export async function handleResourceMonitoringCron(env: {
  DB: D1Database;
  CACHE: KVNamespace;
}): Promise<void> {
  console.log('[Resource Monitoring Cron] Starting...');
  const startTime = Date.now();

  try {
    // Collect usage metrics from all sources
    const d1Metrics = await getD1Usage(env.DB);
    const kvMetrics = await getKVUsage(env.CACHE);
    const workersMetrics = await getWorkersUsage(env.DB);

    const allMetrics = [...d1Metrics, ...kvMetrics, ...workersMetrics];

    console.log(
      `[Resource Monitoring Cron] Collected ${allMetrics.length} metrics`
    );

    // Record snapshot
    await recordUsageSnapshot(env.DB, allMetrics);

    // Check thresholds and log warnings/errors
    const errorService = new ErrorService(env.DB);
    await checkThresholds(env.DB, errorService, allMetrics);

    // Cleanup old records (once per day at 4am UTC)
    const currentHour = new Date().getUTCHours();
    if (currentHour === 4) {
      await cleanupOldUsageRecords(env.DB);
    }

    const duration = Date.now() - startTime;
    console.log(`[Resource Monitoring Cron] Completed in ${duration}ms`);
  } catch (error) {
    console.error('[Resource Monitoring Cron] Failed:', error);
    throw error;
  }
}
