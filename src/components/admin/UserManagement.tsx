'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Users,
  Search,
  Filter,
  Download,
  UserPlus,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  UserX,
  User,
  Mail,
  Calendar,
  Activity,
  Globe,
  Lock,
  Unlock,
  Star,
  Award,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  FileText,
  Plus,
  X,
  Save,
  ArrowLeft,
  ArrowRight,
  Loader,
} from 'lucide-react';

// Types based on our admin system
interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  profileImageUrl?: string;
  lastSignInAt?: Date;
  createdAt: Date;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  roles: string[];
  permissions: string[];
  fandoms: string[];
  invitedBy?: string;
  invitedAt?: Date;
  stats: {
    totalLogins: number;
    lastActivity: Date;
    actionsThisMonth: number;
    storiesModerated: number;
  };
}

interface UserFilters {
  search: string;
  role: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  fandom: string;
  sortBy: 'name' | 'email' | 'lastActivity' | 'created' | 'role';
  sortOrder: 'asc' | 'desc';
  dateRange: {
    start?: Date;
    end?: Date;
  };
}

interface UserPermission {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  adminUsers: number;
  moderatorUsers: number;
  newUsersThisMonth: number;
  activityRate: number;
}

interface BulkOperation {
  type:
    | 'activate'
    | 'deactivate'
    | 'delete'
    | 'assignRole'
    | 'removeRole'
    | 'export';
  userIds: string[];
  roleId?: string;
}

interface UserEditModal {
  user: AdminUser;
  isOpen: boolean;
  mode: 'view' | 'edit' | 'permissions';
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    fandom: 'all',
    sortBy: 'lastActivity',
    sortOrder: 'desc',
    dateRange: {},
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(
    null
  );
  const [userModal, setUserModal] = useState<UserEditModal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableFandoms, setAvailableFandoms] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Load initial data
  useEffect(() => {
    loadUserData();
    loadPermissions();
    loadRoles();
    loadFandoms();
  }, []);

  // Filter and sort users when filters change
  useEffect(() => {
    applyFilters();
  }, [users, filters, currentPage, pageSize]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/users/stats'),
      ]);

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load user data');
      }

      const usersData = await usersResponse.json();
      const statsData = await statsResponse.json();

      setUsers(usersData.users || []);
      setUserStats(statsData.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadFandoms = async () => {
    try {
      const response = await fetch('/api/fandoms');
      if (response.ok) {
        const data = await response.json();
        setAvailableFandoms(data.fandoms?.map((f: any) => f.name) || []);
      }
    } catch (err) {
      console.error('Failed to load fandoms:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.roles.some(role => role.toLowerCase().includes(searchLower))
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.roles.includes(filters.role));
    }

    // Status filter
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter(user => user.isActive);
          break;
        case 'inactive':
          filtered = filtered.filter(user => !user.isActive);
          break;
        case 'pending':
          filtered = filtered.filter(
            user => user.invitedAt && !user.lastSignInAt
          );
          break;
      }
    }

    // Fandom filter
    if (filters.fandom !== 'all') {
      filtered = filtered.filter(user => user.fandoms.includes(filters.fandom));
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(user => {
        const userDate = new Date(user.createdAt);
        if (filters.dateRange.start && userDate < filters.dateRange.start)
          return false;
        if (filters.dateRange.end && userDate > filters.dateRange.end)
          return false;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.displayName;
          bValue = b.displayName;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'lastActivity':
          aValue = a.stats.lastActivity;
          bValue = b.stats.lastActivity;
          break;
        case 'created':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'role':
          aValue = a.roles[0] || '';
          bValue = b.roles[0] || '';
          break;
        default:
          aValue = a.displayName;
          bValue = b.displayName;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = filtered.slice(startIndex, endIndex);

    setFilteredUsers(paginatedUsers);
    setTotalPages(Math.ceil(filtered.length / pageSize));
  };

  const handleUserSelect = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation),
      });

      if (!response.ok) throw new Error('Bulk operation failed');

      await loadUserData();
      setSelectedUsers([]);
      setBulkOperation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (
    userId: string,
    action: string,
    data?: any
  ) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) throw new Error(`${action} failed`);

      await loadUserData();
      setUserModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = async (format: 'json' | 'csv' = 'csv') => {
    try {
      const userIds =
        selectedUsers.length > 0 ? selectedUsers : filteredUsers.map(u => u.id);
      const response = await fetch('/api/admin/users/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, format, filters }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${
        new Date().toISOString().split('T')[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const getStatusBadge = (user: AdminUser) => {
    if (!user.isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <UserX className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
    if (user.invitedAt && !user.lastSignInAt) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      admin:
        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'super-admin':
        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      moderator:
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'fandom-admin':
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          roleColors[role] ||
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}
      >
        <Shield className="w-3 h-3 mr-1" />
        {role}
      </span>
    );
  };

  if (loading && !users.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage admin users, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => (window.location.href = '/admin/users/invite')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </button>
      </div>

      {/* Stats Overview */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.totalUsers}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Users
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.activeUsers}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pending
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.pendingInvitations}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Activity Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.activityRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={filters.search}
                onChange={e =>
                  setFilters(prev => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Quick filters */}
          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={e =>
                setFilters(prev => ({ ...prev, status: e.target.value as any }))
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filters.role}
              onChange={e =>
                setFilters(prev => ({ ...prev, role: e.target.value }))
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fandom
                </label>
                <select
                  value={filters.fandom}
                  onChange={e =>
                    setFilters(prev => ({ ...prev, fandom: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Fandoms</option>
                  {availableFandoms.map(fandom => (
                    <option key={fandom} value={fandom}>
                      {fandom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      sortBy: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="lastActivity">Last Activity</option>
                  <option value="created">Created Date</option>
                  <option value="role">Role</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      sortOrder: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}{' '}
              selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleBulkOperation({
                    type: 'activate',
                    userIds: selectedUsers,
                  })
                }
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() =>
                  handleBulkOperation({
                    type: 'deactivate',
                    userIds: selectedUsers,
                  })
                }
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => exportUsers()}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={
                      selectedUsers.length === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stats
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map(user => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={e =>
                        handleUserSelect(user.id, e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.profileImageUrl ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={user.profileImageUrl}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(role => getRoleBadge(role))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(user.stats.lastActivity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="space-y-1">
                      <div>Logins: {user.stats.totalLogins}</div>
                      <div>Actions: {user.stats.actionsThisMonth}</div>
                      <div>Stories: {user.stats.storiesModerated}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setUserModal({ user, isOpen: true, mode: 'view' })
                        }
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setUserModal({ user, isOpen: true, mode: 'edit' })
                        }
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setUserModal({
                            user,
                            isOpen: true,
                            mode: 'permissions',
                          })
                        }
                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing page{' '}
                  <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="ml-4 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Details/Edit Modal */}
      {userModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {userModal.mode === 'view'
                  ? 'User Details'
                  : userModal.mode === 'edit'
                  ? 'Edit User'
                  : 'Manage Permissions'}
              </h3>
              <button
                onClick={() => setUserModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {userModal.mode === 'view' && (
                <UserDetailsView user={userModal.user} />
              )}
              {userModal.mode === 'edit' && (
                <UserEditForm
                  user={userModal.user}
                  onSave={data =>
                    handleUserAction(userModal.user.id, 'update', data)
                  }
                />
              )}
              {userModal.mode === 'permissions' && (
                <UserPermissionsForm
                  user={userModal.user}
                  permissions={permissions}
                  onSave={data =>
                    handleUserAction(
                      userModal.user.id,
                      'updatePermissions',
                      data
                    )
                  }
                />
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setUserModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              {userModal.mode !== 'view' && (
                <button
                  onClick={() => {
                    // Save logic handled in respective forms
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// User Details View Component
const UserDetailsView: React.FC<{ user: AdminUser }> = ({ user }) => {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Basic Information
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Display Name
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.displayName}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Email
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.email}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Created
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Last Sign In
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Security & Status
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Account Status
              </label>
              <p className="text-sm">
                {user.isActive ? '✅ Active' : '❌ Inactive'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Email Verified
              </label>
              <p className="text-sm">
                {user.emailVerified ? '✅ Verified' : '❌ Not Verified'}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Two-Factor Auth
              </label>
              <p className="text-sm">
                {user.twoFactorEnabled ? '✅ Enabled' : '❌ Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Roles and Permissions */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Roles & Permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Assigned Roles
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {user.roles.map(role => (
                <span
                  key={role}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Fandom Access
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {user.fandoms.map(fandom => (
                <span
                  key={fandom}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  {fandom}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Activity Statistics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.stats.totalLogins}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total Logins
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.stats.actionsThisMonth}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Actions This Month
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.stats.storiesModerated}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Stories Moderated
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.stats.lastActivity
                ? new Date(user.stats.lastActivity).toLocaleDateString()
                : 'Never'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last Activity
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Edit Form Component
const UserEditForm: React.FC<{
  user: AdminUser;
  onSave: (data: any) => void;
}> = ({ user, onSave }) => {
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    isActive: user.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={e =>
              setFormData(prev => ({ ...prev, displayName: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={e =>
              setFormData(prev => ({ ...prev, firstName: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={e =>
              setFormData(prev => ({ ...prev, lastName: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={e =>
              setFormData(prev => ({ ...prev, isActive: e.target.checked }))
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="isActive"
            className="ml-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Account Active
          </label>
        </div>
      </div>
    </form>
  );
};

// User Permissions Form Component
const UserPermissionsForm: React.FC<{
  user: AdminUser;
  permissions: UserPermission[];
  onSave: (data: any) => void;
}> = ({ user, permissions, onSave }) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    user.permissions
  );

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ permissions: selectedPermissions });
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, UserPermission[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(groupedPermissions).map(
          ([category, categoryPermissions]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 capitalize">
                {category} Permissions
              </h4>
              <div className="space-y-2">
                {categoryPermissions.map(permission => (
                  <label key={permission.id} className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                    />
                    <div className="ml-3">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {permission.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {permission.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </form>
  );
};

export default UserManagement;
