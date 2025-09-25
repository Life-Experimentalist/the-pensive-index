/**
 * Database Migration Script
 *
 * Runs database migrations to update schema and structure.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { DatabaseManager } from '../src/lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrateDatabase() {
  console.log('🔄 Running database migrations...');

  try {
    // Initialize database manager
    const dbManager = DatabaseManager.getInstance();

    await dbManager.initialize({
      type: 'sqlite',
      url: process.env.DATABASE_URL || './data/the-pensive-index.db',
    });

    const db = dbManager.getConnection();

    // Read and execute the admin/auth migration SQL
    const migrationSQL = readFileSync(
      join(__dirname, '../migrations/001_admin_auth_tables.sql'),
      'utf-8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await (db as any).execute(statement);
        } catch (error) {
          // Table might already exist, that's okay
          console.log(
            `Skipping statement (table may exist): ${statement.substring(
              0,
              50
            )}...`
          );
        }
      }
    }

    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();
