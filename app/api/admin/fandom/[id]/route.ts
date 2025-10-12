import { NextRequest, NextResponse } from 'next/server';
import { FandomCreationService } from '@/lib/admin/services/FandomCreationService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Route parameter validation
const FandomParamsSchema = z.object({
  id: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate route parameters
    const resolvedParams = await params;
    const validatedParams = FandomParamsSchema.parse(resolvedParams);
    const fandomId = parseInt(validatedParams.id);

    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID format',
        },
        { status: 400 }
      );
    }

    // Initialize service
    const fandomCreationService = new FandomCreationService();

    // Get fandom creation status (this method exists in the service)
    const fandomStatus = await fandomCreationService.getFandomCreationStatus(
      fandomId
    );

    if (!fandomStatus.fandom) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fandom not found',
        },
        { status: 404 }
      );
    }

    // Return fandom information using actual service response structure
    return NextResponse.json({
      success: true,
      data: {
        id: fandomId,
        name: fandomStatus.fandom.name || 'Unknown',
        slug: fandomStatus.fandom.slug || 'unknown',
        description: fandomStatus.fandom.description,
        template_id: fandomStatus.fandom.template_id,
        template_name: fandomStatus.template_info?.name,
        custom_taxonomy: fandomStatus.fandom.custom_taxonomy || {},
        content_stats: {
          tags_count: fandomStatus.content_summary.by_type?.tag || 0,
          plot_blocks_count:
            fandomStatus.content_summary.by_type?.plot_block || 0,
          pending_approvals: fandomStatus.content_summary.pending_approval || 0,
        },
        version_info: {
          current_version: fandomStatus.fandom.version || 1,
          last_updated:
            fandomStatus.fandom.updated_at || new Date().toISOString(),
          last_updated_by:
            fandomStatus.fandom.updated_by || fandomStatus.fandom.created_by,
        },
        created_by: fandomStatus.fandom.created_by,
        created_at: fandomStatus.fandom.created_at,
        updated_at: fandomStatus.fandom.updated_at,
      },
    });
  } catch (error) {
    console.error('Fandom details error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID',
        },
        { status: 400 }
      );
    }

    // Handle business logic errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/fandom/[id] - Update fandom
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication and ProjectAdmin role check
    const resolvedParams = await params;
    const fandomId = parseInt(resolvedParams.id);

    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, slug, description, is_active } = body;

    // Validate slug format if provided
    if (slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Slug must be lowercase with hyphens only',
          },
          { status: 400 }
        );
      }
    }

    const { getDatabase } = await import('@/lib/database');
    const { fandoms } = await import('@/lib/database/schema');
    const { eq } = await import('drizzle-orm');

    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check if fandom exists
    const [existing] = await db
      .select()
      .from(fandoms)
      .where(eq(fandoms.id, fandomId))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fandom not found',
        },
        { status: 404 }
      );
    }

    // Check if slug is taken by another fandom
    if (slug && slug !== existing.slug) {
      const [duplicate] = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.slug, slug))
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: 'A fandom with this slug already exists',
          },
          { status: 409 }
        );
      }
    }

    // Update fandom
    const [updated] = await db
      .update(fandoms)
      .set({
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description: description || null }),
        ...(is_active !== undefined && { is_active }),
        updated_at: Math.floor(Date.now() / 1000),
      })
      .where(eq(fandoms.id, fandomId))
      .returning();

    return NextResponse.json({
      success: true,
      fandom: updated,
      message: 'Fandom updated successfully',
    });
  } catch (error) {
    console.error('Error updating fandom:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update fandom',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/fandom/[id] - Delete fandom
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication and ProjectAdmin role check
    const resolvedParams = await params;
    const fandomId = parseInt(resolvedParams.id);

    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID',
        },
        { status: 400 }
      );
    }

    const { getDatabase } = await import('@/lib/database');
    const { fandoms, tags, plotBlocks, storySubmissions } = await import(
      '@/lib/database/schema'
    );
    const { eq, sql } = await import('drizzle-orm');

    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check if fandom exists
    const [existing] = await db
      .select()
      .from(fandoms)
      .where(eq(fandoms.id, fandomId))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fandom not found',
        },
        { status: 404 }
      );
    }

    // Get counts for confirmation message
    const fandomIdStr = String(fandomId);
    const [tagCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tags)
      .where(eq(tags.fandom_id, fandomIdStr));

    const [plotBlockCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(plotBlocks)
      .where(eq(plotBlocks.fandom_id, fandomIdStr));

    const [submissionCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(storySubmissions)
      .where(eq(storySubmissions.fandom_id, fandomIdStr));

    // Delete fandom (cascade will handle related records)
    await db.delete(fandoms).where(eq(fandoms.id, fandomId));

    return NextResponse.json({
      success: true,
      message: 'Fandom deleted successfully',
      deleted: {
        fandom: existing.name,
        tags: tagCount?.count || 0,
        plot_blocks: plotBlockCount?.count || 0,
        submissions: submissionCount?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error deleting fandom:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete fandom',
      },
      { status: 500 }
    );
  }
}
