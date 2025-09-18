import {
  ValidationRule,
  RuleCondition,
  RuleAction,
} from '../../types/index.js';

/**
 * ValidationRule Entity
 *
 * Manages validation rules with JSON-based conditions and actions.
 * Supports complex condition trees with logical operators.
 */
export class ValidationRuleEntity {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly fandomId: string;
  public readonly priority: number;
  public readonly isActive: boolean;
  public readonly conditions: RuleCondition[];
  public readonly actions: RuleAction[];
  public readonly tags: string[];
  public readonly metadata: Record<string, any>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: ValidationRule) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.fandomId = data.fandomId;
    this.priority = data.priority;
    this.isActive = data.isActive;
    this.conditions = data.conditions;
    this.actions = data.actions;
    this.tags = data.tags || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Creates a validation rule from template
   */
  static fromTemplate(
    template: RuleTemplate,
    placeholders: Record<string, any>,
    fandomId: string
  ): ValidationRuleEntity {
    const resolvedConditions = template.conditions.map(condition =>
      this.resolvePlaceholders(condition, placeholders)
    );

    const resolvedActions = template.actions.map(action =>
      this.resolvePlaceholders(action, placeholders)
    );

    const ruleData: ValidationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: template.name.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => placeholders[key] || key
      ),
      description: template.description.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => placeholders[key] || key
      ),
      fandomId,
      priority: template.defaultPriority,
      isActive: true,
      conditions: resolvedConditions,
      actions: resolvedActions,
      tags: template.tags || [],
      metadata: {
        templateId: template.id,
        placeholders,
        createdFromTemplate: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new ValidationRuleEntity(ruleData);
  }

  /**
   * Validates rule structure and conditions
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!this.name.trim()) {
      errors.push('Rule name is required');
    }

    if (!this.fandomId) {
      errors.push('Fandom ID is required');
    }

    if (this.priority < 0 || this.priority > 100) {
      errors.push('Priority must be between 0 and 100');
    }

    // Conditions validation
    if (!this.conditions || this.conditions.length === 0) {
      errors.push('At least one condition is required');
    } else {
      this.conditions.forEach((condition, index) => {
        const conditionErrors = this.validateCondition(condition);
        conditionErrors.forEach(error =>
          errors.push(`Condition ${index + 1}: ${error}`)
        );
      });
    }

    // Actions validation
    if (!this.actions || this.actions.length === 0) {
      errors.push('At least one action is required');
    } else {
      this.actions.forEach((action, index) => {
        const actionErrors = this.validateAction(action);
        actionErrors.forEach(error =>
          errors.push(`Action ${index + 1}: ${error}`)
        );
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a single condition
   */
  private validateCondition(condition: RuleCondition): string[] {
    const errors: string[] = [];

    if (!condition.type) {
      errors.push('Condition type is required');
    }

    if (!condition.target) {
      errors.push('Condition target is required');
    }

    // Type-specific validation
    switch (condition.type) {
      case 'tag_presence':
      case 'tag_absence':
        if (!condition.value || !Array.isArray(condition.value)) {
          errors.push('Tag condition requires array of tag IDs');
        }
        break;

      case 'plot_block_selection':
        if (!condition.value || typeof condition.value !== 'string') {
          errors.push('Plot block condition requires plot block ID');
        }
        break;

      case 'count_comparison':
        if (!condition.value || typeof condition.value !== 'number') {
          errors.push('Count comparison requires numeric value');
        }
        if (
          !condition.operator ||
          !['=', '>', '<', '>=', '<=', '!='].includes(condition.operator)
        ) {
          errors.push('Count comparison requires valid operator');
        }
        break;

      case 'logical_group':
        if (!condition.children || !Array.isArray(condition.children)) {
          errors.push('Logical group requires child conditions');
        } else {
          condition.children.forEach((child, index) => {
            const childErrors = this.validateCondition(child);
            childErrors.forEach(error =>
              errors.push(`Child condition ${index + 1}: ${error}`)
            );
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validates a single action
   */
  private validateAction(action: RuleAction): string[] {
    const errors: string[] = [];

    if (!action.type) {
      errors.push('Action type is required');
    }

    if (!action.target) {
      errors.push('Action target is required');
    }

    // Type-specific validation
    switch (action.type) {
      case 'add_error':
      case 'add_warning':
        if (!action.message) {
          errors.push('Error/Warning action requires message');
        }
        break;

      case 'suggest_alternative':
        if (!action.alternatives || !Array.isArray(action.alternatives)) {
          errors.push('Suggest alternative action requires alternatives array');
        }
        break;

      case 'require_confirmation':
        if (!action.message) {
          errors.push('Require confirmation action requires message');
        }
        break;

      case 'modify_selection':
        if (!action.modifications || typeof action.modifications !== 'object') {
          errors.push('Modify selection action requires modifications object');
        }
        break;
    }

    return errors;
  }

  /**
   * Resolves placeholders in rule templates
   */
  private static resolvePlaceholders(
    obj: any,
    placeholders: Record<string, any>
  ): any {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (key in placeholders) {
          return placeholders[key];
        }
        throw new Error(`Unresolved placeholder: ${key}`);
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolvePlaceholders(item, placeholders));
    }

    if (typeof obj === 'object' && obj !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolvePlaceholders(value, placeholders);
      }
      return resolved;
    }

    return obj;
  }

  /**
   * Creates a deep copy of the rule
   */
  clone(): ValidationRuleEntity {
    const ruleData: ValidationRule = {
      id: `${this.id}_copy_${Date.now()}`,
      name: `${this.name} (Copy)`,
      description: this.description,
      fandomId: this.fandomId,
      priority: this.priority,
      isActive: this.isActive,
      conditions: JSON.parse(JSON.stringify(this.conditions)),
      actions: JSON.parse(JSON.stringify(this.actions)),
      tags: [...this.tags],
      metadata: { ...this.metadata, clonedFrom: this.id },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new ValidationRuleEntity(ruleData);
  }

  /**
   * Updates rule properties
   */
  update(
    updates: Partial<Omit<ValidationRule, 'id' | 'createdAt'>>
  ): ValidationRuleEntity {
    const ruleData: ValidationRule = {
      id: this.id,
      name: updates.name ?? this.name,
      description: updates.description ?? this.description,
      fandomId: updates.fandomId ?? this.fandomId,
      priority: updates.priority ?? this.priority,
      isActive: updates.isActive ?? this.isActive,
      conditions: updates.conditions ?? this.conditions,
      actions: updates.actions ?? this.actions,
      tags: updates.tags ?? this.tags,
      metadata: updates.metadata ?? this.metadata,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };

    return new ValidationRuleEntity(ruleData);
  }

  /**
   * Serializes rule to JSON
   */
  toJSON(): ValidationRule {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      fandomId: this.fandomId,
      priority: this.priority,
      isActive: this.isActive,
      conditions: this.conditions,
      actions: this.actions,
      tags: this.tags,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/**
 * RuleTemplate Entity
 *
 * Manages reusable rule templates with placeholder replacement.
 * Enables sharing and standardization of common validation patterns.
 */
export class RuleTemplate {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly category: string;
  public readonly conditions: RuleCondition[];
  public readonly actions: RuleAction[];
  public readonly placeholders: RulePlaceholder[];
  public readonly defaultPriority: number;
  public readonly tags: string[];
  public readonly isPublic: boolean;
  public readonly authorId: string;
  public readonly usageCount: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: RuleTemplateData) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.conditions = data.conditions;
    this.actions = data.actions;
    this.placeholders = data.placeholders || [];
    this.defaultPriority = data.defaultPriority;
    this.tags = data.tags || [];
    this.isPublic = data.isPublic;
    this.authorId = data.authorId;
    this.usageCount = data.usageCount || 0;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Validates template structure
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!this.name.trim()) {
      errors.push('Template name is required');
    }

    if (!this.category.trim()) {
      errors.push('Template category is required');
    }

    if (!this.authorId) {
      errors.push('Author ID is required');
    }

    // Conditions validation
    if (!this.conditions || this.conditions.length === 0) {
      errors.push('At least one condition template is required');
    }

    // Actions validation
    if (!this.actions || this.actions.length === 0) {
      errors.push('At least one action template is required');
    }

    // Placeholder validation
    const referencedPlaceholders = this.extractPlaceholders();
    const definedPlaceholders = new Set(this.placeholders.map(p => p.key));

    referencedPlaceholders.forEach(placeholder => {
      if (!definedPlaceholders.has(placeholder)) {
        errors.push(`Undefined placeholder: ${placeholder}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extracts all placeholder references from conditions and actions
   */
  private extractPlaceholders(): Set<string> {
    const placeholders = new Set<string>();
    const placeholderRegex = /\{\{(\w+)\}\}/g;

    const extractFromObject = (obj: any) => {
      if (typeof obj === 'string') {
        let match;
        while ((match = placeholderRegex.exec(obj)) !== null) {
          placeholders.add(match[1]);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(extractFromObject);
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(extractFromObject);
      }
    };

    // Extract from name and description
    extractFromObject(this.name);
    extractFromObject(this.description);

    // Extract from conditions and actions
    extractFromObject(this.conditions);
    extractFromObject(this.actions);

    return placeholders;
  }

  /**
   * Generates a rule from this template
   */
  instantiate(
    placeholders: Record<string, any>,
    fandomId: string
  ): ValidationRuleEntity {
    // Validate placeholders
    const requiredPlaceholders = this.placeholders
      .filter(p => p.required)
      .map(p => p.key);

    const missingPlaceholders = requiredPlaceholders.filter(
      key => !(key in placeholders)
    );

    if (missingPlaceholders.length > 0) {
      throw new Error(
        `Missing required placeholders: ${missingPlaceholders.join(', ')}`
      );
    }

    return ValidationRuleEntity.fromTemplate(this, placeholders, fandomId);
  }

  /**
   * Creates a copy of the template
   */
  clone(): RuleTemplate {
    const templateData: RuleTemplateData = {
      id: `${this.id}_copy_${Date.now()}`,
      name: `${this.name} (Copy)`,
      description: this.description,
      category: this.category,
      conditions: JSON.parse(JSON.stringify(this.conditions)),
      actions: JSON.parse(JSON.stringify(this.actions)),
      placeholders: JSON.parse(JSON.stringify(this.placeholders)),
      defaultPriority: this.defaultPriority,
      tags: [...this.tags],
      isPublic: false, // Copies are private by default
      authorId: this.authorId,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new RuleTemplate(templateData);
  }

  /**
   * Increments usage count
   */
  incrementUsage(): RuleTemplate {
    const templateData: RuleTemplateData = {
      ...this.toJSON(),
      usageCount: this.usageCount + 1,
      updatedAt: new Date(),
    };

    return new RuleTemplate(templateData);
  }

  /**
   * Serializes template to JSON
   */
  toJSON(): RuleTemplateData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      conditions: this.conditions,
      actions: this.actions,
      placeholders: this.placeholders,
      defaultPriority: this.defaultPriority,
      tags: this.tags,
      isPublic: this.isPublic,
      authorId: this.authorId,
      usageCount: this.usageCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Supporting interfaces
export interface RuleTemplateData {
  id: string;
  name: string;
  description: string;
  category: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  placeholders?: RulePlaceholder[];
  defaultPriority: number;
  tags?: string[];
  isPublic: boolean;
  authorId: string;
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RulePlaceholder {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  validationRules?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: any[];
  };
}

/**
 * Template Categories for organization
 */
export const TEMPLATE_CATEGORIES = {
  SHIPPING: 'shipping',
  CHARACTER: 'character',
  PLOT: 'plot',
  SETTING: 'setting',
  GENRE: 'genre',
  WARNING: 'warning',
  QUALITY: 'quality',
  CUSTOM: 'custom',
} as const;

export type TemplateCategory =
  (typeof TEMPLATE_CATEGORIES)[keyof typeof TEMPLATE_CATEGORIES];
