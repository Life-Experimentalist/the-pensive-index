'use client';

import { useUser } from '@clerk/nextjs';
import SafeSignOutButton from '@/components/ui/SafeSignOutButton';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import BootstrapAdmin from '@/components/admin/BootstrapAdmin';
import {
  LayoutDashboard,
  Settings,
  Users,
  Tag,
  FileText,
  TestTube,
  LogOut,
  Shield,
  BarChart3,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayoutClient({
  children,
  title,
}: AdminLayoutProps) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You must be signed in to access the admin panel.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = user.publicMetadata?.role as string;
  const isAdmin = userRole === 'ProjectAdmin' || userRole === 'FandomAdmin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You need an admin role to access the admin dashboard.
                <br />
                <br />
                <strong>Debug Info:</strong>
                <br />
                Current role: <code>{userRole || 'undefined'}</code>
                <br />
                Expected: <code>ProjectAdmin</code> or <code>FandomAdmin</code>
              </AlertDescription>
            </Alert>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>To request admin access:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Contact an existing ProjectAdmin or FandomAdmin</li>
                <li>Or create a GitHub issue requesting access</li>
                <li>
                  Provide your email:{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    {user.emailAddresses[0]?.emailAddress}
                  </code>
                </li>
              </ol>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() =>
                  window.open(
                    'https://github.com/Life-Experimentalist/the-pensive-index/issues/new?title=Admin%20Access%20Request&body=**User%20Email:**%20' +
                      encodeURIComponent(
                        user.emailAddresses[0]?.emailAddress || ''
                      ) +
                      '%0A**Requested%20Role:**%20[FandomAdmin/ProjectAdmin]%0A**Fandoms%20(if%20FandomAdmin):**%20[List%20fandoms]%0A**Reason:**%20[Explain%20why%20you%20need%20access]',
                    '_blank'
                  )
                }
                className="flex-1"
                variant="outline"
              >
                Request Access via GitHub
              </Button>
            </div>

            {/* First Admin Button - Only shown in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">
                  Development Mode: If no admin exists, you can become the first
                  admin
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/first-admin', {
                        method: 'POST',
                      });
                      const data = await response.json();

                      if (data.success) {
                        alert('✅ Admin access granted! Refreshing page...');
                        window.location.reload();
                      } else {
                        alert(
                          '❌ ' + (data.error || 'Failed to grant admin access')
                        );
                      }
                    } catch (error) {
                      alert('❌ Network error: ' + String(error));
                    }
                  }}
                  className="w-full"
                  size="sm"
                  variant="secondary"
                >
                  🔧 Become First Admin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  const navigationItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Validation Rules',
      href: '/admin/validation-rules',
      icon: Settings,
    },
    {
      label: 'Rule Templates',
      href: '/admin/rule-templates',
      icon: FileText,
    },
    {
      label: 'Tag Classes',
      href: '/admin/tag-classes',
      icon: Tag,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
    },
    {
      label: 'Testing Sandbox',
      href: '/admin/testing-sandbox',
      icon: TestTube,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/icon.png"
                alt="The Pensieve Index"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <h1 className="text-xl font-semibold text-gray-900">
                The Pensieve Index
              </h1>
              <Badge variant="secondary" className="ml-3">
                Admin Panel
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Image
                  src={user.imageUrl}
                  alt={user.fullName || 'User'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">
                    {user.fullName || user.emailAddresses[0]?.emailAddress}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                </div>
              </div>
              <SafeSignOutButton>
                <div className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </div>
              </SafeSignOutButton>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <div className="space-y-1">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {title && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
