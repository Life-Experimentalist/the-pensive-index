import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import {
  apiResponseSchema,
  storySearchContextSchema,
} from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * Search for stories based on tags and plot blocks
 * POST /api/search/stories
 */
export async function POST(request: NextRequest) {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Parse and validate request body
    const body = await request.json();
    const parseResult = storySearchContextSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid search parameters',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const searchContext = parseResult.data;
    const filters = (searchContext.filters as any) || {
      sort_by: 'relevance' as const,
      sort_order: 'desc' as const,
      limit: 20,
      offset: 0,
    };

    // Build the search query based on context
    // This is a placeholder implementation - real search would be more complex
    const stories = await db.query.stories.findMany({
      where: (stories, { eq, and }) => {
        const conditions = [];

        if (searchContext.fandom_id) {
          conditions.push(
            eq(stories.fandom_id, searchContext.fandom_id as string)
          );
        }

        // TODO: Implement complex tag and plot block filtering
        // This would involve JOIN operations with story_tags and story_plot_blocks tables

        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      limit: filters.limit,
      offset: filters.offset,
      orderBy: (stories, { desc, asc }) => {
        switch (filters.sort_by) {
          case 'word_count':
            return filters.sort_order === 'desc'
              ? [desc(stories.word_count)]
              : [asc(stories.word_count)];
          case 'updated_at':
            return filters.sort_order === 'desc'
              ? [desc(stories.updated_at)]
              : [asc(stories.updated_at)];
          case 'created_at':
            return filters.sort_order === 'desc'
              ? [desc(stories.created_at)]
              : [asc(stories.created_at)];
          default: // relevance
            return [desc(stories.created_at)]; // Placeholder
        }
      },
    });

    // Calculate relevance scores (placeholder implementation)
    const storiesWithRelevance = stories.map(story => ({
      ...story,
      relevance_score: 0.8, // Placeholder score
      matching_tags: [], // Placeholder array
      matching_plot_blocks: [], // Placeholder array
    }));

    const page = Math.floor(filters.offset / filters.limit) + 1;

    const response = {
      data: storiesWithRelevance,
      pagination: {
        page,
        limit: filters.limit,
        total: stories.length,
        totalPages: Math.ceil(stories.length / filters.limit),
      },
      search_metadata: {
        total_matches: stories.length,
        execution_time: Date.now(), // Placeholder
        filters_applied: searchContext.filters,
      },
    };

    const validatedResponse = apiResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('Error searching stories:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
