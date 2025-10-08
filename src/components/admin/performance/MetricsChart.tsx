/**
 * Performance Metrics Chart Component
 * Feature: 003-optimize-the-platform
 *
 * Displays response time charts with p50, p95, p99 percentiles
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MetricData {
  timestamp: number;
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
  avgResponseTime: number;
}

interface MetricsSummary {
  totalRequests: number;
  avgResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
}

interface MetricsChartProps {
  className?: string;
}

const TIME_RANGES = [
  { label: '1 Hour', value: '1h', seconds: 3600 },
  { label: '24 Hours', value: '24h', seconds: 86400 },
  { label: '7 Days', value: '7d', seconds: 604800 },
  { label: '30 Days', value: '30d', seconds: 2592000 },
] as const;

export function MetricsChart({ className = '' }: MetricsChartProps) {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [endpoint, setEndpoint] = useState<string>('all');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [endpoints, setEndpoints] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics data
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const range = TIME_RANGES.find(r => r.value === timeRange);
      if (!range) return;

      const end = Math.floor(Date.now() / 1000);
      const start = end - range.seconds;

      const params = new URLSearchParams({
        start: start.toString(),
        end: end.toString(),
      });

      if (endpoint !== 'all') {
        params.append('endpoint', endpoint);
      }

      const response = await fetch(
        `/api/admin/performance/metrics?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch metrics');
      }

      // Transform API response to chart data
      const chartData: MetricData[] = data.data.metrics.map((m: any) => ({
        timestamp: m.timestamp,
        endpoint: m.endpoint,
        p50: m.p50ResponseTime,
        p95: m.p95ResponseTime,
        p99: m.p99ResponseTime,
        avgResponseTime: m.avgResponseTime,
      }));

      setMetrics(chartData);
      setSummary(data.data.summary);

      // Extract unique endpoints for filter
      const uniqueEndpoints = Array.from(
        new Set(chartData.map(m => m.endpoint))
      );
      setEndpoints(['all', ...uniqueEndpoints]);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [timeRange, endpoint]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, [timeRange, endpoint]);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const range = TIME_RANGES.find(r => r.value === timeRange);

    if (!range) return date.toLocaleTimeString();

    if (range.value === '1h' || range.value === '24h') {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && metrics.length === 0) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
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
          Error Loading Metrics
        </h3>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 sm:mb-0">
          Performance Metrics
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Endpoint Filter */}
          <select
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {endpoints.map(ep => (
              <option key={ep} value={ep}>
                {ep === 'all' ? 'All Endpoints' : ep}
              </option>
            ))}
          </select>

          {/* Time Range Selector */}
          <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-md p-1">
            {TIME_RANGES.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  timeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Requests
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.totalRequests.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Avg Response
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.avgResponseTime}ms
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cache Hit Rate
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.cacheHitRate}%
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Error Rate
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.errorRate}%
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-64 sm:h-80">
        {metrics.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No data available for selected time range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
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
                label={{
                  value: 'Response Time (ms)',
                  angle: -90,
                  position: 'insideLeft',
                }}
                className="text-xs text-gray-600 dark:text-gray-400"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                }}
                labelFormatter={formatTimestamp}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="p50"
                stroke="#10b981"
                name="p50"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p95"
                stroke="#f59e0b"
                name="p95"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p99"
                stroke="#ef4444"
                name="p99"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Refresh Indicator */}
      {loading && metrics.length > 0 && (
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
