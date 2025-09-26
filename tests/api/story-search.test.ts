/**
 * Contract Test: POST /api/v1/discovery/search/stories
 *
 * Purpose: Validate API contract for library-first story search with relevance scoring
 * Status: MUST FAIL - No implementation exists yet (TDD requirement)
 */

import { describe, it, expect } from 'vitest';

describe('POST /api/v1/discovery/search/stories - Contract Test', () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const endpoint = `${baseURL}/api/v1/discovery/search/stories`;

  const searchRequest = {
    pathway: {
      fandomId: 'harry-potter-uuid',
      tags: ['harry-potter', 'time-travel', 'angst'],
      plotBlocks: ['goblin-inheritance'],
    },
    filters: {
      wordCountMin: 50000,
      status: 'complete',
      sortBy: 'relevance',
      page: 1,
      limit: 20,
    },
  };

  it('should return stories with relevance scoring', async () => {
    // This test MUST fail initially - no endpoint exists yet
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const data = await response.json();

    // Validate response schema per API contract
    expect(data).toHaveProperty('stories');
    expect(data).toHaveProperty('pagination');
    expect(data).toHaveProperty('searchTime');
    expect(data).toHaveProperty('totalMatches');
    expect(Array.isArray(data.stories)).toBe(true);

    // Validate story object schema
    if (data.stories.length > 0) {
      const story = data.stories[0];
      expect(story).toHaveProperty('id');
      expect(story).toHaveProperty('title');
      expect(story).toHaveProperty('author');
      expect(story).toHaveProperty('summary');
      expect(story).toHaveProperty('wordCount');
      expect(story).toHaveProperty('status');
      expect(story).toHaveProperty('relevanceScore');
      expect(story).toHaveProperty('matchedTags');
      expect(story).toHaveProperty('matchedPlotBlocks');

      expect(typeof story.id).toBe('string');
      expect(typeof story.title).toBe('string');
      expect(typeof story.author).toBe('string');
      expect(typeof story.summary).toBe('string');
      expect(typeof story.wordCount).toBe('number');
      expect(typeof story.status).toBe('string');
      expect(typeof story.relevanceScore).toBe('number');
      expect(story.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(story.relevanceScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(story.matchedTags)).toBe(true);
      expect(Array.isArray(story.matchedPlotBlocks)).toBe(true);
    }
  });

  it('should prioritize library-first search results', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    });

    const data = await response.json();

    // Results should be sorted by relevance score descending
    if (data.stories.length > 1) {
      for (let i = 1; i < data.stories.length; i++) {
        expect(data.stories[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          data.stories[i].relevanceScore
        );
      }
    }

    // Should include library search metadata
    expect(data).toHaveProperty('searchType');
    expect(data.searchType).toBe('library-first');
  });

  it('should respond within 500ms per constitutional requirement', async () => {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    });
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(500);
    expect(response.status).toBeLessThan(500);

    // Response should include actual search time
    const data = await response.json();
    if (response.status === 200) {
      expect(typeof data.searchTime).toBe('number');
      expect(data.searchTime).toBeLessThan(500);
    }
  });

  it('should support advanced filtering', async () => {
    const advancedFilters = {
      pathway: searchRequest.pathway,
      filters: {
        ...searchRequest.filters,
        rating: 'T',
        language: 'en',
        lastUpdated: '2024-01-01',
        tags: ['completed', 'beta-read'],
        excludeTags: ['major-character-death'],
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(advancedFilters),
    });

    const data = await response.json();

    if (response.status === 200 && data.stories.length > 0) {
      // Validate filters were applied
      data.stories.forEach((story: any) => {
        if (story.rating) {
          expect(story.rating).toBe('T');
        }
        if (story.language) {
          expect(story.language).toBe('en');
        }
        if (story.wordCount) {
          expect(story.wordCount).toBeGreaterThanOrEqual(50000);
        }
      });
    }
  });

  it('should handle empty search results gracefully', async () => {
    const uniqueSearch = {
      pathway: {
        fandomId: 'harry-potter-uuid',
        tags: ['extremely-rare-tag', 'another-rare-tag'],
        plotBlocks: ['non-existent-plot-block'],
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uniqueSearch),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.stories).toEqual([]);
    expect(data.totalMatches).toBe(0);
    expect(data).toHaveProperty('suggestions');
    // Should provide suggestions for story creation
    expect(data.suggestions).toHaveProperty('createNewStory');
    expect(data.suggestions.createNewStory).toHaveProperty('noveltyAspects');
  });

  it('should support pagination for large result sets', async () => {
    const paginatedSearch = {
      ...searchRequest,
      filters: {
        ...searchRequest.filters,
        page: 2,
        limit: 10,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paginatedSearch),
    });

    const data = await response.json();

    if (response.status === 200) {
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('hasNext');
      expect(data.pagination).toHaveProperty('hasPrev');
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
    }
  });

  it('should validate request format', async () => {
    const invalidRequest = { invalid: 'data' };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('validation');
  });

  it('should include search performance metrics', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    });

    const data = await response.json();

    if (response.status === 200) {
      expect(data).toHaveProperty('performance');
      expect(data.performance).toHaveProperty('databaseQueryTime');
      expect(data.performance).toHaveProperty('relevanceCalculationTime');
      expect(data.performance).toHaveProperty('totalProcessingTime');

      expect(typeof data.performance.databaseQueryTime).toBe('number');
      expect(typeof data.performance.relevanceCalculationTime).toBe('number');
      expect(typeof data.performance.totalProcessingTime).toBe('number');
    }
  });
});
