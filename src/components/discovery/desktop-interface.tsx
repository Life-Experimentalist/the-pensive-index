'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';

// Import types and components
import type { Fandom } from '@/types';
import { FandomSelector } from './fandom-selector';
import { PathwayBuilder } from './pathway-builder';
import { TagList } from './tag-list';
import { PlotBlockTree } from './plot-block-tree';
import { StoryResults } from './story-results';

export interface DesktopInterfaceProps {
  /**
   * Currently selected fandom slug
   */
  selectedFandomSlug?: string;

  /**
   * Optional CSS class
   */
  className?: string;
}

/**
 * Desktop three-panel interface for story discovery
 *
 * Features:
 * - Three-panel layout (Selection | Pathway | Results)
 * - Responsive design optimized for desktop (>=1024px)
 * - Orchestrates individual discovery components
 * - Maintains focus management for accessibility
 *
 * Layout:
 * - Left panel (400px min): Fandom selection and element browsing
 * - Center panel (300px min): Pathway building interface
 * - Right panel (400px min): Story results and prompts
 *
 * Performance targets:
 * - 60fps smooth scrolling in all panels
 * - <200ms component state updates
 * - Efficient panel resizing on window changes
 */
export function DesktopInterface({
  selectedFandomSlug,
  className = '',
}: DesktopInterfaceProps) {
  const [selectedFandom, setSelectedFandom] = useState<Fandom | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlotBlocks, setSelectedPlotBlocks] = useState<string[]>([]);

  const handleFandomSelect = useCallback((fandom: Fandom) => {
    setSelectedFandom(fandom);
    // Reset selections when fandom changes
    setSelectedTags([]);
    setSelectedPlotBlocks([]);
  }, []);

  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handlePlotBlockToggle = useCallback((blockId: string) => {
    setSelectedPlotBlocks(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  }, []);

  return (
    <div className={`desktop-interface h-screen hidden lg:flex ${className}`}>
      {/* Left Panel: Selection */}
      <div className="w-1/3 min-w-[400px] max-w-[500px] bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground mb-0">
              Build Your Story
            </h2>
            <div className="flex gap-3 items-center">
              <Link
                href="/pathway"
                className="text-sm text-foreground/70 hover:underline"
              >
                Pathway
              </Link>
              <Link
                href="/fandom"
                className="text-sm text-foreground/70 hover:underline"
              >
                Fandoms
              </Link>
            </div>
          </div>

          {/* Only render the global FandomSelector when not on a fandom-specific route */}
          {!selectedFandomSlug ? (
            <div className="mt-4">
              <FandomSelector
                selectedFandomId={selectedFandom?.id}
                onFandomSelect={handleFandomSelect}
              />
            </div>
          ) : (
            <div className="mt-3 text-sm text-foreground/70">
              Viewing fandom:{' '}
              <span className="font-medium">{selectedFandomSlug}</span>
              <Link
                href="/fandom"
                className="ml-3 text-sm text-foreground/80 hover:underline"
              >
                ← Back to fandom list
              </Link>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-md font-medium text-foreground mb-4">Tags</h3>
              {selectedFandom ? (
                <div className="text-sm text-foreground/70 bg-blue-50 p-4 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">
                    ✨ Tag Selection Coming Soon
                  </p>
                  <p className="text-blue-700">
                    Interactive tag selection with filtering and search is being
                    implemented. The TagList component will be fully functional
                    soon!
                  </p>
                </div>
              ) : (
                <p className="text-sm text-foreground/60 italic">
                  Select a fandom to view tags
                </p>
              )}
            </div>

            <div>
              <h3 className="text-md font-medium text-foreground mb-4">
                Tropes
              </h3>
              {selectedFandom ? (
                <div className="text-sm text-foreground/70 bg-blue-50 p-4 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">
                    ✨ Trope Tree Coming Soon
                  </p>
                  <p className="text-blue-700">
                    Expandable trope tree with dependencies and conflicts is
                    being implemented. The PlotBlockTree component will be fully
                    functional soon!
                  </p>
                </div>
              ) : (
                <p className="text-sm text-foreground/60 italic">
                  Select a fandom to view tropes
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Center Panel: Pathway Builder */}
      <div className="w-1/3 min-w-[300px] max-w-[400px] bg-card border-r border-gray-200 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-foreground">
            Your Pathway
          </h2>
          <p className="text-sm text-foreground/70 mt-1">
            Selected elements will appear here
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="p-6 h-full">
            {selectedFandom ? (
              <div className="text-sm text-foreground/70 bg-green-50 p-4 rounded-md border border-green-200">
                <p className="font-medium text-green-900 mb-2">
                  ✨ Pathway Builder Coming Soon
                </p>
                <p className="text-green-700">
                  Drag-and-drop pathway building with visual feedback and
                  validation is being implemented. The PathwayBuilder component
                  will be fully functional soon!
                </p>
              </div>
            ) : (
              <p className="text-sm text-foreground/60 italic text-center mt-8">
                Select a fandom and tags/plot blocks to build your pathway
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 min-w-[400px] bg-gray-50 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-foreground">
            Discover Stories
          </h2>
          <p className="text-sm text-foreground/70 mt-1">
            Existing stories and new prompts based on your pathway
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="p-6 h-full">
            {selectedFandom ? (
              <div className="text-sm text-foreground/70 bg-purple-50 p-4 rounded-md border border-purple-200">
                <p className="font-medium text-purple-900 mb-2">
                  ✨ Story Results Coming Soon
                </p>
                <p className="text-purple-700">
                  Story search with relevance scoring and prompt generation is
                  being implemented. The StoryResults component will be fully
                  functional soon!
                </p>
              </div>
            ) : (
              <p className="text-sm text-foreground/60 italic text-center mt-8">
                Build a pathway to discover matching stories
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesktopInterface;
