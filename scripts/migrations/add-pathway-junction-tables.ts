/**
 * Migration: Add pathway_tags and pathway_plot_blocks junction tables
 * Date: 2025-01-11
 * Purpose: Fix missing pathway_tags table error
 */

import { createClient } from '@libsql/client';
import path from 'path';

const databaseUrl = `file:${path.join(process.cwd(), 'data', 'the-pensive-index.db')}`;

const db = createClient({
  url: databaseUrl,
});

async function up() {
  console.log('🔄 Creating pathway junction tables...');

  // Create pathway_tags junction table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pathway_tags (
      id TEXT PRIMARY KEY,
      pathway_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (pathway_id) REFERENCES pathways(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Create index for better query performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_pathway_tags_pathway
    ON pathway_tags(pathway_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_pathway_tags_tag
    ON pathway_tags(tag_id)
  `);

  // Create pathway_plot_blocks junction table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pathway_plot_blocks (
      id TEXT PRIMARY KEY,
      pathway_id TEXT NOT NULL,
      plot_block_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (pathway_id) REFERENCES pathways(id) ON DELETE CASCADE,
      FOREIGN KEY (plot_block_id) REFERENCES plot_blocks(id) ON DELETE CASCADE
    )
  `);

  // Create index for better query performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_pathway_plot_blocks_pathway
    ON pathway_plot_blocks(pathway_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_pathway_plot_blocks_plot_block
    ON pathway_plot_blocks(plot_block_id)
  `);

  console.log('✅ Successfully created pathway junction tables');
}

async function down() {
  console.log('🔄 Dropping pathway junction tables...');

  await db.execute('DROP INDEX IF EXISTS idx_pathway_plot_blocks_plot_block');
  await db.execute('DROP INDEX IF EXISTS idx_pathway_plot_blocks_pathway');
  await db.execute('DROP TABLE IF EXISTS pathway_plot_blocks');

  await db.execute('DROP INDEX IF EXISTS idx_pathway_tags_tag');
  await db.execute('DROP INDEX IF EXISTS idx_pathway_tags_pathway');
  await db.execute('DROP TABLE IF EXISTS pathway_tags');

  console.log('✅ Successfully dropped pathway junction tables');
}

// Run migration
async function run() {
  try {
    const command = process.argv[2];

    if (command === 'down') {
      await down();
    } else {
      await up();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

run();
