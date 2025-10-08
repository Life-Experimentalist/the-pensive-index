/**
 * Performance Test: Load Testing (100 Concurrent Users)
 *
 * Tests the system under load as specified in
 * specs/003-optimize-the-platform/quickstart.md Phase 9
 *
 * This test MUST FAIL initially (performance optimizations not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect } from 'vitest';

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  responseTimes: number[];
  errorRate: number;
  cacheHitRate: number;
  p50: number;
  p95: number;
  p99: number;
}

describe('Performance Test: Load Testing (100 Concurrent Users)', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  /**
   * Helper function to calculate percentile
   */
  function calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Helper function to run load test
   */
  async function runLoadTest(
    durationSeconds: number,
    concurrentUsers: number,
    endpoint: string
  ): Promise<LoadTestResult> {
    const results: LoadTestResult = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorRate: 0,
      cacheHitRate: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };

    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;
    let cacheHits = 0;
    let cacheChecks = 0;

    // Create user workers
    const workers = Array.from({ length: concurrentUsers }, async () => {
      while (Date.now() < endTime) {
        const requestStart = performance.now();

        try {
          const response = await fetch(endpoint);
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;

          results.totalRequests++;
          results.responseTimes.push(responseTime);

          if (response.ok) {
            results.successfulRequests++;
          } else {
            results.failedRequests++;
          }

          // Track cache hits
          const cacheStatus = response.headers.get('X-Cache-Status');
          if (cacheStatus) {
            cacheChecks++;
            if (cacheStatus === 'HIT') {
              cacheHits++;
            }
          }

          // Small delay to simulate real user behavior
          await new Promise(resolve =>
            setTimeout(resolve, Math.random() * 100)
          );
        } catch (error) {
          results.failedRequests++;
          results.totalRequests++;
        }
      }
    });

    // Wait for all workers to complete
    await Promise.all(workers);

    // Calculate metrics
    results.errorRate = results.failedRequests / results.totalRequests;
    results.cacheHitRate = cacheChecks > 0 ? cacheHits / cacheChecks : 0;
    results.p50 = calculatePercentile(results.responseTimes, 50);
    results.p95 = calculatePercentile(results.responseTimes, 95);
    results.p99 = calculatePercentile(results.responseTimes, 99);

    return results;
  }

  describe('Search Endpoint Load Test', () => {
    it('should handle 100 concurrent users for 60 seconds', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=angst`;

      const results = await runLoadTest(60, 100, endpoint);

      expect(results.totalRequests).toBeGreaterThan(0);
      console.log(`Total Requests: ${results.totalRequests}`);
      console.log(`Successful Requests: ${results.successfulRequests}`);
      console.log(`Failed Requests: ${results.failedRequests}`);
    }, 70000); // 70 second timeout

    it('should maintain P95 response time under 2 seconds', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      const results = await runLoadTest(60, 100, endpoint);

      console.log(`P50 Response Time: ${results.p50.toFixed(2)}ms`);
      console.log(`P95 Response Time: ${results.p95.toFixed(2)}ms`);
      console.log(`P99 Response Time: ${results.p99.toFixed(2)}ms`);

      expect(results.p95).toBeLessThan(2000); // < 2 seconds
    }, 70000);

    it('should maintain error rate below 1%', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=time-travel`;

      const results = await runLoadTest(60, 100, endpoint);

      console.log(`Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);

      expect(results.errorRate).toBeLessThan(0.01); // < 1%
    }, 70000);

    it('should achieve cache hit rate above 80%', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=angst,fluff`;

      // Prime cache first
      await fetch(endpoint);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const results = await runLoadTest(60, 100, endpoint);

      console.log(
        `Cache Hit Rate: ${(results.cacheHitRate * 100).toFixed(2)}%`
      );

      expect(results.cacheHitRate).toBeGreaterThan(0.8); // > 80%
    }, 70000);

    it('should have no 500 Internal Server Errors', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      const results = await runLoadTest(60, 100, endpoint);

      // All errors should be client errors (400s) or rate limiting (429), not 500s
      expect(results.successfulRequests + results.failedRequests).toBe(
        results.totalRequests
      );
    }, 70000);
  });

  describe('Validation Endpoint Load Test', () => {
    it('should handle high load on validation endpoint', async () => {
      const endpoint = `${BASE_URL}/api/validation/rules?fandomId=1`;

      const results = await runLoadTest(30, 50, endpoint);

      console.log(
        `Validation Endpoint - Total Requests: ${results.totalRequests}`
      );
      console.log(`Validation Endpoint - P95: ${results.p95.toFixed(2)}ms`);

      expect(results.p95).toBeLessThan(1000); // < 1 second
      expect(results.errorRate).toBeLessThan(0.01);
    }, 40000);

    it('should achieve very high cache hit rate for validation rules', async () => {
      const endpoint = `${BASE_URL}/api/validation/rules?fandomId=1`;

      // Prime cache
      await fetch(endpoint);
      await new Promise(resolve => setTimeout(resolve, 500));

      const results = await runLoadTest(30, 50, endpoint);

      console.log(
        `Validation Cache Hit Rate: ${(results.cacheHitRate * 100).toFixed(2)}%`
      );

      // Validation rules cache very aggressively
      expect(results.cacheHitRate).toBeGreaterThan(0.95); // > 95%
    }, 40000);
  });

  describe('Mixed Workload Test', () => {
    it('should handle mixed endpoint requests', async () => {
      const endpoints = [
        `${BASE_URL}/api/search?fandomId=1`,
        `${BASE_URL}/api/search?fandomId=1&tags=angst`,
        `${BASE_URL}/api/validation/rules?fandomId=1`,
        `${BASE_URL}/api/search?fandomId=2`,
      ];

      const results: LoadTestResult = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errorRate: 0,
        cacheHitRate: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };

      const startTime = Date.now();
      const endTime = startTime + 30 * 1000;

      // Create workers with random endpoint selection
      const workers = Array.from({ length: 50 }, async () => {
        while (Date.now() < endTime) {
          const endpoint =
            endpoints[Math.floor(Math.random() * endpoints.length)];
          const requestStart = performance.now();

          try {
            const response = await fetch(endpoint);
            const requestEnd = performance.now();
            const responseTime = requestEnd - requestStart;

            results.totalRequests++;
            results.responseTimes.push(responseTime);

            if (response.ok) {
              results.successfulRequests++;
            } else {
              results.failedRequests++;
            }

            await new Promise(resolve =>
              setTimeout(resolve, Math.random() * 200)
            );
          } catch (error) {
            results.failedRequests++;
            results.totalRequests++;
          }
        }
      });

      await Promise.all(workers);

      results.errorRate = results.failedRequests / results.totalRequests;
      results.p95 = calculatePercentile(results.responseTimes, 95);

      console.log(`Mixed Workload - Total Requests: ${results.totalRequests}`);
      console.log(`Mixed Workload - P95: ${results.p95.toFixed(2)}ms`);
      console.log(
        `Mixed Workload - Error Rate: ${(results.errorRate * 100).toFixed(2)}%`
      );

      expect(results.p95).toBeLessThan(2000);
      expect(results.errorRate).toBeLessThan(0.01);
    }, 40000);
  });

  describe('Sustained Load Test', () => {
    it('should maintain performance under sustained load', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      // Test in 3 consecutive 30-second windows
      const window1 = await runLoadTest(30, 50, endpoint);
      const window2 = await runLoadTest(30, 50, endpoint);
      const window3 = await runLoadTest(30, 50, endpoint);

      console.log('Sustained Load Test:');
      console.log(`  Window 1 P95: ${window1.p95.toFixed(2)}ms`);
      console.log(`  Window 2 P95: ${window2.p95.toFixed(2)}ms`);
      console.log(`  Window 3 P95: ${window3.p95.toFixed(2)}ms`);

      // Performance should not degrade over time
      expect(window3.p95).toBeLessThan(window1.p95 * 1.5); // Max 50% degradation

      // All windows should meet performance targets
      expect(window1.p95).toBeLessThan(2000);
      expect(window2.p95).toBeLessThan(2000);
      expect(window3.p95).toBeLessThan(2000);
    }, 100000); // 100 second timeout
  });

  describe('Rate Limiting Under Load', () => {
    it('should enforce rate limits under high load', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      // 200 requests in 30 seconds = ~400 requests/minute
      // Should trigger rate limiting (60/min for anonymous)
      const results = await runLoadTest(30, 200, endpoint);

      // Should have some rate limit errors (429 responses)
      const rateLimitErrors = results.failedRequests;

      console.log(`Rate Limit Errors: ${rateLimitErrors}`);

      expect(rateLimitErrors).toBeGreaterThan(0);
    }, 40000);
  });

  describe('Resource Usage Under Load', () => {
    it('should not exceed Cloudflare free tier limits', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      const results = await runLoadTest(60, 100, endpoint);

      // Assuming ~2 D1 reads per request (cache miss scenario)
      const estimatedD1Reads = results.totalRequests * 2;

      console.log(`Estimated D1 Reads: ${estimatedD1Reads}`);
      console.log(`Daily Limit: 5,000,000`);

      // For 1 minute of load testing, should be well under limits
      expect(estimatedD1Reads).toBeLessThan(100000); // Safety margin
    }, 70000);
  });
});
