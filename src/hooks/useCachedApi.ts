/**
 * Cached API Hooks
 *
 * React hooks that use client-side caching for API requests
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import {
  getCachedData,
  invalidateCache,
  CacheKeys,
  CacheDurations,
  type CacheOptions,
} from '@/lib/utils/client-cache';
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints';

interface UseApiOptions<T> extends CacheOptions {
  /**
   * Initial data to use while loading
   */
  initialData?: T;
  /**
   * Skip the initial fetch
   * @default false
   */
  skip?: boolean;
  /**
   * Dependencies that trigger refetch when changed
   */
  deps?: unknown[];
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

/**
 * Hook for cached API requests
 *
 * @param cacheKey - Cache key
 * @param fetcher - Function to fetch data
 * @param options - Hook options
 *
 * @example
 * ```typescript
 * const { data: fandoms, loading, refetch } = useCachedApi(
 *   CacheKeys.fandomsList(),
 *   () => fetch('/api/fandom').then(r => r.json()),
 *   { ttl: CacheDurations.LONG }
 * );
 * ```
 */
export function useCachedApi<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const {
    initialData = null,
    skip = false,
    ttl = CacheDurations.MEDIUM,
    useSession = false,
    deps = [],
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async (forceRefresh = false) => {
    if (skip) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getCachedData(cacheKey, fetcher, {
        ttl,
        useSession,
        forceRefresh,
      });

      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error(`[useCachedApi] Error fetching "${cacheKey}":`, error);
    } finally {
      setLoading(false);
    }
  };

  const invalidate = () => {
    invalidateCache(cacheKey, useSession);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    invalidate,
  };
}

/**
 * Hook for fetching fandoms list with caching
 */
export function useFandoms(
  options: Omit<UseApiOptions<any[]>, 'initialData'> = {}
) {
  return useCachedApi(
    CacheKeys.fandomsList(),
    async () => {
      const response = await fetch(API_ENDPOINTS.FANDOMS_LIST);
      if (!response.ok) {
        throw new Error('Failed to fetch fandoms');
      }
      const data = await response.json();
      return data.fandoms || [];
    },
    { ttl: CacheDurations.LONG, ...options }
  );
}

/**
 * Hook for fetching fandom details with caching
 */
export function useFandomDetails(
  slug: string,
  options: UseApiOptions<any> = {}
) {
  return useCachedApi(
    CacheKeys.fandomDetails(slug),
    async () => {
      const response = await fetch(API_ENDPOINTS.FANDOM_DETAILS(slug));
      if (!response.ok) {
        throw new Error('Failed to fetch fandom details');
      }
      return response.json();
    },
    { ttl: CacheDurations.LONG, skip: !slug, ...options }
  );
}

/**
 * Hook for fetching fandom pathway data (tags + tropes) with caching
 */
export function useFandomPathwayData(
  fandomId: string,
  options: UseApiOptions<any> = {}
) {
  return useCachedApi(
    CacheKeys.fandomPathwayData(fandomId),
    async () => {
      const response = await fetch(API_ENDPOINTS.FANDOM_PATHWAY_DATA(fandomId));
      if (!response.ok) {
        throw new Error('Failed to fetch pathway data');
      }
      return response.json();
    },
    { ttl: CacheDurations.MEDIUM, skip: !fandomId, ...options }
  );
}

/**
 * Hook for fetching tag classes with caching
 */
export function useTagClasses(
  fandomId?: string,
  options: UseApiOptions<any[]> = {}
) {
  return useCachedApi(
    CacheKeys.tagClasses(fandomId),
    async () => {
      const url = API_ENDPOINTS.TAG_CLASSES(fandomId);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch tag classes');
      }
      const data = await response.json();
      return data.tagClasses || [];
    },
    { ttl: CacheDurations.LONG, ...options }
  );
}

/**
 * Hook for fetching current user with caching
 */
export function useCachedCurrentUser(options: UseApiOptions<any> = {}) {
  return useCachedApi(
    CacheKeys.currentUser(),
    async () => {
      const response = await fetch(API_ENDPOINTS.CURRENT_USER);
      if (!response.ok) {
        throw new Error('Failed to fetch current user');
      }
      return response.json();
    },
    { ttl: CacheDurations.SESSION, useSession: true, ...options }
  );
}

/**
 * Hook for fetching admin stats with caching
 */
export function useAdminStats(options: UseApiOptions<any> = {}) {
  return useCachedApi(
    CacheKeys.adminStats(),
    async () => {
      const response = await fetch(API_ENDPOINTS.ADMIN_STATS);
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      return response.json();
    },
    { ttl: CacheDurations.SHORT, ...options }
  );
}
