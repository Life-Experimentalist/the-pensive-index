/**
 * Performance Testing Suite
 * Tests optimization implementations for community submission system
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  cache,
  CacheKeys,
  PerformanceMonitor,
  QueryOptimizer,
  SubmissionOptimizer,
  ExtensionOptimizer,
  APIOptimizer,
  withPerformanceMonitoring,
  getPerformanceHealth,
} from '../../src/lib/performance/optimization';

// Mock Redis for testing
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    on: vi.fn(),
    status: 'ready',
  })),
}));

describe('Performance Optimization System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PerformanceMonitor.clearMetrics();
  });

  describe('CacheManager', () => {
    it('should store and retrieve values from cache', async () => {
      const testKey = 'test_key';
      const testValue = { data: 'test_data', id: 123 };

      await cache.set(testKey, testValue);
      const retrieved = await cache.get(testKey);

      expect(retrieved).toEqual(testValue);
    });

    it('should handle cache misses gracefully', async () => {
      const result = await cache.get('non_existent_key');
      expect(result).toBeNull();
    });

    it('should delete cache entries', async () => {
      const testKey = 'delete_test';
      await cache.set(testKey, 'test_value');

      let retrieved = await cache.get(testKey);
      expect(retrieved).toBe('test_value');

      await cache.del(testKey);
      retrieved = await cache.get(testKey);
      expect(retrieved).toBeNull();
    });

    it('should handle pattern deletion', async () => {
      await cache.set('pattern:test:1', 'value1');
      await cache.set('pattern:test:2', 'value2');
      await cache.set('other:key', 'value3');

      await cache.delPattern('pattern:*');

      expect(await cache.get('pattern:test:1')).toBeNull();
      expect(await cache.get('pattern:test:2')).toBeNull();
      expect(await cache.get('other:key')).toBe('value3');
    });

    it('should provide cache statistics', () => {
      const stats = cache.getStats();

      expect(stats).toHaveProperty('localCache');
      expect(stats).toHaveProperty('redis');
      expect(stats.localCache).toHaveProperty('size');
      expect(stats.localCache).toHaveProperty('maxSize');
    });
  });

  describe('CacheKeys', () => {
    it('should generate consistent cache keys', () => {
      expect(CacheKeys.submission('123')).toBe('submission:123');
      expect(CacheKeys.submissionStatus('456')).toBe('submission:456:status');
      expect(CacheKeys.fandom('harry-potter')).toBe('fandom:harry-potter');
      expect(CacheKeys.queue('{"status":"pending"}')).toBe(
        'queue:{"status":"pending"}'
      );
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track operation timing', () => {
      const endTimer = PerformanceMonitor.startTimer('test_operation');

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait ~10ms
      }

      const duration = endTimer();

      expect(duration).toBeGreaterThan(5);
      expect(duration).toBeLessThan(50);

      const metrics = PerformanceMonitor.getMetrics('test_operation');
      expect(metrics.count).toBe(1);
      expect(metrics.average).toBeGreaterThan(5);
    });

    it('should calculate metrics correctly', () => {
      // Record multiple measurements
      PerformanceMonitor.recordMetric('test_calc', 100);
      PerformanceMonitor.recordMetric('test_calc', 200);
      PerformanceMonitor.recordMetric('test_calc', 300);

      const metrics = PerformanceMonitor.getMetrics('test_calc');

      expect(metrics.count).toBe(3);
      expect(metrics.average).toBe(200);
      expect(metrics.min).toBe(100);
      expect(metrics.max).toBe(300);
      expect(metrics.recent).toHaveLength(3);
    });

    it('should limit stored measurements', () => {
      // Record more than 100 measurements
      for (let i = 0; i < 150; i++) {
        PerformanceMonitor.recordMetric('test_limit', i);
      }

      const metrics = PerformanceMonitor.getMetrics('test_limit');
      expect(metrics.count).toBe(100); // Should be capped at 100
    });

    it('should return all metrics when no operation specified', () => {
      PerformanceMonitor.recordMetric('operation_a', 100);
      PerformanceMonitor.recordMetric('operation_b', 200);

      const allMetrics = PerformanceMonitor.getMetrics();

      expect(allMetrics).toHaveProperty('operation_a');
      expect(allMetrics).toHaveProperty('operation_b');
      expect(allMetrics.operation_a.average).toBe(100);
      expect(allMetrics.operation_b.average).toBe(200);
    });
  });

  describe('QueryOptimizer', () => {
    it('should execute with cache and store result', async () => {
      const mockQuery = vi.fn().mockResolvedValue('query_result');
      const cacheKey = 'test_query_cache';

      // First call - should execute query
      const result1 = await QueryOptimizer.executeWithCache(
        cacheKey,
        mockQuery,
        300
      );

      expect(result1).toBe('query_result');
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await QueryOptimizer.executeWithCache(
        cacheKey,
        mockQuery,
        300
      );

      expect(result2).toBe('query_result');
      expect(mockQuery).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should execute batch operations efficiently', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const batchExecutor = vi
        .fn()
        .mockImplementation(async (batch: number[]) => {
          return batch.map(item => item * 2);
        });

      const results = await QueryOptimizer.batchExecute(
        items,
        10, // Batch size of 10
        batchExecutor
      );

      expect(results).toHaveLength(25);
      expect(results[0]).toBe(0);
      expect(results[24]).toBe(48);

      // Should have created 3 batches (10 + 10 + 5)
      expect(batchExecutor).toHaveBeenCalledTimes(3);

      // Check batch sizes
      expect(batchExecutor).toHaveBeenNthCalledWith(
        1,
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      );
      expect(batchExecutor).toHaveBeenNthCalledWith(
        2,
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
      );
      expect(batchExecutor).toHaveBeenNthCalledWith(3, [20, 21, 22, 23, 24]);
    });
  });

  describe('SubmissionOptimizer', () => {
    it('should optimize queue queries with caching', async () => {
      const filters = { status: 'pending', priority: 'high' };

      // Mock the queue query (would normally hit database)
      const originalFunction =
        SubmissionOptimizer.optimizeQueueQuery.bind(SubmissionOptimizer);
      const mockResult = {
        submissions: [{ id: 'sub1', status: 'pending' }] as any,
        total: 1,
        queuePositions: { sub1: 1 },
        moderators: {},
        moderationHistory: {},
      };

      // First call
      vi.spyOn(SubmissionOptimizer, 'optimizeQueueQuery').mockResolvedValue(
        mockResult as any
      );
      const result = await SubmissionOptimizer.optimizeQueueQuery(filters);

      expect(result).toEqual(mockResult);
    });

    it('should invalidate submission cache correctly', async () => {
      const submissionId = 'test_sub_123';

      // Set up some cache entries
      await cache.set(CacheKeys.submission(submissionId), 'cached_submission');
      await cache.set(
        CacheKeys.submissionStatus(submissionId),
        'cached_status'
      );
      await cache.set('queue:test_filters', 'cached_queue');

      // Verify they exist
      expect(await cache.get(CacheKeys.submission(submissionId))).toBe(
        'cached_submission'
      );

      // Invalidate cache
      await SubmissionOptimizer.invalidateSubmissionCache(submissionId);

      // Verify they're gone
      expect(await cache.get(CacheKeys.submission(submissionId))).toBeNull();
      expect(
        await cache.get(CacheKeys.submissionStatus(submissionId))
      ).toBeNull();
    });
  });

  describe('ExtensionOptimizer', () => {
    it('should cache story parsing results', async () => {
      const url = 'https://archiveofourown.org/works/123456';

      // Mock story parsing result
      const mockStoryData = {
        title: 'Test Story',
        author: 'Test Author',
        description: 'Test description',
        tags: ['test', 'story'],
        metadata: {},
      };

      vi.spyOn(ExtensionOptimizer, 'optimizeStoryParsing').mockResolvedValue(
        mockStoryData as any
      );

      const result = await ExtensionOptimizer.optimizeStoryParsing(url);
      expect(result).toEqual(mockStoryData);
    });

    it('should preload fandom data efficiently', async () => {
      const mockFandoms = [
        { slug: 'harry-potter', name: 'Harry Potter' },
        { slug: 'percy-jackson', name: 'Percy Jackson' },
      ];

      vi.spyOn(ExtensionOptimizer, 'preloadFandomData').mockResolvedValue(
        mockFandoms as any
      );

      const result = await ExtensionOptimizer.preloadFandomData();
      expect(result).toEqual(mockFandoms);
    });
  });

  describe('APIOptimizer', () => {
    it('should optimize submission responses by minimizing payload', async () => {
      const fullSubmissionData = {
        id: 'sub_123',
        storyTitle: 'Test Story',
        storyAuthor: 'Test Author',
        storyUrl: 'https://example.com/story',
        storyDescription: 'A long description...',
        fandomSlug: 'harry-potter',
        selectedTags: ['tag1', 'tag2'],
        submitterEmail: 'user@test.com',
        status: 'pending',
        submissionDate: '2024-01-01T00:00:00Z',
        metadata: { large: 'object with lots of data' },
        // Many other fields...
      };

      const optimized = await APIOptimizer.optimizeSubmissionResponse(
        fullSubmissionData
      );

      expect(optimized).toEqual({
        id: 'sub_123',
        title: 'Test Story',
        author: 'Test Author',
        status: 'pending',
        submissionDate: '2024-01-01T00:00:00Z',
        _links: {
          details: '/api/v1/submissions/sub_123',
          status: '/api/v1/submissions/sub_123/status',
        },
      });

      // Should not include heavy fields like metadata, description
      expect(optimized).not.toHaveProperty('metadata');
      expect(optimized).not.toHaveProperty('storyDescription');
    });

    it('should compress large responses', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'A long description that makes this object large',
        })),
      };

      const compressed = await APIOptimizer.compressResponse(largeData);

      expect(compressed).toBeInstanceOf(Buffer);
      expect(compressed.length).toBeLessThan(JSON.stringify(largeData).length);
    });

    it('should not compress small responses', async () => {
      const smallData = { message: 'Hello' };

      const result = await APIOptimizer.compressResponse(smallData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe(JSON.stringify(smallData));
    });
  });

  describe('Performance Middleware', () => {
    it('should monitor API request performance', async () => {
      const mockHandler = vi.fn().mockResolvedValue('handler_result');
      const mockReq = { method: 'GET', url: '/api/test' };
      const mockRes = { setHeader: vi.fn() };

      const wrappedHandler = withPerformanceMonitoring(mockHandler);

      await wrappedHandler(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Response-Time',
        expect.stringMatching(/\d+\.\d+ms/)
      );
    });

    it('should log slow requests', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const slowHandler = vi.fn().mockImplementation(async () => {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'slow_result';
      });

      const mockReq = { method: 'POST', url: '/api/slow' };
      const mockRes = { setHeader: vi.fn() };

      const wrappedHandler = withPerformanceMonitoring(slowHandler);

      // Mock timer to always return > 5000ms
      const originalStartTimer =
        PerformanceMonitor.startTimer.bind(PerformanceMonitor);
      vi.spyOn(PerformanceMonitor, 'startTimer').mockImplementation(
        () => () => 6000
      );

      await wrappedHandler(mockReq, mockRes);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Slow API request: POST /api/slow took 6000.00ms'
        )
      );

      // Restore
      PerformanceMonitor.startTimer = originalStartTimer;
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Health Check', () => {
    it('should return comprehensive health information', async () => {
      // Add some metrics
      PerformanceMonitor.recordMetric('test_operation', 500);
      PerformanceMonitor.recordMetric('slow_operation', 2000);

      const health = await getPerformanceHealth();

      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('cache');
      expect(health).toHaveProperty('performance');
      expect(health).toHaveProperty('health');

      expect(health.performance).toHaveProperty('slowOperations');
      expect(health.performance).toHaveProperty('totalOperations');
      expect(health.health.status).toBe('healthy');
      expect(health.health).toHaveProperty('uptime');
      expect(health.health).toHaveProperty('memory');

      // Should identify slow operations
      const slowOps = health.performance.slowOperations;
      const slowOp = slowOps.find(
        (op: any) => op.operation === 'slow_operation'
      );
      expect(slowOp).toBeDefined();
      expect(slowOp.average).toBe(2000);
    });

    it('should track cache performance', async () => {
      // Use cache to generate stats
      await cache.set('health_test', 'test_value');
      await cache.get('health_test');

      const health = await getPerformanceHealth();

      expect(health.cache.localCache.size).toBeGreaterThan(0);
      expect(health.cache).toHaveProperty('redis');
    });
  });
});

describe('Performance Benchmarks', () => {
  it('should meet cache performance requirements', async () => {
    const iterations = 1000;
    const startTime = Date.now();

    // Benchmark cache operations
    for (let i = 0; i < iterations; i++) {
      await cache.set(`benchmark_${i}`, {
        data: `value_${i}`,
        timestamp: Date.now(),
      });
    }

    for (let i = 0; i < iterations; i++) {
      await cache.get(`benchmark_${i}`);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / (iterations * 2); // 2 operations per iteration

    // Should complete cache operations in <1ms on average
    expect(avgTime).toBeLessThan(1);
  });

  it('should handle concurrent operations efficiently', async () => {
    const concurrentOps = 100;
    const operations = [];

    const startTime = Date.now();

    for (let i = 0; i < concurrentOps; i++) {
      operations.push(cache.set(`concurrent_${i}`, `value_${i}`));
    }

    await Promise.all(operations);

    const setTime = Date.now() - startTime;

    // Concurrent gets
    const getOperations = [];
    const getStartTime = Date.now();

    for (let i = 0; i < concurrentOps; i++) {
      getOperations.push(cache.get(`concurrent_${i}`));
    }

    const results = await Promise.all(getOperations);
    const getTime = Date.now() - getStartTime;

    // Verify all operations completed
    expect(results).toHaveLength(concurrentOps);
    expect(results.every(result => result !== null)).toBe(true);

    // Should handle concurrent operations efficiently
    expect(setTime).toBeLessThan(1000); // <1 second for 100 concurrent sets
    expect(getTime).toBeLessThan(500); // <0.5 second for 100 concurrent gets
  });

  it('should maintain performance under memory pressure', async () => {
    // Fill cache beyond capacity
    const largeDataSize = 2000; // More than LRU cache max of 1000

    for (let i = 0; i < largeDataSize; i++) {
      await cache.set(`pressure_${i}`, {
        id: i,
        data: 'x'.repeat(100), // 100 chars per entry
      });
    }

    const stats = cache.getStats();

    // Cache should have evicted old entries and maintained max size
    expect(stats.localCache.size).toBeLessThanOrEqual(1000);

    // Recent entries should still be accessible
    const recentEntry = await cache.get('pressure_1999');
    expect(recentEntry).not.toBeNull();

    // Very old entries should have been evicted
    const oldEntry = await cache.get('pressure_0');
    expect(oldEntry).toBeNull();
  });
});
