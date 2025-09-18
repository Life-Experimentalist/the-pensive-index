/**
 * TagClass Database Schema
 *
 * Defines the database schema for tag classes using Drizzle ORM.
 * Tag classes group related tags and define validation rules for tag selection.
 * They enable features like mutually exclusive tags, required tags, and maximum selections.
 */

import {
  sqliteTable,
  text,
  integer,
  foreignKey,
  index,
} from 'drizzle-orm/sqlite-core';
import { fandoms } from './fandom';

/**
 * TagClasses Table Schema
 *
 * Core entity for tag validation logic with fandom scoping.
 * Each tag class belongs to a fandom and contains validation rules for tag selection.
 */
export const tagClasses = sqliteTable(
  'tag_classes',
  {
    // Primary identifier
    id: text('id').notNull().primaryKey(),

    // Core attributes
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    // Fandom relationship (tag classes are scoped to fandoms)
    fandomId: integer('fandom_id').notNull(),

    // Validation rules (JSON string)
    validationRules: text('validation_rules'), // JSON: { mutuallyExclusive: boolean, required: boolean, maxSelections: number, etc. }

    // Metadata for extensibility
    metadata: text('metadata'), // JSON string for additional tag class data

    // Soft delete support
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  table => ({
    // Foreign key constraints
    fandomFk: foreignKey({
      columns: [table.fandomId],
      foreignColumns: [fandoms.id],
      name: 'tag_classes_fandom_id_fk',
    }),

    // Unique constraints (scoped to fandom)
    nameUnique: index('tag_classes_fandom_name_unique').on(
      table.fandomId,
      table.name
    ),
    slugUnique: index('tag_classes_fandom_slug_unique').on(
      table.fandomId,
      table.slug
    ),

    // Performance indexes
    fandomIdx: index('tag_classes_fandom_id_idx').on(table.fandomId),
    isActiveIdx: index('tag_classes_is_active_idx').on(table.isActive),
  })
);

/**
 * TagClass TypeScript Types
 */
export type TagClass = typeof tagClasses.$inferSelect;
export type NewTagClass = typeof tagClasses.$inferInsert;
