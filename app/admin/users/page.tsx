/**
 * User Management Page
 *
 * Interface for managing users and their roles (ProjectAdmin only):
 * - View all users with filtering and search
 * - Assign and modify user roles
 * - Manage fandom permissions for FandomAdmin users
 * - User activity monitoring and account management
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import ProtectedAdminLayout, {
  PermissionGate,
} from '@/components/admin/ProtectedAdminLayout';
import NewUserManagement from '@/components/admin/UserManagement';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'User' | 'FandomAdmin' | 'ProjectAdmin';
  fandom?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin: string;
  joinDate: string;
  activityLevel: 'high' | 'medium' | 'low';
  contributions: {
    storiesSubmitted: number;
    rulesCreated: number;
    tagsCreated: number;
  };
  permissions: string[];
}

// Mock users data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@example.com',
    role: 'ProjectAdmin',
    isActive: true,
    isVerified: true,
    lastLogin: '2024-01-20T10:30:00Z',
    joinDate: '2023-06-15T09:00:00Z',
    activityLevel: 'high',
    contributions: {
      storiesSubmitted: 45,
      rulesCreated: 12,
      tagsCreated: 89,
    },
    permissions: [
      'manage-users',
      'manage-fandoms',
      'manage-rules',
      'manage-tags',
      'system-admin',
    ],
  },
  {
    id: '2',
    name: 'Alex Potter-Fan',
    email: 'alex.hp@example.com',
    role: 'FandomAdmin',
    fandom: 'Harry Potter',
    isActive: true,
    isVerified: true,
    lastLogin: '2024-01-19T15:45:00Z',
    joinDate: '2023-08-22T14:20:00Z',
    activityLevel: 'high',
    contributions: {
      storiesSubmitted: 23,
      rulesCreated: 8,
      tagsCreated: 34,
    },
    permissions: [
      'manage-fandom-rules',
      'manage-fandom-tags',
      'moderate-submissions',
    ],
  },
  {
    id: '3',
    name: 'Morgan Jackson',
    email: 'morgan.pj@example.com',
    role: 'FandomAdmin',
    fandom: 'Percy Jackson',
    isActive: true,
    isVerified: true,
    lastLogin: '2024-01-18T09:15:00Z',
    joinDate: '2023-09-10T11:30:00Z',
    activityLevel: 'medium',
    contributions: {
      storiesSubmitted: 15,
      rulesCreated: 4,
      tagsCreated: 18,
    },
    permissions: [
      'manage-fandom-rules',
      'manage-fandom-tags',
      'moderate-submissions',
    ],
  },
  {
    id: '4',
    name: 'Emily Reader',
    email: 'emily.reader@example.com',
    role: 'User',
    isActive: true,
    isVerified: true,
    lastLogin: '2024-01-17T20:00:00Z',
    joinDate: '2023-11-05T16:45:00Z',
    activityLevel: 'medium',
    contributions: {
      storiesSubmitted: 8,
      rulesCreated: 0,
      tagsCreated: 2,
    },
    permissions: ['submit-stories', 'create-pathways'],
  },
  {
    id: '5',
    name: 'Chris Inactive',
    email: 'chris.old@example.com',
    role: 'User',
    isActive: false,
    isVerified: true,
    lastLogin: '2023-12-01T10:00:00Z',
    joinDate: '2023-07-01T12:00:00Z',
    activityLevel: 'low',
    contributions: {
      storiesSubmitted: 2,
      rulesCreated: 0,
      tagsCreated: 0,
    },
    permissions: ['submit-stories', 'create-pathways'],
  },
  {
    id: '6',
    name: 'Pat Unverified',
    email: 'pat.new@example.com',
    role: 'User',
    isActive: true,
    isVerified: false,
    lastLogin: '2024-01-19T12:30:00Z',
    joinDate: '2024-01-15T10:00:00Z',
    activityLevel: 'low',
    contributions: {
      storiesSubmitted: 0,
      rulesCreated: 0,
      tagsCreated: 0,
    },
    permissions: ['create-pathways'],
  },
];

const roles = [
  {
    id: 'User',
    name: 'User',
    description: 'Basic user with story submission rights',
  },
  {
    id: 'FandomAdmin',
    name: 'Fandom Admin',
    description: 'Manages specific fandom content and rules',
  },
  {
    id: 'ProjectAdmin',
    name: 'Project Admin',
    description: 'Full system administration access',
  },
];

const fandoms = [
  { id: 'harry-potter', name: 'Harry Potter' },
  { id: 'percy-jackson', name: 'Percy Jackson' },
  { id: 'naruto', name: 'Naruto' },
];

const activityColors = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
};

const roleColors = {
  User: 'bg-gray-100 text-gray-800',
  FandomAdmin: 'bg-blue-100 text-blue-800',
  ProjectAdmin: 'bg-purple-100 text-purple-800',
};

export default function UserManagement() {
  const { user, isLoaded } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedFandom, setSelectedFandom] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const userRole = (user as any)?.role as 'ProjectAdmin' | 'FandomAdmin';

  const filteredUsers = useMemo(() => {
    return mockUsers.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = selectedRole === 'all' || user.role === selectedRole;

      const matchesFandom =
        selectedFandom === 'all' ||
        (user.fandom &&
          user.fandom.toLowerCase().replace(' ', '-') === selectedFandom);

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && user.isActive) ||
        (selectedStatus === 'inactive' && !user.isActive);

      return matchesSearch && matchesRole && matchesFandom && matchesStatus;
    });
  }, [searchTerm, selectedRole, selectedFandom, selectedStatus]);

  // Only ProjectAdmin can access this page
  if (userRole !== 'ProjectAdmin') {
    return (
      <ProtectedAdminLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Access Denied
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Only Project Administrators can access user management.
          </p>
        </div>
      </ProtectedAdminLayout>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRoleChange = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleToggleActive = (user: User) => {
    if (
      window.confirm(
        `Are you sure you want to ${
          user.isActive ? 'deactivate' : 'activate'
        } ${user.name}?`
      )
    ) {
      console.log(`Toggling active status for user: ${user.id}`);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${user.name}? This action cannot be undone.`
      )
    ) {
      console.log(`Deleting user: ${user.id}`);
    }
  };

  const renderRoleModal = () => {
    if (!showRoleModal || !selectedUser) {
      return null;
    }

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Edit User Role
            </h3>
            <button
              onClick={() => setShowRoleModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <p className="text-sm text-gray-900">
                {selectedUser.name} ({selectedUser.email})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                defaultValue={selectedUser.role}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {roles.find(r => r.id === selectedUser.role)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fandom (for Fandom Admin)
              </label>
              <select
                defaultValue={selectedUser.fandom || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">No specific fandom</option>
                {fandoms.map(fandom => (
                  <option key={fandom.id} value={fandom.name}>
                    {fandom.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('Updating user role:', selectedUser.id);
                  setShowRoleModal(false);
                }}
                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedAdminLayout
      title="User Management"
      requiredPermission="canViewUsers"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <UsersIcon className="w-8 h-8 mr-3 text-indigo-600" />
              User Management
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage user accounts, roles, and permissions across the platform.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Invite User
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fandom
              </label>
              <select
                value={selectedFandom}
                onChange={e => setSelectedFandom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Fandoms</option>
                <option value="no-fandom">No Fandom</option>
                {fandoms.map(fandom => (
                  <option key={fandom.id} value={fandom.id}>
                    {fandom.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Users ({filteredUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Fandom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contributions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            roleColors[user.role]
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.fandom && (
                          <div className="text-xs text-gray-500">
                            {user.fandom}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {user.isActive ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircleIcon className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm text-gray-900">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {user.isVerified ? (
                            <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="text-sm text-gray-500">
                            {user.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            activityColors[user.activityLevel]
                          }`}
                        >
                          {user.activityLevel}
                        </span>
                        <div className="text-xs text-gray-500 flex items-center">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {formatDate(user.lastLogin)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>{user.contributions.storiesSubmitted} stories</div>
                        <div>{user.contributions.rulesCreated} rules</div>
                        <div>{user.contributions.tagsCreated} tags</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.joinDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleRoleChange(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`${
                            user.isActive
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {user.isActive ? (
                            <XCircleIcon className="w-4 h-4" />
                          ) : (
                            <CheckCircleIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No users found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria.
            </p>
          </div>
        )}

        {renderRoleModal()}
      </div>
    </ProtectedAdminLayout>
  );
}
