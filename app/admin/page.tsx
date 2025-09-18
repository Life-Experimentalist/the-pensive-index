/**
 * Admin Dashboard Page
 *
 * Main dashboard page showing:
 * - Overview statistics
 * - Recent activity
 * - Quick actions
 * - System health indicators
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  DocumentTextIcon,
  TagIcon,
  CogIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';

interface DashboardStats {
  totalRules: number;
  activeRules: number;
  totalTemplates: number;
  totalTagClasses: number;
  recentActivity: ActivityItem[];
  systemHealth: HealthCheck[];
}

interface ActivityItem {
  id: string;
  type:
    | 'rule_created'
    | 'rule_updated'
    | 'template_created'
    | 'tag_class_created';
  description: string;
  timestamp: string;
  user: string;
  fandom?: string;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: string;
}

const mockStats: DashboardStats = {
  totalRules: 156,
  activeRules: 142,
  totalTemplates: 23,
  totalTagClasses: 89,
  recentActivity: [
    {
      id: '1',
      type: 'rule_created',
      description: 'Created validation rule "Harry/Hermione Conflict Check"',
      timestamp: '2025-09-18T15:30:00Z',
      user: 'Alice Johnson',
      fandom: 'Harry Potter',
    },
    {
      id: '2',
      type: 'template_created',
      description: 'Created rule template "Shipping Conflict Base"',
      timestamp: '2025-09-18T14:15:00Z',
      user: 'Bob Smith',
    },
    {
      id: '3',
      type: 'rule_updated',
      description: 'Updated rule "Time Travel Consistency"',
      timestamp: '2025-09-18T13:45:00Z',
      user: 'Carol Davis',
      fandom: 'Harry Potter',
    },
  ],
  systemHealth: [
    {
      service: 'Database',
      status: 'healthy',
      message: 'All connections active',
      lastChecked: '2025-09-18T15:45:00Z',
    },
    {
      service: 'Rule Engine',
      status: 'healthy',
      message: 'Average validation time: 85ms',
      lastChecked: '2025-09-18T15:45:00Z',
    },
    {
      service: 'API Endpoints',
      status: 'warning',
      message: '2 endpoints experiencing slow response',
      lastChecked: '2025-09-18T15:45:00Z',
    },
  ],
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as any)?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin';

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'rule_created':
      case 'rule_updated':
        return DocumentTextIcon;
      case 'template_created':
        return CogIcon;
      case 'tag_class_created':
        return TagIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getHealthIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return CheckCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'error':
        return ExclamationTriangleIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const getHealthColor = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {session?.user?.name}. Here's what's happening with
            your validation system.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Rules
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalRules}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-green-600">
                  {stats.activeRules}
                </span>
                <span className="text-gray-500"> active</span>
              </div>
            </div>
          </div>

          {userRole === 'ProjectAdmin' && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CogIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Templates
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalTemplates}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm text-gray-500">Project-wide</div>
              </div>
            </div>
          )}

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TagIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Tag Classes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalTagClasses}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm text-gray-500">Across all fandoms</div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Performance
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">85ms</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm text-gray-500">Avg validation time</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {stats.recentActivity.map((activity, activityIdx) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {activityIdx !== stats.recentActivity.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                                <Icon
                                  className="h-4 w-4 text-white"
                                  aria-hidden="true"
                                />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-gray-500">
                                  by {activity.user}
                                  {activity.fandom && ` in ${activity.fandom}`}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={activity.timestamp}>
                                  {formatTimestamp(activity.timestamp)}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* System health */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                System Health
              </h3>
              <div className="space-y-4">
                {stats.systemHealth.map(health => {
                  const Icon = getHealthIcon(health.status);
                  const colorClass = getHealthColor(health.status);

                  return (
                    <div
                      key={health.service}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-5 w-5 ${colorClass}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {health.service}
                          </p>
                          <p className="text-xs text-gray-500">
                            {health.message}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatTimestamp(health.lastChecked)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/admin/validation-rules/create"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-700 ring-4 ring-white">
                    <DocumentTextIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Create Rule
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add a new validation rule to your fandom
                  </p>
                </div>
              </a>

              {userRole === 'ProjectAdmin' && (
                <a
                  href="/admin/rule-templates/create"
                  className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                      <CogIcon className="h-6 w-6" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Create Template
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Design a reusable rule template
                    </p>
                  </div>
                </a>
              )}

              <a
                href="/admin/testing-sandbox"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                    <ClockIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Test Rules
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Validate rules in the testing sandbox
                  </p>
                </div>
              </a>

              <a
                href="/admin/analytics"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                    <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    View Analytics
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Monitor system performance and usage
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
