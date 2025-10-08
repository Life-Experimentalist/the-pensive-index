/**
 * Drizzle ORM Schema: Performance Optimization Tables
 * Feature: 003-optimize-the-platform
 *
 * Schema definitions for performance monitoring, caching, analytics, and rate limiting.
 * Matches SQL migration 009_performance_optimization.sql
 */

import {
  sqliteTable,
  integer,
  text,
  real,
  index,
} from 'drizzle-orm/sqlite-core';

// =============================================================================
// PERFORMANCE METRICS & MONITORING
// =============================================================================

/**
 * Raw request performance data
 * Retention: 30 days raw, aggregated forever
 */
export const performanceMetrics = sqliteTable(
  'performance_metrics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(), // Unix timestamp
    endpoint: text('endpoint').notNull(), // e.g., '/api/search', '/fandom/harry-potter'
    method: text('method').notNull(), // GET, POST, PUT, DELETE, PATCH
    statusCode: integer('status_code').notNull(), // HTTP status code
    responseTimeMs: integer('response_time_ms').notNull(), // Total request duration
    cacheStatus: text('cache_status'), // HIT, MISS, BYPASS, STALE
    userType: text('user_type'), // ANONYMOUS, AUTHENTICATED, ADMIN
    errorMessage: text('error_message'), // If status >= 400
    metadata: text('metadata'), // JSON-encoded additional data
  },
  table => ({
    timestampIdx: index('idx_perf_metrics_timestamp').on(table.timestamp),
    endpointIdx: index('idx_perf_metrics_endpoint').on(table.endpoint),
    statusCodeIdx: index('idx_perf_metrics_status').on(table.statusCode),
    cacheStatusIdx: index('idx_perf_metrics_cache').on(table.cacheStatus),
    compositeQueryIdx: index('idx_perf_metrics_query').on(
      table.timestamp,
      table.endpoint,
      table.userType
    ),
  })
);

/**
 * Pre-aggregated performance metrics for dashboard queries
 * Retention: Forever (rolled up from raw metrics)
 */
export const performanceAggregates = sqliteTable(
  'performance_aggregates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodStart: integer('period_start', { mode: 'timestamp' }).notNull(), // 5-minute bucket start
    periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
    endpoint: text('endpoint').notNull(),
    totalRequests: integer('total_requests').notNull().default(0),
    avgResponseTimeMs: real('avg_response_time_ms').notNull(),
    p50ResponseTimeMs: real('p50_response_time_ms').notNull(), // Median
    p95ResponseTimeMs: real('p95_response_time_ms').notNull(), // 95th percentile
    p99ResponseTimeMs: real('p99_response_time_ms').notNull(), // 99th percentile
    errorCount: integer('error_count').notNull().default(0),
    cacheHitCount: integer('cache_hit_count').notNull().default(0),
    cacheMissCount: integer('cache_miss_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  table => ({
    periodStartIdx: index('idx_perf_agg_period_start').on(table.periodStart),
    endpointIdx: index('idx_perf_agg_endpoint').on(table.endpoint),
    compositeQueryIdx: index('idx_perf_agg_query').on(
      table.periodStart,
      table.endpoint
    ),
  })
);

/**
 * Slow query tracking for database optimization
 * Retention: 30 days
 */
export const queryPerformanceLogs = sqliteTable(
  'query_performance_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
    queryText: text('query_text').notNull(),
    executionTimeMs: integer('execution_time_ms').notNull(),
    endpoint: text('endpoint'), // Where query was called
    indexUsed: text('index_used'), // From EXPLAIN QUERY PLAN
    rowsScanned: integer('rows_scanned'),
    metadata: text('metadata'), // JSON-encoded
  },
  table => ({
    timestampIdx: index('idx_query_log_timestamp').on(table.timestamp),
    executionTimeIdx: index('idx_query_log_exec_time').on(
      table.executionTimeMs
    ),
  })
);

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Rate limit violation tracking
 * Retention: 30 days
 */
export const rateLimitViolations = sqliteTable(
  'rate_limit_violations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
    identifier: text('identifier').notNull(), // IP address or user ID
    endpoint: text('endpoint').notNull(),
    limitType: text('limit_type').notNull(), // ANONYMOUS, AUTHENTICATED, ADMIN
    limitValue: integer('limit_value').notNull(), // Requests per minute
    violationCount: integer('violation_count').notNull().default(1),
    metadata: text('metadata'), // JSON-encoded
  },
  table => ({
    timestampIdx: index('idx_rate_limit_timestamp').on(table.timestamp),
    identifierIdx: index('idx_rate_limit_identifier').on(table.identifier),
  })
);

// =============================================================================
// ANALYTICS (Privacy-Respecting)
// =============================================================================

/**
 * Privacy-respecting analytics events
 * NO PII: No IP addresses, no user IDs for anonymous users
 * Retention: 90 days raw, forever aggregated
 */
export const analyticsEvents = sqliteTable(
  'analytics_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
    eventType: text('event_type').notNull(), // PAGE_VIEW, SEARCH_PERFORMED, etc.
    fandomId: integer('fandom_id'),
    sessionId: text('session_id').notNull(), // Anonymized hash
    referrer: text('referrer'),
    metadata: text('metadata'), // JSON-encoded (no PII!)
  },
  table => ({
    timestampIdx: index('idx_analytics_timestamp').on(table.timestamp),
    eventTypeIdx: index('idx_analytics_event_type').on(table.eventType),
    fandomIdx: index('idx_analytics_fandom').on(table.fandomId),
    compositeQueryIdx: index('idx_analytics_query').on(
      table.timestamp,
      table.eventType,
      table.fandomId
    ),
  })
);

/**
 * Pre-computed analytics aggregates
 * Retention: Forever
 */
export const analyticsAggregates = sqliteTable(
  'analytics_aggregates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodType: text('period_type').notNull(), // DAILY, WEEKLY, MONTHLY
    periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
    periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
    fandomId: integer('fandom_id'),
    eventType: text('event_type').notNull(),
    eventCount: integer('event_count').notNull().default(0),
    uniqueSessions: integer('unique_sessions').notNull().default(0),
    metadata: text('metadata'), // JSON-encoded
  },
  table => ({
    periodStartIdx: index('idx_analytics_agg_period').on(table.periodStart),
    eventTypeIdx: index('idx_analytics_agg_event_type').on(table.eventType),
    fandomIdx: index('idx_analytics_agg_fandom').on(table.fandomId),
    compositeQueryIdx: index('idx_analytics_agg_query').on(
      table.periodStart,
      table.periodType,
      table.eventType
    ),
  })
);

// =============================================================================
// ERROR LOGGING
// =============================================================================

/**
 * Structured error logs with deduplication
 * Retention: 30 days raw
 */
export const errorLogs = sqliteTable(
  'error_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
    level: text('level').notNull(), // INFO, WARNING, ERROR, CRITICAL
    category: text('category').notNull(), // database, cache, api, auth, validation
    message: text('message').notNull(),
    stackTrace: text('stack_trace'),
    errorHash: text('error_hash').notNull(), // MD5(message + stackTrace) for deduplication
    occurrenceCount: integer('occurrence_count').notNull().default(1),
    firstSeen: integer('first_seen', { mode: 'timestamp' }).notNull(),
    lastSeen: integer('last_seen', { mode: 'timestamp' }).notNull(),
    context: text('context'), // JSON-encoded (requestId, endpoint, etc.)
  },
  table => ({
    timestampIdx: index('idx_error_log_timestamp').on(table.timestamp),
    levelIdx: index('idx_error_log_level').on(table.level),
    categoryIdx: index('idx_error_log_category').on(table.category),
    errorHashIdx: index('idx_error_log_hash').on(table.errorHash),
    compositeQueryIdx: index('idx_error_log_query').on(
      table.timestamp,
      table.level,
      table.category
    ),
  })
);

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

/**
 * Cache invalidation audit trail
 * Retention: 30 days
 */
export const cacheInvalidations = sqliteTable(
  'cache_invalidations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
    invalidationType: text('invalidation_type').notNull(), // KEY, TAG, PREFIX, FULL
    invalidationTarget: text('invalidation_target').notNull(), // Key/tag/prefix
    reason: text('reason'),
    adminId: integer('admin_id'), // Who triggered it
    affectedKeysCount: integer('affected_keys_count').notNull().default(0),
    metadata: text('metadata'), // JSON-encoded
  },
  table => ({
    timestampIdx: index('idx_cache_inv_timestamp').on(table.timestamp),
    typeIdx: index('idx_cache_inv_type').on(table.invalidationType),
    adminIdx: index('idx_cache_inv_admin').on(table.adminId),
  })
);

// =============================================================================
// RESOURCE USAGE MONITORING
// =============================================================================

/**
 * Free-tier resource usage tracking
 * Retention: Forever (critical for capacity planning)
 */
export const resourceUsage = sqliteTable(
  'resource_usage',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
    resourceType: text('resource_type').notNull(), // D1_READS, D1_WRITES, KV_READS, etc.
    usageCount: integer('usage_count').notNull(),
    limitTotal: integer('limit_total').notNull(),
    percentUsed: real('percent_used').notNull(), // 0-100
    periodType: text('period_type').notNull(), // DAILY, MONTHLY
    periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
    periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
  },
  table => ({
    timestampIdx: index('idx_resource_timestamp').on(table.timestamp),
    resourceTypeIdx: index('idx_resource_type').on(table.resourceType),
    periodStartIdx: index('idx_resource_period').on(table.periodStart),
    compositeQueryIdx: index('idx_resource_query').on(
      table.resourceType,
      table.periodStart
    ),
  })
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type NewPerformanceMetric = typeof performanceMetrics.$inferInsert;

export type PerformanceAggregate = typeof performanceAggregates.$inferSelect;
export type NewPerformanceAggregate = typeof performanceAggregates.$inferInsert;

export type QueryPerformanceLog = typeof queryPerformanceLogs.$inferSelect;
export type NewQueryPerformanceLog = typeof queryPerformanceLogs.$inferInsert;

export type RateLimitViolation = typeof rateLimitViolations.$inferSelect;
export type NewRateLimitViolation = typeof rateLimitViolations.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export type AnalyticsAggregate = typeof analyticsAggregates.$inferSelect;
export type NewAnalyticsAggregate = typeof analyticsAggregates.$inferInsert;

export type ErrorLog = typeof errorLogs.$inferSelect;
export type NewErrorLog = typeof errorLogs.$inferInsert;

export type CacheInvalidation = typeof cacheInvalidations.$inferSelect;
export type NewCacheInvalidation = typeof cacheInvalidations.$inferInsert;

export type ResourceUsage = typeof resourceUsage.$inferSelect;
export type NewResourceUsage = typeof resourceUsage.$inferInsert;
