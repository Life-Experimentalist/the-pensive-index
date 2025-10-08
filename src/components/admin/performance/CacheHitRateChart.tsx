/**
 * Cache Hit Rate Chart Component
 * Feature: 003-optimize-the-platform
 *
 * Displays cache performance with donut chart and trend over time
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  timestamp: number;
}

interface CacheHitRateChartProps {
  className?: string;
}

const COLORS = {
  hits: '#10b981', // green
  misses: '#ef4444', // red
};

export function CacheHitRateChart({ className = '' }: CacheHitRateChartProps) {
  const [currentStats, setCurrentStats] = useState<CacheStats | null>(null);
  const [trendData, setTrendData] = useState<CacheStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cache statistics
  const fetchCacheStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const end = Math.floor(Date.now() / 1000);
      const start = end - 86400; // Last 24 hours

      const params = new URLSearchParams({
        start: start.toString(),
        end: end.toString(),
      });

      const response = await fetch(
        `/api/admin/performance/metrics?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch cache stats');
      }

      // Calculate current stats from summary
      const summary = data.data.summary;
      const totalRequests = summary.totalRequests || 0;
      const cacheHitRate = summary.cacheHitRate || 0;
      const hits = Math.round((totalRequests * cacheHitRate) / 100);
      const misses = totalRequests - hits;

      setCurrentStats({
        hits,
        misses,
        hitRate: cacheHitRate,
        timestamp: Date.now() / 1000,
      });

      // Extract trend data from metrics (aggregate by hour)
      const hourlyStats = new Map<number, { hits: number; misses: number }>();

      data.data.metrics.forEach((metric: any) => {
        const hour = Math.floor(metric.timestamp / 3600) * 3600;
        if (!hourlyStats.has(hour)) {
          hourlyStats.set(hour, { hits: 0, misses: 0 });
        }

        const stats = hourlyStats.get(hour)!;
        const totalReqs = metric.totalRequests || 0;
        const hitRate = metric.cacheHitRate || 0;
        stats.hits += Math.round((totalReqs * hitRate) / 100);
        stats.misses += totalReqs - Math.round((totalReqs * hitRate) / 100);
      });

      // Convert to trend array
      const trend = Array.from(hourlyStats.entries())
        .map(([timestamp, stats]) => ({
          timestamp,
          hits: stats.hits,
          misses: stats.misses,
          hitRate:
            stats.hits + stats.misses > 0
              ? (stats.hits / (stats.hits + stats.misses)) * 100
              : 0,
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-24); // Last 24 hours

      setTrendData(trend);
    } catch (err) {
      console.error('Error fetching cache stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCacheStats();
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCacheStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !currentStats) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6 ${className}`}
      >
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          Error Loading Cache Stats
        </h3>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={fetchCacheStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const donutData = currentStats
    ? [
        { name: 'Hits', value: currentStats.hits },
        { name: 'Misses', value: currentStats.misses },
      ]
    : [];

  const isWarning = currentStats && currentStats.hitRate < 80;

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Cache Performance
        </h3>
        {isWarning && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Cache hit rate below 80% threshold
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="flex flex-col items-center">
          <div className="relative w-full" style={{ maxWidth: '200px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Hits' ? COLORS.hits : COLORS.misses}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    isWarning
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {currentStats?.hitRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Hit Rate
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.hits }}
              ></div>
              <span className="text-gray-700 dark:text-gray-300">
                Hits: {currentStats?.hits.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.misses }}
              ></div>
              <span className="text-gray-700 dark:text-gray-300">
                Misses: {currentStats?.misses.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            24-Hour Trend
          </h4>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400 text-sm">
              No trend data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-300 dark:stroke-gray-600"
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTimestamp}
                  className="text-xs text-gray-600 dark:text-gray-400"
                />
                <YAxis
                  domain={[0, 100]}
                  className="text-xs text-gray-600 dark:text-gray-400"
                  label={{
                    value: 'Hit Rate %',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                  }}
                  labelFormatter={formatTimestamp}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Line
                  type="monotone"
                  dataKey="hitRate"
                  stroke={isWarning ? '#f59e0b' : '#10b981'}
                  strokeWidth={2}
                  dot={false}
                  name="Hit Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Refresh Indicator */}
      {loading && currentStats && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Updating...
          </span>
        </div>
      )}
    </div>
  );
}
