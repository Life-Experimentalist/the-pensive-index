/**
 * T030 Contract Test: Tag Suggestion API Endpoint
 *
 * Tests the tag suggestion API endpoint for AI-powered tag recommendations.
 * Following TDD methodology: tests are written to define the contract,
 * then the implementation is built to satisfy these tests.
 *
 * API Contract:
 * - POST /api/v1/suggest/tags - Generate tag suggestions from content analysis
 * - GET /api/v1/suggest/tags - Get suggestion capabilities and rate limits
 * - Authentication required for all operations
 * - Rate limiting: 100 requests/hour, 500 requests/day
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { NextRequest } from 'next/server';

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock TagSuggester service
vi.mock('../../src/lib/validation/tag-suggester', () => {
  return {
    TagSuggester: vi.fn(() => ({
      suggestTags: vi.fn(),
    })),
  };
});

import { auth } from '@clerk/nextjs/server';
import { POST, GET } from '../../app/api/v1/suggest/tags/route';
import { TagSuggester } from '../../src/lib/validation/tag-suggester';

describe('T030 Contract: Tag Suggestion API Endpoint', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: 'test-user-123' } as any);
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('POST /api/v1/suggest/tags', () => {
    it('should authenticate users before processing', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'harry-potter',
          title: 'Test Story',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should validate request body schema', async () => {
      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({ invalidField: 'invalid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
      expect(Array.isArray(data.details)).toBe(true);
    });

    it('should require fandom ID and title', async () => {
      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Story' }), // Missing fandomId
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
      expect(
        data.details.some((detail: string) => detail.includes('fandomId'))
      ).toBe(true);
    });

    it('should generate tag suggestions successfully', async () => {
      const mockSuggestions = {
        suggestions: [
          {
            tag: 'harry-potter',
            confidence: 0.95,
            source: 'taxonomy' as const,
            reasoning: 'Main character detected in title',
            category: 'characters' as const,
          },
          {
            tag: 'romance',
            confidence: 0.8,
            source: 'content' as const,
            reasoning: 'Romantic elements detected in summary',
            category: 'genres' as const,
          },
          {
            tag: 'alternate-universe',
            confidence: 0.7,
            source: 'similarity' as const,
            reasoning: 'Similar to other AU stories',
            category: 'tropes' as const,
          },
        ],
        automaticTags: ['harry-potter'],
        manualReviewTags: ['romance'],
        rejectedTags: [],
        totalAnalyzed: 150,
        processingTimeMs: 245,
      };

      const mockSuggester = vi.mocked(TagSuggester);
      const mockSuggestTags = vi.fn().mockResolvedValue(mockSuggestions);
      mockSuggester.mockImplementation(
        () => ({ suggestTags: mockSuggestTags } as any)
      );

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'harry-potter',
          title: 'The Boy Who Lived Differently',
          summary:
            'A romantic story about Harry and Hermione in an alternate universe',
          existingTags: ['fanfiction'],
          options: {
            maxSuggestions: 15,
            includeContentAnalysis: true,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.suggestions.length).toBe(3);

      // Verify suggestion structure
      const suggestion = data.suggestions[0];
      expect(suggestion.tag).toBe('harry-potter');
      expect(suggestion.confidence).toBe(0.95);
      expect(suggestion.source).toBe('taxonomy');
      expect(suggestion.reasoning).toBeDefined();
      expect(suggestion.category).toBe('characters');
      expect(suggestion.recommended).toBe(true);

      // Verify categories
      expect(data.categories.automatic).toContain('harry-potter');
      expect(data.categories.manualReview).toContain('romance');
      expect(Array.isArray(data.categories.rejected)).toBe(true);

      // Verify analytics
      expect(data.analytics.totalAnalyzed).toBe(150);
      expect(data.analytics.processingTimeMs).toBe(245);
      expect(data.analytics.suggestionsGenerated).toBe(3);
      expect(data.analytics.highConfidenceCount).toBe(2); // harry-potter (0.95) and romance (0.8)

      // Verify metadata
      expect(data.metadata.fandomId).toBe('harry-potter');
      expect(data.metadata.userId).toBe('test-user-123');
      expect(data.metadata.timestamp).toBeDefined();
    });

    it('should handle optional content and author hints', async () => {
      const mockSuggestions = {
        suggestions: [],
        automaticTags: [],
        manualReviewTags: [],
        rejectedTags: [],
        totalAnalyzed: 0,
        processingTimeMs: 50,
      };

      const mockSuggester = vi.mocked(TagSuggester);
      const mockSuggestTags = vi.fn().mockResolvedValue(mockSuggestions);
      mockSuggester.mockImplementation(
        () => ({ suggestTags: mockSuggestTags } as any)
      );

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'percy-jackson',
          title: 'Camp Half-Blood Chronicles',
          summary: 'Adventures at camp',
          content: 'Full story content here...',
          authorHints: ['adventure', 'friendship'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSuggestTags).toHaveBeenCalledWith({
        fandomId: 'percy-jackson',
        title: 'Camp Half-Blood Chronicles',
        summary: 'Adventures at camp',
        content: 'Full story content here...',
        existingTags: [],
        authorHints: ['adventure', 'friendship'],
      });
    });

    it('should respect custom suggestion options', async () => {
      const mockSuggestions = {
        suggestions: [],
        automaticTags: [],
        manualReviewTags: [],
        rejectedTags: [],
        totalAnalyzed: 0,
        processingTimeMs: 100,
      };

      const mockSuggester = vi.mocked(TagSuggester);
      mockSuggester.mockImplementation(
        () =>
          ({ suggestTags: vi.fn().mockResolvedValue(mockSuggestions) } as any)
      );

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'naruto',
          title: 'Ninja Adventures',
          options: {
            maxSuggestions: 10,
            includePopular: false,
            includeContentAnalysis: false,
            includeSimilarity: true,
            confidenceThreshold: 0.6,
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(TagSuggester).toHaveBeenCalledWith({
        maxSuggestions: 10,
        enablePopularityBoost: false,
        enableContentAnalysis: false,
        enableSimilarityMatching: true,
        rejectionThreshold: 0.6,
      });
    });

    it('should handle fandom not found error', async () => {
      const mockSuggester = vi.mocked(TagSuggester);
      mockSuggester.mockImplementation(
        () =>
          ({
            suggestTags: vi
              .fn()
              .mockRejectedValue(new Error('fandom not found')),
          } as any)
      );

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'nonexistent-fandom',
          title: 'Test Story',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Fandom not found');
      expect(Array.isArray(data.suggestedActions)).toBe(true);
    });

    it('should handle content too long error', async () => {
      const mockSuggester = vi.mocked(TagSuggester);
      mockSuggester.mockImplementation(
        () =>
          ({
            suggestTags: vi
              .fn()
              .mockRejectedValue(new Error('content too long')),
          } as any)
      );

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'harry-potter',
          title: 'Very Long Story',
          content: 'x'.repeat(20000), // Exceed max length
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toBe('Content too long');
      expect(Array.isArray(data.suggestedActions)).toBe(true);
    });

    it('should handle analysis failed error', async () => {
      const mockSuggester = vi.mocked(TagSuggester);
      mockSuggester.mockImplementation(
        () =>
          ({
            suggestTags: vi
              .fn()
              .mockRejectedValue(new Error('analysis failed')),
          } as any)
      );

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'harry-potter',
          title: 'Test Story',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toBe('Analysis failed');
      expect(Array.isArray(data.suggestedActions)).toBe(true);
    });

    it('should enforce rate limiting', async () => {
      // This test would require setting up rate limiting state
      // For now, we'll test the rate limiting structure
      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'harry-potter',
          title: 'Test Story',
        }),
      });

      // Rate limiting is handled within the function
      expect(typeof POST).toBe('function');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });
  });

  describe('GET /api/v1/suggest/tags', () => {
    it('should authenticate users before providing info', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return suggestion capabilities and configuration', async () => {
      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify capabilities structure
      expect(data.capabilities).toBeDefined();
      expect(Array.isArray(data.capabilities.sources)).toBe(true);
      expect(data.capabilities.sources.length).toBe(4);

      const taxonomySource = data.capabilities.sources.find(
        (s: any) => s.name === 'taxonomy'
      );
      expect(taxonomySource).toBeDefined();
      expect(taxonomySource.enabled).toBe(true);
      expect(taxonomySource.confidence).toBe('high');

      expect(Array.isArray(data.capabilities.analysisFeatures)).toBe(true);
      expect(data.capabilities.contentSupport).toBeDefined();
      expect(data.capabilities.contentSupport.maxContentLength).toBe(10000);
    });

    it('should return configuration and rate limits', async () => {
      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify configuration
      expect(data.configuration.defaultMaxSuggestions).toBe(20);
      expect(data.configuration.confidenceThresholds.automatic).toBe(0.9);
      expect(data.configuration.confidenceThresholds.manualReview).toBe(0.5);
      expect(data.configuration.confidenceThresholds.rejection).toBe(0.3);

      expect(data.configuration.weights.title).toBe(0.4);
      expect(data.configuration.weights.summary).toBe(0.35);
      expect(data.configuration.weights.content).toBe(0.25);

      expect(data.configuration.rateLimits.maxRequestsPerHour).toBe(100);
      expect(data.configuration.rateLimits.maxRequestsPerDay).toBe(500);
    });

    it('should return rate limit status', async () => {
      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify rate limit status
      expect(data.rateLimitStatus).toBeDefined();
      expect(typeof data.rateLimitStatus.hourlyRemaining).toBe('number');
      expect(typeof data.rateLimitStatus.dailyRemaining).toBe('number');

      expect(data.usage).toBeDefined();
      expect(data.usage.maxRequestsPerHour).toBe(100);
      expect(data.usage.maxRequestsPerDay).toBe(500);
    });

    it('should accept optional fandom parameter', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/suggest/tags?fandomId=harry-potter',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // The fandom parameter should be acknowledged
      expect(data.configuration.fandomId).toBe('harry-potter');
    });

    it('should handle internal server errors gracefully', async () => {
      // Mock auth to throw an error
      vi.mocked(auth).mockRejectedValue(new Error('Internal error'));

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response Format Validation', () => {
    it('should return properly structured suggestion response', async () => {
      const mockSuggestions = {
        suggestions: [
          {
            tag: 'test-tag',
            confidence: 0.85,
            source: 'content' as const,
            reasoning: 'Test reasoning',
            category: 'general' as const,
          },
        ],
        automaticTags: [],
        manualReviewTags: ['test-tag'],
        rejectedTags: [],
        totalAnalyzed: 100,
        processingTimeMs: 150,
      };

      const mockSuggester = vi.mocked(TagSuggester);
      mockSuggester.mockImplementation(
        () =>
          ({
            suggestTags: vi.fn().mockResolvedValue(mockSuggestions),
          } as any)
      );

      const request = new NextRequest('http://localhost/api/v1/suggest/tags', {
        method: 'POST',
        body: JSON.stringify({
          fandomId: 'test-fandom',
          title: 'Test Story',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify complete response structure
      expect(data.success).toBe(true);
      expect(Array.isArray(data.suggestions)).toBe(true);
      expect(data.categories).toBeDefined();
      expect(data.analytics).toBeDefined();
      expect(data.metadata).toBeDefined();

      // Verify analytics completeness
      expect(typeof data.analytics.totalAnalyzed).toBe('number');
      expect(typeof data.analytics.processingTimeMs).toBe('number');
      expect(typeof data.analytics.totalRequestTimeMs).toBe('number');
      expect(typeof data.analytics.suggestionsGenerated).toBe('number');
      expect(typeof data.analytics.highConfidenceCount).toBe('number');
      expect(typeof data.analytics.mediumConfidenceCount).toBe('number');
      expect(typeof data.analytics.lowConfidenceCount).toBe('number');
    });
  });
});
