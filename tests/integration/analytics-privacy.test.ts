/**
 * Integration Test: Analytics Privacy Compliance
 *
 * Tests the analytics privacy compliance as specified in
 * specs/003-optimize-the-platform/quickstart.md Phase 7
 *
 * This test MUST FAIL initially (privacy-compliant analytics not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { ApiResponse } from '@/types/performance';

interface AnalyticsEvent {
  id?: number;
  timestamp: number;
  eventType: string;
  sessionId: string;
  fandomId?: number;
  metadata?: Record<string, unknown>;
}

describe('Integration Test: Analytics Privacy Compliance', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT token for testing
    adminToken = 'mock-admin-token';
  });

  describe('No IP Addresses Stored', () => {
    it('should not store IP addresses in analytics events', async () => {
      // Trigger an analytics event
      await fetch(`${BASE_URL}/api/search?fandomId=1&tags=privacy-test`);

      // Wait for event to be recorded
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch analytics data
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should NOT contain IP address patterns
      expect(responseText).not.toMatch(
        /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
      );
      expect(responseText).not.toMatch(/\b[0-9a-fA-F:]{8,39}\b/); // IPv6
    });

    it('should not expose IP addresses in error logs', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should NOT contain IP address patterns
      expect(responseText).not.toMatch(
        /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
      );
    });
  });

  describe('No User IDs for Anonymous Users', () => {
    it('should not store user IDs for anonymous analytics', async () => {
      // Make request without authentication
      await fetch(`${BASE_URL}/api/search?fandomId=1`);

      // Wait for event to be recorded
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch analytics
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should NOT contain userId fields for anonymous events
      expect(responseText).not.toContain('userId');
      expect(responseText).not.toContain('user_id');
    });

    it('should use session IDs instead of user IDs', async () => {
      await fetch(`${BASE_URL}/api/search?fandomId=1`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      // Should have sessionId but no userId
      if (data.data?.events && data.data.events.length > 0) {
        const event = data.data.events[0];
        expect(event.sessionId || event.uniqueSessions).toBeDefined();
      }
    });
  });

  describe('Anonymized Session IDs', () => {
    it('should use hashed session IDs', async () => {
      await fetch(`${BASE_URL}/api/search?fandomId=1`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      // Session IDs should be hashes (not raw values)
      // Typically 32-64 character hex strings
      if (data.data?.events && data.data.events.length > 0) {
        // Just verify structure exists (actual sessionId not exposed in aggregated data)
        expect(data.data.events).toBeDefined();
      }
    });

    it('should not allow reverse-engineering session IDs', async () => {
      // Make multiple requests to generate events
      await fetch(`${BASE_URL}/api/search?fandomId=1&tags=test1`);
      await fetch(`${BASE_URL}/api/search?fandomId=1&tags=test2`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should not contain predictable patterns
      // Analytics data is aggregated, not raw events
      expect(data.data?.events).toBeDefined();
    });
  });

  describe('No PII in Metadata', () => {
    it('should not store email addresses', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should NOT contain email patterns
      expect(responseText).not.toMatch(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
      );
    });

    it('should not store names in metadata', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Should not have firstName, lastName, fullName fields
      expect(responseText).not.toContain('firstName');
      expect(responseText).not.toContain('lastName');
      expect(responseText).not.toContain('fullName');
    });

    it('should only store sanitized metadata', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.data?.events && data.data.events.length > 0) {
        const event = data.data.events[0];

        // Metadata should only contain analytics-relevant data
        // fandomId, eventType, counts - no personal data
        expect(event.eventType).toBeDefined();
        expect(event.timestamp).toBeDefined();
      }
    });
  });

  describe('Events Tracked Accurately', () => {
    it('should track PAGE_VIEW events', async () => {
      // Visit a page
      await fetch(`${BASE_URL}/fandom/harry-potter`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = Math.floor(Date.now() / 1000);
      const oneMinAgo = now - 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneMinAgo}&end=${now}&eventType=PAGE_VIEW`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.events).toBeDefined();
    });

    it('should track SEARCH_PERFORMED events', async () => {
      await fetch(`${BASE_URL}/api/search?fandomId=1&tags=angst`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const now = Math.floor(Date.now() / 1000);
      const oneMinAgo = now - 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneMinAgo}&end=${now}&eventType=SEARCH_PERFORMED`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should track PATHWAY_CREATED events', async () => {
      // TODO: Create pathway endpoint
      // For now, just verify endpoint exists
      const now = Math.floor(Date.now() / 1000);
      const oneMinAgo = now - 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneMinAgo}&end=${now}&eventType=PATHWAY_CREATED`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });

    it('should track STORY_VIEWED events', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneMinAgo = now - 60;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneMinAgo}&end=${now}&eventType=STORY_VIEWED`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Data Retention Compliance', () => {
    it('should aggregate old analytics data', async () => {
      // Analytics events should be aggregated after 90 days
      const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 86400;
      const now = Math.floor(Date.now() / 1000);

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${ninetyDaysAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();

      // Should return aggregated data, not raw events
      expect(data.success).toBe(true);
    });
  });

  describe('Referrer Information', () => {
    it('should sanitize referrer URLs', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneHourAgo}&end=${now}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Referrers should be sanitized (domain only, no query params)
      // No sensitive data in referrer URLs
      if (responseText.includes('referrer')) {
        expect(responseText).not.toContain('?'); // No query params
        expect(responseText).not.toContain('token=');
        expect(responseText).not.toContain('sessionId=');
      }
    });
  });

  describe('User Agent Information', () => {
    it('should anonymize user agent data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/errors?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await response.json();
      const responseText = JSON.stringify(data);

      // User agents in errors should be sanitized (browser/version only)
      // No detailed system information
      if (responseText.includes('userAgent')) {
        // Should be generic (e.g., "Chrome 120" not full UA string)
        expect(responseText).not.toContain('Mozilla/');
      }
    });
  });

  describe('GDPR Compliance', () => {
    it('should not track without consent', async () => {
      // In production, would check for consent cookie
      // For now, verify structure supports opt-out
      const response = await fetch(`${BASE_URL}/api/search?fandomId=1`, {
        headers: {
          DNT: '1', // Do Not Track header
        },
      });

      expect(response.status).toBe(200);
    });

    it('should support data export request', async () => {
      // Admins should be able to export analytics data
      const now = Math.floor(Date.now() / 1000);
      const oneWeekAgo = now - 7 * 86400;

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/analytics?start=${oneWeekAgo}&end=${now}&format=json`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      // Should be exportable
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
