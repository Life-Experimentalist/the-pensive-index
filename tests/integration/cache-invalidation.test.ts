/**
 * Integration Test: Cache Invalidation Flow
 *
 * Tests the cache invalidation workflow as specified in
 * specs/003-optimize-the-platform/quickstart.md Phase 3
 *
 * This test MUST FAIL initially (cache invalidation not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { ApiResponse } from '@/types/performance';

interface InvalidationResponse {
  invalidated: number;
  target: string;
  timestamp: number;
  auditId: number;
}

interface AuditLogEntry {
  id: number;
  timestamp: number;
  invalidationType: 'KEY' | 'TAG' | 'PREFIX' | 'FULL';
  invalidationTarget: string;
  adminId: number;
  affectedKeysCount: number;
  reason?: string;
}

describe('Integration Test: Cache Invalidation Flow', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT token for testing
    adminToken = 'mock-admin-token';
  });

  beforeEach(async () => {
    // Prime cache with some test data
    await fetch(`${BASE_URL}/api/search?fandomId=1&tags=angst`);
    await fetch(`${BASE_URL}/api/validation/rules?fandomId=1`);
  });

  describe('Manual Invalidation via Admin Dashboard', () => {
    it('should invalidate cache by key', async () => {
      // Prime cache
      const searchParams = new URLSearchParams({
        fandomId: '1',
        tags: 'angst,time-travel',
      });
      const initialResponse = await fetch(
        `${BASE_URL}/api/search?${searchParams}`
      );
      const cacheKey = initialResponse.headers.get('X-Cache-Key');

      // Invalidate specific key
      const invalidationResponse = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'KEY',
            target: cacheKey,
            reason: 'Test invalidation',
          }),
        }
      );

      expect(invalidationResponse.status).toBe(200);
      const data: ApiResponse<InvalidationResponse> =
        await invalidationResponse.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThanOrEqual(1);
      expect(data.data?.auditId).toBeDefined();
    });

    it('should invalidate cache by tag', async () => {
      // Invalidate all cache entries with fandom:1 tag
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'TAG',
            target: 'fandom:1',
            reason: 'Fandom data updated',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidationResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThan(0);
      expect(data.data?.target).toBe('fandom:1');
    });

    it('should invalidate cache by prefix', async () => {
      // Invalidate all search results
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'PREFIX',
            target: 'search:',
            reason: 'Clear all search results',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidationResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThan(0);
    });

    it('should perform full cache invalidation', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'FULL',
            target: '*',
            reason: 'Deployment or critical update',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidationResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThan(0);
      expect(data.data?.target).toBe('*');
    });
  });

  describe('Automatic Invalidation on Content Update', () => {
    it('should invalidate cache when admin adds a tag', async () => {
      // Prime cache
      const searchParams = new URLSearchParams({ fandomId: '1' });
      const initialResponse = await fetch(
        `${BASE_URL}/api/search?${searchParams}`
      );
      expect(initialResponse.headers.get('X-Cache-Status')).toBe('MISS');

      // Second request should hit cache
      await new Promise(resolve => setTimeout(resolve, 100));
      const cachedResponse = await fetch(
        `${BASE_URL}/api/search?${searchParams}`
      );
      expect(cachedResponse.headers.get('X-Cache-Status')).toBe('HIT');

      // Admin adds a new tag
      const addTagResponse = await fetch(`${BASE_URL}/api/admin/tags`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fandomId: 1,
          name: 'new-test-tag',
          slug: 'new-test-tag',
        }),
      });

      expect(addTagResponse.status).toBe(201);

      // Cache should be invalidated
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterUpdateResponse = await fetch(
        `${BASE_URL}/api/search?${searchParams}`
      );

      // Should be cache miss (invalidated) or new version
      const cacheStatus = afterUpdateResponse.headers.get('X-Cache-Status');
      expect(['MISS', 'STALE']).toContain(cacheStatus!);
    });

    it('should invalidate cache when admin updates validation rules', async () => {
      const fandomId = 1;

      // Prime validation cache
      const initialResponse = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${fandomId}`
      );
      const initialHash = ((await initialResponse.json()) as ApiResponse<any>)
        .data?.ruleSetHash;

      // Admin updates validation rules
      const updateRulesResponse = await fetch(
        `${BASE_URL}/api/admin/validation/rules`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fandomId,
            rules: [
              {
                type: 'CONFLICT',
                entities: ['harry/hermione', 'harry/ginny'],
                message: 'Test conflict rule',
                severity: 'ERROR',
              },
            ],
          }),
        }
      );

      expect(updateRulesResponse.status).toBe(200);

      // Fetch rules again
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterUpdateResponse = await fetch(
        `${BASE_URL}/api/validation/rules?fandomId=${fandomId}`
      );
      const newHash = ((await afterUpdateResponse.json()) as ApiResponse<any>)
        .data?.ruleSetHash;

      // Hash should be different (version-based invalidation)
      expect(newHash).not.toBe(initialHash);
    });
  });

  describe('Audit Log Creation', () => {
    it('should create audit log for manual invalidation', async () => {
      // Perform invalidation
      const invalidationResponse = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'PREFIX',
            target: 'search:1:',
            reason: 'Testing audit log',
          }),
        }
      );

      const data: ApiResponse<InvalidationResponse> =
        await invalidationResponse.json();
      const auditId = data.data?.auditId;

      expect(auditId).toBeDefined();
      expect(auditId).toBeGreaterThan(0);

      // Fetch audit logs
      const auditResponse = await fetch(
        `${BASE_URL}/api/admin/audit-logs?type=cache_invalidation`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(auditResponse.status).toBe(200);
      const auditData = await auditResponse.json();

      // Find the audit log entry
      const auditEntry = auditData.data?.logs.find(
        (log: AuditLogEntry) => log.id === auditId
      );
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.invalidationType).toBe('PREFIX');
      expect(auditEntry?.invalidationTarget).toBe('search:1:');
      expect(auditEntry?.reason).toBe('Testing audit log');
    });

    it('should record affected keys count in audit log', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'TAG',
            target: 'fandom:1',
          }),
        }
      );

      const data: ApiResponse<InvalidationResponse> = await response.json();

      expect(data.data?.invalidated).toBeDefined();
      expect(data.data?.invalidated).toBeGreaterThan(0);
    });

    it('should record admin who triggered invalidation', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'KEY',
            target: 'search:1:test:test:v1',
          }),
        }
      );

      const data: ApiResponse<InvalidationResponse> = await response.json();
      const auditId = data.data?.auditId;

      // Fetch audit log
      const auditResponse = await fetch(
        `${BASE_URL}/api/admin/audit-logs/${auditId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const auditData = await auditResponse.json();
      expect(auditData.data?.adminId).toBeDefined();
    });
  });

  describe('Cache Purge Performance', () => {
    it('should purge cache within 5 seconds', async () => {
      // Prime cache
      const searchParams = new URLSearchParams({
        fandomId: '1',
        tags: 'angst',
      });
      await fetch(`${BASE_URL}/api/search?${searchParams}`);

      // Start timer
      const start = performance.now();

      // Invalidate
      await fetch(`${BASE_URL}/api/admin/performance/invalidate-cache`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'PREFIX',
          target: 'search:1:',
        }),
      });

      // Verify cache is purged
      const afterInvalidation = await fetch(
        `${BASE_URL}/api/search?${searchParams}`
      );
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5000); // Within 5 seconds

      // Should be cache miss
      const cacheStatus = afterInvalidation.headers.get('X-Cache-Status');
      expect(['MISS', 'STALE']).toContain(cacheStatus!);
    });

    it('should handle bulk invalidation efficiently', async () => {
      const start = performance.now();

      // Invalidate all search results (could be hundreds of keys)
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'PREFIX',
            target: 'search:',
          }),
        }
      );

      const elapsed = performance.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('Cache State Verification', () => {
    it('should verify cache is actually cleared', async () => {
      const searchParams = new URLSearchParams({
        fandomId: '1',
        tags: 'test-tag',
      });

      // Prime cache
      const initial = await fetch(`${BASE_URL}/api/search?${searchParams}`);
      expect(initial.headers.get('X-Cache-Status')).toBe('MISS');

      // Verify cached
      await new Promise(resolve => setTimeout(resolve, 100));
      const cached = await fetch(`${BASE_URL}/api/search?${searchParams}`);
      expect(cached.headers.get('X-Cache-Status')).toBe('HIT');

      // Invalidate
      await fetch(`${BASE_URL}/api/admin/performance/invalidate-cache`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'PREFIX',
          target: 'search:1:',
        }),
      });

      // Verify cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterClear = await fetch(`${BASE_URL}/api/search?${searchParams}`);
      expect(afterClear.headers.get('X-Cache-Status')).toBe('MISS');
    });
  });
});
