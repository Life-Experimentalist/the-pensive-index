/**
 * Analytics Aggregation Cron Job
 *
 * Runs daily to aggregate analytics events into daily summaries
 *
 * @module worker/cron/analytics-aggregation
 */

import { eq, and, gte, lt, sql } from 'drizzle-orm';
import {
  analyticsEvents,
  analyticsAggregates,
} from '@/lib/database/schemas/performance-schema';

/**
 * Aggregation bucket size in milliseconds
 * Default: 1 day (86400000 ms)
 */
const BUCKET_SIZE = 24 * 60 * 60 * 1000; // 1 day

/**
 * How far back to look for unaggregated events
 * Default: Last 3 days
 */
const LOOKBACK_WINDOW = 3 * 24 * 60 * 60 * 1000; // 3 days

interface AnalyticsBucket {
  bucket: Date;
  fandomId: number | null;
  eventType: string;
  count: number;
  uniqueUsers: number;
  avgDuration: number | null;
  conversionRate: number | null;
  topPathways: string[];
}

/**
 * Calculate conversion rate for pathway events
 *
 * @param events - Events to analyze
 * @returns Conversion rate (0-1)
 */
function calculateConversionRate(
  events: (typeof analyticsEvents.$inferSelect)[]
): number | null {
  const pathwayCreated = events.filter(
    e => e.eventType === 'pathway_created'
  ).length;
  const pathwayFinished = events.filter(
    e => e.eventType === 'pathway_finished'
  ).length;

  if (pathwayCreated === 0) return null;

  return pathwayFinished / pathwayCreated;
}

/**
 * Extract top pathways from pathway metadata
 *
 * @param events - Events with pathway metadata
 * @returns Top 5 pathway combinations
 */
function extractTopPathways(
  events: (typeof analyticsEvents.$inferSelect)[]
): string[] {
  const pathwayCounts = new Map<string, number>();

  for (const event of events) {
    if (event.metadata && typeof event.metadata === 'object') {
      const metadata = event.metadata as any;
      if (metadata.pathway) {
        const pathwayKey = JSON.stringify(metadata.pathway);
        pathwayCounts.set(pathwayKey, (pathwayCounts.get(pathwayKey) || 0) + 1);
      }
    }
  }

  // Sort by count and take top 5
  return Array.from(pathwayCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pathway]) => pathway);
}

/**
 * Aggregate analytics events into daily buckets
 *
 * @param db - D1 database instance
 * @returns Number of buckets aggregated
 */
export async function aggregateAnalytics(db: D1Database): Promise<number> {
  const now = Date.now();
  const startTime = now - LOOKBACK_WINDOW;

  console.log('[Analytics Aggregation] Starting aggregation...');
  console.log(
    `[Analytics Aggregation] Time range: ${new Date(
      startTime
    ).toISOString()} - ${new Date(now).toISOString()}`
  );

  try {
    // Get unaggregated events from the last 3 days
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.timestamp, new Date(startTime)),
          lt(analyticsEvents.timestamp, new Date(now))
        )
      )
      .all();

    console.log(
      `[Analytics Aggregation] Found ${events.length} events to aggregate`
    );

    if (events.length === 0) {
      return 0;
    }

    // Group events into buckets
    const buckets = new Map<
      string,
      {
        bucket: Date;
        fandomId: number | null;
        eventType: string;
        events: (typeof analyticsEvents.$inferSelect)[];
        userIds: Set<string>;
        durations: number[];
      }
    >();

    for (const event of events) {
      // Calculate bucket timestamp (round down to nearest day)
      const bucketTime = new Date(
        Math.floor(event.timestamp.getTime() / BUCKET_SIZE) * BUCKET_SIZE
      );

      // Create unique key for this bucket
      const key = `${bucketTime.getTime()}-${event.fandomId || 'null'}-${
        event.eventType
      }`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          bucket: bucketTime,
          fandomId: event.fandomId,
          eventType: event.eventType,
          events: [],
          userIds: new Set(),
          durations: [],
        });
      }

      const bucket = buckets.get(key)!;
      bucket.events.push(event);

      if (event.userId) {
        bucket.userIds.add(event.userId);
      }

      if (event.duration !== null) {
        bucket.durations.push(event.duration);
      }
    }

    console.log(`[Analytics Aggregation] Created ${buckets.size} buckets`);

    // Calculate aggregates for each bucket
    const aggregates: AnalyticsBucket[] = [];

    for (const [, bucket] of buckets) {
      // Calculate average duration if any durations exist
      const avgDuration =
        bucket.durations.length > 0
          ? Math.round(
              bucket.durations.reduce((sum, d) => sum + d, 0) /
                bucket.durations.length
            )
          : null;

      // Calculate conversion rate for pathway events
      const conversionRate = bucket.eventType.includes('pathway')
        ? calculateConversionRate(bucket.events)
        : null;

      // Extract top pathways if this is pathway-related
      const topPathways = bucket.eventType.includes('pathway')
        ? extractTopPathways(bucket.events)
        : [];

      aggregates.push({
        bucket: bucket.bucket,
        fandomId: bucket.fandomId,
        eventType: bucket.eventType,
        count: bucket.events.length,
        uniqueUsers: bucket.userIds.size,
        avgDuration,
        conversionRate,
        topPathways,
      });
    }

    // Insert or update aggregates in database
    let insertedCount = 0;

    for (const aggregate of aggregates) {
      try {
        // Check if aggregate already exists
        const existing = await db
          .select()
          .from(analyticsAggregates)
          .where(
            and(
              eq(analyticsAggregates.bucket, aggregate.bucket),
              aggregate.fandomId !== null
                ? eq(analyticsAggregates.fandomId, aggregate.fandomId)
                : sql`${analyticsAggregates.fandomId} IS NULL`,
              eq(analyticsAggregates.eventType, aggregate.eventType)
            )
          )
          .get();

        if (existing) {
          // Update existing aggregate (merge data)
          const newCount = existing.count + aggregate.count;
          const newUniqueUsers = existing.uniqueUsers + aggregate.uniqueUsers; // This is approximate

          // Merge avg duration
          let newAvgDuration: number | null = null;
          if (existing.avgDuration !== null && aggregate.avgDuration !== null) {
            newAvgDuration = Math.round(
              (existing.avgDuration * existing.count +
                aggregate.avgDuration * aggregate.count) /
                newCount
            );
          } else if (aggregate.avgDuration !== null) {
            newAvgDuration = aggregate.avgDuration;
          } else {
            newAvgDuration = existing.avgDuration;
          }

          // Use latest conversion rate and top pathways
          await db
            .update(analyticsAggregates)
            .set({
              count: newCount,
              uniqueUsers: newUniqueUsers,
              avgDuration: newAvgDuration,
              conversionRate:
                aggregate.conversionRate ?? existing.conversionRate,
              topPathways:
                aggregate.topPathways.length > 0
                  ? JSON.stringify(aggregate.topPathways)
                  : existing.topPathways,
            })
            .where(
              and(
                eq(analyticsAggregates.bucket, aggregate.bucket),
                aggregate.fandomId !== null
                  ? eq(analyticsAggregates.fandomId, aggregate.fandomId)
                  : sql`${analyticsAggregates.fandomId} IS NULL`,
                eq(analyticsAggregates.eventType, aggregate.eventType)
              )
            )
            .run();

          console.log(
            `[Analytics Aggregation] Updated aggregate for ${
              aggregate.eventType
            } (${aggregate.bucket.toISOString()})`
          );
        } else {
          // Insert new aggregate
          await db
            .insert(analyticsAggregates)
            .values({
              bucket: aggregate.bucket,
              fandomId: aggregate.fandomId,
              eventType: aggregate.eventType,
              count: aggregate.count,
              uniqueUsers: aggregate.uniqueUsers,
              avgDuration: aggregate.avgDuration,
              conversionRate: aggregate.conversionRate,
              topPathways:
                aggregate.topPathways.length > 0
                  ? JSON.stringify(aggregate.topPathways)
                  : null,
            })
            .run();

          insertedCount++;
          console.log(
            `[Analytics Aggregation] Inserted aggregate for ${
              aggregate.eventType
            } (${aggregate.bucket.toISOString()})`
          );
        }
      } catch (error) {
        console.error(
          `[Analytics Aggregation] Error processing aggregate:`,
          error
        );
      }
    }

    console.log(
      `[Analytics Aggregation] Complete: ${insertedCount} new aggregates, ${
        aggregates.length - insertedCount
      } updated`
    );
    return buckets.size;
  } catch (error) {
    console.error('[Analytics Aggregation] Fatal error:', error);
    throw error;
  }
}

/**
 * Cleanup old raw events (older than 30 days)
 * Keeps database size under control
 *
 * @param db - D1 database instance
 * @returns Number of events deleted
 */
export async function cleanupOldEvents(db: D1Database): Promise<number> {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  console.log(
    `[Analytics Cleanup] Deleting events older than ${cutoffDate.toISOString()}`
  );

  try {
    const result = await db
      .delete(analyticsEvents)
      .where(lt(analyticsEvents.timestamp, cutoffDate))
      .run();

    const deletedCount = result.changes || 0;
    console.log(`[Analytics Cleanup] Deleted ${deletedCount} old events`);

    return deletedCount;
  } catch (error) {
    console.error('[Analytics Cleanup] Error:', error);
    throw error;
  }
}

/**
 * Main cron handler - called by Cloudflare Workers scheduled event
 *
 * @param env - Worker environment with bindings
 */
export async function handleAnalyticsAggregationCron(env: {
  DB: D1Database;
  CACHE: KVNamespace;
}): Promise<void> {
  console.log('[Analytics Aggregation Cron] Starting...');
  const startTime = Date.now();

  try {
    // Aggregate analytics
    const bucketsCreated = await aggregateAnalytics(env.DB);

    // Cleanup old events (30+ days old)
    const deletedCount = await cleanupOldEvents(env.DB);

    const duration = Date.now() - startTime;
    console.log(
      `[Analytics Aggregation Cron] Completed in ${duration}ms (${bucketsCreated} buckets, ${deletedCount} deleted)`
    );
  } catch (error) {
    console.error('[Analytics Aggregation Cron] Failed:', error);
    throw error;
  }
}
