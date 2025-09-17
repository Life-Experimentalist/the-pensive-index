import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { initializeDatabase } from './schemas';

// Database configuration types
export type DatabaseConnection = BetterSQLite3Database | DrizzleD1Database;

// Raw database connection for testing
export interface RawDatabaseConnection {
  run: (sql: string, params?: any[]) => Promise<any>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'd1';
  url?: string;
  d1Binding?: any; // D1Database type not available in test environment
}

// Environment-based database configuration
export function getDatabaseConfig(): DatabaseConfig {
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (dbType === 'd1') {
    return {
      type: 'd1',
      d1Binding: process.env.D1_DATABASE as any, // D1Database type not available in test environment
    };
  }

  return {
    type: 'sqlite',
    url: process.env.DATABASE_URL || './data/the-pensive-index.db',
  };
}

// Create database connection based on configuration
export function createDatabaseConnection(): DatabaseConnection {
  const config = getDatabaseConfig();

  if (config.type === 'd1' && config.d1Binding) {
    // Cloudflare D1 connection for production
    return drizzleD1(config.d1Binding);
  }

  // SQLite3 connection for development/testing
  const sqlite = new Database(config.url || './data/the-pensive-index.db');

  // Enable foreign key constraints
  sqlite.pragma('foreign_keys = ON');

  // Initialize database with schemas (creates tables if they don't exist)
  return initializeDatabase(sqlite);
}

// Singleton database instance
let db: DatabaseConnection | null = null;
let rawSqlite: DatabaseType | null = null;

export function getDatabase(): DatabaseConnection {
  if (!db) {
    db = createDatabaseConnection();
  }
  return db;
}

// Get raw SQLite database for testing
export function getRawDatabase(): RawDatabaseConnection {
  if (!rawSqlite) {
    // Always use test database for raw database access
    rawSqlite = new Database('./data/the-pensive-index-test.db');
    rawSqlite.pragma('foreign_keys = ON');

    // Initialize database with schemas for testing
    initializeDatabase(rawSqlite);
  }

  return {
    run: async (sql: string, params?: any[]) => {
      // Convert boolean values to integers for SQLite compatibility
      const sqliteParams = params?.map((param) =>
        typeof param === 'boolean' ? (param ? 1 : 0) : param
      );

      // For INSERT/UPDATE/DELETE operations, use .run()
      if (
        sql.trim().toUpperCase().startsWith('INSERT') ||
        sql.trim().toUpperCase().startsWith('UPDATE') ||
        sql.trim().toUpperCase().startsWith('DELETE')
      ) {
        if (sqliteParams) {
          return rawSqlite!.prepare(sql).run(sqliteParams);
        }
        return rawSqlite!.prepare(sql).run();
      }

      // For SELECT/PRAGMA operations, use .all()
      if (sqliteParams) {
        return rawSqlite!.prepare(sql).all(sqliteParams);
      }
      return rawSqlite!.prepare(sql).all();
    },
    get: async (sql: string, params?: any[]) => {
      const sqliteParams = params?.map((param) =>
        typeof param === 'boolean' ? (param ? 1 : 0) : param
      );

      if (sqliteParams) {
        return rawSqlite!.prepare(sql).get(sqliteParams);
      }
      return rawSqlite!.prepare(sql).get();
    },
    all: async (sql: string, params?: any[]) => {
      const sqliteParams = params?.map((param) =>
        typeof param === 'boolean' ? (param ? 1 : 0) : param
      );

      if (sqliteParams) {
        return rawSqlite!.prepare(sql).all(sqliteParams);
      }
      return rawSqlite!.prepare(sql).all();
    },
  };
}

// Close database connection (useful for testing)
export function closeDatabaseConnection(): void {
  if (db && 'close' in db) {
    (db as any).close();
  }
  db = null;

  // Also close raw SQLite connection
  if (rawSqlite) {
    rawSqlite.close();
    rawSqlite = null;
  }
}

// Environment configuration utilities
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTesting = process.env.NODE_ENV === 'test';

// Database file paths for different environments
export const DATABASE_PATHS = {
  development: './data/the-pensive-index-dev.db',
  test: './data/the-pensive-index-test.db',
  production: './data/the-pensive-index.db',
} as const;

// Get environment-specific database path
export function getDatabasePath(): string {
  if (isTesting) return DATABASE_PATHS.test;
  if (isDevelopment) return DATABASE_PATHS.development;
  return DATABASE_PATHS.production;
}
