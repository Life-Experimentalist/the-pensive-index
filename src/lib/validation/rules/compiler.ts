/**
 * Validation Rule Compiler
 *
 * Compiles admin-configured validation rules into executable functions
 * with performance optimization and caching.
 */

import {
  ValidationRule,
  RuleCondition,
  RuleAction,
  ConditionType,
  ConditionOperator,
  ActionType,
} from '@/types/validation-rules';

import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
} from '@/types';

export interface CompiledRule {
  id: string;
  name: string;
  priority: number;
  severity: 'error' | 'warning';
  evaluate: (context: ValidationContext) => RuleExecutionResult;
  actions: CompiledAction[];
}

export interface ValidationContext {
  fandomId: string;
  selectedTags: string[];
  selectedPlotBlocks: string[];
  pathway: Array<{ id: string; type: 'tag' | 'plot_block' }>;
  tagData: Map<string, any>;
  plotBlockData: Map<string, any>;
  metadata?: Record<string, any>;
}

export interface RuleExecutionResult {
  triggered: boolean;
  conditionResults: ConditionResult[];
  executionTime: number;
}

export interface ConditionResult {
  conditionId: string;
  result: boolean;
  value: any;
  operator: string;
}

export interface CompiledAction {
  type: ActionType;
  targetType: 'tag' | 'plot_block' | 'message' | 'pathway';
  targetIds?: string[];
  parameters: Record<string, any>;
  execute: (context: ValidationContext) => ActionExecutionResult;
}

export interface ActionExecutionResult {
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  targetIds?: string[];
  suggestedAction?: 'add' | 'remove' | 'replace';
}

/**
 * Compiles validation rules into optimized executable functions
 */
export class ValidationRuleCompiler {
  private compiledRules: Map<string, CompiledRule> = new Map();
  private performanceCache: Map<string, number> = new Map();

  /**
   * Compile a validation rule into an optimized executable function
   */
  public compileRule(rule: ValidationRule): CompiledRule {
    const compiledConditions = this.compileConditions(rule.conditions);
    const compiledActions = this.compileActions(rule.actions);

    const compiled: CompiledRule = {
      id: rule.id,
      name: rule.name,
      priority: rule.priority,
      severity: rule.severity,
      evaluate: this.createEvaluationFunction(
        compiledConditions,
        rule.conditions
      ),
      actions: compiledActions,
    };

    this.compiledRules.set(rule.id, compiled);
    return compiled;
  }

  /**
   * Compile multiple rules and sort by priority
   */
  public compileRules(rules: ValidationRule[]): CompiledRule[] {
    const compiled = rules.map(rule => this.compileRule(rule));
    return compiled.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute compiled rules against a validation context
   */
  public async executeRules(
    rules: CompiledRule[],
    context: ValidationContext
  ): Promise<ValidationResult> {
    const startTime = performance.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    for (const rule of rules) {
      const ruleStartTime = performance.now();

      try {
        const result = rule.evaluate(context);

        if (result.triggered) {
          // Execute rule actions
          for (const action of rule.actions) {
            const actionResult = action.execute(context);

            if (actionResult.type === 'error') {
              errors.push({
                type: 'custom_rule_violation',
                name: rule.name,
                message: actionResult.message,
                field:
                  action.targetType === 'tag'
                    ? 'tags'
                    : action.targetType === 'plot_block'
                    ? 'plot_blocks'
                    : 'general',
                value: actionResult.targetIds || [],
                severity: 'error',
              });
            } else if (actionResult.type === 'warning') {
              warnings.push({
                type: 'custom_rule_warning',
                message: actionResult.message,
                field:
                  action.targetType === 'tag'
                    ? 'tags'
                    : action.targetType === 'plot_block'
                    ? 'plot_blocks'
                    : 'general',
                suggestion: actionResult.message,
              });
            } else if (actionResult.type === 'suggestion') {
              suggestions.push({
                type: 'custom_rule_suggestion',
                message: actionResult.message,
                action: actionResult.suggestedAction || 'add',
                alternative_ids: actionResult.targetIds || [],
              });
            }
          }
        }

        const ruleTime = performance.now() - ruleStartTime;
        this.performanceCache.set(rule.id, ruleTime);

        // Early exit if execution time exceeds threshold
        if (ruleTime > 50) {
          // 50ms threshold per rule
          console.warn(`Rule ${rule.name} took ${ruleTime}ms to execute`);
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.name}:`, error);
        errors.push({
          type: 'rule_execution_error',
          name: 'rule_execution_error',
          message: `Failed to execute validation rule: ${rule.name}`,
          field: 'general',
          value: rule.id,
          severity: 'error',
        });
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Compile rule conditions into optimized evaluation functions
   */
  private compileConditions(
    conditions: RuleCondition[]
  ): Array<(context: ValidationContext) => ConditionResult> {
    return conditions.map(condition => {
      switch (condition.conditionType) {
        case 'has_tag':
          return this.compileHasTagCondition(condition);
        case 'has_plot_block':
          return this.compileHasPlotBlockCondition(condition);
        case 'tag_count':
          return this.compileTagCountCondition(condition);
        case 'plot_block_depth':
          return this.compilePlotBlockDepthCondition(condition);
        case 'custom_expression':
          return this.compileCustomExpressionCondition(condition);
        default:
          throw new Error(`Unknown condition type: ${condition.conditionType}`);
      }
    });
  }

  /**
   * Create optimized evaluation function for the rule
   */
  private createEvaluationFunction(
    compiledConditions: Array<(context: ValidationContext) => ConditionResult>,
    originalConditions: RuleCondition[]
  ): (context: ValidationContext) => RuleExecutionResult {
    return (context: ValidationContext): RuleExecutionResult => {
      const startTime = performance.now();
      const conditionResults: ConditionResult[] = [];

      let currentResult = null;

      for (let i = 0; i < compiledConditions.length; i++) {
        const condition = originalConditions[i];
        const compiledCondition = compiledConditions[i];
        const result = compiledCondition(context);

        conditionResults.push(result);

        if (currentResult === null) {
          currentResult = result.result;
        } else {
          if (condition.logicOperator === 'AND') {
            currentResult = currentResult && result.result;
          } else {
            // OR
            currentResult = currentResult || result.result;
          }
        }

        // Short-circuit optimization
        if (condition.logicOperator === 'AND' && !result.result) {
          break; // No need to evaluate remaining AND conditions
        }
        if (condition.logicOperator === 'OR' && result.result) {
          break; // No need to evaluate remaining OR conditions
        }
      }

      const executionTime = performance.now() - startTime;

      return {
        triggered: currentResult || false,
        conditionResults,
        executionTime,
      };
    };
  }

  /**
   * Compile 'has_tag' condition
   */
  private compileHasTagCondition(
    condition: RuleCondition
  ): (context: ValidationContext) => ConditionResult {
    return (context: ValidationContext): ConditionResult => {
      const hasTag = condition.targetIds.some(tagId =>
        context.selectedTags.includes(tagId)
      );

      let result: boolean;
      switch (condition.operator) {
        case 'equals':
          result = hasTag === (condition.value as boolean);
          break;
        case 'contains':
          result = hasTag;
          break;
        case 'not_contains':
          result = !hasTag;
          break;
        case 'in':
          result = condition.targetIds.some(
            tagId =>
              (condition.value as string[]).includes(tagId) &&
              context.selectedTags.includes(tagId)
          );
          break;
        case 'not_in':
          result = !condition.targetIds.some(
            tagId =>
              (condition.value as string[]).includes(tagId) &&
              context.selectedTags.includes(tagId)
          );
          break;
        default:
          result = hasTag;
      }

      return {
        conditionId: condition.id,
        result,
        value: hasTag,
        operator: condition.operator,
      };
    };
  }

  /**
   * Compile 'has_plot_block' condition
   */
  private compileHasPlotBlockCondition(
    condition: RuleCondition
  ): (context: ValidationContext) => ConditionResult {
    return (context: ValidationContext): ConditionResult => {
      const hasPlotBlock = condition.targetIds.some(blockId =>
        context.selectedPlotBlocks.includes(blockId)
      );

      let result: boolean;
      switch (condition.operator) {
        case 'contains':
          result = hasPlotBlock;
          break;
        case 'not_contains':
          result = !hasPlotBlock;
          break;
        default:
          result = hasPlotBlock;
      }

      return {
        conditionId: condition.id,
        result,
        value: hasPlotBlock,
        operator: condition.operator,
      };
    };
  }

  /**
   * Compile 'tag_count' condition
   */
  private compileTagCountCondition(
    condition: RuleCondition
  ): (context: ValidationContext) => ConditionResult {
    return (context: ValidationContext): ConditionResult => {
      // Count tags of specific type or from specific class
      let count: number;

      if (condition.targetIds.length > 0) {
        // Count specific tags
        count = condition.targetIds.filter(tagId =>
          context.selectedTags.includes(tagId)
        ).length;
      } else {
        // Count all tags
        count = context.selectedTags.length;
      }

      const targetValue = condition.value as number;
      let result: boolean;

      switch (condition.operator) {
        case 'equals':
          result = count === targetValue;
          break;
        case 'greater_than':
          result = count > targetValue;
          break;
        case 'less_than':
          result = count < targetValue;
          break;
        default:
          result = count === targetValue;
      }

      return {
        conditionId: condition.id,
        result,
        value: count,
        operator: condition.operator,
      };
    };
  }

  /**
   * Compile 'plot_block_depth' condition
   */
  private compilePlotBlockDepthCondition(
    condition: RuleCondition
  ): (context: ValidationContext) => ConditionResult {
    return (context: ValidationContext): ConditionResult => {
      // Calculate maximum depth of selected plot blocks
      let maxDepth = 0;

      for (const blockId of context.selectedPlotBlocks) {
        const blockData = context.plotBlockData.get(blockId);
        if (blockData && blockData.depth) {
          maxDepth = Math.max(maxDepth, blockData.depth);
        }
      }

      const targetDepth = condition.value as number;
      let result: boolean;

      switch (condition.operator) {
        case 'equals':
          result = maxDepth === targetDepth;
          break;
        case 'greater_than':
          result = maxDepth > targetDepth;
          break;
        case 'less_than':
          result = maxDepth < targetDepth;
          break;
        default:
          result = maxDepth === targetDepth;
      }

      return {
        conditionId: condition.id,
        result,
        value: maxDepth,
        operator: condition.operator,
      };
    };
  }

  /**
   * Compile custom expression condition (simplified version)
   */
  private compileCustomExpressionCondition(
    condition: RuleCondition
  ): (context: ValidationContext) => ConditionResult {
    return (context: ValidationContext): ConditionResult => {
      // For security, this would need to be a safe expression evaluator
      // For now, return a placeholder
      console.warn('Custom expressions not yet implemented');

      return {
        conditionId: condition.id,
        result: true,
        value: 'placeholder',
        operator: condition.operator,
      };
    };
  }

  /**
   * Compile rule actions into executable functions
   */
  private compileActions(actions: RuleAction[]): CompiledAction[] {
    return actions.map(action => ({
      type: action.actionType,
      targetType: action.targetType,
      targetIds: action.targetIds,
      parameters: action.parameters,
      execute: this.compileAction(action),
    }));
  }

  /**
   * Compile individual action into executable function
   */
  private compileAction(
    action: RuleAction
  ): (context: ValidationContext) => ActionExecutionResult {
    switch (action.actionType) {
      case 'require_tag':
        return this.compileRequireTagAction(action);
      case 'forbid_tag':
        return this.compileForbidTagAction(action);
      case 'suggest_tag':
        return this.compileSuggestTagAction(action);
      case 'require_plot_block':
        return this.compileRequirePlotBlockAction(action);
      case 'show_message':
        return this.compileShowMessageAction(action);
      case 'modify_priority':
        return this.compileModifyPriorityAction(action);
      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }

  private compileRequireTagAction(
    action: RuleAction
  ): (context: ValidationContext) => ActionExecutionResult {
    return (context: ValidationContext): ActionExecutionResult => {
      const targetIds = action.targetIds || [];
      const missingTags = targetIds.filter(
        tagId => !context.selectedTags.includes(tagId)
      );

      if (missingTags.length > 0) {
        return {
          type: 'error',
          message:
            action.parameters.message ||
            `Required tags missing: ${missingTags.join(', ')}`,
          targetIds: missingTags,
          suggestedAction: 'add',
        };
      }

      return {
        type: 'suggestion',
        message: 'All required tags present',
      };
    };
  }

  private compileForbidTagAction(
    action: RuleAction
  ): (context: ValidationContext) => ActionExecutionResult {
    return (context: ValidationContext): ActionExecutionResult => {
      const targetIds = action.targetIds || [];
      const forbiddenTags = targetIds.filter(tagId =>
        context.selectedTags.includes(tagId)
      );

      if (forbiddenTags.length > 0) {
        return {
          type: 'error',
          message:
            action.parameters.message ||
            `Forbidden tags selected: ${forbiddenTags.join(', ')}`,
          targetIds: forbiddenTags,
          suggestedAction: 'remove',
        };
      }

      return {
        type: 'suggestion',
        message: 'No forbidden tags present',
      };
    };
  }

  private compileSuggestTagAction(
    action: RuleAction
  ): (context: ValidationContext) => ActionExecutionResult {
    return (context: ValidationContext): ActionExecutionResult => {
      const targetIds = action.targetIds || [];
      return {
        type: 'suggestion',
        message:
          action.parameters.message ||
          `Consider adding: ${targetIds.join(', ')}`,
        targetIds: targetIds,
        suggestedAction: 'add',
      };
    };
  }

  private compileRequirePlotBlockAction(
    action: RuleAction
  ): (context: ValidationContext) => ActionExecutionResult {
    return (context: ValidationContext): ActionExecutionResult => {
      const targetIds = action.targetIds || [];
      const missingBlocks = targetIds.filter(
        blockId => !context.selectedPlotBlocks.includes(blockId)
      );

      if (missingBlocks.length > 0) {
        return {
          type: 'error',
          message:
            action.parameters.message ||
            `Required plot blocks missing: ${missingBlocks.join(', ')}`,
          targetIds: missingBlocks,
          suggestedAction: 'add',
        };
      }

      return {
        type: 'suggestion',
        message: 'All required plot blocks present',
      };
    };
  }

  private compileShowMessageAction(
    action: RuleAction
  ): (context: ValidationContext) => ActionExecutionResult {
    return (context: ValidationContext): ActionExecutionResult => {
      return {
        type: action.parameters.severity || 'warning',
        message: action.parameters.message || 'Custom rule message',
      };
    };
  }

  private compileModifyPriorityAction(
    action: RuleAction
  ): (context: ValidationContext) => ActionExecutionResult {
    return (context: ValidationContext): ActionExecutionResult => {
      // This would modify the priority of other rules or validations
      return {
        type: 'suggestion',
        message: 'Priority modification applied',
      };
    };
  }

  /**
   * Clear compiled rules cache
   */
  public clearCache(): void {
    this.compiledRules.clear();
    this.performanceCache.clear();
  }

  /**
   * Get performance metrics for compiled rules
   */
  public getPerformanceMetrics(): Record<string, number> {
    return Object.fromEntries(this.performanceCache);
  }
}
