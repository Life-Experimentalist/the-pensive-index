import { NextRequest, NextResponse } from 'next/server';
import { ContentManagementService } from '@/lib/admin/services/ContentManagementService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Request validation schemas
const RevertVersionSchema = z.object({
  version_id: z.number(),
  revert_reason: z.string().optional(),
});

type RevertVersionRequest = z.infer<typeof RevertVersionSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Await params in Next.js 15
    const resolvedParams = await params;

    // Validate content ID
    const contentId = parseInt(resolvedParams.id);
    if (isNaN(contentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid content ID format',
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const include_data = searchParams.get('include_data') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Initialize service
    const contentManagementService = new ContentManagementService();

    // Get content version history
    const result = await contentManagementService.getContentWithHistory(
      contentId
    );

    if (!result.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content not found',
        },
        { status: 404 }
      );
    }

    // Paginate version history (use 'versions' property from actual service)
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVersions = result.versions.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: {
        content: {
          id: result.content.id,
          content_type: result.content.content_type,
          content_name: result.content.content_name,
          current_version: result.content.version,
          fandom_id: result.content.fandom_id,
          status: result.content.status,
          created_by: result.content.created_by,
          created_at: result.content.created_at,
          updated_at: result.content.updated_at,
        },
        version_history: paginatedVersions.map((version: any) => ({
          id: version.id,
          version_number: version.version_number,
          content_data: include_data ? version.content_data : undefined,
          change_summary: version.change_summary,
          change_type: version.change_type,
          created_by: version.created_by,
          created_at: version.created_at,
          approved_by: version.approved_by,
          approved_at: version.approved_at,
          is_current: version.is_current,
          revert_reason: version.revert_reason,
        })),
        pagination: {
          page,
          limit,
          total: result.versions.length,
          total_pages: Math.ceil(result.versions.length / limit),
        },
        statistics: {
          total_versions: result.versions.length,
          current_version: result.content.version,
          first_version_date:
            result.versions[result.versions.length - 1]?.created_at,
          latest_version_date: result.versions[0]?.created_at,
          total_reverts: result.versions.filter(
            (v: any) => v.change_type === 'revert'
          ).length,
        },
      },
    });
  } catch (error) {
    console.error('Content version history error:', error);

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Await params in Next.js 15
    const resolvedParams = await params;

    // Validate content ID
    const contentId = parseInt(resolvedParams.id);
    if (isNaN(contentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid content ID format',
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = RevertVersionSchema.parse(body);

    // Initialize service
    const contentManagementService = new ContentManagementService();

    // Revert to specified version using actual service signature
    const result = await contentManagementService.revertContent(
      contentId,
      validatedData.version_id,
      userId
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          content_id: contentId,
          reverted_to_version: validatedData.version_id,
          new_version_number: result.version?.version_number,
          new_version_id: result.version?.id,
          revert_reason: validatedData.revert_reason,
          reverted_by: userId,
          reverted_at: new Date().toISOString(),
          revert_successful: result.success,
        },
        message:
          result.message ||
          `Content reverted to version ${validatedData.version_id}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Content revert error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Await params in Next.js 15
    const resolvedParams = await params;

    // Validate content ID
    const contentId = parseInt(resolvedParams.id);
    if (isNaN(contentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid content ID format',
        },
        { status: 400 }
      );
    }

    // Parse query parameters for version-specific deletion
    const { searchParams } = new URL(request.url);
    const version_id = searchParams.get('version_id');
    const delete_all_versions = searchParams.get('delete_all') === 'true';

    // Initialize service
    const contentManagementService = new ContentManagementService();

    if (delete_all_versions) {
      // Delete entire content including all versions using actual service signature
      const result = await contentManagementService.deleteContent(
        contentId,
        userId
      );

      return NextResponse.json({
        success: true,
        data: {
          content_id: contentId,
          deletion_type: 'complete',
          deleted_by: userId,
          deleted_at: new Date().toISOString(),
          deletion_successful: result.success,
        },
        message: result.message || `Content ${contentId} deleted successfully`,
      });
    } else if (version_id) {
      // Delete specific version (not implemented in current service)
      return NextResponse.json(
        {
          success: false,
          error: 'Specific version deletion not yet implemented',
        },
        { status: 501 }
      );
    } else {
      // Delete current content using actual service signature
      const result = await contentManagementService.deleteContent(
        contentId,
        userId
      );

      return NextResponse.json({
        success: true,
        data: {
          content_id: contentId,
          deletion_type: 'standard',
          deleted_by: userId,
          deleted_at: new Date().toISOString(),
          deletion_successful: result.success,
        },
        message: result.message || `Content ${contentId} deleted successfully`,
      });
    }
  } catch (error) {
    console.error('Content deletion error:', error);

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
