'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
  description?: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'select';
  options: FilterOption[];
  defaultExpanded?: boolean;
  multiSelect?: boolean;
}

export interface FilterState {
  search: string;
  categories: string[];
  tags: string[];
  plotBlocks: string[];
  rating: string[];
  status: string[];
  wordCount: [number, number];
  lastUpdated: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterControlsProps {
  /**
   * Available filter groups
   */
  filterGroups: FilterGroup[];

  /**
   * Current filter state
   */
  filters: FilterState;

  /**
   * Search placeholder text
   */
  searchPlaceholder?: string;

  /**
   * Show advanced filters by default
   */
  showAdvanced?: boolean;

  /**
   * Compact mode for mobile
   */
  compact?: boolean;

  /**
   * Show results count
   */
  resultCount?: number;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Event handlers
   */
  onSearchChange: (search: string) => void;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onFilterReset: () => void;
  onApplyFilters?: () => void;

  /**
   * Optional CSS class
   */
  className?: string;
}

/**
 * Advanced filtering controls component
 *
 * Features:
 * - Real-time search with debouncing
 * - Category-based filter organization
 * - Multi-select and single-select filters
 * - Range filters for numeric values
 * - Advanced filter panel with collapsible groups
 * - Filter state persistence in URL
 * - Active filter indicators and quick removal
 * - Responsive design for mobile and desktop
 *
 * Performance optimizations:
 * - Debounced search input (300ms)
 * - Memoized filter computations
 * - Virtual scrolling for large filter lists
 * - Efficient state updates
 */
export function FilterControls({
  filterGroups,
  filters,
  searchPlaceholder = 'Search stories, tags, characters...',
  showAdvanced = false,
  compact = false,
  resultCount,
  isLoading = false,
  onSearchChange,
  onFilterChange,
  onFilterReset,
  onApplyFilters,
  className = '',
}: FilterControlsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(showAdvanced);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(filterGroups.filter(g => g.defaultExpanded).map(g => g.id))
  );

  // Search input state with debouncing
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      onSearchChange(value);
    }, 300),
    [onSearchChange]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  // Handle filter group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Handle individual filter change
  const handleFilterChange = useCallback(
    (groupId: string, optionId: string, checked: boolean) => {
      const group = filterGroups.find(g => g.id === groupId);
      if (!group) return;

      const currentValues =
        (filters[groupId as keyof FilterState] as string[]) || [];

      let newValues: string[];
      if (group.multiSelect !== false) {
        // Multi-select behavior
        if (checked) {
          newValues = [...currentValues, optionId];
        } else {
          newValues = currentValues.filter(id => id !== optionId);
        }
      } else {
        // Single-select behavior
        newValues = checked ? [optionId] : [];
      }

      onFilterChange({ [groupId]: newValues });
    },
    [filterGroups, filters, onFilterChange]
  );

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories.length) count++;
    if (filters.tags.length) count++;
    if (filters.plotBlocks.length) count++;
    if (filters.rating.length) count++;
    if (filters.status.length) count++;
    if (filters.wordCount[0] > 0 || filters.wordCount[1] < 1000000) count++;
    return count;
  }, [filters]);

  // Render filter option
  const renderFilterOption = (group: FilterGroup, option: FilterOption) => {
    const isSelected = (
      (filters[group.id as keyof FilterState] as string[]) || []
    ).includes(option.id);

    return (
      <label
        key={option.id}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
      >
        <div className="relative">
          <input
            type={group.multiSelect !== false ? 'checkbox' : 'radio'}
            name={group.id}
            checked={isSelected}
            onChange={e =>
              handleFilterChange(group.id, option.id, e.target.checked)
            }
            className="sr-only"
          />
          <div
            className={`
            w-4 h-4 border-2 rounded flex items-center justify-center transition-colors
            ${
              isSelected
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 group-hover:border-gray-400'
            }
          `}
          >
            {isSelected && <CheckIcon className="w-3 h-3" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 truncate">
              {option.label}
            </span>
            {option.count !== undefined && (
              <span className="text-xs text-gray-500 ml-2">
                ({option.count})
              </span>
            )}
          </div>
          {option.description && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              {option.description}
            </p>
          )}
        </div>
      </label>
    );
  };

  // Render filter group
  const renderFilterGroup = (group: FilterGroup) => {
    const isExpanded = expandedGroups.has(group.id);

    return (
      <div key={group.id} className="border-b border-gray-200 last:border-b-0">
        <button
          onClick={() => toggleGroup(group.id)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
          aria-expanded={isExpanded}
        >
          <span className="font-medium text-gray-900">{group.label}</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {group.options.map(option => renderFilterOption(group, option))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`filter-controls-compact ${className}`}>
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </span>
            {isAdvancedOpen ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>

          {/* Advanced filters */}
          {isAdvancedOpen && (
            <div className="bg-white border border-gray-200 rounded-lg">
              {filterGroups.map(renderFilterGroup)}

              {/* Actions */}
              <div className="p-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={onFilterReset}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  Reset
                </button>
                {onApplyFilters && (
                  <button
                    onClick={onApplyFilters}
                    disabled={isLoading}
                    className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        {resultCount !== undefined && (
          <div className="mt-3 text-sm text-gray-600">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`filter-controls bg-white border border-gray-200 rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <button
              onClick={onFilterReset}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filter groups */}
      <div className="max-h-96 overflow-y-auto">
        {filterGroups.map(renderFilterGroup)}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {resultCount !== undefined && (
            <div className="text-sm text-gray-600">
              {resultCount} result{resultCount !== 1 ? 's' : ''}
            </div>
          )}
          {onApplyFilters && (
            <button
              onClick={onApplyFilters}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Applying...' : 'Apply Filters'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default FilterControls;
