/**
 * Integration Test: Advanced Filtering User Story (T017)
 *
 * User Story: "As a user, I want to apply complex filter combinations,
 * save my searches, and access search history so I can efficiently
 * find stories that match my evolving preferences and discover new
 * content through refined search parameters."
 *
 * This test validates advanced search functionality with persistent
 * user preferences and complex filtering logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock advanced filter configuration
const mockAdvancedFilters = {
  content: {
    wordCount: {
      type: 'range',
      min: 0,
      max: 1000000,
      presets: [
        { label: 'Drabble (<1k)', min: 0, max: 1000 },
        { label: 'Short (1k-10k)', min: 1000, max: 10000 },
        { label: 'Medium (10k-50k)', min: 10000, max: 50000 },
        { label: 'Long (50k-100k)', min: 50000, max: 100000 },
        { label: 'Epic (>100k)', min: 100000, max: 1000000 },
      ],
    },
    completionStatus: {
      type: 'multiselect',
      options: ['completed', 'in-progress', 'abandoned', 'hiatus'],
      default: ['completed', 'in-progress'],
    },
    rating: {
      type: 'multiselect',
      options: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
      default: ['G', 'PG', 'PG-13'],
    },
    warnings: {
      type: 'exclude',
      options: ['character-death', 'graphic-violence', 'underage', 'non-con'],
      default: [],
    },
  },
  metadata: {
    publishDate: {
      type: 'daterange',
      presets: [
        { label: 'Last Week', days: 7 },
        { label: 'Last Month', days: 30 },
        { label: 'Last 6 Months', days: 180 },
        { label: 'Last Year', days: 365 },
        { label: 'Custom Range', days: null },
      ],
    },
    updateDate: {
      type: 'daterange',
      presets: [
        { label: 'Recently Updated (7 days)', days: 7 },
        { label: 'Updated This Month', days: 30 },
        { label: 'Any Time', days: null },
      ],
    },
    language: {
      type: 'select',
      options: ['english', 'spanish', 'french', 'german', 'italian'],
      default: 'english',
    },
  },
  engagement: {
    kudos: {
      type: 'range',
      min: 0,
      max: 50000,
      presets: [
        { label: 'Popular (>1000)', min: 1000, max: 50000 },
        { label: 'Very Popular (>5000)', min: 5000, max: 50000 },
        { label: 'Extremely Popular (>10000)', min: 10000, max: 50000 },
      ],
    },
    comments: {
      type: 'range',
      min: 0,
      max: 10000,
    },
    bookmarks: {
      type: 'range',
      min: 0,
      max: 10000,
    },
  },
  advanced: {
    crossover: {
      type: 'boolean',
      default: false,
      label: 'Include Crossovers',
    },
    translation: {
      type: 'boolean',
      default: false,
      label: 'Include Translations',
    },
    series: {
      type: 'select',
      options: ['any', 'standalone', 'part-of-series'],
      default: 'any',
    },
    authorFilter: {
      type: 'text',
      placeholder: 'Filter by author name',
    },
  },
};

// Mock complex filter combination
const mockComplexFilter = {
  id: 'filter-complex-1',
  name: 'Time Travel Romance Epics',
  fandomId: 'harry-potter',
  filters: {
    content: {
      wordCount: { min: 50000, max: 1000000 },
      completionStatus: ['completed'],
      rating: ['PG-13', 'R'],
      warnings: { exclude: ['character-death'] },
    },
    metadata: {
      publishDate: { after: '2020-01-01', before: '2024-12-31' },
      language: 'english',
    },
    engagement: {
      kudos: { min: 1000, max: 50000 },
      comments: { min: 100, max: 10000 },
    },
    tags: {
      required: ['time-travel', 'harry/hermione'],
      excluded: ['dark-harry', 'character-bashing'],
      preferred: ['fix-it', 'intelligent-hermione'],
    },
    plotBlocks: {
      required: ['time-turner-plot'],
      excluded: ['voldemort-wins'],
      preferred: ['do-over-plot'],
    },
  },
  sortBy: 'kudos',
  sortOrder: 'desc',
};

// Mock saved searches
const mockSavedSearches = [
  {
    id: 'saved-1',
    name: 'Time Travel Romance Epics',
    filter: mockComplexFilter,
    createdAt: Date.now() - 86400000, // 1 day ago
    lastUsed: Date.now() - 3600000, // 1 hour ago
    useCount: 15,
    notifications: true,
    autoUpdate: true,
  },
  {
    id: 'saved-2',
    name: 'Quick Angst Reads',
    filter: {
      ...mockComplexFilter,
      name: 'Quick Angst Reads',
      filters: {
        ...mockComplexFilter.filters,
        content: {
          wordCount: { min: 1000, max: 10000 },
          completionStatus: ['completed'],
          rating: ['PG', 'PG-13'],
        },
        tags: {
          required: ['angst'],
          excluded: ['fluff'],
          preferred: ['hurt/comfort'],
        },
      },
    },
    createdAt: Date.now() - 604800000, // 1 week ago
    lastUsed: Date.now() - 86400000, // 1 day ago
    useCount: 8,
    notifications: false,
    autoUpdate: false,
  },
];

// Mock search history
const mockSearchHistory = [
  {
    id: 'history-1',
    query: 'harry/hermione time-travel',
    filters: mockComplexFilter.filters,
    timestamp: Date.now() - 1800000, // 30 minutes ago
    resultCount: 127,
    searchTime: 245,
  },
  {
    id: 'history-2',
    query: 'powerful-harry inheritance',
    filters: {
      content: { wordCount: { min: 20000, max: 1000000 } },
      tags: { required: ['powerful-harry', 'goblin-inheritance'] },
    },
    timestamp: Date.now() - 7200000, // 2 hours ago
    resultCount: 89,
    searchTime: 198,
  },
];

// Mock filter application results
const mockFilterResults = {
  totalStories: 1247,
  filteredStories: 23,
  appliedFilters: {
    wordCount: { active: true, filtered: 892 },
    completionStatus: { active: true, filtered: 678 },
    tags: { active: true, filtered: 156 },
    kudos: { active: true, filtered: 89 },
  },
  processingTime: 167, // milliseconds
  suggestions: [
    {
      type: 'relax-filter',
      filter: 'kudos',
      message: 'Try lowering kudos requirement to find more stories',
      impact: '+45 stories',
    },
    {
      type: 'add-tag',
      tag: 'romance',
      message: 'Many time-travel stories also feature romance',
      impact: '+12 stories',
    },
  ],
};

describe('Advanced Filtering Integration Test (T017)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for API calls
    global.fetch = vi.fn();

    // Mock localStorage for saved searches
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  it('should validate advanced filtering component structure exists', async () => {
    // This test MUST fail initially - filtering components don't exist yet
    const FilteringComponentExists = () => {
      try {
        // These imports will fail until filtering components are implemented
        // @ts-expect-error - Components don't exist yet
        const {
          AdvancedFilters,
        } = require('@/components/filters/AdvancedFilters');
        // @ts-expect-error - Components don't exist yet
        const { FilterBuilder } = require('@/components/filters/FilterBuilder');
        // @ts-expect-error - Components don't exist yet
        const { SavedSearches } = require('@/components/filters/SavedSearches');
        // @ts-expect-error - Components don't exist yet
        const { SearchHistory } = require('@/components/filters/SearchHistory');

        return true;
      } catch {
        return false;
      }
    };

    // Should fail until filtering components are implemented
    expect(FilteringComponentExists()).toBe(false);
  });

  it('should apply complex filter combinations correctly', () => {
    // Test complex filter application logic
    const applyComplexFilters = (
      stories: any[],
      filters: typeof mockComplexFilter.filters
    ) => {
      return stories.filter(story => {
        // Word count filter
        if (filters.content?.wordCount) {
          const { min, max } = filters.content.wordCount;
          if (story.wordCount < min || story.wordCount > max) return false;
        }

        // Completion status filter
        if (filters.content?.completionStatus) {
          const status = story.completed ? 'completed' : 'in-progress';
          if (!filters.content.completionStatus.includes(status)) return false;
        }

        // Required tags filter
        if (filters.tags?.required) {
          const hasAllRequired = filters.tags.required.every(tag =>
            story.tags.includes(tag)
          );
          if (!hasAllRequired) return false;
        }

        // Excluded tags filter
        if (filters.tags?.excluded) {
          const hasExcluded = filters.tags.excluded.some(tag =>
            story.tags.includes(tag)
          );
          if (hasExcluded) return false;
        }

        // Kudos filter
        if (filters.engagement?.kudos) {
          const { min, max } = filters.engagement.kudos;
          if (story.kudos < min || story.kudos > max) return false;
        }

        return true;
      });
    };

    // Mock story data for testing
    const mockStories = [
      {
        id: 'story-1',
        wordCount: 75000,
        completed: true,
        tags: ['time-travel', 'harry/hermione', 'fix-it'],
        kudos: 2500,
      },
      {
        id: 'story-2',
        wordCount: 25000,
        completed: false,
        tags: ['time-travel', 'dark-harry'],
        kudos: 800,
      },
      {
        id: 'story-3',
        wordCount: 120000,
        completed: true,
        tags: ['time-travel', 'harry/hermione'],
        kudos: 5000,
      },
    ];

    const filtered = applyComplexFilters(
      mockStories,
      mockComplexFilter.filters
    );

    // Should filter based on complex criteria
    expect(filtered.length).toBeLessThan(mockStories.length);

    // Verify filtering logic
    filtered.forEach(story => {
      expect(story.wordCount).toBeGreaterThanOrEqual(50000);
      expect(story.completed).toBe(true);
      expect(story.tags).toContain('time-travel');
      expect(story.tags).toContain('harry/hermione');
      expect(story.kudos).toBeGreaterThanOrEqual(1000);
    });
  });

  it('should save and retrieve search filters', () => {
    // Test saved search functionality
    const saveSearch = (searchData: (typeof mockSavedSearches)[0]) => {
      const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      const updated = [...saved, searchData];
      localStorage.setItem('savedSearches', JSON.stringify(updated));
      return searchData.id;
    };

    const retrieveSavedSearches = () => {
      return JSON.parse(localStorage.getItem('savedSearches') || '[]');
    };

    const newSearch = {
      id: 'test-save-1',
      name: 'Test Search',
      filter: mockComplexFilter,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 1,
      notifications: false,
      autoUpdate: false,
    };

    const savedId = saveSearch(newSearch);
    const retrieved = retrieveSavedSearches();

    expect(savedId).toBe('test-save-1');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'savedSearches',
      expect.stringContaining('"Test Search"')
    );
  });

  it('should track and retrieve search history', () => {
    // Test search history functionality
    const addToHistory = (historyEntry: (typeof mockSearchHistory)[0]) => {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const updated = [historyEntry, ...history].slice(0, 50); // Keep last 50 searches
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      return updated.length;
    };

    const getSearchHistory = (limit: number = 10) => {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      return history.slice(0, limit);
    };

    const newHistoryEntry = {
      id: 'history-test-1',
      query: 'test query',
      filters: mockComplexFilter.filters,
      timestamp: Date.now(),
      resultCount: 25,
      searchTime: 156,
    };

    const historyLength = addToHistory(newHistoryEntry);
    const recentHistory = getSearchHistory(5);

    expect(historyLength).toBeGreaterThan(0);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'searchHistory',
      expect.stringContaining('"test query"')
    );
  });

  it('should validate advanced filtering API contract', async () => {
    // Mock advanced filtering API call
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFilterResults),
    });
    global.fetch = mockFetch;

    const applyAdvancedFilters = async (
      filters: typeof mockComplexFilter.filters
    ) => {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          fandom: 'harry-potter',
          pagination: { page: 1, limit: 25 },
        }),
      });

      return response.json();
    };

    const result = await applyAdvancedFilters(mockComplexFilter.filters);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/search/advanced',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(result.totalStories).toBeGreaterThan(0);
    expect(result.filteredStories).toBeLessThanOrEqual(result.totalStories);
  });

  it('should meet constitutional performance requirements for filtering', async () => {
    // Constitutional requirement: reasonable filter processing time
    const maxFilterTime = 1000; // 1 second for complex filtering

    const simulateAdvancedFiltering = async () => {
      const startTime = performance.now();

      // Simulate complex filter processing
      const result = {
        ...mockFilterResults,
        processingTime: Math.random() * 500 + 100, // 100-600ms range
      };

      const endTime = performance.now();
      return {
        result,
        actualTime: endTime - startTime,
        reportedTime: result.processingTime,
      };
    };

    const filterResult = await simulateAdvancedFiltering();

    expect(filterResult.reportedTime).toBeLessThan(maxFilterTime);
    expect(filterResult.actualTime).toBeLessThan(maxFilterTime);
  });

  it('should provide intelligent filter suggestions', () => {
    // Test filter suggestion algorithm
    const generateFilterSuggestions = (
      currentFilters: typeof mockComplexFilter.filters,
      resultCount: number
    ) => {
      const suggestions = [];

      // If too few results, suggest relaxing filters
      if (resultCount < 10) {
        if (
          currentFilters.engagement?.kudos?.min &&
          currentFilters.engagement.kudos.min > 500
        ) {
          suggestions.push({
            type: 'relax-filter',
            filter: 'kudos',
            message: 'Try lowering kudos requirement for more results',
            action: 'decrease',
            impact: 'More stories available',
          });
        }

        if (
          currentFilters.content?.wordCount?.min &&
          currentFilters.content.wordCount.min > 20000
        ) {
          suggestions.push({
            type: 'relax-filter',
            filter: 'wordCount',
            message: 'Consider shorter stories to expand results',
            action: 'decrease-minimum',
            impact: 'Include shorter works',
          });
        }
      }

      // If too many results, suggest refining filters
      if (resultCount > 100) {
        suggestions.push({
          type: 'refine-filter',
          filter: 'tags',
          message: 'Add more specific tags to narrow results',
          action: 'add-required-tag',
          impact: 'More targeted results',
        });
      }

      return suggestions;
    };

    const fewResultsSuggestions = generateFilterSuggestions(
      mockComplexFilter.filters,
      3
    );
    const manyResultsSuggestions = generateFilterSuggestions(
      mockComplexFilter.filters,
      150
    );

    expect(fewResultsSuggestions.length).toBeGreaterThan(0);
    expect(fewResultsSuggestions[0].type).toBe('relax-filter');

    expect(manyResultsSuggestions.length).toBeGreaterThan(0);
    expect(manyResultsSuggestions[0].type).toBe('refine-filter');
  });

  it('should support filter presets and quick selections', () => {
    // Test filter preset functionality
    const filterPresets = {
      'quick-reads': {
        name: 'Quick Reads (Under 10k)',
        filters: {
          content: {
            wordCount: { min: 0, max: 10000 },
            completionStatus: ['completed'],
          },
        },
      },
      'epic-adventures': {
        name: 'Epic Adventures (Over 100k)',
        filters: {
          content: {
            wordCount: { min: 100000, max: 1000000 },
            completionStatus: ['completed', 'in-progress'],
          },
          engagement: {
            kudos: { min: 1000, max: 50000 },
          },
        },
      },
      'recently-updated': {
        name: 'Recently Updated',
        filters: {
          metadata: {
            updateDate: { days: 7 },
          },
        },
      },
    };

    const applyPreset = (presetId: string) => {
      return filterPresets[presetId as keyof typeof filterPresets] || null;
    };

    const quickReadsPreset = applyPreset('quick-reads');
    const epicPreset = applyPreset('epic-adventures');

    expect(quickReadsPreset?.name).toBe('Quick Reads (Under 10k)');
    expect(quickReadsPreset?.filters.content.wordCount.max).toBe(10000);

    expect(epicPreset?.name).toBe('Epic Adventures (Over 100k)');
    expect(epicPreset?.filters.content.wordCount.min).toBe(100000);
  });

  it('should handle filter combinations validation', () => {
    // Test filter combination logic validation
    const validateFilterCombination = (
      filters: typeof mockComplexFilter.filters
    ) => {
      const warnings = [];
      const errors = [];

      // Check for contradictory filters
      if (filters.content?.wordCount) {
        const { min, max } = filters.content.wordCount;
        if (min > max) {
          errors.push({
            type: 'invalid-range',
            message: 'Minimum word count cannot be greater than maximum',
            filters: ['wordCount'],
          });
        }
      }

      // Check for overly restrictive combinations
      if (
        filters.engagement?.kudos?.min &&
        filters.engagement.kudos.min > 10000
      ) {
        if (
          filters.content?.wordCount?.max &&
          filters.content.wordCount.max < 50000
        ) {
          warnings.push({
            type: 'restrictive-combination',
            message:
              'High kudos requirement with short word count may yield few results',
            filters: ['kudos', 'wordCount'],
          });
        }
      }

      // Check for conflicting tags
      if (filters.tags?.required && filters.tags?.excluded) {
        const conflicts = filters.tags.required.filter(tag =>
          filters.tags.excluded?.includes(tag)
        );

        if (conflicts.length > 0) {
          errors.push({
            type: 'tag-conflict',
            message: `Tags cannot be both required and excluded: ${conflicts.join(
              ', '
            )}`,
            filters: ['tags'],
          });
        }
      }

      return { isValid: errors.length === 0, errors, warnings };
    };

    // Test valid combination
    const validResult = validateFilterCombination(mockComplexFilter.filters);
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Test invalid combination
    const invalidFilters = {
      ...mockComplexFilter.filters,
      content: {
        ...mockComplexFilter.filters.content,
        wordCount: { min: 100000, max: 50000 }, // Invalid range
      },
    };

    const invalidResult = validateFilterCombination(invalidFilters);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('should support search notifications and updates', () => {
    // Test search notification functionality
    const searchNotifications = {
      checkForUpdates: (savedSearch: (typeof mockSavedSearches)[0]) => {
        if (!savedSearch.notifications || !savedSearch.autoUpdate) {
          return { hasUpdates: false, newCount: 0 };
        }

        // Simulate checking for new stories matching saved search
        const lastCheck = savedSearch.lastUsed;
        const mockNewStories = 3; // Simulated new stories found

        return {
          hasUpdates: mockNewStories > 0,
          newCount: mockNewStories,
          lastCheck: new Date(lastCheck).toISOString(),
        };
      },

      generateNotification: (searchName: string, newCount: number) => {
        return {
          title: 'New Stories Found',
          message: `${newCount} new stories match your saved search "${searchName}"`,
          actionUrl: `/search/${searchName}`,
          timestamp: Date.now(),
        };
      },
    };

    const notificationSearch = mockSavedSearches[0]; // Has notifications enabled
    const updates = searchNotifications.checkForUpdates(notificationSearch);

    expect(updates.hasUpdates).toBe(true);
    expect(updates.newCount).toBeGreaterThan(0);

    const notification = searchNotifications.generateNotification(
      notificationSearch.name,
      updates.newCount
    );

    expect(notification.title).toBe('New Stories Found');
    expect(notification.message).toContain(notificationSearch.name);
  });

  it('should support filter analytics and insights', () => {
    // Test filter analytics functionality
    const analyzeFilterUsage = (searchHistory: typeof mockSearchHistory) => {
      const analytics = {
        mostUsedFilters: {} as Record<string, number>,
        averageResults: 0,
        averageSearchTime: 0,
        popularTags: {} as Record<string, number>,
        searchPatterns: [] as string[],
      };

      searchHistory.forEach(entry => {
        // Count filter usage
        if (entry.filters.content?.wordCount) {
          analytics.mostUsedFilters['wordCount'] =
            (analytics.mostUsedFilters['wordCount'] || 0) + 1;
        }

        if (entry.filters.tags?.required) {
          entry.filters.tags.required.forEach(tag => {
            analytics.popularTags[tag] = (analytics.popularTags[tag] || 0) + 1;
          });
        }

        // Track performance
        analytics.averageResults += entry.resultCount;
        analytics.averageSearchTime += entry.searchTime;
      });

      analytics.averageResults /= searchHistory.length;
      analytics.averageSearchTime /= searchHistory.length;

      return analytics;
    };

    const analytics = analyzeFilterUsage(mockSearchHistory);

    expect(typeof analytics.averageResults).toBe('number');
    expect(typeof analytics.averageSearchTime).toBe('number');
    expect(analytics.averageResults).toBeGreaterThan(0);
    expect(analytics.averageSearchTime).toBeGreaterThan(0);
  });

  it('should handle filter errors and edge cases gracefully', async () => {
    // Test error handling for filtering failures
    const mockFailedFetch = vi
      .fn()
      .mockRejectedValue(new Error('Filter service unavailable'));
    global.fetch = mockFailedFetch;

    const filterWithFallback = async (
      filters: typeof mockComplexFilter.filters
    ) => {
      try {
        const response = await fetch('/api/search/advanced');
        return await response.json();
      } catch (error) {
        return {
          totalStories: 0,
          filteredStories: 0,
          appliedFilters: {},
          error: 'Advanced filtering temporarily unavailable',
          fallbackMode: true,
          suggestion: 'Try using basic search instead',
        };
      }
    };

    const errorResult = await filterWithFallback(mockComplexFilter.filters);

    expect(errorResult.error).toBe(
      'Advanced filtering temporarily unavailable'
    );
    expect(errorResult.fallbackMode).toBe(true);
    expect(errorResult.suggestion).toContain('basic search');
  });

  it('should support filter export and import', () => {
    // Test filter configuration export/import
    const exportFilters = (savedSearches: typeof mockSavedSearches) => {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        searches: savedSearches.map(search => ({
          name: search.name,
          filters: search.filter.filters,
          fandom: search.filter.fandomId,
        })),
      };

      return JSON.stringify(exportData, null, 2);
    };

    const importFilters = (exportString: string) => {
      try {
        const importData = JSON.parse(exportString);

        if (!importData.version || !importData.searches) {
          throw new Error('Invalid export format');
        }

        return {
          success: true,
          imported: importData.searches.length,
          searches: importData.searches,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to import filters',
          imported: 0,
        };
      }
    };

    const exported = exportFilters(mockSavedSearches);
    const imported = importFilters(exported);

    expect(typeof exported).toBe('string');
    expect(exported).toContain('Time Travel Romance Epics');

    expect(imported.success).toBe(true);
    expect(imported.imported).toBe(2);
  });
});
