'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export interface Tag {
  id: string;
  name: string;
  description?: string;
  category?: string;
  requires?: string[];
  enhances?: string[];
  conflicts?: string[];
  isActive: boolean;
}

export interface TagCategory {
  category: string;
  description: string;
  tags: Tag[];
}

interface TagListProps {
  fandomId: string;
  categories: TagCategory[];
  selectedTagIds: string[];
  onTagSelect: (tag: Tag) => void;
  onTagDeselect: (tagId: string) => void;
  className?: string;
  disabled?: boolean;
  maxSelections?: number;
}

interface TagItemProps {
  tag: Tag;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (tag: Tag) => void;
  onDeselect: (tagId: string) => void;
  showDependencies?: boolean;
}

function TagItem({
  tag,
  isSelected,
  isDisabled,
  onSelect,
  onDeselect,
  showDependencies = false,
}: TagItemProps) {
  const handleClick = useCallback(() => {
    if (isDisabled) return;

    if (isSelected) {
      onDeselect(tag.id);
    } else {
      onSelect(tag);
    }
  }, [tag, isSelected, isDisabled, onSelect, onDeselect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      className={`
        group relative p-3 border rounded-lg cursor-pointer transition-all duration-200
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
        ${
          isSelected
            ? 'bg-blue-50 border-blue-300 shadow-sm'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        className="w-full text-left focus:outline-none"
        aria-label={`${isSelected ? 'Deselect' : 'Select'} tag: ${tag.name}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span
                className={`
                font-medium text-sm
                ${isSelected ? 'text-blue-900' : 'text-gray-900'}
              `}
              >
                {tag.name}
              </span>
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>

            {tag.description && (
              <p
                className={`
                mt-1 text-xs line-clamp-2
                ${isSelected ? 'text-blue-700' : 'text-gray-600'}
              `}
              >
                {tag.description}
              </p>
            )}

            {showDependencies &&
              (tag.requires?.length || tag.enhances?.length) && (
                <div className="mt-2 space-y-1">
                  {tag.requires && tag.requires.length > 0 && (
                    <div className="text-xs text-orange-600">
                      <span className="font-medium">Requires:</span>{' '}
                      {tag.requires.join(', ')}
                    </div>
                  )}
                  {tag.enhances && tag.enhances.length > 0 && (
                    <div className="text-xs text-green-600">
                      <span className="font-medium">Enhances:</span>{' '}
                      {tag.enhances.join(', ')}
                    </div>
                  )}
                </div>
              )}
          </div>

          <div
            className={`
            flex-shrink-0 ml-2 p-1 rounded-full transition-colors duration-200
            ${
              isSelected
                ? 'bg-blue-200 text-blue-700'
                : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
            }
          `}
          >
            <PlusIcon
              className={`w-3 h-3 transition-transform duration-200 ${
                isSelected ? 'rotate-45' : ''
              }`}
            />
          </div>
        </div>
      </button>
    </div>
  );
}

export function TagList({
  fandomId,
  categories,
  selectedTagIds,
  onTagSelect,
  onTagDeselect,
  className = '',
  disabled = false,
  maxSelections = 10,
}: TagListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showDependencies, setShowDependencies] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Get all unique categories
  const availableCategories = useMemo(
    () => categories.map(cat => cat.category).filter(Boolean),
    [categories]
  );

  // Filter categories and tags based on search and category filters
  const filteredCategories = useMemo(() => {
    return categories
      .filter(category => {
        // Filter by selected categories
        if (
          selectedCategories.length > 0 &&
          !selectedCategories.includes(category.category)
        ) {
          return false;
        }
        return true;
      })
      .map(category => ({
        ...category,
        tags: category.tags.filter(tag => {
          // Filter by search term
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return (
              tag.name.toLowerCase().includes(searchLower) ||
              tag.description?.toLowerCase().includes(searchLower) ||
              tag.category?.toLowerCase().includes(searchLower)
            );
          }
          return tag.isActive;
        }),
      }))
      .filter(category => category.tags.length > 0);
  }, [categories, searchTerm, selectedCategories]);

  // Calculate totals
  const totalTags = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.tags.length, 0),
    [filteredCategories]
  );

  const selectedCount = selectedTagIds.length;
  const canAddMore = selectedCount < maxSelections;

  const handleCategoryToggle = useCallback((category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const handleExpandCategory = useCallback((category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const handleTagSelect = useCallback(
    (tag: Tag) => {
      if (!canAddMore || disabled) return;
      onTagSelect(tag);
    },
    [canAddMore, disabled, onTagSelect]
  );

  const isTagDisabled = useCallback(
    (tag: Tag) => {
      return disabled || (!canAddMore && !selectedTagIds.includes(tag.id));
    },
    [disabled, canAddMore, selectedTagIds]
  );

  // Auto-expand categories with search results
  React.useEffect(() => {
    if (searchTerm) {
      const categoriesWithResults = filteredCategories.map(cat => cat.category);
      setExpandedCategories(categoriesWithResults);
    }
  }, [searchTerm, filteredCategories]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with search and filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Tags</h3>
            <p className="text-sm text-gray-500">
              {selectedCount} of {maxSelections} selected • {totalTags}{' '}
              available
            </p>
          </div>

          <button
            onClick={() => setShowDependencies(!showDependencies)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>{showDependencies ? 'Hide' : 'Show'} Dependencies</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category filters */}
        {availableCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200
                  ${
                    selectedCategories.includes(category)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selection limit warning */}
      {!canAddMore && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800">
            <span className="font-medium">Selection limit reached.</span>{' '}
            Deselect some tags to add new ones.
          </p>
        </div>
      )}

      {/* Categories and tags */}
      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 font-medium">No tags found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'No tags available for this fandom'}
            </p>
          </div>
        ) : (
          filteredCategories.map(category => {
            const isExpanded = expandedCategories.includes(category.category);
            const visibleTags = isExpanded
              ? category.tags
              : category.tags.slice(0, 6);
            const hasMore = category.tags.length > 6;

            return (
              <div key={category.category} className="space-y-2">
                {/* Category header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {category.category}
                    </h4>
                    {category.description && (
                      <p className="text-xs text-gray-500">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{category.tags.length} tags</span>
                    {hasMore && (
                      <button
                        onClick={() => handleExpandCategory(category.category)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {isExpanded ? 'Show Less' : 'Show All'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {visibleTags.map(tag => (
                    <TagItem
                      key={tag.id}
                      tag={tag}
                      isSelected={selectedTagIds.includes(tag.id)}
                      isDisabled={isTagDisabled(tag)}
                      onSelect={handleTagSelect}
                      onDeselect={onTagDeselect}
                      showDependencies={showDependencies}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
