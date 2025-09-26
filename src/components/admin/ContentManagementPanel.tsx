'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Fandom,
  Tag,
  PlotBlock,
  TagClass,
  FandomUpdateRequest,
  ValidationResult,
  BulkOperationRequest,
  BulkOperationResult,
} from '../../types';

interface ContentManagementPanelProps {
  fandom: Fandom;
  onUpdate: (updates: FandomUpdateRequest) => Promise<ValidationResult>;
  onBulkOperation: (
    operation: BulkOperationRequest
  ) => Promise<BulkOperationResult>;
  onRefresh: () => void;
  isLoading?: boolean;
}

type ContentType = 'tags' | 'plot_blocks' | 'tag_classes';
type ViewMode = 'list' | 'grid' | 'hierarchy';

interface ContentFilter {
  search: string;
  type: ContentType | 'all';
  status: 'all' | 'active' | 'deprecated';
  category: string;
}

export function ContentManagementPanel({
  fandom,
  onUpdate,
  onBulkOperation,
  onRefresh,
  isLoading = false,
}: ContentManagementPanelProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ContentFilter>({
    search: '',
    type: 'all',
    status: 'all',
    category: '',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkOperationStatus, setBulkOperationStatus] = useState<string>('');

  // Get all content items with type information
  const getAllContentItems = useCallback(() => {
    const items: Array<{
      id: string;
      type: ContentType;
      item: any;
      name: string;
    }> = [];

    fandom.tags?.forEach(tag => {
      items.push({
        id: tag.id || `tag-${tag.name}`,
        type: 'tags',
        item: tag,
        name: tag.name,
      });
    });

    fandom.plot_blocks?.forEach(block => {
      items.push({
        id: block.id || `block-${block.name}`,
        type: 'plot_blocks',
        item: block,
        name: block.name,
      });
    });

    fandom.tag_classes?.forEach(tagClass => {
      items.push({
        id: tagClass.id || `class-${tagClass.name}`,
        type: 'tag_classes',
        item: tagClass,
        name: tagClass.name,
      });
    });

    return items;
  }, [fandom]);

  // Filter content based on current filter settings
  const filteredItems = useCallback(() => {
    let items = getAllContentItems();

    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter(
        item =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.item.description &&
            item.item.description.toLowerCase().includes(searchLower))
      );
    }

    // Type filter
    if (filter.type !== 'all') {
      items = items.filter(item => item.type === filter.type);
    }

    // Status filter (simplified - you might want to add actual status fields)
    if (filter.status !== 'all') {
      items = items.filter(item => {
        // Assuming deprecated items have a 'deprecated' field or similar
        const isDeprecated =
          item.item.deprecated || item.item.status === 'deprecated';
        return filter.status === 'deprecated' ? isDeprecated : !isDeprecated;
      });
    }

    return items;
  }, [getAllContentItems, filter]);

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedItems(new Set(filteredItems().map(item => item.id)));
      } else {
        setSelectedItems(new Set());
      }
    },
    [filteredItems]
  );

  // Start editing an item
  const startEdit = useCallback((item: any) => {
    setIsEditing(item.id || `${item.name}-edit`);
    setEditValues({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      ...item,
    });
  }, []);

  // Save edit changes
  const saveEdit = useCallback(async () => {
    if (!isEditing) return;

    try {
      // Create update request based on edited item
      const updateRequest: FandomUpdateRequest = {
        name: fandom.name,
        description: fandom.description,
        is_active: fandom.is_active,
        metadata: {
          // This would need to be more specific based on what was edited
          tags: fandom.tags,
          plot_blocks: fandom.plot_blocks,
          tag_classes: fandom.tag_classes,
        },
      };

      const result = await onUpdate(updateRequest);

      if (result.is_valid) {
        setIsEditing(null);
        setEditValues({});
        onRefresh();
      } else {
        console.error('Update validation failed:', result);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  }, [isEditing, editValues, fandom, onUpdate, onRefresh]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setIsEditing(null);
    setEditValues({});
  }, []);

  // Handle bulk operations
  const handleBulkOperation = useCallback(
    async (operationType: string) => {
      if (selectedItems.size === 0) return;

      setBulkOperationStatus(`Performing ${operationType}...`);

      try {
        const bulkRequest: BulkOperationRequest = {
          fandom_id: fandom.id,
          operation_type: operationType as any,
          target_ids: Array.from(selectedItems),
          operation_data: {},
        };

        const result = await onBulkOperation(bulkRequest);

        if (result.success) {
          setBulkOperationStatus(`${operationType} completed successfully`);
          setSelectedItems(new Set());
          onRefresh();
          setTimeout(() => setBulkOperationStatus(''), 3000);
        } else {
          setBulkOperationStatus(
            `${operationType} failed: ${result.errors?.join(', ')}`
          );
        }
      } catch (error) {
        setBulkOperationStatus(`${operationType} failed: ${error}`);
      }
    },
    [selectedItems, fandom.id, onBulkOperation, onRefresh]
  );

  // Render content item
  const renderContentItem = useCallback(
    (item: { id: string; type: ContentType; item: any; name: string }) => {
      const isSelected = selectedItems.has(item.id);
      const isCurrentlyEditing = isEditing === item.id;

      return (
        <div
          key={item.id}
          className={`p-4 border rounded-lg ${
            isSelected
              ? 'bg-blue-50 border-blue-300'
              : 'bg-white border-gray-200'
          } hover:shadow-md transition-shadow`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={e => handleItemSelect(item.id, e.target.checked)}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={isLoading}
              />

              <div className="flex-1">
                {isCurrentlyEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editValues.name || ''}
                      onChange={e =>
                        setEditValues(prev => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="block w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Name"
                    />
                    <textarea
                      value={editValues.description || ''}
                      onChange={e =>
                        setEditValues(prev => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                      className="block w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Description"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        disabled={isLoading}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.type === 'tags'
                            ? 'bg-gray-100 text-gray-800'
                            : item.type === 'plot_blocks'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>
                    {item.item.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {item.item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">
                        {item.item.category &&
                          `Category: ${item.item.category}`}
                      </div>
                      <button
                        onClick={() => startEdit(item.item)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [
      selectedItems,
      isEditing,
      editValues,
      handleItemSelect,
      startEdit,
      saveEdit,
      cancelEdit,
      isLoading,
    ]
  );

  const items = filteredItems();
  const selectedCount = selectedItems.size;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Content Management: {fandom.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {items.length} items ({selectedCount} selected)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={isLoading}
            >
              Refresh
            </button>
            {selectedCount > 0 && (
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                disabled={isLoading}
              >
                Bulk Actions ({selectedCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search content..."
              value={filter.search}
              onChange={e =>
                setFilter(prev => ({ ...prev, search: e.target.value }))
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <select
              value={filter.type}
              onChange={e =>
                setFilter(prev => ({
                  ...prev,
                  type: e.target.value as ContentType | 'all',
                }))
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="all">All Types</option>
              <option value="tags">Tags</option>
              <option value="plot_blocks">Plot Blocks</option>
              <option value="tag_classes">Tag Classes</option>
            </select>
          </div>
          <div>
            <select
              value={filter.status}
              onChange={e =>
                setFilter(prev => ({ ...prev, status: e.target.value as any }))
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
          <div className="flex space-x-2">
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

      {/* Bulk Actions */}
      {showBulkActions && selectedCount > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedCount} items selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkOperation('export')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  disabled={isLoading}
                >
                  Export
                </button>
                <button
                  onClick={() => handleBulkOperation('validate')}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  disabled={isLoading}
                >
                  Validate
                </button>
                <button
                  onClick={() => handleBulkOperation('delete')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  disabled={isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowBulkActions(false)}
              className="text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
          {bulkOperationStatus && (
            <div className="mt-2 text-sm text-gray-600">
              {bulkOperationStatus}
            </div>
          )}
        </div>
      )}

      {/* Selection Controls */}
      {items.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedCount === items.length}
                onChange={e => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-gray-700">
                Select All ({items.length})
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No content items found matching the current filters.
            </p>
          </div>
        ) : (
          <div
            className={`space-y-4 ${
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : ''
            }`}
          >
            {items.map(renderContentItem)}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentManagementPanel;
