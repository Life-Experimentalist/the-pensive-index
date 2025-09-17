import {
  ValidationContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  TagClass,
  PlotBlock,
} from '@/types';

/**
 * Core validation engine for The Pensieve Index
 * Handles tag conflicts, plot block dependencies, and business rule validation
 */
export class ValidationEngine {
  private tagClasses: Map<string, TagClass> = new Map();
  private plotBlocks: Map<string, PlotBlock> = new Map();

  constructor(tagClasses: TagClass[] = [], plotBlocks: PlotBlock[] = []) {
    this.loadTagClasses(tagClasses);
    this.loadPlotBlocks(plotBlocks);
  }

  /**
   * Load tag classes into the engine
   */
  public loadTagClasses(tagClasses: TagClass[]): void {
    this.tagClasses.clear();
    for (const tagClass of tagClasses) {
      this.tagClasses.set(tagClass.id, tagClass);
    }
  }

  /**
   * Load plot blocks into the engine
   */
  public loadPlotBlocks(plotBlocks: PlotBlock[]): void {
    this.plotBlocks.clear();
    for (const plotBlock of plotBlocks) {
      this.plotBlocks.set(plotBlock.id, plotBlock);
    }
  }

  /**
   * Validate a complete selection context
   */
  public validate(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Validate tag class rules
    const tagClassResult = this.validateTagClasses(context);
    errors.push(...tagClassResult.errors);
    warnings.push(...tagClassResult.warnings);
    if (tagClassResult.suggestions) {
      suggestions.push(...tagClassResult.suggestions);
    }

    // Validate plot block dependencies
    const plotBlockResult = this.validatePlotBlocks(context);
    errors.push(...plotBlockResult.errors);
    warnings.push(...plotBlockResult.warnings);
    if (plotBlockResult.suggestions) {
      suggestions.push(...plotBlockResult.suggestions);
    }

    // Check for circular dependencies
    const circularResult = this.checkCircularDependencies(context);
    errors.push(...circularResult.errors);
    warnings.push(...circularResult.warnings);
    if (circularResult.suggestions) {
      suggestions.push(...circularResult.suggestions);
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate tag class rules (mutual exclusion, instance limits)
   */
  private validateTagClasses(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Group tags by their classes
    const tagsByClass = new Map<string, string[]>();

    for (const tagId of context.applied_tags) {
      // In a real implementation, we'd need to look up each tag's class
      // For now, this is a placeholder that assumes tag IDs contain class info
      const tagClass = this.getTagClassForTag(tagId);
      if (tagClass) {
        if (!tagsByClass.has(tagClass)) {
          tagsByClass.set(tagClass, []);
        }
        tagsByClass.get(tagClass)!.push(tagId);
      }
    }

    // Check each tag class for violations
    for (const [classId, tags] of tagsByClass) {
      const tagClass = this.tagClasses.get(classId);
      if (!tagClass) continue;

      // Check mutual exclusion
      if (tagClass.validation_rules?.mutual_exclusion?.within_class) {
        const conflictingTags =
          tagClass.validation_rules.mutual_exclusion.conflicting_tags || [];
        const selectedConflicting = tags.filter(tag =>
          conflictingTags.includes(tag)
        );
        if (selectedConflicting.length > 1) {
          errors.push({
            type: 'mutual_exclusion_violation',
            name: 'mutual_exclusion_violation',
            message: `Multiple mutually exclusive tags selected from ${
              tagClass.name
            }: ${selectedConflicting.join(', ')}`,
            field: 'tags',
            value: selectedConflicting,
            severity: 'error',
          });
          suggestions.push({
            type: 'remove_conflicting_tags',
            message: `Remove all but one tag from: ${selectedConflicting.join(
              ', '
            )}`,
            action: 'remove_tags',
            alternative_ids: selectedConflicting.slice(1),
          });
        }
      }

      // Check instance limits
      if (tagClass.validation_rules?.instance_limits) {
        const maxInstances =
          tagClass.validation_rules.instance_limits.max_instances;
        if (typeof maxInstances === 'number' && tags.length > maxInstances) {
          errors.push({
            type: 'instance_limit_exceeded',
            name: 'instance_limit_exceeded',
            message: `Too many ${tagClass.name} tags selected (${tags.length}). Maximum allowed: ${maxInstances}`,
            field: 'tags',
            value: tags,
            severity: 'error',
          });
          suggestions.push({
            type: 'reduce_tag_count',
            message: `Remove ${tags.length - maxInstances} ${
              tagClass.name
            } tags`,
            action: 'remove_tags',
            alternative_ids: tags.slice(maxInstances),
          });
        }
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate plot block dependencies and conflicts
   */
  private validatePlotBlocks(context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // For now, just validate the single plot block in context if present
    if (context.plot_block) {
      const plotBlock = context.plot_block;

      // Check dependencies (using requires property)
      if (plotBlock.requires && plotBlock.requires.length > 0) {
        for (const depId of plotBlock.requires) {
          // In a real implementation, we'd check if dependent blocks are selected
          warnings.push({
            type: 'dependency_check',
            message: `Plot block "${plotBlock.name}" has dependency: ${depId}`,
            field: 'plot_blocks',
            suggestion: `Ensure dependent plot block is selected: ${depId}`,
          });
        }
      }

      // Check conflicts (using conflicts_with property)
      if (plotBlock.conflicts_with && plotBlock.conflicts_with.length > 0) {
        for (const conflictId of plotBlock.conflicts_with) {
          warnings.push({
            type: 'conflict_check',
            message: `Plot block "${plotBlock.name}" conflicts with: ${conflictId}`,
            field: 'plot_blocks',
            suggestion: `Avoid selecting conflicting plot block: ${conflictId}`,
          });
        }
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Check for circular dependencies in plot blocks
   */
  private checkCircularDependencies(
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // For now, this is a placeholder implementation
    // In a real implementation, we'd need access to all selected plot blocks
    if (context.plot_block) {
      // Basic circular dependency check would require the full selection context
      // This is a simplified version
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get the tag class for a given tag (placeholder implementation)
   */
  private getTagClassForTag(tagId: string): string | null {
    // In a real implementation, this would look up the tag's class from the database
    // For now, return null as a placeholder
    return null;
  }

  /**
   * Get performance metrics for the validation engine
   */
  public getPerformanceMetrics(): {
    tag_classes_loaded: number;
    plot_blocks_loaded: number;
    memory_usage: string;
  } {
    return {
      tag_classes_loaded: this.tagClasses.size,
      plot_blocks_loaded: this.plotBlocks.size,
      memory_usage: `${Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024
      )}MB`,
    };
  }

  /**
   * Clear all loaded data (useful for testing)
   */
  public clear(): void {
    this.tagClasses.clear();
    this.plotBlocks.clear();
  }

  /**
   * Validate a complete pathway (new method for API)
   */
  public async validatePathway(context: {
    fandom_id: string;
    tags: string[];
    plot_blocks: string[];
    pathway: Array<{ id: string; type: 'tag' | 'plot_block' }>;
  }): Promise<ValidationResult> {
    const validationContext: ValidationContext = {
      applied_tags: context.tags,
      all_tags: [], // Tags would be loaded from database in a real implementation
      tag_classes: Array.from(this.tagClasses.values()),
      metadata: {
        fandom_id: context.fandom_id,
        plot_blocks: context.plot_blocks,
        pathway: context.pathway,
      },
    };

    return this.validate(validationContext);
  }

  /**
   * Check for conflicts between specific items (new method for API)
   */
  public async checkConflicts(context: {
    fandom_id: string;
    items: Array<{ id: string; type: 'tag' | 'plot_block' }>;
  }): Promise<
    Array<{
      item1: { id: string; type: string };
      item2: { id: string; type: string };
      conflict_type: string;
      severity: 'error' | 'warning';
      description: string;
    }>
  > {
    const conflicts = [];

    // Check tag-tag conflicts
    const tagItems = context.items.filter(item => item.type === 'tag');
    for (let i = 0; i < tagItems.length; i++) {
      for (let j = i + 1; j < tagItems.length; j++) {
        const conflict = await this.checkTagConflict(
          tagItems[i].id,
          tagItems[j].id
        );
        if (conflict) {
          conflicts.push({
            item1: tagItems[i],
            item2: tagItems[j],
            conflict_type: conflict.type,
            severity: conflict.severity,
            description: conflict.description,
          });
        }
      }
    }

    // Check plot block conflicts
    const plotBlockItems = context.items.filter(
      item => item.type === 'plot_block'
    );
    for (let i = 0; i < plotBlockItems.length; i++) {
      for (let j = i + 1; j < plotBlockItems.length; j++) {
        const conflict = await this.checkPlotBlockConflict(
          plotBlockItems[i].id,
          plotBlockItems[j].id
        );
        if (conflict) {
          conflicts.push({
            item1: plotBlockItems[i],
            item2: plotBlockItems[j],
            conflict_type: conflict.type,
            severity: conflict.severity,
            description: conflict.description,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check conflict between two tags
   */
  private async checkTagConflict(
    tagId1: string,
    tagId2: string
  ): Promise<{
    type: string;
    severity: 'error' | 'warning';
    description: string;
  } | null> {
    // This would implement actual tag conflict checking logic
    // For now, return null (no conflicts)
    return null;
  }

  /**
   * Check conflict between two plot blocks
   */
  private async checkPlotBlockConflict(
    plotBlockId1: string,
    plotBlockId2: string
  ): Promise<{
    type: string;
    severity: 'error' | 'warning';
    description: string;
  } | null> {
    // This would implement actual plot block conflict checking logic
    // For now, return null (no conflicts)
    return null;
  }
}
