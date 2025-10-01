/**
 * T030: Tag Suggestion API Endpoint
 *
 * POST /api/v1/suggest/tags - AI-powered tag recommendations
 *
 * This endpoint provides intelligent tag suggestions for story submissions using:
 * - Taxonomy-based suggestions from existing fandoms
 * - Content analysis for tag recommendations
 * - Community feedback integration
 * - Confidence scoring for suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import {
  TagSuggester,
  TagAnalysisContext,
} from '../../../../../src/lib/validation/tag-suggester';

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequestsPerHour: 100,
  maxRequestsPerDay: 500,
  windowMs: 60 * 60 * 1000, // 1 hour
};

// Request validation schema
const tagSuggestionSchema = z.object({
  fandomId: z.string().min(1, 'Fandom ID is required'),
  title: z.string().min(1, 'Title is required'),
  summary: z.string().optional(),
  content: z.string().optional(),
  existingTags: z.array(z.string()).optional().default([]),
  authorHints: z.array(z.string()).optional().default([]),
  options: z
    .object({
      maxSuggestions: z.number().min(1).max(50).optional().default(20),
      includePopular: z.boolean().optional().default(true),
      includeContentAnalysis: z.boolean().optional().default(true),
      includeSimilarity: z.boolean().optional().default(true),
      confidenceThreshold: z.number().min(0).max(1).optional().default(0.3),
    })
    .optional()
    .default({}),
});

type TagSuggestionRequest = z.infer<typeof tagSuggestionSchema>;

// Initialize tag suggester service
const tagSuggester = new TagSuggester();

// In-memory rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<
  string,
  {
    count: number;
    resetTime: number;
    dailyCount: number;
    dailyResetTime: number;
  }
>();

/**
 * Apply rate limiting per user
 */
function applyRateLimit(userId: string): {
  allowed: boolean;
  resetTime?: number;
  dailyResetTime?: number;
} {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit) {
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
      dailyCount: 1,
      dailyResetTime: now + 24 * 60 * 60 * 1000,
    });
    return { allowed: true };
  }

  // Check hourly limit
  if (now > userLimit.resetTime) {
    userLimit.count = 1;
    userLimit.resetTime = now + RATE_LIMIT.windowMs;
  } else {
    userLimit.count++;
  }

  // Check daily limit
  if (now > userLimit.dailyResetTime) {
    userLimit.dailyCount = 1;
    userLimit.dailyResetTime = now + 24 * 60 * 60 * 1000;
  } else {
    userLimit.dailyCount++;
  }

  if (userLimit.count > RATE_LIMIT.maxRequestsPerHour) {
    return {
      allowed: false,
      resetTime: userLimit.resetTime,
      dailyResetTime: userLimit.dailyResetTime,
    };
  }

  if (userLimit.dailyCount > RATE_LIMIT.maxRequestsPerDay) {
    return {
      allowed: false,
      resetTime: userLimit.resetTime,
      dailyResetTime: userLimit.dailyResetTime,
    };
  }

  return { allowed: true };
}

/**
 * POST /api/v1/suggest/tags
 * Generate AI-powered tag suggestions for story content
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimit = applyRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: 'Too many tag suggestion requests',
          retryAfter: rateLimit.resetTime
            ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            : 3600,
          dailyRetryAfter: rateLimit.dailyResetTime
            ? Math.ceil((rateLimit.dailyResetTime - Date.now()) / 1000)
            : 86400,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.resetTime
              ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
              : '3600',
            'X-RateLimit-Limit-Hourly':
              RATE_LIMIT.maxRequestsPerHour.toString(),
            'X-RateLimit-Limit-Daily': RATE_LIMIT.maxRequestsPerDay.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    let requestData: TagSuggestionRequest;
    try {
      const body = await request.json();
      requestData = tagSuggestionSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Build analysis context
    const analysisContext: TagAnalysisContext = {
      fandomId: requestData.fandomId,
      title: requestData.title,
      summary: requestData.summary,
      content: requestData.content,
      existingTags: requestData.existingTags,
      authorHints: requestData.authorHints,
    };

    // Configure tag suggester based on request options
    const suggesterConfig = {
      maxSuggestions: requestData.options.maxSuggestions,
      enablePopularityBoost: requestData.options.includePopular,
      enableContentAnalysis: requestData.options.includeContentAnalysis,
      enableSimilarityMatching: requestData.options.includeSimilarity,
      rejectionThreshold: requestData.options.confidenceThreshold,
    };

    // Create configured suggester instance
    const configuredSuggester = new TagSuggester(suggesterConfig);

    // Generate tag suggestions
    const suggestionStartTime = Date.now();
    const suggestions = await configuredSuggester.suggestTags(analysisContext);
    const suggestionEndTime = Date.now();

    // Prepare response with enhanced metadata
    const response = {
      success: true,
      suggestions: suggestions.suggestions.map(suggestion => ({
        tag: suggestion.tag,
        confidence: Math.round(suggestion.confidence * 100) / 100, // Round to 2 decimal places
        source: suggestion.source,
        reasoning: suggestion.reasoning,
        category: suggestion.category || 'general',
        recommended: suggestion.confidence >= 0.7,
      })),
      categories: {
        automatic: suggestions.automaticTags,
        manualReview: suggestions.manualReviewTags,
        rejected: suggestions.rejectedTags,
      },
      analytics: {
        totalAnalyzed: suggestions.totalAnalyzed,
        processingTimeMs: suggestions.processingTimeMs,
        totalRequestTimeMs: suggestionEndTime - suggestionStartTime,
        suggestionsGenerated: suggestions.suggestions.length,
        highConfidenceCount: suggestions.suggestions.filter(
          s => s.confidence >= 0.8
        ).length,
        mediumConfidenceCount: suggestions.suggestions.filter(
          s => s.confidence >= 0.5 && s.confidence < 0.8
        ).length,
        lowConfidenceCount: suggestions.suggestions.filter(
          s => s.confidence < 0.5
        ).length,
      },
      metadata: {
        fandomId: requestData.fandomId,
        timestamp: new Date().toISOString(),
        userId: userId,
        requestOptions: requestData.options,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating tag suggestions:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('fandom not found')) {
        return NextResponse.json(
          {
            error: 'Fandom not found',
            details:
              'The specified fandom ID does not exist or is not available for tag suggestions',
            suggestedActions: [
              'Verify the fandom ID is correct',
              'Check if the fandom has been properly configured',
              'Try with a different fandom ID',
            ],
          },
          { status: 404 }
        );
      }

      if (error.message.includes('content too long')) {
        return NextResponse.json(
          {
            error: 'Content too long',
            details:
              'The provided content exceeds the maximum length for analysis',
            suggestedActions: [
              'Reduce the content length to under 10,000 characters',
              'Provide a summary instead of full content',
              'Split the analysis into multiple requests',
            ],
          },
          { status: 413 }
        );
      }

      if (error.message.includes('analysis failed')) {
        return NextResponse.json(
          {
            error: 'Analysis failed',
            details: 'Tag suggestion analysis could not be completed',
            suggestedActions: [
              'Try again with different content',
              'Check if the title and summary are properly formatted',
              'Contact support if the issue persists',
            ],
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/suggest/tags
 * Get tag suggestion capabilities and statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get URL parameters for optional fandom filtering
    const { searchParams } = new URL(request.url);
    const fandomId = searchParams.get('fandomId');

    // Get current rate limit status
    const rateLimitStatus = rateLimitMap.get(userId);
    const now = Date.now();

    const rateLimitInfo = rateLimitStatus
      ? {
          hourlyRemaining: Math.max(
            0,
            RATE_LIMIT.maxRequestsPerHour - rateLimitStatus.count
          ),
          hourlyResetTime: rateLimitStatus.resetTime,
          dailyRemaining: Math.max(
            0,
            RATE_LIMIT.maxRequestsPerDay - rateLimitStatus.dailyCount
          ),
          dailyResetTime: rateLimitStatus.dailyResetTime,
        }
      : {
          hourlyRemaining: RATE_LIMIT.maxRequestsPerHour,
          hourlyResetTime: now + RATE_LIMIT.windowMs,
          dailyRemaining: RATE_LIMIT.maxRequestsPerDay,
          dailyResetTime: now + 24 * 60 * 60 * 1000,
        };

    const suggestionInfo: any = {
      capabilities: {
        sources: [
          {
            name: 'taxonomy',
            description: 'Tags from existing fandom taxonomies',
            enabled: true,
            confidence: 'high',
          },
          {
            name: 'content',
            description: 'AI analysis of story content and summary',
            enabled: true,
            confidence: 'medium-high',
          },
          {
            name: 'similarity',
            description: 'Tags from similar stories in the database',
            enabled: true,
            confidence: 'medium',
          },
          {
            name: 'popularity',
            description: 'Popular tags within the fandom community',
            enabled: true,
            confidence: 'medium',
          },
        ],
        analysisFeatures: [
          'Character detection from content',
          'Relationship inference from context',
          'Genre classification based on narrative elements',
          'Trope identification using pattern matching',
          'Content rating assessment',
          'Language and writing style analysis',
        ],
        contentSupport: {
          maxTitleLength: 500,
          maxSummaryLength: 2000,
          maxContentLength: 10000,
          supportedLanguages: ['English'],
          supportedFormats: ['plain text', 'markdown'],
        },
      },
      configuration: {
        defaultMaxSuggestions: 20,
        confidenceThresholds: {
          automatic: 0.9,
          manualReview: 0.5,
          rejection: 0.3,
        },
        weights: {
          title: 0.4,
          summary: 0.35,
          content: 0.25,
        },
        rateLimits: RATE_LIMIT,
      },
      rateLimitStatus: rateLimitInfo,
      usage: {
        requestsThisHour: rateLimitStatus?.count || 0,
        requestsToday: rateLimitStatus?.dailyCount || 0,
        maxRequestsPerHour: RATE_LIMIT.maxRequestsPerHour,
        maxRequestsPerDay: RATE_LIMIT.maxRequestsPerDay,
      },
    };

    // Add fandom-specific information if requested
    if (fandomId) {
      try {
        // This would need to be implemented to get fandom-specific stats
        // For now, we'll just acknowledge the fandom parameter
        suggestionInfo.configuration.fandomId = fandomId;
      } catch (error) {
        // If fandom not found, continue without fandom-specific data
        console.warn(`Fandom ${fandomId} not found for suggestion info`);
      }
    }

    return NextResponse.json(suggestionInfo);
  } catch (error) {
    console.error('Error getting tag suggestion info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
