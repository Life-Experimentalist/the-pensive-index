import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

// Import the extraction API handlers we need to test
// Note: These imports will fail initially - that's expected in TDD
import { POST as extractMetadata } from '@/app/api/v1/extract/metadata/route';
import { POST as suggestTags } from '@/app/api/v1/suggest/tags/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(),
}));

// Mock extractor service
vi.mock('@/src/lib/extractors/extractor-service', () => ({
  extractorService: {
    extractMetadata: vi.fn(),
    getSupportedSites: vi.fn(),
  },
}));

// Mock AI tag suggestion service
vi.mock('@/src/lib/ai/tag-suggestions', () => ({
  tagSuggestionService: {
    suggestTags: vi.fn(),
    getFandomTaxonomy: vi.fn(),
  },
}));

describe('Metadata Extraction API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated user by default
    vi.mocked(auth).mockReturnValue({
      userId: 'user_test123',
      sessionId: 'session_test123',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/extract/metadata', () => {
    it('should extract metadata from AO3 URL successfully', async () => {
      // Arrange
      const extractionRequest = {
        url: 'https://archiveofourown.org/works/12345',
        extractorHints: {
          expectedFandom: 'harry-potter',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extractionRequest),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        title: expect.any(String),
        author: expect.any(String),
        summary: expect.any(String),
        wordCount: expect.any(Number),
        chapterCount: expect.any(Number),
        completionStatus: expect.stringMatching(
          /^(complete|in-progress|abandoned|unknown)$/
        ),
        publishDate: expect.any(String),
        lastUpdateDate: expect.any(String),
        suggestedFandom: expect.any(String),
        suggestedTags: expect.any(Array),
        extractorUsed: expect.any(String),
        confidence: expect.any(Number),
      });

      // Validate confidence range
      expect(responseData.confidence).toBeGreaterThanOrEqual(0);
      expect(responseData.confidence).toBeLessThanOrEqual(1);

      // Validate dates format
      expect(responseData.publishDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(responseData.lastUpdateDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Validate suggested tags array
      expect(responseData.suggestedTags).toEqual(
        expect.arrayContaining([expect.any(String)])
      );
    });

    it('should extract metadata from FFN URL successfully', async () => {
      // Arrange
      const extractionRequest = {
        url: 'https://www.fanfiction.net/s/12345/1/',
        extractorHints: {
          expectedFandom: 'percy-jackson',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extractionRequest),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        title: expect.any(String),
        author: expect.any(String),
        extractorUsed: 'fanfiction-net',
        confidence: expect.any(Number),
      });
    });

    it('should return 400 for invalid URL format', async () => {
      // Arrange
      const invalidRequest = {
        url: 'not-a-valid-url',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        message: expect.stringContaining('Invalid URL format'),
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'url',
            message: expect.any(String),
          }),
        ]),
      });
    });

    it('should return 400 for missing required URL field', async () => {
      // Arrange
      const incompleteRequest = {
        extractorHints: {
          expectedFandom: 'harry-potter',
        },
        // Missing required 'url' field
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteRequest),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'url',
            message: expect.stringContaining('required'),
          }),
        ]),
      });
    });

    it('should return 404 when no suitable extractor is found', async () => {
      // Arrange
      const unsupportedSiteRequest = {
        url: 'https://example.com/some-unsupported-site/story/12345',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(unsupportedSiteRequest),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(404);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'No Extractor Found',
        message: 'No suitable extractor found for URL',
        url: unsupportedSiteRequest.url,
        supportedSites: expect.any(Array),
      });
    });

    it('should return 400 when extraction fails due to malformed story page', async () => {
      // Arrange
      const malformedPageRequest = {
        url: 'https://archiveofourown.org/works/nonexistent',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(malformedPageRequest),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Extraction Failed',
        message: expect.stringContaining('Failed to extract metadata'),
        url: malformedPageRequest.url,
        details: expect.any(String),
      });
    });

    it('should handle extractor hints correctly', async () => {
      // Arrange
      const requestWithHints = {
        url: 'https://archiveofourown.org/works/12345',
        extractorHints: {
          expectedFandom: 'harry-potter',
          expectedTags: ['romance', 'alternate-universe'],
          userAgent: 'custom-user-agent',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestWithHints),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        title: expect.any(String),
        suggestedFandom: expect.any(String),
        suggestedTags: expect.any(Array),
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(auth).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const extractionRequest = {
        url: 'https://archiveofourown.org/works/12345',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/extract/metadata',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extractionRequest),
        }
      );

      // Act
      const response = await extractMetadata(request);

      // Assert
      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    });

    it('should handle rate limiting for extraction requests', async () => {
      // Arrange - make multiple rapid requests
      const requests = Array.from({ length: 10 }, (_, i) => ({
        url: `https://archiveofourown.org/works/${12345 + i}`,
      }));

      // Act - make requests rapidly
      const responses = await Promise.all(
        requests.map(reqData => {
          const request = new NextRequest(
            'http://localhost:3000/api/v1/extract/metadata',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqData),
            }
          );
          return extractMetadata(request);
        })
      );

      // Assert - some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        response => response.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const firstRateLimitedResponse = rateLimitedResponses[0];
      const responseData = await firstRateLimitedResponse.json();
      expect(responseData).toMatchObject({
        error: 'Rate Limit Exceeded',
        message: expect.any(String),
        retryAfter: expect.any(Number),
      });
    });
  });

  describe('POST /api/v1/suggest/tags', () => {
    it('should suggest tags for Harry Potter story', async () => {
      // Arrange
      const suggestionRequest = {
        fandomId: 'harry-potter',
        title: 'The Boy Who Lived Again',
        summary:
          'Harry Potter travels back in time to fix his mistakes and save everyone he lost.',
        existingTags: ['time-travel'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestionRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        suggestions: expect.any(Array),
        fandomTaxonomy: expect.any(Array),
      });

      // Validate suggestion structure
      if (responseData.suggestions.length > 0) {
        expect(responseData.suggestions[0]).toMatchObject({
          tag: expect.any(String),
          confidence: expect.any(Number),
          category: expect.any(String),
          reasoning: expect.any(String),
        });

        // Validate confidence range
        expect(responseData.suggestions[0].confidence).toBeGreaterThanOrEqual(
          0
        );
        expect(responseData.suggestions[0].confidence).toBeLessThanOrEqual(1);
      }

      // Validate fandom taxonomy structure
      if (responseData.fandomTaxonomy.length > 0) {
        expect(responseData.fandomTaxonomy[0]).toMatchObject({
          category: expect.any(String),
          tags: expect.any(Array),
        });
      }
    });

    it('should suggest appropriate tags based on title and summary content', async () => {
      // Arrange
      const suggestionRequest = {
        fandomId: 'percy-jackson',
        title: 'Son of Chaos',
        summary:
          'Percy Jackson is betrayed by his friends and becomes the heir of Chaos. Dark Percy story with revenge themes.',
        existingTags: [],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestionRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tag: expect.stringMatching(/(betrayal|dark|revenge|chaos|angst)/i),
            confidence: expect.any(Number),
            reasoning: expect.any(String),
          }),
        ])
      );
    });

    it('should avoid suggesting existing tags', async () => {
      // Arrange
      const suggestionRequest = {
        fandomId: 'harry-potter',
        title: 'Romance and Angst Story',
        summary:
          'A romantic story with lots of emotional turmoil and relationship drama.',
        existingTags: ['romance', 'angst', 'drama'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestionRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();

      // Should not suggest tags that already exist
      const suggestedTagNames = responseData.suggestions.map((s: any) =>
        s.tag.toLowerCase()
      );
      expect(suggestedTagNames).not.toContain('romance');
      expect(suggestedTagNames).not.toContain('angst');
      expect(suggestedTagNames).not.toContain('drama');
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const incompleteRequest = {
        title: 'Story Title',
        summary: 'Some summary',
        // Missing required 'fandomId' field
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'fandomId',
            message: expect.stringContaining('required'),
          }),
        ]),
      });
    });

    it('should return 400 for invalid fandom ID', async () => {
      // Arrange
      const invalidRequest = {
        fandomId: 'non-existent-fandom',
        title: 'Story Title',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Invalid Fandom',
        message: 'Fandom not found or not supported',
        fandomId: invalidRequest.fandomId,
        supportedFandoms: expect.any(Array),
      });
    });

    it('should handle empty title gracefully', async () => {
      // Arrange
      const requestWithEmptyTitle = {
        fandomId: 'harry-potter',
        title: '',
        summary: 'This story has no title but has a summary.',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestWithEmptyTitle),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('cannot be empty'),
          }),
        ]),
      });
    });

    it('should provide category-organized suggestions', async () => {
      // Arrange
      const suggestionRequest = {
        fandomId: 'harry-potter',
        title: 'Harry and Hermione Romance',
        summary:
          'A story about Harry and Hermione falling in love during their seventh year at Hogwarts.',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestionRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.fandomTaxonomy).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: expect.stringMatching(
              /(pairing|genre|character|setting|trope)/i
            ),
            tags: expect.any(Array),
          }),
        ])
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      vi.mocked(auth).mockReturnValue({
        userId: null,
        sessionId: null,
      });

      const suggestionRequest = {
        fandomId: 'harry-potter',
        title: 'Test Story',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestionRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData).toMatchObject({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    });

    it('should handle AI service failures gracefully', async () => {
      // Arrange
      const suggestionRequest = {
        fandomId: 'harry-potter',
        title: 'Story That Breaks AI',
        summary:
          'This story contains content that might cause AI processing to fail.',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/v1/suggest/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestionRequest),
        }
      );

      // Act
      const response = await suggestTags(request);

      // Assert
      if (response.status === 500) {
        const responseData = await response.json();
        expect(responseData).toMatchObject({
          error: 'AI Service Error',
          message: expect.stringContaining(
            'Tag suggestion service temporarily unavailable'
          ),
          retryAfter: expect.any(Number),
        });
      } else {
        // Should still return 200 with at least basic suggestions
        expect(response.status).toBe(200);

        const responseData = await response.json();
        expect(responseData).toMatchObject({
          suggestions: expect.any(Array),
          fandomTaxonomy: expect.any(Array),
        });
      }
    });
  });
});
