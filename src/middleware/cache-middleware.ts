/**
 * Cache Middleware Utilities
 * Feature: 003-optimize-the-platform
 *
 * Reusable middleware for adding 4-layer caching to API routes
 *
 * Cache layers:
 * 1. Browser cache (Cache-Control)
 * 2. Cloudflare edge cache (s-maxage)
 * 3. Cloudflare KV (fast lookup)
 * 4. Database (fallback)
 *
 * Features:
 * - Automatic cache key generation
 * - Cache hit/miss tracking
 * - Response time headers
 * - Tag-based invalidation support
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCacheService,
  CacheKeyBuilder,
  CacheTagBuilder,
} from '@/lib/cache/cache-service';
import { getLRUCache } from '@/lib/cache/lru-cache';

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number; // TTL in seconds
  tags?: string[]; // Cache tags for invalidation
  keyPrefix: string; // Cache key prefix
  varyBy?: string[]; // Request parameters to include in cache key
  staleWhileRevalidate?: number; // Seconds to serve stale content while revalidating
}

/**
 * Cached response wrapper
 */
interface CachedResponse<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Cache middleware for API routes
 *
 * Usage in API route:
 * ```typescript
 * import { withCache } from '@/middleware/cache-middleware';
 *
 * export async function GET(request: NextRequest) {
 *   return withCache(
 *     request,
 *     { ttl: 300, keyPrefix: 'search', tags: ['search', 'fandom:1'] },
 *     async () => {
 *       // Your API logic here
 *       return { results: [...] };
 *     }
 *   );
 * }
 * ```
 */
export async function withCache<T>(
  request: NextRequest,
  config: CacheConfig,
  handler: () => Promise<T>
): Promise<NextResponse> {
  const startTime = Date.now();

  // Generate cache key
  const cacheKey = generateCacheKey(request, config);

  try {
    // Try LRU cache first (Layer 3 - in-memory)
    let cached = await checkLRUCache<T>(cacheKey);
    let cacheStatus: 'HIT' | 'MISS' | 'BYPASS' | 'STALE' = 'MISS';

    if (cached) {
      cacheStatus = 'HIT';
      const responseTime = Date.now() - startTime;

      return createCachedResponse(
        cached.data,
        cacheStatus,
        cacheKey,
        responseTime,
        config.ttl
      );
    }

    // Try KV cache (Layer 3 - distributed)
    cached = await checkKVCache<T>(cacheKey);

    if (cached) {
      cacheStatus = 'HIT';

      // Store in LRU for faster subsequent access
      try {
        getLRUCache().set(cacheKey, cached, config.ttl);
      } catch (error) {
        console.error('[CacheMiddleware] Error storing in LRU:', error);
      }

      const responseTime = Date.now() - startTime;

      return createCachedResponse(
        cached.data,
        cacheStatus,
        cacheKey,
        responseTime,
        config.ttl
      );
    }

    // Cache miss - execute handler
    const data = await handler();
    const responseTime = Date.now() - startTime;

    // Store in both caches (async, non-blocking)
    storeCachedData(cacheKey, data, config).catch(error => {
      console.error('[CacheMiddleware] Error storing cache:', error);
    });

    return createCachedResponse(
      data,
      'MISS',
      cacheKey,
      responseTime,
      config.ttl
    );
  } catch (error) {
    console.error('[CacheMiddleware] Cache error:', error);
    // On error, bypass cache and execute handler
    const data = await handler();
    const responseTime = Date.now() - startTime;

    return createCachedResponse(
      data,
      'BYPASS',
      cacheKey,
      responseTime,
      config.ttl
    );
  }
}

/**
 * Search-specific cache middleware
 * 5-minute TTL, tagged by fandomId
 */
export async function withSearchCache(
  request: NextRequest,
  fandomId: number,
  handler: () => Promise<unknown>
): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const tags = searchParams.get('tags')?.split(',') || [];
  const plotBlocks = searchParams.get('plotBlocks')?.split(',') || [];

  return withCache(
    request,
    {
      ttl: 300, // 5 minutes
      keyPrefix: 'search',
      tags: [
        CacheTagBuilder.fandom(fandomId),
        CacheTagBuilder.search(fandomId),
      ],
      varyBy: ['tags', 'plotBlocks', 'limit', 'offset'],
    },
    handler
  );
}

/**
 * Validation rules cache middleware
 * 1-hour TTL, version-based keys
 */
export async function withValidationCache(
  request: NextRequest,
  fandomId: number,
  ruleSetVersion: string,
  handler: () => Promise<unknown>
): Promise<NextResponse> {
  return withCache(
    request,
    {
      ttl: 3600, // 1 hour
      keyPrefix: 'validation',
      tags: [
        CacheTagBuilder.fandom(fandomId),
        CacheTagBuilder.validationRules(fandomId),
      ],
      varyBy: ['version'],
    },
    handler
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate cache key from request and config
 */
function generateCacheKey(request: NextRequest, config: CacheConfig): string {
  const url = request.nextUrl;
  const params = url.searchParams;

  // Start with prefix
  let key = config.keyPrefix;

  // Add varied parameters
  if (config.varyBy) {
    const varyValues = config.varyBy
      .map(param => `${param}:${params.get(param) || 'null'}`)
      .join(':');
    key += `:${varyValues}`;
  } else {
    // Default: use all query parameters
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');
    key += `:${sortedParams}`;
  }

  return key;
}

/**
 * Check LRU cache
 */
function checkLRUCache<T>(key: string): Promise<CachedResponse<T> | null> {
  try {
    const lru = getLRUCache();
    const cached = lru.get(key) as CachedResponse<T> | null;

    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached);
    }

    return Promise.resolve(null);
  } catch (error) {
    console.error('[CacheMiddleware] LRU cache error:', error);
    return Promise.resolve(null);
  }
}

/**
 * Check KV cache
 */
async function checkKVCache<T>(key: string): Promise<CachedResponse<T> | null> {
  try {
    const cache = getCacheService();
    return await cache.get<CachedResponse<T>>(key);
  } catch (error) {
    console.error('[CacheMiddleware] KV cache error:', error);
    return null;
  }
}

/**
 * Store data in both caches
 */
async function storeCachedData<T>(
  key: string,
  data: T,
  config: CacheConfig
): Promise<void> {
  const now = Date.now();
  const wrapped: CachedResponse<T> = {
    data,
    cachedAt: now,
    expiresAt: now + config.ttl * 1000,
  };

  // Store in LRU (synchronous)
  try {
    getLRUCache().set(key, wrapped, config.ttl);
  } catch (error) {
    console.error('[CacheMiddleware] Error storing in LRU:', error);
  }

  // Store in KV (asynchronous)
  try {
    const cache = getCacheService();
    await cache.set(key, wrapped, config.ttl, config.tags);
  } catch (error) {
    console.error('[CacheMiddleware] Error storing in KV:', error);
  }
}

/**
 * Create cached response with appropriate headers
 */
function createCachedResponse<T>(
  data: T,
  cacheStatus: 'HIT' | 'MISS' | 'BYPASS' | 'STALE',
  cacheKey: string,
  responseTime: number,
  ttl: number
): NextResponse {
  const response = NextResponse.json(data);

  // Cache headers
  response.headers.set('X-Cache-Status', cacheStatus);
  response.headers.set('X-Cache-Key', cacheKey);
  response.headers.set('X-Response-Time', `${responseTime}ms`);

  // Cache-Control headers
  if (cacheStatus === 'HIT' || cacheStatus === 'MISS') {
    // Browser cache
    response.headers.set(
      'Cache-Control',
      `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${
        ttl * 2
      }`
    );

    // Cloudflare edge cache
    response.headers.set('CDN-Cache-Control', `max-age=${ttl}`);
  } else {
    // Don't cache on error
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

/**
 * Invalidate cache by tag
 * Used by webhook handlers and admin operations
 */
export async function invalidateCacheByTag(tag: string): Promise<number> {
  try {
    const cache = getCacheService();
    const count = await cache.invalidateByTag(tag);
    console.log(
      `[CacheMiddleware] Invalidated ${count} entries with tag: ${tag}`
    );
    return count;
  } catch (error) {
    console.error('[CacheMiddleware] Error invalidating by tag:', error);
    return 0;
  }
}

/**
 * Invalidate cache by prefix
 * Used for bulk invalidation
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<number> {
  try {
    const cache = getCacheService();
    const count = await cache.invalidateByPrefix(prefix);
    console.log(
      `[CacheMiddleware] Invalidated ${count} entries with prefix: ${prefix}`
    );
    return count;
  } catch (error) {
    console.error('[CacheMiddleware] Error invalidating by prefix:', error);
    return 0;
  }
}

/**
 * Purge all caches (LRU + KV)
 * Use with caution - only for testing or critical updates
 */
export function purgeAllCaches(): Promise<void> {
  try {
    // Clear LRU
    getLRUCache().clear();
    console.log('[CacheMiddleware] Cleared LRU cache');

    // KV doesn't have a clear-all operation
    // Would need to track all keys or use specific prefixes
    console.log(
      '[CacheMiddleware] KV cache must be cleared per-key or per-prefix'
    );

    return Promise.resolve();
  } catch (error) {
    console.error('[CacheMiddleware] Error purging caches:', error);
    return Promise.resolve();
  }
}
