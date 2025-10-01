import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import { ExtractorRegistry } from '../../../../../src/lib/extractors/registry';
import {
  SubmissionStatus,
  CompletionStatus,
  StoryMetadata,
} from '../../../../../src/types/submission';

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequestsPerHour: 60,
  maxRequestsPerDay: 200,
  windowMs: 60 * 60 * 1000, // 1 hour
};

// Request validation schema
const extractMetadataSchema = z.object({
  storyUrl: z.string().url('Must be a valid URL'),
  extractorHints: z
    .object({
      fandomId: z.string().optional(),
      expectedPlatform: z
        .enum(['archiveofourown', 'fanfiction-net', 'wattpad', 'youtube'])
        .optional(),
      extractionDepth: z.enum(['basic', 'full', 'deep']).default('basic'),
    })
    .optional()
    .default({}),
});

// Response types for metadata extraction
interface ExtractionResult {
  success: boolean;
  extractorUsed: string;
  confidence: number;
  metadata: {
    storyUrl: string;
    storyTitle: string;
    authorName: string;
    summary?: string;
    wordCount?: number;
    chapterCount?: number;
    completionStatus?: string;
    publishDate?: string;
    lastUpdateDate?: string;
    tags: string[];
    fandomId?: string;
    language?: string;
    rating?: string;
    warnings?: string[];
    relationships?: string[];
    characters?: string[];
    additionalTags?: string[];
  };
  extractionDetails: {
    timestamp: Date;
    processingTimeMs: number;
    extractorVersion: string;
    extractionMethod: string;
    sourceMetadata: Record<string, any>;
  };
}

interface ExtractionError {
  success: false;
  error: string;
  errorType:
    | 'invalid_url'
    | 'unsupported_site'
    | 'extraction_failed'
    | 'rate_limited'
    | 'network_error';
  suggestedActions: string[];
  extractionAttempts: Array<{
    extractorName: string;
    attempted: boolean;
    error?: string;
  }>;
}

// Initialize services
const extractorRegistry = new ExtractorRegistry();

// In-memory rate limiting (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting helper
 */
function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userId);

  if (!userLimits || now > userLimits.resetTime) {
    // Reset or create new limit window
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return { allowed: true };
  }

  if (userLimits.count >= RATE_LIMIT.maxRequestsPerHour) {
    const retryAfter = Math.ceil((userLimits.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  userLimits.count++;
  rateLimitStore.set(userId, userLimits);
  return { allowed: true };
}

/**
 * POST /api/v1/extract/metadata
 * Extract story metadata from provided URL
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          limit: RATE_LIMIT.maxRequestsPerHour,
          windowMs: RATE_LIMIT.windowMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = extractMetadataSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { storyUrl, extractorHints } = validationResult.data;

    // Get appropriate extractor for the URL
    const extractor = extractorRegistry.getExtractorForUrl(storyUrl);

    if (!extractor) {
      const extractionError: ExtractionError = {
        success: false,
        error: 'No suitable extractor found for this URL',
        errorType: 'unsupported_site',
        suggestedActions: [
          'Verify the URL is from a supported fanfiction site',
          'Check that the URL is publicly accessible',
          'Try with a different story URL from the same site',
        ],
        extractionAttempts: extractorRegistry.getExtractors().map(metadata => ({
          extractorName: metadata.extractor.name,
          attempted: false,
          error: 'URL pattern did not match',
        })),
      };

      return NextResponse.json(extractionError, { status: 422 });
    }

    // Perform metadata extraction
    try {
      const extractionStartTime = Date.now();
      // Note: WebsiteExtractor.extract() doesn't take parameters, so we'll call it directly
      const extractedMetadata = await extractor.extract();
      const extractionTimeMs = Date.now() - extractionStartTime;

      // Calculate confidence score based on extraction completeness
      const confidence = calculateExtractionConfidence(extractedMetadata);

      // Build successful response
      const result: ExtractionResult = {
        success: true,
        extractorUsed: extractor.name,
        confidence,
        metadata: {
          storyUrl: extractedMetadata.url,
          storyTitle: extractedMetadata.title,
          authorName: extractedMetadata.author,
          summary: extractedMetadata.summary,
          wordCount: extractedMetadata.wordCount,
          chapterCount: extractedMetadata.chapterCount,
          completionStatus: extractedMetadata.completionStatus?.toString(),
          publishDate: extractedMetadata.publishDate?.toISOString(),
          lastUpdateDate: extractedMetadata.lastUpdateDate?.toISOString(),
          tags: extractedMetadata.additionalTags || [],
          fandomId: undefined, // Not part of StoryMetadata
          language: extractedMetadata.language,
          rating: extractedMetadata.rating,
          warnings: extractedMetadata.warnings,
          relationships: extractedMetadata.relationships,
          characters: extractedMetadata.characters,
          additionalTags: extractedMetadata.additionalTags,
        },
        extractionDetails: {
          timestamp: new Date(),
          processingTimeMs: extractionTimeMs,
          extractorVersion: 'v1.0.0', // Version not available from WebsiteExtractor interface
          extractionMethod: 'standard',
          sourceMetadata: {}, // Raw metadata not available from StoryMetadata
        },
      };

      return NextResponse.json(result);
    } catch (extractorError) {
      console.error('Extraction failed:', extractorError);

      const extractionError: ExtractionError = {
        success: false,
        error:
          extractorError instanceof Error
            ? extractorError.message
            : 'Unknown extraction error',
        errorType: 'extraction_failed',
        suggestedActions: [
          'Verify the story URL is still accessible',
          'Check if the story is publicly visible (not private or deleted)',
          'Try again in a few minutes (site may be temporarily unavailable)',
          'Contact support if the error persists',
        ],
        extractionAttempts: [
          {
            extractorName: extractor.name,
            attempted: true,
            error:
              extractorError instanceof Error
                ? extractorError.message
                : 'Unknown error',
          },
        ],
      };

      return NextResponse.json(extractionError, { status: 422 });
    }
  } catch (error) {
    console.error('Error in metadata extraction:', error);

    const processingTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (
        error.message.includes('timeout') ||
        error.message.includes('network')
      ) {
        const networkError: ExtractionError = {
          success: false,
          error: 'Network timeout or connection error',
          errorType: 'network_error',
          suggestedActions: [
            'Check your internet connection',
            'Try again in a few minutes',
            'Verify the story URL is accessible in a browser',
          ],
          extractionAttempts: [],
        };

        return NextResponse.json(networkError, { status: 503 });
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate extraction confidence based on completeness of extracted metadata
 */
function calculateExtractionConfidence(metadata: StoryMetadata): number {
  let score = 0;
  let maxScore = 100;

  // Required fields (high weight) - based on actual StoryMetadata interface
  if (metadata.title) score += 20;
  if (metadata.author) score += 20;
  if (metadata.url) score += 10;

  // Optional but valuable fields (medium weight)
  if (metadata.summary) score += 15;
  if (metadata.wordCount && metadata.wordCount > 0) score += 10;
  if (metadata.chapterCount && metadata.chapterCount > 0) score += 5;
  if (metadata.publishDate) {
    score += 5;
  }
  if (metadata.lastUpdateDate) {
    score += 5;
  }

  // Enhancement fields (low weight)
  if (metadata.additionalTags && metadata.additionalTags.length > 0) {
    score += 8;
  }
  if (metadata.characters && metadata.characters.length > 0) {
    score += 3;
  }
  if (metadata.relationships && metadata.relationships.length > 0) {
    score += 3;
  }
  if (metadata.rating) {
    score += 2;
  }
  if (metadata.language) {
    score += 2;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * GET /api/v1/extract/metadata
 * Get supported sites and extractor information
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

    const extractorInfo = {
      supportedSites: extractorRegistry.getExtractors().map(metadata => {
        return {
          name: metadata.extractor.name,
          displayName: metadata.extractor.name
            .replace('-', ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
          version: metadata.version,
          supportedDomains: metadata.extractor.urlPatterns.map(
            (pattern: RegExp) => pattern.source
          ),
          capabilities: {
            basicMetadata: true,
            fullContent: true, // All extractors support full content
            seriesDetection: true, // All extractors support series detection
            chapterExtraction: true, // All extractors support chapter extraction
          },
          rateLimit: { requestsPerSecond: 1, burstLimit: 5 }, // Default rate limit
        };
      }),
      extractionOptions: {
        depths: ['basic', 'full', 'deep'],
        defaultDepth: 'basic',
        rateLimits: RATE_LIMIT,
      },
      usage: {
        totalExtractors: extractorRegistry.getExtractors().length,
        supportedDomains: extractorRegistry
          .getExtractors()
          .map(metadata =>
            metadata.extractor.urlPatterns.map(
              (pattern: RegExp) => pattern.source
            )
          )
          .flat()
          .filter(
            (domain: string, index: number, arr: string[]) =>
              arr.indexOf(domain) === index
          )
          .sort(),
      },
    };

    return NextResponse.json(extractorInfo);
  } catch (error) {
    console.error('Error getting extractor information:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
