/**
 * Performance Testing Setup and Configuration
 *
 * Global setup for performance tests including monitoring utilities,
 * mock configurations, and performance thresholds.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';

// Global performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  // API Response Times (milliseconds)
  API_RESPONSE_TIME: {
    FAST: 100, // Permission checks, simple queries
    NORMAL: 300, // User management, role operations
    SLOW: 800, // Complex queries, audit logs
    BULK: 2000, // Bulk operations, exports
  },

  // UI Rendering Times (milliseconds)
  UI_RENDER_TIME: {
    SMALL_DATASET: 500, // < 100 items
    MEDIUM_DATASET: 1500, // 100-1000 items
    LARGE_DATASET: 5000, // 1000+ items
  },

  // Memory Usage (bytes)
  MEMORY_USAGE: {
    MAX_GROWTH: 100 * 1024 * 1024, // 100MB max growth during tests
    LEAK_THRESHOLD: 50 * 1024 * 1024, // 50MB considered potential leak
  },

  // Throughput (requests per second)
  THROUGHPUT: {
    MIN_RPS_LIGHT: 20, // Light operations
    MIN_RPS_NORMAL: 10, // Normal operations
    MIN_RPS_HEAVY: 5, // Heavy operations
  },

  // Error Rates (percentage)
  ERROR_RATES: {
    MAX_ACCEPTABLE: 0.05, // 5% max error rate
    MAX_BURST: 0.1, // 10% max during burst traffic
  },
};

// Global performance metrics collector
export class GlobalPerformanceMonitor {
  private static instance: GlobalPerformanceMonitor;
  private testResults: Map<string, any> = new Map();
  private memorySnapshots: NodeJS.MemoryUsage[] = [];
  private gcCount = 0;

  static getInstance(): GlobalPerformanceMonitor {
    if (!GlobalPerformanceMonitor.instance) {
      GlobalPerformanceMonitor.instance = new GlobalPerformanceMonitor();
    }
    return GlobalPerformanceMonitor.instance;
  }

  recordTestResult(testName: string, metrics: any) {
    this.testResults.set(testName, {
      ...metrics,
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
    });
  }

  recordMemorySnapshot() {
    this.memorySnapshots.push(process.memoryUsage());
  }

  getTestResults() {
    return Object.fromEntries(this.testResults);
  }

  getMemoryTrend() {
    if (this.memorySnapshots.length < 2) return null;

    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];

    return {
      heapGrowth: last.heapUsed - first.heapUsed,
      maxHeapUsed: Math.max(...this.memorySnapshots.map(s => s.heapUsed)),
      avgHeapUsed:
        this.memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) /
        this.memorySnapshots.length,
      snapshots: this.memorySnapshots.length,
    };
  }

  reset() {
    this.testResults.clear();
    this.memorySnapshots = [];
    this.gcCount = 0;
  }

  generateReport() {
    const results = this.getTestResults();
    const memoryTrend = this.getMemoryTrend();

    return {
      summary: {
        totalTests: this.testResults.size,
        memoryTrend,
        thresholds: PERFORMANCE_THRESHOLDS,
      },
      results,
      generatedAt: new Date().toISOString(),
    };
  }
}

// Performance measurement utilities
export const measureAsync = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

export const measureSync = <T>(
  fn: () => T
): { result: T; duration: number } => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
};

export const measureMemory = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; memoryDelta: number }> => {
  const before = process.memoryUsage();
  const result = await fn();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const after = process.memoryUsage();
  const memoryDelta = after.heapUsed - before.heapUsed;

  return { result, memoryDelta };
};

// Mock setup for performance tests
export const setupPerformanceMocks = () => {
  // Mock fetch for consistent network simulation
  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    const delay = getResponseDelay(url);
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: generateMockData(url),
          responseTime: delay,
        }),
      headers: new Map([['content-type', 'application/json']]),
    };
  });

  // Mock console to capture performance warnings
  const originalWarn = console.warn;
  console.warn = vi.fn((message: string) => {
    if (message.includes('Slow') || message.includes('performance')) {
      GlobalPerformanceMonitor.getInstance().recordTestResult(
        'performance-warning',
        {
          message,
          timestamp: Date.now(),
        }
      );
    }
    originalWarn(message);
  });
};

const getResponseDelay = (url: string): number => {
  if (url.includes('permissions')) return 20 + Math.random() * 30;
  if (url.includes('users')) return 50 + Math.random() * 50;
  if (url.includes('roles')) return 60 + Math.random() * 40;
  if (url.includes('audit-logs')) return 100 + Math.random() * 100;
  if (url.includes('export')) return 200 + Math.random() * 300;
  return 30 + Math.random() * 70;
};

const generateMockData = (url: string): any => {
  if (url.includes('users')) {
    const count = url.includes('limit=1000') ? 1000 : 50;
    return Array.from({ length: count }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: ['admin', 'moderator', 'user'][i % 3],
    }));
  }

  if (url.includes('roles')) {
    return ['super-admin', 'project-admin', 'fandom-admin', 'moderator'];
  }

  if (url.includes('permissions')) {
    return [
      'admin.users.read',
      'admin.users.write',
      'admin.roles.assign',
      'admin.audit.read',
      'admin.system.manage',
    ];
  }

  if (url.includes('audit-logs')) {
    const count = 500;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      action: ['login', 'role_assignment', 'user_update'][i % 3],
      userId: `user-${i % 100}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
    }));
  }

  return { success: true };
};

// Test environment setup
beforeAll(async () => {
  // Initialize performance monitoring
  const monitor = GlobalPerformanceMonitor.getInstance();
  monitor.reset();

  // Setup performance-optimized test environment
  setupPerformanceMocks();

  // Record initial memory state
  monitor.recordMemorySnapshot();

  // Enable garbage collection if available
  if (global.gc) {
    global.gc();
  }

  console.log('Performance testing environment initialized');
});

afterAll(async () => {
  const monitor = GlobalPerformanceMonitor.getInstance();
  monitor.recordMemorySnapshot();

  // Generate performance report
  const report = monitor.generateReport();

  // Log performance summary
  console.log('\n=== Performance Test Summary ===');
  console.log(`Total tests: ${report.summary.totalTests}`);

  if (report.summary.memoryTrend) {
    const trend = report.summary.memoryTrend;
    console.log(
      `Memory growth: ${(trend.heapGrowth / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(
      `Max heap used: ${(trend.maxHeapUsed / 1024 / 1024).toFixed(2)}MB`
    );

    if (trend.heapGrowth > PERFORMANCE_THRESHOLDS.MEMORY_USAGE.LEAK_THRESHOLD) {
      console.warn(
        `⚠️  Potential memory leak detected: ${(
          trend.heapGrowth /
          1024 /
          1024
        ).toFixed(2)}MB growth`
      );
    }
  }

  // Save detailed report for analysis
  if (process.env.SAVE_PERFORMANCE_REPORT) {
    const fs = await import('fs/promises');
    await fs.writeFile(
      'performance-test-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log(
      'Detailed performance report saved to performance-test-report.json'
    );
  }

  console.log('=== End Performance Summary ===\n');
});

beforeEach(() => {
  const monitor = GlobalPerformanceMonitor.getInstance();
  monitor.recordMemorySnapshot();

  // Clear all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  const monitor = GlobalPerformanceMonitor.getInstance();
  monitor.recordMemorySnapshot();

  // Force garbage collection between tests if available
  if (global.gc) {
    global.gc();
  }
});
