/**
 * Resource Usage Gauges Component
 * Feature: 003-optimize-the-platform
 *
 * Displays free-tier resource usage with color-coded gauges
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';

interface ResourceUsage {
  resourceType: string;
  usageCount: number;
  limitTotal: number;
  percentUsed: number;
  periodStart: number;
  periodEnd: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

interface Alert {
  resourceType: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  recommendedAction: string;
}

interface ResourceGaugesProps {
  className?: string;
}

export function ResourceGauges({ className = '' }: ResourceGaugesProps) {
  const [usage, setUsage] = useState<ResourceUsage[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'DAILY' | 'MONTHLY'>('DAILY');

  // Fetch resource usage
  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        period,
      });

      const response = await fetch(
        `/api/admin/performance/resource-usage?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error?.message || 'Failed to fetch resource usage'
        );
      }

      setUsage(data.data.usage);
      setAlerts(data.data.alerts);
    } catch (err) {
      console.error('Error fetching resource usage:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsage();
  }, [period]);

  // Auto-refresh every 60 seconds (resource usage changes slowly)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsage();
    }, 60000);

    return () => clearInterval(interval);
  }, [period]);

  // Get gauge color based on status
  const getGaugeColor = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return '#ef4444'; // red
      case 'WARNING':
        return '#f59e0b'; // amber
      default:
        return '#10b981'; // green
    }
  };

  // Get background color for gauge
  const getGaugeBackground = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'rgba(239, 68, 68, 0.1)';
      case 'WARNING':
        return 'rgba(245, 158, 11, 0.1)';
      default:
        return 'rgba(16, 185, 129, 0.1)';
    }
  };

  // Format resource type for display
  const formatResourceType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format number with units
  const formatUsage = (count: number, type: string) => {
    if (type.includes('STORAGE')) {
      // Convert bytes to MB/GB
      if (count >= 1024 * 1024 * 1024) {
        return `${(count / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      }
      return `${(count / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (type.includes('CPU')) {
      return `${count}ms`;
    }
    return count.toLocaleString();
  };

  if (loading && usage.length === 0) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
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
          Error Loading Resource Usage
        </h3>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={fetchUsage}
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
          Free-Tier Resource Usage
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('DAILY')}
            className={`px-3 py-1 rounded text-sm ${
              period === 'DAILY'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setPeriod('MONTHLY')}
            className={`px-3 py-1 rounded text-sm ${
              period === 'MONTHLY'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 ${
                alert.severity === 'CRITICAL'
                  ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900'
                  : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <svg
                  className={`w-5 h-5 mt-0.5 ${
                    alert.severity === 'CRITICAL'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      alert.severity === 'CRITICAL'
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-amber-900 dark:text-amber-100'
                    }`}
                  >
                    {alert.message}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      alert.severity === 'CRITICAL'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {alert.recommendedAction}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resource Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usage.map(resource => (
          <div
            key={resource.resourceType}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {formatResourceType(resource.resourceType)}
            </h4>

            {/* Circular Gauge */}
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={getGaugeBackground(resource.status)}
                    strokeWidth="12"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={getGaugeColor(resource.status)}
                    strokeWidth="12"
                    strokeDasharray={`${
                      (resource.percentUsed / 100) * 352
                    } 352`}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: getGaugeColor(resource.status) }}
                  >
                    {resource.percentUsed.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {resource.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Details */}
            <div className="text-center space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatUsage(resource.usageCount, resource.resourceType)}
                </span>{' '}
                / {formatUsage(resource.limitTotal, resource.resourceType)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {period === 'DAILY' ? 'Today' : 'This Month'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* No Data */}
      {usage.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No resource usage data available
        </div>
      )}

      {/* Refresh Indicator */}
      {loading && usage.length > 0 && (
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
