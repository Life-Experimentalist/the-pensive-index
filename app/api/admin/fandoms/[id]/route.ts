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
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate route parameters
    const validatedParams = FandomParamsSchema.parse(params);
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

// TODO: Implement PUT and DELETE methods once service layer supports them
// These would handle fandom updates and deletion with proper validation
