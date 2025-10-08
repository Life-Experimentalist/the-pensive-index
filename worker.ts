/**
 * Cloudflare Worker - The Pensive Index
 *
 * Unified worker handling:
 * - Next.js app and documentation routing
 * - Scheduled cron jobs for performance monitoring
 */

import { handleRequest } from './src/worker/handler.js';
import { handleMetricsAggregationCron } from './src/worker/cron/metrics-aggregation';
import { handleAnalyticsAggregationCron } from './src/worker/cron/analytics-aggregation';
import { handleResourceMonitoringCron } from './src/worker/cron/resource-monitoring';

const worker = {
  /**
   * Handle incoming HTTP requests
   */
  fetch(request: Request, env: any, ctx: any): Response {
    return handleRequest(request, env, ctx);
  },

  /**
   * Handle scheduled cron triggers
   */
  async scheduled(event: ScheduledEvent, env: any, ctx: any): Promise<void> {
    console.log(`[Worker] Scheduled event triggered: ${event.cron}`);

    try {
      switch (event.cron) {
        case '*/5 * * * *': // Every 5 minutes
          await handleMetricsAggregationCron(env);
          break;

        case '0 2 * * *': // Daily at 2am UTC
          await handleAnalyticsAggregationCron(env);
          break;

        case '0 * * * *': // Every hour
          await handleResourceMonitoringCron(env);
          break;

        default:
          console.warn(`[Worker] Unknown cron pattern: ${event.cron}`);
      }
    } catch (error) {
      console.error('[Worker] Cron job failed:', error);
      // Don't throw - we want the worker to stay healthy
    }
  },
};

export default worker;

export { handleRequest };
