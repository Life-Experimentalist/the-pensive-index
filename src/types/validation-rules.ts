import { z } from 'zod';

// ============================================================================
// Core Enums
// ============================================================================

export const ValidationRuleType = z.enum([
  'conditional_requirement',
  'exclusivity',
  'prerequisite',
  'custom',
]);

export const ConditionType = z.enum([
  'has_tag',
  'has_plot_block',
  'tag_count',
  'plot_block_depth',
  'custom_expression',
]);

export const ConditionOperator = z.enum([
  'equals',
  'greater_than',
  'less_than',
  'contains',
  'not_contains',
  'in',
  'not_in',
]);

export const ActionType = z.enum([
  'require_tag',
  'forbid_tag',
  'suggest_tag',
  'require_plot_block',
  'show_message',
  'modify_priority',
  'warn_plot_development',
  'provide_guidance',
  'suggest_alternatives',
]);

export const TemplateCategory = z.enum([
  'shipping_rules',
  'plot_consistency',
  'tag_relationships',
  'character_dynamics',
  'plot_development_warnings',
  'custom',
]);

export const ValidationSeverity = z.enum(['error', 'warning']);
export const LogicOperator = z.enum(['AND', 'OR']);
export const TestStatus = z.enum(['pass', 'fail', 'pending']);
export const SuggestionAction = z.enum(['add', 'remove', 'replace']);
export const TargetType = z.enum(['tag', 'plot_block', 'pathway', 'message']);

// ============================================================================
// Base Schemas
// ============================================================================

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AdminEntitySchema = BaseEntitySchema.extend({
  createdBy: z.string(),
  updatedBy: z.string(),
});

// ============================================================================
// Core Entity Schemas
// ============================================================================

export const RuleConditionSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  conditionType: ConditionType,
  targetType: TargetType,
  targetIds: z.array(z.string()),
  operator: ConditionOperator,
  value: z.any(), // JSON value - type depends on operator
  logicOperator: LogicOperator,
  orderIndex: z.number().int().min(0),
});

export const RuleActionSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  actionType: ActionType,
  targetType: TargetType,
  targetIds: z.array(z.string()).optional(),
  parameters: z.record(z.string(), z.any()), // JSON object for action-specific config
  orderIndex: z.number().int().min(0),
});

export const ValidationRuleSchema = AdminEntitySchema.extend({
  fandomId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  ruleType: ValidationRuleType,
  category: z.string().min(1).max(100).default('custom'),
  appliesTo: z.array(z.string()).min(1).default(['pathway']),
  conditions: z.array(RuleConditionSchema).min(1),
  actions: z.array(RuleActionSchema).min(1),
  severity: ValidationSeverity,
  message: z.string().min(1).max(500),
  isActive: z.boolean().default(false),
  priority: z.number().int().min(0).default(0),
  version: z.number().int().min(1).default(1),
});

export const RuleTemplateParameterSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['tag', 'plot_block', 'text', 'number']),
  required: z.boolean(),
  defaultValue: z.any().optional(),
});

export const RuleTemplateSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  category: TemplateCategory,
  ruleType: ValidationRuleType,
  conditionTemplate: z.array(RuleConditionSchema.partial()),
  actionTemplate: z.array(RuleActionSchema.partial()),
  parameters: z.array(RuleTemplateParameterSchema),
  isSystem: z.boolean().default(false),
  createdBy: z.string().optional(),
});

export const ValidationViolationSchema = z.object({
  ruleId: z.string().uuid(),
  message: z.string().min(1),
  severity: ValidationSeverity,
  affectedElements: z.array(z.string()),
});

export const ValidationSuggestionSchema = z.object({
  action: SuggestionAction,
  targetType: z.enum(['tag', 'plot_block']),
  targetId: z.string(),
  reason: z.string().min(1),
});

// Plot Development Warning specific schema
export const PlotDevelopmentWarningSchema = z.object({
  warningType: z.enum([
    'character_dynamic',
    'plot_consistency',
    'relationship_conflict',
  ]),
  riskLevel: z.enum(['low', 'medium', 'high']),
  conflictDescription: z.string().min(1).max(1000),
  possibleOutcomes: z.array(z.string()),
  rectificationStrategies: z.array(
    z.object({
      strategy: z.string().min(1).max(500),
      difficulty: z.enum(['easy', 'moderate', 'difficult']),
      example: z.string().optional(),
    })
  ),
  continuationWarnings: z.array(z.string()),
});

export const CharacterDynamicWarningSchema = z.object({
  characterNames: z.array(z.string().min(1)),
  relationshipType: z.enum([
    'friendship',
    'rivalry',
    'family',
    'romantic',
    'mentor-student',
  ]),
  conflictTriggers: z.array(z.string()),
  plotElements: z.array(z.string()),
  guidanceNote: z.string().min(1).max(1000),
});

export const TestResultSchema = z.object({
  isValid: z.boolean(),
  violations: z.array(ValidationViolationSchema),
  suggestions: z.array(ValidationSuggestionSchema),
  executionTime: z.number().min(0), // milliseconds
});

// Story pathway schema (simplified for validation purposes)
export const StoryPathwaySchema = z.object({
  id: z.string().uuid(),
  fandomId: z.string(),
  tags: z.array(z.string()),
  plotBlocks: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const RuleTestSchema = BaseEntitySchema.extend({
  ruleId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  inputPathway: StoryPathwaySchema,
  expectedResult: TestResultSchema,
  actualResult: TestResultSchema.optional(),
  status: TestStatus,
  createdBy: z.string(),
  lastRunAt: z.date().optional(),
});

export const RuleVersionSchema = BaseEntitySchema.extend({
  ruleId: z.string().uuid(),
  versionNumber: z.number().int().min(1),
  snapshot: ValidationRuleSchema,
  changeDescription: z.string().min(1).max(1000),
  isActive: z.boolean().default(false),
  createdBy: z.string(),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const CreateValidationRuleRequestSchema = z.object({
  fandomId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  ruleType: ValidationRuleType,
  conditions: z
    .array(RuleConditionSchema.omit({ id: true, ruleId: true }))
    .min(1),
  actions: z.array(RuleActionSchema.omit({ id: true, ruleId: true })).min(1),
  severity: ValidationSeverity,
  message: z.string().min(1).max(500),
  priority: z.number().int().min(0).default(0),
});

export const UpdateValidationRuleRequestSchema =
  CreateValidationRuleRequestSchema.partial();

export const ValidatePathwayRequestSchema = z.object({
  pathway: StoryPathwaySchema,
  ruleIds: z.array(z.string().uuid()).optional(), // If specified, only test these rules
  performanceTarget: z.number().min(0).max(1000).default(100), // ms
});

export const ValidatePathwayResponseSchema = z.object({
  isValid: z.boolean(),
  violations: z.array(ValidationViolationSchema),
  suggestions: z.array(ValidationSuggestionSchema),
  executionTime: z.number(),
  rulesEvaluated: z.number(),
  performanceTarget: z.number(),
  metPerformanceTarget: z.boolean(),
});

export const CreateRuleTestRequestSchema = z.object({
  ruleId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  inputPathway: StoryPathwaySchema,
  expectedResult: TestResultSchema,
});

export const InstantiateTemplateRequestSchema = z.object({
  templateId: z.string().uuid(),
  parameters: z.record(z.string(), z.any()), // Template-specific parameters
  fandomId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ValidationRuleType = z.infer<typeof ValidationRuleType>;
export type ConditionType = z.infer<typeof ConditionType>;
export type ConditionOperator = z.infer<typeof ConditionOperator>;
export type ActionType = z.infer<typeof ActionType>;
export type TemplateCategory = z.infer<typeof TemplateCategory>;
export type ValidationSeverity = z.infer<typeof ValidationSeverity>;
export type LogicOperator = z.infer<typeof LogicOperator>;
export type TestStatus = z.infer<typeof TestStatus>;
export type SuggestionAction = z.infer<typeof SuggestionAction>;
export type TargetType = z.infer<typeof TargetType>;

export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type RuleAction = z.infer<typeof RuleActionSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type RuleTemplateParameter = z.infer<typeof RuleTemplateParameterSchema>;
export type RuleTemplate = z.infer<typeof RuleTemplateSchema>;
export type ValidationViolation = z.infer<typeof ValidationViolationSchema>;
export type ValidationSuggestion = z.infer<typeof ValidationSuggestionSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
export type StoryPathway = z.infer<typeof StoryPathwaySchema>;
export type RuleTest = z.infer<typeof RuleTestSchema>;
export type RuleVersion = z.infer<typeof RuleVersionSchema>;

export type CreateValidationRuleRequest = z.infer<
  typeof CreateValidationRuleRequestSchema
>;
export type UpdateValidationRuleRequest = z.infer<
  typeof UpdateValidationRuleRequestSchema
>;
export type ValidatePathwayRequest = z.infer<
  typeof ValidatePathwayRequestSchema
>;
export type ValidatePathwayResponse = z.infer<
  typeof ValidatePathwayResponseSchema
>;
export type CreateRuleTestRequest = z.infer<typeof CreateRuleTestRequestSchema>;
export type InstantiateTemplateRequest = z.infer<
  typeof InstantiateTemplateRequestSchema
>;

// ============================================================================
// Validation Helpers
// ============================================================================

export const validateConditionValue = (
  operator: ConditionOperator,
  value: any
): boolean => {
  switch (operator) {
    case 'equals':
    case 'greater_than':
    case 'less_than':
      return value !== null && value !== undefined;
    case 'contains':
    case 'not_contains':
      return typeof value === 'string';
    case 'in':
    case 'not_in':
      return Array.isArray(value);
    default:
      return false;
  }
};

export const validateRulePerformance = (
  executionTime: number,
  target: number = 100
): boolean => {
  return executionTime <= target;
};

export const isValidRuleTransition = (
  currentVersion: number,
  targetVersion: number
): boolean => {
  return targetVersion >= 1 && targetVersion <= currentVersion;
};
