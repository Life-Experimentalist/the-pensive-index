/**
 * PlotBlockCondition Database Schema
 *
 * Defines the database schema for plot block conditions using Drizzle ORM.
 * Conditions enable dynamic branching logic within plot block hierarchies,
 * allowing complex story pathway generation with prerequisite and conflict checking.
 */

import {
  sqliteTable,
  text,
  integer,
  foreignKey,
  index,
} from 'drizzle-orm/sqlite-core';
import { plotBlocks } from './plot-block';
import { tags } from './tag';

/**
 * Plot Block Conditions Table Schema
 *
 * Conditional logic engine for plot blocks. Conditions define when plot blocks
 * become available based on selected tags, other plot blocks, or custom rules.
 * Supports complex dependency trees and validation logic.
 */
export const plotBlockConditions = sqliteTable(
  'plot_block_conditions',
  {
    // Primary identifier
    id: text('id').notNull().primaryKey(),

    // Parent plot block relationship
    plotBlockId: text('plot_block_id').notNull(),

    // Condition type and logic
    conditionType: text('condition_type').notNull(), // 'block_dependency', 'tag_dependency', 'mutual_exclusion', 'custom'

    // Target references (optional based on condition type)
    targetBlockId: text('target_block_id'), // For block dependencies
    targetTagId: text('target_tag_id'), // For tag dependencies

    // Operator and value for condition logic
    operator: text('operator').notNull(), // 'requires', 'excludes', 'AND', 'OR', 'NOT', 'XOR'
    value: text('value'), // JSON string for condition data or values

    // Soft delete support
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  table => ({
    // Foreign key constraints
    plotBlockFk: foreignKey({
      columns: [table.plotBlockId],
      foreignColumns: [plotBlocks.id],
      name: 'plot_block_conditions_plot_block_id_fk',
    }),
    targetBlockFk: foreignKey({
      columns: [table.targetBlockId],
      foreignColumns: [plotBlocks.id],
      name: 'plot_block_conditions_target_block_id_fk',
    }),
    targetTagFk: foreignKey({
      columns: [table.targetTagId],
      foreignColumns: [tags.id],
      name: 'plot_block_conditions_target_tag_id_fk',
    }),

    // Performance indexes
    plotBlockIdx: index('plot_block_conditions_plot_block_id_idx').on(
      table.plotBlockId
    ),
    conditionTypeIdx: index('plot_block_conditions_condition_type_idx').on(
      table.conditionType
    ),
    targetBlockIdx: index('plot_block_conditions_target_block_id_idx').on(
      table.targetBlockId
    ),
    targetTagIdx: index('plot_block_conditions_target_tag_id_idx').on(
      table.targetTagId
    ),
    isActiveIdx: index('plot_block_conditions_is_active_idx').on(
      table.isActive
    ),
  })
);

/**
 * PlotBlockCondition TypeScript Types
 */
export type PlotBlockCondition = typeof plotBlockConditions.$inferSelect;
export type NewPlotBlockCondition = typeof plotBlockConditions.$inferInsert;
