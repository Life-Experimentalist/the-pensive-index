/**
 * Migration: Add position columns to pathway junction tables
 *
 * Purpose: Fix "table pathway_tags has no column named position" error
 * Date: 2025-01-12
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'the-pensive-index.db');

async function migrate() {
  const db = new Database(dbPath);

  console.log('Starting migration: Add position columns...');

  try {
    // Add position column to pathway_tags
    console.log('Adding position column to pathway_tags...');
    db.exec(`
      ALTER TABLE pathway_tags
      ADD COLUMN position INTEGER NOT NULL DEFAULT 0
    `);

    // Add position column to pathway_plot_blocks
    console.log('Adding position column to pathway_plot_blocks...');
    db.exec(`
      ALTER TABLE pathway_plot_blocks
      ADD COLUMN position INTEGER NOT NULL DEFAULT 0
    `);

    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️ Columns already exist, skipping...');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    db.close();
  }
}

migrate().catch(console.error);
