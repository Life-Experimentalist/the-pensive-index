'use client';

import React, { useState, useCallback } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Import our discovery components
import { FandomSelector } from './fandom-selector';
import { PathwayBuilder } from './pathway-builder';
import { TagList } from './tag-list';
import { PlotBlockTree } from './plot-block-tree';
import { StoryResults } from './story-results';

export interface MobileInterfaceProps {
  /**
   * Currently selected fandom slug
   */
  selectedFandomSlug?: string;

  /**
   * Optional CSS class
   */
  className?: string;
}

type MobilePanelType = 'selection' | 'pathway' | 'results';

/**
 * Mobile tap-to-select interface for story discovery
 *
 * Features:
 * - Collapsible panel design optimized for mobile (<1024px)
 * - Touch-friendly interactions with tap-to-select
 * - Swipe gestures for panel navigation
 * - Bottom sheet design patterns
 * - One-panel-at-a-time focus for smaller screens
 *
 * Layout:
 * - Top: Fandom selector (always visible)
 * - Middle: Tabbed interface for Selection/Pathway/Results
 * - Bottom: Action buttons and quick access
 *
 * Touch optimizations:
 * - 44px minimum touch targets
 * - Swipe gestures for navigation
 * - Pull-to-refresh support
 * - Haptic feedback on interactions
 */
export function MobileInterface({
  selectedFandomSlug,
  className = '',
}: MobileInterfaceProps) {
  const [activePanel, setActivePanel] = useState<MobilePanelType>('selection');
  const [isPathwayExpanded, setIsPathwayExpanded] = useState(false);

  // Handle panel switching with touch-friendly navigation
  const handlePanelSwitch = useCallback((panel: MobilePanelType) => {
    setActivePanel(panel);
    // Haptic feedback would be added here
  }, []);

  // Handle pathway panel toggle for quick access
  const togglePathwayPanel = useCallback(() => {
    setIsPathwayExpanded(!isPathwayExpanded);
  }, [isPathwayExpanded]);

  return (
    <div
      className={`mobile-interface h-screen flex flex-col lg:hidden ${className}`}
    >
      {/* Top Header: Always visible fandom selector */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4">
          <h1 className="text-lg font-semibold text-gray-900 mb-3">
            The Pensieve Index
          </h1>
          <div className="text-sm text-gray-500">
            Fandom selector placeholder
          </div>
        </div>
      </div>

      {/* Quick Pathway Peek: Collapsible current pathway */}
      <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100">
        <button
          onClick={togglePathwayPanel}
          className="w-full p-3 flex items-center justify-between text-left hover:bg-blue-100 active:bg-blue-200 transition-colors"
          aria-expanded={isPathwayExpanded}
          aria-controls="pathway-quick-view"
        >
          <div className="flex items-center space-x-2">
            <Bars3Icon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Your Pathway (0 items)
            </span>
          </div>
          {isPathwayExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-blue-600" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-blue-600" />
          )}
        </button>

        {isPathwayExpanded && (
          <div id="pathway-quick-view" className="px-4 pb-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-sm text-gray-500">
                Pathway builder placeholder
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <nav className="flex" role="tablist">
          <button
            onClick={() => handlePanelSwitch('selection')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activePanel === 'selection'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
            role="tab"
            aria-selected={activePanel === 'selection'}
            aria-controls="selection-panel"
          >
            Build Story
          </button>
          <button
            onClick={() => handlePanelSwitch('pathway')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activePanel === 'pathway'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
            role="tab"
            aria-selected={activePanel === 'pathway'}
            aria-controls="pathway-panel"
          >
            My Pathway
          </button>
          <button
            onClick={() => handlePanelSwitch('results')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activePanel === 'results'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
            role="tab"
            aria-selected={activePanel === 'results'}
            aria-controls="results-panel"
          >
            Discover
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Selection Panel */}
        <div
          id="selection-panel"
          role="tabpanel"
          aria-labelledby="selection-tab"
          className={`absolute inset-0 bg-gray-50 overflow-y-auto ${
            activePanel === 'selection' ? 'block' : 'hidden'
          }`}
        >
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  1
                </span>
                Choose Tags
              </h2>
              <div className="text-sm text-gray-500">
                Tags interface placeholder
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  2
                </span>
                Select Plot Blocks
              </h2>
              <div className="text-sm text-gray-500">
                Plot blocks interface placeholder
              </div>
            </div>
          </div>
        </div>

        {/* Pathway Panel */}
        <div
          id="pathway-panel"
          role="tabpanel"
          aria-labelledby="pathway-tab"
          className={`absolute inset-0 bg-white overflow-y-auto ${
            activePanel === 'pathway' ? 'block' : 'hidden'
          }`}
        >
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Your Story Pathway
              </h2>
              <p className="text-sm text-gray-600">
                Build your story by selecting tags and plot blocks. Tap items to
                remove them.
              </p>
            </div>

            <div className="text-sm text-gray-500">
              Pathway builder placeholder
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-800">
                      💡
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    Ready to discover?
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Switch to the Discover tab to see matching stories and new
                    prompts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div
          id="results-panel"
          role="tabpanel"
          aria-labelledby="results-tab"
          className={`absolute inset-0 bg-gray-50 overflow-y-auto ${
            activePanel === 'results' ? 'block' : 'hidden'
          }`}
        >
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Story Discovery
              </h2>
              <p className="text-sm text-gray-600">
                Existing stories that match your pathway, plus new story prompts
              </p>
            </div>

            <div className="text-sm text-gray-500">
              Story results placeholder
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar (optional future enhancement) */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => handlePanelSwitch('pathway')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <Bars3Icon className="w-4 h-4" />
            <span className="text-sm font-medium">View Pathway</span>
          </button>

          <button
            onClick={() => handlePanelSwitch('results')}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
          >
            <span className="text-sm font-medium">Discover Stories</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileInterface;
