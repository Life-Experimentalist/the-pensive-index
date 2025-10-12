/**
 * Metrics Aggregation Cron Job
 *
 * Runs every 5 minutes to aggregate performance metrics into hourly buckets
 *
 * @module worker/cron/metrics-aggregation
 */

import { eq, and, gte, lt, sql } from 'drizzle-orm';
import { getPerformanceDatabase } from '@/lib/database/performance-db';
import {
  performanceMetrics,
  performanceAggregates,
} from '@/lib/database/schemas/performance';

/**
 * Aggregation bucket size in milliseconds
 * Default: 1 hour (3600000 ms)
 */
const BUCKET_SIZE = 60 * 60 * 1000; // 1 hour

/**
 * How far back to look for unaggregated metrics
 * Default: Last 6 hours
 */
const LOOKBACK_WINDOW = 6 * 60 * 60 * 1000; // 6 hours

interface MetricsBucket {
  bucket: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  count: number;
  p50: number;
  p95: number;
  p99: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorCount: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(
  sortedValues: number[],
  percentile: number
): number {
  if (sortedValues.length === 0) return 0;

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Aggregate metrics into hourly buckets
 *
 * @param db - D1 database instance
 * @returns Number of buckets aggregated
 */
export async function aggregateMetrics(db: D1Database): Promise<number> {
  const now = Date.now();
  const startTime = now - LOOKBACK_WINDOW;

  console.log('[Metrics Aggregation] Starting aggregation...');
  console.log(
    `[Metrics Aggregation] Time range: ${new Date(
      startTime
    ).toISOString()} - ${new Date(now).toISOString()}`
  );

  try {
    // Get unaggregated metrics from the last 6 hours
    const metrics = await db
      .select()
      .from(performanceMetrics)
      .where(
        and(
          gte(performanceMetrics.timestamp, new Date(startTime)),
          lt(performanceMetrics.timestamp, new Date(now))
        )
      )
      .all();

    console.log(
      `[Metrics Aggregation] Found ${metrics.length} metrics to aggregate`
    );

    if (metrics.length === 0) {
      return 0;
    }

    // Group metrics into buckets
    const buckets = new Map<
      string,
      {
        bucket: Date;
        endpoint: string;
        method: string;
        statusCode: number;
        responseTimes: number[];
        cacheHits: number;
        cacheMisses: number;
      }
    >();

    for (const metric of metrics) {
      // Calculate bucket timestamp (round down to nearest hour)
      const bucketTime = new Date(
        Math.floor(metric.timestamp.getTime() / BUCKET_SIZE) * BUCKET_SIZE
      );

      // Create unique key for this bucket
      const key = `${bucketTime.getTime()}-${metric.endpoint}-${
        metric.method
      }-${metric.statusCode}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          bucket: bucketTime,
          endpoint: metric.endpoint,
          method: metric.method,
          statusCode: metric.statusCode,
          responseTimes: [],
          cacheHits: 0,
          cacheMisses: 0,
        });
      }

      const bucket = buckets.get(key)!;
      bucket.responseTimes.push(metric.responseTime);

      if (metric.cacheHit) {
        bucket.cacheHits++;
      } else {
        bucket.cacheMisses++;
      }
    }

    console.log(`[Metrics Aggregation] Created ${buckets.size} buckets`);

    // Calculate aggregates for each bucket
    const aggregates: MetricsBucket[] = [];

    for (const [, bucket] of buckets) {
      // Sort response times for percentile calculation
      const sortedTimes = bucket.responseTimes.sort((a, b) => a - b);

      // Count errors (status code >= 400)
      const errorCount =
        bucket.statusCode >= 400 ? bucket.responseTimes.length : 0;

      aggregates.push({
        bucket: bucket.bucket,
        endpoint: bucket.endpoint,
        method: bucket.method,
        statusCode: bucket.statusCode,
        count: bucket.responseTimes.length,
        p50: calculatePercentile(sortedTimes, 50),
        p95: calculatePercentile(sortedTimes, 95),
        p99: calculatePercentile(sortedTimes, 99),
        avgResponseTime: Math.round(
          sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length
        ),
        maxResponseTime: sortedTimes[sortedTimes.length - 1],
        minResponseTime: sortedTimes[0],
        errorCount,
        cacheHits: bucket.cacheHits,
        cacheMisses: bucket.cacheMisses,
      });
    }

    // Insert or update aggregates in database
    let insertedCount = 0;

    for (const aggregate of aggregates) {
      try {
        // Check if aggregate already exists
        const existing = await db
          .select()
          .from(performanceAggregates)
          .where(
            and(
              eq(performanceAggregates.bucket, aggregate.bucket),
              eq(performanceAggregates.endpoint, aggregate.endpoint),
              eq(performanceAggregates.method, aggregate.method),
              eq(performanceAggregates.statusCode, aggregate.statusCode)
            )
          )
          .get();

        if (existing) {
          // Update existing aggregate (merge data)
          const newCount = existing.count + aggregate.count;
          const newAvg = Math.round(
            (existing.avgResponseTime * existing.count +
              aggregate.avgResponseTime * aggregate.count) /
              newCount
          );

          await db
            .update(performanceAggregates)
            .set({
              count: newCount,
              p50: aggregate.p50, // Use latest percentiles
              p95: aggregate.p95,
              p99: aggregate.p99,
              avgResponseTime: newAvg,
              maxResponseTime: Math.max(
                existing.maxResponseTime,
                aggregate.maxResponseTime
              ),
              minResponseTime: Math.min(
                existing.minResponseTime,
                aggregate.minResponseTime
              ),
              errorCount: existing.errorCount + aggregate.errorCount,
              cacheHits: existing.cacheHits + aggregate.cacheHits,
              cacheMisses: existing.cacheMisses + aggregate.cacheMisses,
            })
            .where(
              and(
                eq(performanceAggregates.bucket, aggregate.bucket),
                eq(performanceAggregates.endpoint, aggregate.endpoint),
                eq(performanceAggregates.method, aggregate.method),
                eq(performanceAggregates.statusCode, aggregate.statusCode)
              )
            )
            .run();

          console.log(
            `[Metrics Aggregation] Updated aggregate for ${
              aggregate.endpoint
            } (${aggregate.bucket.toISOString()})`
          );
        } else {
          // Insert new aggregate
          await db
            .insert(performanceAggregates)
            .values({
              bucket: aggregate.bucket,
              endpoint: aggregate.endpoint,
              method: aggregate.method,
              statusCode: aggregate.statusCode,
              count: aggregate.count,
              p50: aggregate.p50,
              p95: aggregate.p95,
              p99: aggregate.p99,
              avgResponseTime: aggregate.avgResponseTime,
              maxResponseTime: aggregate.maxResponseTime,
              minResponseTime: aggregate.minResponseTime,
              errorCount: aggregate.errorCount,
              cacheHits: aggregate.cacheHits,
              cacheMisses: aggregate.cacheMisses,
            })
            .run();

          insertedCount++;
          console.log(
            `[Metrics Aggregation] Inserted aggregate for ${
              aggregate.endpoint
            } (${aggregate.bucket.toISOString()})`
          );
        }
      } catch (error) {
        console.error(
          `[Metrics Aggregation] Error processing aggregate:`,
          error
        );
      }
    }

    console.log(
      `[Metrics Aggregation] Complete: ${insertedCount} new aggregates, ${
        aggregates.length - insertedCount
      } updated`
    );
    return buckets.size;
  } catch (error) {
    console.error('[Metrics Aggregation] Fatal error:', error);
    throw error;
  }
}

/**
 * Cleanup old raw metrics (older than 7 days)
 * Keeps database size under control
 *
 * @param db - D1 database instance
 * @returns Number of metrics deleted
 */
export async function cleanupOldMetrics(db: D1Database): Promise<number> {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  console.log(
    `[Metrics Cleanup] Deleting metrics older than ${cutoffDate.toISOString()}`
  );

  try {
    const result = await db
      .delete(performanceMetrics)
      .where(lt(performanceMetrics.timestamp, cutoffDate))
      .run();

    const deletedCount = result.changes || 0;
    console.log(`[Metrics Cleanup] Deleted ${deletedCount} old metrics`);

    return deletedCount;
  } catch (error) {
    console.error('[Metrics Cleanup] Error:', error);
    throw error;
  }
}

/**
 * Main cron handler - called by Cloudflare Workers scheduled event
 *
 * @param env - Worker environment with bindings
 */
export async function handleMetricsAggregationCron(env: {
  DB: D1Database;
  CACHE: KVNamespace;
}): Promise<void> {
  console.log('[Metrics Aggregation Cron] Starting...');
  const startTime = Date.now();

  try {
    // Aggregate metrics
    const bucketsCreated = await aggregateMetrics(env.DB);

    // Cleanup old metrics (run once per day, check if hour is 3am)
    const currentHour = new Date().getUTCHours();
    if (currentHour === 3) {
      await cleanupOldMetrics(env.DB);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Metrics Aggregation Cron] Completed in ${duration}ms (${bucketsCreated} buckets)`
    );
  } catch (error) {
    console.error('[Metrics Aggregation Cron] Failed:', error);
    throw error;
  }
}
