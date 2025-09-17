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
    const searchContext = storySearchContextSchema.parse(body);

    // Build the search query based on context
    // This is a placeholder implementation - real search would be more complex
    const stories = await db.query.stories.findMany({
      where: (stories, { eq, and }) => {
        const conditions = [];

        if (searchContext.fandom_id) {
          conditions.push(eq(stories.fandom_id, searchContext.fandom_id));
        }

        // TODO: Implement complex tag and plot block filtering
        // This would involve JOIN operations with story_tags and story_plot_blocks tables

        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      limit: searchContext.filters.limit,
      offset: searchContext.filters.offset,
      orderBy: (stories, { desc, asc }) => {
        switch (searchContext.filters.sort_by) {
          case 'word_count':
            return searchContext.filters.sort_order === 'desc'
              ? [desc(stories.word_count)]
              : [asc(stories.word_count)];
          case 'updated_at':
            return searchContext.filters.sort_order === 'desc'
              ? [desc(stories.updated_at)]
              : [asc(stories.updated_at)];
          case 'created_at':
            return searchContext.filters.sort_order === 'desc'
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

    const page =
      Math.floor(searchContext.filters.offset / searchContext.filters.limit) +
      1;

    const response = {
      data: storiesWithRelevance,
      pagination: {
        page,
        limit: searchContext.filters.limit,
        total: stories.length,
        totalPages: Math.ceil(stories.length / searchContext.filters.limit),
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
