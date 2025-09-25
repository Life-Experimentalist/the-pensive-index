/**
 * Fandom Admin Assignment UI Component
 *
 * Interactive React component for managing fandom-specific admin assignments.
 * Features hierarchical display, bulk operations, and fandom-scoped permissions.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  ChevronRight,
  ChevronDown,
  Users,
  BookOpen,
  Plus,
  X,
  Check,
  AlertCircle,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Crown,
  Shield,
  Star,
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react';

// Types
interface Fandom {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  admin_count: number;
  moderator_count: number;
  validator_count: number;
  created_at: string;
}

interface FandomAssignment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  fandom_id: string;
  fandom_name: string;
  role: AdminRole;
  assigned_by: string;
  assigned_by_name: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface AdminRole {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: React.ComponentType<any>;
}

interface BulkOperation {
  type: 'assign' | 'reassign' | 'revoke' | 'transfer';
  assignments: string[];
  target_role?: string;
  target_user?: string;
  reason?: string;
}

interface FandomAssignmentProps {
  className?: string;
  selectedFandomId?: string;
  onFandomSelect?: (fandomId: string) => void;
}

// Constants
const FANDOM_ROLES: AdminRole[] = [
  {
    name: 'fandom_admin',
    display_name: 'Fandom Admin',
    description: 'Full administrative control over fandom content and users',
    permissions: ['validation:fandom', 'admin:fandom_assign', 'fandom:moderate', 'fandom:settings'],
    color: 'text-purple-600 bg-purple-100',
    icon: Crown
  },
  {
    name: 'fandom_moderator',
    display_name: 'Fandom Moderator',
    description: 'Content moderation and community management',
    permissions: ['validation:fandom', 'fandom:moderate', 'fandom:content'],
    color: 'text-blue-600 bg-blue-100',
    icon: Shield
  },
  {
    name: 'validator',
    display_name: 'Story Validator',
    description: 'Validate and approve story submissions',
    permissions: ['validation:fandom', 'story:validate'],
    color: 'text-green-600 bg-green-100',
    icon: Star
  }
];

/**
 * Main Fandom Assignment Component
 */
export default function FandomAssignment({
  className = '',
  selectedFandomId,
  onFandomSelect
}: FandomAssignmentProps) {
  const { user } = useUser();

  // State management
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [assignments, setAssignments] = useState<FandomAssignment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [expandedFandoms, setExpandedFandoms] = useState<Set<string>>(new Set());
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null);

  // Permission states
  const [canAssign, setCanAssign] = useState<Record<string, boolean>>({});
  const [canRevoke, setCanRevoke] = useState<Record<string, boolean>>({});
  const [canViewAll, setCanViewAll] = useState(false);

  // Load data on mount and when selectedFandomId changes
  useEffect(() => {
    if (user?.id) {
      loadFandomsAndAssignments();
      checkGlobalPermissions();
    }
  }, [user?.id, selectedFandomId]);

  // Auto-expand selected fandom
  useEffect(() => {
    if (selectedFandomId && !expandedFandoms.has(selectedFandomId)) {
      setExpandedFandoms(prev => new Set([...prev, selectedFandomId]));
    }
  }, [selectedFandomId, expandedFandoms]);

  /**
   * Load fandoms and assignments data
   */
  const loadFandomsAndAssignments = async () => {
    setIsLoading(true);
    try {
      const [fandomsResponse, assignmentsResponse, usersResponse] = await Promise.all([
        fetch('/api/fandoms'),
        fetch(`/api/admin/fandoms/assign${selectedFandomId ? `?fandom_id=${selectedFandomId}` : ''}`),
        fetch('/api/admin/users?action=list&is_active=true')
      ]);

      if (fandomsResponse.ok) {
        const fandomsData = await fandomsResponse.json();
        setFandoms(fandomsData.fandoms || []);
      }

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments || []);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setAvailableUsers(usersData.users || []);
      }

      // Check fandom-specific permissions
      await checkFandomPermissions();
    } catch (error) {
      console.error('Error loading fandom data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check global permissions
   */
  const checkGlobalPermissions = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/admin/users?action=permissions&user_id=${user.id}&permission=validation:global`);
      const data = await response.json();
      setCanViewAll(data.permission_check?.has_permission || false);
    } catch (error) {
      console.error('Error checking global permissions:', error);
    }
  };

  /**
   * Check fandom-specific permissions
   */
  const checkFandomPermissions = async () => {
    if (!user?.id) return;

    const assignPermissions: Record<string, boolean> = {};
    const revokePermissions: Record<string, boolean> = {};

    for (const fandom of fandoms) {
      try {
        const [assignResponse, revokeResponse] = await Promise.all([
          fetch(`/api/admin/users?action=permissions&user_id=${user.id}&permission=admin:fandom_assign&fandom_id=${fandom.id}`),
          fetch(`/api/admin/users?action=permissions&user_id=${user.id}&permission=admin:revoke&fandom_id=${fandom.id}`)
        ]);

        const assignData = await assignResponse.json();
        const revokeData = await revokeResponse.json();

        assignPermissions[fandom.id] = assignData.permission_check?.has_permission || false;
        revokePermissions[fandom.id] = revokeData.permission_check?.has_permission || false;
      } catch (error) {
        console.error(`Error checking permissions for fandom ${fandom.id}:`, error);
      }
    }

    setCanAssign(assignPermissions);
    setCanRevoke(revokePermissions);
  };

  /**
   * Toggle fandom expansion
   */
  const toggleFandomExpansion = (fandomId: string) => {
    setExpandedFandoms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fandomId)) {
        newSet.delete(fandomId);
      } else {
        newSet.add(fandomId);
      }
      return newSet;
    });

    // Call parent callback if provided
    if (onFandomSelect && !expandedFandoms.has(fandomId)) {
      onFandomSelect(fandomId);
    }
  };

  /**
   * Handle assignment selection
   */
  const toggleAssignmentSelection = (assignmentId: string) => {
    setSelectedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  /**
   * Select all assignments for a fandom
   */
  const selectAllInFandom = (fandomId: string) => {
    const fandomAssignments = filteredAssignments.filter(a => a.fandom_id === fandomId);
    const allSelected = fandomAssignments.every(a => selectedAssignments.has(a.id));

    setSelectedAssignments(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        fandomAssignments.forEach(a => newSet.delete(a.id));
      } else {
        fandomAssignments.forEach(a => newSet.add(a.id));
      }
      return newSet;
    });
  };

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = async (operation: BulkOperation) => {
    if (operation.assignments.length === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/fandoms/assign', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: operation.type,
          assignment_ids: operation.assignments,
          target_role: operation.target_role,
          target_user: operation.target_user,
          reason: operation.reason || `Bulk ${operation.type} operation`
        })
      });

      const result = await response.json();

      if (response.ok) {
        await loadFandomsAndAssignments();
        setSelectedAssignments(new Set());
        setBulkOperation(null);
        setShowBulkPanel(false);
        console.log('Bulk operation completed:', result);
      } else {
        throw new Error(result.error || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      // Could show error toast here
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Filter assignments based on search and filters
   */
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      const matchesSearch = assignment.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.fandom_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = filterRole === 'all' || assignment.role.name === filterRole;

      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'active' && assignment.is_active) ||
                           (filterStatus === 'inactive' && !assignment.is_active) ||
                           (filterStatus === 'expiring' && assignment.expires_at && new Date(assignment.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      const matchesFandom = !selectedFandomId || assignment.fandom_id === selectedFandomId;

      return matchesSearch && matchesRole && matchesStatus && matchesFandom;
    });
  }, [assignments, searchTerm, filterRole, filterStatus, selectedFandomId]);

  /**
   * Group assignments by fandom
   */
  const assignmentsByFandom = useMemo(() => {
    const grouped: Record<string, FandomAssignment[]> = {};

    filteredAssignments.forEach(assignment => {
      if (!grouped[assignment.fandom_id]) {
        grouped[assignment.fandom_id] = [];
      }
      grouped[assignment.fandom_id].push(assignment);
    });

    return grouped;
  }, [filteredAssignments]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading fandom assignments...</span>
      </div>
    );
  }

  return (
    <div className={`fandom-assignment bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
              Fandom Administration
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage admin assignments across all fandoms
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {selectedAssignments.size > 0 && (
              <button
                onClick={() => setShowBulkPanel(!showBulkPanel)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Bulk Actions ({selectedAssignments.size})
              </button>
            )}

            <button
              onClick={loadFandomsAndAssignments}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users, fandoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {FANDOM_ROLES.map(role => (
              <option key={role.name} value={role.name}>
                {role.display_name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="expiring">Expiring Soon</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {showBulkPanel && selectedAssignments.size > 0 && (
        <BulkOperationsPanel
          selectedAssignments={Array.from(selectedAssignments)}
          assignments={assignments}
          roles={FANDOM_ROLES}
          users={availableUsers}
          onOperation={handleBulkOperation}
          onClose={() => setShowBulkPanel(false)}
          isProcessing={isProcessing}
        />
      )}

      {/* Fandom List */}
      <div className="divide-y divide-gray-200">
        {fandoms.map(fandom => (
          <FandomSection
            key={fandom.id}
            fandom={fandom}
            assignments={assignmentsByFandom[fandom.id] || []}
            isExpanded={expandedFandoms.has(fandom.id)}
            selectedAssignments={selectedAssignments}
            canAssign={canAssign[fandom.id] || false}
            canRevoke={canRevoke[fandom.id] || false}
            onToggleExpansion={() => toggleFandomExpansion(fandom.id)}
            onToggleSelection={toggleAssignmentSelection}
            onSelectAll={() => selectAllInFandom(fandom.id)}
            onRefresh={loadFandomsAndAssignments}
          />
        ))}

        {fandoms.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No fandoms found</p>
            <p className="text-sm">Check your permissions or contact an administrator</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Fandom Section Component
 */
function FandomSection({
  fandom,
  assignments,
  isExpanded,
  selectedAssignments,
  canAssign,
  canRevoke,
  onToggleExpansion,
  onToggleSelection,
  onSelectAll,
  onRefresh
}: {
  fandom: Fandom;
  assignments: FandomAssignment[];
  isExpanded: boolean;
  selectedAssignments: Set<string>;
  canAssign: boolean;
  canRevoke: boolean;
  onToggleExpansion: () => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Count assignments by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FANDOM_ROLES.forEach(role => {
      counts[role.name] = assignments.filter(a => a.role.name === role.name && a.is_active).length;
    });
    return counts;
  }, [assignments]);

  // Check if all assignments in this fandom are selected
  const allSelected = assignments.length > 0 && assignments.every(a => selectedAssignments.has(a.id));
  const someSelected = assignments.some(a => selectedAssignments.has(a.id));

  return (
    <div className="fandom-section">
      {/* Fandom Header */}
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Selection checkbox */}
            <button
              onClick={onSelectAll}
              className="text-gray-400 hover:text-gray-600"
              disabled={assignments.length === 0}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : someSelected ? (
                <div className="w-4 h-4 border-2 border-blue-600 bg-blue-100 rounded" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            {/* Expand/Collapse */}
            <button
              onClick={onToggleExpansion}
              className="flex items-center space-x-2 text-left group"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              )}

              <div>
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                  {fandom.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {assignments.filter(a => a.is_active).length} active assignments
                </p>
              </div>
            </button>
          </div>

          {/* Fandom Stats */}
          <div className="flex items-center space-x-4">
            {/* Role counts */}
            <div className="flex items-center space-x-3 text-sm">
              {FANDOM_ROLES.map(role => {
                const count = roleCounts[role.name];
                const IconComponent = role.icon;
                return (
                  <div key={role.name} className="flex items-center space-x-1">
                    <IconComponent className={`w-3 h-3 ${role.color.split(' ')[0]}`} />
                    <span className="text-gray-600">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              {canAssign && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Add assignment"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onRefresh}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {/* Add Assignment Form */}
          {showAddForm && canAssign && (
            <AddAssignmentForm
              fandomId={fandom.id}
              fandomName={fandom.name}
              onSuccess={() => {
                setShowAddForm(false);
                onRefresh();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Assignments List */}
          {assignments.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {assignments.map(assignment => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  isSelected={selectedAssignments.has(assignment.id)}
                  canRevoke={canRevoke}
                  onToggleSelection={() => onToggleSelection(assignment.id)}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No assignments in this fandom</p>
              {canAssign && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add First Assignment
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual Assignment Row Component
 */
function AssignmentRow({
  assignment,
  isSelected,
  canRevoke,
  onToggleSelection,
  onRefresh
}: {
  assignment: FandomAssignment;
  isSelected: boolean;
  canRevoke: boolean;
  onToggleSelection: () => void;
  onRefresh: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const role = FANDOM_ROLES.find(r => r.name === assignment.role.name) || FANDOM_ROLES[0];
  const IconComponent = role.icon;

  const handleRevoke = async () => {
    if (!canRevoke) return;

    setIsRevoking(true);
    try {
      const response = await fetch('/api/admin/fandoms/assign', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: assignment.id,
          reason: 'Revoked via fandom admin interface'
        })
      });

      if (response.ok) {
        onRefresh();
      } else {
        const error = await response.json();
        console.error('Error revoking assignment:', error);
      }
    } catch (error) {
      console.error('Error revoking assignment:', error);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="p-4 hover:bg-white transition-colors group">
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

          {/* Assignment details */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{assignment.user_name}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-medium text-gray-700">{role.display_name}</span>
              {!assignment.is_active && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                  Inactive
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {assignment.user_email} • Assigned {new Date(assignment.created_at).toLocaleDateString()}
              {assignment.assigned_by_name && (
                <span> by {assignment.assigned_by_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canRevoke && assignment.is_active && (
            <button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
              title="Revoke assignment"
            >
              {isRevoking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Add Assignment Form Component
 */
function AddAssignmentForm({
  fandomId,
  fandomName,
  onSuccess,
  onCancel
}: {
  fandomId: string;
  fandomName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    // Load available users
    fetch('/api/admin/users?action=list&is_active=true')
      .then(res => res.json())
      .then(data => setAvailableUsers(data.users || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRole) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/fandoms/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUser,
          fandom_id: fandomId,
          role: selectedRole
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        console.error('Error creating assignment:', error);
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-blue-50">
      <h4 className="font-medium text-gray-900 mb-3">
        Add Assignment to {fandomName}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* User selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a user...</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Role selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a role...</option>
              {FANDOM_ROLES.map(role => (
                <option key={role.name} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedUser || !selectedRole || isSubmitting}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Assignment
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
  selectedAssignments,
  assignments,
  roles,
  users,
  onOperation,
  onClose,
  isProcessing
}: {
  selectedAssignments: string[];
  assignments: FandomAssignment[];
  roles: AdminRole[];
  users: any[];
  onOperation: (operation: BulkOperation) => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  const [operationType, setOperationType] = useState<'assign' | 'reassign' | 'revoke' | 'transfer'>('reassign');
  const [targetRole, setTargetRole] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [reason, setReason] = useState('');

  const selectedAssignmentObjects = assignments.filter(a => selectedAssignments.includes(a.id));

  const handleExecute = () => {
    onOperation({
      type: operationType,
      assignments: selectedAssignments,
      target_role: targetRole || undefined,
      target_user: targetUser || undefined,
      reason: reason || undefined
    });
  };

  return (
    <div className="p-4 bg-yellow-50 border-b border-yellow-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">
          Bulk Operations ({selectedAssignments.length} selected)
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
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
            onChange={(e) => setOperationType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="reassign">Change Role</option>
            <option value="transfer">Transfer to User</option>
            <option value="revoke">Revoke All</option>
          </select>
        </div>

        {/* Target role (for reassign) */}
        {operationType === 'reassign' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select role...</option>
              {roles.map(role => (
                <option key={role.name} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Target user (for transfer) */}
        {operationType === 'transfer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer To
            </label>
            <select
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select user...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
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
            onChange={(e) => setReason(e.target.value)}
            placeholder="Operation reason..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Preview</h5>
        <div className="text-sm text-gray-600 space-y-1">
          {selectedAssignmentObjects.slice(0, 3).map(assignment => (
            <div key={assignment.id}>
              {assignment.user_name} • {assignment.fandom_name} • {assignment.role.display_name}
            </div>
          ))}
          {selectedAssignmentObjects.length > 3 && (
            <div>... and {selectedAssignmentObjects.length - 3} more</div>
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
          disabled={isProcessing ||
            (operationType === 'reassign' && !targetRole) ||
            (operationType === 'transfer' && !targetUser)
          }
          className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Execute {operationType}
            </>
          )}
        </button>
      </div>
    </div>
  );
}