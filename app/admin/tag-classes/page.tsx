/**
 * Tag Classes Management Page
 *
 * Interface for managing tag classes and validation rules:
 * - View existing tag classes by fandom
 * - Create and edit tag classes
 * - Configure validation rules for each class
 * - Manage class relationships and hierarchies
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  TagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface TagClass {
  id: string;
  name: string;
  description: string;
  fandom: string;
  fandomId: string;
  category: string;
  isActive: boolean;
  mutuallyExclusive: boolean;
  maxSelections: number | null;
  minSelections: number | null;
  validationRules: ValidationRule[];
  tags: string[];
  parentClass?: string;
  childClasses: string[];
  lastUpdated: string;
  createdBy: string;
  usageCount: number;
}

interface ValidationRule {
  id: string;
  type: 'required' | 'forbidden' | 'conditional' | 'warning';
  condition: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

const categories = [
  { id: 'all', name: 'All Categories' },
  { id: 'relationships', name: 'Relationships' },
  { id: 'setting', name: 'Setting' },
  { id: 'genre', name: 'Genre' },
  { id: 'character', name: 'Character' },
  { id: 'plot', name: 'Plot Elements' },
];

const severityColors = {
  error: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
};

const severityIcons = {
  error: ExclamationTriangleIcon,
  warning: ExclamationTriangleIcon,
  info: CheckCircleIcon,
};

export default function TagClasses() {
  const { user, isLoaded } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFandom, setSelectedFandom] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(
    new Set()
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  // API state management
  const [tagClasses, setTagClasses] = useState<TagClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fandoms, setFandoms] = useState([{ id: 'all', name: 'All Fandoms' }]);

  const userRole =
    (user?.publicMetadata?.role as 'ProjectAdmin' | 'FandomAdmin') || null;
  const userFandom = user?.publicMetadata?.fandom as string | undefined;

  // Fetch tag classes from API
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const fetchTagClasses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (selectedFandom !== 'all') {
          params.append('fandomId', selectedFandom);
        }
        if (selectedCategory !== 'all') {
          params.append('category', selectedCategory);
        }

        const response = await fetch(
          `/api/admin/tag-classes?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch tag classes');
        }

        const data = await response.json();

        if (data.success) {
          setTagClasses(data.data || []);

          // Extract unique fandoms for filter
          const uniqueFandoms = Array.from(
            new Set(data.data?.map((tc: TagClass) => tc.fandomId) || [])
          ).map(id => ({
            id: id as string,
            name:
              data.data?.find((tc: TagClass) => tc.fandomId === id)?.fandom ||
              (id as string),
          }));

          setFandoms([{ id: 'all', name: 'All Fandoms' }, ...uniqueFandoms]);
        } else {
          throw new Error(data.error || 'Failed to load tag classes');
        }
      } catch (err) {
        console.error('Error fetching tag classes:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTagClasses();
  }, [isLoaded, selectedFandom, selectedCategory]);

  const filteredTagClasses = useMemo(() => {
    return tagClasses.filter(tagClass => {
      const matchesSearch =
        tagClass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tagClass.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tagClass.tags.some(tag =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesFandom =
        selectedFandom === 'all' || tagClass.fandomId === selectedFandom;

      const matchesCategory =
        selectedCategory === 'all' || tagClass.category === selectedCategory;

      // FandomAdmin can only see their fandom's classes
      const hasPermission =
        userRole === 'ProjectAdmin' ||
        (userRole === 'FandomAdmin' && tagClass.fandomId === userFandom);

      return matchesSearch && matchesFandom && matchesCategory && hasPermission;
    });
  }, [
    searchTerm,
    selectedFandom,
    selectedCategory,
    userRole,
    userFandom,
    tagClasses,
  ]);

  const toggleExpanded = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  const handleDeleteClass = async (tagClass: TagClass) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${tagClass.name}"? This will affect ${tagClass.usageCount} stories.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tag-classes/${tagClass.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag class');
      }

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setTagClasses(prev => prev.filter(tc => tc.id !== tagClass.id));
      } else {
        throw new Error(data.error || 'Failed to delete tag class');
      }
    } catch (err) {
      console.error('Error deleting tag class:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete tag class');
    }
  };

  const handleToggleActive = async (tagClass: TagClass) => {
    try {
      const response = await fetch(`/api/admin/tag-classes/${tagClass.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !tagClass.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tag class');
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setTagClasses(prev =>
          prev.map(tc =>
            tc.id === tagClass.id ? { ...tc, isActive: !tc.isActive } : tc
          )
        );
      } else {
        throw new Error(data.error || 'Failed to update tag class');
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update tag class');
    }
  };

  const renderValidationRules = (rules: ValidationRule[]) => {
    if (rules.length === 0) {
      return (
        <p className="text-sm text-gray-500 italic">No validation rules</p>
      );
    }

    return (
      <div className="space-y-2">
        {rules.map(rule => {
          const SeverityIcon = severityIcons[rule.severity];
          return (
            <div
              key={rule.id}
              className="flex items-start space-x-2 p-2 bg-gray-50 rounded"
            >
              <SeverityIcon className="w-4 h-4 mt-0.5 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {rule.type}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      severityColors[rule.severity]
                    }`}
                  >
                    {rule.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{rule.message}</p>
                <code className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                  {rule.condition}
                </code>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <TagIcon className="w-8 h-8 mr-3 text-indigo-600" />
            Tag Classes
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage tag classification systems and validation rules for your
            fandoms.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Tag Class
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-sm text-gray-600">Loading tag classes...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading tag classes
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm font-medium text-red-800 hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content - only show when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Search and Filters */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tag classes..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {userRole === 'ProjectAdmin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fandom
                  </label>
                  <select
                    value={selectedFandom}
                    onChange={e => setSelectedFandom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {fandoms.map(fandom => (
                      <option key={fandom.id} value={fandom.id}>
                        {fandom.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tag Classes List */}
          <div className="space-y-4">
            {filteredTagClasses.map(tagClass => {
              const isExpanded = expandedClasses.has(tagClass.id);

              return (
                <div key={tagClass.id} className="bg-white shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleExpanded(tagClass.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="w-5 h-5" />
                            ) : (
                              <ChevronRightIcon className="w-5 h-5" />
                            )}
                          </button>
                          <h3 className="text-lg font-medium text-gray-900">
                            {tagClass.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {!tagClass.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inactive
                              </span>
                            )}
                            {tagClass.mutuallyExclusive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Exclusive
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {tagClass.category}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {tagClass.description}
                        </p>

                        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{tagClass.fandom}</span>
                          <span>•</span>
                          <span>{tagClass.tags.length} tags</span>
                          <span>•</span>
                          <span>{tagClass.usageCount} uses</span>
                          <span>•</span>
                          <span>Updated {tagClass.lastUpdated}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(tagClass)}
                          className={`inline-flex items-center px-3 py-1 border text-sm font-medium rounded-md ${
                            tagClass.isActive
                              ? 'border-red-300 text-red-700 bg-white hover:bg-red-50'
                              : 'border-green-300 text-green-700 bg-white hover:bg-green-50'
                          }`}
                        >
                          {tagClass.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          <EyeIcon className="w-4 h-4 mr-1" />
                          View
                        </button>
                        {userRole === 'ProjectAdmin' && (
                          <button
                            onClick={() => handleDeleteClass(tagClass)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Configuration
                            </h4>
                            <dl className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <dt className="text-gray-500">
                                  Max Selections:
                                </dt>
                                <dd className="text-gray-900">
                                  {tagClass.maxSelections || 'Unlimited'}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">
                                  Min Selections:
                                </dt>
                                <dd className="text-gray-900">
                                  {tagClass.minSelections || 'None'}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">
                                  Mutually Exclusive:
                                </dt>
                                <dd className="text-gray-900">
                                  {tagClass.mutuallyExclusive ? 'Yes' : 'No'}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500">
                                  Validation Rules:
                                </dt>
                                <dd className="text-gray-900">
                                  {tagClass.validationRules.length}
                                </dd>
                              </div>
                            </dl>

                            <div className="mt-4">
                              <h5 className="text-sm font-medium text-gray-900 mb-2">
                                Tags ({tagClass.tags.length})
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {tagClass.tags.slice(0, 10).map(tag => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {tagClass.tags.length > 10 && (
                                  <span className="text-xs text-gray-500">
                                    +{tagClass.tags.length - 10} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Validation Rules
                            </h4>
                            {renderValidationRules(tagClass.validationRules)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTagClasses.length === 0 && (
            <div className="text-center py-12">
              <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No tag classes found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria or create a new tag class.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Tag Class
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
