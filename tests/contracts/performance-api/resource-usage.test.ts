/**
 * Contract Test: GET /api/admin/performance/resource-usage
 *
 * Tests the resource usage monitoring endpoint contract as specified in
 * specs/003-optimize-the-platform/contracts/performance-api.md
 *
 * This test MUST FAIL initially (endpoint not implemented yet).
 * Following TDD: Write test first, then implement to make it pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type {
  ApiResponse,
  ResourceType,
  UsageStatus,
} from '@/types/performance';

interface ResourceUsageDataPoint {
  timestamp: number;
  resourceType: ResourceType;
  used: number;
  limit: number;
  percentUsed: number;
  status: UsageStatus;
}

interface ResourceAlert {
  resourceType: ResourceType;
  percentUsed: number;
  status: UsageStatus;
  message: string;
  recommendedAction: string;
}

interface ResourceUsageResponse {
  usage: ResourceUsageDataPoint[];
  alerts: ResourceAlert[];
  summary: {
    totalResources: number;
    criticalCount: number;
    warningCount: number;
    healthyCount: number;
  };
}

describe('Contract Test: GET /api/admin/performance/resource-usage', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    // TODO: Get admin JWT token for testing
    adminToken = 'mock-project-admin-token';
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`
      );

      expect(response.status).toBe(401);
      const data: ApiResponse<ResourceUsageResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin users', async () => {
      const userToken = 'mock-user-token';

      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      expect(response.status).toBe(403);
      const data: ApiResponse<ResourceUsageResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Request Validation', () => {
    it('should require period parameter', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<ResourceUsageResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('MISSING_REQUIRED_PARAMS');
    });

    it('should validate period parameter', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=INVALID`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(400);
      const data: ApiResponse<ResourceUsageResponse> = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('INVALID_PERIOD');
    });

    it('should accept DAILY period', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });

    it('should accept MONTHLY period', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=MONTHLY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Response Schema', () => {
    it('should return usage data with alerts and summary', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      expect(data.success).toBe(true);
      expect(data.data?.usage).toBeInstanceOf(Array);
      expect(data.data?.alerts).toBeInstanceOf(Array);
      expect(data.data?.summary).toBeDefined();

      // Validate summary schema
      const summary = data.data!.summary;
      expect(typeof summary.totalResources).toBe('number');
      expect(typeof summary.criticalCount).toBe('number');
      expect(typeof summary.warningCount).toBe('number');
      expect(typeof summary.healthyCount).toBe('number');

      // Counts should sum to total
      expect(
        summary.criticalCount + summary.warningCount + summary.healthyCount
      ).toBe(summary.totalResources);
    });

    it('should return usage data points with correct schema', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      if (data.data && data.data.usage.length > 0) {
        const usage = data.data.usage[0];

        expect(typeof usage.timestamp).toBe('number');
        expect(typeof usage.resourceType).toBe('string');
        expect(typeof usage.used).toBe('number');
        expect(typeof usage.limit).toBe('number');
        expect(typeof usage.percentUsed).toBe('number');
        expect(typeof usage.status).toBe('string');

        // Validate resource type is valid
        const validTypes: ResourceType[] = [
          'D1_READS',
          'D1_WRITES',
          'KV_READS',
          'KV_WRITES',
          'DURABLE_OBJECT_REQUESTS',
        ];
        expect(validTypes).toContain(usage.resourceType as ResourceType);

        // Validate status is valid
        const validStatuses: UsageStatus[] = ['OK', 'WARNING', 'CRITICAL'];
        expect(validStatuses).toContain(usage.status as UsageStatus);

        // Percentage should be 0-100
        expect(usage.percentUsed).toBeGreaterThanOrEqual(0);
        expect(usage.percentUsed).toBeLessThanOrEqual(100);
      }
    });

    it('should return alerts with recommended actions', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      if (data.data && data.data.alerts.length > 0) {
        const alert = data.data.alerts[0];

        expect(typeof alert.resourceType).toBe('string');
        expect(typeof alert.percentUsed).toBe('number');
        expect(typeof alert.status).toBe('string');
        expect(typeof alert.message).toBe('string');
        expect(typeof alert.recommendedAction).toBe('string');

        // Alerts should only be for WARNING or CRITICAL
        expect(['WARNING', 'CRITICAL']).toContain(alert.status);
      }
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor D1 read operations', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const d1Reads = data.data?.usage.find(u => u.resourceType === 'D1_READS');
      if (d1Reads) {
        expect(d1Reads.limit).toBe(5000000); // 5M daily limit (free tier)
      }
    });

    it('should monitor D1 write operations', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const d1Writes = data.data?.usage.find(
        u => u.resourceType === 'D1_WRITES'
      );
      if (d1Writes) {
        expect(d1Writes.limit).toBe(100000); // 100k daily limit (free tier)
      }
    });

    it('should monitor KV read operations', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const kvReads = data.data?.usage.find(u => u.resourceType === 'KV_READS');
      if (kvReads) {
        expect(kvReads.limit).toBe(100000); // 100k daily limit (free tier)
      }
    });

    it('should monitor KV write operations', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const kvWrites = data.data?.usage.find(
        u => u.resourceType === 'KV_WRITES'
      );
      if (kvWrites) {
        expect(kvWrites.limit).toBe(1000); // 1k daily limit (free tier)
      }
    });

    it('should monitor Durable Objects requests', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=MONTHLY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const doRequests = data.data?.usage.find(
        u => u.resourceType === 'DURABLE_OBJECT_REQUESTS'
      );
      if (doRequests) {
        expect(doRequests.limit).toBe(1000000); // 1M monthly limit (free tier)
      }
    });
  });

  describe('Status Thresholds', () => {
    it('should mark usage as OK when below 80%', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const okResources = data.data?.usage.filter(u => u.status === 'OK') || [];
      okResources.forEach(resource => {
        expect(resource.percentUsed).toBeLessThan(80);
      });
    });

    it('should mark usage as WARNING when 80-95%', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const warningResources =
        data.data?.usage.filter(u => u.status === 'WARNING') || [];
      warningResources.forEach(resource => {
        expect(resource.percentUsed).toBeGreaterThanOrEqual(80);
        expect(resource.percentUsed).toBeLessThan(95);
      });
    });

    it('should mark usage as CRITICAL when above 95%', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const criticalResources =
        data.data?.usage.filter(u => u.status === 'CRITICAL') || [];
      criticalResources.forEach(resource => {
        expect(resource.percentUsed).toBeGreaterThanOrEqual(95);
      });
    });
  });

  describe('Alert System', () => {
    it('should generate alerts for WARNING status', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const warningAlerts =
        data.data?.alerts.filter(a => a.status === 'WARNING') || [];
      warningAlerts.forEach(alert => {
        expect(alert.message).toBeTruthy();
        expect(alert.recommendedAction).toBeTruthy();
      });
    });

    it('should generate alerts for CRITICAL status', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      const criticalAlerts =
        data.data?.alerts.filter(a => a.status === 'CRITICAL') || [];
      criticalAlerts.forEach(alert => {
        expect(alert.message).toBeTruthy();
        expect(alert.recommendedAction).toBeTruthy();
      });
    });

    it('should include actionable recommendations', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      data.data?.alerts.forEach(alert => {
        // Recommended action should mention specific mitigation
        const action = alert.recommendedAction.toLowerCase();
        const hasAction =
          action.includes('cache') ||
          action.includes('optimize') ||
          action.includes('reduce') ||
          action.includes('increase ttl') ||
          action.includes('batch');

        expect(hasAction).toBe(true);
      });
    });
  });

  describe('Period Filtering', () => {
    it('should return daily usage for DAILY period', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=DAILY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      // Should have usage data for daily limits
      expect(data.data?.usage.length).toBeGreaterThan(0);
    });

    it('should return monthly usage for MONTHLY period', async () => {
      const response = await fetch(
        `${BASE_URL}/api/admin/performance/resource-usage?period=MONTHLY`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data: ApiResponse<ResourceUsageResponse> = await response.json();

      // Should have usage data for monthly limits (Durable Objects)
      const doRequests = data.data?.usage.find(
        u => u.resourceType === 'DURABLE_OBJECT_REQUESTS'
      );
      expect(doRequests).toBeDefined();
    });
  });
});
