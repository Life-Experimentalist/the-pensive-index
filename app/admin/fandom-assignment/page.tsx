'use client';

import ProtectedAdminLayout, {
  PermissionGate,
} from '@/components/admin/ProtectedAdminLayout';
import FandomAssignment from '@/components/admin/FandomAssignment';

export default function AdminFandomAssignmentPage() {
  return (
    <ProtectedAdminLayout
      title="Fandom Assignment"
      requiredPermission="canManageFandoms"
    >
      <PermissionGate
        permission="canManageFandoms"
        fallback={
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600">
              You don't have permission to manage fandom assignments.
            </p>
          </div>
        }
      >
        <FandomAssignment />
      </PermissionGate>
    </ProtectedAdminLayout>
  );
}
