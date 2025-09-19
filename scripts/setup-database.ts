/**
 * Database Setup Script
 *
 * Initializes the database with tables and basic configuration
 * for development and production environments.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { DatabaseManager } from '../src/lib/database';

async function setupDatabase() {
  console.log('🚀 Setting up database...');

  try {
    // Initialize database manager
    const dbManager = DatabaseManager.getInstance();

    // Initialize with SQLite for development
    await dbManager.initialize({
      type: 'sqlite',
      url: process.env.DATABASE_URL || './data/the-pensive-index.db',
    });

    console.log('✅ Database connection established');

    // The tables are automatically created by Drizzle schema
    // when the connection is established
    console.log('✅ Database tables created');

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
