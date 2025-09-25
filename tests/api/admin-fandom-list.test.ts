/**
 * Contract Test: GET /api/admin/fandoms
 *
 * Tests the API endpoint for listing fandoms with filtering, pagination,
 * and hierarchical access control. Verifies that FandomAdmins only see
 * their assigned fandoms while ProjectAdmins see all fandoms.
 *
 * @package the-pensive-index
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type {
  FandomListResponse,
  FandomListItem,
  FandomListFilters,
  FandomManagementError,
} from '@/types/fandom';

// NOTE: This is a TDD contract test - the actual endpoint doesn't exist yet
// This test MUST FAIL until the implementation is created

describe('GET /api/admin/fandoms - Contract Tests', () => {
  let mockRequest: (
    params?: URLSearchParams,
    options?: { userId?: string; role?: string }
  ) => NextRequest;
  let endpoint: (request: NextRequest) => Promise<NextResponse>;

  beforeAll(async () => {
    // Helper to create mock requests
    mockRequest = (
      params?: URLSearchParams,
      options: { userId?: string; role?: string } = {}
    ) => {
      const baseUrl = 'http://localhost:3000/api/admin/fandoms';
      const url = params ? `${baseUrl}?${params.toString()}` : baseUrl;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'x-user-id': options.userId || 'test-project-admin',
          'x-user-role': options.role || 'ProjectAdmin',
        },
      });
      return request;
    };

    // Import the actual endpoint (will fail until implemented)
    try {
      const module = await import('@/app/api/admin/fandoms/route');
      endpoint = module.GET;
    } catch (error) {
      console.warn('Endpoint not implemented yet - this is expected for TDD');
      endpoint = async () => {
        throw new Error('Endpoint not implemented');
      };
    }
  });

  describe('ProjectAdmin Access - All Fandoms', () => {
    it('should return all fandoms for ProjectAdmin', async () => {
      const request = mockRequest();
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data).toMatchObject({
        fandoms: expect.any(Array),
        pagination: {
          total_count: expect.any(Number),
          page: 1,
          per_page: 20,
          total_pages: expect.any(Number),
        },
        filters_applied: {},
      });

      // Verify fandom structure
      if (data.fandoms.length > 0) {
        const fandom = data.fandoms[0];
        expect(fandom).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          slug: expect.any(String),
          description: expect.any(String),
          is_active: expect.any(Boolean),
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          stats: {
            tags_count: expect.any(Number),
            plot_blocks_count: expect.any(Number),
            stories_count: expect.any(Number),
          },
        });
      }
    });

    it('should support pagination parameters', async () => {
      const params = new URLSearchParams({
        page: '2',
        per_page: '10',
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.per_page).toBe(10);
      expect(data.fandoms.length).toBeLessThanOrEqual(10);
    });

    it('should support filtering by active status', async () => {
      const params = new URLSearchParams({
        is_active: 'true',
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.filters_applied.is_active).toBe(true);

      // All returned fandoms should be active
      data.fandoms.forEach(fandom => {
        expect(fandom.is_active).toBe(true);
      });
    });

    it('should support search by name', async () => {
      const params = new URLSearchParams({
        search: 'Harry Potter',
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.filters_applied.search).toBe('Harry Potter');

      // All returned fandoms should match the search
      if (data.fandoms.length > 0) {
        data.fandoms.forEach(fandom => {
          expect(
            fandom.name.toLowerCase().includes('harry potter') ||
              fandom.description.toLowerCase().includes('harry potter')
          ).toBe(true);
        });
      }
    });

    it('should support sorting by creation date', async () => {
      const params = new URLSearchParams({
        sort: 'created_at',
        order: 'desc',
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.filters_applied.sort).toBe('created_at');
      expect(data.filters_applied.order).toBe('desc');

      // Verify sorting order
      if (data.fandoms.length > 1) {
        for (let i = 0; i < data.fandoms.length - 1; i++) {
          const current = new Date(data.fandoms[i].created_at);
          const next = new Date(data.fandoms[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should support sorting by name alphabetically', async () => {
      const params = new URLSearchParams({
        sort: 'name',
        order: 'asc',
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();

      // Verify alphabetical sorting
      if (data.fandoms.length > 1) {
        for (let i = 0; i < data.fandoms.length - 1; i++) {
          const current = data.fandoms[i].name.toLowerCase();
          const next = data.fandoms[i + 1].name.toLowerCase();
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should support combined filters', async () => {
      const params = new URLSearchParams({
        search: 'fantasy',
        is_active: 'true',
        sort: 'name',
        order: 'asc',
        page: '1',
        per_page: '5',
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.filters_applied).toMatchObject({
        search: 'fantasy',
        is_active: true,
        sort: 'name',
        order: 'asc',
      });
      expect(data.pagination.per_page).toBe(5);
    });
  });

  describe('FandomAdmin Access - Restricted Fandoms', () => {
    it('should return only assigned fandoms for FandomAdmin', async () => {
      const request = mockRequest(undefined, {
        userId: 'test-fandom-admin-1',
        role: 'FandomAdmin',
      });
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.fandoms).toEqual(expect.any(Array));

      // Should include access restrictions in response
      expect(data).toHaveProperty('access_restrictions');
      expect(data.access_restrictions?.role).toBe('FandomAdmin');
      expect(data.access_restrictions?.assigned_fandoms_only).toBe(true);
    });

    it('should respect fandom assignments in filtering', async () => {
      const params = new URLSearchParams({
        search: 'Potter', // Even if search matches other fandoms
      });

      const request = mockRequest(params, {
        userId: 'test-fandom-admin-2',
        role: 'FandomAdmin',
      });
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();

      // All fandoms should be assigned to this admin
      // (we can't test the actual assignment without setup, but structure should be correct)
      expect(data.access_restrictions?.assigned_fandoms_only).toBe(true);
    });

    it('should return empty list for FandomAdmin with no assignments', async () => {
      const request = mockRequest(undefined, {
        userId: 'test-fandom-admin-no-assignments',
        role: 'FandomAdmin',
      });
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.fandoms).toEqual([]);
      expect(data.pagination.total_count).toBe(0);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should reject invalid pagination parameters', async () => {
      const params = new URLSearchParams({
        page: '0', // Invalid page number
        per_page: '200', // Too large per_page
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(400);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('VALIDATION_ERROR');
      expect(error.error_message).toContain('page');
    });

    it('should reject invalid sort parameters', async () => {
      const params = new URLSearchParams({
        sort: 'invalid_field',
        order: 'invalid_order',
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(400);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('VALIDATION_ERROR');
      expect(error.error_message).toMatch(/sort|order/);
    });

    it('should handle search queries gracefully', async () => {
      const params = new URLSearchParams({
        search: '%" OR 1=1 --', // SQL injection attempt
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200); // Should not crash

      const data: FandomListResponse = await response.json();
      expect(data.fandoms).toEqual([]); // Should return empty, not error
    });

    it('should enforce per_page limits', async () => {
      const params = new URLSearchParams({
        per_page: '1000', // Excessive per_page
      });

      const request = mockRequest(params);
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();
      expect(data.pagination.per_page).toBeLessThanOrEqual(100); // Should be capped
    });
  });

  describe('Permission Errors', () => {
    it('should reject unauthenticated requests', async () => {
      const request = mockRequest(undefined, {
        userId: undefined,
        role: undefined,
      });
      const response = await endpoint(request);

      expect(response.status).toBe(401);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should reject requests from non-admin users', async () => {
      const request = mockRequest(undefined, {
        userId: 'regular-user',
        role: 'User',
      });
      const response = await endpoint(request);

      expect(response.status).toBe(403);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Performance and Caching', () => {
    it('should include cache headers for list responses', async () => {
      const request = mockRequest();
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      // Should include caching headers
      expect(response.headers.get('Cache-Control')).toBeDefined();
      expect(response.headers.get('ETag')).toBeDefined();
    });

    it('should support conditional requests with If-None-Match', async () => {
      // First request to get ETag
      const firstRequest = mockRequest();
      const firstResponse = await endpoint(firstRequest);
      const etag = firstResponse.headers.get('ETag');

      expect(etag).toBeDefined();

      // Second request with If-None-Match
      const secondRequest = mockRequest();
      secondRequest.headers.set('If-None-Match', etag!);
      const secondResponse = await endpoint(secondRequest);

      expect(secondResponse.status).toBe(304); // Not Modified
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent fandom list structure', async () => {
      const request = mockRequest();
      const response = await endpoint(request);

      expect(response.status).toBe(200);

      const data: FandomListResponse = await response.json();

      // Required top-level fields
      expect(data).toHaveProperty('fandoms');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('filters_applied');

      // Pagination structure
      expect(data.pagination).toMatchObject({
        total_count: expect.any(Number),
        page: expect.any(Number),
        per_page: expect.any(Number),
        total_pages: expect.any(Number),
      });

      // Each fandom should have required fields
      data.fandoms.forEach(fandom => {
        expect(fandom).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          slug: expect.any(String),
          is_active: expect.any(Boolean),
          created_at: expect.any(String),
          stats: {
            tags_count: expect.any(Number),
            plot_blocks_count: expect.any(Number),
            stories_count: expect.any(Number),
          },
        });
      });
    });

    it('should return proper content-type header', async () => {
      const request = mockRequest();
      const response = await endpoint(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'application/json'
      );
    });
  });
});
