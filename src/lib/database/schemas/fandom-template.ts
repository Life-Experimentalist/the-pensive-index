/**
 * Fandom Template Schema Implementation
 *
 * Defines the database schema for fandom templates using Drizzle ORM.
 * Templates provide pre-configured structures for common genres with default
 * content sets, taxonomies, and validation rules.
 *
 * Features:
 * - Genre-based categorization (Urban Fantasy, Sci-Fi, Historical, etc.)
 * - JSON configuration for taxonomy structure and default content
 * - Version tracking for template evolution
 * - Active/inactive status management
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

/**
 * Fandom Templates Table Schema
 *
 * Stores pre-configured fandom structures for rapid creation of new fandoms
 * with appropriate default content and validation rules for specific genres.
 */
export const fandomTemplates = sqliteTable(
  'fandom_templates',
  {
    // Primary key
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Template name (e.g., "Urban Fantasy", "Harry Potter-style", "Sci-Fi Space Opera")
    name: text('name').notNull(),

    // URL-safe slug for API access
    slug: text('slug').notNull(),

    // Genre category
    genre: text('genre').notNull(), // 'urban-fantasy', 'sci-fi', 'historical', etc.

    // Template description
    description: text('description'),

    // JSON configuration containing:
    // - taxonomy_structure: hierarchical content organization rules
    // - default_tags: array of default tags to create
    // - default_plot_blocks: array of default plot blocks
    // - validation_rules: default validation configuration
    // - content_categories: predefined content categories
    configuration: text('configuration', { mode: 'json' }).notNull(),

    // Template version for evolution tracking
    version: text('version').notNull().default('1.0.0'),

    // Usage statistics
    usage_count: integer('usage_count').notNull().default(0),

    // Template status
    is_active: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),

    // Creator information (admin who created the template)
    created_by: text('created_by').notNull(),

    // Timestamps
    created_at: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  table => ({
    // Unique constraints
    nameUnique: unique('fandom_templates_name_unique').on(table.name),
    slugUnique: unique('fandom_templates_slug_unique').on(table.slug),

    // Performance indexes
    nameIndex: index('fandom_templates_name_idx').on(table.name),
    slugIndex: index('fandom_templates_slug_idx').on(table.slug),
    genreIndex: index('fandom_templates_genre_idx').on(table.genre),
    activeIndex: index('fandom_templates_active_idx').on(table.is_active),
    usageIndex: index('fandom_templates_usage_idx').on(table.usage_count),
  })
);

/**
 * TypeScript type for FandomTemplate records
 */
export type FandomTemplate = typeof fandomTemplates.$inferSelect;

/**
 * TypeScript type for inserting new FandomTemplate records
 */
export type NewFandomTemplate = typeof fandomTemplates.$inferInsert;

/**
 * TypeScript type for template configuration structure
 */
export interface TemplateConfiguration {
  taxonomy_structure: {
    categories: string[];
    subcategories: Record<string, string[]>;
    tag_relationships: Record<string, string[]>;
  };
  default_tags: Array<{
    name: string;
    description?: string;
    category: string;
    tag_class?: string;
  }>;
  default_plot_blocks: Array<{
    name: string;
    description?: string;
    category: string;
    conditions?: any[];
  }>;
  validation_rules: {
    required_categories: string[];
    tag_limits: Record<string, number>;
    content_requirements: Record<string, any>;
  };
  content_categories: Array<{
    name: string;
    description?: string;
    type: 'tag' | 'plot_block' | 'character' | 'validation_rule';
    parent?: string;
  }>;
}
