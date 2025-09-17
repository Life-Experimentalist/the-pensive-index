/**
 * Database Schemas Index
 *
 * Central export point for all database schemas and Drizzle configuration.
 * This file manages the database connection and provides the schema structure
 * for both migration and runtime query operations.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

// Import all schema definitions
export { fandoms, type Fandom, type NewFandom } from './fandom';
export { tags, type Tag, type NewTag } from './tag';
export { tagClasses, type TagClass, type NewTagClass } from './tag-class';
export { plotBlocks, type PlotBlock, type NewPlotBlock } from './plot-block';
export {
  plotBlockConditions,
  type PlotBlockCondition,
  type NewPlotBlockCondition,
} from './plot-block-condition';

// Schema registry for Drizzle ORM
export const schema = {
  fandoms: () => import('./fandom').then(m => m.fandoms),
  tags: () => import('./tag').then(m => m.tags),
  tagClasses: () => import('./tag-class').then(m => m.tagClasses),
  plotBlocks: () => import('./plot-block').then(m => m.plotBlocks),
  plotBlockConditions: () =>
    import('./plot-block-condition').then(m => m.plotBlockConditions),
};

/**
 * Initialize database with all schemas
 *
 * This function creates a Drizzle database instance with all schemas
 * and handles initial table creation if they don't exist.
 *
 * @param database - Better-sqlite3 database instance
 * @returns Configured Drizzle database instance
 */
export function initializeDatabase(database: Database.Database) {
  const db = drizzle(database);

  // Create tables if they don't exist
  // Note: In production, this would use proper migrations
  createTablesIfNotExist(database);

  return db;
}

/**
 * Create database tables if they don't exist
 *
 * This is a simplified approach for development/testing.
 * Production would use proper Drizzle migrations.
 */
function createTablesIfNotExist(database: Database.Database) {
  // Create fandoms table - matches test expectations
  database.exec(`
    CREATE TABLE IF NOT EXISTS fandoms (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Create unique constraints
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS fandoms_name_unique ON fandoms(name);
  `);

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS fandoms_slug_unique ON fandoms(slug);
  `);

  // Create performance indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS fandoms_name_idx ON fandoms(name);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS fandoms_slug_idx ON fandoms(slug);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS fandoms_active_idx ON fandoms(is_active);
  `);

  // Create tags table - matches test expectations
  database.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      fandom_id TEXT NOT NULL,
      tag_class_id TEXT,
      parent_id TEXT,
      metadata TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (fandom_id) REFERENCES fandoms(id),
      FOREIGN KEY (tag_class_id) REFERENCES tag_classes(id),
      FOREIGN KEY (parent_id) REFERENCES tags(id)
    );
  `);

  // Create unique constraints for tags (scoped to fandom)
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS tags_fandom_name_unique ON tags(fandom_id, name);
  `);

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS tags_fandom_slug_unique ON tags(fandom_id, slug);
  `);

  // Create performance indexes for tags
  database.exec(`
    CREATE INDEX IF NOT EXISTS tags_fandom_id_idx ON tags(fandom_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS tags_tag_class_id_idx ON tags(tag_class_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS tags_parent_id_idx ON tags(parent_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS tags_is_active_idx ON tags(is_active);
  `);

  // Create tag_classes table - matches test expectations
  database.exec(`
    CREATE TABLE IF NOT EXISTS tag_classes (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      fandom_id TEXT NOT NULL,
      validation_rules TEXT,
      metadata TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (fandom_id) REFERENCES fandoms(id)
    );
  `);

  // Create unique constraints for tag_classes (scoped to fandom)
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS tag_classes_fandom_name_unique ON tag_classes(fandom_id, name);
  `);

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS tag_classes_fandom_slug_unique ON tag_classes(fandom_id, slug);
  `);

  // Create performance indexes for tag_classes
  database.exec(`
    CREATE INDEX IF NOT EXISTS tag_classes_fandom_id_idx ON tag_classes(fandom_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS tag_classes_is_active_idx ON tag_classes(is_active);
  `);

  // Create plot_blocks table - matches test expectations
  // Drop existing table first to ensure we have the correct structure
  database.exec(`DROP TABLE IF EXISTS plot_blocks`);

  database.exec(`
    CREATE TABLE plot_blocks (
      id TEXT NOT NULL PRIMARY KEY,
      fandom_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      display_order INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (fandom_id) REFERENCES fandoms(id),
      FOREIGN KEY (parent_id) REFERENCES plot_blocks(id)
    );
  `);

  // Create unique constraints for plot_blocks (scoped to fandom and parent)
  // Handle NULL parent_id specially - use COALESCE to treat NULL as empty string
  database.exec(`
    CREATE UNIQUE INDEX plot_blocks_fandom_parent_name_unique ON plot_blocks(fandom_id, COALESCE(parent_id, ''), name);
  `);

  database.exec(`
    CREATE UNIQUE INDEX plot_blocks_fandom_parent_slug_unique ON plot_blocks(fandom_id, COALESCE(parent_id, ''), slug);
  `);

  // Create performance indexes for plot_blocks
  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_blocks_fandom_id_idx ON plot_blocks(fandom_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_blocks_parent_id_idx ON plot_blocks(parent_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_blocks_slug_idx ON plot_blocks(slug);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_blocks_display_order_idx ON plot_blocks(display_order);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_blocks_is_active_idx ON plot_blocks(is_active);
  `);

  // Create plot_block_conditions table - matches test expectations
  // Drop existing table first to ensure we have the correct structure
  database.exec(`DROP TABLE IF EXISTS plot_block_conditions`);

  database.exec(`
    CREATE TABLE plot_block_conditions (
      id TEXT NOT NULL PRIMARY KEY,
      plot_block_id TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      target_block_id TEXT,
      target_tag_id TEXT,
      operator TEXT NOT NULL,
      value TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (plot_block_id) REFERENCES plot_blocks(id),
      FOREIGN KEY (target_block_id) REFERENCES plot_blocks(id),
      FOREIGN KEY (target_tag_id) REFERENCES tags(id)
    );
  `);

  // Create performance indexes for plot_block_conditions
  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_block_conditions_plot_block_id_idx ON plot_block_conditions(plot_block_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_block_conditions_condition_type_idx ON plot_block_conditions(condition_type);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_block_conditions_target_block_id_idx ON plot_block_conditions(target_block_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_block_conditions_target_tag_id_idx ON plot_block_conditions(target_tag_id);
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS plot_block_conditions_is_active_idx ON plot_block_conditions(is_active);
  `);
}
