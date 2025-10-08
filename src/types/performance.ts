/**
 * Performance Optimization Type Definitions
 * Feature: 003-optimize-the-platform
 *
 * Comprehensive types for caching, monitoring, analytics, and rate limiting.
 * All types designed for Cloudflare D1 (SQLite) and KV storage.
 */

// =============================================================================
// 1. CACHE MODELS
// =============================================================================

/**
 * Generic cache entry with versioning and TTL support
 * Storage: Cloudflare KV
 */
export interface CacheEntry<T> {
  key: string; // Unique cache key (e.g., "search:hp:angst:v2")
  value: T; // Cached data (serialized JSON)
  version: number; // For version-based invalidation
  createdAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (TTL)
  tags: string[]; // For bulk invalidation by tag (e.g., ["fandom:1"])
}

/**
 * Cache service interface for KV operations
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number, tags?: string[]): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<number>; // Returns affected count
  invalidateByPrefix(prefix: string): Promise<number>;
}

// =============================================================================
// 2. PERFORMANCE MONITORING MODELS
// =============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type CacheStatus = 'HIT' | 'MISS' | 'BYPASS' | 'STALE';
export type UserType = 'ANONYMOUS' | 'AUTHENTICATED' | 'ADMIN';

/**
 * Individual request performance metric
 * Retention: 30 days raw data, forever aggregated
 */
export interface PerformanceMetric {
  id?: number;
  timestamp: number; // Unix timestamp
  endpoint: string; // e.g., "/api/search", "/fandom/harry-potter"
  method: HttpMethod;
  statusCode: number; // HTTP status code
  responseTimeMs: number; // Total request duration
  cacheStatus?: CacheStatus;
  userType?: UserType;
  errorMessage?: string; // If status >= 400
  metadata?: Record<string, unknown>;
}

/**
 * Pre-aggregated performance metrics for fast dashboard queries
 * Computed every 5 minutes, retention: forever
 */
export interface PerformanceAggregate {
  id?: number;
  periodStart: number; // Unix timestamp (5-minute bucket)
  periodEnd: number;
  endpoint: string;
  totalRequests: number;
  avgResponseTimeMs: number;
  p50ResponseTimeMs: number; // Median
  p95ResponseTimeMs: number; // 95th percentile
  p99ResponseTimeMs: number; // 99th percentile
  errorCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  createdAt: number;
}

/**
 * Dashboard metrics summary
 */
export interface MetricsSummary {
  metrics: PerformanceAggregate[];
  summary: {
    totalRequests: number;
    avgResponseTimeMs: number;
    p95ResponseTimeMs: number;
    errorRate: number; // Percentage (0-1)
    cacheHitRate: number; // Percentage (0-1)
  };
}

// =============================================================================
// 3. DATABASE QUERY MONITORING
// =============================================================================

/**
 * Slow query tracking for optimization
 * Retention: 7 days (high volume)
 */
export interface QueryPerformanceLog {
  id?: number;
  timestamp: number;
  queryText: string; // Sanitized SQL query
  executionTimeMs: number;
  rowsAffected?: number;
  indexUsed: boolean; // Whether query used an index
  endpoint?: string; // Which API triggered this query
  metadata?: Record<string, unknown>;
}

// =============================================================================
// 4. RATE LIMITING MODELS
// =============================================================================

/**
 * Rate limit state (Durable Object in-memory state)
 * Persisted violations go to rate_limit_violations table
 */
export interface RateLimitState {
  identifier: string; // User ID or IP address
  windowStart: number; // Unix timestamp
  windowSize: number; // Window duration in seconds (60 for 1 minute)
  requestCount: number; // Requests in current window
  violationCount: number; // Total violations (persistent)
  whitelisted: boolean; // Admin-configured bypass
}

/**
 * Sliding window bucket for rate limiting
 */
export interface RateLimitBucket {
  timestamp: number; // Unix timestamp (second precision)
  count: number; // Requests in this second
}

/**
 * Rate limit violation log (persisted to D1)
 * Retention: 30 days
 */
export interface RateLimitViolation {
  id?: number;
  timestamp: number;
  identifier: string; // IP or User ID
  userType?: UserType;
  endpoint: string;
  violationCount: number; // How many requests over limit
  metadata?: Record<string, unknown>;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  anonymous: number; // Requests per minute (default: 60)
  authenticated: number; // Requests per minute (default: 120)
  admin: number; // Unlimited (-1) or high limit
  whitelistedIps: string[]; // IPs with unlimited access
}

// =============================================================================
// 5. ANALYTICS MODELS (Privacy-Respecting)
// =============================================================================

export type AnalyticsEventType =
  | 'PAGE_VIEW'
  | 'SEARCH_PERFORMED'
  | 'PATHWAY_CREATED'
  | 'STORY_VIEWED'
  | 'SUBMISSION_CREATED'
  | 'ADMIN_ACTION';

/**
 * Privacy-respecting analytics event
 * NO PII: No IP addresses, no user IDs for anonymous users
 * Retention: 90 days raw, forever aggregated
 */
export interface AnalyticsEvent {
  id?: number;
  timestamp: number;
  eventType: AnalyticsEventType;
  fandomId?: number;
  sessionId: string; // Anonymized hash (no IP, no user ID)
  referrer?: string;
  metadata?: {
    tags?: string[];
    plotBlocks?: string[];
    searchQuery?: string;
    conversionTime?: number; // Time from search to story view (ms)
    [key: string]: unknown;
  };
}

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * Pre-computed analytics aggregates
 * Retention: forever
 */
export interface AnalyticsAggregate {
  id?: number;
  periodType: PeriodType;
  periodStart: number; // Unix timestamp
  periodEnd: number;
  fandomId?: number;
  eventType: AnalyticsEventType;
  eventCount: number;
  uniqueSessions: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// 6. ERROR LOGGING MODELS
// =============================================================================

export type ErrorLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type ErrorCategory =
  | 'database'
  | 'cache'
  | 'api'
  | 'auth'
  | 'validation'
  | 'ratelimit';

/**
 * Structured error log with deduplication
 * Retention: 30 days raw
 */
export interface ErrorLog {
  id?: number;
  timestamp: number;
  level: ErrorLevel;
  category: ErrorCategory;
  message: string;
  stackTrace?: string;
  errorHash: string; // MD5(message + stackTrace) for deduplication
  occurrenceCount: number; // Incremented for duplicate errors
  firstSeen: number; // Unix timestamp
  lastSeen: number; // Unix timestamp
  context?: {
    userId?: string;
    endpoint?: string;
    requestId: string;
    userAgent?: string;
    [key: string]: unknown;
  };
}

// =============================================================================
// 7. CACHE INVALIDATION MODELS
// =============================================================================

export type InvalidationType = 'KEY' | 'TAG' | 'PREFIX' | 'FULL';

/**
 * Cache invalidation audit trail
 * Retention: 30 days
 */
export interface CacheInvalidation {
  id?: number;
  timestamp: number;
  invalidationType: InvalidationType;
  invalidationTarget: string; // Key, tag, or prefix that was invalidated
  reason?: string; // Why was it invalidated?
  adminId?: number; // Who triggered it (if manual)
  affectedKeysCount: number; // How many keys were purged
  metadata?: Record<string, unknown>;
}

// =============================================================================
// 8. RESOURCE USAGE MODELS
// =============================================================================

export type ResourceType =
  | 'D1_READS' // Daily limit: 5M
  | 'D1_WRITES' // Daily limit: 100k
  | 'D1_STORAGE' // Limit: 500MB
  | 'KV_READS' // Daily limit: 100k
  | 'KV_WRITES' // Daily limit: 1k
  | 'KV_STORAGE' // Limit: 1GB
  | 'DURABLE_OBJECT_REQUESTS' // Monthly limit: 1M
  | 'WORKER_REQUESTS' // Daily limit: 100k
  | 'WORKER_CPU_TIME'; // Per request: 50ms

export type UsageStatus = 'OK' | 'WARNING' | 'CRITICAL';

/**
 * Resource usage tracking for free-tier monitoring
 * Retention: forever (critical for capacity planning)
 */
export interface ResourceUsage {
  id?: number;
  timestamp: number;
  resourceType: ResourceType;
  usageCount: number;
  limitTotal: number;
  percentUsed: number; // 0-100
  periodType: 'DAILY' | 'MONTHLY';
  periodStart: number;
  periodEnd: number;
}

/**
 * Resource usage alert
 */
export interface ResourceAlert {
  resourceType: ResourceType;
  status: UsageStatus; // OK (<80%), WARNING (80-95%), CRITICAL (>95%)
  percentUsed: number;
  message: string;
  recommendedAction?: string;
}

// =============================================================================
// 9. CLOUDFLARE WORKER ENVIRONMENT BINDINGS
// =============================================================================

/**
 * Environment bindings available in Cloudflare Workers
 */
export interface Env {
  // KV Namespace for caching
  CACHE: KVNamespace;

  // D1 Database
  DB: D1Database;

  // Durable Object for rate limiting
  RATE_LIMITER: DurableObjectNamespace;

  // Environment variables
  ENVIRONMENT: 'production' | 'development';
  CACHE_TTL_SEARCH: string; // Seconds (default: 300 = 5 minutes)
  CACHE_TTL_VALIDATION: string; // Seconds (default: 3600 = 1 hour)
  CACHE_TTL_STATIC: string; // Seconds (default: 86400 = 24 hours)
}

// =============================================================================
// 10. API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number; // Results per page (default: 20, max: 100)
  offset?: number; // Pagination offset (default: 0)
}

/**
 * Time range filter
 */
export interface TimeRangeFilter {
  start: number; // Unix timestamp
  end: number; // Unix timestamp
  groupBy?: 'minute' | 'hour' | 'day';
}

/**
 * Performance metrics query parameters
 */
export interface MetricsQueryParams extends TimeRangeFilter {
  endpoint?: string; // Filter by specific endpoint
  userType?: UserType; // Filter by user type
}

/**
 * Cache invalidation request
 */
export interface CacheInvalidationRequest {
  type: InvalidationType;
  target: string; // Key, tag, or prefix to invalidate
  reason?: string; // Why invalidating (for audit log)
}

/**
 * Error log query parameters
 */
export interface ErrorLogQueryParams extends PaginationParams {
  level?: ErrorLevel;
  category?: ErrorCategory;
  search?: string; // Search in message
  start?: number; // Unix timestamp
  end?: number; // Unix timestamp
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQueryParams extends TimeRangeFilter {
  eventType?: AnalyticsEventType;
  fandomId?: number;
  aggregationLevel?: PeriodType;
}
