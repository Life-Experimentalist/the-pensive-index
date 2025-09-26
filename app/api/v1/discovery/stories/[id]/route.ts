import { NextResponse } from 'next/server';
import { StoryModel } from '@/lib/database/models';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/discovery/stories/[id]
 *
 * Retrieve story details with full metadata.
 * Used for story detail pages and external linking.
 *
 * Performance target: <200ms response time
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const resolvedParams = params;
  const storyId = parseInt(resolvedParams.id);

  try {
    const startTime = Date.now();

    if (isNaN(storyId)) {
      return NextResponse.json(
        {
          error: 'Invalid story ID',
          message: 'Story ID must be a valid number',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Get full story metadata
    const story = await StoryModel.getById(storyId.toString());

    if (!story) {
      return NextResponse.json(
        {
          error: 'Story not found',
          message: `No story found with ID ${storyId}`,
          storyId,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const executionTime = Date.now() - startTime;

    const response = {
      story: {
        id: story.id,
        title: story.title,
        author: story.author,
        summary: story.summary,
        url: story.url,
        metadata: {
          wordCount: story.wordCount,
          chapterCount: story.chapterCount,
          status: story.status,
          rating: story.rating,
          language: story.language,
          sourceType: story.sourceType,
          sourceId: story.sourceId,
          publishedAt: story.publishedAt,
          updatedAt: story.updatedAt,
        },
        tags: story.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          category: tag.category,
        })),
        plotBlocks: story.plotBlocks.map(plot => ({
          id: plot.id,
          name: plot.name,
          description: plot.description,
        })),
        classification: {
          tagCount: story.tags.length,
          plotBlockCount: story.plotBlocks.length,
          categories: [
            ...new Set(story.tags.map(tag => tag.category).filter(Boolean)),
          ],
          hasCharacterFocus: story.tags.some(
            tag =>
              tag.category?.toLowerCase().includes('character') ||
              tag.category?.toLowerCase().includes('ship')
          ),
          hasGenre: story.tags.some(tag =>
            tag.category?.toLowerCase().includes('genre')
          ),
          hasPlotElements: story.plotBlocks.length > 0,
        },
      },
      discovery: {
        searchable: true,
        indexable: true,
        similaritySource: true,
        recommendable: story.wordCount > 1000 && story.status !== 'abandoned',
      },
      navigation: {
        previousStory: null, // Could be implemented with related stories
        nextStory: null, // Could be implemented with related stories
        relatedStories: [], // Could be implemented with similarity search
      },
      metadata: {
        storyId,
        executionTime,
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };

    // SEO and caching headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600', // 30 min cache
      'X-Execution-Time': executionTime.toString(),
      'X-Story-Word-Count': story.wordCount.toString(),
      'X-Story-Tag-Count': story.tags.length.toString(),
      'X-Story-Status': story.status,
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(`Error fetching story ${storyId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to fetch story',
        message: 'An error occurred while retrieving story data',
        storyId: storyId.toString(),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

/**
 * OPTIONS /api/v1/discovery/stories/[id]
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
