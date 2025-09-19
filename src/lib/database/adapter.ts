import { DatabaseConnection } from './index';
import { count, sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * This file provides a compatibility layer for the current Drizzle ORM version
 * ensuring that queries work correctly with API changes in newer versions.
 */
export class DatabaseAdapter {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Run a raw SQL query and return the result
   */
  async run<T = any>(query: any): Promise<T[]> {
    // @ts-ignore - This might be .execute() in older versions or .run() in newer
    return this.db.run(query);
  }

  /**
   * Count records in a table using the $count API
   */
  async count(table: any, condition?: any): Promise<number> {
    if (condition) {
      // @ts-ignore - Using the newer $count API with a condition
      return await this.db.$count(table, condition);
    }
    // @ts-ignore - Using the newer $count API
    return await this.db.$count(table);
  }

  /**
   * Execute a select query with compatibility for various Drizzle versions
   */
  async executeSelect<T = any>(query: any): Promise<T[]> {
    try {
      // @ts-ignore - Handling API differences
      return await query;
    } catch (error) {
      console.error('Select query execution error:', error);
      throw error;
    }
  }
}

// Export a helper function to create an adapter instance
export function createDatabaseAdapter(db: DatabaseConnection): DatabaseAdapter {
  return new DatabaseAdapter(db);
}