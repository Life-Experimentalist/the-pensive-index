'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export interface PlotBlock {
  id: string;
  name: string;
  description?: string;
  category?: string;
  requires?: string[];
  enhances?: string[];
  conflicts?: string[];
  children: PlotBlock[];
  isActive: boolean;
}

interface PlotBlockTreeProps {
  fandomId: string;
  plotBlocks: PlotBlock[];
  selectedPlotBlockIds: string[];
  onPlotBlockSelect: (plotBlock: PlotBlock) => void;
  onPlotBlockDeselect: (plotBlockId: string) => void;
  className?: string;
  disabled?: boolean;
  maxSelections?: number;
}

interface PlotBlockNodeProps {
  plotBlock: PlotBlock;
  level: number;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (plotBlock: PlotBlock) => void;
  onDeselect: (plotBlockId: string) => void;
  onToggleExpand: (plotBlockId: string) => void;
  expandedIds: string[];
  showDependencies?: boolean;
  searchTerm?: string;
}

function PlotBlockNode({
  plotBlock,
  level,
  isSelected,
  isDisabled,
  onSelect,
  onDeselect,
  onToggleExpand,
  expandedIds,
  showDependencies = false,
  searchTerm = '',
}: PlotBlockNodeProps) {
  const hasChildren = plotBlock.children && plotBlock.children.length > 0;
  const isExpanded = expandedIds.includes(plotBlock.id);
  const indentClass = `ml-${Math.min(level * 4, 16)}`; // Cap indentation

  const handleClick = useCallback(() => {
    if (isDisabled) return;

    if (isSelected) {
      onDeselect(plotBlock.id);
    } else {
      onSelect(plotBlock);
    }
  }, [plotBlock, isSelected, isDisabled, onSelect, onDeselect]);

  const handleExpandToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggleExpand(plotBlock.id);
      }
    },
    [plotBlock.id, hasChildren, onToggleExpand]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      } else if (event.key === 'ArrowRight' && hasChildren && !isExpanded) {
        event.preventDefault();
        onToggleExpand(plotBlock.id);
      } else if (event.key === 'ArrowLeft' && hasChildren && isExpanded) {
        event.preventDefault();
        onToggleExpand(plotBlock.id);
      }
    },
    [handleClick, hasChildren, isExpanded, onToggleExpand, plotBlock.id]
  );

  // Highlight search terms
  const highlightText = (text: string) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-yellow-900 font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className={`${indentClass}`}>
      {/* Node content */}
      <div
        className={`
          group relative flex items-start space-x-2 p-2 rounded-lg cursor-pointer transition-all duration-200
          focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500
          ${
            isSelected
              ? 'bg-purple-50 border border-purple-300 shadow-sm'
              : 'bg-white hover:bg-gray-50'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Expand/collapse button */}
        <button
          onClick={handleExpandToggle}
          className={`
            flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors duration-200
            ${
              hasChildren
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                : 'invisible'
            }
          `}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${plotBlock.name}`}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            ))}
        </button>

        {/* Main content */}
        <button
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className="flex-1 text-left focus:outline-none"
          aria-label={`${isSelected ? 'Deselect' : 'Select'} plot block: ${
            plotBlock.name
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span
                  className={`
                  font-medium text-sm
                  ${isSelected ? 'text-purple-900' : 'text-gray-900'}
                `}
                >
                  {highlightText(plotBlock.name)}
                </span>

                {plotBlock.category && (
                  <span
                    className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      isSelected
                        ? 'bg-purple-200 text-purple-800'
                        : 'bg-gray-100 text-gray-700'
                    }
                  `}
                  >
                    {plotBlock.category}
                  </span>
                )}

                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  </div>
                )}
              </div>

              {plotBlock.description && (
                <p
                  className={`
                  mt-1 text-xs line-clamp-2
                  ${isSelected ? 'text-purple-700' : 'text-gray-600'}
                `}
                >
                  {highlightText(plotBlock.description)}
                </p>
              )}

              {showDependencies &&
                (plotBlock.requires?.length || plotBlock.enhances?.length) && (
                  <div className="mt-2 space-y-1">
                    {plotBlock.requires && plotBlock.requires.length > 0 && (
                      <div className="text-xs text-orange-600">
                        <span className="font-medium">Requires:</span>{' '}
                        {plotBlock.requires.join(', ')}
                      </div>
                    )}
                    {plotBlock.enhances && plotBlock.enhances.length > 0 && (
                      <div className="text-xs text-green-600">
                        <span className="font-medium">Enhances:</span>{' '}
                        {plotBlock.enhances.join(', ')}
                      </div>
                    )}
                  </div>
                )}

              {hasChildren && (
                <div className="mt-2 text-xs text-gray-500">
                  {plotBlock.children.length} sub-elements
                </div>
              )}
            </div>

            <div
              className={`
              flex-shrink-0 ml-2 p-1 rounded-full transition-colors duration-200
              ${
                isSelected
                  ? 'bg-purple-200 text-purple-700'
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

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {plotBlock.children.map(child => (
            <PlotBlockNode
              key={child.id}
              plotBlock={child}
              level={level + 1}
              isSelected={false} // Children selection handled separately if needed
              isDisabled={isDisabled}
              onSelect={onSelect}
              onDeselect={onDeselect}
              onToggleExpand={onToggleExpand}
              expandedIds={expandedIds}
              showDependencies={showDependencies}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlotBlockTree({
  fandomId,
  plotBlocks,
  selectedPlotBlockIds,
  onPlotBlockSelect,
  onPlotBlockDeselect,
  className = '',
  disabled = false,
  maxSelections = 5,
}: PlotBlockTreeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showDependencies, setShowDependencies] = useState(false);

  const selectedCount = selectedPlotBlockIds.length;
  const canAddMore = selectedCount < maxSelections;

  // Flatten tree for searching
  const flattenPlotBlocks = useCallback((blocks: PlotBlock[]): PlotBlock[] => {
    const flattened: PlotBlock[] = [];

    const flatten = (block: PlotBlock) => {
      flattened.push(block);
      if (block.children) {
        block.children.forEach(flatten);
      }
    };

    blocks.forEach(flatten);
    return flattened;
  }, []);

  // Filter plot blocks based on search
  const filteredPlotBlocks = useMemo(() => {
    if (!searchTerm) {
      return plotBlocks;
    }

    const searchLower = searchTerm.toLowerCase();
    const allBlocks = flattenPlotBlocks(plotBlocks);
    const matchingIds = new Set<string>();

    // Find matching blocks
    allBlocks.forEach(block => {
      if (
        block.name.toLowerCase().includes(searchLower) ||
        block.description?.toLowerCase().includes(searchLower) ||
        block.category?.toLowerCase().includes(searchLower)
      ) {
        matchingIds.add(block.id);
      }
    });

    // Filter tree to show only matching branches
    const filterTree = (blocks: PlotBlock[]): PlotBlock[] => {
      return blocks
        .map(block => ({
          ...block,
          children: filterTree(block.children || []),
        }))
        .filter(
          block =>
            matchingIds.has(block.id) ||
            (block.children && block.children.length > 0)
        );
    };

    return filterTree(plotBlocks);
  }, [plotBlocks, searchTerm, flattenPlotBlocks]);

  // Auto-expand categories with search results
  React.useEffect(() => {
    if (searchTerm && filteredPlotBlocks.length > 0) {
      const allIds = flattenPlotBlocks(filteredPlotBlocks).map(
        block => block.id
      );
      setExpandedIds(prev => [...new Set([...prev, ...allIds])]);
    }
  }, [searchTerm, filteredPlotBlocks, flattenPlotBlocks]);

  const handleToggleExpand = useCallback((plotBlockId: string) => {
    setExpandedIds(prev =>
      prev.includes(plotBlockId)
        ? prev.filter(id => id !== plotBlockId)
        : [...prev, plotBlockId]
    );
  }, []);

  const handlePlotBlockSelect = useCallback(
    (plotBlock: PlotBlock) => {
      if (!canAddMore || disabled) return;
      onPlotBlockSelect(plotBlock);
    },
    [canAddMore, disabled, onPlotBlockSelect]
  );

  const isPlotBlockDisabled = useCallback(
    (plotBlock: PlotBlock) => {
      return (
        disabled ||
        (!canAddMore && !selectedPlotBlockIds.includes(plotBlock.id))
      );
    },
    [disabled, canAddMore, selectedPlotBlockIds]
  );

  const handleExpandAll = useCallback(() => {
    const allIds = flattenPlotBlocks(filteredPlotBlocks).map(block => block.id);
    setExpandedIds(allIds);
  }, [filteredPlotBlocks, flattenPlotBlocks]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds([]);
  }, []);

  const totalBlocks = flattenPlotBlocks(plotBlocks).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Plot Blocks</h3>
            <p className="text-sm text-gray-500">
              {selectedCount} of {maxSelections} selected • {totalBlocks}{' '}
              available
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <InformationCircleIcon className="w-3 h-3" />
              <span>{showDependencies ? 'Hide' : 'Show'} Info</span>
            </button>

            <button
              onClick={handleExpandAll}
              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Expand All
            </button>

            <button
              onClick={handleCollapseAll}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plot blocks..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Selection limit warning */}
      {!canAddMore && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800">
            <span className="font-medium">Selection limit reached.</span>{' '}
            Deselect some plot blocks to add new ones.
          </p>
        </div>
      )}

      {/* Plot block tree */}
      <div className="border border-gray-200 rounded-lg bg-white">
        {filteredPlotBlocks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 font-medium">No plot blocks found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'No plot blocks available for this fandom'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredPlotBlocks.map(plotBlock => (
              <PlotBlockNode
                key={plotBlock.id}
                plotBlock={plotBlock}
                level={0}
                isSelected={selectedPlotBlockIds.includes(plotBlock.id)}
                isDisabled={isPlotBlockDisabled(plotBlock)}
                onSelect={handlePlotBlockSelect}
                onDeselect={onPlotBlockDeselect}
                onToggleExpand={handleToggleExpand}
                expandedIds={expandedIds}
                showDependencies={showDependencies}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
