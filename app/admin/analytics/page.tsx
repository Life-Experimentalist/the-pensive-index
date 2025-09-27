/**
 * Analytics Dashboard Page
 *
 * Comprehensive analytics and reporting interface:
 * - Platform usage statistics and trends
 * - User behavior and engagement metrics
 * - Content performance and validation insights
 * - System health and performance monitoring
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  period: string;
  icon: React.ComponentType<any>;
}

interface ChartData {
  label: string;
  value: number;
  change?: number;
}

// Mock analytics data
const metricCards: MetricCard[] = [
  {
    title: 'Total Users',
    value: '2,847',
    change: 12.5,
    changeType: 'increase',
    period: 'vs last month',
    icon: UsersIcon,
  },
  {
    title: 'Active Stories',
    value: '15,423',
    change: 8.2,
    changeType: 'increase',
    period: 'vs last month',
    icon: DocumentTextIcon,
  },
  {
    title: 'Validation Runs',
    value: '89,324',
    change: -3.1,
    changeType: 'decrease',
    period: 'vs last week',
    icon: CheckCircleIcon,
  },
  {
    title: 'Error Rate',
    value: '2.4%',
    change: -15.6,
    changeType: 'decrease',
    period: 'vs last week',
    icon: ExclamationTriangleIcon,
  },
];

const userGrowthData: ChartData[] = [
  { label: 'Jan', value: 1200 },
  { label: 'Feb', value: 1450 },
  { label: 'Mar', value: 1680 },
  { label: 'Apr', value: 1890 },
  { label: 'May', value: 2100 },
  { label: 'Jun', value: 2350 },
  { label: 'Jul', value: 2580 },
  { label: 'Aug', value: 2750 },
  { label: 'Sep', value: 2847 },
];

const fandomActivity: ChartData[] = [
  { label: 'Harry Potter', value: 8934, change: 5.2 },
  { label: 'Percy Jackson', value: 3456, change: 12.8 },
  { label: 'Naruto', value: 2123, change: -2.4 },
  { label: 'Marvel', value: 1567, change: 8.9 },
  { label: 'Anime/Manga', value: 1234, change: 15.6 },
];

const validationMetrics = {
  totalRuns: 89324,
  successRate: 94.6,
  avgResponseTime: 187,
  topErrors: [
    { type: 'Shipping Conflict', count: 234, percentage: 18.5 },
    { type: 'Age Inconsistency', count: 189, percentage: 14.9 },
    { type: 'Timeline Error', count: 156, percentage: 12.3 },
    { type: 'Character Tag Missing', count: 134, percentage: 10.6 },
    { type: 'Genre Mismatch', count: 98, percentage: 7.7 },
  ],
};

const systemHealth = {
  uptime: 99.97,
  avgLoadTime: 1.2,
  memoryUsage: 67.3,
  diskUsage: 45.8,
  activeConnections: 1847,
  queueLength: 23,
};

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedFandom, setSelectedFandom] = useState('all');

  // User role will be handled by the layout's permission system

  const renderMetricCard = (metric: MetricCard) => {
    const Icon = metric.icon;
    const isPositive = metric.changeType === 'increase';
    const isNegative = metric.changeType === 'decrease';

    return (
      <div
        key={metric.title}
        className="bg-white overflow-hidden shadow rounded-lg"
      >
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {metric.title}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {metric.value}
                  </div>
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      isPositive
                        ? 'text-green-600'
                        : isNegative
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {isPositive && (
                      <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                    )}
                    {isNegative && (
                      <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                    )}
                    <span className="sr-only">
                      {isPositive ? 'Increased' : 'Decreased'} by
                    </span>
                    {Math.abs(metric.change)}%
                  </div>
                </dd>
                <dd className="text-sm text-gray-500">{metric.period}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (
    data: ChartData[],
    title: string,
    type: 'bar' | 'line' = 'bar'
  ) => {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={item.label} className="flex items-center">
              <div className="w-20 text-sm text-gray-500 text-right pr-4">
                {item.label}
              </div>
              <div className="flex-1 flex items-center">
                <div
                  className="bg-indigo-200 h-6 rounded"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {item.value.toLocaleString()}
                </span>
                {'change' in item && item.change !== undefined && (
                  <span
                    className={`ml-2 text-xs ${
                      item.change > 0
                        ? 'text-green-600'
                        : item.change < 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.change > 0 ? '+' : ''}
                    {item.change}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderValidationMetrics = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Validation Performance
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {validationMetrics.successRate}%
          </div>
          <div className="text-sm text-gray-500">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            {validationMetrics.avgResponseTime}ms
          </div>
          <div className="text-sm text-gray-500">Avg Response Time</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-indigo-600">
            {validationMetrics.totalRuns.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Runs</div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Top Validation Errors
        </h4>
        <div className="space-y-2">
          {validationMetrics.topErrors.map((error, index) => (
            <div
              key={error.type}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">
                  {error.type}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  ({error.count} occurrences)
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-red-400 h-2 rounded-full"
                    style={{ width: `${error.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {error.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSystemHealth = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {systemHealth.uptime}%
          </div>
          <div className="text-sm text-gray-600">Uptime</div>
          <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {systemHealth.avgLoadTime}s
          </div>
          <div className="text-sm text-gray-600">Avg Load Time</div>
          <div className="text-xs text-gray-500 mt-1">Last 24 hours</div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {systemHealth.memoryUsage}%
          </div>
          <div className="text-sm text-gray-600">Memory Usage</div>
          <div className="text-xs text-gray-500 mt-1">Current</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {systemHealth.diskUsage}%
          </div>
          <div className="text-sm text-gray-600">Disk Usage</div>
          <div className="text-xs text-gray-500 mt-1">Total capacity</div>
        </div>

        <div className="text-center p-4 bg-indigo-50 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">
            {systemHealth.activeConnections}
          </div>
          <div className="text-sm text-gray-600">Active Connections</div>
          <div className="text-xs text-gray-500 mt-1">Real-time</div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">
            {systemHealth.queueLength}
          </div>
          <div className="text-sm text-gray-600">Queue Length</div>
          <div className="text-xs text-gray-500 mt-1">Processing queue</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="w-8 h-8 mr-3 text-indigo-600" />
            Analytics Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor platform performance, user engagement, and system health.
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <select
            value={selectedFandom}
            onChange={e => setSelectedFandom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Fandoms</option>
            <option value="harry-potter">Harry Potter</option>
            <option value="percy-jackson">Percy Jackson</option>
            <option value="naruto">Naruto</option>
            <option value="marvel">Marvel</option>
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map(renderMetricCard)}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart(userGrowthData, 'User Growth Over Time', 'line')}
        {renderChart(fandomActivity, 'Fandom Activity')}
      </div>

      {/* Validation and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderValidationMetrics()}
        {renderSystemHealth()}
      </div>

      {/* Additional Insights */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Recent Activity Insights
        </h3>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                User engagement increased 15% this week
              </p>
              <p className="text-sm text-gray-500">
                More users are creating complex story pathways with multiple
                validation rules
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Shipping validation errors spike on weekends
              </p>
              <p className="text-sm text-gray-500">
                Consider implementing better UI hints for relationship tag
                selection
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                New Harry Potter validation rules performing well
              </p>
              <p className="text-sm text-gray-500">
                98.5% success rate since deployment last week
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
