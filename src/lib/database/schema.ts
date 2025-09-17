import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Fandoms table
export const fandoms = sqliteTable('fandoms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  slug: text('slug').notNull().unique(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Tags table
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  description: text('description'),
  category: text('category'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  requires: text('requires', { mode: 'json' }).$type<string[]>(),
  enhances: text('enhances', { mode: 'json' }).$type<string[]>(),
  tag_class_id: text('tag_class_id'),
});

// Tag classes table
export const tagClasses = sqliteTable('tag_classes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  validation_rules: text('validation_rules', { mode: 'json' }).notNull().$type<{
    mutual_exclusion?: {
      within_class: boolean;
      conflicting_tags?: string[];
      conflicting_classes?: string[];
    };
    required_context?: {
      required_tags?: string[];
      required_classes?: string[];
      required_metadata?: string[];
    };
    instance_limits?: {
      max_instances?: number;
      min_instances?: number;
      exact_instances?: number;
    };
    category_restrictions?: {
      applicable_categories?: string[];
      excluded_categories?: string[];
      required_plot_blocks?: string[];
    };
    dependencies?: {
      requires?: string[];
      enhances?: string[];
      enables?: string[];
    };
  }>(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Plot blocks table
export const plotBlocks = sqliteTable('plot_blocks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  description: text('description').notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  conflicts_with: text('conflicts_with', { mode: 'json' }).$type<string[]>(),
  requires: text('requires', { mode: 'json' }).$type<string[]>(),
  soft_requires: text('soft_requires', { mode: 'json' }).$type<string[]>(),
  enhances: text('enhances', { mode: 'json' }).$type<string[]>(),
  enabled_by: text('enabled_by', { mode: 'json' }).$type<string[]>(),
  excludes_categories: text('excludes_categories', { mode: 'json' }).$type<
    string[]
  >(),
  max_instances: integer('max_instances'),
  parent_id: text('parent_id'),
  children: text('children', { mode: 'json' }).$type<string[]>(),
});

// Plot block conditions table
export const plotBlockConditions = sqliteTable('plot_block_conditions', {
  id: text('id').primaryKey(),
  plot_block_id: text('plot_block_id')
    .notNull()
    .references(() => plotBlocks.id, { onDelete: 'cascade' }),
  parent_id: text('parent_id'),
  name: text('name').notNull(),
  description: text('description').notNull(),
  order: integer('order').notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  conflicts_with: text('conflicts_with', { mode: 'json' }).$type<string[]>(),
  requires: text('requires', { mode: 'json' }).$type<string[]>(),
  enables: text('enables', { mode: 'json' }).$type<string[]>(),
  children: text('children', { mode: 'json' }).$type<string[]>(),
});

// Stories table
export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  description: text('description'),
  url: text('url'),
  word_count: integer('word_count'),
  chapter_count: integer('chapter_count'),
  status: text('status')
    .notNull()
    .$type<'complete' | 'incomplete' | 'abandoned' | 'hiatus'>(),
  rating: text('rating').notNull(),
  warnings: text('warnings', { mode: 'json' }).$type<string[]>(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  relevance_score: real('relevance_score'),
  tag_match_count: integer('tag_match_count'),
  plot_block_match_count: integer('plot_block_match_count'),
});

// Story tags relationship table
export const storyTags = sqliteTable('story_tags', {
  story_id: text('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  tag_id: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  relevance_weight: real('relevance_weight').notNull().default(1.0),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Story plot blocks relationship table
export const storyPlotBlocks = sqliteTable('story_plot_blocks', {
  story_id: text('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  plot_block_id: text('plot_block_id')
    .notNull()
    .references(() => plotBlocks.id, { onDelete: 'cascade' }),
  relevance_weight: real('relevance_weight').notNull().default(1.0),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Story submissions table
export const storySubmissions = sqliteTable('story_submissions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id),
  url: text('url').notNull(),
  description: text('description'),
  suggested_tags: text('suggested_tags', { mode: 'json' })
    .notNull()
    .$type<string[]>(),
  suggested_plot_blocks: text('suggested_plot_blocks', { mode: 'json' })
    .notNull()
    .$type<string[]>(),
  submitter_email: text('submitter_email'),
  status: text('status')
    .notNull()
    .default('pending')
    .$type<'pending' | 'approved' | 'rejected' | 'needs_review'>(),
  admin_notes: text('admin_notes'),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Admin users table
export const adminUsers = sqliteTable('admin_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().$type<'admin' | 'moderator' | 'contributor'>(),
  permissions: text('permissions', { mode: 'json' }).notNull().$type<
    Array<{
      id: string;
      name: string;
      description: string;
      scope: 'global' | 'fandom' | 'content';
    }>
  >(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Define relationships
export const fandomsRelations = relations(fandoms, ({ many }) => ({
  tags: many(tags),
  tagClasses: many(tagClasses),
  plotBlocks: many(plotBlocks),
  stories: many(stories),
  storySubmissions: many(storySubmissions),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  fandom: one(fandoms, {
    fields: [tags.fandom_id],
    references: [fandoms.id],
  }),
  tagClass: one(tagClasses, {
    fields: [tags.tag_class_id],
    references: [tagClasses.id],
  }),
  storyTags: many(storyTags),
}));

export const tagClassesRelations = relations(tagClasses, ({ one, many }) => ({
  fandom: one(fandoms, {
    fields: [tagClasses.fandom_id],
    references: [fandoms.id],
  }),
  tags: many(tags),
}));

export const plotBlocksRelations = relations(plotBlocks, ({ one, many }) => ({
  fandom: one(fandoms, {
    fields: [plotBlocks.fandom_id],
    references: [fandoms.id],
  }),
  conditions: many(plotBlockConditions),
  storyPlotBlocks: many(storyPlotBlocks),
  parent: one(plotBlocks, {
    fields: [plotBlocks.parent_id],
    references: [plotBlocks.id],
  }),
  children: many(plotBlocks),
}));

export const plotBlockConditionsRelations = relations(
  plotBlockConditions,
  ({ one, many }) => ({
    plotBlock: one(plotBlocks, {
      fields: [plotBlockConditions.plot_block_id],
      references: [plotBlocks.id],
    }),
    parent: one(plotBlockConditions, {
      fields: [plotBlockConditions.parent_id],
      references: [plotBlockConditions.id],
    }),
    children: many(plotBlockConditions),
  })
);

export const storiesRelations = relations(stories, ({ one, many }) => ({
  fandom: one(fandoms, {
    fields: [stories.fandom_id],
    references: [fandoms.id],
  }),
  storyTags: many(storyTags),
  storyPlotBlocks: many(storyPlotBlocks),
}));

export const storyTagsRelations = relations(storyTags, ({ one }) => ({
  story: one(stories, {
    fields: [storyTags.story_id],
    references: [stories.id],
  }),
  tag: one(tags, {
    fields: [storyTags.tag_id],
    references: [tags.id],
  }),
}));

export const storyPlotBlocksRelations = relations(
  storyPlotBlocks,
  ({ one }) => ({
    story: one(stories, {
      fields: [storyPlotBlocks.story_id],
      references: [stories.id],
    }),
    plotBlock: one(plotBlocks, {
      fields: [storyPlotBlocks.plot_block_id],
      references: [plotBlocks.id],
    }),
  })
);

export const storySubmissionsRelations = relations(
  storySubmissions,
  ({ one }) => ({
    fandom: one(fandoms, {
      fields: [storySubmissions.fandom_id],
      references: [fandoms.id],
    }),
  })
);

// Database schema type
export type DatabaseSchema = {
  fandoms: typeof fandoms;
  tags: typeof tags;
  tagClasses: typeof tagClasses;
  plotBlocks: typeof plotBlocks;
  plotBlockConditions: typeof plotBlockConditions;
  stories: typeof stories;
  storyTags: typeof storyTags;
  storyPlotBlocks: typeof storyPlotBlocks;
  storySubmissions: typeof storySubmissions;
  adminUsers: typeof adminUsers;
  fandomsRelations: typeof fandomsRelations;
  tagsRelations: typeof tagsRelations;
  tagClassesRelations: typeof tagClassesRelations;
  plotBlocksRelations: typeof plotBlocksRelations;
  plotBlockConditionsRelations: typeof plotBlockConditionsRelations;
  storiesRelations: typeof storiesRelations;
  storyTagsRelations: typeof storyTagsRelations;
  storyPlotBlocksRelations: typeof storyPlotBlocksRelations;
  storySubmissionsRelations: typeof storySubmissionsRelations;
};

// Inferred types from schema
export type Fandom = typeof fandoms.$inferSelect;
export type NewFandom = typeof fandoms.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type TagClass = typeof tagClasses.$inferSelect;
export type NewTagClass = typeof tagClasses.$inferInsert;

export type PlotBlock = typeof plotBlocks.$inferSelect;
export type NewPlotBlock = typeof plotBlocks.$inferInsert;

export type PlotBlockCondition = typeof plotBlockConditions.$inferSelect;
export type NewPlotBlockCondition = typeof plotBlockConditions.$inferInsert;

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

export type StoryTag = typeof storyTags.$inferSelect;
export type NewStoryTag = typeof storyTags.$inferInsert;

export type StoryPlotBlock = typeof storyPlotBlocks.$inferSelect;
export type NewStoryPlotBlock = typeof storyPlotBlocks.$inferInsert;

export type StorySubmission = typeof storySubmissions.$inferSelect;
export type NewStorySubmission = typeof storySubmissions.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

// Export schema object for easy access to all tables
export const schema = {
  fandoms,
  tags,
  tagClasses,
  plotBlocks,
  plotBlockConditions,
  stories,
  storyTags,
  storyPlotBlocks,
  storySubmissions,
  adminUsers,
} as const;
