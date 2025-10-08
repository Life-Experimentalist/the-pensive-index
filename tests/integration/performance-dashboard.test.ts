/**
 * Integration Test: Performance Monitoring Dashboard
 *
 * Tests the performance dashboard as specified in
 * specs/003-optimize-the-platform/quickstart.md Phase 5
 *
 * This test MUST FAIL initially (dashboard not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Integration Test: Performance Monitoring Dashboard', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT token for testing
    adminToken = 'mock-admin-token';
  });

  describe('Dashboard Loading Performance', () => {
    it('should load dashboard within 2 seconds', async () => {
      const start = performance.now();

      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const elapsed = performance.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(2000);
    });

    it('should load with initial data populated', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      // Should have chart containers
      expect(html).toContain('performance-chart');
      expect(html).toContain('metrics-summary');
    });
  });

  describe('Real-Time Metrics Update', () => {
    it('should fetch updated metrics within 5 seconds', async () => {
      // Wait for initial load
      await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      // Trigger some activity
      await fetch(`${BASE_URL}/api/search?fandomId=1`);
      await fetch(`${BASE_URL}/api/validation/rules?fandomId=1`);

      // Fetch updated metrics
      const start = performance.now();
      const metricsResponse = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${Math.floor(
          (Date.now() - 300000) / 1000
        )}&end=${Math.floor(Date.now() / 1000)}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      const elapsed = performance.now() - start;

      expect(metricsResponse.status).toBe(200);
      expect(elapsed).toBeLessThan(5000);

      const data = await metricsResponse.json();
      expect(data.success).toBe(true);
    });

    it('should support polling for real-time updates', async () => {
      // Simulate polling every 5 seconds
      const polls: number[] = [];

      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const response = await fetch(
          `${BASE_URL}/api/admin/performance/metrics?start=${Math.floor(
            (Date.now() - 300000) / 1000
          )}&end=${Math.floor(Date.now() / 1000)}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          }
        );
        const elapsed = performance.now() - start;

        expect(response.status).toBe(200);
        polls.push(elapsed);

        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // All polls should be fast
      polls.forEach(time => {
        expect(time).toBeLessThan(1000);
      });
    }, 20000); // Extend timeout for polling test
  });

  describe('Time Range Filtering', () => {
    it('should support last 1 hour filter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.metrics).toBeDefined();
    });

    it('should support last 24 hours filter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should support last 7 days filter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - 7 * 86400;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${sevenDaysAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should support custom date range', async () => {
      const end = Math.floor(Date.now() / 1000);
      const start = end - 2 * 86400; // 2 days ago

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${start}&end=${end}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe('Chart Types Rendering', () => {
    it('should render response time chart', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('response-time-chart');
    });

    it('should render cache hit rate chart', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('cache-hit-rate-chart');
    });

    it('should render error rate chart', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('error-rate-chart');
    });

    it('should render request volume chart', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('request-volume-chart');
    });
  });

  describe('Dashboard Sections', () => {
    it('should display summary metrics section', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('summary-metrics');
      expect(html).toContain('total-requests');
      expect(html).toContain('avg-response-time');
      expect(html).toContain('cache-hit-rate');
      expect(html).toContain('error-rate');
    });

    it('should display resource usage section', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('resource-usage');
      expect(html).toContain('d1-reads');
      expect(html).toContain('d1-writes');
      expect(html).toContain('kv-operations');
    });

    it('should display recent errors section', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('recent-errors');
    });

    it('should display cache invalidation section', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const html = await response.text();

      expect(html).toContain('cache-invalidation');
    });
  });

  describe('Data Accuracy', () => {
    it('should show accurate request counts', async () => {
      // Make some test requests
      await fetch(`${BASE_URL}/api/search?fandomId=1`);
      await fetch(`${BASE_URL}/api/search?fandomId=1&tags=test`);

      // Wait for metrics to aggregate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch metrics
      const now = Math.floor(Date.now() / 1000);
      const fiveMinAgo = now - 300;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${fiveMinAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      expect(data.data?.summary.totalRequests).toBeGreaterThan(0);
    });

    it('should calculate percentiles correctly', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.data?.summary) {
        const summary = data.data.summary;

        // P50 <= P95 <= P99
        if (
          summary.p50ResponseTimeMs &&
          summary.p95ResponseTimeMs &&
          summary.p99ResponseTimeMs
        ) {
          expect(summary.p50ResponseTimeMs).toBeLessThanOrEqual(
            summary.p95ResponseTimeMs
          );
          expect(summary.p95ResponseTimeMs).toBeLessThanOrEqual(
            summary.p99ResponseTimeMs
          );
        }
      }
    });
  });

  describe('Interactive Features', () => {
    it('should support endpoint filtering', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneHourAgo}&end=${now}&endpoint=/api/search`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      // All metrics should be for /api/search endpoint
      data.data?.metrics.forEach((metric: any) => {
        if (metric.endpoint) {
          expect(metric.endpoint).toBe('/api/search');
        }
      });
    });

    it('should support user type filtering', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneHourAgo}&end=${now}&userType=ANONYMOUS`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Authorization', () => {
    it('should require admin authentication', async () => {
      const response = await fetch(`${BASE_URL}/admin/performance`);

      expect(response.status).toBe(401);
    });

    it('should reject non-admin users', async () => {
      const userToken = 'mock-user-token';

      const response = await fetch(`${BASE_URL}/admin/performance`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });
});
