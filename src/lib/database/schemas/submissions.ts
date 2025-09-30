/**
 * Community Submission System Database Schemas
 *
 * This module defines all database schemas for the community-driven story submission system.
 * Integrates with the existing Pensieve Index database structure while adding new entities
 * for story submissions, moderation workflows, and community management.
 */

import { relations } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  real,
  blob,
  index,
} from 'drizzle-orm/sqlite-core';

// Simple UUID generation for database IDs
const generateId = () => crypto.randomUUID();

// Story Submission Table
export const storySubmissions = sqliteTable(
  'story_submissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),

    // Submitter Information
    submitterUserId: text('submitter_user_id').notNull(),

    // Story Information
    storyUrl: text('story_url').notNull(),
    storyTitle: text('story_title').notNull(),
    authorName: text('author_name').notNull(),
    fandomId: text('fandom_id').notNull(),
    summary: text('summary'),

    // Story Metadata
    wordCount: integer('word_count'),
    chapterCount: integer('chapter_count'),
    completionStatus: text('completion_status', {
      enum: ['complete', 'in-progress', 'abandoned', 'unknown'],
    }).default('unknown'),
    publishDate: integer('publish_date', { mode: 'timestamp' }),
    lastUpdateDate: integer('last_update_date', { mode: 'timestamp' }),

    // Tagging Information
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    suggestedTags: text('suggested_tags', { mode: 'json' })
      .$type<string[]>()
      .default([]),
    submissionNotes: text('submission_notes'),

    // GitHub Integration
    githubIssueNumber: integer('github_issue_number'),

    // Processing Information
    status: text('status', {
      enum: ['pending', 'under-review', 'approved', 'rejected', 'duplicate'],
    }).default('pending'),
    qualityScore: real('quality_score'),
    duplicateCheckResult: text('duplicate_check_result', { mode: 'json' }),

    // Audit Information
    submittedAt: integer('submitted_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    reviewedBy: text('reviewed_by'),
    rejectionReason: text('rejection_reason'),
  },
  table => ({
    submitterUserIdx: index('story_submissions_submitter_user_idx').on(
      table.submitterUserId
    ),
    fandomIdx: index('story_submissions_fandom_idx').on(table.fandomId),
    statusIdx: index('story_submissions_status_idx').on(table.status),
    submittedAtIdx: index('story_submissions_submitted_at_idx').on(
      table.submittedAt
    ),
    urlIdx: index('story_submissions_url_idx').on(table.storyUrl),
    githubIssueIdx: index('story_submissions_github_issue_idx').on(
      table.githubIssueNumber
    ),
    qualityScoreIdx: index('story_submissions_quality_score_idx').on(
      table.qualityScore
    ),
  })
);

// Submission Queue Table for Moderation Workflow
export const submissionQueue = sqliteTable(
  'submission_queue',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),

    submissionId: text('submission_id')
      .notNull()
      .references(() => storySubmissions.id, { onDelete: 'cascade' }),

    assignedModeratorId: text('assigned_moderator_id'),

    priority: text('priority', {
      enum: ['low', 'normal', 'high', 'urgent'],
    }).default('normal'),

    complexity: text('complexity', {
      enum: ['simple', 'medium', 'complex'],
    }).default('medium'),

    estimatedReviewTime: integer('estimated_review_time'), // in minutes

    queuedAt: integer('queued_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    assignedAt: integer('assigned_at', { mode: 'timestamp' }),
    deadline: integer('deadline', { mode: 'timestamp' }),
  },
  table => ({
    submissionIdx: index('submission_queue_submission_idx').on(
      table.submissionId
    ),
    moderatorIdx: index('submission_queue_moderator_idx').on(
      table.assignedModeratorId
    ),
    priorityIdx: index('submission_queue_priority_idx').on(
      table.priority,
      table.queuedAt
    ),
    deadlineIdx: index('submission_queue_deadline_idx').on(table.deadline),
  })
);

// Browser Extension State Table
export const browserExtensionState = sqliteTable(
  'browser_extension_state',
  {
    userId: text('user_id').primaryKey(),

    preferences: text('preferences', { mode: 'json' })
      .$type<Record<string, any>>()
      .default({}),
    offlineQueue: text('offline_queue', { mode: 'json' })
      .$type<any[]>()
      .default([]),

    lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
    extensionVersion: text('extension_version'),
    enabledWebsites: text('enabled_websites', { mode: 'json' })
      .$type<string[]>()
      .default([]),
  },
  table => ({
    lastSyncIdx: index('browser_extension_state_last_sync_idx').on(
      table.lastSyncAt
    ),
  })
);

// Website Extractor Configuration Table
export const websiteExtractors = sqliteTable(
  'website_extractors',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),

    websiteKey: text('website_key').notNull().unique(),
    displayName: text('display_name').notNull(),
    baseUrl: text('base_url').notNull(),

    extractorVersion: text('extractor_version').notNull(),
    supportedFeatures: text('supported_features', { mode: 'json' })
      .$type<string[]>()
      .default([]),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),

    configSchema: text('config_schema', { mode: 'json' }),
    testUrls: text('test_urls', { mode: 'json' }).$type<string[]>().default([]),
  },
  table => ({
    websiteKeyIdx: index('website_extractors_website_key_idx').on(
      table.websiteKey
    ),
    activeIdx: index('website_extractors_active_idx').on(table.isActive),
  })
);

// Moderation Action Audit Trail
export const moderationActions = sqliteTable(
  'moderation_actions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),

    submissionId: text('submission_id')
      .notNull()
      .references(() => storySubmissions.id, { onDelete: 'cascade' }),

    moderatorId: text('moderator_id').notNull(),

    actionType: text('action_type', {
      enum: [
        'assign',
        'approve',
        'reject',
        'request-changes',
        'duplicate-flag',
      ],
    }).notNull(),

    actionDetails: text('action_details', { mode: 'json' }),
    comments: text('comments'),

    previousState: text('previous_state'),
    newState: text('new_state'),

    performedAt: integer('performed_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  table => ({
    submissionIdx: index('moderation_actions_submission_idx').on(
      table.submissionId
    ),
    moderatorIdx: index('moderation_actions_moderator_idx').on(
      table.moderatorId
    ),
    performedAtIdx: index('moderation_actions_performed_at_idx').on(
      table.performedAt
    ),
    actionTypeIdx: index('moderation_actions_action_type_idx').on(
      table.actionType
    ),
  })
);

// Duplicate Detection Results Table
export const duplicateDetectionResults = sqliteTable(
  'duplicate_detection_results',
  {
    submissionId: text('submission_id')
      .primaryKey()
      .references(() => storySubmissions.id, { onDelete: 'cascade' }),

    potentialDuplicates: text('potential_duplicates', { mode: 'json' })
      .$type<any[]>()
      .default([]),

    urlSimilarityScore: real('url_similarity_score'),
    titleSimilarityScore: real('title_similarity_score'),
    overallSimilarityScore: real('overall_similarity_score'),

    checkPerformedAt: integer('check_performed_at', {
      mode: 'timestamp',
    }).$defaultFn(() => new Date()),
    algorithmVersion: text('algorithm_version'),
  },
  table => ({
    similarityIdx: index('duplicate_detection_results_similarity_idx').on(
      table.overallSimilarityScore
    ),
    performedAtIdx: index('duplicate_detection_results_performed_at_idx').on(
      table.checkPerformedAt
    ),
  })
);

// Define relationships between tables
export const storySubmissionRelations = relations(
  storySubmissions,
  ({ one, many }) => ({
    queueEntry: one(submissionQueue, {
      fields: [storySubmissions.id],
      references: [submissionQueue.submissionId],
    }),
    moderationActions: many(moderationActions),
    duplicateResult: one(duplicateDetectionResults, {
      fields: [storySubmissions.id],
      references: [duplicateDetectionResults.submissionId],
    }),
  })
);

export const submissionQueueRelations = relations(
  submissionQueue,
  ({ one }) => ({
    submission: one(storySubmissions, {
      fields: [submissionQueue.submissionId],
      references: [storySubmissions.id],
    }),
  })
);

export const moderationActionRelations = relations(
  moderationActions,
  ({ one }) => ({
    submission: one(storySubmissions, {
      fields: [moderationActions.submissionId],
      references: [storySubmissions.id],
    }),
  })
);

export const duplicateDetectionResultRelations = relations(
  duplicateDetectionResults,
  ({ one }) => ({
    submission: one(storySubmissions, {
      fields: [duplicateDetectionResults.submissionId],
      references: [storySubmissions.id],
    }),
  })
);

// Type exports for use in application code
export type StorySubmission = typeof storySubmissions.$inferSelect;
export type NewStorySubmission = typeof storySubmissions.$inferInsert;

export type SubmissionQueue = typeof submissionQueue.$inferSelect;
export type NewSubmissionQueue = typeof submissionQueue.$inferInsert;

export type BrowserExtensionState = typeof browserExtensionState.$inferSelect;
export type NewBrowserExtensionState =
  typeof browserExtensionState.$inferInsert;

export type WebsiteExtractor = typeof websiteExtractors.$inferSelect;
export type NewWebsiteExtractor = typeof websiteExtractors.$inferInsert;

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;

export type DuplicateDetectionResult =
  typeof duplicateDetectionResults.$inferSelect;
export type NewDuplicateDetectionResult =
  typeof duplicateDetectionResults.$inferInsert;
