/**
 * Validation Rules Database Schema
 *
 * Defines database schema for the configurable validation framework.
 * Includes tables for rules, conditions, actions, templates, tests, and versions.
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { fandoms } from './fandom';

// Simple UUID generation for database IDs
const generateId = () => crypto.randomUUID();

// ============================================================================
// Validation Rules Table
// ============================================================================

export const validationRules = sqliteTable('validation_rules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  fandomId: text('fandom_id')
    .notNull()
    .references(() => fandoms.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  ruleType: text('rule_type', {
    enum: ['conditional_requirement', 'exclusivity', 'prerequisite', 'custom'],
  }).notNull(),
  severity: text('severity', {
    enum: ['error', 'warning'],
  }).notNull(),
  message: text('message').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  priority: integer('priority').notNull().default(0),
  version: integer('version').notNull().default(1),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Rule Conditions Table
// ============================================================================

export const ruleConditions = sqliteTable('rule_conditions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  ruleId: text('rule_id')
    .notNull()
    .references(() => validationRules.id, { onDelete: 'cascade' }),
  conditionType: text('condition_type', {
    enum: [
      'has_tag',
      'has_plot_block',
      'tag_count',
      'plot_block_depth',
      'custom_expression',
    ],
  }).notNull(),
  targetType: text('target_type', {
    enum: ['tag', 'plot_block', 'pathway'],
  }).notNull(),
  targetIds: text('target_ids').notNull(), // JSON array
  operator: text('operator', {
    enum: [
      'equals',
      'greater_than',
      'less_than',
      'contains',
      'not_contains',
      'in',
      'not_in',
    ],
  }).notNull(),
  value: text('value'), // JSON value
  logicOperator: text('logic_operator', {
    enum: ['AND', 'OR'],
  }).notNull(),
  orderIndex: integer('order_index').notNull(),
});

// ============================================================================
// Rule Actions Table
// ============================================================================

export const ruleActions = sqliteTable('rule_actions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  ruleId: text('rule_id')
    .notNull()
    .references(() => validationRules.id, { onDelete: 'cascade' }),
  actionType: text('action_type', {
    enum: [
      'require_tag',
      'forbid_tag',
      'suggest_tag',
      'require_plot_block',
      'show_message',
      'modify_priority',
    ],
  }).notNull(),
  targetType: text('target_type', {
    enum: ['tag', 'plot_block', 'message'],
  }).notNull(),
  targetIds: text('target_ids'), // JSON array (optional for message actions)
  parameters: text('parameters'), // JSON object
  orderIndex: integer('order_index').notNull(),
});

// ============================================================================
// Rule Templates Table
// ============================================================================

export const ruleTemplates = sqliteTable('rule_templates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  category: text('category', {
    enum: ['shipping_rules', 'plot_consistency', 'tag_relationships', 'custom'],
  }).notNull(),
  ruleType: text('rule_type', {
    enum: ['conditional_requirement', 'exclusivity', 'prerequisite', 'custom'],
  }).notNull(),
  conditionTemplate: text('condition_template').notNull(), // JSON array
  actionTemplate: text('action_template').notNull(), // JSON array
  parameters: text('parameters').notNull(), // JSON array
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Rule Tests Table
// ============================================================================

export const ruleTests = sqliteTable('rule_tests', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  ruleId: text('rule_id')
    .notNull()
    .references(() => validationRules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  inputPathway: text('input_pathway').notNull(), // JSON object
  expectedResult: text('expected_result').notNull(), // JSON object
  actualResult: text('actual_result'), // JSON object (optional)
  status: text('status', {
    enum: ['pass', 'fail', 'pending'],
  })
    .notNull()
    .default('pending'),
  createdBy: text('created_by').notNull(),
  lastRunAt: text('last_run_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Rule Versions Table
// ============================================================================

export const ruleVersions = sqliteTable('rule_versions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  ruleId: text('rule_id')
    .notNull()
    .references(() => validationRules.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  snapshot: text('snapshot').notNull(), // JSON object - complete rule state
  changeDescription: text('change_description').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Indexes for Performance
// ============================================================================

// Note: These indexes will be created during migration
// Listed here for documentation and reference

/*
-- Validation Rules Indexes
CREATE INDEX idx_validation_rules_fandom_active ON validation_rules(fandom_id, is_active);
CREATE INDEX idx_validation_rules_priority ON validation_rules(priority);
CREATE INDEX idx_validation_rules_type ON validation_rules(rule_type);

-- Rule Conditions Indexes
CREATE INDEX idx_rule_conditions_rule_id ON rule_conditions(rule_id, order_index);
CREATE INDEX idx_rule_conditions_type ON rule_conditions(condition_type);
CREATE INDEX idx_rule_conditions_target ON rule_conditions(target_type);

-- Rule Actions Indexes
CREATE INDEX idx_rule_actions_rule_id ON rule_actions(rule_id, order_index);
CREATE INDEX idx_rule_actions_type ON rule_actions(action_type);

-- Rule Templates Indexes
CREATE INDEX idx_rule_templates_category ON rule_templates(category);
CREATE INDEX idx_rule_templates_system ON rule_templates(is_system);

-- Rule Tests Indexes
CREATE INDEX idx_rule_tests_rule_id ON rule_tests(rule_id);
CREATE INDEX idx_rule_tests_status ON rule_tests(status);

-- Rule Versions Indexes
CREATE INDEX idx_rule_versions_rule_version ON rule_versions(rule_id, version_number);
CREATE INDEX idx_rule_versions_active ON rule_versions(rule_id, is_active);
*/

// ============================================================================
// Type Exports
// ============================================================================

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

export type RuleVersion = typeof ruleVersions.$inferSelect;
export type NewRuleVersion = typeof ruleVersions.$inferInsert;
