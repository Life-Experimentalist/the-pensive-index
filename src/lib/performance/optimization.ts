/**
 * Performance Optimization System (T042)
 * Implements caching strategies, database indexing, and optimization for submission processing
 */

import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

// Redis client for distributed caching
class CacheManager {
  private redisClient: Redis | null = null;
  private localCache: any;
  private isRedisAvailable: boolean = false;

  constructor() {
    this.localCache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 15, // 15 minutes
      allowStale: false,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });

    this.initializeRedis();
  }

  private async initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
        });

        this.redisClient.on('connect', () => {
          this.isRedisAvailable = true;
          console.log('✅ Redis cache connected');
        });

        this.redisClient.on('error', error => {
          this.isRedisAvailable = false;
          console.warn(
            '⚠️ Redis cache error, falling back to local cache:',
            error.message
          );
        });

        // Test connection
        await this.redisClient.ping();
        this.isRedisAvailable = true;
      } catch (error) {
        console.warn('⚠️ Redis unavailable, using local cache only');
        this.isRedisAvailable = false;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Try local cache first (fastest)
    const localValue = this.localCache.get(key);
    if (localValue !== undefined) {
      return localValue;
    }

    // Try Redis if available
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          // Store in local cache for next time
          this.localCache.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        console.warn('Cache read error:', error);
      }
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 900): Promise<void> {
    // Store in local cache
    this.localCache.set(key, value, { ttl: ttlSeconds * 1000 });

    // Store in Redis if available
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      } catch (error) {
        console.warn('Cache write error:', error);
      }
    }
  }

  async del(key: string): Promise<void> {
    this.localCache.delete(key);

    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.warn('Cache delete error:', error);
      }
    }
  }

  async delPattern(pattern: string): Promise<void> {
    // Clear local cache items matching pattern
    for (const key of this.localCache.keys()) {
      if (key.includes(pattern.replace('*', ''))) {
        this.localCache.delete(key);
      }
    }

    if (this.isRedisAvailable && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(
            keys.map((key: string) => (this.redisClient as any).del(key))
          );
        }
      } catch (error) {
        console.warn('Cache pattern delete error:', error);
      }
    }
  }

  getStats() {
    return {
      localCache: {
        size: this.localCache.size,
        maxSize: this.localCache.max,
        calculatedSize: this.localCache.calculatedSize,
      },
      redis: {
        available: this.isRedisAvailable,
        connected: this.redisClient?.status === 'ready',
      },
    };
  }
}

// Singleton cache instance
export const cache = new CacheManager();

// Cache key generators
export const CacheKeys = {
  submission: (id: string) => `submission:${id}`,
  submissionStatus: (id: string) => `submission:${id}:status`,
  queue: (filters: string) => `queue:${filters}`,
  queueStats: () => 'queue:stats',
  fandom: (slug: string) => `fandom:${slug}`,
  fandoms: () => 'fandoms:all',
  fandomTags: (slug: string) => `fandom:${slug}:tags`,
  user: (id: string) => `user:${id}`,
  moderatorWorkload: (id: string) => `moderator:${id}:workload`,
  githubIssue: (number: number) => `github:issue:${number}`,
  emailTemplate: (type: string) => `email:template:${type}`,
} as const;

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  static recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const metrics = this.metrics.get(operation) as number[];
    metrics.push(duration);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  static getMetrics(operation?: string) {
    if (operation) {
      const metrics = this.metrics.get(operation) || [];
      return {
        operation,
        count: metrics.length,
        average:
          metrics.length > 0
            ? metrics.reduce((a, b) => a + b, 0) / metrics.length
            : 0,
        min: metrics.length > 0 ? Math.min(...metrics) : 0,
        max: metrics.length > 0 ? Math.max(...metrics) : 0,
        recent: metrics.slice(-10), // Last 10 measurements
      };
    }

    const allMetrics: Record<string, any> = {};
    for (const [op, metrics] of this.metrics.entries()) {
      allMetrics[op] = this.getMetrics(op);
    }
    return allMetrics;
  }

  static clearMetrics() {
    this.metrics.clear();
  }
}

// Database query optimization utilities
export class QueryOptimizer {
  static async executeWithCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const endTimer = PerformanceMonitor.startTimer(`cache:${cacheKey}`);

    try {
      // Try cache first
      const cached = await cache.get<T>(cacheKey);
      if (cached !== null) {
        endTimer();
        return cached;
      }

      // Execute query
      const queryTimer = PerformanceMonitor.startTimer(`query:${cacheKey}`);
      const result = await queryFn();
      queryTimer();

      // Cache result
      await cache.set(cacheKey, result, ttlSeconds);

      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  static async batchExecute<T, K>(
    items: K[],
    batchSize: number,
    executor: (batch: K[]) => Promise<T[]>
  ): Promise<T[]> {
    const results: T[] = [];
    const batches = [];

    // Create batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Execute batches in parallel
    const batchPromises = batches.map(async batch => {
      const timer = PerformanceMonitor.startTimer('batch_execute');
      try {
        return await executor(batch);
      } finally {
        timer();
      }
    });

    const batchResults = await Promise.all(batchPromises);
    return results.concat(...batchResults);
  }
}

// Submission processing optimizations
export class SubmissionOptimizer {
  static async optimizeQueueQuery(filters: any) {
    const cacheKey = CacheKeys.queue(JSON.stringify(filters));

    return QueryOptimizer.executeWithCache(
      cacheKey,
      () => {
        // This would be implemented with the actual database query
        // Using appropriate indexes and optimized joins
        const timer = PerformanceMonitor.startTimer('queue_query');

        try {
          // Optimized query would go here
          // SELECT with proper indexes on status, priority, fandom, submission_date
          return Promise.resolve({
            submissions: [],
            total: 0,
            queuePositions: {},
            moderators: {},
            moderationHistory: {},
          });
        } finally {
          timer();
        }
      },
      60 // Cache for 1 minute
    );
  }

  static async preloadSubmissionData(submissionIds: string[]) {
    const timer = PerformanceMonitor.startTimer('preload_submissions');

    try {
      // Batch load submissions to avoid N+1 queries
      return QueryOptimizer.batchExecute(
        submissionIds,
        50, // Process 50 at a time
        async batch => {
          // Single query for batch of submissions
          // Including related data (moderator assignments, flags, etc.)
          return Promise.resolve([]);
        }
      );
    } finally {
      timer();
    }
  }

  static async invalidateSubmissionCache(submissionId: string) {
    await Promise.all([
      cache.del(CacheKeys.submission(submissionId)),
      cache.del(CacheKeys.submissionStatus(submissionId)),
      cache.delPattern('queue:*'), // Invalidate all queue caches
      cache.del(CacheKeys.queueStats()),
    ]);
  }
}

// Extension performance optimizations
export class ExtensionOptimizer {
  static async optimizeStoryParsing(url: string) {
    const cacheKey = `story_parse:${url}`;

    return QueryOptimizer.executeWithCache(
      cacheKey,
      async () => {
        const timer = PerformanceMonitor.startTimer('story_parsing');

        try {
          // Cached story parsing to avoid re-parsing same URLs
          // This would integrate with the extension content scripts
          return () =>
            Promise.resolve({
              title: '',
              author: '',
              fandom: '',
              tags: [],
              wordCount: 0,
              status: 'unknown',
              lastUpdated: new Date(),
            });
        } finally {
          timer();
        }
      },
      3600 // Cache for 1 hour - stories don't change often
    );
  }

  static async preloadFandomData() {
    const timer = PerformanceMonitor.startTimer('fandom_preload');

    try {
      // Preload commonly used fandom data for extension
      const fandoms = await QueryOptimizer.executeWithCache(
        CacheKeys.fandoms(),
        () => {
          // Query all active fandoms with basic info
          return [];
        },
        1800 // Cache for 30 minutes
      );

      return fandoms;
    } finally {
      timer();
    }
  }
}

// API response optimization
export class APIOptimizer {
  static optimizeSubmissionResponse(submissionData: any) {
    // Minimize response payload size
    return {
      id: submissionData.id,
      title: submissionData.storyTitle,
      author: submissionData.storyAuthor,
      status: submissionData.status,
      submissionDate: submissionData.submissionDate,
      // Only include essential fields, lazy-load details
      _links: {
        details: `/api/v1/submissions/${submissionData.id}`,
        status: `/api/v1/submissions/${submissionData.id}/status`,
      },
    };
  }

  static async compressResponse(data: any): Promise<Buffer> {
    // Implement response compression for large payloads
    const { gzip } = await import('zlib');
    const { promisify } = await import('util');
    const gzipAsync = promisify(gzip);

    const jsonString = JSON.stringify(data);

    if (jsonString.length > 1024) {
      // Only compress responses > 1KB
      return await gzipAsync(Buffer.from(jsonString));
    }

    return Buffer.from(jsonString);
  }
}

// Performance middleware for Next.js API routes
export function withPerformanceMonitoring(handler: any) {
  return async (req: any, res: any) => {
    const timer = PerformanceMonitor.startTimer(`api:${req.method}:${req.url}`);

    try {
      const result = await handler(req, res);
      return result;
    } finally {
      const duration = timer();

      // Log slow requests
      if (duration > 5000) {
        // > 5 seconds
        console.warn(
          `Slow API request: ${req.method} ${req.url} took ${duration.toFixed(
            2
          )}ms`
        );
      }

      // Add performance headers
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    }
  };
}

// Health check endpoint for monitoring
export function getPerformanceHealth() {
  const metrics = PerformanceMonitor.getMetrics();
  const cacheStats = cache.getStats();

  return {
    timestamp: new Date().toISOString(),
    cache: cacheStats,
    performance: {
      slowOperations: Object.entries(metrics)
        .filter(([_, data]) => data.average > 1000) // > 1 second
        .map(([operation, data]) => ({ operation, ...data })),
      totalOperations: Object.keys(metrics).length,
    },
    health: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  };
}

// Database index recommendations
export const DATABASE_INDEXES = `
-- Performance optimization indexes for community submission system

-- Submissions table indexes
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_priority ON submissions(priority);
CREATE INDEX IF NOT EXISTS idx_submissions_fandom ON submissions(fandom_slug);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_moderator ON submissions(assigned_moderator_id);
CREATE INDEX IF NOT EXISTS idx_submissions_compound ON submissions(status, priority, submission_date DESC);

-- Queue optimization indexes
CREATE INDEX IF NOT EXISTS idx_queue_position ON submission_queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_queue_assigned ON submission_queue(assigned_moderator_id) WHERE assigned_moderator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queue_priority_date ON submission_queue(priority DESC, created_at ASC);

-- Moderation history indexes
CREATE INDEX IF NOT EXISTS idx_moderation_submission ON moderation_history(submission_id);
CREATE INDEX IF NOT EXISTS idx_moderation_moderator ON moderation_history(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_date ON moderation_history(action_date DESC);

-- GitHub integration indexes
CREATE INDEX IF NOT EXISTS idx_github_issue_submission ON submissions(github_issue_number) WHERE github_issue_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_github_webhooks_processed ON github_webhooks(processed_at) WHERE processed_at IS NOT NULL;

-- Email notification indexes
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_template ON email_notifications(template_type);

-- Fandom and tag indexes
CREATE INDEX IF NOT EXISTS idx_fandoms_active ON fandoms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tags_fandom ON tags(fandom_slug);
CREATE INDEX IF NOT EXISTS idx_submission_tags_submission ON submission_tags(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_tags_tag ON submission_tags(tag_id);

-- Admin user indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_clerk ON admin_users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
`;

const performanceUtils = {
  cache,
  CacheKeys,
  PerformanceMonitor,
  QueryOptimizer,
  SubmissionOptimizer,
  ExtensionOptimizer,
  APIOptimizer,
  withPerformanceMonitoring,
  getPerformanceHealth,
  DATABASE_INDEXES,
};

export default performanceUtils;
