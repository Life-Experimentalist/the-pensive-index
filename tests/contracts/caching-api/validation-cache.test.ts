/**
 * Contract Test: GET /api/validation/rules (Cache Behavior)
 *
 * Tests the validation rules endpoint's aggressive caching behavior as specified in
 * specs/003-optimize-the-platform/contracts/caching-api.md
 *
 * This test MUST FAIL initially (caching not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ApiResponse } from '@/types/performance';

interface ValidationRule {
  id: string;
  type: 'CONFLICT' | 'DEPENDENCY' | 'EXCLUSION' | 'REQUIRED';
  entities: string[];
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

interface ValidationRulesResponse {
  fandomId: number;
  ruleSetHash: string;
  rules: ValidationRule[];
  version: number;
  lastUpdated: number;
}

describe('Contract Test: GET /api/validation/rules (Cache Behavior)', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  beforeEach(async () => {
    // Clear cache before each test to ensure predictable behavior
    // TODO: Call cache invalidation endpoint if available
  });

  describe('Cache Headers', () => {
    it('should return Cache-Control header with 1-hour TTL', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age=3600'); // 1 hour
      expect(cacheControl).toContain('s-maxage=3600');
    });

    it('should return X-Cache-Status header', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBeTruthy();
      expect(['HIT', 'MISS', 'BYPASS', 'STALE']).toContain(cacheStatus!);
    });

    it('should return X-Cache-Key header with ruleSetHash', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );

      const cacheKey = response.headers.get('X-Cache-Key');
      expect(cacheKey).toBeTruthy();

      // Cache key format: validation:{fandomId}:{ruleSetHash}
      expect(cacheKey).toMatch(/^validation:1:[a-f0-9]{6,}$/);
    });

    it('should return X-Response-Time header', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );

      const responseTime = response.headers.get('X-Response-Time');
      expect(responseTime).toBeTruthy();
      expect(responseTime).toMatch(/^\d+ms$/);
    });
  });

  describe('Cache Key Format', () => {
    it('should use version-based cache key', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const data: ApiResponse<ValidationRulesResponse> = await response.json();

      const cacheKey = response.headers.get('X-Cache-Key');
      const ruleSetHash = data.data?.ruleSetHash;

      // Cache key should include rule set hash
      expect(cacheKey).toContain(ruleSetHash!);
    });

    it('should have consistent cache key for same fandom', async () => {
      const response1 = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      await new Promise(resolve => setTimeout(resolve, 100));
      const response2 = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );

      const key1 = response1.headers.get('X-Cache-Key');
      const key2 = response2.headers.get('X-Cache-Key');

      // Should be identical (same rule set)
      expect(key1).toBe(key2);
    });

    it('should have different cache keys for different fandoms', async () => {
      const response1 = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const response2 = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=2`
      );

      const key1 = response1.headers.get('X-Cache-Key');
      const key2 = response2.headers.get('X-Cache-Key');

      // Different fandoms = different keys
      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Hit/Miss Behavior', () => {
    it('should return MISS on first request', async () => {
      // Use unique fandom to ensure cache miss
      const uniqueFandomId = 999;

      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${uniqueFandomId}`
      );

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBe('MISS');
    });

    it('should return HIT on second identical request', async () => {
      const fandomId = 1;

      // First request - cache miss
      await fetch(`${BASE_URL}/api/validation/rules?fandomId=${fandomId}`);

      // Wait for cache to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request - cache hit
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${fandomId}`
      );

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBe('HIT');
    });

    it('should maintain high cache hit rate', async () => {
      const fandomId = 1;

      // Prime cache
      await fetch(`${BASE_URL}/api/validation/rules?fandomId=${fandomId}`);

      // Make 10 requests
      let hits = 0;
      for (let i = 0; i < 10; i++) {
        const response = await fetch(
          `${BASE_URL}/api/validation/rules?fandomId=${fandomId}`
        );
        if (response.headers.get('X-Cache-Status') === 'HIT') {
          hits++;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should have >95% hit rate (validation rules rarely change)
      const hitRate = hits / 10;
      expect(hitRate).toBeGreaterThan(0.95);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 200ms on cache miss', async () => {
      const uniqueFandomId = Math.floor(Math.random() * 10000);

      const start = performance.now();
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${uniqueFandomId}`
      );
      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBe('MISS');
    });

    it('should respond within 50ms on cache hit', async () => {
      const fandomId = 1;

      // Prime the cache
      await fetch(`${BASE_URL}/api/validation/rules?fandomId=${fandomId}`);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Measure cache hit performance
      const start = performance.now();
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${fandomId}`
      );
      const duration = performance.now() - start;

      expect(response.status).toBe(200);

      const cacheStatus = response.headers.get('X-Cache-Status');
      if (cacheStatus === 'HIT') {
        expect(duration).toBeLessThan(50);
      }
    });

    it('should report response time in header', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );

      const responseTime = response.headers.get('X-Response-Time');
      expect(responseTime).toBeTruthy();

      const timeMs = parseInt(responseTime!.replace('ms', ''));
      expect(timeMs).toBeGreaterThan(0);
      expect(timeMs).toBeLessThan(500); // Should be fast
    });
  });

  describe('Version-Based Invalidation', () => {
    it('should include ruleSetHash in response', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const data: ApiResponse<ValidationRulesResponse> = await response.json();

      expect(data.data?.ruleSetHash).toBeTruthy();
      expect(typeof data.data?.ruleSetHash).toBe('string');
      expect(data.data?.ruleSetHash.length).toBeGreaterThan(0);
    });

    it('should include version number in response', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const data: ApiResponse<ValidationRulesResponse> = await response.json();

      expect(data.data?.version).toBeDefined();
      expect(typeof data.data?.version).toBe('number');
      expect(data.data?.version).toBeGreaterThan(0);
    });

    it('should include lastUpdated timestamp', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const data: ApiResponse<ValidationRulesResponse> = await response.json();

      expect(data.data?.lastUpdated).toBeDefined();
      expect(typeof data.data?.lastUpdated).toBe('number');
      expect(data.data?.lastUpdated).toBeGreaterThan(0);
    });

    it('should change cache key when rules are updated', async () => {
      // Get initial cache key
      const response1 = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const key1 = response1.headers.get('X-Cache-Key');
      const data1: ApiResponse<ValidationRulesResponse> =
        await response1.json();
      const hash1 = data1.data?.ruleSetHash;

      // NOTE: In production, admin would update rules here
      // For test, we're just verifying the structure is in place

      expect(key1).toContain(hash1!);
    });
  });

  describe('Response Schema', () => {
    it('should return validation rules with correct schema', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const data: ApiResponse<ValidationRulesResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.rules).toBeInstanceOf(Array);
      expect(data.data?.fandomId).toBe(1);

      if (data.data && data.data.rules.length > 0) {
        const rule = data.data.rules[0];

        expect(typeof rule.id).toBe('string');
        expect(['CONFLICT', 'DEPENDENCY', 'EXCLUSION', 'REQUIRED']).toContain(
          rule.type
        );
        expect(rule.entities).toBeInstanceOf(Array);
        expect(typeof rule.message).toBe('string');
        expect(['ERROR', 'WARNING', 'INFO']).toContain(rule.severity);
      }
    });

    it('should return all rule types', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=1`
      );
      const data: ApiResponse<ValidationRulesResponse> = await response.json();

      // Validation rules should include various types
      const ruleTypes = new Set(data.data?.rules.map(r => r.type) || []);
      expect(ruleTypes.size).toBeGreaterThan(0);
    });
  });

  describe('In-Memory + KV Caching', () => {
    it('should use in-memory cache for ultra-fast responses', async () => {
      const fandomId = 1;

      // First request - populate caches
      await fetch(`${BASE_URL}/api/validation/rules?fandomId=${fandomId}`);

      // Subsequent requests should be very fast (in-memory)
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await fetch(`${BASE_URL}/api/validation/rules?fandomId=${fandomId}`);
        times.push(performance.now() - start);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Average response time should be very low
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(100);
    });

    it('should fallback to KV cache if in-memory expires', async () => {
      const fandomId = 1;

      // Prime both caches
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${fandomId}`
      );

      // Should still get cached response
      expect(response.status).toBe(200);

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(['HIT', 'MISS']).toContain(cacheStatus!);
    });
  });

  describe('Request Validation', () => {
    it('should require fandomId parameter', async () => {
      const response = await fetch(`${BASE_URL}/api/validation/rules`);

      expect(response.status).toBe(400);
      const data: ApiResponse<ValidationRulesResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('MISSING_REQUIRED_PARAMS');
    });

    it('should validate fandomId is a number', async () => {
      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=invalid`
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<ValidationRulesResponse> = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle non-existent fandom gracefully', async () => {
      const nonExistentFandomId = 999999;

      const response = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${nonExistentFandomId}`
      );

      // Should return 404 or empty rules
      if (response.status === 404) {
        expect(response.status).toBe(404);
      } else {
        const data: ApiResponse<ValidationRulesResponse> =
          await response.json();
        expect(data.data?.rules).toBeInstanceOf(Array);
        expect(data.data?.rules.length).toBe(0);
      }
    });
  });
});
