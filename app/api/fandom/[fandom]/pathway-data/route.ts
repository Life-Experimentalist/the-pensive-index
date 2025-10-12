/**
 * Fandom Pathway Data API
 * GET /api/fandom/[fandom]/pathway-data
 * Returns all data needed for pathway builder: tags, tropes, tag classes
 * Feature 004-integrate-the-pathway: Universal database integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { tags, plotBlocks, tagClasses } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fandom: string }> }
) {
  try {
    const { fandom: fandomId } = await params;

    if (!fandomId) {
      return NextResponse.json(
        { error: 'Fandom ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Fetch all active tags for this fandom
    const fandomTags = await db
      .select()
      .from(tags)
      .where(and(eq(tags.fandom_id, fandomId), eq(tags.is_active, true)))
      .all();

    // Fetch all active tropes for this fandom
    const fandomPlotBlocks = await db
      .select()
      .from(plotBlocks)
      .where(
        and(eq(plotBlocks.fandom_id, fandomId), eq(plotBlocks.is_active, true))
      )
      .all();

    // Fetch all active tag classes for this fandom
    const fandomTagClasses = await db
      .select()
      .from(tagClasses)
      .where(
        and(eq(tagClasses.fandom_id, fandomId), eq(tagClasses.is_active, true))
      )
      .all();

    return NextResponse.json({
      fandomId,
      tags: fandomTags,
      plotBlocks: fandomPlotBlocks,
      tagClasses: fandomTagClasses,
      meta: {
        tagCount: fandomTags.length,
        plotBlockCount: fandomPlotBlocks.length,
        tagClassCount: fandomTagClasses.length,
      },
    });
  } catch (error) {
    console.error('Error fetching pathway data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pathway data', message: String(error) },
      { status: 500 }
    );
  }
}
