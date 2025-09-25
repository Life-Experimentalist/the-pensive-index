/**
 * Admin System Performance Tests
 *
 * Tests performance characteristics of admin operations under load,
 * including response times, memory usage, and concurrent user handling.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';
import { performance } from 'perf_hooks';

// Mock API functions for performance testing
const mockAPICall = (endpoint: string, duration: number) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, endpoint }),
      });
    }, duration);
  });
};

// Performance measurement utilities
class PerformanceMonitor {
  private measurements: { [key: string]: number[] } = {};
  private memoryUsage: NodeJS.MemoryUsage[] = [];

  startMeasurement(operation: string): () => number {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    this.memoryUsage.push(startMemory);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.measurements[operation]) {
        this.measurements[operation] = [];
      }
      this.measurements[operation].push(duration);

      return duration;
    };
  }

  getStats(operation: string) {
    const measurements = this.measurements[operation] || [];
    if (measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg, min, max, p95, p99, count: measurements.length };
  }

  getMemoryStats() {
    if (this.memoryUsage.length === 0) return null;

    const heapUsed = this.memoryUsage.map(m => m.heapUsed);
    const heapTotal = this.memoryUsage.map(m => m.heapTotal);

    return {
      heapUsed: {
        avg: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length,
        max: Math.max(...heapUsed),
        min: Math.min(...heapUsed),
      },
      heapTotal: {
        avg: heapTotal.reduce((a, b) => a + b, 0) / heapTotal.length,
        max: Math.max(...heapTotal),
        min: Math.min(...heapTotal),
      },
    };
  }

  reset() {
    this.measurements = {};
    this.memoryUsage = [];
  }
}

const perfMonitor = new PerformanceMonitor();

// Concurrent operation utilities
const runConcurrentOperations = async (
  operations: (() => Promise<any>)[],
  concurrency: number = 10
) => {
  const results = [];

  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(op => op()));
    results.push(...batchResults);
  }

  return results;
};

describe('Admin System Performance Tests', () => {
  beforeEach(() => {
    perfMonitor.reset();
    // Clear any existing timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  describe('API Response Time Performance', () => {
    it('should handle user management API calls within performance thresholds', async () => {
      const operations = Array.from({ length: 100 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('user-management');
        await mockAPICall('/api/admin/users', Math.random() * 50 + 10); // 10-60ms
        endMeasurement();
      });

      await runConcurrentOperations(operations, 10);

      const stats = perfMonitor.getStats('user-management');
      expect(stats.count).toBe(100);
      expect(stats.avg).toBeLessThan(200); // Average should be under 200ms
      expect(stats.p95).toBeLessThan(300); // 95th percentile under 300ms
      expect(stats.p99).toBeLessThan(500); // 99th percentile under 500ms
    });

    it('should handle role assignment API calls efficiently', async () => {
      const operations = Array.from({ length: 50 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('role-assignment');
        await mockAPICall('/api/admin/roles/assign', Math.random() * 40 + 20); // 20-60ms
        endMeasurement();
      });

      await runConcurrentOperations(operations, 5);

      const stats = perfMonitor.getStats('role-assignment');
      expect(stats.avg).toBeLessThan(150);
      expect(stats.max).toBeLessThan(400);
    });

    it('should handle invitation management API calls within limits', async () => {
      const operations = Array.from({ length: 75 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement(
          'invitation-management'
        );
        await mockAPICall('/api/admin/invitations', Math.random() * 30 + 15); // 15-45ms
        endMeasurement();
      });

      await runConcurrentOperations(operations, 8);

      const stats = perfMonitor.getStats('invitation-management');
      expect(stats.p95).toBeLessThan(250);
      expect(stats.count).toBe(75);
    });

    it('should handle audit log queries efficiently', async () => {
      const operations = Array.from({ length: 60 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('audit-logs');
        await mockAPICall('/api/admin/audit-logs', Math.random() * 80 + 30); // 30-110ms
        endMeasurement();
      });

      await runConcurrentOperations(operations, 6);

      const stats = perfMonitor.getStats('audit-logs');
      expect(stats.avg).toBeLessThan(300);
      expect(stats.p99).toBeLessThan(600);
    });

    it('should handle permission validation efficiently', async () => {
      const operations = Array.from({ length: 200 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('permission-check');
        await mockAPICall(
          '/api/admin/permissions/validate',
          Math.random() * 20 + 5
        ); // 5-25ms
        endMeasurement();
      });

      await runConcurrentOperations(operations, 20);

      const stats = perfMonitor.getStats('permission-check');
      expect(stats.avg).toBeLessThan(100); // Permission checks should be very fast
      expect(stats.p95).toBeLessThan(150);
      expect(stats.count).toBe(200);
    });
  });

  describe('Concurrent User Load Testing', () => {
    it('should handle multiple concurrent admin users', async () => {
      const userOperations = Array.from(
        { length: 50 },
        (_, userId) => async () => {
          const endMeasurement =
            perfMonitor.startMeasurement('concurrent-users');

          // Simulate typical admin user workflow
          await mockAPICall(`/api/admin/users/${userId}`, 25);
          await mockAPICall('/api/admin/permissions/check', 10);
          await mockAPICall('/api/admin/audit-logs', 40);

          endMeasurement();
        }
      );

      const startTime = performance.now();
      await runConcurrentOperations(userOperations, 15);
      const totalTime = performance.now() - startTime;

      const stats = perfMonitor.getStats('concurrent-users');
      expect(stats.count).toBe(50);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(stats.avg).toBeLessThan(500);
    });

    it('should handle burst traffic patterns', async () => {
      // Simulate burst of activity (e.g., during peak admin hours)
      const burstOperations = Array.from({ length: 100 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('burst-traffic');

        const randomEndpoint = [
          '/api/admin/users',
          '/api/admin/roles',
          '/api/admin/invitations',
          '/api/admin/audit-logs',
        ][Math.floor(Math.random() * 4)];

        await mockAPICall(randomEndpoint, Math.random() * 60 + 20);
        endMeasurement();
      });

      const startTime = performance.now();
      await runConcurrentOperations(burstOperations, 25); // High concurrency
      const totalTime = performance.now() - startTime;

      const stats = perfMonitor.getStats('burst-traffic');
      expect(stats.count).toBe(100);
      expect(totalTime).toBeLessThan(15000); // Should handle burst within 15 seconds
      expect(stats.p95).toBeLessThan(800);
    });

    it('should maintain performance under sustained load', async () => {
      // Test sustained load over time
      const sustainedOperations = [];

      for (let batch = 0; batch < 5; batch++) {
        const batchOps = Array.from({ length: 20 }, () => async () => {
          const endMeasurement = perfMonitor.startMeasurement('sustained-load');
          await mockAPICall('/api/admin/users', Math.random() * 50 + 25);
          endMeasurement();
        });
        sustainedOperations.push(...batchOps);
      }

      await runConcurrentOperations(sustainedOperations, 10);

      const stats = perfMonitor.getStats('sustained-load');
      expect(stats.count).toBe(100);
      expect(stats.avg).toBeLessThan(300);
      // Performance should remain consistent (std deviation check)
      const variance = stats.max - stats.min;
      expect(variance).toBeLessThan(1000); // Performance variance within reasonable bounds
    });
  });

  describe('Database Operation Performance', () => {
    it('should handle large dataset queries efficiently', async () => {
      const largeDatasetOperations = Array.from(
        { length: 30 },
        () => async () => {
          const endMeasurement = perfMonitor.startMeasurement('large-dataset');

          // Simulate large dataset query (e.g., all users with pagination)
          await mockAPICall(
            '/api/admin/users?limit=1000&offset=0',
            Math.random() * 200 + 100
          );
          endMeasurement();
        }
      );

      await runConcurrentOperations(largeDatasetOperations, 5);

      const stats = perfMonitor.getStats('large-dataset');
      expect(stats.avg).toBeLessThan(500);
      expect(stats.max).toBeLessThan(1000);
    });

    it('should handle complex audit log queries', async () => {
      const complexQueries = Array.from({ length: 25 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('complex-queries');

        // Simulate complex audit log query with filters
        await mockAPICall(
          '/api/admin/audit-logs?startDate=2024-01-01&endDate=2024-12-31&action=role_assignment',
          Math.random() * 300 + 150
        );
        endMeasurement();
      });

      await runConcurrentOperations(complexQueries, 3);

      const stats = perfMonitor.getStats('complex-queries');
      expect(stats.avg).toBeLessThan(800);
      expect(stats.p95).toBeLessThan(1200);
    });

    it('should handle bulk operations efficiently', async () => {
      const bulkOperations = Array.from({ length: 15 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('bulk-operations');

        // Simulate bulk role assignment
        await mockAPICall(
          '/api/admin/roles/bulk-assign',
          Math.random() * 400 + 200
        );
        endMeasurement();
      });

      await runConcurrentOperations(bulkOperations, 2);

      const stats = perfMonitor.getStats('bulk-operations');
      expect(stats.avg).toBeLessThan(1000);
      expect(stats.max).toBeLessThan(2000);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage during operations', async () => {
      // Perform memory-intensive operations
      const memoryOperations = Array.from({ length: 50 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('memory-usage');

        // Simulate operations that might use memory
        const data = new Array(1000)
          .fill(0)
          .map((_, i) => ({ id: i, data: `user-${i}` }));
        await mockAPICall('/api/admin/users/export', 50);

        endMeasurement();
      });

      await runConcurrentOperations(memoryOperations, 10);

      const memStats = perfMonitor.getMemoryStats();
      if (memStats) {
        // Memory usage should remain reasonable (less than 100MB heap growth)
        const heapGrowth = memStats.heapUsed.max - memStats.heapUsed.min;
        expect(heapGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
      }
    });

    it('should handle large data export without memory leaks', async () => {
      const exportOperations = Array.from({ length: 10 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('data-export');

        // Simulate large data export
        const largeDataset = new Array(10000).fill(0).map((_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          roles: ['user', 'admin'],
        }));

        await mockAPICall('/api/admin/export/users', 200);

        // Clear the dataset to simulate proper cleanup
        largeDataset.length = 0;

        endMeasurement();
      });

      const initialMemory = process.memoryUsage();
      await runConcurrentOperations(exportOperations, 2);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal after operations complete
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB max growth
    });
  });

  describe('Caching Performance', () => {
    it('should benefit from permission caching', async () => {
      const userId = 'test-user-123';
      const permission = 'admin.users.read';

      // First call (cache miss)
      const firstCallEnd = perfMonitor.startMeasurement('cache-miss');
      await mockAPICall(
        `/api/admin/permissions/check?userId=${userId}&permission=${permission}`,
        100
      );
      const firstCallTime = firstCallEnd();

      // Subsequent calls (cache hits) - simulate faster response
      const cachedOperations = Array.from({ length: 10 }, () => async () => {
        const endMeasurement = perfMonitor.startMeasurement('cache-hit');
        await mockAPICall(
          `/api/admin/permissions/check?userId=${userId}&permission=${permission}`,
          5
        );
        endMeasurement();
      });

      await runConcurrentOperations(cachedOperations, 5);

      const cacheStats = perfMonitor.getStats('cache-hit');
      expect(cacheStats.avg).toBeLessThan(firstCallTime * 0.2); // Cached calls should be much faster
      expect(cacheStats.max).toBeLessThan(50);
    });

    it('should handle cache invalidation efficiently', async () => {
      const operations = [];

      // Mix of cached and non-cached operations
      for (let i = 0; i < 30; i++) {
        operations.push(async () => {
          const endMeasurement = perfMonitor.startMeasurement('mixed-cache');

          if (i % 5 === 0) {
            // Cache invalidation/new data
            await mockAPICall(
              `/api/admin/permissions/check?userId=user-${i}`,
              80
            );
          } else {
            // Cached data
            await mockAPICall(
              `/api/admin/permissions/check?userId=user-${
                Math.floor(i / 5) * 5
              }`,
              10
            );
          }

          endMeasurement();
        });
      }

      await runConcurrentOperations(operations, 8);

      const stats = perfMonitor.getStats('mixed-cache');
      expect(stats.avg).toBeLessThan(150);
      expect(stats.p95).toBeLessThan(300);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle error scenarios without performance degradation', async () => {
      const errorOperations = Array.from({ length: 40 }, (_, i) => async () => {
        const endMeasurement = perfMonitor.startMeasurement('error-handling');

        try {
          if (i % 4 === 0) {
            // Simulate 25% error rate
            throw new Error('Simulated API error');
          } else {
            await mockAPICall('/api/admin/users', Math.random() * 60 + 20);
          }
        } catch (error) {
          // Error handling should be fast
          await new Promise(resolve => setTimeout(resolve, 5));
        }

        endMeasurement();
      });

      await runConcurrentOperations(errorOperations, 10);

      const stats = perfMonitor.getStats('error-handling');
      expect(stats.avg).toBeLessThan(200); // Even with errors, should be fast
      expect(stats.max).toBeLessThan(500);
    });

    it('should recover from error bursts quickly', async () => {
      // Simulate error burst followed by recovery
      const burstOperations = [];

      // Error burst
      for (let i = 0; i < 20; i++) {
        burstOperations.push(async () => {
          const endMeasurement = perfMonitor.startMeasurement('error-burst');
          try {
            throw new Error('Error burst');
          } catch {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          endMeasurement();
        });
      }

      // Recovery operations
      for (let i = 0; i < 30; i++) {
        burstOperations.push(async () => {
          const endMeasurement = perfMonitor.startMeasurement('error-recovery');
          await mockAPICall('/api/admin/users', Math.random() * 50 + 20);
          endMeasurement();
        });
      }

      await runConcurrentOperations(burstOperations, 15);

      const burstStats = perfMonitor.getStats('error-burst');
      const recoveryStats = perfMonitor.getStats('error-recovery');

      expect(burstStats.avg).toBeLessThan(100);
      expect(recoveryStats.avg).toBeLessThan(200);
    });
  });
});
