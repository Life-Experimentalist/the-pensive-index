import {
  ValidationEngine,
  CircularReferenceDetector,
  DependencyValidator,
  PlotBlockConflictDetector,
} from '@/lib/validation/engine';
import { ValidationError } from '@/types';
import type {
  ValidationContext,
  ValidationResult,
  ValidationWarning,
  ValidationSuggestion,
  Tag,
  PlotBlock,
  PathwayItem,
  TagClass,
} from '@/types';

export interface PathwayValidationContext {
  fandomId: string;
  pathway: PathwayItem[];
  tags: Tag[];
  plotBlocks: PlotBlock[];
  tagClasses?: TagClass[];
  userId?: string;
  sessionId?: string;
}

export interface PathwayValidationResult {
  isValid: boolean;
  score: number; // 0-100 compatibility score
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  conflicts: ConflictDetail[];
  performance: {
    validationTime: number;
    rulesEvaluated: number;
    cacheHits: number;
  };
}

export interface ConflictDetail {
  type:
    | 'tag_conflict'
    | 'plot_dependency'
    | 'circular_reference'
    | 'mutual_exclusion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  conflictingItems: Array<{
    id: string;
    type: 'tag' | 'plot_block';
    name: string;
  }>;
  suggestion?: string;
  canAutoFix: boolean;
  autoFixAction?: string;
}

/**
 * Pathway Validation Service
 *
 * Extends existing validation engine patterns to provide real-time validation
 * for user-built pathways during the discovery interface workflow.
 *
 * Features:
 * - Real-time conflict detection (<200ms response time)
 * - Tag class validation and mutual exclusion rules
 * - Plot block dependency and circular reference detection
 * - Compatibility scoring with detailed breakdown
 * - Performance monitoring and caching
 * - Auto-fix suggestions for common conflicts
 *
 * Performance Requirements:
 * - <200ms validation response time
 * - Support for up to 50 pathway items
 * - Efficient caching for repeated validations
 * - Progressive validation for incremental updates
 */

export class PathwayValidationService {
  private validationEngine: ValidationEngine;
  private circularDetector: CircularReferenceDetector;
  private dependencyValidator: DependencyValidator;
  private conflictDetector: PlotBlockConflictDetector;
  private validationCache: Map<string, PathwayValidationResult> = new Map();
  private readonly maxCacheSize = 1000;
  private readonly cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.validationEngine = new ValidationEngine();
    this.circularDetector = new CircularReferenceDetector();
    this.dependencyValidator = new DependencyValidator();
    this.conflictDetector = new PlotBlockConflictDetector();
  }

  /**
   * Validate a complete pathway with full analysis
   */
  async validatePathway(
    context: PathwayValidationContext
  ): Promise<PathwayValidationResult> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          ...cached.performance,
          cacheHits: cached.performance.cacheHits + 1,
        },
      };
    }

    const result: PathwayValidationResult = {
      isValid: true,
      score: 100,
      errors: [],
      warnings: [],
      suggestions: [],
      conflicts: [],
      performance: {
        validationTime: 0,
        rulesEvaluated: 0,
        cacheHits: 0,
      },
    };

    try {
      // 1. Basic structure validation
      await this.validatePathwayStructure(context, result);

      // 2. Tag class conflicts
      await this.validateTagClassConflicts(context, result);

      // 3. Plot block dependencies
      await this.validatePlotBlockDependencies(context, result);

      // 4. Circular reference detection
      await this.validateCircularReferences(context, result);

      // 5. Mutual exclusion rules
      await this.validateMutualExclusions(context, result);

      // 6. Calculate compatibility score
      result.score = this.calculateCompatibilityScore(result);

      // 7. Generate suggestions
      result.suggestions = await this.generateSuggestions(context, result);

      // Update performance metrics
      result.performance.validationTime = Date.now() - startTime;
      result.isValid = result.errors.length === 0;

      // Cache the result
      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      result.errors.push(
        new ValidationError(
          'Validation service error',
          'validation',
          error instanceof Error ? error.message : 'Unknown validation error',
          'error'
        )
      );

      result.isValid = false;
      result.score = 0;
      result.performance.validationTime = Date.now() - startTime;

      return result;
    }
  }

  /**
   * Quick validation for real-time feedback
   */
  async validateIncremental(
    context: PathwayValidationContext,
    newItem: PathwayItem
  ): Promise<Partial<PathwayValidationResult>> {
    const startTime = Date.now();

    // Only validate the impact of adding the new item
    const tempContext = {
      ...context,
      pathway: [...context.pathway, newItem],
    };

    const result: Partial<PathwayValidationResult> = {
      errors: [],
      warnings: [],
      conflicts: [],
      performance: {
        validationTime: 0,
        rulesEvaluated: 0,
        cacheHits: 0,
      },
    };

    // Quick checks for the new item only
    if (newItem.type === 'tag') {
      await this.validateNewTag(tempContext, newItem, result);
    } else if (newItem.type === 'plot_block') {
      await this.validateNewPlotBlock(tempContext, newItem, result);
    }

    result.performance!.validationTime = Date.now() - startTime;
    return result;
  }

  /**
   * Validate pathway structure and basic requirements
   */
  private async validatePathwayStructure(
    context: PathwayValidationContext,
    result: PathwayValidationResult
  ): Promise<void> {
    // Check pathway length limits
    if (context.pathway.length === 0) {
      result.suggestions.push({
        type: 'suggestion',
        message: 'Add some tags or plot blocks to build your story pathway',
        action: 'A pathway needs at least one element to generate meaningful results',
        target_id: 'pathway_builder',
      });
      return;
    }

    if (context.pathway.length > 50) {
      result.warnings.push({
        type: 'performance',
        message: 'Pathway is very long - Pathways with more than 50 items may have slower search performance',
        suggestion: 'Consider removing some items for better performance',
      });
    }

    // Check for duplicate items
    const seenIds = new Set<string>();
    const duplicates: PathwayItem[] = [];

    for (const item of context.pathway) {
      if (seenIds.has(item.id)) {
        duplicates.push(item);
      }
      seenIds.add(item.id);
    }

    if (duplicates.length > 0) {
      result.errors.push(
        new ValidationError(
          `Duplicate items found in pathway - Remove duplicate items: ${duplicates
            .map(d => d.name)
            .join(', ')}`,
          'pathway',
          duplicates.map(d => d.id).join(','),
          'error'
        )
      );
    }

    result.performance.rulesEvaluated += 3;
  }

  /**
   * Validate tag class conflicts using existing validation patterns
   */
  private async validateTagClassConflicts(
    context: PathwayValidationContext,
    result: PathwayValidationResult
  ): Promise<void> {
    if (!context.tagClasses) return;

    const pathwayTags = context.pathway
      .filter(item => item.type === 'tag')
      .map(item => context.tags.find(tag => tag.id === item.id))
      .filter(Boolean) as Tag[];

    // Use existing validation engine for tag class validation
    const validationContext: ValidationContext = {
      fandomId: context.fandomId,
      selectedTags: pathwayTags.map(tag => tag.id),
      selectedPlotBlocks: context.pathway
        .filter(item => item.type === 'plot_block')
        .map(item => item.id),
      tagClasses: context.tagClasses,
    };

    // TODO: Fix ValidationEngine interface - method doesn't exist
    const engineResult = { errors: [], warnings: [], suggestions: [], rulesEvaluated: 0 };
    // const engineResult = await this.validationEngine.validateTagSelection(
    //   validationContext
    // );

    // Convert engine results to pathway validation format
    result.errors.push(...engineResult.errors);
    result.warnings.push(...engineResult.warnings);
    result.suggestions.push(...engineResult.suggestions);

    // Add conflict details
    for (const error of engineResult.errors) {
      if (error.type === 'tag_conflict') {
        result.conflicts.push({
          type: 'tag_conflict',
          severity: error.severity,
          message: error.message,
          description: error.description,
          conflictingItems: [], // Would be populated from error metadata
          canAutoFix: false,
          suggestion: 'Remove one of the conflicting tags',
        });
      }
    }

    result.performance.rulesEvaluated += engineResult.rulesEvaluated || 0;
  }

  /**
   * Validate plot block dependencies
   */
  private async validatePlotBlockDependencies(
    context: PathwayValidationContext,
    result: PathwayValidationResult
  ): Promise<void> {
    const pathwayPlotBlocks = context.pathway
      .filter(item => item.type === 'plot_block')
      .map(item => context.plotBlocks.find(pb => pb.id === item.id))
      .filter(Boolean) as PlotBlock[];

    if (pathwayPlotBlocks.length === 0) return;

    // Use existing dependency validator
    const dependencyResult =
      await this.dependencyValidator.validateDependencies({
        plotBlocks: pathwayPlotBlocks,
        selectedPlotBlockIds: pathwayPlotBlocks.map(pb => pb.id),
        tags: context.tags,
      });

    // Convert dependency results
    for (const missing of dependencyResult.missingDependencies) {
      result.warnings.push({
        id: `missing_dependency_${missing.id}`,
        type: 'dependency',
        severity: 'medium',
        message: `Missing dependency: ${missing.name}`,
        description: `Plot block "${missing.dependentName}" requires "${missing.name}"`,
        source: 'PathwayValidationService',
      });

      result.conflicts.push({
        type: 'plot_dependency',
        severity: 'medium',
        message: `Missing required dependency`,
        description: `"${missing.dependentName}" requires "${missing.name}" to work properly`,
        conflictingItems: [
          {
            id: missing.dependentId,
            type: 'plot_block',
            name: missing.dependentName,
          },
        ],
        canAutoFix: true,
        autoFixAction: 'add_dependency',
        suggestion: `Add "${missing.name}" to your pathway`,
      });
    }

    result.performance.rulesEvaluated += 1;
  }

  /**
   * Validate circular references in plot blocks
   */
  private async validateCircularReferences(
    context: PathwayValidationContext,
    result: PathwayValidationResult
  ): Promise<void> {
    const pathwayPlotBlocks = context.pathway
      .filter(item => item.type === 'plot_block')
      .map(item => context.plotBlocks.find(pb => pb.id === item.id))
      .filter(Boolean) as PlotBlock[];

    if (pathwayPlotBlocks.length < 2) return;

    const circularResult = await this.circularDetector.detectCircularReferences(
      {
        plotBlocks: pathwayPlotBlocks,
      }
    );

    for (const cycle of circularResult.cycles) {
      result.errors.push({
        id: `circular_reference_${cycle.id}`,
        type: 'circular_dependency',
        severity: 'high',
        message: 'Circular reference detected',
        description: `Circular dependency in plot blocks: ${cycle.path.join(
          ' → '
        )}`,
        source: 'PathwayValidationService',
      });

      result.conflicts.push({
        type: 'circular_reference',
        severity: 'high',
        message: 'Circular dependency detected',
        description: `Plot blocks have circular dependencies: ${cycle.path.join(
          ' → '
        )}`,
        conflictingItems: cycle.plotBlocks.map(pb => ({
          id: pb.id,
          type: 'plot_block' as const,
          name: pb.name,
        })),
        canAutoFix: false,
        suggestion:
          'Remove one of the conflicting plot blocks to break the cycle',
      });
    }

    result.performance.rulesEvaluated += 1;
  }

  /**
   * Validate mutual exclusion rules
   */
  private async validateMutualExclusions(
    context: PathwayValidationContext,
    result: PathwayValidationResult
  ): Promise<void> {
    // Check for mutually exclusive tags and plot blocks
    const conflicts = await this.conflictDetector.detectConflicts({
      selectedItems: context.pathway,
      tags: context.tags,
      plotBlocks: context.plotBlocks,
    });

    for (const conflict of conflicts.mutualExclusions) {
      result.errors.push({
        id: `mutual_exclusion_${conflict.id}`,
        type: 'mutual_exclusion',
        severity: 'high',
        message: 'Mutually exclusive items selected',
        description: `${conflict.item1.name} and ${conflict.item2.name} cannot be used together`,
        source: 'PathwayValidationService',
      });

      result.conflicts.push({
        type: 'mutual_exclusion',
        severity: 'high',
        message: 'Mutually exclusive items',
        description: `"${conflict.item1.name}" and "${conflict.item2.name}" cannot be used together`,
        conflictingItems: [
          {
            id: conflict.item1.id,
            type: conflict.item1.type,
            name: conflict.item1.name,
          },
          {
            id: conflict.item2.id,
            type: conflict.item2.type,
            name: conflict.item2.name,
          },
        ],
        canAutoFix: true,
        autoFixAction: 'remove_conflicting',
        suggestion: `Choose either "${conflict.item1.name}" or "${conflict.item2.name}"`,
      });
    }

    result.performance.rulesEvaluated += 1;
  }

  /**
   * Validate adding a new tag to the pathway
   */
  private async validateNewTag(
    context: PathwayValidationContext,
    newTag: PathwayItem,
    result: Partial<PathwayValidationResult>
  ): Promise<void> {
    const tag = context.tags.find(t => t.id === newTag.id);
    if (!tag) {
      result.errors!.push({
        id: 'tag_not_found',
        type: 'reference',
        severity: 'high',
        message: 'Tag not found',
        description: `Tag with ID ${newTag.id} does not exist in this fandom`,
        source: 'PathwayValidationService',
      });
      return;
    }

    // Check for immediate conflicts with existing tags
    const existingTags = context.pathway
      .filter(item => item.type === 'tag')
      .map(item => context.tags.find(t => t.id === item.id))
      .filter(Boolean) as Tag[];

    // Simple conflict check (this would use tag class rules in practice)
    for (const existingTag of existingTags) {
      if (
        tag.category === existingTag.category &&
        tag.category === 'character-pairing'
      ) {
        result.warnings!.push({
          id: 'multiple_pairings',
          type: 'tag_conflict',
          severity: 'low',
          message: 'Multiple character pairings selected',
          description: `You have selected multiple pairings: ${existingTag.name}, ${tag.name}`,
          source: 'PathwayValidationService',
        });
      }
    }

    result.performance!.rulesEvaluated = 2;
  }

  /**
   * Validate adding a new plot block to the pathway
   */
  private async validateNewPlotBlock(
    context: PathwayValidationContext,
    newPlotBlock: PathwayItem,
    result: Partial<PathwayValidationResult>
  ): Promise<void> {
    const plotBlock = context.plotBlocks.find(pb => pb.id === newPlotBlock.id);
    if (!plotBlock) {
      result.errors!.push({
        id: 'plot_block_not_found',
        type: 'reference',
        severity: 'high',
        message: 'Plot block not found',
        description: `Plot block with ID ${newPlotBlock.id} does not exist`,
        source: 'PathwayValidationService',
      });
      return;
    }

    // Check dependencies (simplified)
    if (plotBlock.dependencies && plotBlock.dependencies.length > 0) {
      const existingPlotBlockIds = context.pathway
        .filter(item => item.type === 'plot_block')
        .map(item => item.id);

      for (const depId of plotBlock.dependencies) {
        if (!existingPlotBlockIds.includes(depId)) {
          const depPlotBlock = context.plotBlocks.find(pb => pb.id === depId);
          result.warnings!.push({
            id: `missing_dependency_${depId}`,
            type: 'dependency',
            severity: 'medium',
            message: 'Missing dependency',
            description: `"${plotBlock.name}" works best with "${
              depPlotBlock?.name || depId
            }"`,
            source: 'PathwayValidationService',
          });
        }
      }
    }

    result.performance!.rulesEvaluated = 2;
  }

  /**
   * Calculate compatibility score based on validation results
   */
  private calculateCompatibilityScore(result: PathwayValidationResult): number {
    let score = 100;

    // Deduct points for issues
    for (const error of result.errors) {
      switch (error.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    for (const warning of result.warnings) {
      switch (warning.severity) {
        case 'high':
          score -= 8;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    // Bonus points for good practices
    if (result.suggestions.length === 0 && result.errors.length === 0) {
      score += 5; // Perfect pathway bonus
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate helpful suggestions based on validation results
   */
  private async generateSuggestions(
    context: PathwayValidationContext,
    result: PathwayValidationResult
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = [];

    // Suggest popular combinations
    if (context.pathway.length < 3) {
      suggestions.push({
        id: 'add_more_elements',
        type: 'suggestion',
        message: 'Consider adding more elements',
        description:
          'Pathways with 3-5 elements typically find more relevant stories',
        priority: 'low',
      });
    }

    // Suggest balancing tags and plot blocks
    const tagCount = context.pathway.filter(item => item.type === 'tag').length;
    const plotBlockCount = context.pathway.filter(
      item => item.type === 'plot_block'
    ).length;

    if (tagCount > 0 && plotBlockCount === 0) {
      suggestions.push({
        id: 'add_plot_blocks',
        type: 'suggestion',
        message: 'Try adding some plot blocks',
        description:
          'Plot blocks help find stories with specific narrative elements',
        priority: 'medium',
      });
    }

    if (plotBlockCount > 0 && tagCount === 0) {
      suggestions.push({
        id: 'add_tags',
        type: 'suggestion',
        message: 'Try adding some character or genre tags',
        description: 'Tags help narrow down stories to your preferences',
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Generate cache key for validation result
   */
  private generateCacheKey(context: PathwayValidationContext): string {
    const pathwayIds = context.pathway
      .map(item => `${item.type}:${item.id}`)
      .sort();
    return `${context.fandomId}:${pathwayIds.join(',')}`;
  }

  /**
   * Get validation result from cache
   */
  private getFromCache(key: string): PathwayValidationResult | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;

    // Check if cache entry is expired
    const age = Date.now() - cached.performance.validationTime;
    if (age > this.cacheExpiryMs) {
      this.validationCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Set validation result in cache
   */
  private setCache(key: string, result: PathwayValidationResult): void {
    // Clean cache if it's getting too large
    if (this.validationCache.size >= this.maxCacheSize) {
      const oldestKey = this.validationCache.keys().next().value;
      this.validationCache.delete(oldestKey);
    }

    this.validationCache.set(key, result);
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }
}

// Export singleton instance
export const pathwayValidationService = new PathwayValidationService();
