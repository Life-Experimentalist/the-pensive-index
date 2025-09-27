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

import React, { useState, useMemo } from 'react';
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

// Mock data
const mockTagClasses: TagClass[] = [
  {
    id: '1',
    name: 'harry-shipping',
    description: 'Romantic pairings involving Harry Potter',
    fandom: 'Harry Potter',
    category: 'relationships',
    isActive: true,
    mutuallyExclusive: true,
    maxSelections: 1,
    minSelections: null,
    validationRules: [
      {
        id: 'r1',
        type: 'conditional',
        condition: 'age < 14',
        message: 'Romantic relationships require age-appropriate tags',
        severity: 'warning',
      },
      {
        id: 'r2',
        type: 'forbidden',
        condition: 'contains(adult-content) && age < 17',
        message: 'Adult content not allowed for underage characters',
        severity: 'error',
      },
    ],
    tags: [
      'harry/hermione',
      'harry/ginny',
      'harry/luna',
      'harry/cho',
      'harry/daphne',
    ],
    childClasses: ['harry-het-shipping', 'harry-slash-shipping'],
    lastUpdated: '2024-01-15',
    createdBy: 'admin',
    usageCount: 1247,
  },
  {
    id: '2',
    name: 'hermione-shipping',
    description: 'Romantic pairings involving Hermione Granger',
    fandom: 'Harry Potter',
    category: 'relationships',
    isActive: true,
    mutuallyExclusive: true,
    maxSelections: 1,
    minSelections: null,
    validationRules: [
      {
        id: 'r3',
        type: 'conditional',
        condition: 'age < 14',
        message: 'Romantic relationships require age-appropriate content',
        severity: 'warning',
      },
    ],
    tags: [
      'hermione/harry',
      'hermione/ron',
      'hermione/draco',
      'hermione/viktor',
    ],
    childClasses: [],
    lastUpdated: '2024-01-12',
    createdBy: 'admin',
    usageCount: 892,
  },
  {
    id: '3',
    name: 'time-period',
    description: 'Story timeline and era settings',
    fandom: 'Harry Potter',
    category: 'setting',
    isActive: true,
    mutuallyExclusive: false,
    maxSelections: 2,
    minSelections: 1,
    validationRules: [
      {
        id: 'r4',
        type: 'required',
        condition: 'always',
        message: 'At least one time period must be selected',
        severity: 'error',
      },
      {
        id: 'r5',
        type: 'conditional',
        condition: 'contains(founders-era) && contains(modern-era)',
        message: 'Time travel story detected - verify consistency',
        severity: 'warning',
      },
    ],
    tags: [
      'founders-era',
      'marauders-era',
      'hogwarts-era',
      'post-war',
      'next-generation',
    ],
    childClasses: [],
    lastUpdated: '2024-01-10',
    createdBy: 'moderator1',
    usageCount: 1456,
  },
  {
    id: '4',
    name: 'percy-relationships',
    description: 'Romantic relationships in Percy Jackson universe',
    fandom: 'Percy Jackson',
    category: 'relationships',
    isActive: true,
    mutuallyExclusive: true,
    maxSelections: 1,
    minSelections: null,
    validationRules: [
      {
        id: 'r6',
        type: 'conditional',
        condition: 'age < 16',
        message: 'Consider age-appropriate relationship development',
        severity: 'info',
      },
    ],
    tags: ['percy/annabeth', 'percy/nico', 'percy/luke', 'percy/clarisse'],
    childClasses: [],
    lastUpdated: '2024-01-08',
    createdBy: 'fandom-admin',
    usageCount: 234,
  },
];

const fandoms = [
  { id: 'all', name: 'All Fandoms' },
  { id: 'harry-potter', name: 'Harry Potter' },
  { id: 'percy-jackson', name: 'Percy Jackson' },
];

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

  const userRole = (user as any)?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin';
  const userFandom = (user as any)?.fandom; // For FandomAdmin users

  const filteredTagClasses = useMemo(() => {
    return mockTagClasses.filter(tagClass => {
      const matchesSearch =
        tagClass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tagClass.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tagClass.tags.some(tag =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesFandom =
        selectedFandom === 'all' ||
        tagClass.fandom.toLowerCase().replace(' ', '-') === selectedFandom;

      const matchesCategory =
        selectedCategory === 'all' || tagClass.category === selectedCategory;

      // FandomAdmin can only see their fandom's classes
      const hasPermission =
        userRole === 'ProjectAdmin' ||
        (userRole === 'FandomAdmin' && tagClass.fandom === userFandom);

      return matchesSearch && matchesFandom && matchesCategory && hasPermission;
    });
  }, [searchTerm, selectedFandom, selectedCategory, userRole, userFandom]);

  const toggleExpanded = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  const handleDeleteClass = (tagClass: TagClass) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${tagClass.name}"? This will affect ${tagClass.usageCount} stories.`
      )
    ) {
      console.log('Deleting tag class:', tagClass.id);
    }
  };

  const handleToggleActive = (tagClass: TagClass) => {
    console.log('Toggling active status for:', tagClass.id);
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
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Tag Class
          </button>
        </div>
      </div>

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
                            <dt className="text-gray-500">Max Selections:</dt>
                            <dd className="text-gray-900">
                              {tagClass.maxSelections || 'Unlimited'}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Min Selections:</dt>
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
                            <dt className="text-gray-500">Validation Rules:</dt>
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
    </div>
  );
}
