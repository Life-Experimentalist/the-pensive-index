/**
 * Analytics Tracking Service
 * Feature: 003-optimize-the-platform
 *
 * Privacy-respecting analytics tracking
 *
 * Features:
 * - Track user events (search, pathway creation, story views)
 * - Anonymized session IDs (no PII)
 * - Batch writes to D1
 * - Privacy-first design (GDPR compliant)
 */

import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsAggregate,
  PeriodType,
  AnalyticsQueryParams,
} from '@/types/performance';
import { createHash } from 'crypto';

/**
 * Event batching configuration
 */
const BATCH_SIZE = 50;
const BATCH_FLUSH_INTERVAL = 10000; // 10 seconds

/**
 * Event batch
 */
interface EventBatch {
  events: AnalyticsEvent[];
  flushPromise: Promise<void> | null;
}

/**
 * Analytics Tracking Service
 */
export class AnalyticsService {
  private eventBatch: EventBatch = {
    events: [],
    flushPromise: null,
  };

  constructor(private db: D1Database) {}

  /**
   * Track an analytics event
   * Non-blocking - queues for batch write
   */
  trackEvent(
    eventType: AnalyticsEventType,
    fandomId: number | null,
    metadata?: Record<string, unknown>,
    ipAddress?: string
  ): void {
    // Generate anonymized session ID
    const sessionId = this.generateSessionId(ipAddress);

    // Strip PII from metadata
    const sanitizedMetadata = this.stripPII(metadata || {});

    const event: AnalyticsEvent = {
      timestamp: Date.now(),
      eventType,
      sessionId,
      fandomId: fandomId || undefined,
      metadata: sanitizedMetadata,
    };

    // Add to batch
    this.queueEvent(event);
  }

  /**
   * Get analytics events with filters
   */
  async getEvents(params: AnalyticsQueryParams): Promise<AnalyticsEvent[]> {
    const { start, end, eventType, fandomId } = params;

    let query = `
      SELECT
        id,
        timestamp,
        event_type as eventType,
        session_id as sessionId,
        fandom_id as fandomId,
        metadata
      FROM analytics_events
      WHERE timestamp >= ? AND timestamp < ?
    `;

    const bindings: (number | string)[] = [start, end];

    if (eventType) {
      query += ' AND event_type = ?';
      bindings.push(eventType);
    }

    if (fandomId) {
      query += ' AND fandom_id = ?';
      bindings.push(fandomId);
    }

    query += ' ORDER BY timestamp DESC LIMIT 1000';

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<AnalyticsEvent & { metadata?: string }>();

    return (result.results || []).map(event => ({
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
    }));
  }

  /**
   * Get aggregated analytics for a time period
   */
  async getAggregates(
    params: AnalyticsQueryParams
  ): Promise<AnalyticsAggregate[]> {
    const {
      start,
      end,
      eventType,
      fandomId,
      aggregationLevel = 'DAY',
    } = params;

    let query = `
      SELECT
        id,
        period_type as periodType,
        period_start as periodStart,
        period_end as periodEnd,
        fandom_id as fandomId,
        event_type as eventType,
        event_count as eventCount,
        unique_sessions as uniqueSessions,
        metadata
      FROM analytics_aggregates
      WHERE period_start >= ? AND period_end <= ?
        AND period_type = ?
    `;

    const bindings: (number | string)[] = [start, end, aggregationLevel];

    if (eventType) {
      query += ' AND event_type = ?';
      bindings.push(eventType);
    }

    if (fandomId) {
      query += ' AND fandom_id = ?';
      bindings.push(fandomId);
    }

    query += ' ORDER BY period_start DESC';

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<AnalyticsAggregate & { metadata?: string }>();

    return (result.results || []).map(agg => ({
      ...agg,
      metadata: agg.metadata ? JSON.parse(agg.metadata) : undefined,
    }));
  }

  /**
   * Aggregate events into time periods
   * Called by background cron job
   */
  async aggregateEvents(
    periodType: PeriodType,
    periodStart: number,
    periodEnd: number
  ): Promise<void> {
    // Check if already aggregated
    const existing = await this.db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM analytics_aggregates
        WHERE period_type = ? AND period_start = ?
      `
      )
      .bind(periodType, periodStart)
      .first<{ count: number }>();

    if (existing && existing.count > 0) {
      console.log(
        `[Analytics] Period ${periodType} ${periodStart} already aggregated`
      );
      return;
    }

    // Aggregate by event type and fandom
    const query = `
      INSERT INTO analytics_aggregates (
        period_type,
        period_start,
        period_end,
        fandom_id,
        event_type,
        event_count,
        unique_sessions
      )
      SELECT
        ? as period_type,
        ? as period_start,
        ? as period_end,
        fandom_id,
        event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM analytics_events
      WHERE timestamp >= ? AND timestamp < ?
      GROUP BY fandom_id, event_type
    `;

    await this.db
      .prepare(query)
      .bind(periodType, periodStart, periodEnd, periodStart, periodEnd)
      .run();

    console.log(
      `[Analytics] Aggregated ${periodType} for ${periodStart}-${periodEnd}`
    );
  }

  /**
   * Delete old raw events (retention: 90 days)
   * Keep aggregates forever
   */
  async cleanupOldEvents(retentionDays: number = 90): Promise<number> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const result = await this.db
      .prepare('DELETE FROM analytics_events WHERE timestamp < ?')
      .bind(cutoff)
      .run();

    console.log(`[Analytics] Deleted ${result.meta?.changes || 0} old events`);
    return result.meta?.changes || 0;
  }

  /**
   * Force flush pending events
   */
  async flush(): Promise<void> {
    await this.flushEvents();
  }

  // =============================================================================
  // PRIVACY HELPERS
  // =============================================================================

  /**
   * Generate anonymized session ID from IP address
   * Uses cryptographic hash to prevent reverse lookup
   */
  generateSessionId(ipAddress?: string): string {
    if (!ipAddress) {
      // Generate random session ID
      return createHash('sha256')
        .update(String(Date.now()) + String(Math.random()))
        .digest('hex')
        .substring(0, 16);
    }

    // Hash IP + date (changes daily) for privacy
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const salt = 'pensive-index-analytics'; // Application salt

    return createHash('sha256')
      .update(`${ipAddress}:${date}:${salt}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Strip personally identifiable information from data
   */
  stripPII(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };

    // Remove common PII fields
    const piiFields = [
      'email',
      'name',
      'firstName',
      'lastName',
      'phone',
      'address',
      'userId',
      'username',
      'ip',
      'ipAddress',
      'userAgent',
    ];

    for (const field of piiFields) {
      delete sanitized[field];
    }

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.stripPII(value as Record<string, unknown>);
      }
    }

    return sanitized;
  }

  // =============================================================================
  // BATCHING LOGIC
  // =============================================================================

  /**
   * Queue event for batched write
   */
  private queueEvent(event: AnalyticsEvent): void {
    this.eventBatch.events.push(event);

    // Flush if batch is full
    if (this.eventBatch.events.length >= BATCH_SIZE) {
      this.flushEvents();
    } else if (!this.eventBatch.flushPromise) {
      // Schedule flush after interval
      this.eventBatch.flushPromise = new Promise(resolve => {
        setTimeout(() => {
          this.flushEvents();
          resolve();
        }, BATCH_FLUSH_INTERVAL);
      });
    }
  }

  /**
   * Flush events batch to D1
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBatch.events.length === 0) {
      return;
    }

    const batch = [...this.eventBatch.events];
    this.eventBatch.events = [];
    this.eventBatch.flushPromise = null;

    try {
      // Build batch insert
      const values = batch
        .map(e => {
          const metadata = e.metadata ? JSON.stringify(e.metadata) : null;
          return `(
          ${e.timestamp},
          '${e.eventType}',
          '${e.sessionId}',
          ${e.fandomId || 'NULL'},
          ${metadata ? `'${metadata.replace(/'/g, "''")}'` : 'NULL'}
        )`;
        })
        .join(',\n');

      const query = `
        INSERT INTO analytics_events (
          timestamp,
          event_type,
          session_id,
          fandom_id,
          metadata
        ) VALUES ${values}
      `;

      await this.db.prepare(query).run();

      console.log(`[Analytics] Flushed ${batch.length} events to D1`);
    } catch (error) {
      console.error('[Analytics] Error flushing events:', error);
      // Re-queue failed events
      this.eventBatch.events.unshift(...batch);
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let analyticsServiceInstance: AnalyticsService | null = null;

/**
 * Initialize analytics service
 */
export function initAnalyticsService(db: D1Database): void {
  analyticsServiceInstance = new AnalyticsService(db);
}

/**
 * Get analytics service instance
 */
export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    throw new Error('AnalyticsService not initialized');
  }
  return analyticsServiceInstance;
}

/**
 * Convenience function for tracking events
 */
export function trackEvent(
  eventType: AnalyticsEventType,
  fandomId: number | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string
): void {
  try {
    const service = getAnalyticsService();
    service.trackEvent(eventType, fandomId, metadata, ipAddress);
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
    // Don't throw - analytics failures shouldn't break app
  }
}

// Types for D1Database/D1PreparedStatement are provided globally in
// src/types/ambient.d.ts during the migration. Do not redeclare here.

