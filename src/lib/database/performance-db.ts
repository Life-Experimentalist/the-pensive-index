/**
 * Performance Database Utilities
 *
 * Utilities for accessing the D1 database in API routes for performance monitoring.
 * Provides a bridge between Cloudflare D1 and Next.js API routes.
 * Includes automatic query performance logging for slow queries.
 */

import { getDatabase } from '@/lib/database/config';

/**
 * Query performance logging threshold in milliseconds
 * Queries slower than this will be logged
 */
const SLOW_QUERY_THRESHOLD_MS = 100;

/**
 * Query performance logger
 * Logs to query_performance_logs table if query exceeds threshold
 */
async function logSlowQuery(
  db: any,
  query: string,
  executionTimeMs: number,
  endpoint?: string
): Promise<void> {
  if (executionTimeMs < SLOW_QUERY_THRESHOLD_MS) {
    return; // Not slow enough to log
  }

  try {
    // Sanitize query (remove actual values for privacy)
    const sanitizedQuery = query
      .replace(/\b\d+\b/g, '?')
      .replace(/'[^']*'/g, '?');

    const stmt = db.query(`
      INSERT INTO query_performance_logs (
        timestamp, query_text, execution_time, endpoint
      ) VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      new Date(),
      sanitizedQuery,
      executionTimeMs,
      endpoint || 'unknown'
    );

    console.warn(
      `[Performance] Slow query detected: ${executionTimeMs}ms - ${sanitizedQuery.substring(
        0,
        100
      )}`
    );
  } catch (error) {
    // Don't fail the original query if logging fails
    console.error('[Performance] Failed to log slow query:', error);
  }
}

/**
 * D1Database interface compatible with Cloudflare Workers
 * This matches the interface expected by performance services
 */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Get D1 database connection for performance monitoring
 *
 * In development: Uses better-sqlite3 with D1-compatible interface
 * In production: Uses actual Cloudflare D1 binding
 */
export function getPerformanceDatabase(): D1Database {
  // For now, use the existing SQLite database with a D1-compatible wrapper
  // TODO: In production with Cloudflare Workers, return actual D1 binding from env

  const db = getDatabase();

  // Create D1-compatible interface wrapper for better-sqlite3
  return createD1Adapter(db);
}

/**
 * Create a D1-compatible adapter for better-sqlite3 database
 * This allows development/testing with SQLite while maintaining D1 interface
 */
function createD1Adapter(db: any): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      return {
        bind(...values: any[]): D1PreparedStatement {
          const boundQuery = query;
          const boundValues = values;

          return {
            bind(...moreValues: any[]): D1PreparedStatement {
              return this.bind(...boundValues, ...moreValues);
            },

            async first<T = unknown>(colName?: string): Promise<T | null> {
              const startTime = Date.now();
              try {
                const stmt = db.query(boundQuery);
                const result = stmt.get(...boundValues);

                // Log query performance
                const executionTime = Date.now() - startTime;
                await logSlowQuery(db, boundQuery, executionTime);

                if (!result) {
                  return null;
                }
                if (colName) {
                  return result[colName] as T;
                }
                return result as T;
              } catch (error) {
                console.error('D1 Adapter first() error:', error);
                return null;
              }
            },

            async run<T = unknown>(): Promise<D1Result<T>> {
              const startTime = Date.now();
              try {
                const stmt = db.query(boundQuery);
                const result = stmt.run(...boundValues);

                // Log query performance
                const executionTime = Date.now() - startTime;
                await logSlowQuery(db, boundQuery, executionTime);

                return {
                  success: true,
                  meta: {
                    changes: result.changes || 0,
                    last_row_id:
                      (result.lastInsertRowid as number) || undefined,
                  },
                };
              } catch (error: any) {
                console.error('D1 Adapter run() error:', error);
                return {
                  success: false,
                  error: error.message,
                };
              }
            },

            async all<T = unknown>(): Promise<D1Result<T>> {
              const startTime = Date.now();
              try {
                const stmt = db.query(boundQuery);
                const results = stmt.all(...boundValues) as T[];

                // Log query performance
                const executionTime = Date.now() - startTime;
                await logSlowQuery(db, boundQuery, executionTime);

                return {
                  results,
                  success: true,
                };
              } catch (error: any) {
                console.error('D1 Adapter all() error:', error);
                return {
                  results: [],
                  success: false,
                  error: error.message,
                };
              }
            },

            // eslint-disable-next-line @typescript-eslint/require-await
            async raw<T = unknown>(): Promise<T[]> {
              try {
                const stmt = db.query(boundQuery);
                return stmt.all(...boundValues) as T[];
              } catch (error) {
                console.error('D1 Adapter raw() error:', error);
                return [];
              }
            },
          };
        },

        async first<T = unknown>(colName?: string): Promise<T | null> {
          return this.bind().first(colName);
        },

        async run<T = unknown>(): Promise<D1Result<T>> {
          return this.bind().run();
        },

        async all<T = unknown>(): Promise<D1Result<T>> {
          return this.bind().all();
        },

        async raw<T = unknown>(): Promise<T[]> {
          return this.bind().raw();
        },
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async dump(): Promise<ArrayBuffer> {
      throw new Error('dump() not implemented in development adapter');
    },

    async batch<T = unknown>(
      statements: D1PreparedStatement[]
    ): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        const result = await stmt.run<T>();
        results.push(result);
      }
      return results;
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async exec(query: string): Promise<D1ExecResult> {
      const startTime = Date.now();
      try {
        const stmt = db.query(query);
        stmt.run();

        return {
          count: 1,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        console.error('D1 Adapter exec() error:', error);
        return {
          count: 0,
          duration: Date.now() - startTime,
        };
      }
    },
  };
}

/**
 * Helper to get Cloudflare KV binding for caching
 * In development: Returns null (cache disabled)
 * In production: Returns actual KV binding from env
 */
export function getPerformanceKV(): KVNamespace | null {
  // TODO: In production with Cloudflare Workers, return actual KV binding from env
  // For now, return null to disable KV caching in development
  return null;
}

/**
 * KV Namespace interface (Cloudflare Workers KV)
 */
export interface KVNamespace {
  get(
    key: string,
    options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }
  ): Promise<any>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: {
      expiration?: number;
      expirationTtl?: number;
    }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    keys: Array<{ name: string; expiration?: number }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}
