/**
 * Error Log Table Component
 * Feature: 003-optimize-the-platform
 *
 * Displays filterable error logs with expandable stack traces
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';

interface ErrorLog {
  id: number;
  timestamp: number;
  level: 'ERROR' | 'WARNING' | 'CRITICAL';
  category: string;
  message: string;
  stackTrace?: string;
  occurrenceCount: number;
  lastSeen: number;
}

interface ErrorLogTableProps {
  className?: string;
}

const ERROR_LEVELS = ['ALL', 'CRITICAL', 'ERROR', 'WARNING'] as const;
const ITEMS_PER_PAGE = 50;

export function ErrorLogTable({ className = '' }: ErrorLogTableProps) {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Available categories
  const [categories, setCategories] = useState<string[]>(['ALL']);

  // Fetch error logs
  const fetchErrors = async () => {
    try {
      setLoading(true);
      setError(null);

      const end = Math.floor(Date.now() / 1000);
      const start = end - 604800; // Last 7 days

      const params = new URLSearchParams({
        start: start.toString(),
        end: end.toString(),
        limit: '500', // Fetch more for client-side filtering
      });

      const response = await fetch(
        `/api/admin/performance/errors?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch errors');
      }

      const errorLogs: ErrorLog[] = data.data.errors;
      setErrors(errorLogs);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(errorLogs.map(e => e.category))
      );
      setCategories(['ALL', ...uniqueCategories]);
    } catch (err) {
      console.error('Error fetching error logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchErrors();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...errors];

    // Level filter
    if (levelFilter !== 'ALL') {
      filtered = filtered.filter(e => e.level === levelFilter);
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.message.toLowerCase().includes(search) ||
          e.category.toLowerCase().includes(search) ||
          e.stackTrace?.toLowerCase().includes(search)
      );
    }

    setFilteredErrors(filtered);
    setCurrentPage(1); // Reset to first page
  }, [errors, levelFilter, categoryFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredErrors.length / ITEMS_PER_PAGE);
  const paginatedErrors = filteredErrors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Toggle row expansion
  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get level badge color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'ERROR':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading && errors.length === 0) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6 ${className}`}
      >
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          Error Loading Logs
        </h3>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={fetchErrors}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 sm:mb-0">
          Error Logs ({filteredErrors.length})
        </h3>

        <button
          onClick={fetchErrors}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        >
          {ERROR_LEVELS.map(level => (
            <option key={level} value={level}>
              {level === 'ALL' ? 'All Levels' : level}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'ALL' ? 'All Categories' : cat}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search errors..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400"
        />
      </div>

      {/* Error Table */}
      <div className="overflow-x-auto">
        {paginatedErrors.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No errors found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedErrors.map(errorLog => (
                <>
                  <tr
                    key={errorLog.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(
                          errorLog.level
                        )}`}
                      >
                        {errorLog.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {errorLog.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">
                      {errorLog.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {errorLog.occurrenceCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatTimestamp(errorLog.lastSeen)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {errorLog.stackTrace && (
                        <button
                          onClick={() => toggleRow(errorLog.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {expandedRows.has(errorLog.id) ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(errorLog.id) && errorLog.stackTrace && (
                    <tr key={`${errorLog.id}-expanded`}>
                      <td
                        colSpan={6}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900"
                      >
                        <div className="text-sm">
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Stack Trace:
                          </p>
                          <pre className="bg-gray-800 dark:bg-black text-gray-100 dark:text-gray-300 p-4 rounded overflow-x-auto text-xs">
                            {errorLog.stackTrace}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredErrors.length)} of{' '}
            {filteredErrors.length} errors
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>

            <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
