/**
 * Contract Test: GET /api/search (Cache Behavior)
 *
 * Tests the search endpoint's caching behavior as specified in
 * specs/003-optimize-the-platform/contracts/caching-api.md
 *
 * This test MUST FAIL initially (caching not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ApiResponse } from '@/types/performance';

interface Story {
  id: number;
  title: string;
  author: string;
  fandomId: number;
  tags: string[];
  plotBlocks: string[];
  summary: string;
  url: string;
  wordCount: number;
  lastUpdated: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface CacheInfo {
  cached: boolean;
  cachedAt?: number;
  expiresIn?: number;
}

interface SearchResponse {
  stories: Story[];
  pagination: Pagination;
  cacheInfo: CacheInfo;
}

describe('Contract Test: GET /api/search (Cache Behavior)', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  beforeEach(async () => {
    // Clear cache before each test to ensure predictable behavior
    // TODO: Call cache invalidation endpoint if available
  });

  describe('Cache Headers', () => {
    it('should return Cache-Control header on cache hit', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst,time-travel',
        plotBlocks: 'goblin-inheritance',
      });

      // First request - cache miss
      const firstResponse = await fetch(`${BASE_URL}/api/search?${params}`);

      // Second request - cache hit
      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      expect(response.headers.get('Cache-Control')).toBeTruthy();
      expect(response.headers.get('Cache-Control')).toContain('public');
      expect(response.headers.get('Cache-Control')).toContain('max-age=300');
    });

    it('should return X-Cache-Status header', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBeTruthy();
      expect(['HIT', 'MISS', 'BYPASS', 'STALE']).toContain(cacheStatus!);
    });

    it('should return X-Cache-Key header with correct format', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst,time-travel',
        plotBlocks: 'goblin-inheritance',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const cacheKey = response.headers.get('X-Cache-Key');
      expect(cacheKey).toBeTruthy();

      // Cache key format: search:{fandomId}:{tags}:{plotBlocks}:v{version}
      expect(cacheKey).toMatch(
        /^search:1:angst,time-travel:goblin-inheritance:v\d+$/
      );
    });

    it('should return X-Response-Time header', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const responseTime = response.headers.get('X-Response-Time');
      expect(responseTime).toBeTruthy();
      expect(responseTime).toMatch(/^\d+ms$/);
    });
  });

  describe('Cache Key Format', () => {
    it('should use consistent cache key for identical queries', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst',
      });

      const response1 = await fetch(`${BASE_URL}/api/search?${params}`);
      const response2 = await fetch(`${BASE_URL}/api/search?${params}`);

      const key1 = response1.headers.get('X-Cache-Key');
      const key2 = response2.headers.get('X-Cache-Key');

      expect(key1).toBe(key2);
    });

    it('should handle empty tags in cache key', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const cacheKey = response.headers.get('X-Cache-Key');
      // Format: search:1:::v{version} (empty tags and plotBlocks)
      expect(cacheKey).toMatch(/^search:1:::v\d+$/);
    });

    it('should handle empty plotBlocks in cache key', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'fluff',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const cacheKey = response.headers.get('X-Cache-Key');
      // Format: search:1:fluff::v{version} (empty plotBlocks)
      expect(cacheKey).toMatch(/^search:1:fluff::v\d+$/);
    });

    it('should sort tags alphabetically in cache key', async () => {
      // Test that tag order doesn't affect cache key
      const params1 = new URLSearchParams({
        fandomId: '1',
        tags: 'time-travel,angst',
      });
      const params2 = new URLSearchParams({
        fandomId: '1',
        tags: 'angst,time-travel',
      });

      const response1 = await fetch(`${BASE_URL}/api/search?${params1}`);
      const response2 = await fetch(`${BASE_URL}/api/search?${params2}`);

      const key1 = response1.headers.get('X-Cache-Key');
      const key2 = response2.headers.get('X-Cache-Key');

      // Should be identical (sorted)
      expect(key1).toBe(key2);
    });
  });

  describe('Cache Hit/Miss Behavior', () => {
    it('should return MISS on first request', async () => {
      const uniqueTag = `test-${Date.now()}`;
      const params = new URLSearchParams({
        fandomId: '1',
        tags: uniqueTag,
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBe('MISS');
    });

    it('should return HIT on second identical request', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst',
      });

      // First request - cache miss
      await fetch(`${BASE_URL}/api/search?${params}`);

      // Wait a bit for cache to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request - cache hit
      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBe('HIT');
    });

    it('should include cache info in response body', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'fluff',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);
      const data: ApiResponse<SearchResponse> = await response.json();

      expect(data.data?.cacheInfo).toBeDefined();
      expect(typeof data.data?.cacheInfo.cached).toBe('boolean');

      if (data.data?.cacheInfo.cached) {
        expect(typeof data.data.cacheInfo.cachedAt).toBe('number');
        expect(typeof data.data.cacheInfo.expiresIn).toBe('number');
        expect(data.data.cacheInfo.expiresIn).toBeGreaterThan(0);
        expect(data.data.cacheInfo.expiresIn).toBeLessThanOrEqual(300); // 5 min TTL
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 500ms on cache miss', async () => {
      const uniqueTag = `perf-test-${Date.now()}`;
      const params = new URLSearchParams({
        fandomId: '1',
        tags: uniqueTag,
      });

      const start = performance.now();
      const response = await fetch(`${BASE_URL}/api/search?${params}`);
      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(cacheStatus).toBe('MISS');
    });

    it('should respond within 200ms on cache hit', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst,fluff',
      });

      // Prime the cache
      await fetch(`${BASE_URL}/api/search?${params}`);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Measure cache hit performance
      const start = performance.now();
      const response = await fetch(`${BASE_URL}/api/search?${params}`);
      const duration = performance.now() - start;

      expect(response.status).toBe(200);

      const cacheStatus = response.headers.get('X-Cache-Status');
      if (cacheStatus === 'HIT') {
        expect(duration).toBeLessThan(200);
      }
    });

    it('should report response time in header', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      const responseTime = response.headers.get('X-Response-Time');
      expect(responseTime).toBeTruthy();

      const timeMs = parseInt(responseTime!.replace('ms', ''));
      expect(timeMs).toBeGreaterThan(0);
      expect(timeMs).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Four-Layer Caching', () => {
    it('should support browser cache layer', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      // Browser cache enabled via Cache-Control header
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age=300');
    });

    it('should support Cloudflare edge cache layer', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'fluff',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);

      // Edge cache configured via s-maxage
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('s-maxage=300');
    });

    it('should use KV cache layer', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'time-travel',
      });

      // First request stores in KV
      const response1 = await fetch(`${BASE_URL}/api/search?${params}`);
      expect(response1.headers.get('X-Cache-Status')).toBe('MISS');

      // Second request retrieves from KV
      await new Promise(resolve => setTimeout(resolve, 100));
      const response2 = await fetch(`${BASE_URL}/api/search?${params}`);
      expect(response2.headers.get('X-Cache-Status')).toBe('HIT');
    });
  });

  describe('Response Schema', () => {
    it('should return stories with correct schema', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
        tags: 'angst',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);
      const data: ApiResponse<SearchResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.stories).toBeInstanceOf(Array);
      expect(data.data?.pagination).toBeDefined();

      if (data.data && data.data.stories.length > 0) {
        const story = data.data.stories[0];
        expect(typeof story.id).toBe('number');
        expect(typeof story.title).toBe('string');
        expect(typeof story.author).toBe('string');
        expect(typeof story.fandomId).toBe('number');
        expect(story.tags).toBeInstanceOf(Array);
        expect(story.plotBlocks).toBeInstanceOf(Array);
      }
    });

    it('should return pagination info', async () => {
      const params = new URLSearchParams({
        fandomId: '1',
      });

      const response = await fetch(`${BASE_URL}/api/search?${params}`);
      const data: ApiResponse<SearchResponse> = await response.json();

      const pagination = data.data?.pagination;
      expect(pagination).toBeDefined();
      expect(typeof pagination?.total).toBe('number');
      expect(typeof pagination?.limit).toBe('number');
      expect(typeof pagination?.offset).toBe('number');
      expect(typeof pagination?.hasMore).toBe('boolean');
    });
  });
});
