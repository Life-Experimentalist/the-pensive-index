/**
 * Unified Admin Layout Component
 *
 * A modern admin layout with collapsible sidebar and unified top navigation.
 * Replaces the existing AdminLayoutClient with improved UX and consistent design.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/Button';
import { Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminTopBar from './AdminTopBar';
import CollapsibleSidebar from './CollapsibleSidebar';
import AdminDebugInfo from './AdminDebugInfo';

interface UnifiedAdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export default function UnifiedAdminLayout({
  children,
  title,
  className,
}: UnifiedAdminLayoutProps) {
  const { user, isLoaded } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
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

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin Access Debug:', {
      userRole,
      publicMetadata: user.publicMetadata,
      isAdmin,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
    });
  }

  // Not authorized
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-[480px]">
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
                <br />
                User ID: <code>{user.id}</code>
                <br />
                Email: <code>{user.emailAddresses[0]?.emailAddress}</code>
                <br />
                Public Metadata:{' '}
                <code>{JSON.stringify(user.publicMetadata, null, 2)}</code>
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

            <div className="mt-4 pt-4 border-t border-gray-200">
              <AdminDebugInfo />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar - Fixed at top */}
      <AdminTopBar
        title={title}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Collapsible sidebar - Floating above content */}
      <CollapsibleSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content area - Always accounts for collapsed sidebar */}
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          className
        )}
      >
        <div className="p-4 md:p-6 md:pl-20">
          {/* Page title (if not shown in top bar) */}
          {title && (
            <div className="mb-6 lg:hidden">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {title}
              </h1>
            </div>
          )}

          {/* Page content */}
          <div className="max-w-none">{children}</div>
        </div>
      </main>
    </div>
  );
}
