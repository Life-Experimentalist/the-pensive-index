'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';

export interface PathwayItem {
  id: string;
  type: 'tag' | 'plot_block';
  name: string;
  description?: string;
  category?: string;
  position: number;
  metadata?: Record<string, any>;
}

interface PathwayBuilderProps {
  fandomId: string;
  pathway: PathwayItem[];
  onPathwayUpdate: (pathway: PathwayItem[]) => void;
  onValidationRequest?: () => void;
  className?: string;
  maxItems?: number;
  disabled?: boolean;
}

interface SortableItemProps {
  item: PathwayItem;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function SortableItem({ item, onRemove, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'tag':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'plot_block':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'tag':
        return 'Tag';
      case 'plot_block':
        return 'Plot';
      default:
        return 'Item';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative p-3 border rounded-lg transition-all duration-200
        ${getItemTypeColor(item.type)}
        ${isDragging ? 'shadow-lg z-10' : 'hover:shadow-md'}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={`
          absolute left-1 top-1/2 transform -translate-y-1/2 p-1
          text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing
          focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
        disabled={disabled}
        aria-label={`Drag ${item.name}`}
      >
        <Bars3Icon className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="ml-6 pr-8">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white bg-opacity-75">
            {getItemTypeLabel(item.type)}
          </span>
          {item.category && (
            <span className="text-xs text-gray-600">{item.category}</span>
          )}
        </div>
        <div className="mt-1 font-medium text-sm">{item.name}</div>
        {item.description && (
          <div className="mt-1 text-xs text-gray-600 line-clamp-2">
            {item.description}
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        className={`
          absolute right-2 top-2 p-1 text-gray-400 hover:text-red-500
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
        aria-label={`Remove ${item.name}`}
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function PathwayItem({ item }: { item: PathwayItem }) {
  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'tag':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'plot_block':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div
      className={`p-3 border rounded-lg ${getItemTypeColor(
        item.type
      )} opacity-80`}
    >
      <div className="font-medium text-sm">{item.name}</div>
      {item.description && (
        <div className="mt-1 text-xs opacity-75 line-clamp-2">
          {item.description}
        </div>
      )}
    </div>
  );
}

export function PathwayBuilder({
  fandomId,
  pathway,
  onPathwayUpdate,
  onValidationRequest,
  className = '',
  maxItems = 10,
  disabled = false,
}: PathwayBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<
    'idle' | 'validating' | 'valid' | 'invalid'
  >('idle');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Sort pathway by position
  const sortedPathway = [...pathway].sort((a, b) => a.position - b.position);
  const activeItem = activeId
    ? pathway.find(item => item.id === activeId)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (active.id !== over?.id) {
        const oldIndex = sortedPathway.findIndex(item => item.id === active.id);
        const newIndex = sortedPathway.findIndex(item => item.id === over?.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Create new pathway with updated positions
          const newPathway = [...sortedPathway];
          const [movedItem] = newPathway.splice(oldIndex, 1);
          newPathway.splice(newIndex, 0, movedItem);

          // Update positions
          const updatedPathway = newPathway.map((item, index) => ({
            ...item,
            position: index,
          }));

          onPathwayUpdate(updatedPathway);
        }
      }
    },
    [sortedPathway, onPathwayUpdate]
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const newPathway = pathway
        .filter(item => item.id !== itemId)
        .map((item, index) => ({ ...item, position: index }));
      onPathwayUpdate(newPathway);
    },
    [pathway, onPathwayUpdate]
  );

  const handleClearAll = useCallback(() => {
    onPathwayUpdate([]);
  }, [onPathwayUpdate]);

  const handleValidate = useCallback(() => {
    if (onValidationRequest) {
      setValidationStatus('validating');
      onValidationRequest();
    }
  }, [onValidationRequest]);

  // Update validation status based on pathway changes
  useEffect(() => {
    if (pathway.length > 0 && validationStatus === 'idle') {
      setValidationStatus('idle');
    }
  }, [pathway, validationStatus]);

  const canAddMore = pathway.length < maxItems;
  const isEmpty = pathway.length === 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Story Pathway</h3>
          <p className="text-sm text-gray-500">
            {pathway.length} of {maxItems} elements • Drag to reorder
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {onValidationRequest && (
            <button
              onClick={handleValidate}
              disabled={
                isEmpty || disabled || validationStatus === 'validating'
              }
              className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validationStatus === 'validating' ? 'Validating...' : 'Validate'}
            </button>
          )}
          {!isEmpty && (
            <button
              onClick={handleClearAll}
              disabled={disabled}
              className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Pathway area */}
      <div
        className={`
        min-h-32 p-4 border-2 border-dashed rounded-lg transition-colors duration-200
        ${isEmpty ? 'border-gray-300 bg-gray-50' : 'border-blue-300 bg-blue-50'}
        ${!canAddMore ? 'border-orange-300 bg-orange-50' : ''}
      `}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Your pathway is empty</p>
            <p className="text-sm text-gray-400 mt-1">
              Add tags and plot blocks to build your story pathway
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[]}
          >
            <SortableContext
              items={sortedPathway.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedPathway.map(item => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onRemove={handleRemoveItem}
                    disabled={disabled}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeItem && <PathwayItem item={activeItem} />}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Status and limits */}
      {!canAddMore && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800">
            <span className="font-medium">Pathway limit reached.</span> Remove
            some items to add new ones.
          </p>
        </div>
      )}

      {/* Validation status */}
      {validationStatus !== 'idle' && (
        <div
          className={`p-3 border rounded-md ${
            validationStatus === 'validating'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : validationStatus === 'valid'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <p className="text-sm">
            {validationStatus === 'validating' &&
              'Checking pathway for conflicts...'}
            {validationStatus === 'valid' &&
              'Pathway is valid and ready for search!'}
            {validationStatus === 'invalid' &&
              'Pathway has validation issues. Check the suggestions below.'}
          </p>
        </div>
      )}
    </div>
  );
}
