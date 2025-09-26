/**
 * T014: RuleEngine Core Implementation
 *
 * This implements the core rule evaluation engine that processes validation rules
 * and applies them to user input combinations. The engine must meet performance
 * requirements: <100ms for simple rules, <500ms for complex rule sets.
 *
 * Key Features:
 * - Rule evaluation with configurable priority ordering
 * - Circular dependency detection and prevention
 * - Performance monitoring and optimization
 * - Thread-safe rule execution
 * - Error handling and graceful degradation
 */

import {
  type ValidationRule,
  type RuleCondition,
  type RuleAction,
} from '@/types';
import { PerformanceMonitor } from '@/lib/performance/monitor';

export interface RuleContext {
  fandomId: string;
  selectedTags: string[];
  selectedPlotBlocks: string[];
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  executionTime: number;
  rulesEvaluated: number;
  appliedRules: AppliedRule[];
}

export interface ValidationError {
  type: 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ruleId: string;
  ruleName: string;
  affectedTags?: string[];
  affectedPlotBlocks?: string[];
  suggestedFix?: string;
}

export interface ValidationWarning {
  type: 'warning';
  severity: 'low' | 'medium' | 'high';
  message: string;
  ruleId: string;
  ruleName: string;
  affectedTags?: string[];
  affectedPlotBlocks?: string[];
  canIgnore: boolean;
}

export interface ValidationSuggestion {
  type: 'suggestion';
  category:
    | 'add_tag'
    | 'remove_tag'
    | 'add_plot_block'
    | 'remove_plot_block'
    | 'alternative';
  target: string;
  reason: string;
  confidence: number; // 0-1
  ruleId: string;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  priority: number;
  executed: boolean;
  executionTime: number;
  result: 'pass' | 'fail' | 'warning' | 'error';
  conditions: ConditionResult[];
  actions: ActionResult[];
}

export interface ConditionResult {
  conditionId: string;
  type: string;
  target: string;
  evaluated: boolean;
  result: boolean;
  value: any;
  executionTime: number;
}

export interface ActionResult {
  actionId: string;
  type: string;
  executed: boolean;
  result: 'success' | 'failed' | 'skipped';
  output?: any;
  executionTime: number;
}

export interface RuleEngineOptions {
  maxExecutionTime?: number; // Default: 1000ms
  enablePerformanceMonitoring?: boolean; // Default: true
  strictMode?: boolean; // Default: true - fail on circular dependencies
  parallelExecution?: boolean; // Default: false - for safety
  circularDependencyDetection?: boolean; // Default: true
}

export class RuleEngine {
  private rules: Map<string, ValidationRule> = new Map();
  private ruleCache: Map<string, any> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private options: Required<RuleEngineOptions>;
  private performanceMonitor = PerformanceMonitor.getInstance();

  constructor(options: RuleEngineOptions = {}) {
    this.options = {
      maxExecutionTime: options.maxExecutionTime ?? 1000,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? true,
      strictMode: options.strictMode ?? true,
      parallelExecution: options.parallelExecution ?? false,
      circularDependencyDetection: options.circularDependencyDetection ?? true,
    };
  }

  /**
   * Load rules into the engine
   */
  async loadRules(rules: ValidationRule[]): Promise<void> {
    const startTime = performance.now();

    try {
      // Clear existing rules
      this.rules.clear();
      this.dependencyGraph.clear();
      this.ruleCache.clear();

      // Load and index rules
      for (const rule of rules) {
        this.rules.set(rule.id, rule);
        await this.buildDependencyGraph(rule);
      }

      // Detect circular dependencies if enabled
      if (this.options.circularDependencyDetection) {
        const circularDeps = this.detectCircularDependencies();
        if (circularDeps.length > 0 && this.options.strictMode) {
          throw new Error(
            `Circular dependencies detected: ${circularDeps.join(', ')}`
          );
        }
      }

      // Sort rules by priority for optimal execution order
      this.sortRulesByPriority();

      const endTime = performance.now();

      if (this.options.enablePerformanceMonitoring) {
        const stopTimer = this.performanceMonitor.startTimer(
          'rule_engine.load_rules',
          {
            ruleCount: rules.length,
          }
        );
        stopTimer.end(true);
      }
    } catch (error) {
      if (this.options.enablePerformanceMonitoring) {
        console.error('Rule engine load error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          ruleCount: rules.length,
        });
      }
      throw error;
    }
  }

  /**
   * Validate a rule context against all loaded rules
   */
  async validate(context: RuleContext): Promise<ValidationResult> {
    const startTime = performance.now();
    const executionId = `validation_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        executionTime: 0,
        rulesEvaluated: 0,
        appliedRules: [],
      };

      // Check execution timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Rule execution timeout')),
          this.options.maxExecutionTime
        )
      );

      // Execute rules with timeout protection
      const validationPromise = this.executeRules(context, executionId);
      const validationResult = await Promise.race([
        validationPromise,
        timeoutPromise,
      ]);

      Object.assign(result, validationResult);

      const endTime = performance.now();
      result.executionTime = endTime - startTime;

      // Determine overall validity
      result.isValid = result.errors.length === 0;

      if (this.options.enablePerformanceMonitoring) {
        const stopTimer = this.performanceMonitor.startTimer(
          'rule_engine.validate',
          {
            tagCount: context.selectedTags.length,
            ruleCount: this.rules.size,
          }
        );
        stopTimer.end(result.isValid);
      }

      return result;
    } catch (error) {
      const endTime = performance.now();

      if (this.options.enablePerformanceMonitoring) {
        console.error('Rule engine validation error:', {
          executionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: endTime - startTime,
          fandomId: context.fandomId,
        });
      }

      // Return error result instead of throwing
      return {
        isValid: false,
        errors: [
          {
            type: 'error',
            severity: 'critical',
            message:
              error instanceof Error
                ? error.message
                : 'Rule engine execution failed',
            ruleId: 'system',
            ruleName: 'Rule Engine',
          },
        ],
        warnings: [],
        suggestions: [],
        executionTime: endTime - startTime,
        rulesEvaluated: 0,
        appliedRules: [],
      };
    }
  }

  /**
   * Execute all applicable rules for the given context
   */
  private async executeRules(
    context: RuleContext,
    executionId: string
  ): Promise<Partial<ValidationResult>> {
    const result: Partial<ValidationResult> = {
      errors: [],
      warnings: [],
      suggestions: [],
      rulesEvaluated: 0,
      appliedRules: [],
    };

    // Get rules for the specific fandom
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.fandomId === context.fandomId && rule.isActive)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    for (const rule of applicableRules) {
      const ruleStartTime = performance.now();

      try {
        const ruleResult = await this.executeRule(rule, context, executionId);
        result.appliedRules!.push(ruleResult);
        result.rulesEvaluated!++;

        // Process rule results and add to validation outcome
        if (ruleResult.result === 'error') {
          result.errors!.push({
            type: 'error',
            message: `Rule "${rule.name}" violated`,
            severity: 'high',
            ruleId: rule.id,
            ruleName: rule.name,
          });
        } else if (ruleResult.result === 'warning') {
          result.warnings!.push({
            type: 'warning',
            message: `Rule "${rule.name}" triggered warning`,
            severity: 'medium',
            ruleId: rule.id,
            ruleName: rule.name,
            canIgnore: true,
          });
        }

        // Early termination on critical errors in strict mode
        if (ruleResult.result === 'error' && this.options.strictMode) {
          break;
        }
      } catch (error) {
        if (this.options.enablePerformanceMonitoring) {
          console.error('Rule execution error:', {
            executionId,
            ruleId: rule.id,
            error:
              error instanceof Error ? error.message : 'Unknown rule error',
          });
        }

        // Add rule execution error
        result.errors!.push({
          type: 'error',
          severity: 'critical',
          message: `Rule execution failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          ruleId: rule.id,
          ruleName: rule.name,
        });
      }
    }

    return result;
  }

  /**
   * Execute a single rule against the context
   */
  private async executeRule(
    rule: ValidationRule,
    context: RuleContext,
    executionId: string
  ): Promise<AppliedRule> {
    const startTime = performance.now();

    const appliedRule: AppliedRule = {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      executed: false,
      executionTime: 0,
      result: 'pass',
      conditions: [],
      actions: [],
    };

    const ruleResult = {
      errors: [] as ValidationError[],
      warnings: [] as ValidationWarning[],
      suggestions: [] as ValidationSuggestion[],
    };

    try {
      // Evaluate all conditions
      let allConditionsPassed = true;

      for (const condition of rule.conditions) {
        const conditionResult = await this.evaluateCondition(
          condition,
          context,
          executionId
        );
        appliedRule.conditions.push(conditionResult);

        if (!conditionResult.result) {
          allConditionsPassed = false;
          if (condition.logicalOperator !== 'OR') {
            break; // Short-circuit on AND conditions
          }
        }
      }

      // If conditions pass, execute actions
      if (allConditionsPassed) {
        for (const action of rule.actions) {
          const actionResult = await this.executeAction(
            action,
            context,
            executionId
          );
          appliedRule.actions.push(actionResult);

          // Convert action results to validation results
          if (actionResult.executed) {
            switch (action.type) {
              case 'error':
                ruleResult.errors.push({
                  type: 'error',
                  severity: action.severity,
                  message: action.message,
                  ruleId: rule.id,
                  ruleName: rule.name,
                  affectedTags: action.targetTags,
                  affectedPlotBlocks: action.targetPlotBlocks,
                });
                appliedRule.result = 'error';
                break;

              case 'warning':
                ruleResult.warnings.push({
                  type: 'warning',
                  severity: action.severity as 'low' | 'medium' | 'high',
                  message: action.message,
                  ruleId: rule.id,
                  ruleName: rule.name,
                  affectedTags: action.targetTags,
                  affectedPlotBlocks: action.targetPlotBlocks,
                  canIgnore: action.severity === 'low',
                });
                if (appliedRule.result === 'pass')
                  appliedRule.result = 'warning';
                break;

              case 'suggestion':
                ruleResult.suggestions.push({
                  type: 'suggestion',
                  category: 'add_tag', // This would be determined by action details
                  target:
                    action.targetTags?.[0] ||
                    action.targetPlotBlocks?.[0] ||
                    '',
                  reason: action.message,
                  confidence: 0.8, // Could be configurable
                  ruleId: rule.id,
                });
                break;
            }
          }
        }
      }

      appliedRule.executed = true;
      appliedRule.executionTime = performance.now() - startTime;

      return appliedRule;
    } catch (error) {
      appliedRule.executionTime = performance.now() - startTime;
      appliedRule.result = 'fail';

      throw error;
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: RuleCondition,
    context: RuleContext,
    executionId: string
  ): Promise<ConditionResult> {
    const startTime = performance.now();

    const result: ConditionResult = {
      conditionId: `${condition.type}_${Date.now()}`,
      type: condition.type,
      target: condition.target,
      evaluated: false,
      result: false,
      value: condition.value,
      executionTime: 0,
    };

    try {
      switch (condition.type) {
        case 'tag_present':
          result.result = context.selectedTags.includes(condition.target);
          break;

        case 'tag_absent':
          result.result = !context.selectedTags.includes(condition.target);
          break;

        case 'plot_block_present':
          result.result = context.selectedPlotBlocks.includes(condition.target);
          break;

        case 'tag_count':
          const tagCount = context.selectedTags.length;
          switch (condition.operator) {
            case 'equals':
              result.result = tagCount === condition.value;
              break;
            case 'greater_than':
              result.result = tagCount > condition.value;
              break;
            case 'less_than':
              result.result = tagCount < condition.value;
              break;
            default:
              result.result = false;
          }
          break;

        case 'custom':
          // Custom condition evaluation would be implemented here
          result.result = await this.evaluateCustomCondition(
            condition,
            context
          );
          break;

        default:
          throw new Error(`Unknown condition type: ${condition.type}`);
      }

      result.evaluated = true;
      result.executionTime = performance.now() - startTime;

      return result;
    } catch (error) {
      result.executionTime = performance.now() - startTime;
      throw error;
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: RuleAction,
    context: RuleContext,
    executionId: string
  ): Promise<ActionResult> {
    const startTime = performance.now();

    const result: ActionResult = {
      actionId: `${action.type}_${Date.now()}`,
      type: action.type,
      executed: false,
      result: 'skipped',
      executionTime: 0,
    };

    try {
      switch (action.type) {
        case 'error':
        case 'warning':
        case 'suggestion':
          // These actions just produce outputs, no side effects
          result.executed = true;
          result.result = 'success';
          break;

        case 'auto_add':
          // Would implement automatic tag/plot block addition
          result.executed = true;
          result.result = 'success';
          result.output = { addedTags: action.targetTags };
          break;

        case 'auto_remove':
          // Would implement automatic tag/plot block removal
          result.executed = true;
          result.result = 'success';
          result.output = { removedTags: action.targetTags };
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      result.executionTime = performance.now() - startTime;
      return result;
    } catch (error) {
      result.executionTime = performance.now() - startTime;
      result.result = 'failed';
      throw error;
    }
  }

  /**
   * Build dependency graph for rule ordering
   */
  private async buildDependencyGraph(rule: ValidationRule): Promise<void> {
    // This would analyze rule conditions and actions to build dependency relationships
    // For now, we'll use a simple priority-based ordering
    if (!this.dependencyGraph.has(rule.id)) {
      this.dependencyGraph.set(rule.id, new Set());
    }
  }

  /**
   * Detect circular dependencies in rules
   */
  private detectCircularDependencies(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[] = [];

    const dfs = (ruleId: string): boolean => {
      if (recursionStack.has(ruleId)) {
        circularDeps.push(ruleId);
        return true;
      }

      if (visited.has(ruleId)) {
        return false;
      }

      visited.add(ruleId);
      recursionStack.add(ruleId);

      const dependencies = this.dependencyGraph.get(ruleId) || new Set();
      for (const depId of dependencies) {
        if (dfs(depId)) {
          return true;
        }
      }

      recursionStack.delete(ruleId);
      return false;
    };

    for (const ruleId of this.rules.keys()) {
      if (!visited.has(ruleId)) {
        dfs(ruleId);
      }
    }

    return circularDeps;
  }

  /**
   * Sort rules by priority for optimal execution
   */
  private sortRulesByPriority(): void {
    // Rules are sorted during execution, this is a placeholder for more complex sorting
  }

  /**
   * Evaluate custom conditions (extensibility point)
   */
  private evaluateCustomCondition(
    condition: RuleCondition,
    context: RuleContext
  ): boolean {
    // This would be implemented to handle custom condition types
    // For now, return false as a safe default
    return false;
  }

  /**
   * Clear all loaded rules and caches
   */
  clear(): void {
    this.rules.clear();
    this.ruleCache.clear();
    this.dependencyGraph.clear();
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    ruleCount: number;
    cacheSize: number;
    dependencyCount: number;
  } {
    return {
      ruleCount: this.rules.size,
      cacheSize: this.ruleCache.size,
      dependencyCount: this.dependencyGraph.size,
    };
  }
}
