/**
 * Fandom Management Type Definitions
 *
 * Type definitions for the modular fandom creation and management system.
 * Covers fandom creation, content management, templates, and related operations.
 *
 * @package the-pensive-index
 */

import type {
  FandomTemplate,
  NewFandomTemplate,
  TemplateConfiguration,
  FandomContentItem,
  NewFandomContentItem,
  FandomContentVersion,
  FandomContentApproval,
  FandomImportExportSession,
} from '@/lib/database/schemas';

// ============================================================================
// FANDOM CREATION & MANAGEMENT
// ============================================================================

export interface FandomCreationRequest {
  name: string;
  slug: string;
  description?: string;
  template_id?: number; // Optional template to base fandom on
  custom_taxonomy?: TaxonomyStructure; // Custom taxonomy if not using template
  initial_content?: FandomInitialContent; // Optional initial content
  metadata?: Record<string, any>;
}

export interface FandomCreationResponse {
  fandom: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    is_active: boolean;
    created_at: string;
  };
  applied_template?: {
    id: number;
    name: string;
    version: string;
  };
  created_content?: {
    tags_created: number;
    plot_blocks_created: number;
    characters_created: number;
    validation_rules_created: number;
  };
  taxonomy_structure: TaxonomyStructure;
}

export interface FandomUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// TAXONOMY & CONTENT STRUCTURE
// ============================================================================

export interface TaxonomyStructure {
  categories: TaxonomyCategory[];
  content_types: ContentTypeDefinition[];
  validation_rules: TaxonomyValidationRule[];
  hierarchy_rules: HierarchyRule[];
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  description?: string;
  parent_id?: string; // For nested categories
  content_types: string[]; // Which content types can belong to this category
  is_required: boolean; // Whether this category must have content
  max_items?: number; // Optional limit on content items
}

export interface ContentTypeDefinition {
  type: 'tag' | 'plot_block' | 'character' | 'validation_rule';
  name: string;
  description?: string;
  required_fields: string[];
  optional_fields: string[];
  validation_schema: Record<string, any>; // JSON schema for content validation
  allows_hierarchy: boolean; // Whether this type supports parent/child relationships
}

export interface TaxonomyValidationRule {
  id: string;
  name: string;
  rule_type:
    | 'required_content'
    | 'content_limit'
    | 'relationship_constraint'
    | 'naming_convention';
  parameters: Record<string, any>;
  error_message: string;
  is_active: boolean;
}

export interface HierarchyRule {
  parent_type: string;
  child_type: string;
  max_depth: number;
  required_relationship: boolean;
}

// ============================================================================
// CONTENT MANAGEMENT
// ============================================================================

export interface FandomContentCreationRequest {
  content_type: 'tag' | 'plot_block' | 'character' | 'validation_rule';
  content_name: string;
  content_data: Record<string, any>; // Varies by content type
  category?: string;
  subcategory?: string;
  parent_id?: number; // For hierarchical content
  description?: string;
  tags?: string[]; // Associated tags
  metadata?: Record<string, any>;
  submit_for_approval?: boolean; // Whether to immediately submit for approval
}

export interface FandomContentUpdateRequest {
  content_name?: string;
  content_data?: Record<string, any>;
  category?: string;
  subcategory?: string;
  parent_id?: number;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  version_notes?: string; // Notes about changes made
}

export interface ContentApprovalRequest {
  action: 'approve' | 'reject' | 'request_changes';
  reviewer_notes?: string;
  requested_changes?: string[]; // Specific changes requested
  approval_level?: number; // For multi-level approval
}

export interface ContentApprovalResponse {
  approval_id: number;
  content_item_id: number;
  status: 'approved' | 'rejected' | 'changes_requested';
  reviewer_id: string;
  reviewer_notes?: string;
  completed_at: string;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkImportRequest {
  file_format: 'json' | 'csv';
  operation_mode: 'create' | 'update' | 'merge' | 'replace';
  content_types: ('tag' | 'plot_block' | 'character' | 'validation_rule')[];
  validation_level: 'strict' | 'moderate' | 'lenient';
  auto_approve: boolean; // Whether to auto-approve imported content
  category_mappings?: Record<string, string>; // Map import categories to fandom categories
}

export interface BulkImportResponse {
  session_id: number;
  status: 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  results: {
    total_items: number;
    processed_items: number;
    successful_items: number;
    failed_items: number;
    skipped_items: number;
  };
  validation_errors: ImportValidationError[];
  processing_logs: string[];
}

export interface BulkExportRequest {
  content_types: ('tag' | 'plot_block' | 'character' | 'validation_rule')[];
  file_format: 'json' | 'csv';
  include_metadata: boolean;
  include_versions: boolean;
  filters?: {
    categories?: string[];
    status?: ('draft' | 'approved' | 'rejected')[];
    date_range?: {
      from: string;
      to: string;
    };
  };
}

export interface BulkExportResponse {
  session_id: number;
  download_url: string;
  file_name: string;
  file_size: number;
  expires_at: string;
}

export interface ImportValidationError {
  row_number?: number;
  content_name?: string;
  error_type: 'validation' | 'format' | 'constraint' | 'permission';
  error_message: string;
  suggested_fix?: string;
}

// ============================================================================
// CONTENT APPROVAL WORKFLOW
// ============================================================================

export interface ApprovalWorkflowConfig {
  fandom_id: number;
  content_type: 'tag' | 'plot_block' | 'character' | 'validation_rule';
  approval_levels: ApprovalLevel[];
  auto_approval_rules: AutoApprovalRule[];
  escalation_rules: EscalationRule[];
}

export interface ApprovalLevel {
  level: number;
  name: string;
  required_role: 'ProjectAdmin' | 'FandomAdmin';
  required_count: number; // Number of approvals needed at this level
  timeout_hours?: number; // Auto-escalate after timeout
}

export interface AutoApprovalRule {
  id: string;
  name: string;
  conditions: Record<string, any>; // Conditions for auto-approval
  applies_to: string[]; // Content types this rule applies to
  is_active: boolean;
}

export interface EscalationRule {
  trigger: 'timeout' | 'rejection_count' | 'manual';
  escalate_to_role: 'ProjectAdmin';
  notification_required: boolean;
}

// ============================================================================
// INITIAL CONTENT STRUCTURES
// ============================================================================

export interface FandomInitialContent {
  tags?: InitialTag[];
  plot_blocks?: InitialPlotBlock[];
  characters?: InitialCharacter[];
  validation_rules?: InitialValidationRule[];
}

export interface InitialTag {
  name: string;
  description?: string;
  category: string;
  tag_class?: string;
  metadata?: Record<string, any>;
}

export interface InitialPlotBlock {
  name: string;
  description?: string;
  category: string;
  conditions?: any[];
  metadata?: Record<string, any>;
}

export interface InitialCharacter {
  name: string;
  description?: string;
  category: string;
  character_type?: string;
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface InitialValidationRule {
  name: string;
  rule_type: string;
  conditions: any[];
  actions: any[];
  is_active: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface FandomListResponse {
  fandoms: Array<{
    id: number;
    name: string;
    slug: string;
    description?: string;
    content_stats: {
      total_tags: number;
      total_plot_blocks: number;
      total_characters: number;
      total_validation_rules: number;
      pending_approvals: number;
    };
    created_at: string;
    updated_at: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
}

export interface FandomDetailResponse {
  fandom: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    metadata?: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  taxonomy: TaxonomyStructure;
  content_summary: {
    by_type: Record<string, number>;
    by_category: Record<string, number>;
    by_status: Record<string, number>;
  };
  recent_activity: Array<{
    id: number;
    action: string;
    content_type: string;
    content_name: string;
    user_id: string;
    timestamp: string;
  }>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface FandomManagementError {
  error_code: string;
  error_message: string;
  error_details?: Record<string, any>;
  suggested_action?: string;
}

export interface ValidationError extends FandomManagementError {
  field_errors?: Array<{
    field: string;
    message: string;
    current_value?: any;
    expected_format?: string;
  }>;
}
