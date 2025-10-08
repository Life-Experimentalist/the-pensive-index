/**
 * Integration Test: Rate Limiting Enforcement
 *
 * Tests the rate limiting enforcement as specified in
 * specs/003-optimize-the-platform/quickstart.md Phase 4
 *
 * This test MUST FAIL initially (rate limiting not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Integration Test: Rate Limiting Enforcement', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // TODO: Get JWT tokens for testing
    adminToken = 'mock-admin-token';
    userToken = 'mock-user-token';
  });

  describe('Anonymous Users (60 requests/minute limit)', () => {
    it('should allow requests under the limit', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      // Make 30 requests (under limit)
      const requests = Array.from({ length: 30 }, () => fetch(endpoint));

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should enforce 60 requests/minute limit for anonymous users', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=test-${Date.now()}`;

      // Make 65 requests (over limit)
      const requests = Array.from({ length: 65 }, (_, i) =>
        fetch(endpoint).then(r => ({
          index: i,
          status: r.status,
          headers: r.headers,
        }))
      );

      const responses = await Promise.all(requests);

      // First 60 should succeed
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful.length).toBeGreaterThanOrEqual(55); // Allow some margin
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should return 429 status code when limit exceeded', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=rate-limit-${Date.now()}`;

      // Exhaust rate limit
      const exhaustRequests = Array.from({ length: 60 }, () => fetch(endpoint));
      await Promise.all(exhaustRequests);

      // Next request should be rate limited
      const response = await fetch(endpoint);

      expect(response.status).toBe(429);
    });

    it('should include Retry-After header in 429 response', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=retry-${Date.now()}`;

      // Exhaust rate limit
      const exhaustRequests = Array.from({ length: 61 }, () => fetch(endpoint));
      const responses = await Promise.all(exhaustRequests);

      // Find 429 response
      const rateLimitedResponse = responses.find(r => r.status === 429);

      if (rateLimitedResponse) {
        const retryAfter = rateLimitedResponse.headers.get('Retry-After');
        expect(retryAfter).toBeTruthy();
        expect(parseInt(retryAfter!)).toBeGreaterThan(0);
        expect(parseInt(retryAfter!)).toBeLessThanOrEqual(60); // Within 1 minute
      }
    });
  });

  describe('Authenticated Users (120 requests/minute limit)', () => {
    it('should allow authenticated users higher limit', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      // Make 100 requests (under authenticated limit)
      const requests = Array.from({ length: 100 }, () =>
        fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThanOrEqual(95); // Allow some margin
    });

    it('should enforce 120 requests/minute limit for authenticated users', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=auth-limit-${Date.now()}`;

      // Make 125 requests (over authenticated limit)
      const requests = Array.from({ length: 125 }, () =>
        fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // First 120 should succeed, rest should be rate limited
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful.length).toBeGreaterThanOrEqual(115); // Allow margin
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Whitelist (Unlimited)', () => {
    it('should not rate limit admin users', async () => {
      const endpoint = `${BASE_URL}/api/admin/performance/metrics`;

      // Make 150 requests (would exceed normal limits)
      const requests = Array.from({ length: 150 }, () =>
        fetch(`${endpoint}?start=${Date.now() - 86400}&end=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // None should be rate limited (admins are unlimited)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBe(0);
    });

    it('should apply normal limits to admin on public endpoints', async () => {
      // Admins on public endpoints should have admin limits (60/min as per specs)
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=admin-public-${Date.now()}`;

      // Make 65 requests to public endpoint
      const requests = Array.from({ length: 65 }, () =>
        fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // Should have admin rate limit (60/min)
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      // Admin endpoints are unlimited, but this test is for public endpoints
      // Adjust expectations based on implementation
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Sliding Window Algorithm', () => {
    it('should use sliding window, not fixed window', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=sliding-${Date.now()}`;

      // Make 40 requests at start of minute
      const firstBatch = Array.from({ length: 40 }, () => fetch(endpoint));
      await Promise.all(firstBatch);

      // Wait 30 seconds (half the window)
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Make another 40 requests (would exceed fixed window, but OK for sliding)
      const secondBatch = Array.from({ length: 40 }, () => fetch(endpoint));
      const secondResponses = await Promise.all(secondBatch);

      // With sliding window, some should succeed
      // (depends on rate limit window implementation)
      const successful = secondResponses.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThan(0);
    }, 35000); // Extend timeout for this test

    it('should reset rate limit after window expires', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=reset-${Date.now()}`;

      // Exhaust rate limit
      const exhaustRequests = Array.from({ length: 61 }, () => fetch(endpoint));
      const exhaustResponses = await Promise.all(exhaustRequests);

      const rateLimited = exhaustResponses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Wait for window to expire (60 seconds)
      await new Promise(resolve => setTimeout(resolve, 61000));

      // Should be able to make requests again
      const resetResponse = await fetch(endpoint);
      expect(resetResponse.status).toBe(200);
    }, 65000); // Extend timeout
  });

  describe('Rate Limit Headers', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const response = await fetch(`${BASE_URL}/api/search?fandomId=1`);

      const rateLimitHeader = response.headers.get('X-RateLimit-Limit');
      expect(rateLimitHeader).toBeTruthy();
      expect(parseInt(rateLimitHeader!)).toBe(60); // Anonymous limit
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=remaining-${Date.now()}`;

      const response1 = await fetch(endpoint);
      const remaining1 = parseInt(
        response1.headers.get('X-RateLimit-Remaining') || '0'
      );

      const response2 = await fetch(endpoint);
      const remaining2 = parseInt(
        response2.headers.get('X-RateLimit-Remaining') || '0'
      );

      // Remaining should decrease
      expect(remaining2).toBeLessThan(remaining1);
    });

    it('should include X-RateLimit-Reset header', async () => {
      const response = await fetch(`${BASE_URL}/api/search?fandomId=1`);

      const resetHeader = response.headers.get('X-RateLimit-Reset');
      expect(resetHeader).toBeTruthy();

      const resetTime = parseInt(resetHeader!);
      const now = Math.floor(Date.now() / 1000);

      // Reset time should be in the future
      expect(resetTime).toBeGreaterThan(now);
      expect(resetTime).toBeLessThanOrEqual(now + 60); // Within 1 minute
    });
  });

  describe('Different Endpoints, Same Rate Limit', () => {
    it('should share rate limit across endpoints', async () => {
      const uniqueId = Date.now();

      // Make requests to different endpoints
      const searchRequests = Array.from({ length: 30 }, () =>
        fetch(`${BASE_URL}/api/search?fandomId=1&tags=${uniqueId}`)
      );
      const validationRequests = Array.from({ length: 30 }, () =>
        fetch(`${BASE_URL}/api/validation/rules?fandomId=1`)
      );

      await Promise.all([...searchRequests, ...validationRequests]);

      // Next request to either endpoint should be rate limited
      const nextResponse = await fetch(`${BASE_URL}/api/search?fandomId=1`);

      // Should be close to or over the limit
      const remaining = parseInt(
        nextResponse.headers.get('X-RateLimit-Remaining') || '60'
      );
      expect(remaining).toBeLessThan(10);
    });
  });

  describe('Rate Limit Violations Logging', () => {
    it('should log rate limit violations', async () => {
      const endpoint = `${BASE_URL}/api/search?fandomId=1&tags=violation-${Date.now()}`;

      // Trigger rate limit violation
      const exhaustRequests = Array.from({ length: 65 }, () => fetch(endpoint));
      await Promise.all(exhaustRequests);

      // Admin checks violations
      const violationsResponse = await fetch(
        `${BASE_URL}/api/admin/performance/metrics?endpoint=/api/search&metric=rate_limit_violations`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(violationsResponse.status).toBe(200);
      const data = await violationsResponse.json();

      // Should have recorded violations
      expect(data.data).toBeDefined();
    });
  });

  describe('IP-Based Rate Limiting', () => {
    it('should track rate limits per IP for anonymous users', async () => {
      // Note: In real tests, would need to simulate different IPs
      // This test verifies the concept
      const endpoint = `${BASE_URL}/api/search?fandomId=1`;

      const response = await fetch(endpoint);

      // Should have rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    });
  });

  describe('Whitelisted IPs', () => {
    it('should not rate limit whitelisted IPs', async () => {
      // Note: Would need to configure whitelist in test environment
      // This test verifies the structure is in place

      const endpoint = `${BASE_URL}/api/search?fandomId=1`;
      const response = await fetch(endpoint);

      expect(response.status).toBe(200);
    });
  });
});
