/**
 * CacheService: Cloudflare KV-backed caching with multi-layer support
 * Feature: 003-optimize-the-platform
 *
 * Implements caching strategy from contracts/caching-api.md:
 * - Layer 1: Browser cache (Cache-Control headers)
 * - Layer 2: Cloudflare edge cache (s-maxage)
 * - Layer 3: Cloudflare KV (this implementation)
 * - Layer 4: Database (fallback)
 *
 * Free-tier constraints:
 * - KV: 100k reads/day, 1k writes/day
 * - Strategy: Aggressive TTLs, minimal writes, graceful degradation
 */

import type {
  CacheEntry,
  CacheService as ICacheService,
} from '@/types/performance';

// Cloudflare KV namespace interface (simplified from @cloudflare/workers-types)
interface KVNamespace {
  get<T>(key: string, options?: { type: 'json' }): Promise<T | null>;
  get(
    key: string,
    options?: { type?: 'text' | 'arrayBuffer' | 'stream' }
  ): Promise<string | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
  }): Promise<{ keys: Array<{ name: string }> }>;
}

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number; // Estimated size in bytes
  keys: number; // Approximate count
}

/**
 * Tag metadata stored alongside cache entries
 */
interface TagMetadata {
  keys: string[]; // List of keys with this tag
  createdAt: number;
}

/**
 * Cloudflare KV-backed cache service
 */
export class KVCacheService implements ICacheService {
  private kv: KVNamespace;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    keys: 0,
  };

  // Prefix for tag metadata keys
  private readonly TAG_PREFIX = '_tag:';
  private readonly PREFIX_INDEX = '_prefix_index';

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await this.kv.get<CacheEntry<T>>(key, { type: 'json' });

      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Check if expired
      const now = Date.now();
      if (entry.expiresAt && entry.expiresAt < now) {
        // Expired - delete and return null
        await this.invalidate(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      return entry.value;
    } catch (error) {
      // Graceful degradation - treat as cache miss
      console.error('[CacheService] Error reading from KV:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set cached value with TTL and optional tags
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
    tags?: string[]
  ): Promise<void> {
    try {
      const now = Date.now();
      const entry: CacheEntry<T> = {
        key,
        value,
        version: 1, // Could be incremented for version-based invalidation
        createdAt: now,
        expiresAt: now + ttlSeconds * 1000,
        tags: tags || [],
      };

      // Store entry in KV with expiration
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: ttlSeconds,
      });

      // Update tag metadata if tags provided
      if (tags && tags.length > 0) {
        await this.updateTagMetadata(key, tags);
      }

      // Update prefix index for efficient prefix invalidation
      await this.addToPrefixIndex(key);

      this.stats.keys++;
      this.stats.size += this.estimateSize(entry);
    } catch (error) {
      // Graceful degradation - log and continue
      console.error('[CacheService] Error writing to KV:', error);
      // Don't throw - caching is not critical
    }
  }

  /**
   * Invalidate specific cache key
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
      await this.removeFromPrefixIndex(key);
      this.stats.keys = Math.max(0, this.stats.keys - 1);
    } catch (error) {
      console.error('[CacheService] Error invalidating key:', error);
    }
  }

  /**
   * Invalidate all keys with a specific tag
   * Returns number of keys invalidated
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = this.TAG_PREFIX + tag;
      const metadata = await this.kv.get<TagMetadata>(tagKey, { type: 'json' });

      if (!metadata || !metadata.keys) {
        return 0;
      }

      // Delete all keys with this tag
      const deletePromises = metadata.keys.map(key => this.invalidate(key));
      await Promise.all(deletePromises);

      // Delete tag metadata
      await this.kv.delete(tagKey);

      return metadata.keys.length;
    } catch (error) {
      console.error('[CacheService] Error invalidating by tag:', error);
      return 0;
    }
  }

  /**
   * Invalidate all keys matching a prefix
   * Returns number of keys invalidated
   *
   * Note: This is expensive and should be used sparingly
   * Uses prefix index for efficiency
   */
  async invalidateByPrefix(prefix: string): Promise<number> {
    try {
      const prefixIndex = await this.kv.get<string[]>(this.PREFIX_INDEX, {
        type: 'json',
      });

      if (!prefixIndex) {
        return 0;
      }

      // Find keys matching prefix
      const matchingKeys = prefixIndex.filter(key => key.startsWith(prefix));

      // Delete matching keys
      const deletePromises = matchingKeys.map(key => this.invalidate(key));
      await Promise.all(deletePromises);

      // Update prefix index
      const updatedIndex = prefixIndex.filter(key => !key.startsWith(prefix));
      await this.kv.put(this.PREFIX_INDEX, JSON.stringify(updatedIndex));

      return matchingKeys.length;
    } catch (error) {
      console.error('[CacheService] Error invalidating by prefix:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats> {
    return Promise.resolve({ ...this.stats });
  }

  /**
   * Helper: Update tag metadata with new key
   */
  private async updateTagMetadata(key: string, tags: string[]): Promise<void> {
    const updatePromises = tags.map(async tag => {
      const tagKey = this.TAG_PREFIX + tag;
      const existing = await this.kv.get<TagMetadata>(tagKey, { type: 'json' });

      const metadata: TagMetadata = {
        keys: existing?.keys || [],
        createdAt: existing?.createdAt || Date.now(),
      };

      // Add key if not already present
      if (!metadata.keys.includes(key)) {
        metadata.keys.push(key);
      }

      // Store updated metadata (no expiration - tags persist)
      await this.kv.put(tagKey, JSON.stringify(metadata));
    });

    await Promise.all(updatePromises);
  }

  /**
   * Helper: Add key to prefix index
   */
  private async addToPrefixIndex(key: string): Promise<void> {
    try {
      const index =
        (await this.kv.get<string[]>(this.PREFIX_INDEX, { type: 'json' })) ||
        [];

      if (!index.includes(key)) {
        index.push(key);
        await this.kv.put(this.PREFIX_INDEX, JSON.stringify(index));
      }
    } catch (error) {
      // Non-critical - continue without index
      console.error('[CacheService] Error updating prefix index:', error);
    }
  }

  /**
   * Helper: Remove key from prefix index
   */
  private async removeFromPrefixIndex(key: string): Promise<void> {
    try {
      const index = await this.kv.get<string[]>(this.PREFIX_INDEX, {
        type: 'json',
      });

      if (!index) {
        return;
      }

      const updatedIndex = index.filter((k: string) => k !== key);
      await this.kv.put(this.PREFIX_INDEX, JSON.stringify(updatedIndex));
    } catch (error) {
      console.error('[CacheService] Error removing from prefix index:', error);
    }
  }

  /**
   * Helper: Estimate entry size in bytes
   */
  private estimateSize<T>(entry: CacheEntry<T>): number {
    try {
      return JSON.stringify(entry).length;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Cache key builders for consistent key generation
 */
export class CacheKeyBuilder {
  /**
   * Build cache key for search results
   * Format: search:{fandomId}:{tags}:{plotBlocks}:v{version}
   */
  static search(
    fandomId: number,
    tags: string[],
    plotBlocks: string[],
    version: number = 2
  ): string {
    // Sort tags and tropes for consistent keys
    const sortedTags = [...tags].sort().join(',');
    const sortedBlocks = [...plotBlocks].sort().join(',');

    return `search:${fandomId}:${sortedTags}:${sortedBlocks}:v${version}`;
  }

  /**
   * Build cache key for validation rules
   * Format: validation:{fandomId}:{ruleSetHash}
   */
  static validation(fandomId: number, ruleSetHash: string): string {
    return `validation:${fandomId}:${ruleSetHash}`;
  }

  /**
   * Build cache key for performance metrics
   * Format: metrics:{start}:{end}:{endpoint}
   */
  static metrics(start: number, end: number, endpoint?: string): string {
    return `metrics:${start}:${end}:${endpoint || 'all'}`;
  }
}

/**
 * Cache tag builders for bulk invalidation
 */
export class CacheTagBuilder {
  /**
   * Build tag for fandom-specific cache entries
   */
  static fandom(fandomId: number): string {
    return `fandom:${fandomId}`;
  }

  /**
   * Build tag for validation rule cache entries
   */
  static validationRules(fandomId: number): string {
    return `validation:${fandomId}`;
  }

  /**
   * Build tag for search results
   */
  static search(fandomId: number): string {
    return `search:${fandomId}`;
  }
}

// =============================================================================
// EXPORT SINGLETON (INITIALIZED IN MIDDLEWARE)
// =============================================================================

let cacheServiceInstance: KVCacheService | null = null;

/**
 * Initialize cache service with KV namespace
 * Called once during application startup
 */
export function initCacheService(kv: KVNamespace): void {
  cacheServiceInstance = new KVCacheService(kv);
}

/**
 * Get cache service instance
 * Throws if not initialized
 */
export function getCacheService(): KVCacheService {
  if (!cacheServiceInstance) {
    throw new Error(
      'CacheService not initialized. Call initCacheService() first.'
    );
  }
  return cacheServiceInstance;
}

/**
 * Export for testing (allows mock injection)
 */
export const cacheService = {
  get: async <T>(key: string) => getCacheService().get<T>(key),
  set: async <T>(key: string, value: T, ttl: number, tags?: string[]) =>
    getCacheService().set(key, value, ttl, tags),
  invalidate: async (key: string) => getCacheService().invalidate(key),
  invalidateByTag: async (tag: string) =>
    getCacheService().invalidateByTag(tag),
  invalidateByPrefix: async (prefix: string) =>
    getCacheService().invalidateByPrefix(prefix),
  getStats: async () => getCacheService().getStats(),
};
