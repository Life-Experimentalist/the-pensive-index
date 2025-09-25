import ProtectedAdminLayout, {
  PermissionGate,
} from '@/components/admin/ProtectedAdminLayout';
import AdminRoleAssignment from '@/components/admin/AdminRoleAssignment';

export default function AdminRoleAssignmentPage() {
  return (
    <ProtectedAdminLayout
      title="Role Assignment"
      requiredPermission="canManageRoles"
    >
      <PermissionGate
        permission="canManageRoles"
        fallback={
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600">
              You don't have permission to manage roles.
            </p>
          </div>
        }
      >
        <AdminRoleAssignment />
      </PermissionGate>
    </ProtectedAdminLayout>
  );
}
