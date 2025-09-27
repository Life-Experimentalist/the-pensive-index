'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Users,
  Settings,
  FileText,
  TestTube,
  BarChart3,
  Tag,
  Shield,
  TrendingUp,
  Database,
  Activity,
  Clock,
} from 'lucide-react';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    admins: number;
    new_this_week: number;
  };
  content: {
    fandoms: number;
    stories: number;
    tags: number;
    plot_blocks: number;
    pathways: number;
    validation_rules: number;
  };
  activity: {
    searches_today: number;
    pathways_created_week: number;
    stories_submitted_week: number;
    validation_runs_week: number;
  };
  system: {
    database_size: string;
    uptime: string;
    response_time: number;
    active_connections: number;
  };
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);
  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage user roles and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Validation Rules',
      description: 'Create and manage validation rules',
      icon: Settings,
      href: '/admin/validation-rules',
      color: 'bg-green-500',
    },
    {
      title: 'Rule Templates',
      description: 'Manage reusable rule templates',
      icon: FileText,
      href: '/admin/rule-templates',
      color: 'bg-purple-500',
    },
    {
      title: 'Tag Classes',
      description: 'Configure tag classification rules',
      icon: Tag,
      href: '/admin/tag-classes',
      color: 'bg-orange-500',
    },
    {
      title: 'Testing Sandbox',
      description: 'Test validation rules and scenarios',
      icon: TestTube,
      href: '/admin/testing-sandbox',
      color: 'bg-pink-500',
    },
    {
      title: 'Analytics',
      description: 'View platform analytics and insights',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'bg-indigo-500',
    },
    {
      title: 'Fandom Admin',
      description: 'Manage fandom-specific content',
      icon: Shield,
      href: '/admin/fandom-admin',
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to the administrative dashboard. Select a section below to
          manage different aspects of the platform.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading
                    ? '...'
                    : stats?.users?.total?.toLocaleString() ?? '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Rules
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading
                    ? '...'
                    : stats?.content?.validation_rules?.toLocaleString() ?? '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading
                    ? '...'
                    : stats?.content?.tags?.toLocaleString() ?? '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Administration Sections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminCards.map(card => {
            const IconComponent = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 ${card.color} rounded-lg`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Settings className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  New validation rule created
                </p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">User role updated</p>
                <p className="text-xs text-gray-500">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Rule template updated</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
