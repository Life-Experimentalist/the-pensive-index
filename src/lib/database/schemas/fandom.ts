/**
 * Fandom Schema Implementation
 *
 * Defines the database schema for the fandoms table using Drizzle ORM.
 * This is the foundational entity that all other content is scoped to.
 *
 * Features:
 * - Unique name and slug constraints
 * - Soft deletion support via is_active flag
 * - Automatic timestamps for created_at and updated_at
 * - Optional description and metadata support
 *
 * @see specs/001-create-the-core/data-model.md for entity relationships
 */

import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
} from 'drizzle-orm/sqlite-core';

/**
 * Fandoms Table Schema
 *
 * The top-level container for all fanfiction content. Every tag, plot block,
 * and validation rule is scoped to a specific fandom.
 */
export const fandoms = sqliteTable(
  'fandoms',
  {
    // Primary key - auto-incrementing integer
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Human-readable name (required, unique)
    name: text('name').notNull(),

    // URL-safe identifier (required, unique)
    slug: text('slug').notNull(),

    // Optional description text
    description: text('description'),

    // JSON metadata field for additional data
    metadata: text('metadata', { mode: 'json' }),

    // Soft deletion flag (defaults to true/active)
    is_active: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),

    // Automatic timestamp fields
    created_at: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    // Unique constraints
    nameUnique: unique('fandoms_name_unique').on(table.name),
    slugUnique: unique('fandoms_slug_unique').on(table.slug),

    // Performance indexes
    nameIndex: index('fandoms_name_idx').on(table.name),
    slugIndex: index('fandoms_slug_idx').on(table.slug),
    activeIndex: index('fandoms_active_idx').on(table.is_active),
  })
);

/**
 * TypeScript type for Fandom records
 */
export type Fandom = typeof fandoms.$inferSelect;

/**
 * TypeScript type for inserting new Fandom records
 */
export type NewFandom = typeof fandoms.$inferInsert;
