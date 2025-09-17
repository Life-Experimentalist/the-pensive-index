import { NextResponse } from 'next/server';

/**
 * Performance Utilities
 *
 * Provides utilities for monitoring, optimizing, and reporting on
 * application performance across API endpoints and database operations.
 */

export interface PerformanceMetrics {
  duration: number;
  operation: string;
  endpoint?: string;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  crud: number; // <50ms
  validation: number; // <200ms
  query: number; // <100ms
  bulk: number; // <500ms
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  private readonly thresholds: PerformanceThresholds = {
    crud: 50,
    validation: 200,
    query: 100,
    bulk: 500,
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking a performance measurement
   */
  startTimer(operation: string, metadata?: Record<string, any>) {
    const startTime = performance.now();

    return {
      end: (success: boolean = true, endpoint?: string) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.recordMetric({
          duration,
          operation,
          endpoint,
          success,
          timestamp: new Date(),
          metadata,
        });

        return duration;
      },
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);

    // Keep only the last N metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log warnings for slow operations
    this.checkThresholds(metric);
  }

  /**
   * Check if operation exceeds performance thresholds
   */
  private checkThresholds(metric: PerformanceMetrics) {
    let threshold: number;

    // Determine appropriate threshold based on operation type
    if (
      metric.operation.includes('create') ||
      metric.operation.includes('update') ||
      metric.operation.includes('delete') ||
      metric.operation.includes('read')
    ) {
      threshold = this.thresholds.crud;
    } else if (metric.operation.includes('validate')) {
      threshold = this.thresholds.validation;
    } else if (
      metric.operation.includes('query') ||
      metric.operation.includes('search')
    ) {
      threshold = this.thresholds.query;
    } else if (metric.operation.includes('bulk')) {
      threshold = this.thresholds.bulk;
    } else {
      threshold = this.thresholds.query; // Default threshold
    }

    if (metric.duration > threshold) {
      console.warn(
        `Performance Warning: ${
          metric.operation
        } took ${metric.duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        {
          endpoint: metric.endpoint,
          metadata: metric.metadata,
        }
      );
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return null;
    }

    const successful = this.metrics.filter(m => m.success);
    const failed = this.metrics.filter(m => !m.success);

    const durations = this.metrics.map(m => m.duration);
    const successfulDurations = successful.map(m => m.duration);

    return {
      total_operations: this.metrics.length,
      successful_operations: successful.length,
      failed_operations: failed.length,
      success_rate: (successful.length / this.metrics.length) * 100,
      average_duration: this.calculateAverage(durations),
      average_success_duration: this.calculateAverage(successfulDurations),
      median_duration: this.calculateMedian(durations),
      p95_duration: this.calculatePercentile(durations, 95),
      p99_duration: this.calculatePercentile(durations, 99),
      max_duration: Math.max(...durations),
      min_duration: Math.min(...durations),
      operations_by_type: this.getOperationBreakdown(),
      slow_operations: this.getSlowOperations(),
      recent_metrics: this.metrics.slice(-10), // Last 10 operations
    };
  }

  /**
   * Get breakdown of operations by type
   */
  private getOperationBreakdown() {
    const breakdown: Record<string, number> = {};

    this.metrics.forEach(metric => {
      breakdown[metric.operation] = (breakdown[metric.operation] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Get operations that exceeded thresholds
   */
  private getSlowOperations() {
    return this.metrics.filter(metric => {
      let threshold: number;

      if (
        metric.operation.includes('create') ||
        metric.operation.includes('update') ||
        metric.operation.includes('delete') ||
        metric.operation.includes('read')
      ) {
        threshold = this.thresholds.crud;
      } else if (metric.operation.includes('validate')) {
        threshold = this.thresholds.validation;
      } else if (
        metric.operation.includes('query') ||
        metric.operation.includes('search')
      ) {
        threshold = this.thresholds.query;
      } else if (metric.operation.includes('bulk')) {
        threshold = this.thresholds.bulk;
      } else {
        threshold = this.thresholds.query;
      }

      return metric.duration > threshold;
    });
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate median of array
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Calculate percentile of array
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics() {
    this.metrics = [];
  }
}

/**
 * Performance monitoring middleware for API routes
 */
export function withPerformanceMonitoring<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const monitor = PerformanceMonitor.getInstance();
    const timer = monitor.startTimer(operation);

    try {
      const result = await fn(...args);
      timer.end(true);
      return result;
    } catch (error) {
      timer.end(false);
      throw error;
    }
  };
}

/**
 * Response optimization utilities
 */
export class ResponseOptimizer {
  /**
   * Create optimized JSON response with performance headers
   */
  static createResponse(
    data: any,
    options: {
      status?: number;
      headers?: Record<string, string>;
      operation?: string;
      cacheMaxAge?: number;
    } = {}
  ): NextResponse {
    const { status = 200, headers = {}, operation, cacheMaxAge } = options;

    // Add performance headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Response-Time': Date.now().toString(),
      ...headers,
    };

    // Add caching headers if specified
    if (cacheMaxAge !== undefined) {
      responseHeaders['Cache-Control'] = `public, max-age=${cacheMaxAge}`;
      responseHeaders['ETag'] = this.generateETag(data);
    }

    // Add operation identifier for monitoring
    if (operation) {
      responseHeaders['X-Operation'] = operation;
    }

    return NextResponse.json(data, {
      status,
      headers: responseHeaders,
    });
  }

  /**
   * Generate ETag for caching
   */
  private static generateETag(data: any): string {
    const content = JSON.stringify(data);
    return `"${this.simpleHash(content)}"`;
  }

  /**
   * Simple hash function for ETag generation
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Optimize pagination parameters
   */
  static optimizePagination(limit?: number, offset?: number) {
    const optimizedLimit = Math.min(Math.max(limit || 50, 1), 500);
    const optimizedOffset = Math.max(offset || 0, 0);

    return { limit: optimizedLimit, offset: optimizedOffset };
  }

  /**
   * Optimize search parameters
   */
  static optimizeSearch(search?: string) {
    if (!search) return undefined;

    // Trim and limit search length
    const optimizedSearch = search.trim().slice(0, 100);

    // Return undefined for very short searches
    if (optimizedSearch.length < 2) return undefined;

    return optimizedSearch;
  }

  /**
   * Create optimized WHERE conditions
   */
  static createSearchCondition(searchTerm: string, fields: string[]): string {
    const escapedTerm = searchTerm.replace(/[%_]/g, '\\$&');
    const conditions = fields.map(field => `${field} LIKE '%${escapedTerm}%'`);

    return `(${conditions.join(' OR ')})`;
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  /**
   * Paginate large arrays to prevent memory issues
   */
  static paginateArray<T>(
    array: T[],
    limit: number,
    offset: number = 0
  ): { data: T[]; hasMore: boolean; total: number } {
    const total = array.length;
    const data = array.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return { data, hasMore, total };
  }

  /**
   * Limit object depth to prevent excessive nesting
   */
  static limitObjectDepth(obj: any, maxDepth: number = 5): any {
    if (maxDepth <= 0 || typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.limitObjectDepth(item, maxDepth - 1));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.limitObjectDepth(value, maxDepth - 1);
    }

    return result;
  }

  /**
   * Clean up large objects by removing null/undefined values
   */
  static cleanObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj
        .filter(item => item !== null && item !== undefined)
        .map(item => this.cleanObject(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = this.cleanObject(value);
      }
    }

    return result;
  }
}

/**
 * Error tracking with performance context
 */
export class PerformanceError extends Error {
  public readonly operation: string;
  public readonly duration?: number;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    operation: string,
    duration?: number,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PerformanceError';
    this.operation = operation;
    this.duration = duration;
    this.context = context;
  }
}

/**
 * Export performance monitor instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance();
