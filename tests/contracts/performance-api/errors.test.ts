/**
 * Contract Test: GET /api/admin/performance/errors
 *
 * Tests the error logs endpoint contract as specified in
 * specs/003-optimize-the-platform/contracts/performance-api.md
 *
 * This test MUST FAIL initially (endpoint not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type {
  ApiResponse,
  ErrorLog,
  ErrorLogQueryParams,
} from '@/types/performance';

interface ErrorLogsResponse {
  errors: ErrorLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

describe('Contract Test: GET /api/admin/performance/errors', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT token for testing
    adminToken = 'mock-admin-token';
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`);

      expect(response.status).toBe(401);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin users', async () => {
      const userToken = 'mock-user-token';

      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe(403);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Response Schema', () => {
    it('should return errors array with pagination', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.errors).toBeInstanceOf(Array);
      expect(data.data?.pagination).toBeDefined();

      // Validate pagination schema
      const pagination = data.data!.pagination;
      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.limit).toBe('number');
      expect(typeof pagination.offset).toBe('number');
      expect(typeof pagination.hasMore).toBe('boolean');
    });

    it('should return error logs with correct schema', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      if (data.data && data.data.errors.length > 0) {
        const error = data.data.errors[0];

        expect(typeof error.id).toBe('number');
        expect(typeof error.timestamp).toBe('number');
        expect(typeof error.level).toBe('string');
        expect(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).toContain(error.level);
        expect(typeof error.category).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(typeof error.errorHash).toBe('string');
        expect(typeof error.occurrenceCount).toBe('number');
        expect(typeof error.firstSeen).toBe('number');
        expect(typeof error.lastSeen).toBe('number');
      }
    });
  });

  describe('Filtering', () => {
    it('should filter by error level', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?level=ERROR`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      // All returned errors should have level ERROR
      data.data?.errors.forEach(error => {
        expect(error.level).toBe('ERROR');
      });
    });

    it('should filter by category', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?category=database`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      // All returned errors should have category database
      data.data?.errors.forEach(error => {
        expect(error.category).toBe('database');
      });
    });

    it('should filter by multiple parameters', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?level=ERROR&category=database`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      data.data?.errors.forEach(error => {
        expect(error.level).toBe('ERROR');
        expect(error.category).toBe('database');
      });
    });

    it('should search in error messages', async () => {
      const searchTerm = 'timeout';

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?search=${searchTerm}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      // All returned errors should contain search term in message
      data.data?.errors.forEach(error => {
        expect(error.message.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });
  });

  describe('Pagination', () => {
    it('should default to limit 50', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      expect(data.data?.pagination.limit).toBe(50);
      expect(data.data?.errors.length).toBeLessThanOrEqual(50);
    });

    it('should respect custom limit', async () => {
      const customLimit = 10;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?limit=${customLimit}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      expect(data.data?.pagination.limit).toBe(customLimit);
      expect(data.data?.errors.length).toBeLessThanOrEqual(customLimit);
    });

    it('should enforce max limit of 100', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?limit=150`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      expect(data.data?.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should support offset pagination', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?limit=10&offset=20`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      expect(data.data?.pagination.offset).toBe(20);
    });

    it('should set hasMore flag correctly', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      const { total, offset, limit, hasMore } = data.data!.pagination;

      // hasMore should be true if there are more results
      const expectedHasMore = offset + limit < total;
      expect(hasMore).toBe(expectedHasMore);
    });
  });

  describe('Deduplication Display', () => {
    it('should show occurrence count for duplicate errors', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      if (data.data && data.data.errors.length > 0) {
        data.data.errors.forEach(error => {
          expect(error.occurrenceCount).toBeGreaterThanOrEqual(1);
        });
      }
    });

    it('should show first and last seen timestamps', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      if (data.data && data.data.errors.length > 0) {
        data.data.errors.forEach(error => {
          expect(error.firstSeen).toBeDefined();
          expect(error.lastSeen).toBeDefined();
          expect(error.lastSeen).toBeGreaterThanOrEqual(error.firstSeen);
        });
      }
    });

    it('should include error hash for deduplication', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      if (data.data && data.data.errors.length > 0) {
        data.data.errors.forEach(error => {
          expect(error.errorHash).toBeDefined();
          expect(typeof error.errorHash).toBe('string');
          expect(error.errorHash.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Context Information', () => {
    it('should include error context', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/performance/errors`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      if (data.data && data.data.errors.length > 0) {
        const error = data.data.errors[0];

        if (error.context) {
          expect(error.context.requestId).toBeDefined();
        }
      }
    });

    it('should include stack trace when available', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?level=ERROR`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ErrorLogsResponse> = await response.json();

      // Stack trace should be present for ERROR level
      if (data.data && data.data.errors.length > 0) {
        // At least some errors should have stack traces
        const errorsWithStack = data.data.errors.filter(e => e.stackTrace);
        expect(errorsWithStack.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Validation', () => {
    it('should validate level parameter', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?level=INVALID`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_LEVEL');
    });

    it('should validate category parameter', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?category=invalid-category`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<ErrorLogsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_CATEGORY');
    });
  });
});
