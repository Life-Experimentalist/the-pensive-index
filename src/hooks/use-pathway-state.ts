'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { PathwayItem } from '@/types';

export interface PathwayState {
  fandomSlug?: string;
  pathway: PathwayItem[];
  selectedTags: string[];
  selectedPlotBlocks: string[];
  filters: {
    search: string;
    categories: string[];
    rating: string[];
    status: string[];
    wordCount: [number, number];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  validationResults?: {
    isValid: boolean;
    score: number;
    issues: Array<{
      id: string;
      type: string;
      message: string;
    }>;
  };
}

export interface UsePathwayStateOptions {
  /**
   * Default state values
   */
  defaultState?: Partial<PathwayState>;

  /**
   * Whether to sync state with URL automatically
   */
  syncWithUrl?: boolean;

  /**
   * Debounce time for URL updates (ms)
   */
  debounceMs?: number;

  /**
   * URL parameter prefix to avoid conflicts
   */
  paramPrefix?: string;

  /**
   * Whether to replace or push URL state changes
   */
  replaceUrl?: boolean;
}

export interface UsePathwayStateReturn {
  /**
   * Current pathway state
   */
  state: PathwayState;

  /**
   * Update pathway state
   */
  updateState: (updates: Partial<PathwayState>) => void;

  /**
   * Reset pathway to empty state
   */
  resetPathway: () => void;

  /**
   * Add item to pathway
   */
  addToPathway: (item: PathwayItem) => void;

  /**
   * Remove item from pathway
   */
  removeFromPathway: (itemId: string) => void;

  /**
   * Reorder pathway items
   */
  reorderPathway: (startIndex: number, endIndex: number) => void;

  /**
   * Update filters
   */
  updateFilters: (filters: Partial<PathwayState['filters']>) => void;

  /**
   * Get shareable URL for current state
   */
  getShareableUrl: () => string;

  /**
   * Load state from URL
   */
  loadFromUrl: (url: string) => void;

  /**
   * Whether state is being loaded from URL
   */
  isLoading: boolean;

  /**
   * Whether state has been initialized
   */
  isInitialized: boolean;
}

/**
 * Hook for managing pathway state with URL persistence
 *
 * Features:
 * - Automatic URL synchronization for shareability
 * - Debounced URL updates for performance
 * - Compressed state encoding for shorter URLs
 * - Browser back/forward button support
 * - State validation and error recovery
 * - Deep linking support for specific pathways
 *
 * URL Format:
 * - p: pathway items (compressed JSON)
 * - f: filters (compressed JSON)
 * - v: validation results (optional)
 *
 * Usage:
 * ```tsx
 * const { state, updateState, addToPathway } = usePathwayState({
 *   syncWithUrl: true,
 *   debounceMs: 500
 * });
 * ```
 */
export function usePathwayState(
  options: UsePathwayStateOptions = {}
): UsePathwayStateReturn {
  const {
    defaultState = {},
    syncWithUrl = true,
    debounceMs = 500,
    paramPrefix = 'ps',
    replaceUrl = false,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Default pathway state
  const initialState: PathwayState = {
    pathway: [],
    selectedTags: [],
    selectedPlotBlocks: [],
    filters: {
      search: '',
      categories: [],
      rating: [],
      status: [],
      wordCount: [0, 1000000],
      sortBy: 'relevance',
      sortOrder: 'desc',
    },
    ...defaultState,
  };

  const [state, setState] = useState<PathwayState>(initialState);

  // Compress state for URL encoding
  const compressState = useCallback(
    (state: PathwayState): Record<string, string> => {
      const params: Record<string, string> = {};

      // Encode pathway items
      if (state.pathway.length > 0) {
        params[`${paramPrefix}_p`] = encodeURIComponent(
          JSON.stringify(state.pathway)
        );
      }

      // Encode filters (only non-default values)
      const nonDefaultFilters = Object.entries(state.filters).reduce(
        (acc, [key, value]) => {
          const defaultValue =
            initialState.filters[key as keyof typeof initialState.filters];
          if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, any>
      );

      if (Object.keys(nonDefaultFilters).length > 0) {
        params[`${paramPrefix}_f`] = encodeURIComponent(
          JSON.stringify(nonDefaultFilters)
        );
      }

      // Encode fandom slug if present
      if (state.fandomSlug) {
        params[`${paramPrefix}_fs`] = state.fandomSlug;
      }

      // Encode validation results if present
      if (state.validationResults) {
        params[`${paramPrefix}_v`] = encodeURIComponent(
          JSON.stringify(state.validationResults)
        );
      }

      return params;
    },
    [paramPrefix, initialState]
  );

  // Decompress state from URL params
  const decompressState = useCallback(
    (searchParams: URLSearchParams): Partial<PathwayState> => {
      const state: Partial<PathwayState> = {};

      try {
        // Decode pathway items
        const pathwayParam = searchParams.get(`${paramPrefix}_p`);
        if (pathwayParam) {
          state.pathway = JSON.parse(decodeURIComponent(pathwayParam));
        }

        // Decode filters
        const filtersParam = searchParams.get(`${paramPrefix}_f`);
        if (filtersParam) {
          const filters = JSON.parse(decodeURIComponent(filtersParam));
          state.filters = { ...initialState.filters, ...filters };
        }

        // Decode fandom slug
        const fandomSlugParam = searchParams.get(`${paramPrefix}_fs`);
        if (fandomSlugParam) {
          state.fandomSlug = fandomSlugParam;
        }

        // Decode validation results
        const validationParam = searchParams.get(`${paramPrefix}_v`);
        if (validationParam) {
          state.validationResults = JSON.parse(
            decodeURIComponent(validationParam)
          );
        }

        // Derive selected items from pathway
        if (state.pathway) {
          state.selectedTags = state.pathway
            .filter(item => item.type === 'tag')
            .map(item => item.id);
          state.selectedPlotBlocks = state.pathway
            .filter(item => item.type === 'plot_block')
            .map(item => item.id);
        }
      } catch (error) {
        console.warn('Failed to decode pathway state from URL:', error);
      }

      return state;
    },
    [paramPrefix, initialState]
  );

  // Debounced URL update function
  const debouncedUpdateUrl = useMemo(
    () =>
      debounce((newState: PathwayState) => {
        if (!syncWithUrl) return;

        const params = compressState(newState);
        const newSearchParams = new URLSearchParams(searchParams.toString());

        // Remove old params
        Array.from(newSearchParams.keys()).forEach(key => {
          if (key.startsWith(paramPrefix)) {
            newSearchParams.delete(key);
          }
        });

        // Add new params
        Object.entries(params).forEach(([key, value]) => {
          newSearchParams.set(key, value);
        });

        const newUrl = `${pathname}?${newSearchParams.toString()}`;

        if (replaceUrl) {
          router.replace(newUrl);
        } else {
          router.push(newUrl);
        }
      }, debounceMs),
    [
      syncWithUrl,
      compressState,
      searchParams,
      pathname,
      router,
      replaceUrl,
      debounceMs,
      paramPrefix,
    ]
  );

  // Load state from URL on mount
  useEffect(() => {
    if (!syncWithUrl) {
      setIsInitialized(true);
      setIsLoading(false);
      return;
    }

    const urlState = decompressState(searchParams);
    if (Object.keys(urlState).length > 0) {
      setState(prevState => ({ ...prevState, ...urlState }));
    }

    setIsInitialized(true);
    setIsLoading(false);
  }, [syncWithUrl, decompressState, searchParams]);

  // Update state function
  const updateState = useCallback(
    (updates: Partial<PathwayState>) => {
      setState(prevState => {
        const newState = { ...prevState, ...updates };
        debouncedUpdateUrl(newState);
        return newState;
      });
    },
    [debouncedUpdateUrl]
  );

  // Reset pathway
  const resetPathway = useCallback(() => {
    updateState({
      pathway: [],
      selectedTags: [],
      selectedPlotBlocks: [],
      validationResults: undefined,
    });
  }, [updateState]);

  // Add item to pathway
  const addToPathway = useCallback(
    (item: PathwayItem) => {
      setState(prevState => {
        const newPathway = [...prevState.pathway, item];
        const newSelectedTags =
          item.type === 'tag'
            ? [...prevState.selectedTags, item.id]
            : prevState.selectedTags;
        const newSelectedPlotBlocks =
          item.type === 'plot_block'
            ? [...prevState.selectedPlotBlocks, item.id]
            : prevState.selectedPlotBlocks;

        const newState = {
          ...prevState,
          pathway: newPathway,
          selectedTags: newSelectedTags,
          selectedPlotBlocks: newSelectedPlotBlocks,
        };

        debouncedUpdateUrl(newState);
        return newState;
      });
    },
    [debouncedUpdateUrl]
  );

  // Remove item from pathway
  const removeFromPathway = useCallback(
    (itemId: string) => {
      setState(prevState => {
        const itemToRemove = prevState.pathway.find(item => item.id === itemId);
        if (!itemToRemove) return prevState;

        const newPathway = prevState.pathway.filter(item => item.id !== itemId);
        const newSelectedTags =
          itemToRemove.type === 'tag'
            ? prevState.selectedTags.filter(id => id !== itemId)
            : prevState.selectedTags;
        const newSelectedPlotBlocks =
          itemToRemove.type === 'plot_block'
            ? prevState.selectedPlotBlocks.filter(id => id !== itemId)
            : prevState.selectedPlotBlocks;

        const newState = {
          ...prevState,
          pathway: newPathway,
          selectedTags: newSelectedTags,
          selectedPlotBlocks: newSelectedPlotBlocks,
        };

        debouncedUpdateUrl(newState);
        return newState;
      });
    },
    [debouncedUpdateUrl]
  );

  // Reorder pathway items
  const reorderPathway = useCallback(
    (startIndex: number, endIndex: number) => {
      setState(prevState => {
        const newPathway = [...prevState.pathway];
        const [removed] = newPathway.splice(startIndex, 1);
        newPathway.splice(endIndex, 0, removed);

        const newState = { ...prevState, pathway: newPathway };
        debouncedUpdateUrl(newState);
        return newState;
      });
    },
    [debouncedUpdateUrl]
  );

  // Update filters
  const updateFilters = useCallback(
    (filterUpdates: Partial<PathwayState['filters']>) => {
      updateState({
        filters: { ...state.filters, ...filterUpdates },
      });
    },
    [updateState, state.filters]
  );

  // Get shareable URL
  const getShareableUrl = useCallback(() => {
    const params = compressState(state);
    const newSearchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      newSearchParams.set(key, value);
    });

    return `${window.location.origin}${pathname}?${newSearchParams.toString()}`;
  }, [state, compressState, pathname]);

  // Load state from URL
  const loadFromUrl = useCallback(
    (url: string) => {
      try {
        const urlObj = new URL(url);
        const urlState = decompressState(urlObj.searchParams);
        updateState({ ...initialState, ...urlState });
      } catch (error) {
        console.warn('Failed to load pathway state from URL:', error);
      }
    },
    [decompressState, updateState, initialState]
  );

  return {
    state,
    updateState,
    resetPathway,
    addToPathway,
    removeFromPathway,
    reorderPathway,
    updateFilters,
    getShareableUrl,
    loadFromUrl,
    isLoading,
    isInitialized,
  };
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default usePathwayState;
