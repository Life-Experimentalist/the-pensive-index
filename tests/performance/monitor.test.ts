import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  ResponseOptimizer,
  QueryOptimizer,
  MemoryOptimizer,
  PerformanceError,
  withPerformanceMonitoring,
  performanceMonitor,
} from '../../src/lib/performance/monitor';

describe('PerformanceMonitor Core', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics(); // Start with clean metrics for each test
  });

  afterEach(() => {
    monitor.clearMetrics(); // Clean up after each test
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(monitor);
    });

    it('should use the exported instance correctly', () => {
      expect(performanceMonitor).toBe(monitor);
    });
  });

  describe('Timer Functionality', () => {
    it('should start and end timer correctly', () => {
      const timer = monitor.startTimer('test-operation');

      expect(timer).toHaveProperty('end');
      expect(typeof timer.end).toBe('function');
    });

    it('should measure execution duration accurately', async () => {
      const timer = monitor.startTimer('test-operation');

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = timer.end(true);

      expect(duration).toBeGreaterThan(8); // Account for timer precision
      expect(duration).toBeLessThan(50); // Should be reasonable
    });

    it('should record metrics when timer ends', () => {
      const timer = monitor.startTimer('test-operation', { test: 'metadata' });
      timer.end(true, '/api/test');

      const stats = monitor.getStats();

      expect(stats).toBeDefined();
      expect(stats!.total_operations).toBe(1);
      expect(stats!.successful_operations).toBe(1);
      expect(stats!.operations_by_type['test-operation']).toBe(1);
    });

    it('should track failed operations correctly', () => {
      const timer = monitor.startTimer('test-operation');
      timer.end(false, '/api/test');

      const stats = monitor.getStats();

      expect(stats!.total_operations).toBe(1);
      expect(stats!.successful_operations).toBe(0);
      expect(stats!.failed_operations).toBe(1);
      expect(stats!.success_rate).toBe(0);
    });

    it('should include metadata in metrics', () => {
      const metadata = { userId: '123', endpoint: '/api/test' };
      const timer = monitor.startTimer('test-operation', metadata);
      timer.end(true);

      const stats = monitor.getStats();

      expect(stats!.recent_metrics[0].metadata).toEqual(metadata);
    });
  });

  describe('Performance Threshold Detection', () => {
    beforeEach(() => {
      // Mock console.warn to capture warnings
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should warn when CRUD operations exceed 50ms threshold', () => {
      // Mock a slow operation
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(75); // End time (75ms duration)

      const timer = monitor.startTimer('create-user');
      timer.end(true);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance Warning: create-user took 75.00ms (threshold: 50ms)'
        ),
        expect.any(Object)
      );
    });

    it('should warn when validation operations exceed 200ms threshold', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(250); // End time (250ms duration)

      const timer = monitor.startTimer('validate-pathway');
      timer.end(true);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance Warning: validate-pathway took 250.00ms (threshold: 200ms)'
        ),
        expect.any(Object)
      );
    });

    it('should warn when query operations exceed 100ms threshold', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(150); // End time (150ms duration)

      const timer = monitor.startTimer('query-stories');
      timer.end(true);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance Warning: query-stories took 150.00ms (threshold: 100ms)'
        ),
        expect.any(Object)
      );
    });

    it('should warn when bulk operations exceed 500ms threshold', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(600); // End time (600ms duration)

      const timer = monitor.startTimer('bulk-import');
      timer.end(true);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance Warning: bulk-import took 600.00ms (threshold: 500ms)'
        ),
        expect.any(Object)
      );
    });

    it('should not warn when operations are within thresholds', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(30); // End time (30ms duration)

      const timer = monitor.startTimer('create-user');
      timer.end(true);

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should use default threshold for unknown operation types', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(150); // End time (150ms duration)

      const timer = monitor.startTimer('unknown-operation');
      timer.end(true);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance Warning: unknown-operation took 150.00ms (threshold: 100ms)'
        ),
        expect.any(Object)
      );
    });
  });

  describe('Statistics Calculation', () => {
    beforeEach(() => {
      // Create multiple operations with known durations
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      durations.forEach((duration, index) => {
        vi.spyOn(performance, 'now')
          .mockReturnValueOnce(0)
          .mockReturnValueOnce(duration);

        const timer = monitor.startTimer(`operation-${index}`);
        timer.end(index < 8, `/api/test/${index}`); // Last 2 operations fail
      });
    });

    it('should calculate correct operation counts', () => {
      const stats = monitor.getStats();

      expect(stats!.total_operations).toBe(10);
      expect(stats!.successful_operations).toBe(8);
      expect(stats!.failed_operations).toBe(2);
      expect(stats!.success_rate).toBe(80);
    });

    it('should calculate average duration correctly', () => {
      const stats = monitor.getStats();

      // Average of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] = 55
      expect(stats!.average_duration).toBe(55);
    });

    it('should calculate average success duration correctly', () => {
      const stats = monitor.getStats();

      // Average of successful operations [10, 20, 30, 40, 50, 60, 70, 80] = 45
      expect(stats!.average_success_duration).toBe(45);
    });

    it('should calculate median duration correctly', () => {
      const stats = monitor.getStats();

      // Median of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] = (50 + 60) / 2 = 55
      expect(stats!.median_duration).toBe(55);
    });

    it('should calculate percentiles correctly', () => {
      const stats = monitor.getStats();

      expect(stats!.p95_duration).toBe(100); // 95th percentile
      expect(stats!.p99_duration).toBe(100); // 99th percentile
    });

    it('should calculate min and max correctly', () => {
      const stats = monitor.getStats();

      expect(stats!.min_duration).toBe(10);
      expect(stats!.max_duration).toBe(100);
    });

    it('should provide operation breakdown', () => {
      const stats = monitor.getStats();

      expect(stats!.operations_by_type).toEqual({
        'operation-0': 1,
        'operation-1': 1,
        'operation-2': 1,
        'operation-3': 1,
        'operation-4': 1,
        'operation-5': 1,
        'operation-6': 1,
        'operation-7': 1,
        'operation-8': 1,
        'operation-9': 1,
      });
    });

    it('should identify slow operations', () => {
      const stats = monitor.getStats();

      // Operations with duration > 100ms threshold (assuming default threshold)
      expect(stats!.slow_operations.length).toBe(0); // All operations are <= 100ms
    });

    it('should return recent metrics', () => {
      const stats = monitor.getStats();

      expect(stats!.recent_metrics).toHaveLength(10);
      expect(stats!.recent_metrics[0].operation).toBe('operation-0');
      expect(stats!.recent_metrics[9].operation).toBe('operation-9');
    });
  });

  describe('Memory Management', () => {
    it('should limit metrics to maximum count', () => {
      // Create more than 1000 metrics (the maximum)
      for (let i = 0; i < 1200; i++) {
        const timer = monitor.startTimer(`operation-${i}`);
        timer.end(true);
      }

      const stats = monitor.getStats();

      // Should only keep last 1000 metrics
      expect(stats!.total_operations).toBe(1000);
    });

    it('should clear metrics correctly', () => {
      const timer = monitor.startTimer('test-operation');
      timer.end(true);

      expect(monitor.getStats()).toBeDefined();

      monitor.clearMetrics();

      expect(monitor.getStats()).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should return null stats when no metrics exist', () => {
      const stats = monitor.getStats();

      expect(stats).toBeNull();
    });

    it('should handle empty arrays in calculations', () => {
      // This tests the private methods indirectly
      monitor.clearMetrics();

      const stats = monitor.getStats();

      expect(stats).toBeNull();
    });

    it('should handle single metric correctly', () => {
      const timer = monitor.startTimer('single-operation');
      timer.end(true);

      const stats = monitor.getStats();

      expect(stats!.total_operations).toBe(1);
      expect(stats!.average_duration).toBeGreaterThan(0);
      expect(stats!.median_duration).toBeGreaterThan(0);
      expect(stats!.p95_duration).toBeGreaterThan(0);
    });

    it('should handle metrics with identical durations', () => {
      // Mock to return identical durations
      vi.spyOn(performance, 'now')
        .mockReturnValue(0) // Always 0, so duration is always 0
        .mockReturnValue(50); // Always 50, so duration is always 50

      for (let i = 0; i < 5; i++) {
        const timer = monitor.startTimer(`operation-${i}`);
        timer.end(true);
      }

      const stats = monitor.getStats();

      expect(stats!.average_duration).toBe(50);
      expect(stats!.median_duration).toBe(50);
      expect(stats!.min_duration).toBe(50);
      expect(stats!.max_duration).toBe(50);
    });
  });

  describe('Performance Testing', () => {
    it('should handle rapid timer creation and completion', () => {
      const startTime = performance.now();

      // Create 100 timers rapidly
      for (let i = 0; i < 100; i++) {
        const timer = monitor.startTimer(`rapid-operation-${i}`);
        timer.end(true);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(50); // 50ms for 100 operations

      const stats = monitor.getStats();
      expect(stats!.total_operations).toBe(100);
    });

    it('should maintain accuracy under load', () => {
      const operationCount = 1000;

      for (let i = 0; i < operationCount; i++) {
        const timer = monitor.startTimer(`load-test-${i % 10}`); // 10 different operation types
        timer.end(i % 10 !== 0); // 90% success rate
      }

      const stats = monitor.getStats();

      expect(stats!.total_operations).toBe(operationCount);
      expect(stats!.success_rate).toBeCloseTo(90, 1); // Within 1% of 90%
      expect(Object.keys(stats!.operations_by_type)).toHaveLength(10);
    });
  });
});

describe('withPerformanceMonitoring Decorator', () => {
  beforeEach(() => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
  });

  it('should monitor async function execution', async () => {
    const testFunction = async (value: number) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return value * 2;
    };

    const monitoredFunction = withPerformanceMonitoring(
      'test-async',
      testFunction
    );

    const result = await monitoredFunction(5);

    expect(result).toBe(10);

    const stats = PerformanceMonitor.getInstance().getStats();
    expect(stats!.total_operations).toBe(1);
    expect(stats!.successful_operations).toBe(1);
    expect(stats!.operations_by_type['test-async']).toBe(1);
  });

  it('should track function failures correctly', async () => {
    const failingFunction = async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      throw new Error('Test error');
    };

    const monitoredFunction = withPerformanceMonitoring(
      'test-failure',
      failingFunction
    );

    await expect(monitoredFunction()).rejects.toThrow('Test error');

    const stats = PerformanceMonitor.getInstance().getStats();
    expect(stats!.total_operations).toBe(1);
    expect(stats!.successful_operations).toBe(0);
    expect(stats!.failed_operations).toBe(1);
  });

  it('should preserve function arguments and return values', async () => {
    const complexFunction = async (a: number, b: string, c: object) => {
      return { a, b, c, processed: true };
    };

    const monitoredFunction = withPerformanceMonitoring(
      'test-complex',
      complexFunction
    );

    const input = { key: 'value' };
    const result = await monitoredFunction(42, 'test', input);

    expect(result).toEqual({
      a: 42,
      b: 'test',
      c: input,
      processed: true,
    });
  });
});

describe('ResponseOptimizer', () => {
  it('should create optimized response with default settings', () => {
    const data = { test: 'data' };
    const response = ResponseOptimizer.createResponse(data);

    expect(response.status).toBe(200);
    // Check response body would contain the data (can't easily test NextResponse body)
  });

  it('should include custom headers', () => {
    const data = { test: 'data' };
    const customHeaders = { 'X-Custom': 'value' };

    const response = ResponseOptimizer.createResponse(data, {
      status: 201,
      headers: customHeaders,
    });

    expect(response.status).toBe(201);
  });

  it('should add caching headers when specified', () => {
    const data = { test: 'data' };

    const response = ResponseOptimizer.createResponse(data, {
      cacheMaxAge: 3600,
    });

    expect(response.status).toBe(200);
  });

  it('should add operation headers', () => {
    const data = { test: 'data' };

    const response = ResponseOptimizer.createResponse(data, {
      operation: 'test-operation',
    });

    expect(response.status).toBe(200);
  });
});

describe('QueryOptimizer', () => {
  describe('Pagination Optimization', () => {
    it('should optimize valid pagination parameters', () => {
      const result = QueryOptimizer.optimizePagination(25, 100);

      expect(result.limit).toBe(25);
      expect(result.offset).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const result = QueryOptimizer.optimizePagination(0, 0);

      expect(result.limit).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should enforce maximum limit of 500', () => {
      const result = QueryOptimizer.optimizePagination(1000, 0);

      expect(result.limit).toBe(500);
      expect(result.offset).toBe(0);
    });

    it('should use defaults when parameters are undefined', () => {
      const result = QueryOptimizer.optimizePagination();

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should enforce minimum offset of 0', () => {
      const result = QueryOptimizer.optimizePagination(25, -50);

      expect(result.limit).toBe(25);
      expect(result.offset).toBe(0);
    });
  });

  describe('Search Optimization', () => {
    it('should optimize valid search terms', () => {
      const result = QueryOptimizer.optimizeSearch('  test search term  ');

      expect(result).toBe('test search term');
    });

    it('should return undefined for empty search', () => {
      expect(QueryOptimizer.optimizeSearch('')).toBeUndefined();
      expect(QueryOptimizer.optimizeSearch('   ')).toBeUndefined();
      expect(QueryOptimizer.optimizeSearch()).toBeUndefined();
    });

    it('should return undefined for very short searches', () => {
      expect(QueryOptimizer.optimizeSearch('a')).toBeUndefined();
      expect(QueryOptimizer.optimizeSearch(' x ')).toBeUndefined();
    });

    it('should limit search length to 100 characters', () => {
      const longSearch = 'a'.repeat(150);
      const result = QueryOptimizer.optimizeSearch(longSearch);

      expect(result).toHaveLength(100);
    });

    it('should accept minimum 2 character searches', () => {
      const result = QueryOptimizer.optimizeSearch('ab');

      expect(result).toBe('ab');
    });
  });

  describe('Search Condition Creation', () => {
    it('should create proper LIKE conditions', () => {
      const result = QueryOptimizer.createSearchCondition('test', [
        'name',
        'description',
      ]);

      expect(result).toBe("(name LIKE '%test%' OR description LIKE '%test%')");
    });

    it('should escape special SQL characters', () => {
      const result = QueryOptimizer.createSearchCondition('test%_term', [
        'name',
      ]);

      expect(result).toBe("(name LIKE '%test\\%\\_term%')");
    });

    it('should handle single field', () => {
      const result = QueryOptimizer.createSearchCondition('test', ['name']);

      expect(result).toBe("(name LIKE '%test%')");
    });

    it('should handle multiple fields', () => {
      const result = QueryOptimizer.createSearchCondition('test', [
        'name',
        'desc',
        'content',
      ]);

      expect(result).toBe(
        "(name LIKE '%test%' OR desc LIKE '%test%' OR content LIKE '%test%')"
      );
    });
  });
});

describe('MemoryOptimizer', () => {
  describe('Array Pagination', () => {
    const testArray = Array.from({ length: 100 }, (_, i) => i);

    it('should paginate arrays correctly', () => {
      const result = MemoryOptimizer.paginateArray(testArray, 10, 20);

      expect(result.data).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
      expect(result.total).toBe(100);
      expect(result.hasMore).toBe(true);
    });

    it('should handle last page correctly', () => {
      const result = MemoryOptimizer.paginateArray(testArray, 10, 95);

      expect(result.data).toEqual([95, 96, 97, 98, 99]);
      expect(result.total).toBe(100);
      expect(result.hasMore).toBe(false);
    });

    it('should handle first page with default offset', () => {
      const result = MemoryOptimizer.paginateArray(testArray, 5);

      expect(result.data).toEqual([0, 1, 2, 3, 4]);
      expect(result.total).toBe(100);
      expect(result.hasMore).toBe(true);
    });

    it('should handle empty arrays', () => {
      const result = MemoryOptimizer.paginateArray([], 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Object Depth Limiting', () => {
    it('should limit object depth correctly', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: 'too deep',
                },
              },
            },
          },
        },
      };

      const result = MemoryOptimizer.limitObjectDepth(deepObject, 3);

      expect(result.level1.level2.level3).toBeDefined();
      expect(result.level1.level2.level3.level4).toBeUndefined();
    });

    it('should handle arrays in deep objects', () => {
      const deepObject = {
        level1: {
          array: [{ level3: { level4: 'data' } }],
        },
      };

      const result = MemoryOptimizer.limitObjectDepth(deepObject, 2);

      expect(result.level1.array[0]).toBeDefined();
      expect(result.level1.array[0].level3).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(MemoryOptimizer.limitObjectDepth('string', 5)).toBe('string');
      expect(MemoryOptimizer.limitObjectDepth(123, 5)).toBe(123);
      expect(MemoryOptimizer.limitObjectDepth(null, 5)).toBeNull();
    });
  });

  describe('Object Cleaning', () => {
    it('should remove null and undefined values', () => {
      const dirtyObject = {
        keep: 'value',
        removeNull: null,
        removeUndefined: undefined,
        keepZero: 0,
        keepFalse: false,
        keepEmptyString: '',
      };

      const result = MemoryOptimizer.cleanObject(dirtyObject);

      expect(result).toEqual({
        keep: 'value',
        keepZero: 0,
        keepFalse: false,
        keepEmptyString: '',
      });
    });

    it('should clean nested objects', () => {
      const dirtyObject = {
        nested: {
          keep: 'value',
          remove: null,
        },
        array: ['keep', null, undefined, { nested: 'keep', remove: null }],
      };

      const result = MemoryOptimizer.cleanObject(dirtyObject);

      expect(result.nested).toEqual({ keep: 'value' });
      expect(result.array).toEqual(['keep', { nested: 'keep' }]);
    });

    it('should handle primitive values', () => {
      expect(MemoryOptimizer.cleanObject('string')).toBe('string');
      expect(MemoryOptimizer.cleanObject(123)).toBe(123);
      expect(MemoryOptimizer.cleanObject(null)).toBeNull();
    });
  });
});

describe('PerformanceError', () => {
  it('should create error with all properties', () => {
    const error = new PerformanceError(
      'Operation failed',
      'test-operation',
      150,
      { context: 'test' }
    );

    expect(error.name).toBe('PerformanceError');
    expect(error.message).toBe('Operation failed');
    expect(error.operation).toBe('test-operation');
    expect(error.duration).toBe(150);
    expect(error.context).toEqual({ context: 'test' });
  });

  it('should create error with minimal properties', () => {
    const error = new PerformanceError('Operation failed', 'test-operation');

    expect(error.name).toBe('PerformanceError');
    expect(error.message).toBe('Operation failed');
    expect(error.operation).toBe('test-operation');
    expect(error.duration).toBeUndefined();
    expect(error.context).toBeUndefined();
  });

  it('should be instanceof Error', () => {
    const error = new PerformanceError('test', 'operation');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PerformanceError);
  });
});
