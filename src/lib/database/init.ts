/**
 * Database initialization utility for API routes
 * Ensures database connection is properly set up before queries
 */

import { db } from '@/lib/database';

let isInitialized = false;

/**
 * Initialize database connection if not already done
 * This handles the connection setup for different environments
 */
export async function initializeDatabase(): Promise<void> {
  // Return early if already initialized
  if (isInitialized) {
    return;
  }

  try {
    // Test if connection already exists and works
    const connection = db.getConnection();
    await connection
      .select()
      .from(await import('@/lib/database/schema').then(s => s.fandoms))
      .limit(1);
    isInitialized = true;
    return;
  } catch (error) {
    console.log('Database connection needs initialization...', error);
  }

  try {
    // Initialize based on environment
    const config = getDatabaseConfig();
    await db.initialize(config);

    // Test the connection
    const connection = db.getConnection();
    await connection
      .select()
      .from(await import('@/lib/database/schema').then(s => s.fandoms))
      .limit(1);

    isInitialized = true;
    console.log('Database connection initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
}

/**
 * Get database configuration based on environment
 */
function getDatabaseConfig() {
  // Development environment - use local SQLite
  if (process.env.NODE_ENV === 'development') {
    return {
      type: 'sqlite' as const,
      url: './data/the-pensive-index.db',
    };
  }

  // Production environment configurations

  // Cloudflare D1 (if D1_DATABASE is available)
  if (process.env.CF_DATABASE_ID || process.env.D1_DATABASE) {
    return {
      type: 'cloudflare-d1' as const,
      d1Database: process.env.D1_DATABASE,
    };
  }

  // LibSQL/Turso (if LIBSQL_URL is available)
  if (process.env.LIBSQL_URL) {
    return {
      type: 'libsql' as const,
      url: process.env.LIBSQL_URL,
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    };
  }

  // Fallback to local SQLite for any environment
  return {
    type: 'sqlite' as const,
    url: './data/the-pensive-index.db',
  };
}

/**
 * Get initialized database connection
 * Automatically initializes if needed
 */
export async function getDb() {
  await initializeDatabase();
  return db.getConnection();
}

/**
 * Reset initialization state (useful for testing)
 */
export function resetInitialization(): void {
  isInitialized = false;
}
