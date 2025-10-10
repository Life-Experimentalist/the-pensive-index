/**
 * PathwayBuilderMobile Component
 * Mobile tap-to-select interface for creating story pathways
 * User Story US1: Interactive Pathway Builder with Validation (Mobile)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
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

export interface PathwayBuilderMobileProps {
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

export function PathwayBuilderMobile({
  fandomId,
  availableTags,
  availablePlotBlocks,
  onSave,
}: PathwayBuilderMobileProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlotBlocks, setSelectedPlotBlocks] = useState<string[]>([]);
  const [pathwayName, setPathwayName] = useState('');
  const [pathwayDescription, setPathwayDescription] = useState('');
  const [activePanel, setActivePanel] = useState<
    'tags' | 'plotBlocks' | 'preview'
  >('tags');
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleTagTap = useCallback((tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handlePlotBlockTap = useCallback((blockId: string) => {
    setSelectedPlotBlocks(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  }, []);

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

  return (
    <div className="pathway-builder-mobile h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActivePanel('tags')}
          className={cn(
            'flex-1 py-3 text-center font-medium',
            activePanel === 'tags' && 'border-b-2 border-blue-500 text-blue-600'
          )}
        >
          Tags ({selectedTags.length})
        </button>
        <button
          onClick={() => setActivePanel('plotBlocks')}
          className={cn(
            'flex-1 py-3 text-center font-medium',
            activePanel === 'plotBlocks' &&
              'border-b-2 border-blue-500 text-blue-600'
          )}
        >
          Tropes ({selectedPlotBlocks.length})
        </button>
        <button
          onClick={() => setActivePanel('preview')}
          className={cn(
            'flex-1 py-3 text-center font-medium',
            activePanel === 'preview' &&
              'border-b-2 border-blue-500 text-blue-600'
          )}
        >
          Preview
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activePanel === 'tags' && (
          <div className="grid grid-cols-2 gap-2">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleTagTap(tag.id)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left touch-action-manipulation transition-colors',
                  selectedTags.includes(tag.id)
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                )}
              >
                <span className="text-sm font-medium">{tag.name}</span>
                {tag.category && (
                  <span className="block text-xs text-gray-500 mt-1">
                    {tag.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {activePanel === 'plotBlocks' && (
          <div className="grid grid-cols-1 gap-2">
            {availablePlotBlocks.map(block => (
              <button
                key={block.id}
                onClick={() => handlePlotBlockTap(block.id)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left touch-action-manipulation transition-colors',
                  selectedPlotBlocks.includes(block.id)
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                )}
              >
                <span className="text-sm font-medium">{block.name}</span>
                {block.description && (
                  <span className="block text-xs text-gray-500 mt-1">
                    {block.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {activePanel === 'preview' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Pathway Name
              </label>
              <input
                type="text"
                value={pathwayName}
                onChange={e => setPathwayName(e.target.value)}
                className="w-full p-3 border rounded-lg text-base"
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
                className="w-full p-3 border rounded-lg text-base"
                rows={3}
                placeholder="Describe your pathway"
              />
            </div>

            <div>
              <h4 className="font-medium mb-2">
                Selected Tags ({selectedTags.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tagId => {
                  const tag = availableTags.find(t => t.id === tagId);
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag?.name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">
                Selected Tropes ({selectedPlotBlocks.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedPlotBlocks.map(blockId => {
                  const block = availablePlotBlocks.find(b => b.id === blockId);
                  return (
                    <span
                      key={blockId}
                      className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {block?.name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Validation Status</h4>
              {validationErrors.length === 0 ? (
                <div className="p-3 bg-green-100 text-green-800 rounded-lg">
                  ✓ No validation errors
                </div>
              ) : (
                <div className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-red-100 text-red-800 rounded-lg text-sm"
                    >
                      {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t p-4 bg-white sticky bottom-0">
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium touch-action-manipulation"
          >
            Validate
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium touch-action-manipulation disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
