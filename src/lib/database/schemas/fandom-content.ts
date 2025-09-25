/**
 * Fandom Content Management Schema Implementation
 *
 * Defines database schemas for managing content within fandoms including
 * content items, versions, approval workflows, and import/export sessions.
 * Supports hierarchical content organization and approval processes.
 *
 * @package the-pensive-index
 */

import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
} from 'drizzle-orm/sqlite-core';
import { fandoms } from './fandom';

/**
 * Fandom Content Items Table Schema
 *
 * Generic container for all types of content within a fandom:
 * tags, plot blocks, characters, validation rules, etc.
 */
export const fandomContentItems = sqliteTable(
  'fandom_content_items',
  {
    // Primary key
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Associated fandom
    fandom_id: integer('fandom_id')
      .notNull()
      .references(() => fandoms.id, { onDelete: 'cascade' }),

    // Content identification
    content_type: text('content_type').notNull(), // 'tag', 'plot_block', 'character', 'validation_rule'
    content_name: text('content_name').notNull(),
    content_slug: text('content_slug').notNull(),

    // Content data (JSON structure varies by type)
    content_data: text('content_data', { mode: 'json' }).notNull(),

    // Hierarchical organization
    category: text('category'), // Top-level category
    subcategory: text('subcategory'), // Optional subcategory
    parent_id: integer('parent_id'), // For nested content relationships

    // Approval workflow
    status: text('status').notNull().default('draft'), // 'draft', 'pending', 'approved', 'rejected'
    submitted_by: text('submitted_by').notNull(), // User ID who submitted
    submitted_at: text('submitted_at').default(sql`(datetime('now'))`),
    reviewed_by: text('reviewed_by'), // User ID who reviewed
    reviewed_at: text('reviewed_at'),
    review_notes: text('review_notes'),

    // Version tracking
    version: text('version').notNull().default('1.0.0'),
    is_current_version: integer('is_current_version', { mode: 'boolean' })
      .notNull()
      .default(true),

    // Content metadata
    description: text('description'),
    tags: text('tags', { mode: 'json' }), // Array of associated tag names
    metadata: text('metadata', { mode: 'json' }), // Additional metadata

    // Status management
    is_active: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),

    // Timestamps
    created_at: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  table => ({
    // Unique constraints per fandom
    fandomContentUnique: unique('fandom_content_fandom_slug_unique').on(
      table.fandom_id,
      table.content_slug
    ),

    // Performance indexes
    fandomIndex: index('fandom_content_fandom_idx').on(table.fandom_id),
    typeIndex: index('fandom_content_type_idx').on(table.content_type),
    statusIndex: index('fandom_content_status_idx').on(table.status),
    categoryIndex: index('fandom_content_category_idx').on(table.category),
    nameIndex: index('fandom_content_name_idx').on(table.content_name),
    submittedByIndex: index('fandom_content_submitted_by_idx').on(
      table.submitted_by
    ),
    reviewedByIndex: index('fandom_content_reviewed_by_idx').on(
      table.reviewed_by
    ),
    versionIndex: index('fandom_content_version_idx').on(
      table.version,
      table.is_current_version
    ),
    activeIndex: index('fandom_content_active_idx').on(table.is_active),
  })
);

/**
 * Content Version History Table Schema
 *
 * Tracks all changes to content items for version control and audit trails.
 */
export const fandomContentVersions = sqliteTable(
  'fandom_content_versions',
  {
    // Primary key
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Reference to content item
    content_item_id: integer('content_item_id')
      .notNull()
      .references(() => fandomContentItems.id, { onDelete: 'cascade' }),

    // Version information
    version: text('version').notNull(),
    version_notes: text('version_notes'),

    // Snapshot of content at this version
    content_snapshot: text('content_snapshot', { mode: 'json' }).notNull(),

    // Change tracking
    changed_by: text('changed_by').notNull(),
    change_type: text('change_type').notNull(), // 'create', 'update', 'approve', 'reject'
    change_summary: text('change_summary'),

    // Timestamps
    created_at: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  table => ({
    // Performance indexes
    contentItemIndex: index('fandom_content_versions_item_idx').on(
      table.content_item_id
    ),
    versionIndex: index('fandom_content_versions_version_idx').on(
      table.version
    ),
    changedByIndex: index('fandom_content_versions_changed_by_idx').on(
      table.changed_by
    ),
    changeTypeIndex: index('fandom_content_versions_change_type_idx').on(
      table.change_type
    ),
    createdAtIndex: index('fandom_content_versions_created_at_idx').on(
      table.created_at
    ),
  })
);

/**
 * Content Approval Records Table Schema
 *
 * Tracks approval workflow status and decisions for content changes.
 */
export const fandomContentApprovals = sqliteTable(
  'fandom_content_approvals',
  {
    // Primary key
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Reference to content item
    content_item_id: integer('content_item_id')
      .notNull()
      .references(() => fandomContentItems.id, { onDelete: 'cascade' }),

    // Approval workflow
    approval_status: text('approval_status').notNull(), // 'pending', 'approved', 'rejected', 'changes_requested'
    reviewer_id: text('reviewer_id'), // User ID of reviewer
    reviewer_notes: text('reviewer_notes'),
    approval_level: integer('approval_level').notNull().default(1), // Multi-level approval support

    // Approval data
    approved_changes: text('approved_changes', { mode: 'json' }), // Specific changes approved
    rejection_reasons: text('rejection_reasons', { mode: 'json' }), // Array of rejection reasons
    requested_changes: text('requested_changes', { mode: 'json' }), // Specific changes requested

    // Workflow metadata
    priority: text('priority').default('normal'), // 'low', 'normal', 'high', 'urgent'
    due_date: text('due_date'), // Optional review deadline
    escalated_to: text('escalated_to'), // User ID if escalated

    // Timestamps
    submitted_at: text('submitted_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    reviewed_at: text('reviewed_at'),
    completed_at: text('completed_at'),
  },
  table => ({
    // Performance indexes
    contentItemIndex: index('fandom_content_approvals_item_idx').on(
      table.content_item_id
    ),
    statusIndex: index('fandom_content_approvals_status_idx').on(
      table.approval_status
    ),
    reviewerIndex: index('fandom_content_approvals_reviewer_idx').on(
      table.reviewer_id
    ),
    priorityIndex: index('fandom_content_approvals_priority_idx').on(
      table.priority
    ),
    submittedAtIndex: index('fandom_content_approvals_submitted_at_idx').on(
      table.submitted_at
    ),
    dueDateIndex: index('fandom_content_approvals_due_date_idx').on(
      table.due_date
    ),
  })
);

/**
 * Import/Export Sessions Table Schema
 *
 * Manages bulk content transfer operations with validation results and error logs.
 */
export const fandomImportExportSessions = sqliteTable(
  'fandom_import_export_sessions',
  {
    // Primary key
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Associated fandom
    fandom_id: integer('fandom_id')
      .notNull()
      .references(() => fandoms.id, { onDelete: 'cascade' }),

    // Session type and metadata
    session_type: text('session_type').notNull(), // 'import' | 'export'
    operation_mode: text('operation_mode').notNull(), // 'create', 'update', 'merge', 'replace'
    file_format: text('file_format').notNull(), // 'json', 'csv', 'xml'

    // File information
    original_filename: text('original_filename'),
    file_size: integer('file_size'), // In bytes
    file_hash: text('file_hash'), // For integrity verification

    // Processing status
    status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
    progress: integer('progress').notNull().default(0), // 0-100 percentage

    // Processing results
    total_items: integer('total_items').default(0),
    processed_items: integer('processed_items').default(0),
    successful_items: integer('successful_items').default(0),
    failed_items: integer('failed_items').default(0),
    skipped_items: integer('skipped_items').default(0),

    // Validation and error tracking
    validation_errors: text('validation_errors', { mode: 'json' }), // Array of validation errors
    processing_logs: text('processing_logs', { mode: 'json' }), // Detailed processing log
    error_details: text('error_details', { mode: 'json' }), // Error summaries

    // Session metadata
    initiated_by: text('initiated_by').notNull(), // User ID who started session
    configuration: text('configuration', { mode: 'json' }), // Import/export settings

    // Timestamps
    started_at: text('started_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    completed_at: text('completed_at'),
  },
  table => ({
    // Performance indexes
    fandomIndex: index('fandom_import_export_fandom_idx').on(table.fandom_id),
    statusIndex: index('fandom_import_export_status_idx').on(table.status),
    typeIndex: index('fandom_import_export_type_idx').on(table.session_type),
    initiatedByIndex: index('fandom_import_export_initiated_by_idx').on(
      table.initiated_by
    ),
    startedAtIndex: index('fandom_import_export_started_at_idx').on(
      table.started_at
    ),
  })
);

// Type exports
export type FandomContentItem = typeof fandomContentItems.$inferSelect;
export type NewFandomContentItem = typeof fandomContentItems.$inferInsert;

export type FandomContentVersion = typeof fandomContentVersions.$inferSelect;
export type NewFandomContentVersion = typeof fandomContentVersions.$inferInsert;

export type FandomContentApproval = typeof fandomContentApprovals.$inferSelect;
export type NewFandomContentApproval =
  typeof fandomContentApprovals.$inferInsert;

export type FandomImportExportSession =
  typeof fandomImportExportSessions.$inferSelect;
export type NewFandomImportExportSession =
  typeof fandomImportExportSessions.$inferInsert;
