import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { tags, tagClasses } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { fandom: string } }
) {
  try {
    const fandomId = params.fandom;

    if (!fandomId) {
      return NextResponse.json(
        { error: 'Fandom ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Fetch tags for the specific fandom
    const allTags = await db.select().from(tags);
    const fandomTags = allTags.filter((t: any) => t.fandom_id === fandomId);

    return NextResponse.json({
      tags: fandomTags,
      total: fandomTags.length,
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
