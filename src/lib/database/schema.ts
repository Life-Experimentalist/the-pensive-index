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
  role: text('role').notNull().$type<'ProjectAdmin' | 'FandomAdmin'>(),
  fandom_access: text('fandom_access', { mode: 'json' }).$type<string[]>(), // For FandomAdmin role
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
  last_login_at: integer('last_login_at', { mode: 'timestamp' }),
  preferences: text('preferences', { mode: 'json' }).$type<Record<string, any>>(),
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
  validationRules: typeof validationRules;
  ruleConditions: typeof ruleConditions;
  ruleActions: typeof ruleActions;
  ruleTemplates: typeof ruleTemplates;
  ruleTests: typeof ruleTests;
  plotBlockHierarchies: typeof plotBlockHierarchies;
  testScenarios: typeof testScenarios;
  ruleSetExports: typeof ruleSetExports;
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

// Validation Rules table
export const validationRules = sqliteTable('validation_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  priority: integer('priority').notNull().default(1),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  applies_to: text('applies_to', { mode: 'json' }).$type<string[]>().notNull(),
  created_by: text('created_by').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  published_at: integer('published_at', { mode: 'timestamp' }),
  version: text('version').notNull().default('1.0.0'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
});

// Rule Conditions table
export const ruleConditions = sqliteTable('rule_conditions', {
  id: text('id').primaryKey(),
  rule_id: text('rule_id')
    .notNull()
    .references(() => validationRules.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  target: text('target').notNull(),
  operator: text('operator').notNull(),
  value: text('value', { mode: 'json' }).$type<any>().notNull(),
  weight: real('weight').notNull().default(1.0),
  order_index: integer('order_index').notNull(),
  group_id: text('group_id'),
  is_negated: integer('is_negated', { mode: 'boolean' }).notNull().default(false),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, any>>(),
});

// Rule Actions table
export const ruleActions = sqliteTable('rule_actions', {
  id: text('id').primaryKey(),
  rule_id: text('rule_id')
    .notNull()
    .references(() => validationRules.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  severity: text('severity').notNull(),
  message: text('message').notNull(),
  data: text('data', { mode: 'json' }).$type<Record<string, any>>(),
  order_index: integer('order_index').notNull(),
  condition_group: text('condition_group'),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Rule Templates table
export const ruleTemplates = sqliteTable('rule_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  fandom_id: text('fandom_id').references(() => fandoms.id, { onDelete: 'cascade' }),
  template_data: text('template_data', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  is_public: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  created_by: text('created_by').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  usage_count: integer('usage_count').notNull().default(0),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
});

// Rule Tests table
export const ruleTests = sqliteTable('rule_tests', {
  id: text('id').primaryKey(),
  rule_id: text('rule_id')
    .notNull()
    .references(() => validationRules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  test_data: text('test_data', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  expected_result: text('expected_result', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  last_run_at: integer('last_run_at', { mode: 'timestamp' }),
  last_run_result: text('last_run_result', { mode: 'json' }).$type<Record<string, any>>(),
  is_passing: integer('is_passing', { mode: 'boolean' }),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Plot Block Hierarchy table
export const plotBlockHierarchies = sqliteTable('plot_block_hierarchies', {
  id: text('id').primaryKey(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  root_blocks: text('root_blocks', { mode: 'json' }).$type<string[]>().notNull(),
  hierarchy_rules: text('hierarchy_rules', { mode: 'json' }).$type<Record<string, any>[]>().notNull(),
  conditional_branches: text('conditional_branches', { mode: 'json' }).$type<Record<string, any>[]>().notNull(),
  created_by: text('created_by').notNull(),
  version: integer('version').notNull().default(1),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Test Scenarios table
export const testScenarios = sqliteTable('test_scenarios', {
  id: text('id').primaryKey(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  plot_blocks: text('plot_blocks', { mode: 'json' }).$type<string[]>().notNull(),
  expected_valid: integer('expected_valid', { mode: 'boolean' }).notNull(),
  expected_errors: text('expected_errors', { mode: 'json' }).$type<string[]>(),
  created_by: text('created_by').notNull(),
  last_run_at: integer('last_run_at', { mode: 'timestamp' }),
  last_run_result: text('last_run_result', { mode: 'json' }).$type<Record<string, any>>(),
  is_passing: integer('is_passing', { mode: 'boolean' }),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Rule Set Exports table
export const ruleSetExports = sqliteTable('rule_set_exports', {
  id: text('id').primaryKey(),
  fandom_id: text('fandom_id')
    .notNull()
    .references(() => fandoms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  rule_ids: text('rule_ids', { mode: 'json' }).$type<string[]>().notNull(),
  template_ids: text('template_ids', { mode: 'json' }).$type<string[]>().notNull(),
  export_data: text('export_data', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  created_by: text('created_by').notNull(),
  export_format: text('export_format').notNull().default('json'),
  download_count: integer('download_count').notNull().default(0),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  expires_at: integer('expires_at', { mode: 'timestamp' }),
});

export type ValidationRule = typeof validationRules.$inferSelect;
export type NewValidationRule = typeof validationRules.$inferInsert;

export type RuleCondition = typeof ruleConditions.$inferSelect;
export type NewRuleCondition = typeof ruleConditions.$inferInsert;

export type RuleAction = typeof ruleActions.$inferSelect;
export type NewRuleAction = typeof ruleActions.$inferInsert;

export type RuleTemplate = typeof ruleTemplates.$inferSelect;
export type NewRuleTemplate = typeof ruleTemplates.$inferInsert;

export type RuleTest = typeof ruleTests.$inferSelect;
export type NewRuleTest = typeof ruleTests.$inferInsert;

export type PlotBlockHierarchy = typeof plotBlockHierarchies.$inferSelect;
export type NewPlotBlockHierarchy = typeof plotBlockHierarchies.$inferInsert;

export type TestScenario = typeof testScenarios.$inferSelect;
export type NewTestScenario = typeof testScenarios.$inferInsert;

export type RuleSetExport = typeof ruleSetExports.$inferSelect;
export type NewRuleSetExport = typeof ruleSetExports.$inferInsert;

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
  validationRules,
  ruleConditions,
  ruleActions,
  ruleTemplates,
  ruleTests,
  plotBlockHierarchies,
  testScenarios,
  ruleSetExports,
} as const;
