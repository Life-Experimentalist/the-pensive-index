import { NextRequest, NextResponse } from 'next/server';
import {
  SearchResultModel,
  type SearchRequest,
  type PathwayItem,
} from '@/lib/database/models';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/discovery/search/stories
 *
 * Library-first story search with relevance scoring.
 * Returns matching stories and generates prompts for gaps.
 *
 * Performance target: <500ms response time
 * Core discovery interface functionality
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Parse request body
    const body = await request.json();
    const { fandomId, pathway, filters = {}, limit = 20 } = body;

    // Validate request structure
    if (!fandomId || !Array.isArray(pathway)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'fandomId and pathway array are required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Convert to PathwayItem format
    const pathwayItems: PathwayItem[] = pathway.map(
      (item: any, index: number) => ({
        id: item.id || `item_${index}`,
        type: item.type || 'tag',
        name: item.name || '',
        description: item.description,
        category: item.category,
        position: item.position || index,
        metadata: item.metadata || {},
      })
    );

    // Build search request
    const searchRequest: SearchRequest = {
      fandomId: parseInt(fandomId),
      pathway: pathwayItems,
      filters: {
        minWordCount: filters.minWordCount,
        maxWordCount: filters.maxWordCount,
        status: filters.status,
        language: filters.language || 'en',
        rating: filters.rating,
      },
      limit,
      includePopular: filters.includePopular ?? true,
    };

    // Perform library-first search
    const searchResponse = await SearchResultModel.performSearch(searchRequest);

    const executionTime = Date.now() - startTime;

    // Check if we're meeting performance target
    if (executionTime > 500) {
      console.warn(
        `Search exceeded 500ms target: ${executionTime}ms for ${pathwayItems.length} pathway items`
      );
    }

    // Transform response for API consistency
    const response = {
      search: {
        query: {
          fandom: fandomId,
          pathway: pathwayItems.map(item => ({
            type: item.type,
            name: item.name,
            category: item.category,
          })),
          filters: searchRequest.filters,
        },
        results: {
          stories: searchResponse.stories.map(story => ({
            id: story.id,
            title: story.title,
            author: story.author,
            summary: story.summary,
            url: story.url,
            metadata: {
              wordCount: story.wordCount,
              status: story.status,
              rating: story.rating,
              language: story.language,
              lastUpdated: story.lastUpdated,
            },
            match: {
              relevanceScore: story.relevanceScore,
              matchedTags: story.matchedTags,
              matchedPlotBlocks: story.matchedPlotBlocks,
            },
          })),
          total: searchResponse.stories.length,
          hasMore: searchResponse.metadata.hasMoreResults,
        },
        prompt: {
          text: searchResponse.prompt.text,
          novelty: {
            highlights: searchResponse.prompt.noveltyHighlights,
            suggestions: searchResponse.prompt.completionSuggestions,
          },
          reason:
            searchResponse.stories.length < 3
              ? 'Few matching stories found - high novelty potential'
              : 'Good story selection available - prompt for inspiration',
        },
      },
      analysis: {
        pathway: {
          completeness: searchResponse.pathway.completeness,
          noveltyScore: searchResponse.pathway.noveltyScore,
          searchability: searchResponse.pathway.searchability,
          isValid: searchResponse.pathway.validation.isValid,
        },
        discovery: {
          libraryFirst: true,
          storyCount: searchResponse.stories.length,
          noveltyPotential:
            searchResponse.pathway.noveltyScore > 0.7
              ? 'high'
              : searchResponse.pathway.noveltyScore > 0.4
              ? 'medium'
              : 'low',
          recommendAction:
            searchResponse.stories.length >= 3
              ? 'explore_stories'
              : 'create_story',
        },
      },
      metadata: {
        fandomId,
        executionTime,
        searchTime: searchResponse.metadata.searchTime,
        timestamp: new Date().toISOString(),
        performanceTarget: executionTime <= 500 ? 'met' : 'exceeded',
        libraryFirst: true,
      },
    };

    // Performance monitoring headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Execution-Time': executionTime.toString(),
      'X-Search-Time': searchResponse.metadata.searchTime.toString(),
      'X-Performance-Target': executionTime <= 500 ? 'met' : 'exceeded',
      'X-Story-Count': searchResponse.stories.length.toString(),
      'X-Library-First': 'true',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Short cache for dynamic search
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error performing story search:', error);

    const executionTime = Date.now() - Date.now();

    return NextResponse.json(
      {
        error: 'Search failed',
        message: 'An error occurred during story search',
        timestamp: new Date().toISOString(),
        libraryFirst: true,
      },
      {
        status: 500,
        headers: {
          'X-Execution-Time': executionTime.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

/**
 * OPTIONS /api/v1/discovery/search/stories
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
