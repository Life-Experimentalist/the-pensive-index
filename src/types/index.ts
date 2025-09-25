// Core entity types for The Pensieve Index
// These match the database schema and API contracts

// Rule definition types
export interface RuleDefinition {
  type: string;
  conditions: any[];
  actions: any[];
  errorMessages: any[];
  metadata: Record<string, any>;
}

// Admin validation rule types
export interface ValidationRule {
  id: string;
  name: string;
  description?: string;
  fandom_id: string;
  category: string;
  priority: number;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  template_id?: string;
  version: string;
  ruleDefinition: RuleDefinition;
  applies_to: string[];
  tags?: string[];
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  metadata?: Record<string, any>;
}

export interface RuleCondition {
  type: 'tag_present' | 'tag_absent' | 'plot_block_present' | 'tag_count' | 'custom';
  target: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'error' | 'warning' | 'suggestion' | 'auto_add' | 'auto_remove';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  targetTags?: string[];
  targetPlotBlocks?: string[];
}

export interface Fandom {
  id: string;
  name: string;
  description: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Tag {
  id: string;
  name: string;
  fandom_id: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // Validation and relationship properties
  requires?: string[];
  enhances?: string[];
  tag_class_id?: string;
}

export interface TagClass {
  id: string;
  name: string;
  fandom_id: string;
  description: string;
  validation_rules: TagClassValidationRules;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TagClassValidationRules {
  // Mutual exclusion rules
  mutual_exclusion?: {
    within_class: boolean;
    conflicting_tags?: string[];
    conflicting_classes?: string[];
  };

  // Required context rules
  required_context?: {
    required_tags?: string[];
    required_classes?: string[];
    required_metadata?: string[];
  };

  // Instance counting rules
  instance_limits?: {
    max_instances?: number;
    min_instances?: number;
    exact_instances?: number;
  };

  // Category applicability rules
  category_restrictions?: {
    applicable_categories?: string[];
    excluded_categories?: string[];
    required_plot_blocks?: string[];
  };

  // Dependency rules
  dependencies?: {
    requires?: string[];
    enhances?: string[];
    enables?: string[];
  };
}

export interface PlotBlock {
  id: string;
  name: string;
  fandom_id: string;
  category: string;
  description: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // Relationship properties
  conflicts_with?: string[];
  requires?: string[];
  soft_requires?: string[];
  enhances?: string[];
  enabled_by?: string[];
  excludes_categories?: string[];
  max_instances?: number;

  // Hierarchical properties
  parent_id?: string;
  children?: string[];
}

export interface PlotBlockCondition {
  id: string;
  plot_block_id: string;
  parent_id?: string;
  name: string;
  description: string;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // Relationship properties
  conflicts_with?: string[];
  requires?: string[];
  enables?: string[];
  children?: string[];
}

export interface Story {
  id: string;
  title: string;
  author: string;
  fandom_id: string;
  description?: string;
  url?: string;
  word_count?: number;
  chapter_count?: number;
  status: 'complete' | 'incomplete' | 'abandoned' | 'hiatus';
  rating: string;
  warnings?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // Computed properties
  relevance_score?: number;
  tag_match_count?: number;
  plot_block_match_count?: number;
}

export interface StoryTag {
  story_id: string;
  tag_id: string;
  relevance_weight: number;
  created_at: Date;
}

export interface StoryPlotBlock {
  story_id: string;
  plot_block_id: string;
  relevance_weight: number;
  created_at: Date;
}

// Validation context types
export interface ValidationContext {
  plot_block?: PlotBlock;
  applied_tags: string[];
  all_tags: Tag[];
  tag_classes: TagClass[];
  metadata: Record<string, any>;
}

export interface ConflictDetectionContext {
  selected_plot_blocks: PlotBlock[];
  selected_conditions: PlotBlockCondition[];
  all_plot_blocks: PlotBlock[];
  all_conditions: PlotBlockCondition[];
}

export interface DependencyValidationContext {
  selected_plot_blocks: PlotBlock[];
  selected_conditions: PlotBlockCondition[];
  selected_tags: string[];
  all_plot_blocks: PlotBlock[];
  all_conditions: PlotBlockCondition[];
  all_tags: Tag[];
}

export interface CircularReferenceContext {
  plot_blocks: PlotBlock[];
  conditions: PlotBlockCondition[];
  tags: Tag[];
}

// Validation result types
export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: ValidationSuggestion[];
}

export interface ValidationError {
  type: string;
  message: string;
  field?: string;
  value?: any;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  type: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationSuggestion {
  type: string;
  message: string;
  action: string;
  target_id?: string;
  alternative_ids?: string[];
}

export interface ConflictResult {
  has_conflicts: boolean;
  conflicts: Array<{
    type:
      | 'direct_exclusion'
      | 'category_exclusion'
      | 'instance_limit'
      | 'condition_conflict';
    source_id: string;
    target_id: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  suggested_resolutions?: Array<{
    action: 'remove' | 'replace' | 'modify';
    target_id: string;
    alternative_ids?: string[];
    reason: string;
  }>;
}

export interface DependencyResult {
  is_valid: boolean;
  missing_requirements: Array<{
    type: 'plot_block' | 'condition' | 'tag';
    source_id: string;
    required_id: string;
    requirement_type: 'hard' | 'soft' | 'enhancement';
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  dependency_chain?: Array<{
    id: string;
    type: 'plot_block' | 'condition' | 'tag';
    dependencies: string[];
    level: number;
  }>;
  suggested_additions?: Array<{
    id: string;
    type: 'plot_block' | 'condition' | 'tag';
    name: string;
    reason: string;
    impact: 'required' | 'recommended' | 'enhancement';
  }>;
}

export interface CircularReferenceResult {
  has_circular_references: boolean;
  circular_chains: Array<{
    type: 'plot_block' | 'condition' | 'tag' | 'mixed';
    chain: Array<{
      id: string;
      type: 'plot_block' | 'condition' | 'tag';
      name: string;
    }>;
    relationship_type:
      | 'requires'
      | 'enables'
      | 'enhances'
      | 'parent_child'
      | 'mixed';
    severity: 'error' | 'warning';
    message: string;
  }>;
  affected_elements: Array<{
    id: string;
    type: 'plot_block' | 'condition' | 'tag';
    circular_chains_involved: number;
    can_break_cycle: boolean;
    suggested_resolution?: {
      action: 'remove_dependency' | 'remove_element' | 'change_hierarchy';
      target_relationship: string;
      reason: string;
    };
  }>;
  suggested_resolutions?: Array<{
    action: 'remove_dependency' | 'restructure_hierarchy' | 'remove_element';
    target_ids: string[];
    impact: 'minimal' | 'moderate' | 'major';
    reason: string;
    alternative_structure?: any;
  }>;
}

// Story discovery and search types
export interface StorySearchContext {
  fandom_id: string;
  selected_tags: string[];
  selected_plot_blocks: string[];
  selected_conditions: string[];
  filters: StorySearchFilters;
}

export interface StorySearchFilters {
  rating?: string[];
  status?: ('complete' | 'incomplete' | 'abandoned' | 'hiatus')[];
  min_word_count?: number;
  max_word_count?: number;
  min_relevance_score?: number;
  exclude_warnings?: string[];
  sort_by?: 'relevance' | 'word_count' | 'updated_at' | 'created_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface StorySearchResult {
  stories: Story[];
  total_count: number;
  search_metadata: {
    query_processed_at: Date;
    processing_time_ms: number;
    matching_tag_count: number;
    matching_plot_block_count: number;
    relevance_calculation_method: string;
  };
  suggestions: {
    similar_tags?: string[];
    related_plot_blocks?: string[];
    alternative_filters?: Partial<StorySearchFilters>;
  };
}

// Story submission and admin types
export interface StorySubmission {
  id: string;
  title: string;
  author: string;
  fandom_id: string;
  url: string;
  description?: string;
  suggested_tags: string[];
  suggested_plot_blocks: string[];
  submitter_email?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  admin_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'User' | 'FandomAdmin' | 'ProjectAdmin';
  fandom?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'FandomAdmin' | 'ProjectAdmin';
  fandom_access?: string[];
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
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'fandom' | 'content';
}

// ============================================================================
// FANDOM MANAGEMENT PERMISSIONS
// ============================================================================

export type FandomManagementPermission =
  // Core fandom permissions
  | 'create:fandom'
  | 'update:fandom'
  | 'delete:fandom'

  // Fandom management permissions (modular system)
  | 'manage:fandom_templates'
  | 'create:fandom_from_template'
  | 'manage:fandom_content'
  | 'approve:fandom_content'
  | 'bulk:import_content'
  | 'bulk:export_content'
  | 'manage:content_versions'
  | 'view:fandom_analytics'
  | 'configure:fandom_taxonomy'
  | 'manage:approval_workflows'

  // Content-specific permissions within fandoms
  | 'create:fandom_tag'
  | 'update:fandom_tag'
  | 'delete:fandom_tag'
  | 'create:fandom_plot_block'
  | 'update:fandom_plot_block'
  | 'delete:fandom_plot_block'
  | 'create:fandom_character'
  | 'update:fandom_character'
  | 'delete:fandom_character'
  | 'create:fandom_validation_rule'
  | 'update:fandom_validation_rule'
  | 'delete:fandom_validation_rule';

export interface FandomPermissionContext {
  user_id: string;
  fandom_id?: number;
  required_permission: FandomManagementPermission;
  additional_checks?: {
    content_type?: 'tag' | 'plot_block' | 'character' | 'validation_rule';
    ownership_required?: boolean;
    approval_level_required?: number;
  };
}

export interface FandomPermissionResult {
  granted: boolean;
  reason?: string;
  suggested_action?: string;
  escalation_path?: string;
  expires_at?: Date;
}

// UI and interaction types
export interface PathwayElement {
  id: string;
  type: 'tag' | 'plot_block' | 'condition';
  name: string;
  description?: string;
  category?: string;
  order: number;
  is_selected: boolean;
  is_conflicted?: boolean;
  conflict_reason?: string;
  dependency_status?: 'satisfied' | 'missing' | 'optional';
}

export interface PathwayState {
  fandom_id: string;
  elements: PathwayElement[];
  validation_status: 'valid' | 'invalid' | 'warning' | 'pending';
  validation_result?: ValidationResult;
  estimated_story_count?: number;
  last_validated_at?: Date;
}

export interface DragDropState {
  dragging_element?: PathwayElement;
  drop_zone_active?: boolean;
  drop_zone_type?: 'pathway' | 'removal';
  drag_preview_element?: PathwayElement;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    request_id: string;
    processing_time_ms: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any,
    public severity: 'error' | 'warning' | 'info' = 'error'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public conflicts: ConflictResult['conflicts']) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class CircularReferenceError extends Error {
  constructor(
    message: string,
    public circular_chains: CircularReferenceResult['circular_chains']
  ) {
    super(message);
    this.name = 'CircularReferenceError';
  }
}

// Utility types
export type EntityId = string;
export type FandomSlug = string;
export type TagName = string;
export type PlotBlockName = string;

export type SortOrder = 'asc' | 'desc';
export type ValidationSeverity = 'error' | 'warning' | 'info';
export type StoryStatus = 'complete' | 'incomplete' | 'abandoned' | 'hiatus';
export type AdminRole = 'admin' | 'moderator' | 'contributor';
export type SubmissionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_review';

// Configuration types
export interface AppConfig {
  database: {
    url: string;
    max_connections: number;
    query_timeout_ms: number;
  };
  validation: {
    enable_circular_reference_detection: boolean;
    max_dependency_chain_length: number;
    performance_timeout_ms: number;
  };
  search: {
    default_limit: number;
    max_limit: number;
    relevance_threshold: number;
    cache_ttl_seconds: number;
  };
  admin: {
    auto_approve_threshold: number;
    require_email_verification: boolean;
    max_pending_submissions: number;
  };
}

// Type guards
export function isFandom(obj: any): obj is Fandom {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.slug === 'string'
  );
}

export function isTag(obj: any): obj is Tag {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.fandom_id === 'string'
  );
}

export function isPlotBlock(obj: any): obj is PlotBlock {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.category === 'string'
  );
}

export function isStory(obj: any): obj is Story {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.author === 'string'
  );
}

export function isValidationResult(obj: any): obj is ValidationResult {
  return obj && typeof obj.is_valid === 'boolean' && Array.isArray(obj.errors);
}

// Common type aliases for convenience
export type ValidationCtx = ValidationContext;
export type ConflictDetectionCtx = ConflictDetectionContext;
export type DependencyValidationCtx = DependencyValidationContext;
export type CircularReferenceCtx = CircularReferenceContext;

// ============================================================================
// CONTENT VERSIONING & APPROVAL TYPES
// ============================================================================

export interface ContentVersion {
  id: string;
  content_type: 'tag' | 'plot_block' | 'validation_rule' | 'fandom_config';
  content_id: string;
  fandom_id: string;
  version_number: number;
  parent_version_id?: string;
  content_snapshot: Record<string, any>;
  changes_summary: string[];
  change_reason?: string;
  created_by: string;
  created_at: Date;
  is_active: boolean;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  content_types: string[];
  fandom_id?: string;
  approval_levels: ApprovalLevel[];
  auto_approval_rules?: AutoApprovalRule[];
  timeout_hours?: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalLevel {
  level: number;
  required_role: 'ProjectAdmin' | 'FandomAdmin';
  required_permissions: string[];
  fandom_scope?: string;
  parallel_approvers?: number;
}

export interface AutoApprovalRule {
  condition_type: 'creator_role' | 'content_size' | 'content_type';
  condition_value: any;
  description: string;
}

export interface ContentApproval {
  id: string;
  content_version_id: string;
  workflow_id: string;
  fandom_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  current_level: number;
  submitted_by: string;
  submitted_at: Date;
  approved_by: string[];
  approved_at?: Date;
  rejection_reason?: string;
  rejected_by?: string;
  rejected_at?: Date;
}

export interface BulkOperation {
  id: string;
  operation_type: 'import' | 'export' | 'bulk_update' | 'bulk_delete';
  fandom_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_items: number;
  processed_items: number;
  failed_items: number;
  error_log?: string[];
  initiated_by: string;
  started_at: Date;
  completed_at?: Date;
}
