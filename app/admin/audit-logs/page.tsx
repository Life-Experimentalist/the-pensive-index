'use client';

import ProtectedAdminLayout, {
  PermissionGate,
} from '@/components/admin/ProtectedAdminLayout';
import AuditLogViewer from '@/components/admin/AuditLogViewer';

export default function AdminAuditLogsPage() {
  return (
    <ProtectedAdminLayout
      title="Audit Logs"
      requiredPermission="canViewAuditLogs"
    >
      <PermissionGate
        permission="canViewAuditLogs"
        fallback={
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600">
              You don't have permission to view audit logs.
            </p>
          </div>
        }
      >
        <AuditLogViewer />
      </PermissionGate>
    </ProtectedAdminLayout>
  );
}
