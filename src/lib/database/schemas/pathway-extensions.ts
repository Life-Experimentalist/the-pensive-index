/**
 * Schema extensions for feature 004-integrate-the-pathway
 * Adds crowd-polling, extension submission, and pathway enhancement tables
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { pathways, fandoms, stories } from '../schema';

// Junction table: Pathway Tags
export const pathwayTags = sqliteTable('pathway_tags', {
  pathway_id: text('pathway_id')
    .notNull()
    .references(() => pathways.id, { onDelete: 'cascade' }),
  tag_id: text('tag_id').notNull(),
  position: integer('position').notNull(), // Display order (0-indexed)
  added_at: integer('added_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Junction table: Pathway Tropes
export const pathwayPlotBlocks = sqliteTable('pathway_plot_blocks', {
  pathway_id: text('pathway_id')
    .notNull()
    .references(() => pathways.id, { onDelete: 'cascade' }),
  plot_block_id: text('plot_block_id').notNull(),
  position: integer('position').notNull(), // Display order (0-indexed)
  added_at: integer('added_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Community Votes table (polymorphic for pathways and stories)
export const communityVotes = sqliteTable('community_votes', {
  id: text('id').primaryKey(),
  voter_id: text('voter_id').notNull(), // User ID (Clerk)
  target_type: text('target_type')
    .notNull()
    .$type<'pathway' | 'story' | 'submission'>(),
  target_id: text('target_id').notNull(), // Pathway, Story, or ExtensionSubmission ID
  vote_type: text('vote_type').notNull().$type<'upvote' | 'correction'>(),
  correction_details: text('correction_details', { mode: 'json' }).$type<{
    suggestedTags?: string[];
    removeTags?: string[];
    suggestedPlotBlocks?: string[];
    removePlotBlocks?: string[];
    reason?: string;
  }>(),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Extension Submissions table
export const extensionSubmissions = sqliteTable('extension_submissions', {
  id: text('id').primaryKey(),
  submitter_id: text('submitter_id').notNull(), // User ID (Clerk)
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  story_url: text('story_url').notNull(),
  story_title: text('story_title').notNull(),
  story_author: text('story_author').notNull(),
  story_summary: text('story_summary'),
  suggested_tags: text('suggested_tags', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default(sql`'[]'`),
  suggested_plot_blocks: text('suggested_plot_blocks', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default(sql`'[]'`),
  duplicate_check_status: text('duplicate_check_status')
    .notNull()
    .$type<'unique' | 'possible_duplicate' | 'confirmed_duplicate'>()
    .default('unique'),
  duplicate_of_id: text('duplicate_of_id').references(() => stories.id),
  github_issue_url: text('github_issue_url'),
  vote_count: integer('vote_count').notNull().default(0),
  poll_status: text('poll_status')
    .notNull()
    .$type<'pending' | 'approved' | 'rejected' | 'merged'>()
    .default('pending'),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Relationships
export const pathwayTagsRelations = relations(pathwayTags, ({ one }) => ({
  pathway: one(pathways, {
    fields: [pathwayTags.pathway_id],
    references: [pathways.id],
  }),
}));

export const pathwayPlotBlocksRelations = relations(
  pathwayPlotBlocks,
  ({ one }) => ({
    pathway: one(pathways, {
      fields: [pathwayPlotBlocks.pathway_id],
      references: [pathways.id],
    }),
  })
);

export const communityVotesRelations = relations(communityVotes, ({ one }) => ({
  pathway: one(pathways, {
    fields: [communityVotes.target_id],
    references: [pathways.id],
  }),
  story: one(stories, {
    fields: [communityVotes.target_id],
    references: [stories.id],
  }),
  submission: one(extensionSubmissions, {
    fields: [communityVotes.target_id],
    references: [extensionSubmissions.id],
  }),
}));

export const extensionSubmissionsRelations = relations(
  extensionSubmissions,
  ({ one, many }) => ({
    fandom: one(fandoms, {
      fields: [extensionSubmissions.fandom_id],
      references: [fandoms.id],
    }),
    duplicateOf: one(stories, {
      fields: [extensionSubmissions.duplicate_of_id],
      references: [stories.id],
    }),
    votes: many(communityVotes),
  })
);

// Type exports
export type PathwayTag = typeof pathwayTags.$inferSelect;
export type NewPathwayTag = typeof pathwayTags.$inferInsert;

export type PathwayPlotBlock = typeof pathwayPlotBlocks.$inferSelect;
export type NewPathwayPlotBlock = typeof pathwayPlotBlocks.$inferInsert;

export type CommunityVote = typeof communityVotes.$inferSelect;
export type NewCommunityVote = typeof communityVotes.$inferInsert;

export type ExtensionSubmission = typeof extensionSubmissions.$inferSelect;
export type NewExtensionSubmission = typeof extensionSubmissions.$inferInsert;
