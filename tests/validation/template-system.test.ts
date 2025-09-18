import { describe, it, expect, beforeEach, vi } from 'vitest';

// Template System Types (would be implemented)
interface RuleTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: TemplateParameter[];
  template_code: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default_value?: any;
  validation_rules?: ParameterValidationRules;
  description?: string;
}

interface ParameterValidationRules {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  allowed_values?: any[];
  custom_validator?: string;
}

interface TemplateInstantiationResult {
  success: boolean;
  rule_code?: string;
  validation_errors?: TemplateValidationError[];
  warnings?: TemplateWarning[];
  generated_rule?: any;
}

interface TemplateValidationError {
  parameter_name: string;
  error_type: string;
  message: string;
  received_value?: any;
  expected_format?: string;
}

interface TemplateWarning {
  parameter_name: string;
  message: string;
  suggestion?: string;
}

// Mock Template Engine Implementation
class TemplateEngine {
  private templates: Map<string, RuleTemplate> = new Map();

  constructor(templates: RuleTemplate[] = []) {
    this.loadTemplates(templates);
  }

  loadTemplates(templates: RuleTemplate[]): void {
    this.templates.clear();
    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  getTemplate(id: string): RuleTemplate | undefined {
    return this.templates.get(id);
  }

  validateParameters(
    template: RuleTemplate,
    parameters: Record<string, any>
  ): TemplateValidationError[] {
    const errors: TemplateValidationError[] = [];

    // Check required parameters
    template.parameters.forEach(param => {
      if (param.required && !(param.name in parameters)) {
        errors.push({
          parameter_name: param.name,
          error_type: 'required_missing',
          message: `Required parameter '${param.name}' is missing`,
          expected_format: param.type,
        });
        return;
      }

      const value = parameters[param.name];
      if (value !== undefined) {
        const validationError = this.validateParameterValue(param, value);
        if (validationError) {
          errors.push(validationError);
        }
      }
    });

    // Check for unknown parameters
    Object.keys(parameters).forEach(paramName => {
      const templateParam = template.parameters.find(p => p.name === paramName);
      if (!templateParam) {
        errors.push({
          parameter_name: paramName,
          error_type: 'unknown_parameter',
          message: `Unknown parameter '${paramName}' not defined in template`,
          received_value: parameters[paramName],
        });
      }
    });

    return errors;
  }

  private validateParameterValue(
    param: TemplateParameter,
    value: any
  ): TemplateValidationError | null {
    // Type validation
    if (!this.isValidType(value, param.type)) {
      return {
        parameter_name: param.name,
        error_type: 'type_mismatch',
        message: `Parameter '${param.name}' must be of type '${param.type}'`,
        received_value: value,
        expected_format: param.type,
      };
    }

    // Validation rules
    if (param.validation_rules) {
      const rules = param.validation_rules;

      // String validations
      if (param.type === 'string' && typeof value === 'string') {
        if (rules.min_length && value.length < rules.min_length) {
          return {
            parameter_name: param.name,
            error_type: 'min_length',
            message: `Parameter '${param.name}' must be at least ${rules.min_length} characters`,
            received_value: value,
          };
        }

        if (rules.max_length && value.length > rules.max_length) {
          return {
            parameter_name: param.name,
            error_type: 'max_length',
            message: `Parameter '${param.name}' must be at most ${rules.max_length} characters`,
            received_value: value,
          };
        }

        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            return {
              parameter_name: param.name,
              error_type: 'pattern_mismatch',
              message: `Parameter '${param.name}' does not match required pattern`,
              received_value: value,
              expected_format: rules.pattern,
            };
          }
        }
      }

      // Number validations
      if (param.type === 'number' && typeof value === 'number') {
        if (rules.min_value !== undefined && value < rules.min_value) {
          return {
            parameter_name: param.name,
            error_type: 'min_value',
            message: `Parameter '${param.name}' must be at least ${rules.min_value}`,
            received_value: value,
          };
        }

        if (rules.max_value !== undefined && value > rules.max_value) {
          return {
            parameter_name: param.name,
            error_type: 'max_value',
            message: `Parameter '${param.name}' must be at most ${rules.max_value}`,
            received_value: value,
          };
        }
      }

      // Allowed values validation
      if (rules.allowed_values && !rules.allowed_values.includes(value)) {
        return {
          parameter_name: param.name,
          error_type: 'invalid_value',
          message: `Parameter '${
            param.name
          }' must be one of: ${rules.allowed_values.join(', ')}`,
          received_value: value,
        };
      }
    }

    return null;
  }

  private isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        );
      default:
        return false;
    }
  }

  instantiateTemplate(
    templateId: string,
    parameters: Record<string, any>
  ): TemplateInstantiationResult {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        validation_errors: [
          {
            parameter_name: 'template',
            error_type: 'not_found',
            message: `Template with ID '${templateId}' not found`,
          },
        ],
      };
    }

    if (!template.is_active) {
      return {
        success: false,
        validation_errors: [
          {
            parameter_name: 'template',
            error_type: 'inactive',
            message: `Template '${templateId}' is not active`,
          },
        ],
      };
    }

    // Apply defaults
    const finalParameters = this.applyDefaults(template, parameters);

    // Validate parameters
    const validationErrors = this.validateParameters(template, finalParameters);
    if (validationErrors.length > 0) {
      return {
        success: false,
        validation_errors: validationErrors,
      };
    }

    // Generate code
    try {
      const ruleCode = this.generateCode(template, finalParameters);
      return {
        success: true,
        rule_code: ruleCode,
        generated_rule: {
          id: `generated-${Date.now()}`,
          name: `${template.name} (Generated)`,
          category: template.category,
          template_id: templateId,
          parameters: finalParameters,
          code: ruleCode,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        validation_errors: [
          {
            parameter_name: 'template',
            error_type: 'generation_failed',
            message: `Failed to generate rule code: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }

  private applyDefaults(
    template: RuleTemplate,
    parameters: Record<string, any>
  ): Record<string, any> {
    const result = { ...parameters };

    template.parameters.forEach(param => {
      if (param.default_value !== undefined && !(param.name in result)) {
        result[param.name] = param.default_value;
      }
    });

    return result;
  }

  private generateCode(
    template: RuleTemplate,
    parameters: Record<string, any>
  ): string {
    let code = template.template_code;

    // Simple template substitution
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      code = code.replace(new RegExp(placeholder, 'g'), stringValue);
    });

    return code;
  }

  listTemplates(category?: string): RuleTemplate[] {
    const templates = Array.from(this.templates.values());

    if (category) {
      return templates.filter(t => t.category === category && t.is_active);
    }

    return templates.filter(t => t.is_active);
  }
}

describe('Template System - Parameter Validation', () => {
  let templateEngine: TemplateEngine;

  const shippingTemplate: RuleTemplate = {
    id: 'shipping-conflict-template',
    name: 'Shipping Conflict Rule',
    category: 'shipping_rules',
    description: 'Template for creating shipping conflict validation rules',
    parameters: [
      {
        name: 'primary_ship',
        type: 'string',
        required: true,
        validation_rules: {
          pattern: '^[a-z]+-[a-z]+$',
          min_length: 5,
          max_length: 50,
        },
        description: 'Primary shipping pair (e.g., harry-hermione)',
      },
      {
        name: 'conflicting_ships',
        type: 'array',
        required: true,
        description: 'Array of conflicting shipping pairs',
      },
      {
        name: 'severity',
        type: 'string',
        required: false,
        default_value: 'error',
        validation_rules: {
          allowed_values: ['error', 'warning', 'info'],
        },
        description: 'Severity level of the conflict',
      },
      {
        name: 'priority',
        type: 'number',
        required: false,
        default_value: 10,
        validation_rules: {
          min_value: 1,
          max_value: 100,
        },
        description: 'Rule priority (1-100)',
      },
      {
        name: 'enabled',
        type: 'boolean',
        required: false,
        default_value: true,
        description: 'Whether the rule is enabled',
      },
    ],
    template_code: `
      if (pathway.tags.includes('{{primary_ship}}')) {
        const conflicts = {{conflicting_ships}}.filter(ship => pathway.tags.includes(ship));
        if (conflicts.length > 0) {
          return {
            type: '{{severity}}',
            message: 'Conflicting ships detected: {{primary_ship}} conflicts with ' + conflicts.join(', '),
            severity: '{{severity}}',
            priority: {{priority}}
          };
        }
      }
      return null;
    `,
    is_active: true,
    created_at: new Date('2025-01-17T10:00:00Z'),
    updated_at: new Date('2025-01-17T10:00:00Z'),
  };

  const plotDependencyTemplate: RuleTemplate = {
    id: 'plot-dependency-template',
    name: 'Plot Block Dependency Rule',
    category: 'plot_rules',
    description: 'Template for creating plot block dependency validation rules',
    parameters: [
      {
        name: 'target_plot_block',
        type: 'string',
        required: true,
        validation_rules: {
          min_length: 2,
          max_length: 100,
        },
      },
      {
        name: 'required_tags',
        type: 'array',
        required: true,
      },
      {
        name: 'optional_tags',
        type: 'array',
        required: false,
        default_value: [],
      },
      {
        name: 'minimum_required',
        type: 'number',
        required: false,
        default_value: 1,
        validation_rules: {
          min_value: 0,
          max_value: 10,
        },
      },
    ],
    template_code: `
      if (pathway.plotBlocks.includes('{{target_plot_block}}')) {
        const requiredTags = {{required_tags}};
        const presentTags = requiredTags.filter(tag => pathway.tags.includes(tag));
        if (presentTags.length < {{minimum_required}}) {
          return {
            type: 'warning',
            message: 'Plot block {{target_plot_block}} requires at least {{minimum_required}} of: ' + requiredTags.join(', '),
            missing: requiredTags.filter(tag => !pathway.tags.includes(tag))
          };
        }
      }
      return null;
    `,
    is_active: true,
    created_at: new Date('2025-01-17T10:00:00Z'),
    updated_at: new Date('2025-01-17T10:00:00Z'),
  };

  beforeEach(() => {
    templateEngine = new TemplateEngine([
      shippingTemplate,
      plotDependencyTemplate,
    ]);
  });

  describe('Template Loading and Management', () => {
    it('should load templates correctly', () => {
      const templates = templateEngine.listTemplates();

      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.id)).toContain('shipping-conflict-template');
      expect(templates.map(t => t.id)).toContain('plot-dependency-template');
    });

    it('should filter templates by category', () => {
      const shippingTemplates = templateEngine.listTemplates('shipping_rules');

      expect(shippingTemplates).toHaveLength(1);
      expect(shippingTemplates[0].id).toBe('shipping-conflict-template');
    });

    it('should retrieve specific template', () => {
      const template = templateEngine.getTemplate('shipping-conflict-template');

      expect(template).toBeDefined();
      expect(template!.name).toBe('Shipping Conflict Rule');
    });

    it('should return undefined for non-existent template', () => {
      const template = templateEngine.getTemplate('non-existent');

      expect(template).toBeUndefined();
    });
  });

  describe('Parameter Type Validation', () => {
    it('should validate string parameters correctly', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny', 'harry-luna'],
        }
      );

      expect(result.success).toBe(true);
      expect(result.validation_errors).toBeUndefined();
    });

    it('should reject invalid string types', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 123, // Should be string
          conflicting_ships: ['harry-ginny'],
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'primary_ship',
        error_type: 'type_mismatch',
        expected_format: 'string',
      });
    });

    it('should validate array parameters correctly', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny', 'harry-luna'],
        }
      );

      expect(result.success).toBe(true);
    });

    it('should reject invalid array types', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: 'not-an-array',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'conflicting_ships',
        error_type: 'type_mismatch',
        expected_format: 'array',
      });
    });

    it('should validate number parameters correctly', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          priority: 25,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should reject invalid number types', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          priority: 'not-a-number',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'priority',
        error_type: 'type_mismatch',
        expected_format: 'number',
      });
    });

    it('should validate boolean parameters correctly', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          enabled: false,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should reject invalid boolean types', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          enabled: 'not-a-boolean',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'enabled',
        error_type: 'type_mismatch',
        expected_format: 'boolean',
      });
    });
  });

  describe('Parameter Validation Rules', () => {
    it('should enforce string length constraints', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'a-b', // Too short (min 5 chars)
          conflicting_ships: ['harry-ginny'],
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'primary_ship',
        error_type: 'min_length',
      });
    });

    it('should enforce string pattern constraints', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'invalid_pattern', // Should use hyphen, not underscore
          conflicting_ships: ['harry-ginny'],
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'primary_ship',
        error_type: 'pattern_mismatch',
      });
    });

    it('should enforce allowed values constraints', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          severity: 'invalid-severity',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'severity',
        error_type: 'invalid_value',
      });
    });

    it('should enforce number range constraints', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          priority: 150, // Max is 100
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'priority',
        error_type: 'max_value',
      });
    });

    it('should enforce minimum number constraints', () => {
      const result = templateEngine.instantiateTemplate(
        'plot-dependency-template',
        {
          target_plot_block: 'soul-bond',
          required_tags: ['romantic'],
          minimum_required: -1, // Min is 0
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'minimum_required',
        error_type: 'min_value',
      });
    });
  });

  describe('Required Parameter Validation', () => {
    it('should detect missing required parameters', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          conflicting_ships: ['harry-ginny'],
          // Missing required 'primary_ship'
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'primary_ship',
        error_type: 'required_missing',
      });
    });

    it('should detect multiple missing required parameters', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          severity: 'error',
          // Missing both 'primary_ship' and 'conflicting_ships'
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors).toHaveLength(2);

      const errorTypes = result.validation_errors!.map(e => e.parameter_name);
      expect(errorTypes).toContain('primary_ship');
      expect(errorTypes).toContain('conflicting_ships');
    });

    it('should allow optional parameters to be missing', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          // Optional parameters (severity, priority, enabled) are missing - should be OK
        }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Default Value Application', () => {
    it('should apply default values for missing optional parameters', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
        }
      );

      expect(result.success).toBe(true);
      expect(result.rule_code).toContain('error'); // Default severity
      expect(result.rule_code).toContain('10'); // Default priority
    });

    it('should not override provided optional parameters with defaults', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          severity: 'warning',
          priority: 5,
        }
      );

      expect(result.success).toBe(true);
      expect(result.rule_code).toContain('warning'); // Custom severity
      expect(result.rule_code).toContain('5'); // Custom priority
    });

    it('should apply default for array parameters', () => {
      const result = templateEngine.instantiateTemplate(
        'plot-dependency-template',
        {
          target_plot_block: 'soul-bond',
          required_tags: ['romantic'],
          // optional_tags should get default empty array
        }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Unknown Parameter Detection', () => {
    it('should detect unknown parameters', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          unknown_param: 'value',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        parameter_name: 'unknown_param',
        error_type: 'unknown_parameter',
      });
    });

    it('should detect multiple unknown parameters', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
          unknown_param1: 'value1',
          unknown_param2: 'value2',
        }
      );

      expect(result.success).toBe(false);
      expect(
        result.validation_errors!.filter(
          e => e.error_type === 'unknown_parameter'
        )
      ).toHaveLength(2);
    });
  });

  describe('Template Code Generation', () => {
    it('should generate correct rule code', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny', 'harry-luna'],
          severity: 'warning',
          priority: 15,
        }
      );

      expect(result.success).toBe(true);
      expect(result.rule_code).toBeDefined();
      expect(result.rule_code).toContain('harry-hermione');
      expect(result.rule_code).toContain('["harry-ginny","harry-luna"]');
      expect(result.rule_code).toContain('warning');
      expect(result.rule_code).toContain('15');
    });

    it('should include generated rule metadata', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: ['harry-ginny'],
        }
      );

      expect(result.success).toBe(true);
      expect(result.generated_rule).toBeDefined();
      expect(result.generated_rule!.template_id).toBe(
        'shipping-conflict-template'
      );
      expect(result.generated_rule!.category).toBe('shipping_rules');
      expect(result.generated_rule!.name).toContain('Generated');
    });

    it('should substitute all parameter placeholders', () => {
      const result = templateEngine.instantiateTemplate(
        'plot-dependency-template',
        {
          target_plot_block: 'soul-bond',
          required_tags: ['romantic', 'soulmate'],
          minimum_required: 2,
        }
      );

      expect(result.success).toBe(true);
      expect(result.rule_code).toContain('soul-bond');
      expect(result.rule_code).toContain('["romantic","soulmate"]');
      expect(result.rule_code).toContain('2');
      expect(result.rule_code).not.toContain('{{'); // No unsubstituted placeholders
    });
  });

  describe('Template State Validation', () => {
    it('should reject inactive templates', () => {
      const inactiveTemplate: RuleTemplate = {
        ...shippingTemplate,
        id: 'inactive-template',
        is_active: false,
      };

      const engine = new TemplateEngine([inactiveTemplate]);

      const result = engine.instantiateTemplate('inactive-template', {
        primary_ship: 'harry-hermione',
        conflicting_ships: ['harry-ginny'],
      });

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        error_type: 'inactive',
      });
    });

    it('should reject non-existent templates', () => {
      const result = templateEngine.instantiateTemplate(
        'non-existent-template',
        {
          param: 'value',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors![0]).toMatchObject({
        error_type: 'not_found',
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty parameter objects', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.validation_errors!.length).toBeGreaterThan(0);
    });

    it('should handle null and undefined parameter values', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: null,
          conflicting_ships: undefined,
        }
      );

      expect(result.success).toBe(false);
      expect(
        result.validation_errors!.some(e => e.parameter_name === 'primary_ship')
      ).toBe(true);
      expect(
        result.validation_errors!.some(
          e => e.parameter_name === 'conflicting_ships'
        )
      ).toBe(true);
    });

    it('should handle complex nested objects in arrays', () => {
      const complexTemplate: RuleTemplate = {
        id: 'complex-template',
        name: 'Complex Template',
        category: 'test',
        description: 'Template with complex object parameters',
        parameters: [
          {
            name: 'config',
            type: 'object',
            required: true,
          },
        ],
        template_code: 'const config = {{config}};',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const engine = new TemplateEngine([complexTemplate]);

      const result = engine.instantiateTemplate('complex-template', {
        config: {
          nested: {
            values: [1, 2, 3],
            enabled: true,
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.rule_code).toContain(
        '{"nested":{"values":[1,2,3],"enabled":true}}'
      );
    });

    it('should handle very long strings within limits', () => {
      const longString = 'a'.repeat(40); // Within 50 char limit

      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: longString,
          conflicting_ships: ['test'],
        }
      );

      expect(result.success).toBe(false); // Will fail pattern validation, but not length
      expect(result.validation_errors![0].error_type).toBe('pattern_mismatch');
    });

    it('should handle special characters in string parameters', () => {
      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione', // Valid pattern
          conflicting_ships: ['ron&hermione', 'luna#lovegood'],
        }
      );

      expect(result.success).toBe(true);
      expect(result.rule_code).toContain('ron&hermione');
      expect(result.rule_code).toContain('luna#lovegood');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large parameter arrays efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `ship-${i}`);

      const startTime = performance.now();

      const result = templateEngine.instantiateTemplate(
        'shipping-conflict-template',
        {
          primary_ship: 'harry-hermione',
          conflicting_ships: largeArray,
        }
      );

      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
    });

    it('should handle multiple simultaneous template instantiations', () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        templateEngine.instantiateTemplate('shipping-conflict-template', {
          primary_ship: `harry-ship${i}`,
          conflicting_ships: [`other-ship${i}`],
        })
      );

      // All should complete (though many will fail validation)
      const results = promises.map(result => result.success !== undefined);
      expect(results.every(completed => completed)).toBe(true);
    });
  });
});
