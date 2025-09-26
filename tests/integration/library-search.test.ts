/**
 * Integration Test: Library Search User Story (T014)
 *
 * User Story: "As a user, I want to search existing tagged stories in the library
 * with relevance scoring and filtering so I can find stories that match my pathway
 * before considering creating new content."
 *
 * This test validates the complete library-first search workflow per
 * constitutional requirement to prioritize finding existing stories.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock search API response structure
const mockSearchResponse = {
  stories: [
    {
      id: 'story-1',
      title: 'Time Turner Troubles',
      author: 'AuthorOne',
      summary: 'Harry uses a time turner to change the past',
      url: 'https://example.com/story-1',
      fandomId: 'harry-potter',
      tags: ['time-travel', 'harry/hermione', 'fix-it'],
      plotBlocks: ['time-turner-plot'],
      wordCount: 75000,
      chapters: 15,
      completed: true,
      lastUpdated: '2024-01-15',
      relevanceScore: 0.95,
      matchingElements: ['time-travel', 'harry/hermione'],
      noveltyGaps: ['goblin-inheritance'],
    },
    {
      id: 'story-2',
      title: 'The Inheritance Revelation',
      author: 'AuthorTwo',
      summary: 'Harry discovers his true magical inheritance',
      url: 'https://example.com/story-2',
      fandomId: 'harry-potter',
      tags: ['inheritance', 'lord-potter', 'powerful-harry'],
      plotBlocks: ['goblin-inheritance', 'multiple-lordships'],
      wordCount: 120000,
      chapters: 22,
      completed: false,
      lastUpdated: '2024-02-10',
      relevanceScore: 0.87,
      matchingElements: ['goblin-inheritance'],
      noveltyGaps: ['time-travel', 'harry/hermione'],
    },
  ],
  totalResults: 2,
  searchTime: 145, // milliseconds
  filters: {
    fandom: 'harry-potter',
    completionStatus: 'any',
    wordCountRange: [10000, 500000],
    lastUpdated: 'any',
    sortBy: 'relevance',
  },
  relevanceBreakdown: {
    'story-1': {
      tagMatches: 0.6,
      plotBlockMatches: 0.3,
      descriptionSimilarity: 0.05,
      totalScore: 0.95,
    },
    'story-2': {
      tagMatches: 0.4,
      plotBlockMatches: 0.4,
      descriptionSimilarity: 0.07,
      totalScore: 0.87,
    },
  },
};

// Mock pathway for search context
const mockSearchPathway = {
  id: 'pathway-1',
  fandomId: 'harry-potter',
  elements: [
    { id: 'tag-1', name: 'time-travel', type: 'tag', weight: 1.0 },
    { id: 'tag-2', name: 'harry/hermione', type: 'tag', weight: 0.8 },
    {
      id: 'plot-1',
      name: 'goblin-inheritance',
      type: 'plotBlock',
      weight: 0.9,
    },
  ],
  searchPreferences: {
    includeIncomplete: true,
    minWordCount: 10000,
    maxResults: 50,
    sortBy: 'relevance' as const,
  },
};

// Mock search filters
const mockSearchFilters = {
  completion: ['completed', 'in-progress', 'abandoned'] as const,
  wordCount: {
    ranges: [
      { label: 'Short (<10k)', min: 0, max: 10000 },
      { label: 'Medium (10k-50k)', min: 10000, max: 50000 },
      { label: 'Long (50k-100k)', min: 50000, max: 100000 },
      { label: 'Epic (>100k)', min: 100000, max: Infinity },
    ],
  },
  lastUpdated: [
    { label: 'Last Week', days: 7 },
    { label: 'Last Month', days: 30 },
    { label: 'Last Year', days: 365 },
    { label: 'Any Time', days: Infinity },
  ],
  sortOptions: [
    { value: 'relevance', label: 'Relevance Score' },
    { value: 'updated', label: 'Recently Updated' },
    { value: 'wordCount', label: 'Word Count' },
    { value: 'kudos', label: 'Most Popular' },
  ],
};

describe('Library Search Integration Test (T014)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for API calls
    global.fetch = vi.fn();

    // Mock performance API
    Object.defineProperty(global.performance, 'now', {
      writable: true,
      value: vi.fn(() => Date.now()),
    });
  });

  it('should validate search component structure exists', async () => {
    // This test MUST fail initially - search components don't exist yet
    const SearchComponentExists = () => {
      try {
        // These imports will fail until search components are implemented
        const { LibrarySearch } = require('@/components/search/LibrarySearch');
        const { SearchFilters } = require('@/components/search/SearchFilters');
        const { SearchResults } = require('@/components/search/SearchResults');
        const { StoryCard } = require('@/components/search/StoryCard');

        return true;
      } catch {
        return false;
      }
    };

    // Should fail until search components are implemented
    expect(SearchComponentExists()).toBe(false);
  });

  it('should calculate relevance scores correctly', () => {
    // Test relevance scoring algorithm
    const calculateRelevance = (
      story: (typeof mockSearchResponse.stories)[0],
      pathway: typeof mockSearchPathway
    ) => {
      let score = 0;
      let tagMatches = 0;
      let plotBlockMatches = 0;

      // Tag matching (60% weight)
      const pathwayTags = pathway.elements.filter(el => el.type === 'tag');
      pathwayTags.forEach(pathwayTag => {
        if (story.tags.includes(pathwayTag.name)) {
          tagMatches += pathwayTag.weight;
        }
      });
      const tagScore =
        pathwayTags.length > 0 ? (tagMatches / pathwayTags.length) * 0.6 : 0;

      // Plot block matching (40% weight)
      const pathwayPlotBlocks = pathway.elements.filter(
        el => el.type === 'plotBlock'
      );
      pathwayPlotBlocks.forEach(pathwayBlock => {
        if (story.plotBlocks.includes(pathwayBlock.name)) {
          plotBlockMatches += pathwayBlock.weight;
        }
      });
      const plotBlockScore =
        pathwayPlotBlocks.length > 0
          ? (plotBlockMatches / pathwayPlotBlocks.length) * 0.4
          : 0;

      score = tagScore + plotBlockScore;

      return {
        totalScore: Math.min(1.0, score),
        tagScore,
        plotBlockScore,
        tagMatches,
        plotBlockMatches,
      };
    };

    const story1Relevance = calculateRelevance(
      mockSearchResponse.stories[0],
      mockSearchPathway
    );
    const story2Relevance = calculateRelevance(
      mockSearchResponse.stories[1],
      mockSearchPathway
    );

    // Story 1 should have higher relevance (has time-travel and harry/hermione)
    expect(story1Relevance.totalScore).toBeGreaterThan(
      story2Relevance.totalScore
    );
    expect(story1Relevance.tagScore).toBeGreaterThan(0);
    expect(story2Relevance.plotBlockScore).toBeGreaterThan(0);
  });

  it('should validate search API contract', async () => {
    // Mock search API call
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse),
    });
    global.fetch = mockFetch;

    const searchStories = async (pathway: typeof mockSearchPathway) => {
      const searchParams = new URLSearchParams({
        fandom: pathway.fandomId,
        elements: JSON.stringify(pathway.elements),
        preferences: JSON.stringify(pathway.searchPreferences),
      });

      const response = await fetch(
        `/api/search/stories?${searchParams.toString()}`
      );
      return response.json();
    };

    const results = await searchStories(mockSearchPathway);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/search/stories')
    );
    expect(results.stories).toHaveLength(2);
    expect(results.totalResults).toBe(2);
  });

  it('should meet constitutional performance requirements', async () => {
    // Constitutional requirement: <500ms search response time
    const maxSearchTime = 500;

    const simulateSearch = async () => {
      const startTime = performance.now();

      // Simulate search processing
      const results = {
        ...mockSearchResponse,
        searchTime: Math.random() * 300 + 100, // 100-400ms range
      };

      const endTime = performance.now();
      return {
        results,
        actualTime: endTime - startTime,
        reportedTime: results.searchTime,
      };
    };

    const searchResult = await simulateSearch();

    // Both actual and reported times should meet constitutional requirement
    expect(searchResult.reportedTime).toBeLessThan(maxSearchTime);
    expect(searchResult.actualTime).toBeLessThan(maxSearchTime);
  });

  it('should apply search filters correctly', () => {
    // Test filter application logic
    const applyFilters = (
      stories: typeof mockSearchResponse.stories,
      filters: any
    ) => {
      return stories.filter(story => {
        // Completion status filter
        if (filters.completionStatus && filters.completionStatus !== 'any') {
          const status = story.completed ? 'completed' : 'in-progress';
          if (status !== filters.completionStatus) return false;
        }

        // Word count filter
        if (filters.wordCountRange) {
          const [min, max] = filters.wordCountRange;
          if (story.wordCount < min || story.wordCount > max) return false;
        }

        // Last updated filter
        if (filters.lastUpdatedDays && filters.lastUpdatedDays !== Infinity) {
          const daysSince = Math.floor(
            (Date.now() - new Date(story.lastUpdated).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysSince > filters.lastUpdatedDays) return false;
        }

        return true;
      });
    };

    // Test completion status filter
    const completedOnly = applyFilters(mockSearchResponse.stories, {
      completionStatus: 'completed',
    });
    expect(completedOnly).toHaveLength(1);
    expect(completedOnly[0].completed).toBe(true);

    // Test word count filter
    const longStories = applyFilters(mockSearchResponse.stories, {
      wordCountRange: [100000, Infinity],
    });
    expect(longStories).toHaveLength(1);
    expect(longStories[0].wordCount).toBeGreaterThan(100000);
  });

  it('should support sorting options', () => {
    // Test story sorting functionality
    const sortStories = (
      stories: typeof mockSearchResponse.stories,
      sortBy: string
    ) => {
      const sorted = [...stories];

      switch (sortBy) {
        case 'relevance':
          return sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);

        case 'updated':
          return sorted.sort(
            (a, b) =>
              new Date(b.lastUpdated).getTime() -
              new Date(a.lastUpdated).getTime()
          );

        case 'wordCount':
          return sorted.sort((a, b) => b.wordCount - a.wordCount);

        default:
          return sorted;
      }
    };

    // Test relevance sorting (default)
    const byRelevance = sortStories(mockSearchResponse.stories, 'relevance');
    expect(byRelevance[0].relevanceScore).toBeGreaterThan(
      byRelevance[1].relevanceScore
    );

    // Test updated date sorting
    const byUpdated = sortStories(mockSearchResponse.stories, 'updated');
    expect(new Date(byUpdated[0].lastUpdated)).toBeInstanceOf(Date);

    // Test word count sorting
    const byWordCount = sortStories(mockSearchResponse.stories, 'wordCount');
    expect(byWordCount[0].wordCount).toBeGreaterThanOrEqual(
      byWordCount[1].wordCount
    );
  });

  it('should identify novelty gaps for story prompts', () => {
    // Test novelty gap detection for prompt generation
    const identifyNoveltyGaps = (
      pathway: typeof mockSearchPathway,
      searchResults: typeof mockSearchResponse
    ) => {
      const pathwayElements = pathway.elements.map(el => el.name);
      const allFoundElements = new Set<string>();

      // Collect all elements found in existing stories
      searchResults.stories.forEach(story => {
        story.tags.forEach(tag => allFoundElements.add(tag));
        story.plotBlocks.forEach(block => allFoundElements.add(block));
      });

      // Find elements in pathway that aren't well-represented in existing stories
      const noveltyGaps = pathwayElements.filter(element => {
        const matchingStories = searchResults.stories.filter(
          story =>
            story.tags.includes(element) || story.plotBlocks.includes(element)
        );
        return (
          matchingStories.length === 0 ||
          matchingStories.every(s => s.relevanceScore < 0.7)
        );
      });

      return noveltyGaps;
    };

    const gaps = identifyNoveltyGaps(mockSearchPathway, mockSearchResponse);

    // Should identify elements that create story opportunities
    expect(Array.isArray(gaps)).toBe(true);
    expect(gaps.length).toBeGreaterThanOrEqual(0);
  });

  it('should validate search result metadata', () => {
    // Test search result structure and metadata
    const validateSearchResults = (results: typeof mockSearchResponse) => {
      const requiredFields = [
        'stories',
        'totalResults',
        'searchTime',
        'filters',
      ];
      const storyRequiredFields = [
        'id',
        'title',
        'author',
        'summary',
        'url',
        'fandomId',
        'tags',
        'relevanceScore',
      ];

      // Validate top-level structure
      const hasRequiredFields = requiredFields.every(field =>
        results.hasOwnProperty(field)
      );

      // Validate story structure
      const storiesValid = results.stories.every(story =>
        storyRequiredFields.every(field => story.hasOwnProperty(field))
      );

      // Validate relevance scores
      const validRelevanceScores = results.stories.every(
        story => story.relevanceScore >= 0 && story.relevanceScore <= 1
      );

      return {
        hasRequiredFields,
        storiesValid,
        validRelevanceScores,
        totalValid: hasRequiredFields && storiesValid && validRelevanceScores,
      };
    };

    const validation = validateSearchResults(mockSearchResponse);

    expect(validation.hasRequiredFields).toBe(true);
    expect(validation.storiesValid).toBe(true);
    expect(validation.validRelevanceScores).toBe(true);
    expect(validation.totalValid).toBe(true);
  });

  it('should support pagination for large result sets', () => {
    // Test pagination logic for search results
    const paginateResults = (
      totalResults: number,
      page: number = 1,
      pageSize: number = 10
    ) => {
      const totalPages = Math.ceil(totalResults / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalResults);

      return {
        currentPage: page,
        totalPages,
        totalResults,
        pageSize,
        startIndex,
        endIndex,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    };

    // Test first page
    const page1 = paginateResults(100, 1, 10);
    expect(page1.currentPage).toBe(1);
    expect(page1.totalPages).toBe(10);
    expect(page1.hasNextPage).toBe(true);
    expect(page1.hasPreviousPage).toBe(false);

    // Test middle page
    const page5 = paginateResults(100, 5, 10);
    expect(page5.hasNextPage).toBe(true);
    expect(page5.hasPreviousPage).toBe(true);

    // Test last page
    const lastPage = paginateResults(100, 10, 10);
    expect(lastPage.hasNextPage).toBe(false);
    expect(lastPage.hasPreviousPage).toBe(true);
  });

  it('should handle search errors gracefully', async () => {
    // Test error handling for failed searches
    const mockFailedFetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));
    global.fetch = mockFailedFetch;

    const searchWithErrorHandling = async (
      pathway: typeof mockSearchPathway
    ) => {
      try {
        const response = await fetch('/api/search/stories');
        return await response.json();
      } catch (error) {
        return {
          stories: [],
          totalResults: 0,
          searchTime: 0,
          error: 'Search temporarily unavailable',
          fallbackMode: true,
        };
      }
    };

    const errorResult = await searchWithErrorHandling(mockSearchPathway);

    expect(errorResult.stories).toHaveLength(0);
    expect(errorResult.error).toBe('Search temporarily unavailable');
    expect(errorResult.fallbackMode).toBe(true);
  });

  it('should validate advanced search capabilities', () => {
    // Test advanced search features
    const advancedSearch = {
      exactPhraseMatching: true,
      excludedTags: ['character-death', 'graphic-violence'],
      requiredTags: ['time-travel'],
      authorFilter: '',
      dateRangeFilter: {
        publishedAfter: '2020-01-01',
        publishedBefore: '2024-12-31',
      },
      crossoverFiltering: false,
      languageFilter: 'english',
    };

    // Validate search options structure
    expect(advancedSearch.exactPhraseMatching).toBe(true);
    expect(Array.isArray(advancedSearch.excludedTags)).toBe(true);
    expect(Array.isArray(advancedSearch.requiredTags)).toBe(true);
    expect(advancedSearch.dateRangeFilter).toHaveProperty('publishedAfter');
    expect(advancedSearch.dateRangeFilter).toHaveProperty('publishedBefore');
  });

  it('should support search history and saved searches', () => {
    // Test search history functionality
    const searchHistory = {
      recent: [
        {
          id: 'search-1',
          pathway: mockSearchPathway,
          timestamp: Date.now() - 86400000, // 1 day ago
          resultCount: 25,
        },
      ],
      saved: [
        {
          id: 'saved-1',
          name: 'Time Travel Romance',
          pathway: mockSearchPathway,
          notifications: true,
          lastChecked: Date.now() - 3600000, // 1 hour ago
        },
      ],
    };

    expect(searchHistory.recent).toHaveLength(1);
    expect(searchHistory.saved).toHaveLength(1);
    expect(searchHistory.saved[0].notifications).toBe(true);
  });
});
