import {
  ValidationContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  TagClass,
  PlotBlock,
  ConflictDetectionContext,
} from '@/types';

import {
  characterWarningTemplates,
  getWarningTemplateByTags,
} from './templates/character-warnings';
import {
  ValidationRuleCompiler,
  ActionExecutionResult,
  ValidationContext as CompilerValidationContext,
} from './rules/compiler';

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

    // Check for character dynamic warnings
    const characterWarningResult = this.validateCharacterDynamics(context);
    errors.push(...characterWarningResult.errors);
    warnings.push(...characterWarningResult.warnings);
    if (characterWarningResult.suggestions) {
      suggestions.push(...characterWarningResult.suggestions);
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

    // Create lookup maps for efficient access
    const tagMap = new Map<string, any>();
    const tagsByClass = new Map<string, string[]>();
    const appliedTagSet = new Set(context.applied_tags);

    // Build tag lookup and grouping
    for (const tag of context.all_tags || []) {
      tagMap.set(tag.name, tag);
      if (tag.tag_class_id) {
        if (!tagsByClass.has(tag.tag_class_id)) {
          tagsByClass.set(tag.tag_class_id, []);
        }
        if (appliedTagSet.has(tag.name)) {
          tagsByClass.get(tag.tag_class_id)!.push(tag.name);
        }
      }
    }

    // Check each tag class for violations
    for (const tagClass of context.tag_classes) {
      const classAppliedTags = tagsByClass.get(tagClass.id) || [];
      const rules = tagClass.validation_rules;

      // Skip if no rules or empty rules
      if (!rules || Object.keys(rules).length === 0) continue;

      // 1. Mutual Exclusion Rules
      if (rules.mutual_exclusion) {
        // Check within-class mutual exclusion
        if (
          rules.mutual_exclusion.within_class &&
          classAppliedTags.length > 1
        ) {
          errors.push({
            type: 'mutual_exclusion_violation',
            name: 'mutual_exclusion_violation',
            message: `Multiple mutually exclusive tags selected from ${
              tagClass.name
            }: ${classAppliedTags.join(', ')}`,
            field: 'tags',
            value: classAppliedTags,
            severity: 'error',
          });
          suggestions.push({
            type: 'remove_conflicting_tags',
            message: `Remove all but one tag from: ${classAppliedTags.join(
              ', '
            )}`,
            action: 'remove_tags',
            alternative_ids: classAppliedTags.slice(1),
          });
        }

        // Check specific conflicting tags
        if (
          rules.mutual_exclusion.conflicting_tags &&
          classAppliedTags.length > 0
        ) {
          for (const conflictingTag of rules.mutual_exclusion
            .conflicting_tags) {
            if (context.applied_tags.includes(conflictingTag)) {
              errors.push({
                type: 'tag_conflict',
                name: 'tag_conflict',
                message: `Conflicting tags selected: ${classAppliedTags.join(
                  ', '
                )} conflicts with ${conflictingTag}`,
                field: 'tags',
                value: [...classAppliedTags, conflictingTag],
                severity: 'error',
              });
            }
          }
        }

        // Check conflicting classes
        if (rules.mutual_exclusion.conflicting_classes) {
          for (const conflictingClass of rules.mutual_exclusion
            .conflicting_classes) {
            const conflictingTags = tagsByClass.get(conflictingClass) || [];
            if (classAppliedTags.length > 0 && conflictingTags.length > 0) {
              errors.push({
                type: 'class_conflict',
                name: 'class_conflict',
                message: `Tags from conflicting classes: ${tagClass.name} and ${conflictingClass}`,
                field: 'tags',
                value: [...classAppliedTags, ...conflictingTags],
                severity: 'error',
              });
            }
          }
        }
      }

      // 2. Instance Limit Rules
      if (rules.instance_limits) {
        const { max_instances, min_instances, exact_instances } =
          rules.instance_limits;

        if (
          typeof max_instances === 'number' &&
          classAppliedTags.length > max_instances
        ) {
          errors.push({
            type: 'instance_limit_exceeded',
            name: 'instance_limit_exceeded',
            message: `Too many ${tagClass.name} tags selected (${classAppliedTags.length}). Maximum allowed: ${max_instances}`,
            field: 'tags',
            value: classAppliedTags,
            severity: 'error',
          });
        }

        // Only check minimum/exact requirements if there are tags from this class
        if (classAppliedTags.length > 0) {
          if (
            typeof min_instances === 'number' &&
            classAppliedTags.length < min_instances
          ) {
            errors.push({
              type: 'instance_limit_minimum',
              name: 'instance_limit_minimum',
              message: `Too few ${tagClass.name} tags selected (${classAppliedTags.length}). At least ${min_instances} required`,
              field: 'tags',
              value: classAppliedTags,
              severity: 'error',
            });
          }

          if (
            typeof exact_instances === 'number' &&
            classAppliedTags.length !== exact_instances
          ) {
            errors.push({
              type: 'instance_limit_exact',
              name: 'instance_limit_exact',
              message: `Incorrect number of ${tagClass.name} tags selected (${classAppliedTags.length}). Exactly ${exact_instances} required`,
              field: 'tags',
              value: classAppliedTags,
              severity: 'error',
            });
          }
        }
      }

      // 3. Required Context Rules
      if (rules.required_context) {
        // Check required tags
        if (
          rules.required_context.required_tags &&
          classAppliedTags.length > 0
        ) {
          for (const requiredTag of rules.required_context.required_tags) {
            if (!context.applied_tags.includes(requiredTag)) {
              errors.push({
                type: 'missing_required_tag',
                name: 'missing_required_tag',
                message: `Missing required tag: ${requiredTag} (required by ${tagClass.name})`,
                field: 'tags',
                value: requiredTag,
                severity: 'error',
              });
            }
          }
        }

        // Check required metadata
        if (
          rules.required_context.required_metadata &&
          classAppliedTags.length > 0
        ) {
          for (const requiredMeta of rules.required_context.required_metadata) {
            if (!context.metadata?.[requiredMeta]) {
              errors.push({
                type: 'missing_required_metadata',
                name: 'missing_required_metadata',
                message: `Missing required metadata: ${requiredMeta} (required by ${tagClass.name})`,
                field: 'metadata',
                value: requiredMeta,
                severity: 'error',
              });
            }
          }
        }

        // Check required tag classes
        if (
          rules.required_context.required_classes &&
          classAppliedTags.length > 0
        ) {
          for (const requiredClass of rules.required_context.required_classes) {
            const hasRequiredClass =
              (tagsByClass.get(requiredClass) || []).length > 0;
            if (!hasRequiredClass) {
              errors.push({
                type: 'missing_required_class',
                name: 'missing_required_class',
                message: `Missing tags from required class: ${requiredClass} (required by ${tagClass.name})`,
                field: 'tags',
                value: requiredClass,
                severity: 'error',
              });
            }
          }
        }
      }

      // 4. Category Restriction Rules
      if (rules.category_restrictions && classAppliedTags.length > 0) {
        // Check excluded categories
        if (rules.category_restrictions.excluded_categories) {
          for (const tag of classAppliedTags) {
            const tagObj = tagMap.get(tag);
            if (
              tagObj &&
              rules.category_restrictions.excluded_categories.includes(
                tagObj.category
              )
            ) {
              errors.push({
                type: 'excluded_category',
                name: 'excluded_category',
                message: `Tag ${tag} uses excluded category: ${tagObj.category}`,
                field: 'tags',
                value: tag,
                severity: 'error',
              });
            }
          }
        }

        // Check applicable categories
        if (rules.category_restrictions.applicable_categories) {
          for (const tag of classAppliedTags) {
            const tagObj = tagMap.get(tag);
            if (
              tagObj &&
              !rules.category_restrictions.applicable_categories.includes(
                tagObj.category
              )
            ) {
              errors.push({
                type: 'invalid_category',
                name: 'invalid_category',
                message: `Tag ${tag} category not applicable: ${tagObj.category}`,
                field: 'tags',
                value: tag,
                severity: 'error',
              });
            }
          }
        }

        // Check required plot blocks
        if (rules.category_restrictions.required_plot_blocks) {
          const hasRequiredPlotBlocks =
            rules.category_restrictions.required_plot_blocks.some(plotBlockId =>
              context.metadata?.plot_blocks?.includes(plotBlockId)
            );
          if (!hasRequiredPlotBlocks) {
            errors.push({
              type: 'missing_required_plot_block',
              name: 'missing_required_plot_block',
              message: `Missing required plot block for ${tagClass.name}`,
              field: 'plot_blocks',
              value: rules.category_restrictions.required_plot_blocks,
              severity: 'error',
            });
          }
        }
      }

      // 5. Dependency Rules
      if (rules.dependencies && classAppliedTags.length > 0) {
        // Check hard dependencies
        if (rules.dependencies.requires) {
          for (const requiredDep of rules.dependencies.requires) {
            if (!context.applied_tags.includes(requiredDep)) {
              errors.push({
                type: 'missing_dependency',
                name: 'missing_dependency',
                message: `Missing required dependency: ${requiredDep} (required by ${tagClass.name})`,
                field: 'tags',
                value: requiredDep,
                severity: 'error',
              });
            }
          }
        }

        // Check enhancement opportunities
        if (rules.dependencies.enhances) {
          for (const enhanceTarget of rules.dependencies.enhances) {
            if (context.applied_tags.includes(enhanceTarget)) {
              suggestions.push({
                type: 'enhancement',
                message: `${tagClass.name} enhances ${enhanceTarget}`,
                action: 'add',
                alternative_ids: [enhanceTarget],
              });
            }
          }
        }

        // Check enabled features
        if (rules.dependencies.enables) {
          for (const enabledFeature of rules.dependencies.enables) {
            suggestions.push({
              type: 'feature_unlock',
              message: `${tagClass.name} unlocks feature: ${enabledFeature}`,
              action: 'add',
              alternative_ids: [enabledFeature],
            });
          }
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

  /**
   * Validate character dynamics and plot development warnings
   */
  private validateCharacterDynamics(
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // We need to get plot block information from metadata or create a minimal context
    const selectedPlotBlocks = context.metadata?.selected_plot_blocks || [];

    // Get applicable warning templates based on current tags and plot blocks
    const applicableTemplates = getWarningTemplateByTags(
      context.applied_tags,
      selectedPlotBlocks
    );

    // Process each applicable template
    for (const template of applicableTemplates) {
      // Check if all conditions are met
      const conditionsMet = this.evaluateTemplateConditions(
        template,
        context,
        selectedPlotBlocks
      );

      if (conditionsMet) {
        // Execute template actions
        for (const action of template.actions) {
          const result = this.executeTemplateAction(
            action,
            context,
            selectedPlotBlocks
          );

          switch (result.type) {
            case 'plot_warning':
              warnings.push({
                type: 'plot_development_risk',
                message: result.message,
                field: result.targetIds?.join(', '),
                suggestion: `Template: ${template.id}. ${
                  result.plotGuidance?.conflictDescription || ''
                }`,
              });
              break;

            case 'character_guidance':
              warnings.push({
                type: 'character_dynamic_concern',
                message: result.message,
                field: result.characterDynamics?.characters.join(', '),
                suggestion: result.characterDynamics?.guidanceNote,
              });
              break;

            case 'suggestion':
              if (result.suggestedAction && result.targetIds) {
                suggestions.push({
                  type: result.suggestedAction,
                  message: result.message,
                  action: result.suggestedAction,
                  target_id: result.targetIds[0],
                  alternative_ids: result.targetIds,
                });
              }
              break;
          }
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
   * Evaluate if template conditions are met
   */
  private evaluateTemplateConditions(
    template: any,
    context: ValidationContext,
    selectedPlotBlocks: string[]
  ): boolean {
    return template.conditions.every((condition: any) => {
      switch (condition.operator) {
        case 'contains_all':
          return condition.targetIds.every((id: string) =>
            condition.targetType === 'tag'
              ? context.applied_tags.includes(id)
              : selectedPlotBlocks.includes(id)
          );

        case 'contains_any':
          return condition.targetIds.some((id: string) =>
            condition.targetType === 'tag'
              ? context.applied_tags.includes(id)
              : selectedPlotBlocks.includes(id)
          );

        case 'contains_multiple':
          const matchCount = condition.targetIds.filter((id: string) =>
            condition.targetType === 'tag'
              ? context.applied_tags.includes(id)
              : selectedPlotBlocks.includes(id)
          ).length;
          return matchCount >= (condition.value || 2);

        case 'contains':
          return condition.targetIds.some((id: string) =>
            condition.targetType === 'tag'
              ? context.applied_tags.includes(id)
              : selectedPlotBlocks.includes(id)
          );

        default:
          return false;
      }
    });
  }

  /**
   * Execute template action and return result
   */
  private executeTemplateAction(
    action: any,
    context: ValidationContext,
    selectedPlotBlocks: string[]
  ): ActionExecutionResult {
    // Create a compiler-compatible validation context
    const compilerContext: CompilerValidationContext = {
      fandomId: context.metadata?.fandom_id || 'default',
      selectedTags: context.applied_tags,
      selectedPlotBlocks: selectedPlotBlocks,
      pathway: context.applied_tags.map(tag => ({
        id: tag,
        type: 'tag' as const,
      })),
      tagData: new Map(),
      plotBlockData: new Map(),
      metadata: context.metadata,
    };

    const compiler = new ValidationRuleCompiler();

    // Convert template action to validation rule action format
    const ruleAction = {
      id: 'template-action',
      ruleId: 'template-rule',
      actionType: action.actionType,
      targetType: action.targetType,
      targetIds: action.targetIds,
      severity: action.severity,
      message: action.message,
      parameters: action.parameters,
      orderIndex: 0,
      createdAt: new Date(),
    };

    // Compile and execute the action
    const compiledAction = compiler['compileAction'](ruleAction);
    return compiledAction(compilerContext);
  }
}
