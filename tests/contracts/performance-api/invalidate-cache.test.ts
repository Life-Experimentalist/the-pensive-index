/**
 * Contract Test: POST /api/admin/performance/invalidate-cache
 *
 * Tests the cache invalidation endpoint contract as specified in
 * specs/003-optimize-the-platform/contracts/performance-api.md
 *
 * This test MUST FAIL initially (endpoint not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type {
  ApiResponse,
  CacheInvalidationRequest,
} from '@/types/performance';

interface InvalidateCacheResponse {
  invalidated: number; // Number of keys purged
  target: string; // What was invalidated
  timestamp: number; // When invalidation occurred
  auditId: number; // Audit log entry ID
}

describe('Contract Test: POST /api/admin/performance/invalidate-cache', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT token for testing
    adminToken = 'mock-admin-token';
  });

  describe('Request Validation', () => {
    it('should require type field', async () => {
      const invalidRequest = {
        target: 'search:hp:',
        reason: 'Test invalidation',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidRequest),
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('MISSING_REQUIRED_FIELD');
      expect(data.error?.message).toContain('type');
    });

    it('should require target field', async () => {
      const invalidRequest = {
        type: 'PREFIX',
        reason: 'Test invalidation',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidRequest),
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('MISSING_REQUIRED_FIELD');
      expect(data.error?.message).toContain('target');
    });

    it('should validate type field values', async () => {
      const invalidRequest: CacheInvalidationRequest = {
        type: 'INVALID' as any,
        target: 'search:hp:',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidRequest),
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_TYPE');
      expect(data.error?.message).toContain('KEY, TAG, PREFIX, or FULL');
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const request: CacheInvalidationRequest = {
        type: 'PREFIX',
        target: 'search:hp:',
        reason: 'Test invalidation',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(401);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin users', async () => {
      const request: CacheInvalidationRequest = {
        type: 'PREFIX',
        target: 'search:hp:',
        reason: 'Test invalidation',
      };
      const userToken = 'mock-user-token'; // Non-admin

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(403);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Invalidation Types', () => {
    it('should invalidate by KEY', async () => {
      const request: CacheInvalidationRequest = {
        type: 'KEY',
        target: 'search:1:angst,time-travel:v2',
        reason: 'Test key invalidation',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThanOrEqual(0);
      expect(data.data?.target).toBe(request.target);
      expect(data.data?.timestamp).toBeDefined();
      expect(data.data?.auditId).toBeDefined();
    });

    it('should invalidate by TAG', async () => {
      const request: CacheInvalidationRequest = {
        type: 'TAG',
        target: 'fandom:1',
        reason: 'Test tag invalidation',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate by PREFIX', async () => {
      const request: CacheInvalidationRequest = {
        type: 'PREFIX',
        target: 'search:harry-potter:',
        reason: 'Updated validation rules',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate FULL cache', async () => {
      const request: CacheInvalidationRequest = {
        type: 'FULL',
        target: '*',
        reason: 'Emergency cache clear',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.invalidated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entry', async () => {
      const request: CacheInvalidationRequest = {
        type: 'PREFIX',
        target: 'search:1:',
        reason: 'Test audit logging',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      // Should return audit ID
      expect(data.data?.auditId).toBeDefined();
      expect(typeof data.data?.auditId).toBe('number');
    });

    it('should record admin who triggered invalidation', async () => {
      const request: CacheInvalidationRequest = {
        type: 'KEY',
        target: 'test:key',
        reason: 'Test admin tracking',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      // Audit log should be created with admin ID
      expect(data.success).toBe(true);
    });
  });

  describe('Response Schema', () => {
    it('should return affected keys count', async () => {
      const request: CacheInvalidationRequest = {
        type: 'PREFIX',
        target: 'search:1:',
        reason: 'Test count',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      expect(data.data?.invalidated).toBeDefined();
      expect(typeof data.data?.invalidated).toBe('number');
      expect(data.data?.invalidated).toBeGreaterThanOrEqual(0);
    });

    it('should return timestamp', async () => {
      const request: CacheInvalidationRequest = {
        type: 'KEY',
        target: 'test:key',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      const data: ApiResponse<InvalidateCacheResponse> = await response.json();

      expect(data.data?.timestamp).toBeDefined();
      expect(typeof data.data?.timestamp).toBe('number');

      // Timestamp should be recent (within last minute)
      const now = Math.floor(Date.now() / 1000);
      expect(data.data?.timestamp).toBeGreaterThan(now - 60);
      expect(data.data?.timestamp).toBeLessThanOrEqual(now);
    });
  });

  describe('Optional Fields', () => {
    it('should accept request without reason field', async () => {
      const request: CacheInvalidationRequest = {
        type: 'KEY',
        target: 'test:key:without:reason',
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/invalidate-cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<InvalidateCacheResponse> = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
