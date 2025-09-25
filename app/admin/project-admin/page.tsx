/**
 * Project Admin Dashboard Page
 *
 * Comprehensive dashboard for Project Admins with global system management capabilities.
 * Provides access to all administrative functions across the entire platform.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { Suspense } from 'react';
import { AdminPermissionGate } from '@/components/admin/AdminPermissionGate';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Shield, Globe } from 'lucide-react';

export default function ProjectAdminDashboard() {
  return (
    <AdminPermissionGate requiredPermission="admin:manage">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <Globe className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Project Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Global system management and administrative oversight
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Fandoms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-gray-500">+2 this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">25</div>
              <p className="text-xs text-gray-500">8 Project, 17 Fandom</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-gray-500">+89 this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">98.9%</div>
              <p className="text-xs text-gray-500">Uptime</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Project Administration</span>
            </CardTitle>
            <p className="text-sm text-gray-500">
              Comprehensive administrative tools for managing the entire
              platform
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading dashboard...</div>}>
              <AdminDashboard />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AdminPermissionGate>
  );
}
