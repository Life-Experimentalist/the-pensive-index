/**
 * PathwayBuilder Component
 * Desktop drag-and-drop interface for creating story pathways
 * User Story US1: Interactive Pathway Builder with Validation
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ValidationEngine } from '@/lib/validation/engine';

export interface Tag {
  id: string;
  name: string;
  category?: string;
}

export interface PlotBlock {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface TagClass {
  id: string;
  name: string;
  slug: string;
  description: string;
  fandom_id: string;
  validation_rules: unknown;
  is_active: boolean;
}

export interface PathwayBuilderProps {
  fandomId: string;
  availableTags: Tag[];
  availablePlotBlocks: PlotBlock[];
  tagClasses?: TagClass[];
  onSave?: (pathway: {
    name: string;
    description?: string;
    tags: string[];
    plotBlocks: string[];
  }) => Promise<void>;
}

export function PathwayBuilder({
  fandomId,
  availableTags,
  availablePlotBlocks,
  onSave,
}: PathwayBuilderProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlotBlocks, setSelectedPlotBlocks] = useState<string[]>([]);
  const [pathwayName, setPathwayName] = useState('');
  const [pathwayDescription, setPathwayDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Setup sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        return;
      }

      if (over.id === 'pathway-tags-dropzone') {
        const draggedTag = active.data.current as { type: 'tag'; id: string };
        if (
          draggedTag?.type === 'tag' &&
          !selectedTags.includes(draggedTag.id)
        ) {
          setSelectedTags(prev => [...prev, draggedTag.id]);
        }
      } else if (over.id === 'pathway-plotblocks-dropzone') {
        const draggedBlock = active.data.current as {
          type: 'plotBlock';
          id: string;
        };
        if (
          draggedBlock?.type === 'plotBlock' &&
          !selectedPlotBlocks.includes(draggedBlock.id)
        ) {
          setSelectedPlotBlocks(prev => [...prev, draggedBlock.id]);
        }
      }
    },
    [selectedTags, selectedPlotBlocks]
  );

  const handleValidate = useCallback(() => {
    // Initialize validation engine
    const engine = new ValidationEngine();

    // Build validation context - convert component tags to validation tags
    const context = {
      fandomId,
      applied_tags: selectedTags,
      all_tags: availableTags.map(t => ({
        id: t.id,
        name: t.name,
        fandom_id: fandomId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      tag_classes: [], // TODO: Load tag classes from fandom
      metadata: {
        selectedPlotBlocks,
        allPlotBlocks: availablePlotBlocks,
      },
    };

    // Run validation
    const result = engine.validate(context);
    setValidationErrors(result.errors);

    return result;
  }, [
    fandomId,
    selectedTags,
    selectedPlotBlocks,
    availableTags,
    availablePlotBlocks,
  ]);

  const handleSave = useCallback(async () => {
    if (!pathwayName.trim()) {
      alert('Please enter a pathway name');
      return;
    }

    // Validate first
    const validationResult = handleValidate();
    if (!validationResult.is_valid) {
      alert('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.({
        name: pathwayName,
        description: pathwayDescription,
        tags: selectedTags,
        plotBlocks: selectedPlotBlocks,
      });
    } catch (error) {
      console.error('Error saving pathway:', error);
      alert('Failed to save pathway');
    } finally {
      setIsSaving(false);
    }
  }, [
    pathwayName,
    pathwayDescription,
    selectedTags,
    selectedPlotBlocks,
    validationErrors,
    handleValidate,
    onSave,
  ]);

  const removeTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(id => id !== tagId));
  };

  const removePlotBlock = (blockId: string) => {
    setSelectedPlotBlocks(prev => prev.filter(id => id !== blockId));
  };

  return (
    <div className="pathway-builder grid grid-cols-3 gap-6 h-full">
      {/* Left Panel: Available Tags & Plot Blocks */}
      <div className="col-span-1 space-y-6 overflow-y-auto">
        <div>
          <h3 className="text-lg font-semibold mb-3">Tags</h3>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="space-y-2">
              {availableTags.map(tag => (
                <div
                  key={tag.id}
                  draggable
                  className="p-2 bg-gray-100 rounded cursor-move hover:bg-gray-200"
                  data-tag-id={tag.id}
                >
                  {tag.name}
                </div>
              ))}
            </div>
          </DndContext>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Plot Blocks</h3>
          <div className="space-y-2">
            {availablePlotBlocks.map(block => (
              <div
                key={block.id}
                draggable
                className="p-2 bg-blue-100 rounded cursor-move hover:bg-blue-200"
                data-plotblock-id={block.id}
              >
                {block.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Panel: Pathway Preview */}
      <div className="col-span-1 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Pathway Name</label>
          <input
            type="text"
            value={pathwayName}
            onChange={e => setPathwayName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter pathway name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Description (Optional)
          </label>
          <textarea
            value={pathwayDescription}
            onChange={e => setPathwayDescription(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Describe your pathway"
          />
        </div>

        <div
          id="pathway-tags-dropzone"
          className="min-h-[100px] p-4 border-2 border-dashed rounded"
        >
          <h4 className="font-medium mb-2">Selected Tags</h4>
          <div className="space-y-2">
            {selectedTags.map(tagId => {
              const tag = availableTags.find(t => t.id === tagId);
              return (
                <div
                  key={tagId}
                  className="flex items-center justify-between p-2 bg-gray-100 rounded"
                >
                  <span>{tag?.name}</span>
                  <button
                    onClick={() => removeTag(tagId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div
          id="pathway-plotblocks-dropzone"
          className="min-h-[100px] p-4 border-2 border-dashed rounded"
        >
          <h4 className="font-medium mb-2">Selected Plot Blocks</h4>
          <div className="space-y-2">
            {selectedPlotBlocks.map(blockId => {
              const block = availablePlotBlocks.find(b => b.id === blockId);
              return (
                <div
                  key={blockId}
                  className="flex items-center justify-between p-2 bg-blue-100 rounded"
                >
                  <span>{block?.name}</span>
                  <button
                    onClick={() => removePlotBlock(blockId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Validate
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Pathway'}
          </button>
        </div>
      </div>

      {/* Right Panel: Validation & Output */}
      <div className="col-span-1 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-3">Validation Status</h3>
          {validationErrors.length === 0 ? (
            <div className="p-3 bg-green-100 text-green-800 rounded">
              ✓ No validation errors
            </div>
          ) : (
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className="p-3 bg-red-100 text-red-800 rounded"
                >
                  {error.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Matching Stories</h3>
          <div className="p-3 bg-gray-100 rounded text-sm text-gray-600">
            Save pathway to find matching stories
          </div>
        </div>
      </div>
    </div>
  );
}
