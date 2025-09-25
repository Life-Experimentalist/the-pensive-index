'use client';

import { useUser } from '@clerk/nextjs';
import {
  PermissionProvider,
  usePermissions,
  WithPermission,
} from '@/lib/permissions';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader, AlertTriangle } from 'lucide-react';

interface ProtectedAdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  resource?: string;
  action?: string;
}

// Loading component
function AdminLoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center space-x-3">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">
            Loading Admin Dashboard
          </p>
          <p className="text-sm text-gray-500">Verifying permissions...</p>
        </div>
      </div>
    </div>
  );
}

// Access denied component
function AccessDeniedScreen({
  message = "You don't have permission to access this resource.",
  suggestion = 'Contact your administrator if you believe this is an error.',
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center space-x-2">
            <Shield className="h-6 w-6 text-red-600" />
            <span>Access Denied</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>{message}</p>
              <p className="text-sm">{suggestion}</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

// Inner component that uses permissions
function ProtectedAdminContent({
  children,
  title,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  resource,
  action,
}: ProtectedAdminLayoutProps) {
  const { loading, userRole } = usePermissions();

  if (loading) {
    return <AdminLoadingScreen />;
  }

  // Check if user has any admin role
  if (
    !userRole ||
    !['super-admin', 'project-admin', 'fandom-admin', 'moderator'].includes(
      userRole
    )
  ) {
    return (
      <AccessDeniedScreen
        message="You need an admin role to access the admin dashboard."
        suggestion="Contact your administrator to request admin access."
      />
    );
  }

  // If specific permissions are required, wrap content with permission checking
  if (requiredPermission || requiredPermissions || (resource && action)) {
    return (
      <WithPermission
        permission={requiredPermission as any}
        permissions={requiredPermissions as any}
        requireAll={requireAll}
        resource={resource}
        action={action}
        fallback={
          <AccessDeniedScreen message="You don't have permission to access this section." />
        }
      >
        <AdminLayout title={title}>{children}</AdminLayout>
      </WithPermission>
    );
  }

  // Default access for any admin
  return <AdminLayout title={title}>{children}</AdminLayout>;
}

// Main protected admin layout component
export default function ProtectedAdminLayout(props: ProtectedAdminLayoutProps) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return <AdminLoadingScreen />;
  }

  if (!user) {
    return (
      <AccessDeniedScreen
        message="You must be signed in to access the admin dashboard."
        suggestion="Please sign in and try again."
      />
    );
  }

  return (
    <PermissionProvider>
      <ProtectedAdminContent {...props} />
    </PermissionProvider>
  );
}

// Utility component for permission-based UI elements
export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  fallback = null,
  children,
}: {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  resource?: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <WithPermission
      permission={permission as any}
      permissions={permissions as any}
      requireAll={requireAll}
      resource={resource}
      action={action}
      fallback={fallback}
    >
      {children}
    </WithPermission>
  );
}

// Hook for easy permission checking in components
export { usePermissions } from '@/lib/permissions';
