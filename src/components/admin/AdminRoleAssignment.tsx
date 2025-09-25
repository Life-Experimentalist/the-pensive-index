/**
 * Admin Role Assignment UI Component
 *
 * Interactive React component for managing admin role assignments.
 * Features drag-and-drop interface, real-time validation, and permission checking.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Users,
  Shield,
  Plus,
  X,
  Check,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  UserPlus,
  UserMinus
} from 'lucide-react';

// Types
interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  assignments?: AdminAssignment[];
}

interface AdminAssignment {
  id: string;
  role: AdminRole;
  fandom_id?: string;
  fandom_name?: string;
  assigned_by: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface AdminRole {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_global: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
}

interface RoleAssignmentComponentProps {
  fandom_id?: string;
  className?: string;
}

// Constants
const ADMIN_ROLES: AdminRole[] = [
  {
    name: 'project_admin',
    display_name: 'Project Admin',
    description: 'Full access to all project areas and global settings',
    permissions: ['validation:global', 'admin:assign', 'admin:revoke', 'admin:audit'],
    is_global: true
  },
  {
    name: 'fandom_admin',
    display_name: 'Fandom Admin',
    description: 'Full access to specific fandom areas',
    permissions: ['validation:fandom', 'admin:fandom_assign', 'fandom:moderate'],
    is_global: false
  },
  {
    name: 'fandom_moderator',
    display_name: 'Fandom Moderator',
    description: 'Content moderation within specific fandoms',
    permissions: ['validation:fandom', 'fandom:moderate'],
    is_global: false
  },
  {
    name: 'validator',
    display_name: 'Validator',
    description: 'Story and tag validation permissions',
    permissions: ['validation:fandom'],
    is_global: false
  }
];

/**
 * Main Role Assignment Component
 */
export default function AdminRoleAssignment({ fandom_id, className = '' }: RoleAssignmentComponentProps) {
  const { user } = useUser();

  // State management
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AdminUser[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [draggedUser, setDraggedUser] = useState<AdminUser | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Permission states
  const [canAssign, setCanAssign] = useState(false);
  const [canRevoke, setCanRevoke] = useState(false);
  const [canViewAll, setCanViewAll] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data and permissions on mount
  useEffect(() => {
    if (user?.id) {
      loadInitialData();
      checkPermissions();
    }
  }, [user?.id, fandom_id]);

  /**
   * Load initial data
   */
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load users and assignments in parallel
      const [usersResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/admin/users?action=list${fandom_id ? `&fandom_id=${fandom_id}` : ''}`),
        fetch(`/api/admin/roles/assign?${fandom_id ? `fandom_id=${fandom_id}` : 'action=list'}`)
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
        setAvailableUsers(usersData.users?.filter((u: AdminUser) => u.is_active) || []);
      }

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
      const [assignResponse, revokeResponse, viewResponse] = await Promise.all([
        fetch(`/api/admin/users?action=permissions&user_id=${user.id}&permission=admin:assign${fandom_id ? `&fandom_id=${fandom_id}` : ''}`),
        fetch(`/api/admin/users?action=permissions&user_id=${user.id}&permission=admin:revoke${fandom_id ? `&fandom_id=${fandom_id}` : ''}`),
        fetch(`/api/admin/users?action=permissions&user_id=${user.id}&permission=validation:global`)
      ]);

      const assignData = await assignResponse.json();
      const revokeData = await revokeResponse.json();
      const viewData = await viewResponse.json();

      setCanAssign(assignData.permission_check?.has_permission || false);
      setCanRevoke(revokeData.permission_check?.has_permission || false);
      setCanViewAll(viewData.permission_check?.has_permission || false);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const user = availableUsers.find(u => u.id === active.id);
    setDraggedUser(user || null);
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedUser(null);

    if (!over || !selectedRole) return;

    const userId = active.id as string;
    const targetZone = over.id as string;

    if (targetZone === 'assignment-zone') {
      await handleRoleAssignment(userId, selectedRole);
    }
  };

  /**
   * Handle role assignment
   */
  const handleRoleAssignment = async (userId: string, role: AdminRole) => {
    if (!canAssign) {
      setValidationErrors([{
        field: 'permissions',
        message: 'You do not have permission to assign roles',
        suggestion: 'Contact a Project Admin for assistance'
      }]);
      return;
    }

    setIsAssigning(true);
    setValidationErrors([]);

    try {
      const assignmentData = {
        user_id: userId,
        role: role.name,
        fandom_id: fandom_id || null,
        expires_at: null // Could be configurable
      };

      const response = await fetch('/api/admin/roles/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentData)
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh data
        await loadInitialData();

        // Show success message
        // Could use toast or notification here
        console.log('Role assigned successfully:', result);
      } else {
        setValidationErrors([{
          field: 'assignment',
          message: result.error || 'Failed to assign role',
          suggestion: result.suggestion
        }]);
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      setValidationErrors([{
        field: 'network',
        message: 'Network error occurred while assigning role'
      }]);
    } finally {
      setIsAssigning(false);
    }
  };

  /**
   * Handle role revocation
   */
  const handleRoleRevocation = async (assignmentId: string, reason?: string) => {
    if (!canRevoke) {
      setValidationErrors([{
        field: 'permissions',
        message: 'You do not have permission to revoke roles'
      }]);
      return;
    }

    try {
      const response = await fetch('/api/admin/roles/assign', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          reason: reason || 'Role revoked by admin'
        })
      });

      const result = await response.json();

      if (response.ok) {
        await loadInitialData();
        console.log('Role revoked successfully:', result);
      } else {
        setValidationErrors([{
          field: 'revocation',
          message: result.error || 'Failed to revoke role'
        }]);
      }
    } catch (error) {
      console.error('Error revoking role:', error);
      setValidationErrors([{
        field: 'network',
        message: 'Network error occurred while revoking role'
      }]);
    }
  };

  /**
   * Filter users based on search and filters
   */
  const filteredUsers = availableUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterRole === 'all' ||
                         user.assignments?.some(a => a.role.name === filterRole && a.is_active);

    const matchesStatus = showInactive || user.is_active;

    return matchesSearch && matchesFilter && matchesStatus;
  });

  /**
   * Filter assignments based on current filters
   */
  const filteredAssignments = assignments.filter(assignment => {
    if (!showInactive && !assignment.is_active) return false;
    if (filterRole !== 'all' && assignment.role.name !== filterRole) return false;
    if (fandom_id && assignment.fandom_id !== fandom_id) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading admin assignments...</span>
      </div>
    );
  }

  return (
    <div className={`admin-role-assignment bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Role Assignment
              {fandom_id && <span className="ml-2 text-sm text-gray-500">• Fandom Specific</span>}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Assign and manage admin roles using drag-and-drop
            </p>
          </div>

          {/* Permissions indicator */}
          <div className="flex items-center space-x-2 text-xs">
            {canAssign && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                Can Assign
              </span>
            )}
            {canRevoke && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                Can Revoke
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              {ADMIN_ROLES.map(role => (
                <option key={role.name} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Show inactive toggle */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="sr-only"
            />
            <div className={`relative w-11 h-6 rounded-full transition-colors ${showInactive ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${showInactive ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="ml-2 text-sm text-gray-700">Show Inactive</span>
          </label>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          {validationErrors.map((error, index) => (
            <div key={index} className="flex items-start space-x-2 text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{error.message}</p>
                {error.suggestion && (
                  <p className="text-xs text-red-600 mt-1">{error.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Available Users */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Available Users
              <span className="ml-2 text-sm text-gray-500">({filteredUsers.length})</span>
            </h3>

            <UserList users={filteredUsers} />
          </div>

          {/* Role Selection & Assignment Zone */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Role Assignment
            </h3>

            {/* Role Selection */}
            <RoleSelector
              roles={ADMIN_ROLES.filter(role => !fandom_id || !role.is_global)}
              selectedRole={selectedRole}
              onRoleSelect={setSelectedRole}
            />

            {/* Assignment Zone */}
            <AssignmentZone
              selectedRole={selectedRole}
              isAssigning={isAssigning}
              canAssign={canAssign}
              draggedUser={draggedUser}
            />

            {/* Current Assignments */}
            <CurrentAssignments
              assignments={filteredAssignments}
              canRevoke={canRevoke}
              onRevoke={handleRoleRevocation}
            />
          </div>
        </div>
      </DndContext>
    </div>
  );
}

/**
 * Draggable User Item Component
 */
function DraggableUserItem({ user }: { user: AdminUser }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-3 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing
        hover:shadow-md transition-shadow
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>

        {/* Current roles badge */}
        {user.assignments && user.assignments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {user.assignments
              .filter(a => a.is_active)
              .slice(0, 2)
              .map(assignment => (
                <span
                  key={assignment.id}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                >
                  {assignment.role.display_name}
                </span>
              ))}
            {user.assignments.filter(a => a.is_active).length > 2 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                +{user.assignments.filter(a => a.is_active).length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * User List Component
 */
function UserList({ users }: { users: AdminUser[] }) {
  return (
    <SortableContext items={users.map(u => u.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {users.length > 0 ? (
          users.map(user => (
            <DraggableUserItem key={user.id} user={user} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No users found</p>
          </div>
        )}
      </div>
    </SortableContext>
  );
}

/**
 * Role Selector Component
 */
function RoleSelector({
  roles,
  selectedRole,
  onRoleSelect
}: {
  roles: AdminRole[];
  selectedRole: AdminRole | null;
  onRoleSelect: (role: AdminRole | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Role to Assign
      </label>
      <div className="grid grid-cols-1 gap-2">
        {roles.map(role => (
          <button
            key={role.name}
            onClick={() => onRoleSelect(selectedRole?.name === role.name ? null : role)}
            className={`
              p-3 text-left border rounded-lg transition-colors
              ${selectedRole?.name === role.name
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{role.display_name}</p>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
              {selectedRole?.name === role.name && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </div>

            {/* Permissions preview */}
            <div className="mt-2 flex flex-wrap gap-1">
              {role.permissions.slice(0, 3).map(permission => (
                <span
                  key={permission}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {permission}
                </span>
              ))}
              {role.permissions.length > 3 && (
                <span className="px-2 py-1 text-xs text-gray-500">
                  +{role.permissions.length - 3} more
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Assignment Zone Component
 */
function AssignmentZone({
  selectedRole,
  isAssigning,
  canAssign,
  draggedUser
}: {
  selectedRole: AdminRole | null;
  isAssigning: boolean;
  canAssign: boolean;
  draggedUser: AdminUser | null;
}) {
  return (
    <div
      id="assignment-zone"
      className={`
        min-h-32 p-6 border-2 border-dashed rounded-lg text-center transition-colors
        ${selectedRole && canAssign
          ? 'border-blue-300 bg-blue-50'
          : 'border-gray-300 bg-gray-50'
        }
        ${draggedUser && selectedRole && canAssign
          ? 'border-blue-500 bg-blue-100'
          : ''
        }
      `}
    >
      {isAssigning ? (
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-blue-700">Assigning role...</span>
        </div>
      ) : selectedRole && canAssign ? (
        <div>
          <UserPlus className="w-8 h-8 mx-auto mb-2 text-blue-600" />
          <p className="text-blue-700 font-medium">
            Drop user here to assign "{selectedRole.display_name}"
          </p>
          <p className="text-sm text-blue-600 mt-1">
            {selectedRole.description}
          </p>
        </div>
      ) : !canAssign ? (
        <div>
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="text-red-700">
            You don't have permission to assign roles
          </p>
        </div>
      ) : (
        <div>
          <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">
            Select a role first, then drag a user here
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Current Assignments Component
 */
function CurrentAssignments({
  assignments,
  canRevoke,
  onRevoke
}: {
  assignments: AdminAssignment[];
  canRevoke: boolean;
  onRevoke: (assignmentId: string, reason?: string) => Promise<void>;
}) {
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (assignmentId: string) => {
    setRevoking(assignmentId);
    try {
      await onRevoke(assignmentId, 'Revoked via admin interface');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">
        Current Assignments ({assignments.length})
      </h4>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {assignments.length > 0 ? (
          assignments.map(assignment => (
            <div
              key={assignment.id}
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {assignment.role.display_name}
                  </p>
                  {assignment.fandom_name && (
                    <p className="text-sm text-gray-600">
                      Fandom: {assignment.fandom_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Assigned {new Date(assignment.created_at).toLocaleDateString()}
                  </p>
                </div>

                {canRevoke && assignment.is_active && (
                  <button
                    onClick={() => handleRevoke(assignment.id)}
                    disabled={revoking === assignment.id}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    title="Revoke role"
                  >
                    {revoking === assignment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <Shield className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No assignments found</p>
          </div>
        )}
      </div>
    </div>
  );
}