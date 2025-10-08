/**
 * Resource Usage Monitoring Service
 * Feature: 003-optimize-the-platform
 *
 * Track Cloudflare free-tier limit consumption
 *
 * Resources monitored:
 * - D1 Database: 5M reads/day, 100k writes/day
 * - KV Cache: 100k reads/day, 1k writes/day
 * - Durable Objects: 1M requests/month
 * - Workers: 100k requests/day
 *
 * Alerts:
 * - 80% threshold: WARNING
 * - 95% threshold: CRITICAL
 */

import type {
  ResourceUsage,
  ResourceType,
  UsageStatus,
} from '@/types/performance';

/**
 * Alert status response
 */
export interface AlertStatus {
  resourceType: ResourceType;
  currentUsage: number;
  limit: number;
  percentage: number;
  status: UsageStatus;
  message: string;
}

/**
 * Free-tier limits (Cloudflare)
 */
const RESOURCE_LIMITS: Record<ResourceType, number> = {
  D1_READS: 5_000_000, // 5M reads per day
  D1_WRITES: 100_000, // 100k writes per day
  D1_STORAGE: 500 * 1024 * 1024, // 500MB
  KV_READS: 100_000, // 100k reads per day
  KV_WRITES: 1_000, // 1k writes per day
  KV_STORAGE: 1024 * 1024 * 1024, // 1GB
  DURABLE_OBJECT_REQUESTS: 1_000_000, // 1M per month
  WORKER_REQUESTS: 100_000, // 100k per day
  WORKER_CPU_TIME: 50, // 50ms per request
};

/**
 * Alert thresholds
 */
const ALERT_THRESHOLDS = {
  WARNING: 0.8, // 80%
  CRITICAL: 0.95, // 95%
};

/**
 * Resource Usage Monitoring Service
 */
export class ResourceMonitoringService {
  constructor(private db: D1Database) {}

  /**
   * Track resource usage
   * Called by middleware/services after each operation
   */
  async trackUsage(
    resourceType: ResourceType,
    count: number = 1
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const date = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD

      // Upsert resource usage (increment if exists for today)
      await this.db
        .prepare(
          `
          INSERT INTO resource_usage (
            timestamp,
            resource_type,
            usage_count,
            period
          ) VALUES (?, ?, ?, ?)
          ON CONFLICT(resource_type, period) DO UPDATE SET
            usage_count = usage_count + ?,
            timestamp = ?
        `
        )
        .bind(timestamp, resourceType, count, date, count, timestamp)
        .run();
    } catch (error) {
      console.error('[ResourceMonitoring] Error tracking usage:', error);
      // Don't throw - monitoring failures shouldn't break app
    }
  }

  /**
   * Get resource usage for a period
   */
  async getUsage(startDate: string, endDate: string): Promise<ResourceUsage[]> {
    const query = `
      SELECT
        id,
        timestamp,
        resource_type as resourceType,
        usage_count as usageCount,
        period
      FROM resource_usage
      WHERE period >= ? AND period <= ?
      ORDER BY period DESC, resource_type
    `;

    const result = await this.db
      .prepare(query)
      .bind(startDate, endDate)
      .all<ResourceUsage>();

    return result.results || [];
  }

  /**
   * Get current usage for all resources
   */
  async getCurrentUsage(): Promise<Record<ResourceType, number>> {
    const today = new Date().toISOString().split('T')[0];

    const result = await this.db
      .prepare(
        `
        SELECT resource_type as resourceType, usage_count as usageCount
        FROM resource_usage
        WHERE period_start >= ?
      `
      )
      .bind(today)
      .all<{ resourceType: ResourceType; usageCount: number }>();

    const usage: Partial<Record<ResourceType, number>> = {};

    for (const row of result.results || []) {
      usage[row.resourceType] = row.usageCount;
    }

    // Fill in missing resources with 0
    for (const resourceType of Object.keys(RESOURCE_LIMITS)) {
      if (!(resourceType in usage)) {
        usage[resourceType as ResourceType] = 0;
      }
    }

    return usage as Record<ResourceType, number>;
  }

  /**
   * Check thresholds and return alert status
   */
  async checkThresholds(): Promise<AlertStatus[]> {
    const currentUsage = await this.getCurrentUsage();
    const alerts: AlertStatus[] = [];

    for (const [resourceType, usage] of Object.entries(currentUsage)) {
      const limit = RESOURCE_LIMITS[resourceType as ResourceType];
      const percentage = usage / limit;

      let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';

      if (percentage >= ALERT_THRESHOLDS.CRITICAL) {
        status = 'CRITICAL';
      } else if (percentage >= ALERT_THRESHOLDS.WARNING) {
        status = 'WARNING';
      }

      alerts.push({
        resourceType: resourceType as ResourceType,
        currentUsage: usage,
        limit,
        percentage: Math.round(percentage * 100),
        status,
        message: this.getAlertMessage(
          resourceType as ResourceType,
          usage,
          limit,
          status
        ),
      });
    }

    return alerts;
  }

  /**
   * Get resources exceeding thresholds
   */
  async getActiveAlerts(): Promise<AlertStatus[]> {
    const alerts = await this.checkThresholds();
    return alerts.filter(a => a.status !== 'OK');
  }

  /**
   * Send alert notifications
   * Called by background cron job
   */
  async sendAlerts(): Promise<void> {
    const alerts = await this.getActiveAlerts();

    if (alerts.length === 0) {
      return;
    }

    // Log to console (can be extended to email, Slack, etc.)
    console.warn('[ResourceMonitoring] RESOURCE USAGE ALERTS:');
    for (const alert of alerts) {
      console.warn(`  ${alert.status}: ${alert.message}`);
    }

    // TODO: Send email notifications to admins
    // TODO: Send Slack/Discord notifications
    // TODO: Log to monitoring service (Sentry, DataDog, etc.)
  }

  /**
   * Reset daily counters
   * Called at midnight UTC by cron job
   */
  resetDailyCounters(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`[ResourceMonitoring] Resetting counters for ${yesterdayStr}`);

    // Daily counters reset automatically with new period
    // This is just for logging/verification
  }

  /**
   * Get usage statistics for dashboard
   */
  async getUsageStats(days: number = 30): Promise<{
    byResource: Partial<
      Record<ResourceType, Array<{ date: string; usage: number }>>
    >;
    trends: Partial<
      Record<
        ResourceType,
        { current: number; average: number; trend: 'up' | 'down' | 'stable' }
      >
    >;
  }> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const usage = await this.getUsage(startDateStr, endDate);

    // Group by resource type
    const byResource: Partial<
      Record<ResourceType, Array<{ date: string; usage: number }>>
    > = {};

    for (const record of usage) {
      if (!byResource[record.resourceType]) {
        byResource[record.resourceType] = [];
      }
      const resourceData = byResource[record.resourceType];
      if (resourceData) {
        resourceData.push({
          date: new Date(record.timestamp).toISOString().split('T')[0],
          usage: record.usageCount,
        });
      }
    }

    // Calculate trends
    const trends: Partial<
      Record<
        ResourceType,
        { current: number; average: number; trend: 'up' | 'down' | 'stable' }
      >
    > = {};

    for (const [resourceType, data] of Object.entries(byResource)) {
      if (!data) {
        continue;
      }

      const values = data.map(d => d.usage);
      const current = values[values.length - 1] || 0;
      const average =
        values.length > 0
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (current > average * 1.1) {
        trend = 'up';
      } else if (current < average * 0.9) {
        trend = 'down';
      }

      trends[resourceType as ResourceType] = {
        current,
        average: Math.round(average),
        trend,
      };
    }

    return { byResource, trends };
  }

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  /**
   * Generate alert message
   */
  private getAlertMessage(
    resourceType: ResourceType,
    usage: number,
    limit: number,
    status: 'OK' | 'WARNING' | 'CRITICAL'
  ): string {
    const percentage = Math.round((usage / limit) * 100);
    const remaining = limit - usage;

    if (status === 'OK') {
      return `${resourceType}: ${usage.toLocaleString()}/${limit.toLocaleString()} (${percentage}%)`;
    }

    if (status === 'WARNING') {
      return `${resourceType} at ${percentage}% (${usage.toLocaleString()}/${limit.toLocaleString()}). ${remaining.toLocaleString()} remaining.`;
    }

    return `CRITICAL: ${resourceType} at ${percentage}% (${usage.toLocaleString()}/${limit.toLocaleString()}). Only ${remaining.toLocaleString()} remaining!`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let resourceMonitoringInstance: ResourceMonitoringService | null = null;

/**
 * Initialize resource monitoring service
 */
export function initResourceMonitoring(db: D1Database): void {
  resourceMonitoringInstance = new ResourceMonitoringService(db);
}

/**
 * Get resource monitoring service instance
 */
export function getResourceMonitoring(): ResourceMonitoringService {
  if (!resourceMonitoringInstance) {
    throw new Error('ResourceMonitoringService not initialized');
  }
  return resourceMonitoringInstance;
}

/**
 * Convenience function for tracking usage
 */
export async function trackResourceUsage(
  resourceType: ResourceType,
  count: number = 1
): Promise<void> {
  try {
    const service = getResourceMonitoring();
    await service.trackUsage(resourceType, count);
  } catch (error) {
    console.error('[ResourceMonitoring] Error tracking usage:', error);
    // Don't throw - monitoring failures shouldn't break app
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
}

interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  error?: string;
  meta?: {
    changes?: number;
  };
}
