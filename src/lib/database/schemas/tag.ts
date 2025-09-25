/**
 * Tag Database Schema
 *
 * Defines the database schema for tags using Drizzle ORM.
 * Tags are simple labels that can be applied to stories within fandoms.
 * They support hierarchical relationships and belong to tag classes for validation.
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
 * Tags Table Schema
 *
 * Core entity for tagging system with fandom scoping and hierarchical support.
 * Each tag belongs to a fandom and can have a parent tag for hierarchical organization.
 */
export const tags = sqliteTable(
  'tags',
  {
    // Primary identifier
    id: text('id').notNull().primaryKey(),

    // Core attributes
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    // Fandom relationship (tags are scoped to fandoms)
    fandomId: integer('fandom_id').notNull(),

    // Tag class relationship (for validation logic)
    tagClassId: text('tag_class_id'),

    // Hierarchical support (optional parent tag)
    parentId: text('parent_id'),

    // Metadata for extensibility
    metadata: text('metadata'), // JSON string for additional tag data

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
      name: 'tags_fandom_id_fk',
    }),
    parentFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'tags_parent_id_fk',
    }),

    // Unique constraints (scoped to fandom)
    nameUnique: index('tags_fandom_name_unique').on(table.fandomId, table.name),
    slugUnique: index('tags_fandom_slug_unique').on(table.fandomId, table.slug),

    // Performance indexes
    fandomIdx: index('tags_fandom_id_idx').on(table.fandomId),
    tagClassIdx: index('tags_tag_class_id_idx').on(table.tagClassId),
    parentIdx: index('tags_parent_id_idx').on(table.parentId),
    isActiveIdx: index('tags_is_active_idx').on(table.isActive),
  })
);

/**
 * Tag TypeScript Types
 */
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
