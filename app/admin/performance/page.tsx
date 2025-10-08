/**
 * Performance Dashboard Page
 * Feature: 003-optimize-the-platform
 *
 * Admin dashboard for monitoring application performance,
 * cache efficiency, errors, and resource usage
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { MetricsChart } from '@/src/components/admin/performance/MetricsChart';
import { CacheHitRateChart } from '@/src/components/admin/performance/CacheHitRateChart';
import { ErrorLogTable } from '@/src/components/admin/performance/ErrorLogTable';
import { ResourceGauges } from '@/src/components/admin/performance/ResourceGauges';
import { ExportButton } from '@/src/components/admin/performance/ExportButton';
import { RefreshButton } from './RefreshButton';

export const metadata = {
  title: 'Performance Dashboard | The Pensieve Index',
  description:
    'Monitor application performance, cache efficiency, and resource usage',
};

export default async function PerformanceDashboard() {
  // Authentication check
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in?redirect=/admin/performance');
  }

  // Authorization check - require admin role
  const adminModel = AdminUserModel.getInstance();
  const hasPermission = await adminModel.hasPermission(
    userId,
    'VIEW_PERFORMANCE_METRICS'
  );

  if (!hasPermission) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Performance Dashboard
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Monitor application health, performance metrics, and resource
                usage
              </p>
            </div>

            <div className="mt-4 sm:mt-0 flex gap-3">
              <RefreshButton />

              <ExportButton />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Grid Layout */}
        <div className="space-y-8">
          {/* Row 1: Performance Metrics (Full Width) */}
          <section>
            <MetricsChart />
          </section>

          {/* Row 2: Cache & Resource Usage (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <CacheHitRateChart />
            </section>

            <section>
              <ResourceGauges />
            </section>
          </div>

          {/* Row 3: Error Logs (Full Width) */}
          <section>
            <ErrorLogTable />
          </section>
        </div>
      </div>
    </div>
  );
}
