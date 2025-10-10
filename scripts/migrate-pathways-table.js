/**
 * Migration: Add missing columns to pathways table
 *
 * This migration adds the following columns:
 * - is_persisted: Session-only vs saved pathways
 * - vote_count: Crowd-polling votes
 * - poll_status: Moderation status (pending/approved/rejected)
 * - version: Optimistic locking version
 * - last_edited_by: User ID for concurrency tracking
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'the-pensive-index.db');
const db = new Database(dbPath);

console.log('Starting pathways table migration...');

try {
  // Check current schema
  const tableInfo = db.prepare('PRAGMA table_info(pathways)').all();
  console.log('\nCurrent columns:', tableInfo.map(col => col.name).join(', '));

  // Add missing columns
  const columnsToAdd = [
    {
      name: 'is_persisted',
      sql: 'ALTER TABLE pathways ADD COLUMN is_persisted INTEGER NOT NULL DEFAULT 0',
    },
    {
      name: 'vote_count',
      sql: 'ALTER TABLE pathways ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0',
    },
    {
      name: 'poll_status',
      sql: "ALTER TABLE pathways ADD COLUMN poll_status TEXT NOT NULL DEFAULT 'pending'",
    },
    {
      name: 'version',
      sql: 'ALTER TABLE pathways ADD COLUMN version INTEGER NOT NULL DEFAULT 1',
    },
    {
      name: 'last_edited_by',
      sql: 'ALTER TABLE pathways ADD COLUMN last_edited_by TEXT',
    },
  ];

  for (const column of columnsToAdd) {
    const exists = tableInfo.find(col => col.name === column.name);
    if (!exists) {
      console.log(`Adding column: ${column.name}`);
      db.exec(column.sql);
    } else {
      console.log(`Column ${column.name} already exists, skipping...`);
    }
  }

  // Verify the migration
  const newTableInfo = db.prepare('PRAGMA table_info(pathways)').all();
  console.log(
    '\nUpdated columns:',
    newTableInfo.map(col => col.name).join(', ')
  );

  console.log('\n✅ Migration completed successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
