'use client';

import React from 'react';

// Import our discovery components
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
  return (
    <div className={`desktop-interface h-screen hidden lg:flex ${className}`}>
      {/* Left Panel: Selection */}
      <div className="w-1/3 min-w-[400px] max-w-[500px] bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Build Your Story
          </h2>
          <div className="text-sm text-gray-500">
            Fandom selector placeholder
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Tags</h3>
              <div className="text-sm text-gray-500">
                Tags interface placeholder
              </div>
            </div>

            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">
                Plot Blocks
              </h3>
              <div className="text-sm text-gray-500">
                Plot blocks interface placeholder
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Panel: Pathway Builder */}
      <div className="w-1/3 min-w-[300px] max-w-[400px] bg-white border-r border-gray-200 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Pathway</h2>
          <p className="text-sm text-gray-600 mt-1">
            Drag elements here or use the selection tools
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="p-6 h-full">
            <div className="text-sm text-gray-500">
              Pathway builder placeholder
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 min-w-[400px] bg-gray-50 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Discover Stories
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Existing stories and new prompts based on your pathway
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="p-6 h-full">
            <div className="text-sm text-gray-500">
              Story results placeholder
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesktopInterface;
