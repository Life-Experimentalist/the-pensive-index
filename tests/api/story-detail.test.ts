/**
 * Contract Test: GET /api/v1/discovery/stories/{id}
 *
 * Purpose: Validate API contract for retrieving story details with metadata
 * Status: MUST FAIL - No implementation exists yet (TDD requirement)
 */

import { describe, it, expect } from 'vitest';

describe('GET /api/v1/discovery/stories/{id} - Contract Test', () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const testStoryId = 'test-story-uuid';
  const endpoint = `${baseURL}/api/v1/discovery/stories/${testStoryId}`;

  it('should return story details with complete metadata', async () => {
    // This test MUST fail initially - no endpoint exists yet
    const response = await fetch(endpoint);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const data = await response.json();

    // Validate response schema per API contract
    expect(data).toHaveProperty('story');
    const story = data.story;

    expect(story).toHaveProperty('id');
    expect(story).toHaveProperty('title');
    expect(story).toHaveProperty('author');
    expect(story).toHaveProperty('summary');
    expect(story).toHaveProperty('wordCount');
    expect(story).toHaveProperty('chapterCount');
    expect(story).toHaveProperty('status');
    expect(story).toHaveProperty('rating');
    expect(story).toHaveProperty('language');
    expect(story).toHaveProperty('publishedAt');
    expect(story).toHaveProperty('updatedAt');
    expect(story).toHaveProperty('tags');
    expect(story).toHaveProperty('plotBlocks');
    expect(story).toHaveProperty('externalUrl');

    expect(typeof story.id).toBe('string');
    expect(typeof story.title).toBe('string');
    expect(typeof story.author).toBe('string');
    expect(typeof story.summary).toBe('string');
    expect(typeof story.wordCount).toBe('number');
    expect(typeof story.chapterCount).toBe('number');
    expect(typeof story.status).toBe('string');
    expect(typeof story.rating).toBe('string');
    expect(typeof story.language).toBe('string');
    expect(typeof story.publishedAt).toBe('string');
    expect(typeof story.updatedAt).toBe('string');
    expect(Array.isArray(story.tags)).toBe(true);
    expect(Array.isArray(story.plotBlocks)).toBe(true);
    expect(typeof story.externalUrl).toBe('string');
  });

  it('should include fandom information', async () => {
    const response = await fetch(endpoint);

    const data = await response.json();

    if (response.status === 200) {
      expect(data).toHaveProperty('fandom');
      const fandom = data.fandom;

      expect(fandom).toHaveProperty('id');
      expect(fandom).toHaveProperty('name');
      expect(fandom).toHaveProperty('slug');

      expect(typeof fandom.id).toBe('string');
      expect(typeof fandom.name).toBe('string');
      expect(typeof fandom.slug).toBe('string');
    }
  });

  it('should include tag and plot block details', async () => {
    const response = await fetch(endpoint);

    const data = await response.json();

    if (response.status === 200) {
      // Tag details with full information
      if (data.story.tags.length > 0) {
        const tag = data.story.tags[0];
        expect(tag).toHaveProperty('id');
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('category');
        expect(tag).toHaveProperty('description');
      }

      // Plot block details with hierarchy
      if (data.story.plotBlocks.length > 0) {
        const plotBlock = data.story.plotBlocks[0];
        expect(plotBlock).toHaveProperty('id');
        expect(plotBlock).toHaveProperty('name');
        expect(plotBlock).toHaveProperty('description');
        expect(plotBlock).toHaveProperty('parentId');
      }
    }
  });

  it('should include SEO metadata for sharing', async () => {
    const response = await fetch(endpoint);

    const data = await response.json();

    if (response.status === 200) {
      expect(data).toHaveProperty('metadata');
      const metadata = data.metadata;

      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('ogTitle');
      expect(metadata).toHaveProperty('ogDescription');
      expect(metadata).toHaveProperty('ogImage');
      expect(metadata).toHaveProperty('canonicalUrl');

      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.description).toBe('string');
      expect(typeof metadata.ogTitle).toBe('string');
      expect(typeof metadata.ogDescription).toBe('string');
      expect(typeof metadata.canonicalUrl).toBe('string');
    }
  });

  it('should include related stories suggestions', async () => {
    const response = await fetch(endpoint);

    const data = await response.json();

    if (response.status === 200) {
      expect(data).toHaveProperty('relatedStories');
      expect(Array.isArray(data.relatedStories)).toBe(true);

      if (data.relatedStories.length > 0) {
        const relatedStory = data.relatedStories[0];
        expect(relatedStory).toHaveProperty('id');
        expect(relatedStory).toHaveProperty('title');
        expect(relatedStory).toHaveProperty('author');
        expect(relatedStory).toHaveProperty('similarity');

        expect(typeof relatedStory.similarity).toBe('number');
        expect(relatedStory.similarity).toBeGreaterThanOrEqual(0);
        expect(relatedStory.similarity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should return 404 for non-existent story', async () => {
    const invalidEndpoint = `${baseURL}/api/v1/discovery/stories/non-existent-id`;
    const response = await fetch(invalidEndpoint);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Story not found');
  });

  it('should respond within acceptable time limits', async () => {
    const startTime = Date.now();
    const response = await fetch(endpoint);
    const responseTime = Date.now() - startTime;

    // Should respond in under 200ms per constitutional requirement
    expect(responseTime).toBeLessThan(200);
  });

  it('should support conditional requests for caching', async () => {
    // First request to get ETag
    const initialResponse = await fetch(endpoint);
    const etag = initialResponse.headers.get('etag');

    if (etag) {
      // Conditional request with If-None-Match header
      const conditionalResponse = await fetch(endpoint, {
        headers: {
          'If-None-Match': etag,
        },
      });

      // Should return 304 if content hasn't changed
      expect([200, 304]).toContain(conditionalResponse.status);
    }
  });

  it('should include view count and statistics', async () => {
    const response = await fetch(endpoint);

    const data = await response.json();

    if (response.status === 200) {
      expect(data).toHaveProperty('statistics');
      const stats = data.statistics;

      expect(stats).toHaveProperty('views');
      expect(stats).toHaveProperty('bookmarks');
      expect(stats).toHaveProperty('kudos');
      expect(stats).toHaveProperty('comments');

      expect(typeof stats.views).toBe('number');
      expect(typeof stats.bookmarks).toBe('number');
      expect(typeof stats.kudos).toBe('number');
      expect(typeof stats.comments).toBe('number');
    }
  });

  it('should include content warnings if applicable', async () => {
    const response = await fetch(endpoint);

    const data = await response.json();

    if (response.status === 200) {
      expect(data.story).toHaveProperty('contentWarnings');
      expect(Array.isArray(data.story.contentWarnings)).toBe(true);

      if (data.story.contentWarnings.length > 0) {
        const warning = data.story.contentWarnings[0];
        expect(typeof warning).toBe('string');
      }
    }
  });
});
