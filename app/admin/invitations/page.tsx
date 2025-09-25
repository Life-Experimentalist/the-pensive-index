import ProtectedAdminLayout, {
  PermissionGate,
} from '@/components/admin/ProtectedAdminLayout';
import InvitationManagement from '@/components/admin/InvitationManagement';

export default function AdminInvitationsPage() {
  return (
    <ProtectedAdminLayout
      title="Invitation Management"
      requiredPermission="canManageInvitations"
    >
      <PermissionGate
        permission="canManageInvitations"
        fallback={
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600">
              You don't have permission to manage invitations.
            </p>
          </div>
        }
      >
        <InvitationManagement />
      </PermissionGate>
    </ProtectedAdminLayout>
  );
}
