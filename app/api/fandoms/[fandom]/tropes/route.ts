import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { plotBlocks } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

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

    // Fetch tropes (tropes) for the specific fandom
    const allTropes = await db.select().from(plotBlocks);
    const fandomTropes = allTropes.filter(
      (t: any) => t.fandom_id === fandomId || t.fandom_id === String(fandomId)
    );

    console.log(
      `[Tropes API] Fandom ID: ${fandomId}, Found: ${fandomTropes.length} tropes`
    );

    return NextResponse.json({
      tropes: fandomTropes,
      total: fandomTropes.length,
    });
  } catch (error) {
    console.error('Error fetching tropes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tropes' },
      { status: 500 }
    );
  }
}
