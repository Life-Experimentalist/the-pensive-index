/**
 * Rule Templates Management Page
 *
 * Interface for managing validation rule templates:
 * - Template library with categories
 * - Clone and customize functionality
 * - Template versioning and permissions
 * - Fandom-specific template collections
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  DocumentDuplicateIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import AdminLayout from '@/components/admin/AdminLayout';

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fandom: string;
  version: string;
  author: string;
  isPublic: boolean;
  isOfficial: boolean;
  usageCount: number;
  lastUpdated: string;
  rating: number;
  ratingCount: number;
  tags: string[];
  conditions: number;
  actions: number;
  complexity: 'simple' | 'moderate' | 'complex';
  preview: {
    description: string;
    sampleScenario: string;
  };
}

// Mock templates data
const mockTemplates: RuleTemplate[] = [
  {
    id: '1',
    name: 'Harry/Hermione Shipping Validation',
    description:
      'Validates appropriate age progression and relationship development for Harry/Hermione pairings',
    category: 'shipping',
    fandom: 'Harry Potter',
    version: '2.1.0',
    author: 'Official',
    isPublic: true,
    isOfficial: true,
    usageCount: 1247,
    lastUpdated: '2024-01-15',
    rating: 4.8,
    ratingCount: 156,
    tags: [
      'harry-potter',
      'hermione-granger',
      'relationship',
      'age-appropriate',
    ],
    conditions: 8,
    actions: 4,
    complexity: 'moderate',
    preview: {
      description:
        'Ensures Harry/Hermione relationships follow logical progression and age-appropriate content',
      sampleScenario:
        'If Harry and Hermione are in years 1-3, only friendship tags are allowed',
    },
  },
  {
    id: '2',
    name: 'Time Travel Consistency Check',
    description:
      'Validates time travel plot consistency and prevents paradoxes',
    category: 'plot-consistency',
    fandom: 'Harry Potter',
    version: '1.5.0',
    author: 'CommunityExpert',
    isPublic: true,
    isOfficial: false,
    usageCount: 892,
    lastUpdated: '2024-01-10',
    rating: 4.6,
    ratingCount: 89,
    tags: ['time-travel', 'plot-consistency', 'hermione-granger'],
    conditions: 12,
    actions: 6,
    complexity: 'complex',
    preview: {
      description:
        'Ensures time travel mechanics are consistent and prevent logical paradoxes',
      sampleScenario:
        'If time travel is present, validates knowledge constraints and butterfly effects',
    },
  },
  {
    id: '3',
    name: 'Content Warning Generator',
    description:
      'Automatically generates appropriate content warnings based on selected tags',
    category: 'content-warnings',
    fandom: 'Multi-Fandom',
    version: '3.0.0',
    author: 'Official',
    isPublic: true,
    isOfficial: true,
    usageCount: 2156,
    lastUpdated: '2024-01-20',
    rating: 4.9,
    ratingCount: 203,
    tags: ['content-warnings', 'safety', 'multi-fandom'],
    conditions: 15,
    actions: 8,
    complexity: 'simple',
    preview: {
      description:
        'Generates comprehensive content warnings based on pathway selections',
      sampleScenario:
        'If violence tags are selected, adds appropriate content warnings',
    },
  },
  {
    id: '4',
    name: 'Percy Relationships Validator',
    description:
      'Validates age-appropriate relationships in Percy Jackson universe',
    category: 'shipping',
    fandom: 'Percy Jackson',
    version: '1.2.0',
    author: 'FandomModerator',
    isPublic: true,
    isOfficial: false,
    usageCount: 341,
    lastUpdated: '2024-01-08',
    rating: 4.3,
    ratingCount: 45,
    tags: ['percy-jackson', 'relationships', 'demigods'],
    conditions: 6,
    actions: 3,
    complexity: 'simple',
    preview: {
      description:
        'Ensures Percy Jackson relationships respect character ages and mythology',
      sampleScenario:
        'If Percy is under 16, restricts certain relationship types',
    },
  },
];

const categories = [
  { id: 'all', name: 'All Categories', count: mockTemplates.length },
  {
    id: 'shipping',
    name: 'Shipping',
    count: mockTemplates.filter(t => t.category === 'shipping').length,
  },
  {
    id: 'plot-consistency',
    name: 'Plot Consistency',
    count: mockTemplates.filter(t => t.category === 'plot-consistency').length,
  },
  {
    id: 'content-warnings',
    name: 'Content Warnings',
    count: mockTemplates.filter(t => t.category === 'content-warnings').length,
  },
  { id: 'character-tags', name: 'Character Tags', count: 0 },
  { id: 'genre-validation', name: 'Genre Validation', count: 0 },
];

const fandoms = [
  { id: 'all', name: 'All Fandoms' },
  { id: 'harry-potter', name: 'Harry Potter' },
  { id: 'percy-jackson', name: 'Percy Jackson' },
  { id: 'multi-fandom', name: 'Multi-Fandom' },
];

const complexityColors = {
  simple: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  complex: 'bg-red-100 text-red-800',
};

export default function RuleTemplates() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFandom, setSelectedFandom] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'rating' | 'updated'>(
    'usage'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const userRole = (session?.user as any)?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin';

  const filteredTemplates = useMemo(() => {
    let filtered = mockTemplates.filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory;

      const matchesFandom =
        selectedFandom === 'all' ||
        template.fandom.toLowerCase().replace(' ', '-') === selectedFandom ||
        template.fandom === 'Multi-Fandom';

      return matchesSearch && matchesCategory && matchesFandom;
    });

    // Sort templates
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'usage':
          aValue = a.usageCount;
          bValue = b.usageCount;
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'updated':
          aValue = new Date(a.lastUpdated);
          bValue = new Date(b.lastUpdated);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedCategory, selectedFandom, sortBy, sortOrder]);

  const handleCloneTemplate = (template: RuleTemplate) => {
    // Navigate to create page with template data
    console.log('Cloning template:', template.id);
  };

  const handleDeleteTemplate = (template: RuleTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      console.log('Deleting template:', template.id);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.floor(rating);
      const half = i === Math.floor(rating) && rating % 1 >= 0.5;

      return (
        <span key={i} className="relative">
          {filled ? (
            <StarIconSolid className="w-4 h-4 text-yellow-400" />
          ) : half ? (
            <div className="relative">
              <StarIcon className="w-4 h-4 text-gray-300" />
              <StarIconSolid className="absolute inset-0 w-4 h-4 text-yellow-400 clip-half" />
            </div>
          ) : (
            <StarIcon className="w-4 h-4 text-gray-300" />
          )}
        </span>
      );
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ClipboardDocumentIcon className="w-8 h-8 mr-3 text-indigo-600" />
              Rule Templates
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Browse, clone, and manage validation rule templates for your
              fandoms.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/admin/validation-rules/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create New Rule
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        {category.name} ({category.count})
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
                    {fandoms.map(fandom => (
                      <option key={fandom.id} value={fandom.id}>
                        {fandom.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="usage">Usage Count</option>
                      <option value="rating">Rating</option>
                      <option value="name">Name</option>
                      <option value="updated">Last Updated</option>
                    </select>
                    <button
                      onClick={() =>
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white shadow rounded-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {template.name}
                      </h3>
                      {template.isOfficial && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Official
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {template.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>v{template.version}</span>
                      <span>by {template.author}</span>
                      <span>{template.usageCount} uses</span>
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center space-x-1">
                        {renderStars(template.rating)}
                      </div>
                      <span className="text-sm text-gray-500">
                        {template.rating.toFixed(1)} ({template.ratingCount}{' '}
                        reviews)
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm mb-3">
                      <span className="text-gray-600">
                        {template.conditions} conditions, {template.actions}{' '}
                        actions
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          complexityColors[template.complexity]
                        }`}
                      >
                        {template.complexity}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{template.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCloneTemplate(template)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                        Clone
                      </button>
                      <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Preview
                      </button>
                    </div>

                    {userRole === 'ProjectAdmin' && (
                      <div className="flex space-x-2">
                        <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <ClipboardDocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No templates found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or create a new rule template.
            </p>
            <div className="mt-6">
              <Link
                href="/admin/validation-rules/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create New Template
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
