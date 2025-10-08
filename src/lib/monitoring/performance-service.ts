/**
 * Performance Metrics Service
 * Feature: 003-optimize-the-platform
 *
 * Service for querying and aggregating performance data
 *
 * Features:
 * - Query metrics with time range and filters
 * - Get slow queries (>threshold)
 * - Aggregate raw metrics into 5-minute buckets
 * - Fast queries using pre-aggregated data
 */

import type {
  PerformanceMetric,
  PerformanceAggregate,
  QueryPerformanceLog,
  MetricsQueryParams,
  TimeRangeFilter,
} from '@/types/performance';

/**
 * Metrics summary response
 */
export interface MetricsSummary {
  totalRequests: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  endpointBreakdown: Array<{
    endpoint: string;
    requestCount: number;
    avgResponseTime: number;
    errorCount: number;
  }>;
}

/**
 * Performance Metrics Service
 */
export class PerformanceMetricsService {
  constructor(private db: D1Database) {}

  /**
   * Get metrics summary for a time range
   * Uses pre-aggregated data for performance
   */
  async getMetrics(params: MetricsQueryParams): Promise<MetricsSummary> {
    const { start, end, endpoint, userType, groupBy } = params;

    // Validate time range (max 30 days)
    const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    if (end - start > maxRange) {
      throw new Error('Time range cannot exceed 30 days');
    }

    // Use aggregates if available (faster), otherwise raw metrics
    const useAggregates = this.shouldUseAggregates(start, end);

    if (useAggregates) {
      return this.getMetricsFromAggregates(params);
    }

    return this.getMetricsFromRaw(params);
  }

  /**
   * Get slow queries (response time > threshold)
   */
  async getSlowQueries(
    threshold: number = 100,
    limit: number = 100
  ): Promise<QueryPerformanceLog[]> {
    const query = `
      SELECT
        id,
        timestamp,
        query_type as queryType,
        query_text as queryText,
        execution_time_ms as executionTimeMs,
        rows_affected as rowsAffected,
        endpoint,
        metadata
      FROM query_performance_logs
      WHERE execution_time_ms > ?
      ORDER BY execution_time_ms DESC
      LIMIT ?
    `;

    const result = await this.db
      .prepare(query)
      .bind(threshold, limit)
      .all<QueryPerformanceLog>();

    return (result.results || []).map(row => ({
      ...row,
      metadata: row.metadata
        ? JSON.parse(row.metadata as unknown as string)
        : undefined,
    }));
  }

  /**
   * Aggregate raw metrics into 5-minute buckets
   * Called by background cron job
   */
  async aggregateMetrics(
    periodStart: number,
    periodEnd: number
  ): Promise<void> {
    // Check if already aggregated
    const existing = await this.db
      .prepare(
        'SELECT COUNT(*) as count FROM performance_aggregates WHERE period_start = ?'
      )
      .bind(periodStart)
      .first<{ count: number }>();

    if (existing && existing.count > 0) {
      console.log(
        `[PerformanceMetrics] Period ${periodStart} already aggregated`
      );
      return;
    }

    // Aggregate by endpoint
    const aggregateQuery = `
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
        ? as period_start,
        ? as period_end,
        endpoint,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time,
        (
          SELECT response_time_ms
          FROM performance_metrics pm2
          WHERE pm2.endpoint = pm.endpoint
            AND pm2.timestamp >= ?
            AND pm2.timestamp < ?
          ORDER BY response_time_ms
          LIMIT 1 OFFSET (
            SELECT CAST(COUNT(*) * 0.5 AS INTEGER)
            FROM performance_metrics pm3
            WHERE pm3.endpoint = pm.endpoint
              AND pm3.timestamp >= ?
              AND pm3.timestamp < ?
          )
        ) as p50_response_time,
        (
          SELECT response_time_ms
          FROM performance_metrics pm2
          WHERE pm2.endpoint = pm.endpoint
            AND pm2.timestamp >= ?
            AND pm2.timestamp < ?
          ORDER BY response_time_ms
          LIMIT 1 OFFSET (
            SELECT CAST(COUNT(*) * 0.95 AS INTEGER)
            FROM performance_metrics pm3
            WHERE pm3.endpoint = pm.endpoint
              AND pm3.timestamp >= ?
              AND pm3.timestamp < ?
          )
        ) as p95_response_time,
        (
          SELECT response_time_ms
          FROM performance_metrics pm2
          WHERE pm2.endpoint = pm.endpoint
            AND pm2.timestamp >= ?
            AND pm2.timestamp < ?
          ORDER BY response_time_ms
          LIMIT 1 OFFSET (
            SELECT CAST(COUNT(*) * 0.99 AS INTEGER)
            FROM performance_metrics pm3
            WHERE pm3.endpoint = pm.endpoint
              AND pm3.timestamp >= ?
              AND pm3.timestamp < ?
          )
        ) as p99_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END) as cache_hit_count,
        SUM(CASE WHEN cache_status = 'MISS' THEN 1 ELSE 0 END) as cache_miss_count
      FROM performance_metrics pm
      WHERE timestamp >= ?
        AND timestamp < ?
      GROUP BY endpoint
    `;

    await this.db
      .prepare(aggregateQuery)
      .bind(
        periodStart,
        periodEnd,
        periodStart,
        periodEnd,
        periodStart,
        periodEnd,
        periodStart,
        periodEnd,
        periodStart,
        periodEnd,
        periodStart,
        periodEnd,
        periodStart,
        periodEnd,
        periodStart,
        periodEnd
      )
      .run();

    console.log(
      `[PerformanceMetrics] Aggregated metrics for period ${periodStart}-${periodEnd}`
    );
  }

  /**
   * Delete old raw metrics (retention policy)
   * Keep aggregates forever, delete raw metrics after 7 days
   */
  async cleanupOldMetrics(retentionDays: number = 7): Promise<number> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const result = await this.db
      .prepare('DELETE FROM performance_metrics WHERE timestamp < ?')
      .bind(cutoff)
      .run();

    console.log(
      `[PerformanceMetrics] Deleted ${result.meta?.changes || 0} old metrics`
    );
    return result.meta?.changes || 0;
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  /**
   * Determine if we should use aggregates or raw data
   */
  private shouldUseAggregates(start: number, end: number): boolean {
    // Use aggregates if range is > 1 hour
    const oneHour = 60 * 60 * 1000;
    return end - start > oneHour;
  }

  /**
   * Get metrics from pre-aggregated data
   */
  private async getMetricsFromAggregates(
    params: MetricsQueryParams
  ): Promise<MetricsSummary> {
    const { start, end, endpoint } = params;

    let query = `
      SELECT
        SUM(request_count) as totalRequests,
        AVG(avg_response_time) as avgResponseTime,
        AVG(p50_response_time) as p50ResponseTime,
        AVG(p95_response_time) as p95ResponseTime,
        AVG(p99_response_time) as p99ResponseTime,
        SUM(error_count) as errorCount,
        SUM(cache_hit_count) as cacheHits,
        SUM(cache_miss_count) as cacheMisses,
        endpoint,
        SUM(request_count) as requestCount,
        SUM(error_count) as endpointErrorCount
      FROM performance_aggregates
      WHERE period_start >= ? AND period_end <= ?
    `;

    const bindings: (number | string)[] = [start, end];

    if (endpoint) {
      query += ' AND endpoint = ?';
      bindings.push(endpoint);
    }

    query += ' GROUP BY endpoint';

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<{
        totalRequests: number;
        avgResponseTime: number;
        p50ResponseTime: number;
        p95ResponseTime: number;
        p99ResponseTime: number;
        errorCount: number;
        cacheHits: number;
        cacheMisses: number;
        endpoint: string;
        requestCount: number;
        endpointErrorCount: number;
      }>();

    const rows = result.results || [];

    // Calculate totals
    const totalRequests = rows.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalErrors = rows.reduce((sum, r) => sum + r.errorCount, 0);
    const totalCacheHits = rows.reduce((sum, r) => sum + r.cacheHits, 0);
    const totalCacheMisses = rows.reduce((sum, r) => sum + r.cacheMisses, 0);

    return {
      totalRequests,
      avgResponseTime:
        rows.length > 0
          ? rows.reduce((sum, r) => sum + r.avgResponseTime, 0) / rows.length
          : 0,
      p50ResponseTime:
        rows.length > 0
          ? rows.reduce((sum, r) => sum + r.p50ResponseTime, 0) / rows.length
          : 0,
      p95ResponseTime:
        rows.length > 0
          ? rows.reduce((sum, r) => sum + r.p95ResponseTime, 0) / rows.length
          : 0,
      p99ResponseTime:
        rows.length > 0
          ? rows.reduce((sum, r) => sum + r.p99ResponseTime, 0) / rows.length
          : 0,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      cacheHitRate:
        totalCacheHits + totalCacheMisses > 0
          ? totalCacheHits / (totalCacheHits + totalCacheMisses)
          : 0,
      endpointBreakdown: rows.map(r => ({
        endpoint: r.endpoint,
        requestCount: r.requestCount,
        avgResponseTime: r.avgResponseTime,
        errorCount: r.endpointErrorCount,
      })),
    };
  }

  /**
   * Get metrics from raw performance data
   */
  private async getMetricsFromRaw(
    params: MetricsQueryParams
  ): Promise<MetricsSummary> {
    const { start, end, endpoint, userType } = params;

    let query = `
      SELECT
        COUNT(*) as totalRequests,
        AVG(response_time_ms) as avgResponseTime,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errorCount,
        SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END) as cacheHits,
        SUM(CASE WHEN cache_status = 'MISS' THEN 1 ELSE 0 END) as cacheMisses
      FROM performance_metrics
      WHERE timestamp >= ? AND timestamp < ?
    `;

    const bindings: (number | string)[] = [start, end];

    if (endpoint) {
      query += ' AND endpoint = ?';
      bindings.push(endpoint);
    }

    if (userType) {
      query += ' AND user_type = ?';
      bindings.push(userType);
    }

    const summary = await this.db
      .prepare(query)
      .bind(...bindings)
      .first<{
        totalRequests: number;
        avgResponseTime: number;
        errorCount: number;
        cacheHits: number;
        cacheMisses: number;
      }>();

    if (!summary) {
      return this.emptyMetricsSummary();
    }

    // Get percentiles (separate queries for performance)
    const percentiles = await this.getPercentilesFromRaw(
      start,
      end,
      endpoint,
      userType
    );

    // Get endpoint breakdown
    const endpointBreakdown = await this.getEndpointBreakdownFromRaw(
      start,
      end,
      userType
    );

    return {
      totalRequests: summary.totalRequests,
      avgResponseTime: summary.avgResponseTime,
      p50ResponseTime: percentiles.p50,
      p95ResponseTime: percentiles.p95,
      p99ResponseTime: percentiles.p99,
      errorRate:
        summary.totalRequests > 0
          ? summary.errorCount / summary.totalRequests
          : 0,
      cacheHitRate:
        summary.cacheHits + summary.cacheMisses > 0
          ? summary.cacheHits / (summary.cacheHits + summary.cacheMisses)
          : 0,
      endpointBreakdown,
    };
  }

  /**
   * Get percentiles from raw data
   */
  private async getPercentilesFromRaw(
    start: number,
    end: number,
    endpoint?: string,
    userType?: string
  ): Promise<{ p50: number; p95: number; p99: number }> {
    let query = `
      SELECT response_time_ms
      FROM performance_metrics
      WHERE timestamp >= ? AND timestamp < ?
    `;

    const bindings: (number | string)[] = [start, end];

    if (endpoint) {
      query += ' AND endpoint = ?';
      bindings.push(endpoint);
    }

    if (userType) {
      query += ' AND user_type = ?';
      bindings.push(userType);
    }

    query += ' ORDER BY response_time_ms';

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<{ response_time_ms: number }>();
    const times = (result.results || []).map(r => r.response_time_ms);

    if (times.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    return {
      p50: times[Math.floor(times.length * 0.5)] || 0,
      p95: times[Math.floor(times.length * 0.95)] || 0,
      p99: times[Math.floor(times.length * 0.99)] || 0,
    };
  }

  /**
   * Get endpoint breakdown from raw data
   */
  private async getEndpointBreakdownFromRaw(
    start: number,
    end: number,
    userType?: string
  ): Promise<
    Array<{
      endpoint: string;
      requestCount: number;
      avgResponseTime: number;
      errorCount: number;
    }>
  > {
    let query = `
      SELECT
        endpoint,
        COUNT(*) as requestCount,
        AVG(response_time_ms) as avgResponseTime,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errorCount
      FROM performance_metrics
      WHERE timestamp >= ? AND timestamp < ?
    `;

    const bindings: (number | string)[] = [start, end];

    if (userType) {
      query += ' AND user_type = ?';
      bindings.push(userType);
    }

    query += ' GROUP BY endpoint ORDER BY requestCount DESC LIMIT 20';

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<{
        endpoint: string;
        requestCount: number;
        avgResponseTime: number;
        errorCount: number;
      }>();

    return result.results || [];
  }

  /**
   * Return empty metrics summary
   */
  private emptyMetricsSummary(): MetricsSummary {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      endpointBreakdown: [],
    };
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
}

interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  error?: string;
  meta?: {
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
}
