import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { pathways } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

// GET /api/pathways - Get all pathways (optionally filtered by user)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public');

    const db = getDatabase();
    let query = db.select().from(pathways);

    if (userId) {
      query = query.where(eq(pathways.user_id, userId)) as typeof query;
    } else if (isPublic === 'true') {
      query = query.where(eq(pathways.is_public, true)) as typeof query;
    }

    const results = await query.all();

    return NextResponse.json({
      pathways: results,
      total: results.length,
    });
  } catch (error) {
    console.error('Error fetching pathways:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pathways' },
      { status: 500 }
    );
  }
}

// POST /api/pathways - Create a new pathway
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      userId,
      fandomId,
      name,
      description,
      selectedTags,
      selectedPlotBlocks,
      isPublic,
    } = body;

    // Validation
    if (!userId || !fandomId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, fandomId, name' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Generate ID if not provided
    const pathwayId = id || crypto.randomUUID();

    const pathwayData = {
      id: pathwayId,
      user_id: userId,
      fandom_id: fandomId,
      name,
      description: description || null,
      selected_tags: JSON.stringify(selectedTags || []),
      selected_plot_blocks: JSON.stringify(selectedPlotBlocks || []),
      is_public: isPublic || false,
      match_count: 0,
      view_count: 0,
    };

    const result = await db
      .insert(pathways)
      .values(pathwayData as any)
      .returning();

    const newPathway = result[0];

    return NextResponse.json({
      pathway: newPathway,
      message: 'Pathway created successfully',
    });
  } catch (error) {
    console.error('Error creating pathway:', error);
    return NextResponse.json(
      { error: 'Failed to create pathway', message: String(error) },
      { status: 500 }
    );
  }
}
