import { eq, and, or, sql, desc } from 'drizzle-orm';
import { getDatabase } from '../config';
import { validationRules, ruleConditions, ruleActions } from '../schema';
import { PathwayItem } from './pathway';

export interface ValidationRule {
  id: number;
  name: string;
  description: string;
  fandomId: number;
  category: string;
  priority: number;
  isActive: boolean;
  appliesTo: string[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  version: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface RuleCondition {
  id: number;
  type:
    | 'has_tag'
    | 'has_plot_block'
    | 'tag_count'
    | 'combination'
    | 'exclusion';
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'not_in';
  value: any;
  logic: 'AND' | 'OR';
}

export interface RuleAction {
  id: number;
  type: 'error' | 'warning' | 'suggestion' | 'block' | 'suggest_alternative';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix?: string;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{ rule: string; message: string; severity: string }>;
  warnings: Array<{ rule: string; message: string; severity: string }>;
  suggestions: Array<{ rule: string; message: string; fix?: string }>;
  blockedCombinations: Array<{ rule: string; message: string }>;
}

export interface RuleExecutionContext {
  pathway: PathwayItem[];
  fandomId: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export class ValidationRuleModel {
  /**
   * Execute all validation rules against a pathway
   */
  static async validatePathway(
    pathway: PathwayItem[],
    fandomId: number,
    userId?: string
  ): Promise<ValidationResult> {
    const context: RuleExecutionContext = {
      pathway,
      fandomId,
      userId,
      metadata: {},
    };

    const rules = await this.getActiveRules(fandomId);
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      blockedCombinations: [],
    };

    for (const rule of rules) {
      const ruleResult = await this.executeRule(rule, context);
      this.mergeResults(result, ruleResult, rule.name);
    }

    result.isValid =
      result.errors.length === 0 && result.blockedCombinations.length === 0;
    return result;
  }

  /**
   * Get all active validation rules for a fandom
   */
  static async getActiveRules(fandomId: number): Promise<ValidationRule[]> {
    const db = getDatabase();

    const rulesData = await db
      .select()
      .from(validationRules)
      .where(
        and(
          eq(validationRules.fandom_id, fandomId),
          eq(validationRules.is_active, true)
        )
      )
      .orderBy(desc(validationRules.priority));

    const rules: ValidationRule[] = [];

    for (const ruleData of rulesData) {
      // Get rule conditions
      const conditions = await db
        .select()
        .from(ruleConditions)
        .where(eq(ruleConditions.rule_id, ruleData.id));

      // Get rule actions
      const actions = await db
        .select()
        .from(ruleActions)
        .where(eq(ruleActions.rule_id, ruleData.id));

      rules.push({
        id: ruleData.id,
        name: ruleData.name,
        description: ruleData.description || '',
        fandomId: ruleData.fandom_id,
        category: ruleData.category,
        priority: ruleData.priority,
        isActive: ruleData.is_active,
        appliesTo: Array.isArray(ruleData.applies_to)
          ? ruleData.applies_to
          : [],
        version: ruleData.version,
        tags: Array.isArray(ruleData.tags) ? ruleData.tags : [],
        metadata: ruleData.metadata || {},
        conditions: conditions.map(c => ({
          id: c.id,
          type: c.condition_type as any,
          field: c.field,
          operator: c.operator as any,
          value: c.value,
          logic: c.logic as any,
        })),
        actions: actions.map(a => ({
          id: a.id,
          type: a.action_type as any,
          message: a.message,
          severity: a.severity as any,
          suggestedFix: a.suggested_fix || undefined,
          metadata: a.metadata || undefined,
        })),
      });
    }

    return rules;
  }

  /**
   * Execute a single validation rule against pathway context
   */
  private static async executeRule(
    rule: ValidationRule,
    context: RuleExecutionContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      blockedCombinations: [],
    };

    // Check if rule applies to this pathway
    if (!this.ruleApplies(rule, context)) {
      return result;
    }

    // Evaluate conditions
    const conditionsMatch = this.evaluateConditions(rule.conditions, context);

    if (conditionsMatch) {
      // Execute actions
      for (const action of rule.actions) {
        this.executeAction(action, result);
      }
    }

    return result;
  }

  /**
   * Check if a rule applies to the current pathway context
   */
  private static ruleApplies(
    rule: ValidationRule,
    context: RuleExecutionContext
  ): boolean {
    if (rule.appliesTo.length === 0) {
      return true; // Rule applies to all pathways
    }

    // Check if any pathway items match the rule's applies_to criteria
    for (const item of context.pathway) {
      if (
        rule.appliesTo.includes(item.type) ||
        rule.appliesTo.includes(item.category || '') ||
        rule.appliesTo.includes(item.name)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate all conditions for a rule
   */
  private static evaluateConditions(
    conditions: RuleCondition[],
    context: RuleExecutionContext
  ): boolean {
    if (conditions.length === 0) {
      return true;
    }

    // Group conditions by logic operator
    const andConditions = conditions.filter(c => c.logic === 'AND');
    const orConditions = conditions.filter(c => c.logic === 'OR');

    // All AND conditions must be true
    for (const condition of andConditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }

    // At least one OR condition must be true (if any exist)
    if (orConditions.length > 0) {
      const orResult = orConditions.some(condition =>
        this.evaluateCondition(condition, context)
      );
      return orResult;
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: RuleCondition,
    context: RuleExecutionContext
  ): boolean {
    const { pathway } = context;

    switch (condition.type) {
      case 'has_tag':
        return pathway.some(
          item => item.type === 'tag' && item.name === condition.value
        );

      case 'has_plot_block':
        return pathway.some(
          item => item.type === 'plot_block' && item.name === condition.value
        );

      case 'tag_count':
        const tagCount = pathway.filter(item => item.type === 'tag').length;
        return this.compareValues(
          tagCount,
          condition.operator,
          condition.value
        );

      case 'combination':
        const requiredItems = Array.isArray(condition.value)
          ? condition.value
          : [condition.value];
        return requiredItems.every(reqItem =>
          pathway.some(item => item.name === reqItem)
        );

      case 'exclusion':
        const excludedItems = Array.isArray(condition.value)
          ? condition.value
          : [condition.value];
        return !excludedItems.some(excItem =>
          pathway.some(item => item.name === excItem)
        );

      default:
        return false;
    }
  }

  /**
   * Compare values using the specified operator
   */
  private static compareValues(
    actual: any,
    operator: string,
    expected: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  /**
   * Execute a rule action and add to results
   */
  private static executeAction(
    action: RuleAction,
    result: ValidationResult
  ): void {
    const resultItem = {
      rule: '',
      message: action.message,
      severity: action.severity,
      fix: action.suggestedFix,
    };

    switch (action.type) {
      case 'error':
        result.errors.push(resultItem);
        break;
      case 'warning':
        result.warnings.push(resultItem);
        break;
      case 'suggestion':
      case 'suggest_alternative':
        result.suggestions.push(resultItem);
        break;
      case 'block':
        result.blockedCombinations.push(resultItem);
        break;
    }
  }

  /**
   * Merge rule execution result into main result
   */
  private static mergeResults(
    main: ValidationResult,
    ruleResult: ValidationResult,
    ruleName: string
  ): void {
    // Add rule name to all items
    ruleResult.errors.forEach(item => {
      main.errors.push({ ...item, rule: ruleName });
    });
    ruleResult.warnings.forEach(item => {
      main.warnings.push({ ...item, rule: ruleName });
    });
    ruleResult.suggestions.forEach(item => {
      main.suggestions.push({ ...item, rule: ruleName });
    });
    ruleResult.blockedCombinations.forEach(item => {
      main.blockedCombinations.push({ ...item, rule: ruleName });
    });
  }

  /**
   * Create a new validation rule
   */
  static async createRule(
    fandomId: number,
    ruleData: Partial<ValidationRule>,
    createdBy: string
  ): Promise<ValidationRule> {
    const db = getDatabase();

    const [newRule] = await db
      .insert(validationRules)
      .values({
        name: ruleData.name!,
        description: ruleData.description || '',
        fandom_id: fandomId,
        category: ruleData.category || 'general',
        priority: ruleData.priority || 1,
        is_active: ruleData.isActive ?? true,
        applies_to: ruleData.appliesTo || [],
        created_by: createdBy,
        version: 1,
        tags: ruleData.tags || [],
        metadata: ruleData.metadata || {},
      })
      .returning();

    return {
      id: newRule.id,
      name: newRule.name,
      description: newRule.description || '',
      fandomId: newRule.fandom_id,
      category: newRule.category,
      priority: newRule.priority,
      isActive: newRule.is_active,
      appliesTo: newRule.applies_to || [],
      version: newRule.version,
      tags: newRule.tags || [],
      metadata: newRule.metadata || {},
      conditions: [],
      actions: [],
    };
  }

  /**
   * Get rule performance metrics
   */
  static async getRuleMetrics(ruleId: number): Promise<{
    executionCount: number;
    averageExecutionTime: number;
    triggeredCount: number;
    lastTriggered?: Date;
  }> {
    // Placeholder implementation - would use analytics data in production
    return {
      executionCount: 0,
      averageExecutionTime: 0,
      triggeredCount: 0,
    };
  }
}
