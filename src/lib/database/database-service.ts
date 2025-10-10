/**
 * Database Service
 * Handles database transaction and query management
 */

import { getDatabase } from '@/lib/database';
import type { DatabaseConnection } from '@/lib/database';

export class DatabaseService {
  private db: DatabaseConnection | null = null;

  /**
   * Get or initialize database connection
   */
  private async getConnection(): Promise<DatabaseConnection> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  /**
   * Execute operations within a database transaction
   * Automatically rolls back on error
   */
  async transaction<T>(
    callback: (tx: DatabaseConnection) => Promise<T>
  ): Promise<T> {
    const db = await this.getConnection();

    try {
      // Drizzle ORM transaction with proper typing
      return await (db as any).transaction(async (tx: any) => {
        return await callback(tx);
      });
    } catch (error) {
      console.error('Transaction failed:', error);
      throw new Error(
        `Transaction failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Execute a raw SQL query with parameters
   * For SELECT queries that return data
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const db = await this.getConnection();

    try {
      // Execute raw SQL query using Drizzle's execute method
      const result = await (db as any).run(sql, params || []);
      return result.rows as T[];
    } catch (error) {
      console.error('Query execution failed:', error);
      throw new Error(
        `Query failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Execute a raw SQL statement (INSERT, UPDATE, DELETE)
   * Returns execution result metadata
   */
  async execute(sql: string, params?: any[]): Promise<any> {
    const db = await this.getConnection();

    try {
      // Execute raw SQL using Drizzle's run method
      const result = await (db as any).run(sql, params || []);
      return {
        changes: result.changes || 0,
        lastInsertRowid: result.lastInsertRowid,
      };
    } catch (error) {
      console.error('Execute failed:', error);
      throw new Error(
        `Execute failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Execute multiple operations in a single transaction
   * Rolls back all changes if any operation fails
   */
  async batchTransaction<T>(
    operations: Array<(tx: DatabaseConnection) => Promise<T>>
  ): Promise<T[]> {
    const db = await this.getConnection();

    try {
      return await (db as any).transaction(async (tx: any) => {
        const results: T[] = [];
        for (const operation of operations) {
          const result = await operation(tx);
          results.push(result);
        }
        return results;
      });
    } catch (error) {
      console.error('Batch transaction failed:', error);
      throw new Error(
        `Batch transaction failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get the underlying database connection
   * Use with caution - prefer using transaction() or query() methods
   */
  async getDbConnection(): Promise<DatabaseConnection> {
    return await this.getConnection();
  }
}
