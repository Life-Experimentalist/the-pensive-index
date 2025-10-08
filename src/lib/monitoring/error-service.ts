/**
 * Error Logging Service
 * Feature: 003-optimize-the-platform
 *
 * Structured error logging with deduplication
 *
 * Features:
 * - Error level classification (INFO, WARNING, ERROR, CRITICAL)
 * - Error category (database, cache, api, auth, validation, ratelimit)
 * - Deduplication via MD5 hash (same error = increment count)
 * - Stack trace storage
 * - Context metadata
 */

import type {
  ErrorLog,
  ErrorLevel,
  ErrorCategory,
  ErrorLogQueryParams,
} from '@/types/performance';
import { createHash } from 'crypto';

/**
 * Error Logging Service
 */
export class ErrorService {
  constructor(private db: D1Database) {}

  /**
   * Log an error with automatic deduplication
   */
  async logError(
    level: ErrorLevel,
    category: ErrorCategory,
    message: string,
    stackTrace?: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Generate error hash for deduplication
      const errorHash = this.generateErrorHash(message, stackTrace);

      // Check if error already exists
      const existing = await this.db
        .prepare(
          'SELECT id, occurrence_count FROM error_logs WHERE error_hash = ?'
        )
        .bind(errorHash)
        .first<{ id: number; occurrence_count: number }>();

      if (existing) {
        // Increment occurrence count
        await this.db
          .prepare(
            `
            UPDATE error_logs
            SET occurrence_count = ?,
                last_seen_at = ?
            WHERE id = ?
          `
          )
          .bind(existing.occurrence_count + 1, Date.now(), existing.id)
          .run();

        console.log(
          `[ErrorService] Incremented error ${errorHash}: ${
            existing.occurrence_count + 1
          } occurrences`
        );
      } else {
        // Insert new error
        const contextJson = context ? JSON.stringify(context) : null;

        await this.db
          .prepare(
            `
            INSERT INTO error_logs (
              timestamp,
              level,
              category,
              message,
              stack_trace,
              error_hash,
              occurrence_count,
              last_seen_at,
              context
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
          .bind(
            Date.now(),
            level,
            category,
            message,
            stackTrace || null,
            errorHash,
            1,
            Date.now(),
            contextJson
          )
          .run();

        console.log(
          `[ErrorService] Logged new error: ${level} - ${category} - ${message}`
        );
      }
    } catch (error) {
      // Fallback to console if logging fails
      console.error('[ErrorService] Error logging failed:', error);
      console.error(`Original error: ${level} - ${category} - ${message}`);
    }
  }

  /**
   * Get errors with filters and pagination
   */
  async getErrors(params: ErrorLogQueryParams): Promise<ErrorLog[]> {
    const {
      level,
      category,
      search,
      start,
      end,
      limit = 100,
      offset = 0,
    } = params;

    let query = `
      SELECT
        id,
        timestamp,
        level,
        category,
        message,
        stack_trace as stackTrace,
        error_hash as errorHash,
        occurrence_count as occurrenceCount,
        last_seen_at as lastSeenAt,
        context
      FROM error_logs
      WHERE 1=1
    `;

    const bindings: (number | string)[] = [];

    if (level) {
      query += ' AND level = ?';
      bindings.push(level);
    }

    if (category) {
      query += ' AND category = ?';
      bindings.push(category);
    }

    if (search) {
      query += ' AND (message LIKE ? OR stack_trace LIKE ?)';
      bindings.push(`%${search}%`, `%${search}%`);
    }

    if (start) {
      query += ' AND timestamp >= ?';
      bindings.push(start);
    }

    if (end) {
      query += ' AND timestamp < ?';
      bindings.push(end);
    }

    query += ' ORDER BY last_seen_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<ErrorLog & { context?: string }>();

    return (result.results || []).map(error => ({
      ...error,
      context: error.context ? JSON.parse(error.context) : undefined,
    }));
  }

  /**
   * Get error statistics
   */
  async getErrorStats(
    start: number,
    end: number
  ): Promise<{
    totalErrors: number;
    errorsByLevel: Record<ErrorLevel, number>;
    errorsByCategory: Record<ErrorCategory, number>;
    topErrors: Array<{ message: string; count: number }>;
  }> {
    // Total errors
    const totalResult = await this.db
      .prepare(
        `
        SELECT SUM(occurrence_count) as total
        FROM error_logs
        WHERE timestamp >= ? AND timestamp < ?
      `
      )
      .bind(start, end)
      .first<{ total: number }>();

    const totalErrors = totalResult?.total || 0;

    // Errors by level
    const levelResult = await this.db
      .prepare(
        `
        SELECT level, SUM(occurrence_count) as count
        FROM error_logs
        WHERE timestamp >= ? AND timestamp < ?
        GROUP BY level
      `
      )
      .bind(start, end)
      .all<{ level: ErrorLevel; count: number }>();

    const errorsByLevel = (levelResult.results || []).reduce((acc, row) => {
      acc[row.level] = row.count;
      return acc;
    }, {} as Record<ErrorLevel, number>);

    // Errors by category
    const categoryResult = await this.db
      .prepare(
        `
        SELECT category, SUM(occurrence_count) as count
        FROM error_logs
        WHERE timestamp >= ? AND timestamp < ?
        GROUP BY category
      `
      )
      .bind(start, end)
      .all<{ category: ErrorCategory; count: number }>();

    const errorsByCategory = (categoryResult.results || []).reduce(
      (acc, row) => {
        acc[row.category] = row.count;
        return acc;
      },
      {} as Record<ErrorCategory, number>
    );

    // Top errors
    const topResult = await this.db
      .prepare(
        `
        SELECT message, occurrence_count as count
        FROM error_logs
        WHERE timestamp >= ? AND timestamp < ?
        ORDER BY occurrence_count DESC
        LIMIT 10
      `
      )
      .bind(start, end)
      .all<{ message: string; count: number }>();

    const topErrors = topResult.results || [];

    return {
      totalErrors,
      errorsByLevel,
      errorsByCategory,
      topErrors,
    };
  }

  /**
   * Delete old errors (retention policy)
   */
  async cleanupOldErrors(retentionDays: number = 30): Promise<number> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const result = await this.db
      .prepare('DELETE FROM error_logs WHERE timestamp < ?')
      .bind(cutoff)
      .run();

    console.log(
      `[ErrorService] Deleted ${result.meta?.changes || 0} old errors`
    );
    return result.meta?.changes || 0;
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM error_logs WHERE id = ?')
      .bind(errorId)
      .run();

    console.log(`[ErrorService] Resolved error ${errorId}`);
  }

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  /**
   * Generate MD5 hash for error deduplication
   */
  generateErrorHash(message: string, stackTrace?: string): string {
    const content = stackTrace
      ? `${message}:${this.normalizeStackTrace(stackTrace)}`
      : message;

    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Normalize stack trace for consistent hashing
   * Removes line numbers and dynamic parts
   */
  private normalizeStackTrace(stackTrace: string): string {
    return (
      stackTrace
        // Remove line numbers (e.g., :123:45)
        .replace(/:\d+:\d+/g, '')
        // Remove file paths (keep only filename)
        .replace(/\s+at .+\((.+\/)?([^/]+)\)/g, ' at $2')
        // Remove timestamps
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let errorServiceInstance: ErrorService | null = null;

/**
 * Initialize error service
 */
export function initErrorService(db: D1Database): void {
  errorServiceInstance = new ErrorService(db);
}

/**
 * Get error service instance
 */
export function getErrorService(): ErrorService {
  if (!errorServiceInstance) {
    throw new Error('ErrorService not initialized');
  }
  return errorServiceInstance;
}

/**
 * Convenience function for logging errors
 */
export async function logError(
  level: ErrorLevel,
  category: ErrorCategory,
  message: string,
  stackTrace?: string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const service = getErrorService();
    await service.logError(level, category, message, stackTrace, context);
  } catch (error) {
    // Fallback to console
    console.error('[ErrorService] Failed to log error:', error);
    console.error(`Original error: ${level} - ${category} - ${message}`);
  }
}

/**
 * Convenience function for logging from Error objects
 */
export async function logErrorObject(
  error: Error,
  level: ErrorLevel = 'ERROR',
  category: ErrorCategory = 'api',
  context?: Record<string, unknown>
): Promise<void> {
  await logError(level, category, error.message, error.stack, {
    ...context,
    errorName: error.name,
  });
}

// =============================================================================
// TYPES
// =============================================================================

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
}

interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  error?: string;
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
}
