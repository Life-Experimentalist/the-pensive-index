'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  FandomTemplate,
  Fandom,
  TemplateCategory,
  TemplateSearchFilters,
  TemplateSearchResult,
} from '../../types';

interface TemplateSelectorProps {
  templates: FandomTemplate[];
  selectedTemplate?: FandomTemplate | null;
  onTemplateSelect: (template: FandomTemplate | null) => void;
  onCreateFromTemplate?: (template: FandomTemplate) => void;
  onPreviewTemplate?: (template: FandomTemplate) => void;
  categories?: TemplateCategory[];
  isLoading?: boolean;
  allowMultiple?: boolean;
  showPreview?: boolean;
  showActions?: boolean;
}

interface TemplateFilters {
  search: string;
  category: string;
  complexity: 'all' | 'simple' | 'moderate' | 'complex';
  tags: string[];
  plotBlocks: string[];
}

export function TemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onCreateFromTemplate,
  onPreviewTemplate,
  categories = [],
  isLoading = false,
  allowMultiple = false,
  showPreview = true,
  showActions = true,
}: TemplateSelectorProps) {
  const [filters, setFilters] = useState<TemplateFilters>({
    search: '',
    category: '',
    complexity: 'all',
    tags: [],
    plotBlocks: [],
  });

  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'detailed'>(
    'grid'
  );
  const [previewTemplate, setPreviewTemplate] = useState<FandomTemplate | null>(
    null
  );
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(
    new Set()
  );

  // Filter templates based on current filters
  const filteredTemplates = useCallback(() => {
    return templates.filter(template => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          template.name.toLowerCase().includes(searchLower) ||
          template.description.toLowerCase().includes(searchLower) ||
          template.base_fandom.name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && template.category !== filters.category) {
        return false;
      }

      // Complexity filter
      if (filters.complexity !== 'all') {
        const complexity = getTemplateComplexity(template);
        if (complexity !== filters.complexity) return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const templateTags =
          template.base_fandom.tags?.map(t =>
            typeof t === 'string' ? t : t.name
          ) || [];
        const hasMatchingTags = filters.tags.some(tag =>
          templateTags.some(tTag =>
            tTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTags) return false;
      }

      // Plot blocks filter
      if (filters.plotBlocks.length > 0) {
        const templateBlocks =
          template.base_fandom.plot_blocks?.map(b =>
            typeof b === 'string' ? b : b.name
          ) || [];
        const hasMatchingBlocks = filters.plotBlocks.some(block =>
          templateBlocks.some(tBlock =>
            tBlock.toLowerCase().includes(block.toLowerCase())
          )
        );
        if (!hasMatchingBlocks) return false;
      }

      return true;
    });
  }, [templates, filters]);

  // Calculate template complexity based on content
  const getTemplateComplexity = useCallback((template: FandomTemplate) => {
    const tagCount = template.base_fandom.tags?.length || 0;
    const blockCount = template.base_fandom.plot_blocks?.length || 0;
    const classCount = template.base_fandom.tag_classes?.length || 0;

    const totalItems = tagCount + blockCount + classCount;

    if (totalItems <= 10) return 'simple';
    if (totalItems <= 30) return 'moderate';
    return 'complex';
  }, []);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: FandomTemplate) => {
      if (allowMultiple) {
        const newSelected = new Set(selectedTemplates);
        if (newSelected.has(template.id)) {
          newSelected.delete(template.id);
        } else {
          newSelected.add(template.id);
        }
        setSelectedTemplates(newSelected);
      } else {
        const isCurrentlySelected = selectedTemplate?.id === template.id;
        onTemplateSelect(isCurrentlySelected ? null : template);
      }
    },
    [allowMultiple, selectedTemplates, selectedTemplate, onTemplateSelect]
  );

  // Handle preview
  const handlePreview = useCallback(
    (template: FandomTemplate) => {
      setPreviewTemplate(template);
      if (onPreviewTemplate) {
        onPreviewTemplate(template);
      }
    },
    [onPreviewTemplate]
  );

  // Render template card
  const renderTemplateCard = useCallback(
    (template: FandomTemplate) => {
      const isSelected = allowMultiple
        ? selectedTemplates.has(template.id)
        : selectedTemplate?.id === template.id;
      const complexity = getTemplateComplexity(template);

      const tagCount = template.base_fandom.tags?.length || 0;
      const blockCount = template.base_fandom.plot_blocks?.length || 0;
      const classCount = template.base_fandom.tag_classes?.length || 0;

      return (
        <div
          key={template.id}
          className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
            isSelected
              ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
          onClick={() => handleTemplateSelect(template)}
        >
          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}

          {/* Template content */}
          <div className="pr-8">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-lg">
                {template.name}
              </h3>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  complexity === 'simple'
                    ? 'bg-green-100 text-green-800'
                    : complexity === 'moderate'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {complexity}
              </span>
            </div>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {template.description}
            </p>

            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-500">
                Based on:{' '}
                <span className="font-medium">{template.base_fandom.name}</span>
              </div>
              {template.category && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {template.category}
                </span>
              )}
            </div>

            {/* Content summary */}
            <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{tagCount}</div>
                <div className="text-gray-500">Tags</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{blockCount}</div>
                <div className="text-gray-500">Plot Blocks</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{classCount}</div>
                <div className="text-gray-500">Tag Classes</div>
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex space-x-2">
                {showPreview && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handlePreview(template);
                    }}
                    className="px-3 py-1 text-sm text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-50"
                    disabled={isLoading}
                  >
                    Preview
                  </button>
                )}
                {onCreateFromTemplate && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onCreateFromTemplate(template);
                    }}
                    className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    disabled={isLoading}
                  >
                    Use Template
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    },
    [
      allowMultiple,
      selectedTemplates,
      selectedTemplate,
      getTemplateComplexity,
      handleTemplateSelect,
      handlePreview,
      showActions,
      showPreview,
      onCreateFromTemplate,
      isLoading,
    ]
  );

  // Render template list item
  const renderTemplateListItem = useCallback(
    (template: FandomTemplate) => {
      const isSelected = allowMultiple
        ? selectedTemplates.has(template.id)
        : selectedTemplate?.id === template.id;

      return (
        <div
          key={template.id}
          className={`flex items-center p-4 border-b cursor-pointer transition-colors ${
            isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => handleTemplateSelect(template)}
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                checked={isSelected}
                onChange={() => {}} // Handled by parent click
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {template.base_fandom.name}
                    </span>
                    {template.category && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {template.category}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {template.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    },
    [
      allowMultiple,
      selectedTemplates,
      selectedTemplate,
      handleTemplateSelect,
      isLoading,
    ]
  );

  const filtered = filteredTemplates();

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Template Selector
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose from {filtered.length} available templates
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm rounded ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              disabled={isLoading}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm rounded ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              disabled={isLoading}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search templates..."
              value={filters.search}
              onChange={e =>
                setFilters(prev => ({ ...prev, search: e.target.value }))
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            />
          </div>

          {categories.length > 0 && (
            <div>
              <select
                value={filters.category}
                onChange={e =>
                  setFilters(prev => ({ ...prev, category: e.target.value }))
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isLoading}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={filters.complexity}
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  complexity: e.target.value as any,
                }))
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="all">All Complexity</option>
              <option value="simple">Simple</option>
              <option value="moderate">Moderate</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          <div>
            <button
              onClick={() =>
                setFilters({
                  search: '',
                  category: '',
                  complexity: 'all',
                  tags: [],
                  plotBlocks: [],
                })
              }
              className="w-full px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No templates found matching the current filters.
            </p>
          </div>
        ) : (
          <div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(renderTemplateCard)}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg">
                {filtered.map(renderTemplateListItem)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Template Preview: {previewTemplate.name}
              </h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600">{previewTemplate.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Tags ({previewTemplate.base_fandom.tags?.length || 0})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {previewTemplate.base_fandom.tags?.map((tag, index) => (
                      <div
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-sm rounded"
                      >
                        {typeof tag === 'string' ? tag : tag.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Plot Blocks (
                    {previewTemplate.base_fandom.plot_blocks?.length || 0})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {previewTemplate.base_fandom.plot_blocks?.map(
                      (block, index) => (
                        <div
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-sm rounded"
                        >
                          {typeof block === 'string' ? block : block.name}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Tag Classes (
                    {previewTemplate.base_fandom.tag_classes?.length || 0})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {previewTemplate.base_fandom.tag_classes?.map(
                      (tagClass, index) => (
                        <div
                          key={index}
                          className="px-2 py-1 bg-green-100 text-sm rounded"
                        >
                          {typeof tagClass === 'string'
                            ? tagClass
                            : tagClass.name}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={isLoading}
              >
                Close
              </button>
              {onCreateFromTemplate && (
                <button
                  onClick={() => {
                    onCreateFromTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                >
                  Use This Template
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;
