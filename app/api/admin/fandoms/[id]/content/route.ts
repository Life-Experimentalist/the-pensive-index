import { NextRequest, NextResponse } from 'next/server';
import { ContentManagementService } from '@/lib/admin/services/ContentManagementService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Request validation schema
const AddContentSchema = z.object({
  content_type: z.enum(['tag', 'plot_block', 'character', 'validation_rule']),
  content_data: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    parent_id: z.number().optional(),
    metadata: z.record(z.any()).optional(),
    validation_rules: z.array(z.string()).optional(),
    hierarchy_level: z.number().optional(),
  }),
  approval_required: z.boolean().optional().default(true),
  notes: z.string().optional(),
});

type AddContentRequest = z.infer<typeof AddContentSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const resolvedParams = await params;
    const fandomId = parseInt(resolvedParams.id);
    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID format',
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AddContentSchema.parse(body);

    // Initialize service
    const contentManagementService = new ContentManagementService();

    // Add content to fandom using createContent method
    const result = await contentManagementService.createContent({
      fandom_id: fandomId,
      content_type: validatedData.content_type,
      content_name: validatedData.content_data.name,
      content_slug: validatedData.content_data.name
        .toLowerCase()
        .replace(/\s+/g, '-'),
      content_data: validatedData.content_data,
      category: validatedData.content_data.metadata?.category,
      subcategory: validatedData.content_data.metadata?.subcategory,
      require_approval: validatedData.approval_required,
      created_by: userId,
    });

    // Return success response based on actual service response structure
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.content?.id || 'unknown',
          fandom_id: fandomId,
          content_type: validatedData.content_type,
          name: validatedData.content_data.name,
          status: result.approval ? 'pending_approval' : 'active',
          approval_id: result.approval?.id,
          validation_errors: result.validation_results.errors,
          validation_warnings: result.validation_results.warnings,
          created_by: userId,
          created_at: result.content?.created_at || new Date().toISOString(),
        },
        message: result.approval
          ? 'Content added and submitted for approval'
          : 'Content added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Content creation error:', error);

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const resolvedParams = await params;
    const fandomId = parseInt(resolvedParams.id);
    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID format',
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('type') as
      | 'tag'
      | 'plot_block'
      | 'character'
      | 'validation_rule'
      | null;
    const status = searchParams.get('status') as
      | 'active'
      | 'pending'
      | 'rejected'
      | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Initialize service
    const contentManagementService = new ContentManagementService();

    // Search fandom content using searchContent method
    const searchQuery = searchParams.get('search') || '';
    const result = await contentManagementService.searchContent(
      fandomId,
      searchQuery,
      {
        content_type: contentType || undefined,
        status: status || undefined,
        limit,
        offset: (page - 1) * limit,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        content_items: result.content.map((item: any) => ({
          id: item.id,
          content_type: item.content_type,
          name: item.content_name || item.name,
          description: item.description,
          metadata: item.content_data,
          status: item.status,
          version: item.version,
          created_by: item.created_by,
          created_at: item.created_at,
          updated_at: item.updated_at,
        })),
        pagination: {
          page,
          limit,
          total: result.total,
          total_pages: Math.ceil(result.total / limit),
        },
        search_query: result.search_query,
      },
    });
  } catch (error) {
    console.error('Content list error:', error);

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const resolvedParams = await params;
    const fandomId = parseInt(resolvedParams.id);
    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID format',
        },
        { status: 400 }
      );
    }

    // Parse and validate request body for bulk updates
    const BulkUpdateSchema = z.object({
      content_updates: z.array(
        z.object({
          content_id: z.number(),
          operation: z.enum(['update', 'activate', 'deactivate', 'delete']),
          data: z.record(z.any()).optional(),
          notes: z.string().optional(),
        })
      ),
    });

    const body = await request.json();
    const validatedData = BulkUpdateSchema.parse(body);

    // Initialize service
    const contentManagementService = new ContentManagementService();

    // Process bulk updates using performBulkOperation
    const results = await contentManagementService.performBulkOperation({
      operation: 'update',
      items: validatedData.content_updates,
      options: { fandom_id: fandomId },
      performed_by: userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        updated_count: results.success,
        failed_count: results.failed,
        errors: results.errors,
        results: results.results,
      },
      message: `Bulk update completed: ${results.success} successful, ${results.failed} failed`,
    });
  } catch (error) {
    console.error('Bulk content update error:', error);

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
