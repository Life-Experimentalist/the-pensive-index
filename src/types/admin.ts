/**
 * Admin Dashboard Type Definitions
 *
 * Type definitions for the admin dashboard system including validation rules,
 * rule templates, admin permissions, and related entities.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

// ============================================================================
// ADMIN USER & PERMISSIONS
// ============================================================================

export type AdminRole = 'ProjectAdmin' | 'FandomAdmin';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  fandom_access?: string[]; // For FandomAdmin role - assigned fandoms
  permissions: Array<{
    id: string;
    name: string;
    description: string;
    scope: 'global' | 'fandom' | 'content';
  }>;
  is_active: boolean;
  last_login_at?: Date;
  preferences?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AdminPermission {
  action: string; // e.g., 'rule:create', 'template:manage', 'fandom:access'
  resource?: string; // e.g., fandomId for scoped permissions
  granted: boolean;
}

// ============================================================================
// RULE TEMPLATES
// ============================================================================

export type RuleCategory =
  | 'conditional'
  | 'exclusivity'
  | 'prerequisite'
  | 'hierarchy'
  | 'custom';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  ruleDefinition: RuleDefinitionTemplate;
  placeholders: TemplatePlaceholder[];
  createdBy: string; // AdminUser ID (ProjectAdmin only)
  version: string; // Semantic versioning
  isActive: boolean;
  usageCount: number; // Number of fandoms using this template
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleDefinitionTemplate {
  type: string;
  conditions: ConditionTemplate[];
  actions: ActionTemplate[];
  metadata: Record<string, any>;
}

export interface TemplatePlaceholder {
  key: string; // e.g., '{{SHIPPING_TAG_CLASS}}', '{{MAIN_CHARACTER}}'
  type: 'tag' | 'plotBlock' | 'tagClass' | 'string';
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface ConditionTemplate {
  type: string;
  parameters: Record<string, any>;
  operator: 'AND' | 'OR' | 'NOT';
  placeholder?: string;
}

export interface ActionTemplate {
  type: string;
  parameters: Record<string, any>;
  placeholder?: string;
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

export type RuleType =
  | 'conditional'
  | 'exclusivity'
  | 'prerequisite'
  | 'hierarchy';
export type ConditionType =
  | 'tagPresent'
  | 'plotBlockSelected'
  | 'tagClassCount'
  | 'custom';
export type ActionType = 'require' | 'exclude' | 'suggest' | 'warning';
export type LogicalOperator = 'AND' | 'OR' | 'NOT';
export type MessageSeverity = 'error' | 'warning' | 'info';

export interface ValidationRule {
  id: string;
  name: string;
  description?: string;
  fandom_id: string;
  category: string;
  priority: number;
  is_active: boolean;
  applies_to: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  version: string;
  template_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  // These would be loaded separately in a full implementation
  conditions?: any[];
  actions?: any[];
}

export interface RuleDefinition {
  type: RuleType;
  conditions: Condition[];
  actions: Action[];
  errorMessages: ErrorMessage[];
  metadata: Record<string, any>;
}

export interface Condition {
  id: string;
  type: ConditionType;
  parameters: Record<string, any>;
  operator: LogicalOperator;
  children?: Condition[]; // For nested conditions
}

export interface Action {
  type: ActionType;
  target: string; // Tag ID, Plot Block ID, or Tag Class name
  message: string;
}

export interface ErrorMessage {
  conditionId: string;
  severity: MessageSeverity;
  message: string;
  suggestedFix?: string;
}

// ============================================================================
// TAG CLASSES
// ============================================================================

export type TagClassConstraintType =
  | 'maxSelection'
  | 'minSelection'
  | 'mutuallyExclusive'
  | 'requiredWith';

export interface TagClass {
  id: string;
  fandomId: string;
  name: string;
  description?: string;
  tags: string[]; // Tag IDs belonging to this class
  validationRules: string[]; // ValidationRule IDs that apply to this class
  constraints: TagClassConstraint[];
  createdBy: string; // AdminUser ID
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagClassConstraint {
  type: TagClassConstraintType;
  value: number | string[];
  errorMessage: string;
}

// ============================================================================
// PLOT BLOCK HIERARCHIES
// ============================================================================

export type HierarchyRuleType =
  | 'parentChild'
  | 'mutuallyExclusive'
  | 'prerequisite'
  | 'autoEnable';

export interface PlotBlockHierarchy {
  id: string;
  fandomId: string;
  name: string;
  description?: string;
  rootBlocks: string[]; // Top-level PlotBlock IDs
  hierarchyRules: HierarchyRule[];
  conditionalBranches: ConditionalBranch[];
  createdBy: string; // AdminUser ID
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HierarchyRule {
  type: HierarchyRuleType;
  sourceBlockId: string;
  targetBlockId: string;
  condition?: string; // Optional condition expression
}

export interface ConditionalBranch {
  id: string;
  parentBlockId: string;
  condition: string; // Expression to evaluate
  enabledBlocks: string[]; // Blocks enabled when condition is true
  disabledBlocks: string[]; // Blocks disabled when condition is true
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export type TestScenarioStatus = 'draft' | 'passing' | 'failing' | 'outdated';

export interface TestScenario {
  id: string;
  fandomId: string;
  name: string;
  description?: string;
  inputData: TestInputData;
  expectedResults: TestExpectedResult[];
  actualResults?: TestActualResult[]; // Populated after test execution
  createdBy: string; // AdminUser ID
  lastExecuted?: Date;
  status: TestScenarioStatus;
  tags: string[]; // For categorizing test scenarios
  createdAt: Date;
  updatedAt: Date;
}

export interface TestInputData {
  selectedTags: string[];
  selectedPlotBlocks: SelectedPlotBlock[];
  pathway: any; // StoryPathway from existing types
}

export interface SelectedPlotBlock {
  id: string;
  selected: boolean;
  children?: SelectedPlotBlock[];
}

export interface TestExpectedResult {
  ruleId: string;
  shouldTrigger: boolean;
  expectedSeverity: MessageSeverity;
  expectedMessage?: string;
}

export interface TestActualResult {
  ruleId: string;
  triggered: boolean;
  severity: MessageSeverity;
  message: string;
  executionTime: number; // milliseconds
}

// ============================================================================
// RULE SET EXPORT/IMPORT
// ============================================================================

export interface RuleSetExport {
  id: string;
  name: string;
  sourceFandomId: string;
  sourceFandomName: string;
  exportData: ExportData;
  metadata: ExportMetadata;
  createdBy: string; // AdminUser ID
  downloadCount: number;
  isPublic: boolean; // Can other fandoms import this?
  createdAt: Date;
}

export interface ExportData {
  version: string; // Export format version
  validationRules: ValidationRule[];
  tagClasses: TagClass[];
  plotBlockHierarchies: PlotBlockHierarchy[];
  testScenarios: TestScenario[];
  dependencies: ExportDependency[]; // External references
}

export interface ExportDependency {
  type: 'template' | 'tag' | 'plotBlock';
  sourceId: string;
  sourceName: string;
  required: boolean;
}

export interface ExportMetadata {
  description: string;
  tags: string[];
  compatibility: string[]; // Compatible fandom types
  exportedAt: Date;
  totalRules: number;
  totalTagClasses: number;
}

// ============================================================================
// RULE ENGINE TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  performance: PerformanceMetrics;
}

export interface ValidationError {
  ruleId: string;
  severity: MessageSeverity;
  message: string;
  suggestedFix?: string;
  affectedElements: string[]; // Tag IDs, Plot Block IDs, etc.
}

export interface ValidationWarning {
  ruleId: string;
  message: string;
  suggestion?: string;
}

export interface PerformanceMetrics {
  totalExecutionTime: number; // milliseconds
  rulesEvaluated: number;
  averageRuleTime: number; // milliseconds
  slowestRule?: {
    ruleId: string;
    executionTime: number;
  };
}

// ============================================================================
// RULE BUILDER TYPES (for React Flow integration)
// ============================================================================

export interface RuleBuilderNode {
  id: string;
  type: 'condition' | 'action' | 'logic';
  position: { x: number; y: number };
  data: RuleBuilderNodeData;
}

export interface RuleBuilderNodeData {
  label: string;
  nodeType: string;
  parameters: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export interface RuleBuilderEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  label?: string;
}

export interface RuleBuilderState {
  rule: Partial<ValidationRule>;
  nodes: RuleBuilderNode[];
  edges: RuleBuilderEdge[];
  selectedNode: string | null;
  isValid: boolean;
  errors: string[];
  isDirty: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface AdminListResponse<T> extends AdminApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// FORM & UI TYPES
// ============================================================================

export interface AdminFormProps<T = any> {
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export interface AdminTableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface AdminTableProps<T = any> {
  data: T[];
  columns: AdminTableColumn<T>[];
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<keyof T, any>) => void;
  onRowAction?: (action: string, row: T) => void;
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

export type AdminEntity =
  | AdminUser
  | RuleTemplate
  | ValidationRule
  | TagClass
  | PlotBlockHierarchy
  | TestScenario
  | RuleSetExport;

export type AdminEntityType =
  | 'adminUser'
  | 'ruleTemplate'
  | 'validationRule'
  | 'tagClass'
  | 'plotBlockHierarchy'
  | 'testScenario'
  | 'ruleSetExport';
