import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { pathways } from '@/lib/database/schema';
import {
  pathwayTags,
  pathwayPlotBlocks,
} from '@/lib/database/schemas/pathway-extensions';
import { eq } from 'drizzle-orm';
import { checkAuth } from '@/lib/api/clerk-auth';
import { ValidationEngine } from '@/lib/validation/engine';

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
      fandomId,
      name,
      description,
      tags = [],
      plotBlocks = [],
      isPublic = false,
      isPersisted = false, // Default to session-only
    } = body;

    // Validation
    if (!fandomId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: fandomId, name' },
        { status: 400 }
      );
    }

    // Check authentication for persisted pathways
    let userId: string | null = null;
    if (isPersisted) {
      const authResult = await checkAuth();
      if (!authResult.success) {
        return NextResponse.json(
          { error: 'Authentication required for saved pathways' },
          { status: 401 }
        );
      }
      userId = authResult.userId || null;
    }

    // Visibility validation: public pathways must be persisted
    if (isPublic && !isPersisted) {
      return NextResponse.json(
        {
          error: 'Public pathways must be saved (isPersisted must be true)',
          validationErrors: [
            {
              type: 'VISIBILITY_ERROR',
              message: 'Cannot make a session-only pathway public',
              field: 'isPublic',
              severity: 'error',
            },
          ],
        },
        { status: 400 }
      );
    }

    // Run validation engine
    const validationEngine = new ValidationEngine();
    const validationResult = validationEngine.validate({
      fandomId,
      applied_tags: tags,
      all_tags: [], // TODO: Load from database
      tag_classes: [], // TODO: Load from database
      metadata: {
        selectedPlotBlocks: plotBlocks,
        allPlotBlocks: [], // TODO: Load from database
      },
    });

    // Return validation errors if invalid
    if (!validationResult.is_valid) {
      return NextResponse.json(
        {
          error: 'Pathway validation failed',
          validationErrors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
        },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Generate ID
    const pathwayId = crypto.randomUUID();

    const pathwayData = {
      id: pathwayId,
      user_id: userId,
      fandom_id: fandomId,
      name,
      description: description || null,
      selected_tags: tags, // Drizzle handles JSON serialization with mode: 'json'
      selected_plot_blocks: plotBlocks, // Drizzle handles JSON serialization
      is_public: isPublic,
      is_persisted: isPersisted,
      vote_count: 0,
      poll_status: 'pending' as const, // Fixed: use valid status value
      version: 1,
      last_edited_by: userId,
      match_count: 0,
      view_count: 0,
    };

    const result = await db
      .insert(pathways)
      .values(pathwayData as any)
      .returning();

    const newPathway = result[0];

    // Insert tags and tropes into junction tables
    if (tags.length > 0) {
      const tagInserts = tags.map((tagId: string, index: number) => ({
        pathway_id: pathwayId,
        tag_id: tagId,
        position: index,
      }));
      await db.insert(pathwayTags).values(tagInserts);
    }

    if (plotBlocks.length > 0) {
      const plotBlockInserts = plotBlocks.map(
        (blockId: string, index: number) => ({
          pathway_id: pathwayId,
          plot_block_id: blockId,
          position: index,
        })
      );
      await db.insert(pathwayPlotBlocks).values(plotBlockInserts);
    }

    return NextResponse.json({
      pathway: newPathway,
      message: 'Pathway created successfully',
      validationResult: {
        is_valid: true,
        errors: [],
        warnings: validationResult.warnings,
      },
    });
  } catch (error) {
    console.error('Error creating pathway:', error);
    return NextResponse.json(
      { error: 'Failed to create pathway', message: String(error) },
      { status: 500 }
    );
  }
}
