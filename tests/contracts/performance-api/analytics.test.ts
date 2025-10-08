/**
 * Contract Test: GET /api/admin/performance/analytics
 *
 * Tests the analytics endpoint contract as specified in
 * specs/003-optimize-the-platform/contracts/performance-api.md
 *
 * This test MUST FAIL initially (endpoint not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type {
  ApiResponse,
  AnalyticsEventType,
  AnalyticsQueryParams,
} from '@/types/performance';

interface AnalyticsDataPoint {
  timestamp: number;
  eventType: AnalyticsEventType;
  fandomId?: number;
  fandomName?: string;
  count: number;
  uniqueSessions: number;
}

interface AnalyticsResponse {
  events: AnalyticsDataPoint[];
  summary: {
    totalEvents: number;
    uniqueSessions: number;
    topFandoms: Array<{
      fandomId: number;
      name: string;
      count: number;
    }>;
    conversionRate: number;
  };
}

describe('Contract Test: GET /api/admin/performance/analytics', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;
  let fandomAdminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT tokens for testing
    adminToken = 'mock-project-admin-token';
    fandomAdminToken = 'mock-fandom-admin-token';
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`
      );

      expect(response.status).toBe(401);
      const data: ApiResponse<AnalyticsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin users', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;
      const userToken = 'mock-user-token';

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      expect(response.status).toBe(403);
      const data: ApiResponse<AnalyticsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Request Validation', () => {
    it('should require start and end timestamps', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<AnalyticsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('MISSING_REQUIRED_PARAMS');
    });

    it('should validate that end is after start', async () => {
      const params: AnalyticsQueryParams = {
        start: 1704153600,
        end: 1704067200, // Before start - invalid
      };

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${params.start}&end=${params.end}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<AnalyticsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_TIME_RANGE');
    });

    it('should validate eventType parameter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}&eventType=INVALID_TYPE`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<AnalyticsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_EVENT_TYPE');
    });

    it('should validate groupBy parameter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}&groupBy=invalid`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<AnalyticsResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_GROUP_BY');
    });
  });

  describe('Response Schema', () => {
    it('should return analytics events with summary', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<AnalyticsResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.events).toBeInstanceOf(Array);
      expect(data.data?.summary).toBeDefined();

      // Validate summary schema
      const summary = data.data!.summary;
      expect(typeof summary.totalEvents).toBe('number');
      expect(typeof summary.uniqueSessions).toBe('number');
      expect(summary.topFandoms).toBeInstanceOf(Array);
      expect(typeof summary.conversionRate).toBe('number');

      // Conversion rate should be percentage (0-1)
      expect(summary.conversionRate).toBeGreaterThanOrEqual(0);
      expect(summary.conversionRate).toBeLessThanOrEqual(1);
    });

    it('should return events with correct schema', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<AnalyticsResponse> = await response.json();

      if (data.data && data.data.events.length > 0) {
        const event = data.data.events[0];

        expect(typeof event.timestamp).toBe('number');
        expect(typeof event.eventType).toBe('string');
        expect(typeof event.count).toBe('number');
        expect(typeof event.uniqueSessions).toBe('number');

        // Validate event type is valid
        const validTypes: AnalyticsEventType[] = [
          'PAGE_VIEW',
          'SEARCH_PERFORMED',
          'PATHWAY_CREATED',
          'STORY_VIEWED',
          'SUBMISSION_CREATED',
          'ADMIN_ACTION',
        ];
        expect(validTypes).toContain(event.eventType as AnalyticsEventType);
      }
    });
  });

  describe('Filtering', () => {
    it('should filter by fandomId', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;
      const fandomId = 1;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}&fandomId=${fandomId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // All events should be for specified fandom (or undefined for global events)
      data.data?.events.forEach(event => {
        if (event.fandomId !== undefined) {
          expect(event.fandomId).toBe(fandomId);
        }
      });
    });

    it('should filter by eventType', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;
      const eventType = 'PATHWAY_CREATED';

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}&eventType=${eventType}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // All events should be of specified type
      data.data?.events.forEach(event => {
        expect(event.eventType).toBe(eventType);
      });
    });

    it('should support groupBy parameter', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}&groupBy=hour`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // Should return hourly aggregated data
      expect(data.success).toBe(true);
    });
  });

  describe('Role-Based Access', () => {
    it('should allow ProjectAdmin to see all fandoms', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // ProjectAdmin can see all fandoms
      expect(data.success).toBe(true);
      expect(data.data?.summary.topFandoms.length).toBeGreaterThanOrEqual(0);
    });

    it('should restrict FandomAdmin to assigned fandoms', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${fandomAdminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // FandomAdmin sees only assigned fandoms
      expect(data.success).toBe(true);
    });
  });

  describe('Privacy Compliance', () => {
    it('should not include PII in response', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // Verify no PII in response
      const responseText = JSON.stringify(data);
      expect(responseText).not.toMatch(
        /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
      ); // No IP addresses
      expect(responseText).not.toContain('userId'); // No user IDs
      expect(responseText).not.toContain('email'); // No emails
    });

    it('should use anonymized session IDs', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // uniqueSessions count is fine, but no raw session IDs exposed
      expect(data.data?.events[0]?.uniqueSessions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate conversion rate', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<AnalyticsResponse> = await response.json();

      // Conversion rate should be calculated and valid
      expect(data.data?.summary.conversionRate).toBeDefined();
      expect(data.data?.summary.conversionRate).toBeGreaterThanOrEqual(0);
      expect(data.data?.summary.conversionRate).toBeLessThanOrEqual(1);
    });

    it('should return top fandoms by event count', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneDayAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<AnalyticsResponse> = await response.json();

      const topFandoms = data.data?.summary.topFandoms || [];

      // Should be sorted by count descending
      for (let i = 1; i < topFandoms.length; i++) {
        expect(topFandoms[i - 1].count).toBeGreaterThanOrEqual(
          topFandoms[i].count
        );
      }
    });
  });
});
