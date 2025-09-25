/**
 * Admin Invitation Management UI Component
 *
 * Interactive React component for managing admin invitations.
 * Features invitation workflow, status tracking, email preview, and bulk operations.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Mail,
  Send,
  Clock,
  Check,
  X,
  AlertCircle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  User,
  Crown,
  Shield,
  Star,
  Loader2,
  CheckSquare,
  Square,
  MoreHorizontal,
  FileText,
  Download,
} from 'lucide-react';

// Types
interface AdminInvitation {
  id: string;
  email: string;
  role: AdminRole;
  fandom_id?: string;
  fandom_name?: string;
  invited_by: string;
  invited_by_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  invitation_url?: string;
  notes?: string;
}

interface AdminRole {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: React.ComponentType<any>;
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  expired: number;
  cancelled: number;
}

interface BulkInvitationOperation {
  type: 'resend' | 'cancel' | 'extend' | 'delete';
  invitation_ids: string[];
  reason?: string;
  new_expiry?: string;
}

interface InvitationManagementProps {
  className?: string;
  fandom_id?: string;
}

// Constants
const ADMIN_ROLES: AdminRole[] = [
  {
    name: 'project_admin',
    display_name: 'Project Admin',
    description: 'Full access to all project areas',
    permissions: ['validation:global', 'admin:assign', 'admin:revoke'],
    color: 'text-purple-600 bg-purple-100',
    icon: Crown,
  },
  {
    name: 'fandom_admin',
    display_name: 'Fandom Admin',
    description: 'Full access to specific fandom',
    permissions: ['validation:fandom', 'admin:fandom_assign'],
    color: 'text-blue-600 bg-blue-100',
    icon: Shield,
  },
  {
    name: 'fandom_moderator',
    display_name: 'Fandom Moderator',
    description: 'Content moderation within fandom',
    permissions: ['validation:fandom', 'fandom:moderate'],
    color: 'text-green-600 bg-green-100',
    icon: Star,
  },
];

const STATUS_CONFIG = {
  pending: {
    color: 'text-yellow-600 bg-yellow-100',
    icon: Clock,
    label: 'Pending',
  },
  accepted: {
    color: 'text-green-600 bg-green-100',
    icon: Check,
    label: 'Accepted',
  },
  rejected: {
    color: 'text-red-600 bg-red-100',
    icon: X,
    label: 'Rejected',
  },
  expired: {
    color: 'text-gray-600 bg-gray-100',
    icon: AlertCircle,
    label: 'Expired',
  },
  cancelled: {
    color: 'text-orange-600 bg-orange-100',
    icon: X,
    label: 'Cancelled',
  },
};

/**
 * Main Invitation Management Component
 */
export default function InvitationManagement({
  className = '',
  fandom_id,
}: InvitationManagementProps) {
  const { user } = useUser();

  // State management
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [stats, setStats] = useState<InvitationStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    cancelled: 0,
  });
  const [selectedInvitations, setSelectedInvitations] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'expires_at' | 'email'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [previewInvitation, setPreviewInvitation] =
    useState<AdminInvitation | null>(null);

  // Permission states
  const [canInvite, setCanInvite] = useState(false);
  const [canManage, setCanManage] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadInvitations();
      checkPermissions();
    }
  }, [user?.id, fandom_id]);

  /**
   * Load invitations data
   */
  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fandom_id) params.append('fandom_id', fandom_id);

      const response = await fetch(`/api/admin/invitations?${params}`);
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
        calculateStats(data.invitations || []);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check user permissions
   */
  const checkPermissions = async () => {
    if (!user?.id) return;

    try {
      const [inviteResponse, manageResponse] = await Promise.all([
        fetch(
          `/api/admin/users?action=permissions&user_id=${
            user.id
          }&permission=admin:invite${
            fandom_id ? `&fandom_id=${fandom_id}` : ''
          }`
        ),
        fetch(
          `/api/admin/users?action=permissions&user_id=${
            user.id
          }&permission=admin:manage${
            fandom_id ? `&fandom_id=${fandom_id}` : ''
          }`
        ),
      ]);

      const inviteData = await inviteResponse.json();
      const manageData = await manageResponse.json();

      setCanInvite(inviteData.permission_check?.has_permission || false);
      setCanManage(manageData.permission_check?.has_permission || false);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  /**
   * Calculate invitation statistics
   */
  const calculateStats = (invitationList: AdminInvitation[]) => {
    const stats = invitationList.reduce(
      (acc, inv) => {
        acc.total++;
        acc[inv.status]++;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
        cancelled: 0,
      }
    );

    setStats(stats);
  };

  /**
   * Filter and sort invitations
   */
  const filteredInvitations = useMemo(() => {
    let filtered = invitations.filter(invitation => {
      const matchesSearch =
        invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invitation.invited_by_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (invitation.fandom_name &&
          invitation.fandom_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === 'all' || invitation.status === filterStatus;
      const matchesRole =
        filterRole === 'all' || invitation.role.name === filterRole;
      const matchesFandom = !fandom_id || invitation.fandom_id === fandom_id;

      return matchesSearch && matchesStatus && matchesRole && matchesFandom;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'expires_at':
          aValue = new Date(a.expires_at);
          bValue = new Date(b.expires_at);
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [
    invitations,
    searchTerm,
    filterStatus,
    filterRole,
    sortBy,
    sortOrder,
    fandom_id,
  ]);

  /**
   * Handle invitation selection
   */
  const toggleInvitationSelection = (invitationId: string) => {
    setSelectedInvitations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invitationId)) {
        newSet.delete(invitationId);
      } else {
        newSet.add(invitationId);
      }
      return newSet;
    });
  };

  /**
   * Select all visible invitations
   */
  const selectAllInvitations = () => {
    const allVisible = filteredInvitations.map(inv => inv.id);
    const allSelected = allVisible.every(id => selectedInvitations.has(id));

    setSelectedInvitations(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        allVisible.forEach(id => newSet.delete(id));
      } else {
        allVisible.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = async (operation: BulkInvitationOperation) => {
    if (operation.invitation_ids.length === 0) return;

    setIsProcessing(true);
    try {
      let endpoint = '/api/admin/invitations';
      let method = 'PATCH';
      let body: any = {
        operation: operation.type,
        invitation_ids: operation.invitation_ids,
        reason: operation.reason,
      };

      if (operation.type === 'extend' && operation.new_expiry) {
        body.new_expiry = operation.new_expiry;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        await loadInvitations();
        setSelectedInvitations(new Set());
        setShowBulkPanel(false);
        console.log('Bulk operation completed:', result);
      } else {
        throw new Error(result.error || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle individual invitation actions
   */
  const handleInvitationAction = async (
    invitationId: string,
    action: 'resend' | 'cancel' | 'delete',
    reason?: string
  ) => {
    try {
      let method = 'PUT';
      let body: any = { reason };

      if (action === 'delete') {
        method = 'DELETE';
        body = { invitation_id: invitationId, reason };
      } else if (action === 'resend') {
        body = { invitation_id: invitationId, action: 'resend' };
      } else if (action === 'cancel') {
        body = { invitation_id: invitationId, action: 'cancel', reason };
      }

      const response = await fetch('/api/admin/invitations', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        await loadInvitations();
        console.log(`Invitation ${action} completed:`, result);
      } else {
        throw new Error(result.error || `Failed to ${action} invitation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading invitations...</span>
      </div>
    );
  }

  return (
    <div
      className={`invitation-management bg-white rounded-lg shadow-sm border ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              Invitation Management
              {fandom_id && (
                <span className="ml-2 text-sm text-gray-500">
                  • Fandom Specific
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Send and manage admin invitations
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {selectedInvitations.size > 0 && (
              <button
                onClick={() => setShowBulkPanel(!showBulkPanel)}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Bulk Actions ({selectedInvitations.size})
              </button>
            )}

            {canInvite && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Invitation
              </button>
            )}

            <button
              onClick={loadInvitations}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard
            label="Total"
            value={stats.total}
            color="text-gray-600"
            onClick={() => setFilterStatus('all')}
            isActive={filterStatus === 'all'}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            color="text-yellow-600"
            onClick={() => setFilterStatus('pending')}
            isActive={filterStatus === 'pending'}
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            color="text-green-600"
            onClick={() => setFilterStatus('accepted')}
            isActive={filterStatus === 'accepted'}
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            color="text-red-600"
            onClick={() => setFilterStatus('rejected')}
            isActive={filterStatus === 'rejected'}
          />
          <StatCard
            label="Expired"
            value={stats.expired}
            color="text-gray-600"
            onClick={() => setFilterStatus('expired')}
            isActive={filterStatus === 'expired'}
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            color="text-orange-600"
            onClick={() => setFilterStatus('cancelled')}
            isActive={filterStatus === 'cancelled'}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email, inviter, or fandom..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {ADMIN_ROLES.map(role => (
              <option key={role.name} value={role.name}>
                {role.display_name}
              </option>
            ))}
          </select>

          {/* Sort options */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={e => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="expires_at-asc">Expiring Soon</option>
            <option value="expires_at-desc">Expiring Last</option>
            <option value="email-asc">Email A-Z</option>
            <option value="email-desc">Email Z-A</option>
          </select>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {showBulkPanel && selectedInvitations.size > 0 && (
        <BulkOperationsPanel
          selectedInvitations={Array.from(selectedInvitations)}
          invitations={invitations}
          onOperation={handleBulkOperation}
          onClose={() => setShowBulkPanel(false)}
          isProcessing={isProcessing}
        />
      )}

      {/* Create Invitation Form */}
      {showCreateForm && canInvite && (
        <CreateInvitationForm
          fandomId={fandom_id}
          roles={ADMIN_ROLES.filter(
            role => !fandom_id || !role.name.includes('project')
          )}
          onSuccess={() => {
            setShowCreateForm(false);
            loadInvitations();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Invitations List */}
      <div className="divide-y divide-gray-200">
        {/* Select all header */}
        {filteredInvitations.length > 0 && (
          <div className="p-4 bg-gray-50 flex items-center justify-between text-sm">
            <button
              onClick={selectAllInvitations}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              {filteredInvitations.every(inv =>
                selectedInvitations.has(inv.id)
              ) ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : filteredInvitations.some(inv =>
                  selectedInvitations.has(inv.id)
                ) ? (
                <div className="w-4 h-4 border-2 border-blue-600 bg-blue-100 rounded" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                {selectedInvitations.size > 0
                  ? `${selectedInvitations.size} selected`
                  : 'Select all'}
              </span>
            </button>

            <span className="text-gray-500">
              {filteredInvitations.length} invitation
              {filteredInvitations.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Invitations */}
        {filteredInvitations.map(invitation => (
          <InvitationRow
            key={invitation.id}
            invitation={invitation}
            isSelected={selectedInvitations.has(invitation.id)}
            canManage={canManage}
            onToggleSelection={() => toggleInvitationSelection(invitation.id)}
            onAction={handleInvitationAction}
            onPreview={() => setPreviewInvitation(invitation)}
          />
        ))}

        {filteredInvitations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No invitations found</p>
            <p className="text-sm">
              {searchTerm || filterStatus !== 'all' || filterRole !== 'all'
                ? 'Try adjusting your filters'
                : canInvite
                ? 'Send your first invitation to get started'
                : 'No invitations available'}
            </p>
            {canInvite &&
              !searchTerm &&
              filterStatus === 'all' &&
              filterRole === 'all' && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send First Invitation
                </button>
              )}
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {previewInvitation && (
        <EmailPreviewModal
          invitation={previewInvitation}
          onClose={() => setPreviewInvitation(null)}
        />
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  color,
  onClick,
  isActive,
}: {
  label: string;
  value: number;
  color: string;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 text-center rounded-lg border transition-colors ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </button>
  );
}

/**
 * Individual Invitation Row Component
 */
function InvitationRow({
  invitation,
  isSelected,
  canManage,
  onToggleSelection,
  onAction,
  onPreview,
}: {
  invitation: AdminInvitation;
  isSelected: boolean;
  canManage: boolean;
  onToggleSelection: () => void;
  onAction: (
    invitationId: string,
    action: 'resend' | 'cancel' | 'delete',
    reason?: string
  ) => void;
  onPreview: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const role =
    ADMIN_ROLES.find(r => r.name === invitation.role.name) || ADMIN_ROLES[0];
  const status = STATUS_CONFIG[invitation.status];
  const IconComponent = role.icon;
  const StatusIcon = status.icon;

  const isExpiringSoon =
    invitation.status === 'pending' &&
    new Date(invitation.expires_at) <
      new Date(Date.now() + 24 * 60 * 60 * 1000);

  const handleAction = async (action: 'resend' | 'cancel' | 'delete') => {
    setIsProcessing(true);
    try {
      await onAction(invitation.id, action);
    } finally {
      setIsProcessing(false);
      setShowActions(false);
    }
  };

  const copyInvitationUrl = () => {
    if (invitation.invitation_url) {
      navigator.clipboard.writeText(invitation.invitation_url);
      // Could show toast here
      console.log('Invitation URL copied to clipboard');
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Selection checkbox */}
          <button
            onClick={onToggleSelection}
            className="text-gray-400 hover:text-gray-600"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>

          {/* Role icon */}
          <div className={`p-2 rounded-lg ${role.color}`}>
            <IconComponent className="w-4 h-4" />
          </div>

          {/* Invitation details */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {invitation.email}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-medium text-gray-700">
                {role.display_name}
              </span>
              {invitation.fandom_name && (
                <>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">
                    {invitation.fandom_name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              <span>Invited by {invitation.invited_by_name}</span>
              <span>•</span>
              <span>
                {new Date(invitation.created_at).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>
                Expires {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
              {isExpiringSoon && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                  Expiring Soon
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status and actions */}
        <div className="flex items-center space-x-3">
          {/* Status badge */}
          <div
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${status.color}`}
          >
            <StatusIcon className="w-3 h-3" />
            <span className="text-sm font-medium">{status.label}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onPreview}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="Preview email"
            >
              <Eye className="w-4 h-4" />
            </button>

            {invitation.invitation_url && (
              <button
                onClick={copyInvitationUrl}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Copy invitation URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}

            {canManage && (
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {/* Actions dropdown */}
                {showActions && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {invitation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction('resend')}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                          <Send className="w-3 h-3 mr-2" />
                          Resend
                        </button>
                        <button
                          onClick={() => handleAction('cancel')}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                          <X className="w-3 h-3 mr-2" />
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleAction('delete')}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {invitation.notes && (
        <div className="mt-2 ml-11 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          {invitation.notes}
        </div>
      )}
    </div>
  );
}

/**
 * Create Invitation Form Component
 */
function CreateInvitationForm({
  fandomId,
  roles,
  onSuccess,
  onCancel,
}: {
  fandomId?: string;
  roles: AdminRole[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedFandom, setSelectedFandom] = useState(fandomId || '');
  const [notes, setNotes] = useState('');
  const [expiresIn, setExpiresIn] = useState('7'); // days
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fandoms, setFandoms] = useState<any[]>([]);

  useEffect(() => {
    if (!fandomId) {
      // Load fandoms for selection
      fetch('/api/fandoms')
        .then(res => res.json())
        .then(data => setFandoms(data.fandoms || []))
        .catch(console.error);
    }
  }, [fandomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedRole) return;

    setIsSubmitting(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiresIn));

      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: selectedRole,
          fandom_id: selectedFandom || null,
          expires_at: expiryDate.toISOString(),
          notes: notes || null,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        console.error('Error creating invitation:', error);
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 border-b border-gray-200 bg-blue-50">
      <h4 className="font-medium text-gray-900 mb-4">Send New Invitation</h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a role...</option>
              {roles.map(role => (
                <option key={role.name} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Fandom (if not locked) */}
          {!fandomId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fandom (Optional)
              </label>
              <select
                value={selectedFandom}
                onChange={e => setSelectedFandom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Fandoms</option>
                {fandoms.map(fandom => (
                  <option key={fandom.id} value={fandom.id}>
                    {fandom.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Expires in */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires In
            </label>
            <select
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional information for the invitation..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!email || !selectedRole || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Bulk Operations Panel Component
 */
function BulkOperationsPanel({
  selectedInvitations,
  invitations,
  onOperation,
  onClose,
  isProcessing,
}: {
  selectedInvitations: string[];
  invitations: AdminInvitation[];
  onOperation: (operation: BulkInvitationOperation) => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  const [operationType, setOperationType] = useState<
    'resend' | 'cancel' | 'extend' | 'delete'
  >('resend');
  const [reason, setReason] = useState('');
  const [newExpiry, setNewExpiry] = useState('7');

  const selectedInvitationObjects = invitations.filter(inv =>
    selectedInvitations.includes(inv.id)
  );

  const handleExecute = () => {
    const operation: BulkInvitationOperation = {
      type: operationType,
      invitation_ids: selectedInvitations,
      reason: reason || undefined,
    };

    if (operationType === 'extend') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(newExpiry));
      operation.new_expiry = expiryDate.toISOString();
    }

    onOperation(operation);
  };

  return (
    <div className="p-4 bg-orange-50 border-b border-orange-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">
          Bulk Operations ({selectedInvitations.length} selected)
        </h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Operation type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operation
          </label>
          <select
            value={operationType}
            onChange={e => setOperationType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="resend">Resend Invitations</option>
            <option value="cancel">Cancel Invitations</option>
            <option value="extend">Extend Expiry</option>
            <option value="delete">Delete Invitations</option>
          </select>
        </div>

        {/* New expiry (for extend) */}
        {operationType === 'extend' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extend By
            </label>
            <select
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Operation reason..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Preview</h5>
        <div className="text-sm text-gray-600 space-y-1">
          {selectedInvitationObjects.slice(0, 3).map(invitation => (
            <div key={invitation.id}>
              {invitation.email} • {invitation.role.display_name} •{' '}
              {invitation.status}
            </div>
          ))}
          {selectedInvitationObjects.length > 3 && (
            <div>... and {selectedInvitationObjects.length - 3} more</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-3 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleExecute}
          disabled={isProcessing}
          className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>Execute {operationType}</>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Email Preview Modal Component
 */
function EmailPreviewModal({
  invitation,
  onClose,
}: {
  invitation: AdminInvitation;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="space-y-3">
              <div>
                <strong>To:</strong> {invitation.email}
              </div>
              <div>
                <strong>Subject:</strong> Invitation to join The Pensieve Index
                as {invitation.role.display_name}
              </div>
              <div className="border-t pt-3">
                <p className="mb-3">Hello,</p>
                <p className="mb-3">
                  You have been invited to join The Pensieve Index as a{' '}
                  <strong>{invitation.role.display_name}</strong>
                  {invitation.fandom_name && (
                    <span>
                      {' '}
                      for the <strong>{invitation.fandom_name}</strong> fandom
                    </span>
                  )}
                  .
                </p>
                <p className="mb-3">
                  This invitation was sent by{' '}
                  <strong>{invitation.invited_by_name}</strong>.
                </p>
                {invitation.notes && (
                  <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-200">
                    <strong>Note:</strong> {invitation.notes}
                  </div>
                )}
                <p className="mb-3">
                  <strong>Role Description:</strong>{' '}
                  {invitation.role.description}
                </p>
                <p className="mb-3">
                  To accept this invitation, click the link below:
                </p>
                <div className="p-2 bg-blue-600 text-white rounded text-center mb-3">
                  <a href="#" className="text-white underline">
                    Accept Invitation
                  </a>
                </div>
                <p className="text-sm text-gray-600">
                  This invitation expires on{' '}
                  {new Date(invitation.expires_at).toLocaleDateString()} at{' '}
                  {new Date(invitation.expires_at).toLocaleTimeString()}.
                </p>
                <p className="text-sm text-gray-600 mt-3">
                  If you do not wish to accept this invitation, you can safely
                  ignore this email.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
