/**
 * Quick script to create a test admin user for authentication testing
 */

import { DatabaseManager } from '../src/lib/database';
import { schema } from '../src/lib/database/schema';
import { sql } from 'drizzle-orm';

async function createTestAdmin() {
  console.log('👨‍💼 Creating test admin user...');

  try {
    const dbManager = DatabaseManager.getInstance();

    await dbManager.initialize({
      type: 'sqlite',
      url: process.env.DATABASE_URL || './data/the-pensive-index.db',
    });

    const db = dbManager.getConnection();

    // First, ensure the admin_users table exists
    try {
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS admin_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          fandom_access TEXT,
          permissions TEXT NOT NULL,
          is_active INTEGER DEFAULT 1 NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
          last_login_at INTEGER,
          preferences TEXT
        )
      `);
      console.log('✅ admin_users table created/verified');
    } catch (error) {
      console.log('Admin table creation error:', error);
    }

    // Insert test admin user
    const currentTimestamp = new Date();

    await db
      .insert(schema.adminUsers)
      .values({
        id: 'admin-001',
        email: 'admin@test.com',
        name: 'Test Administrator',
        role: 'ProjectAdmin',
        permissions: [
          {
            id: 'all',
            name: 'All Permissions',
            description: 'Full access to all admin functions',
            scope: 'global' as const,
          },
        ],
        is_active: true,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      })
      .onConflictDoNothing();

    console.log('✅ Test admin user created successfully!');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Use magic link authentication');
  } catch (error) {
    console.error('❌ Failed to create test admin:', error);
    process.exit(1);
  }
}

createTestAdmin();
