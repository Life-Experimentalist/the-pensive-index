import {
  ValidationRule,
  RuleCondition,
  RuleAction,
  RuleTemplate,
  ValidationRuleType,
  ValidationSeverity,
} from '../../types/validation-rules';

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
  public readonly ruleType: ValidationRuleType;
  public readonly category: string;
  public readonly appliesTo: string[];
  public readonly conditions: RuleCondition[];
  public readonly actions: RuleAction[];
  public readonly severity: ValidationSeverity;
  public readonly message: string;
  public readonly isActive: boolean;
  public readonly priority: number;
  public readonly version: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: string;
  public readonly updatedBy: string;

  constructor(data: ValidationRule) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.fandomId = data.fandomId;
    this.ruleType = data.ruleType;
    this.category = data.category;
    this.appliesTo = data.appliesTo;
    this.conditions = data.conditions;
    this.actions = data.actions;
    this.severity = data.severity;
    this.message = data.message;
    this.isActive = data.isActive;
    this.priority = data.priority;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
  }

  /**
   * Creates a validation rule from template
   */
  static fromTemplate(
    template: RuleTemplate,
    placeholders: Record<string, any>,
    fandomId: string
  ): ValidationRuleEntity {
    // Apply placeholders to template
    const resolvedName = template.name.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => placeholders[key] || key
    );
    const resolvedDescription = template.description.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => placeholders[key] || key
    );

    // For now, use template conditions/actions as-is
    // In a full implementation, this would resolve parameters
    const ruleData: ValidationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: resolvedName,
      description: resolvedDescription,
      fandomId,
      ruleType: template.ruleType,
      category: template.category,
      appliesTo: ['pathway'], // Default
      conditions: template.conditionTemplate as RuleCondition[], // Cast for now
      actions: template.actionTemplate as RuleAction[], // Cast for now
      severity: 'error', // Default
      message: 'Validation rule created from template',
      isActive: true,
      priority: 0,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: template.createdBy || 'system',
      updatedBy: template.createdBy || 'system',
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

    if (!condition.conditionType) {
      errors.push('Condition type is required');
    }

    if (!condition.targetType) {
      errors.push('Condition target type is required');
    }

    // Type-specific validation
    switch (condition.conditionType) {
      case 'has_tag':
        if (!condition.targetIds || condition.targetIds.length === 0) {
          errors.push('Tag condition requires target tag IDs');
        }
        break;

      case 'has_plot_block':
        if (!condition.targetIds || condition.targetIds.length === 0) {
          errors.push('Plot block condition requires target plot block IDs');
        }
        break;

      case 'tag_count':
        if (typeof condition.value !== 'number') {
          errors.push('Tag count condition requires numeric value');
        }
        break;

      case 'plot_block_depth':
        if (typeof condition.value !== 'number') {
          errors.push('Plot block depth condition requires numeric value');
        }
        break;

      case 'custom_expression':
        if (!condition.value || typeof condition.value !== 'string') {
          errors.push('Custom expression condition requires string value');
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

    if (!action.actionType) {
      errors.push('Action type is required');
    }

    if (!action.targetType) {
      errors.push('Action target type is required');
    }

    // Type-specific validation
    switch (action.actionType) {
      case 'require_tag':
      case 'forbid_tag':
      case 'suggest_tag':
        if (!action.targetIds || action.targetIds.length === 0) {
          errors.push('Tag action requires target tag IDs');
        }
        break;

      case 'require_plot_block':
        if (!action.targetIds || action.targetIds.length === 0) {
          errors.push('Plot block action requires target plot block IDs');
        }
        break;

      case 'show_message':
        if (!action.parameters?.message) {
          errors.push('Show message action requires message parameter');
        }
        break;

      case 'modify_priority':
        if (typeof action.parameters?.priority !== 'number') {
          errors.push(
            'Modify priority action requires numeric priority parameter'
          );
        }
        break;

      case 'warn_plot_development':
        if (!action.parameters?.warningType) {
          errors.push(
            'Plot development warning requires warningType parameter'
          );
        }
        break;

      case 'provide_guidance':
        if (!action.parameters?.guidance) {
          errors.push('Provide guidance action requires guidance parameter');
        }
        break;

      case 'suggest_alternatives':
        if (
          !action.parameters?.alternatives ||
          !Array.isArray(action.parameters.alternatives)
        ) {
          errors.push(
            'Suggest alternatives action requires alternatives array parameter'
          );
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
      ruleType: this.ruleType,
      category: this.category,
      appliesTo: this.appliesTo,
      priority: this.priority,
      severity: this.severity,
      message: this.message,
      isActive: this.isActive,
      conditions: JSON.parse(JSON.stringify(this.conditions)),
      actions: JSON.parse(JSON.stringify(this.actions)),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: this.version,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
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
      ruleType: updates.ruleType ?? this.ruleType,
      category: updates.category ?? this.category,
      appliesTo: updates.appliesTo ?? this.appliesTo,
      priority: updates.priority ?? this.priority,
      severity: updates.severity ?? this.severity,
      message: updates.message ?? this.message,
      isActive: updates.isActive ?? this.isActive,
      conditions: updates.conditions ?? this.conditions,
      actions: updates.actions ?? this.actions,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      version: this.version,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
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
      ruleType: this.ruleType,
      category: this.category,
      appliesTo: this.appliesTo,
      priority: this.priority,
      severity: this.severity,
      message: this.message,
      isActive: this.isActive,
      conditions: this.conditions,
      actions: this.actions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
    };
  }
}

/**
 * RuleTemplate Entity
 *
 * Manages reusable rule templates with placeholder replacement.
 * Enables sharing and standardization of common validation patterns.
 */
export class RuleTemplateEntity {
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
  clone(): RuleTemplateEntity {
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

    return new RuleTemplateEntity(templateData);
  }

  /**
   * Increments usage count
   */
  incrementUsage(): RuleTemplateEntity {
    const templateData: RuleTemplateData = {
      ...this.toJSON(),
      usageCount: this.usageCount + 1,
      updatedAt: new Date(),
    };

    return new RuleTemplateEntity(templateData);
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
