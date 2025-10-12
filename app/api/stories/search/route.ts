/**
 * Story Search API
 * Implements full-text search and filtering for stories
 * Contract: specs/004-integrate-the-pathway/contracts/story-api.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { stories } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fandomId = searchParams.get('fandomId');
    const query = searchParams.get('query');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const plotBlocks = searchParams
      .get('plotBlocks')
      ?.split(',')
      .filter(Boolean);
    const minVotes = parseInt(searchParams.get('minVotes') || '0');
    const pollStatus = searchParams.get('pollStatus') || 'approved';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!fandomId) {
      return NextResponse.json(
        { error: 'Missing required parameter: fandomId' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const startTime = Date.now();

    // Build base query
    let queryConditions = [
      eq(stories.fandom_id, fandomId),
      eq(stories.poll_status, pollStatus as any),
    ];

    // Add vote filter
    if (minVotes > 0) {
      queryConditions.push(sql`${stories.vote_count} >= ${minVotes}`);
    }

    // TODO: Implement full-text search with FTS5
    // TODO: Implement tag and trope filtering
    // TODO: Implement relevance scoring

    // Build query using Drizzle pattern
    let dbQuery = db.select().from(stories);

    if (queryConditions.length > 0) {
      dbQuery = dbQuery.where(and(...queryConditions)) as typeof dbQuery;
    }

    // Execute and get all results (will add SQL LIMIT/OFFSET later)
    const allResults = await dbQuery.all();

    // Apply pagination manually for now
    const results = allResults.slice(offset, offset + limit);

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      stories: results,
      total: allResults.length,
      limit,
      offset,
      searchMetadata: {
        queryUsed: query,
        ftsUsed: false,
        executionTime,
      },
    });
  } catch (error) {
    console.error('Error searching stories:', error);
    return NextResponse.json(
      { error: 'Failed to search stories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/search
 * Search for stories matching pathway criteria (tags, tropes, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fandomId, tags, tropes, plotBlocks, minVotes, pollStatus, sortBy, limit, offset } = body;

    if (!fandomId) {
      return NextResponse.json(
        { error: 'Missing required parameter: fandomId' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const startTime = Date.now();

    // Build base query
    let queryConditions = [
      eq(stories.fandom_id, fandomId),
      eq(stories.poll_status, (pollStatus || 'approved') as any),
    ];

    // Add vote filter
    const minVoteCount = minVotes || 0;
    if (minVoteCount > 0) {
      queryConditions.push(sql`${stories.vote_count} >= ${minVoteCount}`);
    }

    // TODO: Implement tag and trope filtering when pathway_tags junction table exists
    // TODO: Implement relevance scoring based on matched tags
    // For now, return stories from the fandom

    let dbQuery = db.select().from(stories);

    if (queryConditions.length > 0) {
      dbQuery = dbQuery.where(and(...queryConditions)) as typeof dbQuery;
    }

    const allResults = await dbQuery.all();

    // Apply pagination
    const limitCount = Math.min(limit || 20, 100);
    const offsetCount = offset || 0;
    const results = allResults.slice(offsetCount, offsetCount + limitCount);

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      stories: results,
      total: allResults.length,
      limit: limitCount,
      offset: offsetCount,
      searchMetadata: {
        tagsUsed: tags || [],
        tropesUsed: tropes || [],
        plotBlocksUsed: plotBlocks || [],
        executionTime,
      },
    });
  } catch (error) {
    console.error('[API] POST story search error:', error);
    return NextResponse.json(
      { error: 'Failed to search stories' },
      { status: 500 }
    );
  }
}
