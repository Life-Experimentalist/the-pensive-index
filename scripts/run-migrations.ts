import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const db = new Database('./data/the-pensive-index.db');

// Helper function to run migration with error handling
function runMigration(name: string, sqlFile: string) {
  console.log(`📋 Running ${name}...`);
  try {
    const sql = readFileSync(join(__dirname, sqlFile), 'utf-8');
    db.exec(sql);
    console.log(`✅ ${name} completed`);
    return true;
  } catch (error: any) {
    if (
      error.message?.includes('duplicate column name') ||
      error.message?.includes('already exists')
    ) {
      console.log(`⚠️  ${name} already applied, skipping...`);
      return false;
    }
    throw error;
  }
}

// Run all migrations in order
runMigration(
  '0001_initial-schema.sql',
  '../migrations/0001_initial-schema.sql'
);
runMigration('0002_seed-data.sql', '../migrations/0002_seed-data.sql');
runMigration(
  '0003_add-plot-blocks-fields.sql',
  '../migrations/0003_add-plot-blocks-fields.sql'
);
runMigration(
  '0004_add-display-order.sql',
  '../migrations/0004_add-display-order.sql'
);
runMigration(
  '0005_add-fandom-metadata.sql',
  '../migrations/0005_add-fandom-metadata.sql'
);
runMigration(
  '0006_add-plot-block-relationships.sql',
  '../migrations/0006_add-plot-block-relationships.sql'
);

db.close();
console.log('🎉 All migrations completed successfully!');
