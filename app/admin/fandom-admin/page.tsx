/**
 * Fandom Admin Dashboard Page
 *
 * Specialized dashboard for Fandom Admins with fandom-specific management capabilities.
 * Provides scoped access to content management for assigned fandoms only.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { Suspense } from 'react';
import { AdminPermissionGate } from '@/components/admin/AdminPermissionGate';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, Tags, FileText, Shield } from 'lucide-react';

export default function FandomAdminDashboard() {
  return (
    <AdminPermissionGate requiredPermission="fandom:manage">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Fandom Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Content management for your assigned fandoms
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Fandoms Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Assigned Fandoms</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-gray-500">Active assignments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                <Tags className="h-4 w-4" />
                <span>Tags Managed</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">147</div>
              <p className="text-xs text-gray-500">Across all fandoms</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Stories Reviewed</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-gray-500">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Fandom-Specific Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Fandom Content Management</span>
            </CardTitle>
            <p className="text-sm text-gray-500">
              Manage tags, plot blocks, validation rules, and story submissions
              for your assigned fandoms
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Notice about fandom scope */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Fandom-Scoped Access
                    </h4>
                    <p className="text-xs text-blue-700">
                      You have administrative access to manage content only for
                      your assigned fandoms. All changes are automatically
                      scoped to your fandom assignments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <Suspense fallback={<div>Loading fandom dashboard...</div>}>
                <AdminDashboard />
              </Suspense>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions for Fandom Admins */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <p className="text-sm text-gray-500">
              Common tasks for fandom content management
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Tags className="h-6 w-6 text-blue-600 mb-2" />
                <h4 className="font-medium text-sm">Manage Tags</h4>
                <p className="text-xs text-gray-500">Add or edit fandom tags</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <FileText className="h-6 w-6 text-green-600 mb-2" />
                <h4 className="font-medium text-sm">Plot Blocks</h4>
                <p className="text-xs text-gray-500">
                  Manage plot block library
                </p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Shield className="h-6 w-6 text-purple-600 mb-2" />
                <h4 className="font-medium text-sm">Validation Rules</h4>
                <p className="text-xs text-gray-500">
                  Configure content validation
                </p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <BookOpen className="h-6 w-6 text-orange-600 mb-2" />
                <h4 className="font-medium text-sm">Story Queue</h4>
                <p className="text-xs text-gray-500">
                  Review story submissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPermissionGate>
  );
}
