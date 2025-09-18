/**
 * Validation Rules List Component
 *
 * Displays and manages validation rules with:
 * - Filterable and sortable table
 * - Role-based access control
 * - Quick actions (edit, delete, duplicate)
 * - Bulk operations
 * - Search and filtering
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  fandomId: string;
  fandomName: string;
  category: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  appliesTo: string[];
  conditionCount: number;
  actionCount: number;
}

interface FilterState {
  search: string;
  fandom: string;
  category: string;
  status: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'priority' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

const mockRules: ValidationRule[] = [
  {
    id: '1',
    name: 'Harry/Hermione Shipping Conflict',
    description:
      "Validates that Harry/Hermione pairing doesn't conflict with other romance tags",
    fandomId: 'hp',
    fandomName: 'Harry Potter',
    category: 'shipping',
    priority: 1,
    isActive: true,
    createdAt: '2025-09-15T10:30:00Z',
    updatedAt: '2025-09-16T14:20:00Z',
    createdBy: 'Alice Johnson',
    appliesTo: ['harry-shipping', 'hermione-shipping'],
    conditionCount: 3,
    actionCount: 2,
  },
  {
    id: '2',
    name: 'Time Travel Consistency Check',
    description: 'Ensures time travel plot blocks are logically consistent',
    fandomId: 'hp',
    fandomName: 'Harry Potter',
    category: 'plot-consistency',
    priority: 2,
    isActive: true,
    createdAt: '2025-09-14T09:15:00Z',
    updatedAt: '2025-09-14T09:15:00Z',
    createdBy: 'Bob Smith',
    appliesTo: ['time-travel', 'plot-blocks'],
    conditionCount: 5,
    actionCount: 3,
  },
  {
    id: '3',
    name: 'Character Death Warnings',
    description:
      'Warns about missing character death tags when death is implied',
    fandomId: 'hp',
    fandomName: 'Harry Potter',
    category: 'content-warnings',
    priority: 1,
    isActive: false,
    createdAt: '2025-09-13T16:45:00Z',
    updatedAt: '2025-09-17T11:30:00Z',
    createdBy: 'Carol Davis',
    appliesTo: ['character-tags', 'warning-tags'],
    conditionCount: 2,
    actionCount: 1,
  },
];

export default function ValidationRulesList() {
  const { data: session } = useSession();
  const [rules, setRules] = useState<ValidationRule[]>(mockRules);
  const [loading, setLoading] = useState(true);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    fandom: '',
    category: '',
    status: 'all',
    sortBy: 'priority',
    sortOrder: 'asc',
  });

  const userRole = (session?.user as any)?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin';

  useEffect(() => {
    // Simulate loading rules
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredRules = rules
    .filter(rule => {
      const matchesSearch =
        rule.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        rule.description.toLowerCase().includes(filters.search.toLowerCase());
      const matchesFandom = !filters.fandom || rule.fandomId === filters.fandom;
      const matchesCategory =
        !filters.category || rule.category === filters.category;
      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'active' && rule.isActive) ||
        (filters.status === 'inactive' && !rule.isActive);

      return matchesSearch && matchesFandom && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      const field = filters.sortBy;
      const order = filters.sortOrder === 'asc' ? 1 : -1;

      if (field === 'name') {
        return a.name.localeCompare(b.name) * order;
      } else if (field === 'priority') {
        return (a.priority - b.priority) * order;
      } else if (field === 'createdAt') {
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          order
        );
      } else if (field === 'updatedAt') {
        return (
          (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) *
          order
        );
      }
      return 0;
    });

  const handleSelectAll = () => {
    if (selectedRules.length === filteredRules.length) {
      setSelectedRules([]);
    } else {
      setSelectedRules(filteredRules.map(rule => rule.id));
    }
  };

  const handleSelectRule = (ruleId: string) => {
    setSelectedRules(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'delete') => {
    // Implementation would depend on API calls
    console.log(`Bulk ${action} for rules:`, selectedRules);
    setSelectedRules([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUniqueFandoms = () => {
    const fandoms = Array.from(
      new Set(rules.map(rule => ({ id: rule.fandomId, name: rule.fandomName })))
    );
    return fandoms;
  };

  const getUniqueCategories = () => {
    return Array.from(new Set(rules.map(rule => rule.category)));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-bold text-gray-900">
              Validation Rules
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage validation rules for your fandoms. Rules help ensure story
              pathways are logically consistent.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/admin/validation-rules/create"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Create Rule
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700"
              >
                Search
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search rules..."
                  value={filters.search}
                  onChange={e =>
                    setFilters(prev => ({ ...prev, search: e.target.value }))
                  }
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="fandom"
                className="block text-sm font-medium text-gray-700"
              >
                Fandom
              </label>
              <select
                id="fandom"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={filters.fandom}
                onChange={e =>
                  setFilters(prev => ({ ...prev, fandom: e.target.value }))
                }
              >
                <option value="">All Fandoms</option>
                {getUniqueFandoms().map(fandom => (
                  <option key={fandom.id} value={fandom.id}>
                    {fandom.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700"
              >
                Category
              </label>
              <select
                id="category"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={filters.category}
                onChange={e =>
                  setFilters(prev => ({ ...prev, category: e.target.value }))
                }
              >
                <option value="">All Categories</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={filters.status}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    status: e.target.value as FilterState['status'],
                  }))
                }
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sortBy"
                className="block text-sm font-medium text-gray-700"
              >
                Sort By
              </label>
              <select
                id="sortBy"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={e => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setFilters(prev => ({
                    ...prev,
                    sortBy: sortBy as FilterState['sortBy'],
                    sortOrder: sortOrder as FilterState['sortOrder'],
                  }));
                }}
              >
                <option value="priority-asc">Priority (Low to High)</option>
                <option value="priority-desc">Priority (High to Low)</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="updatedAt-desc">Recently Updated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedRules.length > 0 && (
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-indigo-700">
                {selectedRules.length} rule
                {selectedRules.length === 1 ? '' : 's'} selected
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                >
                  <CheckIcon className="-ml-1 mr-1 h-4 w-4" />
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
                >
                  <XMarkIcon className="-ml-1 mr-1 h-4 w-4" />
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                >
                  <TrashIcon className="-ml-1 mr-1 h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={
                      selectedRules.length === filteredRules.length &&
                      filteredRules.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rule
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fandom
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Priority
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Updated
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRules.map(rule => (
                <tr
                  key={rule.id}
                  className={
                    selectedRules.includes(rule.id) ? 'bg-gray-50' : undefined
                  }
                >
                  <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedRules.includes(rule.id)}
                      onChange={() => handleSelectRule(rule.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {rule.name}
                        </div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {rule.description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {rule.conditionCount} condition
                          {rule.conditionCount === 1 ? '' : 's'},{' '}
                          {rule.actionCount} action
                          {rule.actionCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.fandomName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.priority}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(rule.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/admin/validation-rules/${rule.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button className="text-gray-400 hover:text-gray-600">
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRules.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No rules found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.search ||
                filters.fandom ||
                filters.category ||
                filters.status !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by creating a new validation rule.'}
              </p>
              {!filters.search &&
                !filters.fandom &&
                !filters.category &&
                filters.status === 'all' && (
                  <div className="mt-6">
                    <Link
                      href="/admin/validation-rules/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <PlusIcon
                        className="-ml-1 mr-2 h-5 w-5"
                        aria-hidden="true"
                      />
                      Create Rule
                    </Link>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
