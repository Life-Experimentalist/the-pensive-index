/**
 * Audit Log Viewer UI Component
 *
 * Interactive React component for viewing and analyzing admin audit logs.
 * Features advanced filtering, search, export, and real-time updates.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  TrendingUp,
  BarChart3,
  Shield,
  Settings,
  Database,
  Zap,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Loader2,
} from 'lucide-react';

// Types
interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  fandom_id?: string;
  fandom_name?: string;
  created_at: string;
}

interface AuditLogStats {
  total_actions: number;
  successful_actions: number;
  failed_actions: number;
  unique_users: number;
  actions_by_type: Record<string, number>;
  actions_by_day: Array<{ date: string; count: number }>;
  top_users: Array<{ user_email: string; count: number }>;
  recent_failures: number;
}

interface FilterOptions {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  fandom_id?: string;
  success?: boolean;
  start_date?: Date;
  end_date?: Date;
}

interface AuditLogViewerProps {
  className?: string;
  fandom_id?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Constants
const ACTION_TYPES = [
  {
    value: 'user:login',
    label: 'User Login',
    icon: User,
    color: 'text-blue-600',
  },
  {
    value: 'user:logout',
    label: 'User Logout',
    icon: User,
    color: 'text-gray-600',
  },
  {
    value: 'role:assign',
    label: 'Role Assignment',
    icon: Shield,
    color: 'text-green-600',
  },
  {
    value: 'role:revoke',
    label: 'Role Revocation',
    icon: Shield,
    color: 'text-red-600',
  },
  {
    value: 'invitation:send',
    label: 'Invitation Sent',
    icon: Activity,
    color: 'text-purple-600',
  },
  {
    value: 'invitation:accept',
    label: 'Invitation Accepted',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  {
    value: 'invitation:reject',
    label: 'Invitation Rejected',
    icon: X,
    color: 'text-red-600',
  },
  {
    value: 'fandom:create',
    label: 'Fandom Created',
    icon: Database,
    color: 'text-blue-600',
  },
  {
    value: 'fandom:update',
    label: 'Fandom Updated',
    icon: Settings,
    color: 'text-yellow-600',
  },
  {
    value: 'user:update',
    label: 'User Updated',
    icon: User,
    color: 'text-blue-600',
  },
  {
    value: 'user:deactivate',
    label: 'User Deactivated',
    icon: User,
    color: 'text-red-600',
  },
  {
    value: 'validation:rule',
    label: 'Validation Rule',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  {
    value: 'admin:action',
    label: 'Admin Action',
    icon: Shield,
    color: 'text-purple-600',
  },
];

const RESOURCE_TYPES = [
  { value: 'admin_user', label: 'Admin User', icon: User },
  { value: 'admin_assignment', label: 'Admin Assignment', icon: Shield },
  { value: 'admin_invitation', label: 'Admin Invitation', icon: Activity },
  { value: 'fandom', label: 'Fandom', icon: Database },
  { value: 'validation_rule', label: 'Validation Rule', icon: CheckCircle },
  { value: 'system', label: 'System', icon: Settings },
];

/**
 * Main Audit Log Viewer Component
 */
export default function AuditLogViewer({
  className = '',
  fandom_id,
  autoRefresh = false,
  refreshInterval = 30000,
}: AuditLogViewerProps) {
  const { user } = useUser();

  // State management
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'action' | 'user_email'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Permission states
  const [canViewLogs, setCanViewLogs] = useState(false);
  const [canExportLogs, setCanExportLogs] = useState(false);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      loadAuditLogs(false); // Load without showing loading state
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, filters, searchTerm]);

  // Load data on mount and filter changes
  useEffect(() => {
    if (user?.id) {
      checkPermissions();
      loadAuditLogs();
      if (showStats) {
        loadAuditStats();
      }
    }
  }, [user?.id, filters, searchTerm, sortBy, sortOrder, currentPage, pageSize]);

  /**
   * Check user permissions
   */
  const checkPermissions = async () => {
    if (!user?.id) {
      return;
    }

    try {
      const [viewResponse, exportResponse] = await Promise.all([
        fetch(
          `/api/admin/users?action=permissions&user_id=${
            user.id
          }&permission=audit:view${fandom_id ? `&fandom_id=${fandom_id}` : ''}`
        ),
        fetch(
          `/api/admin/users?action=permissions&user_id=${
            user.id
          }&permission=audit:export${
            fandom_id ? `&fandom_id=${fandom_id}` : ''
          }`
        ),
      ]);

      const viewData = await viewResponse.json();
      const exportData = await exportResponse.json();

      setCanViewLogs(viewData.permission_check?.has_permission || false);
      setCanExportLogs(exportData.permission_check?.has_permission || false);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  /**
   * Load audit logs
   */
  const loadAuditLogs = async (showLoading = true) => {
    if (!canViewLogs && showLoading) {
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();

      // Add filters
      if (filters.user_id) {
        params.append('user_id', filters.user_id);
      }
      if (filters.action) {
        params.append('action', filters.action);
      }
      if (filters.resource_type) {
        params.append('resource_type', filters.resource_type);
      }
      if (filters.resource_id) {
        params.append('resource_id', filters.resource_id);
      }
      if (filters.fandom_id) {
        params.append('fandom_id', filters.fandom_id);
      }
      if (filters.success !== undefined) {
        params.append('success', filters.success.toString());
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date.toISOString());
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date.toISOString());
      }

      // Add search if present
      if (searchTerm) {
        params.append('action', 'search');
        params.append('search_term', searchTerm);
      }

      // Add pagination and sorting
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());

      const response = await fetch(
        `/api/admin/audit-logs?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs || []);
      } else {
        console.error('Error loading audit logs:', data.error);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  /**
   * Load audit statistics
   */
  const loadAuditStats = async () => {
    try {
      const params = new URLSearchParams();
      params.append('action', 'stats');

      if (fandom_id) {
        params.append('fandom_id', fandom_id);
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date.toISOString());
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date.toISOString());
      }

      const response = await fetch(
        `/api/admin/audit-logs?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading audit stats:', error);
    }
  };

  /**
   * Handle export
   */
  const handleExport = async (format: 'json' | 'csv') => {
    if (!canExportLogs) {
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'export');
      params.append('format', format);

      // Add current filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      if (searchTerm) {
        params.append('search_term', searchTerm);
      }

      const response = await fetch(
        `/api/admin/audit-logs?${params.toString()}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${
          new Date().toISOString().split('T')[0]
        }.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        console.error('Export failed:', error);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Toggle log expansion
   */
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  /**
   * Update filters
   */
  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  if (!canViewLogs) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600">
            You don't have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading audit logs...</span>
      </div>
    );
  }

  return (
    <div
      className={`audit-log-viewer bg-white rounded-lg shadow-sm border ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Audit Log Viewer
              {fandom_id && (
                <span className="ml-2 text-sm text-gray-500">
                  • Fandom Specific
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor and analyze admin activities and system events
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-3 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>

            {canExportLogs && (
              <div className="relative">
                <ExportDropdown
                  onExport={handleExport}
                  isExporting={isExporting}
                />
              </div>
            )}

            <button
              onClick={() => loadAuditLogs()}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {showStats && stats && <AuditStatsPanel stats={stats} />}

      {/* Filters */}
      {showFilters && (
        <AuditFiltersPanel
          filters={filters}
          searchTerm={searchTerm}
          onFiltersChange={updateFilters}
          onSearchChange={setSearchTerm}
          onClearFilters={clearFilters}
        />
      )}

      {/* Search and Quick Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs by action, user, resource..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick filters */}
          <QuickFilters filters={filters} onFiltersChange={updateFilters} />

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
            <option value="action-asc">Action A-Z</option>
            <option value="action-desc">Action Z-A</option>
            <option value="user_email-asc">User A-Z</option>
            <option value="user_email-desc">User Z-A</option>
          </select>
        </div>

        {/* Active filters display */}
        <ActiveFiltersDisplay
          filters={filters}
          searchTerm={searchTerm}
          onRemoveFilter={key => updateFilters({ [key]: undefined })}
          onClearSearch={() => setSearchTerm('')}
        />
      </div>

      {/* Logs List */}
      <div className="divide-y divide-gray-200">
        {logs.length > 0 ? (
          logs.map(log => (
            <AuditLogRow
              key={log.id}
              log={log}
              isExpanded={expandedLogs.has(log.id)}
              onToggleExpansion={() => toggleLogExpansion(log.id)}
              onViewDetails={() => setSelectedLog(log)}
            />
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No audit logs found</p>
            <p className="text-sm">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Try adjusting your search criteria or filters'
                : 'No audit logs available for the selected time period'}
            </p>
            {(searchTerm || Object.keys(filters).length > 0) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, logs.length)} of {logs.length}{' '}
            logs
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-gray-700">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={logs.length < pageSize}
              className="px-3 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

/**
 * Audit Statistics Panel Component
 */
function AuditStatsPanel({ stats }: { stats: AuditLogStats }) {
  const successRate =
    stats.total_actions > 0
      ? ((stats.successful_actions / stats.total_actions) * 100).toFixed(1)
      : '0';

  return (
    <div className="p-6 bg-gray-50 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2" />
        Audit Statistics
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Actions"
          value={stats.total_actions.toLocaleString()}
          icon={Activity}
          color="text-blue-600"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          title="Recent Failures"
          value={stats.recent_failures.toString()}
          icon={AlertCircle}
          color="text-red-600"
        />
        <StatCard
          title="Active Users"
          value={stats.unique_users.toString()}
          icon={User}
          color="text-purple-600"
        />
      </div>

      {/* Top Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Top Actions
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.actions_by_type)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([action, count]) => {
                const actionType = ACTION_TYPES.find(t => t.value === action);
                return (
                  <div
                    key={action}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      {actionType && (
                        <actionType.icon
                          className={`w-4 h-4 ${actionType.color}`}
                        />
                      )}
                      <span className="text-sm text-gray-900">
                        {actionType?.label || action}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Most Active Users
          </h4>
          <div className="space-y-2">
            {stats.top_users.slice(0, 5).map((user, index) => (
              <div
                key={user.user_email}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900">
                    {user.user_email}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {user.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </div>
  );
}

/**
 * Audit Filters Panel Component
 */
function AuditFiltersPanel({
  filters,
  searchTerm,
  onFiltersChange,
  onSearchChange,
  onClearFilters,
}: {
  filters: FilterOptions;
  searchTerm: string;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="p-4 border-b border-gray-200 bg-blue-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Advanced Filters</h4>
        <button
          onClick={onClearFilters}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Action Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action Type
          </label>
          <select
            value={filters.action || ''}
            onChange={e =>
              onFiltersChange({ action: e.target.value || undefined })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map(action => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>

        {/* Resource Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resource Type
          </label>
          <select
            value={filters.resource_type || ''}
            onChange={e =>
              onFiltersChange({ resource_type: e.target.value || undefined })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Resources</option>
            {RESOURCE_TYPES.map(resource => (
              <option key={resource.value} value={resource.value}>
                {resource.label}
              </option>
            ))}
          </select>
        </div>

        {/* Success Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={
              filters.success === undefined ? '' : filters.success.toString()
            }
            onChange={e =>
              onFiltersChange({
                success:
                  e.target.value === '' ? undefined : e.target.value === 'true',
              })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">Successful</option>
            <option value="false">Failed</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={
              filters.start_date
                ? filters.start_date.toISOString().split('T')[0]
                : ''
            }
            onChange={e =>
              onFiltersChange({
                start_date: e.target.value
                  ? new Date(e.target.value)
                  : undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={
              filters.end_date
                ? filters.end_date.toISOString().split('T')[0]
                : ''
            }
            onChange={e =>
              onFiltersChange({
                end_date: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Resource ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resource ID
          </label>
          <input
            type="text"
            placeholder="Enter resource ID..."
            value={filters.resource_id || ''}
            onChange={e =>
              onFiltersChange({ resource_id: e.target.value || undefined })
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Filters Component
 */
function QuickFilters({
  filters,
  onFiltersChange,
}: {
  filters: FilterOptions;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onFiltersChange({ success: true })}
        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
          filters.success === true
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Successful
      </button>
      <button
        onClick={() => onFiltersChange({ success: false })}
        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
          filters.success === false
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Failed
      </button>
      <button
        onClick={() =>
          onFiltersChange({
            start_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          })
        }
        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
          filters.start_date &&
          filters.start_date > new Date(Date.now() - 25 * 60 * 60 * 1000)
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Last 24h
      </button>
    </div>
  );
}

/**
 * Active Filters Display Component
 */
function ActiveFiltersDisplay({
  filters,
  searchTerm,
  onRemoveFilter,
  onClearSearch,
}: {
  filters: FilterOptions;
  searchTerm: string;
  onRemoveFilter: (key: string) => void;
  onClearSearch: () => void;
}) {
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => value !== undefined
  );

  if (activeFilters.length === 0 && !searchTerm) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">Active filters:</span>

      {searchTerm && (
        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg">
          Search: "{searchTerm}"
          <button
            onClick={onClearSearch}
            className="ml-1 text-blue-600 hover:text-blue-800"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {activeFilters.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-lg"
        >
          {key}:{' '}
          {value instanceof Date ? value.toLocaleDateString() : String(value)}
          <button
            onClick={() => onRemoveFilter(key)}
            className="ml-1 text-gray-600 hover:text-gray-800"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

/**
 * Individual Audit Log Row Component
 */
function AuditLogRow({
  log,
  isExpanded,
  onToggleExpansion,
  onViewDetails,
}: {
  log: AuditLogEntry;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onViewDetails: () => void;
}) {
  const actionType = ACTION_TYPES.find(a => a.value === log.action);
  const ActionIcon = actionType?.icon || Activity;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Status icon */}
          <div
            className={`p-2 rounded-lg ${
              log.success
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {log.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>

          {/* Action icon */}
          <div
            className={`p-2 rounded-lg bg-gray-100 ${
              actionType?.color || 'text-gray-600'
            }`}
          >
            <ActionIcon className="w-4 h-4" />
          </div>

          {/* Log details */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {actionType?.label || log.action}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-600">{log.user_email}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-600">{log.resource_type}</span>
              {log.fandom_name && (
                <>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">
                    {log.fandom_name}
                  </span>
                </>
              )}
            </div>

            <div className="text-sm text-gray-500 mt-1">
              {new Date(log.created_at).toLocaleString()}
              {log.error_message && (
                <span className="ml-2 text-red-600">• {log.error_message}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onViewDetails}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleExpansion}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 ml-11 bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Resource ID:</strong> {log.resource_id}
            </div>
            <div>
              <strong>User ID:</strong> {log.user_id}
            </div>
            {log.ip_address && (
              <div>
                <strong>IP Address:</strong> {log.ip_address}
              </div>
            )}
            {log.user_agent && (
              <div className="md:col-span-2">
                <strong>User Agent:</strong> {log.user_agent}
              </div>
            )}
          </div>

          {Object.keys(log.details).length > 0 && (
            <div className="mt-4">
              <strong className="text-sm">Details:</strong>
              <pre className="mt-2 text-xs bg-white p-3 border border-gray-200 rounded overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Export Dropdown Component
 */
function ExportDropdown({
  onExport,
  isExporting,
}: {
  onExport: (format: 'json' | 'csv') => void;
  isExporting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        Export
        <ChevronDown className="w-4 h-4 ml-1" />
      </button>

      {isOpen && !isExporting && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <button
            onClick={() => {
              onExport('json');
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
          >
            Export JSON
          </button>
          <button
            onClick={() => {
              onExport('csv');
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
          >
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Log Details Modal Component
 */
function LogDetailsModal({
  log,
  onClose,
}: {
  log: AuditLogEntry;
  onClose: () => void;
}) {
  const actionType = ACTION_TYPES.find(a => a.value === log.action);
  const ActionIcon = actionType?.icon || Activity;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could show toast notification here
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                log.success
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {log.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Audit Log Details
              </h3>
              <p className="text-sm text-gray-600">
                {actionType?.label || log.action} •{' '}
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Basic Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-mono">{log.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Action:</span>
                  <span>{actionType?.label || log.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">User:</span>
                  <span>{log.user_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resource Type:</span>
                  <span>{log.resource_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resource ID:</span>
                  <span className="font-mono">{log.resource_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={log.success ? 'text-green-600' : 'text-red-600'}
                  >
                    {log.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Timestamp:</span>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Technical Information */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Technical Information
              </h4>
              <div className="space-y-2 text-sm">
                {log.ip_address && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IP Address:</span>
                    <span className="font-mono">{log.ip_address}</span>
                  </div>
                )}
                {log.fandom_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fandom:</span>
                    <span>{log.fandom_name || log.fandom_id}</span>
                  </div>
                )}
                {log.error_message && (
                  <div>
                    <span className="text-gray-600">Error:</span>
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-800">
                      {log.error_message}
                    </div>
                  </div>
                )}
                {log.user_agent && (
                  <div>
                    <span className="text-gray-600">User Agent:</span>
                    <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs break-all">
                      {log.user_agent}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          {Object.keys(log.details).length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Event Details</h4>
                <button
                  onClick={() =>
                    copyToClipboard(JSON.stringify(log.details, null, 2))
                  }
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy JSON
                </button>
              </div>
              <pre className="text-xs bg-gray-50 p-4 border border-gray-200 rounded overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
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
