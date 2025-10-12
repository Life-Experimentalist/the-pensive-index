/**
 * Client-Side Caching Utility
 *
 * Implements localStorage/sessionStorage caching with TTL (Time To Live)
 * to reduce unnecessary API calls for frequently accessed data.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  /**
   * Time to live in milliseconds
   * @default 5 minutes (300000 ms)
   */
  ttl?: number;
  /**
   * Use sessionStorage instead of localStorage
   * @default false
   */
  useSession?: boolean;
  /**
   * Force refresh from server
   * @default false
   */
  forceRefresh?: boolean;
}

/**
 * Get cached data or fetch from server
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch fresh data
 * @param options - Cache options
 * @returns Cached or fresh data
 *
 * @example
 * ```typescript
 * const fandoms = await getCachedData(
 *   'fandoms-list',
 *   () => fetch('/api/fandom').then(r => r.json()),
 *   { ttl: 10 * 60 * 1000 } // 10 minutes
 * );
 * ```
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    useSession = false,
    forceRefresh = false,
  } = options;

  const storage = useSession ? sessionStorage : localStorage;

  try {
    // Check if we should force refresh
    if (forceRefresh) {
      const data = await fetcher();
      setCachedData(key, data, { ttl, useSession });
      return data;
    }

    // Try to get from cache
    const cached = storage.getItem(key);

    if (cached) {
      const entry: CacheEntry<T> = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() < entry.expiresAt) {
        console.log(
          `[Cache] Hit for "${key}" (${Math.round(
            (entry.expiresAt - Date.now()) / 1000
          )}s remaining)`
        );
        return entry.data;
      }

      console.log(`[Cache] Expired for "${key}"`);
    }

    // Cache miss or expired - fetch fresh data
    console.log(`[Cache] Miss for "${key}" - fetching fresh data`);
    const data = await fetcher();

    // Store in cache
    setCachedData(key, data, { ttl, useSession });

    return data;
  } catch (error) {
    console.error(`[Cache] Error for "${key}":`, error);

    // Try to return stale cache as fallback
    const cached = storage.getItem(key);
    if (cached) {
      const entry: CacheEntry<T> = JSON.parse(cached);
      console.warn(`[Cache] Using stale cache for "${key}" due to fetch error`);
      return entry.data;
    }

    throw error;
  }
}

/**
 * Set data in cache
 *
 * @param key - Cache key
 * @param data - Data to cache
 * @param options - Cache options
 */
export function setCachedData<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): void {
  const { ttl = 5 * 60 * 1000, useSession = false } = options;

  const storage = useSession ? sessionStorage : localStorage;

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  };

  try {
    storage.setItem(key, JSON.stringify(entry));
    console.log(`[Cache] Stored "${key}" (TTL: ${Math.round(ttl / 1000)}s)`);
  } catch (error) {
    console.error(`[Cache] Failed to store "${key}":`, error);
    // Storage quota exceeded - clear old entries
    clearOldCache(storage);
  }
}

/**
 * Invalidate cache entry
 *
 * @param key - Cache key to invalidate
 * @param useSession - Use sessionStorage instead of localStorage
 */
export function invalidateCache(key: string, useSession = false): void {
  const storage = useSession ? sessionStorage : localStorage;
  storage.removeItem(key);
  console.log(`[Cache] Invalidated "${key}"`);
}

/**
 * Clear all cache entries matching a pattern
 *
 * @param pattern - RegExp or string pattern to match keys
 * @param useSession - Use sessionStorage instead of localStorage
 *
 * @example
 * ```typescript
 * // Clear all fandom-related caches
 * clearCachePattern(/^fandom-/);
 * ```
 */
export function clearCachePattern(
  pattern: RegExp | string,
  useSession = false
): void {
  const storage = useSession ? sessionStorage : localStorage;
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  const keys = Object.keys(storage);
  let cleared = 0;

  for (const key of keys) {
    if (regex.test(key)) {
      storage.removeItem(key);
      cleared++;
    }
  }

  console.log(
    `[Cache] Cleared ${cleared} entries matching pattern: ${pattern}`
  );
}

/**
 * Clear expired cache entries
 *
 * @param storage - Storage to clear
 */
function clearOldCache(storage: Storage): void {
  const now = Date.now();
  const keys = Object.keys(storage);
  let cleared = 0;

  for (const key of keys) {
    try {
      const entry = JSON.parse(
        storage.getItem(key) || '{}'
      ) as CacheEntry<unknown>;

      if (entry.expiresAt && now > entry.expiresAt) {
        storage.removeItem(key);
        cleared++;
      }
    } catch {
      // Invalid entry - remove it
      storage.removeItem(key);
      cleared++;
    }
  }

  console.log(`[Cache] Cleared ${cleared} expired entries`);
}

/**
 * Cache key builders for common data types
 */
export const CacheKeys = {
  // User data
  currentUser: () => 'user-current',
  userPermissions: (userId: string) => `user-permissions-${userId}`,

  // Fandom data
  fandomsList: () => 'fandoms-list',
  fandomDetails: (slug: string) => `fandom-${slug}`,
  fandomTags: (slug: string) => `fandom-tags-${slug}`,
  fandomTropes: (slug: string) => `fandom-tropes-${slug}`,
  fandomPathwayData: (fandomId: string) => `fandom-pathway-${fandomId}`,

  // Tag/Trope data
  tagClasses: (fandomId?: string) =>
    fandomId ? `tag-classes-${fandomId}` : 'tag-classes-all',
  plotBlocks: (fandomId?: string) =>
    fandomId ? `plot-blocks-${fandomId}` : 'plot-blocks-all',

  // Admin data
  adminStats: () => 'admin-stats',
  adminUsers: () => 'admin-users',
} as const;

/**
 * Pre-configured cache durations
 */
export const CacheDurations = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes (default)
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
  SESSION: Infinity, // Until browser closes (with useSession: true)
} as const;
