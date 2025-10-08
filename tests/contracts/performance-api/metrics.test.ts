/**
 * Contract Test: GET /api/admin/performance/metrics
 *
 * Tests the performance metrics endpoint contract as specified in
 * specs/003-optimize-the-platform/contracts/performance-api.md
 *
 * This test MUST FAIL initially (endpoint not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type {
  ApiResponse,
  MetricsSummary,
  MetricsQueryParams,
} from '@/types/performance';

describe('Contract Test: GET /api/admin/performance/metrics', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT token for testing
    // This will be implemented when auth is set up
    adminToken = 'mock-admin-token';
  });

  describe('Request Validation', () => {
    it('should require start and end timestamps', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<MetricsSummary> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('MISSING_REQUIRED_PARAMS');
    });

    it('should validate that end is after start', async () => {
      const params: MetricsQueryParams = {
        start: 1704153600,
        end: 1704067200, // Before start - invalid
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${params.start}&end=${params.end}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<MetricsSummary> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_TIME_RANGE');
      expect(data.error?.message).toContain(
        'End time must be after start time'
      );
    });

    it('should enforce maximum 30-day time range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${thirtyOneDaysAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<MetricsSummary> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('TIME_RANGE_TOO_LARGE');
      expect(data.error?.message).toContain('Maximum 30 days');
    });

    it('should validate groupBy parameter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}&groupBy=invalid`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<MetricsSummary> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_GROUP_BY');
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}`
      );

      expect(response.status).toBe(401);
      const data: ApiResponse<MetricsSummary> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('UNAUTHORIZED');
      expect(data.error?.message).toContain('Admin authentication required');
    });

    it('should reject non-admin users', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;
      const userToken = 'mock-user-token'; // Non-admin token

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      expect(response.status).toBe(403);
      const data: ApiResponse<MetricsSummary> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Response Schema', () => {
    it('should return metrics with correct schema', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<MetricsSummary> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data?.metrics).toBeInstanceOf(Array);
      expect(data.data?.summary).toBeDefined();

      // Validate summary schema
      const summary = data.data!.summary;
      expect(typeof summary.totalRequests).toBe('number');
      expect(typeof summary.avgResponseTimeMs).toBe('number');
      expect(typeof summary.p95ResponseTimeMs).toBe('number');
      expect(typeof summary.errorRate).toBe('number');
      expect(typeof summary.cacheHitRate).toBe('number');

      // Validate error rate is percentage (0-1)
      expect(summary.errorRate).toBeGreaterThanOrEqual(0);
      expect(summary.errorRate).toBeLessThanOrEqual(1);

      // Validate cache hit rate is percentage (0-1)
      expect(summary.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(summary.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('should return metrics array with correct item schema', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<MetricsSummary> = await response.json();

      if (data.data && data.data.metrics.length > 0) {
        const metric = data.data.metrics[0];

        expect(typeof metric.timestamp).toBe('number');
        expect(typeof metric.endpoint).toBe('string');
        expect(typeof metric.totalRequests).toBe('number');
        expect(typeof metric.avgResponseTimeMs).toBe('number');
        expect(typeof metric.p50ResponseTimeMs).toBe('number');
        expect(typeof metric.p95ResponseTimeMs).toBe('number');
        expect(typeof metric.p99ResponseTimeMs).toBe('number');
        expect(typeof metric.errorCount).toBe('number');
        expect(typeof metric.cacheHitCount).toBe('number');
        expect(typeof metric.cacheMissCount).toBe('number');
      }
    });
  });

  describe('Filtering', () => {
    it('should filter by endpoint', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}&endpoint=/api/search`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<MetricsSummary> = await response.json();

      // All returned metrics should be for /api/search
      data.data?.metrics.forEach(metric => {
        expect(metric.endpoint).toBe('/api/search');
      });
    });

    it('should filter by userType', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}&userType=ANONYMOUS`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<MetricsSummary> = await response.json();

      // Metrics should be filtered for anonymous users
      expect(data.success).toBe(true);
    });

    it('should support groupBy parameter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}&groupBy=hour`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<MetricsSummary> = await response.json();

      // Should return hourly aggregated data
      expect(data.success).toBe(true);
      expect(data.data?.metrics).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 500ms', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const startTime = performance.now();

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500); // Must respond within 500ms
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit for admin users (60 req/min)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      // Make 61 requests rapidly
      const requests = Array.from({ length: 61 }, () =>
        fetch(
          `${BASE_URL}/api/admin/performance/metrics?start=${oneDayAgo}&end=${now}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          }
        )
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);

      // At least one request should be rate limited
      expect(tooManyRequests.length).toBeGreaterThan(0);

      // Check Retry-After header
      const rateLimitedResponse = tooManyRequests[0];
      expect(rateLimitedResponse.headers.get('Retry-After')).toBeDefined();
    });
  });
});
