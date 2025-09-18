// Core entity types for The Pensieve Index
// These match the database schema and API contracts

// Admin validation rule types
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  fandomId: string;
  ruleType: 'conditional' | 'exclusivity' | 'prerequisite' | 'hierarchy' | 'custom';
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  templateId?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
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

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'contributor';
  permissions: AdminPermission[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'fandom' | 'content';
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
