/**
 * Cache Invalidation Hooks
 * Feature: 003-optimize-the-platform
 *
 * Auto-invalidation on content updates:
 * - Tag updates → invalidate search cache
 * - Plot block updates → invalidate search cache
 * - Validation rule updates → invalidate validation cache + increment version
 * - Admin content updates → log to cache_invalidations table
 *
 * Integrates with database triggers and webhook handlers
 */

import { getCacheService, CacheTagBuilder } from '@/lib/cache/cache-service';
import { getLRUCache } from '@/lib/cache/lru-cache';
import type { InvalidationType } from '@/types/performance';

/**
 * Invalidation result
 */
interface InvalidationResult {
  success: boolean;
  invalidatedCount: number;
  error?: string;
}

/**
 * Invalidation log entry
 */
interface InvalidationLog {
  timestamp: number;
  invalidationType: InvalidationType;
  target: string;
  reason: string;
  invalidatedCount: number;
  triggeredBy?: string; // Admin user ID or 'system'
}

// =============================================================================
// CONTENT UPDATE HOOKS
// =============================================================================

/**
 * Invalidate search cache when tags are updated
 * Triggered by: Tag CRUD operations
 */
export async function invalidateOnTagUpdate(
  fandomId: number,
  tagId: number,
  reason: string,
  db?: D1Database
): Promise<InvalidationResult> {
  try {
    const tag = CacheTagBuilder.search(fandomId);
    const cache = getCacheService();

    // Invalidate all search results for this fandom
    const count = await cache.invalidateByTag(tag);

    // Also clear LRU cache entries
    getLRUCache().clear();

    // Log invalidation
    await logInvalidation(
      {
        timestamp: Date.now(),
        invalidationType: 'TAG',
        target: `fandom:${fandomId}:tag:${tagId}`,
        reason,
        invalidatedCount: count,
        triggeredBy: 'system',
      },
      db
    );

    return {
      success: true,
      invalidatedCount: count,
    };
  } catch (error) {
    console.error(
      '[CacheInvalidation] Error invalidating on tag update:',
      error
    );
    return {
      success: false,
      invalidatedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Invalidate search cache when plot blocks are updated
 * Triggered by: Plot block CRUD operations
 */
export async function invalidateOnPlotBlockUpdate(
  fandomId: number,
  plotBlockId: number,
  reason: string,
  db?: D1Database
): Promise<InvalidationResult> {
  try {
    const tag = CacheTagBuilder.search(fandomId);
    const cache = getCacheService();

    // Invalidate all search results for this fandom
    const count = await cache.invalidateByTag(tag);

    // Also clear LRU cache entries
    getLRUCache().clear();

    // Log invalidation
    await logInvalidation(
      {
        timestamp: Date.now(),
        invalidationType: 'TAG',
        target: `fandom:${fandomId}:plotBlock:${plotBlockId}`,
        reason,
        invalidatedCount: count,
        triggeredBy: 'system',
      },
      db
    );

    return {
      success: true,
      invalidatedCount: count,
    };
  } catch (error) {
    console.error(
      '[CacheInvalidation] Error invalidating on plot block update:',
      error
    );
    return {
      success: false,
      invalidatedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Invalidate validation cache when rules are updated
 * Triggered by: Validation rule CRUD operations
 */
export async function invalidateOnValidationRuleUpdate(
  fandomId: number,
  ruleId: number,
  reason: string,
  db?: D1Database
): Promise<InvalidationResult> {
  try {
    const tag = CacheTagBuilder.validationRules(fandomId);
    const cache = getCacheService();

    // Invalidate all validation rules for this fandom
    const count = await cache.invalidateByTag(tag);

    // Also clear LRU cache entries
    getLRUCache().clear();

    // Increment validation rule version (stored in KV metadata)
    await incrementValidationVersion(fandomId);

    // Log invalidation
    await logInvalidation(
      {
        timestamp: Date.now(),
        invalidationType: 'PREFIX',
        target: `fandom:${fandomId}:validationRule:${ruleId}`,
        reason,
        invalidatedCount: count,
        triggeredBy: 'system',
      },
      db
    );

    return {
      success: true,
      invalidatedCount: count,
    };
  } catch (error) {
    console.error(
      '[CacheInvalidation] Error invalidating on validation rule update:',
      error
    );
    return {
      success: false,
      invalidatedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Invalidate fandom cache when fandom is updated
 * Triggered by: Fandom CRUD operations
 */
export async function invalidateOnFandomUpdate(
  fandomId: number,
  reason: string,
  adminUserId?: string,
  db?: D1Database
): Promise<InvalidationResult> {
  try {
    const tag = CacheTagBuilder.fandom(fandomId);
    const cache = getCacheService();

    // Invalidate all cache entries for this fandom
    const count = await cache.invalidateByTag(tag);

    // Also clear LRU cache entries
    getLRUCache().clear();

    // Log invalidation
    await logInvalidation(
      {
        timestamp: Date.now(),
        invalidationType: 'FULL',
        target: `fandom:${fandomId}`,
        reason,
        invalidatedCount: count,
        triggeredBy: adminUserId || 'admin',
      },
      db
    );

    return {
      success: true,
      invalidatedCount: count,
    };
  } catch (error) {
    console.error(
      '[CacheInvalidation] Error invalidating on fandom update:',
      error
    );
    return {
      success: false,
      invalidatedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// MANUAL INVALIDATION (ADMIN)
// =============================================================================

/**
 * Manual cache invalidation by admin
 * Supports key, tag, or prefix invalidation
 */
export async function manualInvalidation(
  type: InvalidationType,
  target: string,
  reason: string,
  adminUserId: string,
  db?: D1Database
): Promise<InvalidationResult> {
  try {
    const cache = getCacheService();
    let count = 0;

    switch (type) {
      case 'KEY':
        await cache.invalidate(target);
        count = 1;
        break;

      case 'TAG':
        count = await cache.invalidateByTag(target);
        break;

      case 'PREFIX':
        count = await cache.invalidateByPrefix(target);
        break;

      default:
        throw new Error(`Invalid invalidation type: ${type}`);
    }

    // Clear LRU cache as well
    getLRUCache().clear();

    // Log invalidation
    await logInvalidation(
      {
        timestamp: Date.now(),
        invalidationType: type,
        target,
        reason,
        invalidatedCount: count,
        triggeredBy: adminUserId,
      },
      db
    );

    return {
      success: true,
      invalidatedCount: count,
    };
  } catch (error) {
    console.error('[CacheInvalidation] Error in manual invalidation:', error);
    return {
      success: false,
      invalidatedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Increment validation rule version for a fandom
 * Stored in KV to ensure cache key changes
 */
async function incrementValidationVersion(fandomId: number): Promise<void> {
  try {
    const cache = getCacheService();
    const versionKey = `validation_version:${fandomId}`;

    // Get current version
    const current = await cache.get<number>(versionKey);
    const newVersion = (current || 0) + 1;

    // Store new version (never expires)
    await cache.set(versionKey, newVersion, 365 * 24 * 60 * 60); // 1 year

    console.log(
      `[CacheInvalidation] Incremented validation version for fandom ${fandomId}: ${newVersion}`
    );
  } catch (error) {
    console.error(
      '[CacheInvalidation] Error incrementing validation version:',
      error
    );
  }
}

/**
 * Get current validation rule version for a fandom
 */
export async function getValidationVersion(fandomId: number): Promise<number> {
  try {
    const cache = getCacheService();
    const versionKey = `validation_version:${fandomId}`;
    const version = await cache.get<number>(versionKey);
    return version || 1;
  } catch (error) {
    console.error(
      '[CacheInvalidation] Error getting validation version:',
      error
    );
    return 1;
  }
}

/**
 * Log invalidation to cache_invalidations table
 */
async function logInvalidation(
  log: InvalidationLog,
  db?: D1Database
): Promise<void> {
  if (!db) {
    console.warn('[CacheInvalidation] No database connection - skipping log');
    return;
  }

  try {
    const query = `
      INSERT INTO cache_invalidations (
        timestamp,
        invalidation_type,
        target,
        reason,
        invalidated_count,
        triggered_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await db
      .prepare(query)
      .bind(
        log.timestamp,
        log.invalidationType,
        log.target,
        log.reason,
        log.invalidatedCount,
        log.triggeredBy || 'system'
      )
      .run();

    console.log('[CacheInvalidation] Logged invalidation:', log);
  } catch (error) {
    console.error('[CacheInvalidation] Error logging invalidation:', error);
    // Don't throw - logging failure shouldn't block invalidation
  }
}

/**
 * Get recent cache invalidations (for admin dashboard)
 */
export async function getRecentInvalidations(
  db: D1Database,
  limit: number = 100
): Promise<InvalidationLog[]> {
  try {
    const query = `
      SELECT
        timestamp,
        invalidation_type as invalidationType,
        target,
        reason,
        invalidated_count as invalidatedCount,
        triggered_by as triggeredBy
      FROM cache_invalidations
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const result = await db.prepare(query).bind(limit).all<InvalidationLog>();
    return result.results || [];
  } catch (error) {
    console.error(
      '[CacheInvalidation] Error getting recent invalidations:',
      error
    );
    return [];
  }
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
  first<T = unknown>(): Promise<T | null>;
}

interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  error?: string;
}
