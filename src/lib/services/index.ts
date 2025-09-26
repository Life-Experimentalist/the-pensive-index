/**
 * Services Index
 *
 * Central export point for all business logic services in the discovery interface.
 * These services implement the core functionality that powers the library-first
 * story discovery platform.
 */

// Import services
import {
  PathwayValidationService,
  pathwayValidationService,
} from './pathway-validation';

import { StorySearchService, storySearchService } from './story-search';

import {
  PromptGenerationService,
  promptGenerationService,
} from './prompt-generation';

import {
  RelevanceScoreService,
  relevanceScoreService,
} from './relevance-score';

// Export services
export { PathwayValidationService, pathwayValidationService };
export type {
  PathwayValidationContext,
  PathwayValidationResult,
  ConflictDetail,
} from './pathway-validation';

export { StorySearchService, storySearchService };
export type {
  SearchQuery,
  SearchContext,
  UserPreferences,
  RelevanceFactors,
  SearchStats,
} from './story-search';

export { PromptGenerationService, promptGenerationService };
export type {
  PromptGenerationContext,
  PromptPreferences,
  GeneratedPrompt,
  NoveltyHighlight,
  PromptAnalysis,
} from './prompt-generation';

export { RelevanceScoreService, relevanceScoreService };
export type {
  ScoreWeights,
  ScoringContext,
  UserScoringPreferences,
  FandomMetrics,
  DetailedScore,
  BatchScoringResult,
} from './relevance-score';

/**
 * Service Integration Helper
 *
 * Provides coordinated access to all discovery services with proper
 * initialization and configuration management.
 */
export class DiscoveryServices {
  constructor(
    public readonly validation = pathwayValidationService,
    public readonly search = storySearchService,
    public readonly prompts = promptGenerationService,
    public readonly scoring = relevanceScoreService
  ) {}

  /**
   * Initialize all services with shared configuration
   */
  async initialize(config?: {
    cacheSize?: number;
    performanceMode?: 'fast' | 'balanced' | 'thorough';
    debugMode?: boolean;
  }): Promise<void> {
    // Services are already initialized as singletons
    // This method is available for future configuration needs

    if (config?.debugMode) {
      console.log('Discovery services initialized in debug mode');
    }
  }

  /**
   * Clear all service caches
   */
  clearAllCaches(): void {
    this.validation.clearCache();
    this.scoring.clearCache();
  }

  /**
   * Get performance statistics from all services
   */
  getPerformanceStats(): {
    validation: { cacheSize: number };
    scoring: { size: number; maxSize: number; hitRate: number };
  } {
    return {
      validation: { cacheSize: 0 }, // PathwayValidationService doesn't expose cache stats
      scoring: this.scoring.getCacheStats(),
    };
  }
}

// Export singleton instance
export const discoveryServices = new DiscoveryServices();
