import { NextRequest, NextResponse } from 'next/server';
import { ImportExportService } from '@/lib/admin/services/ImportExportService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Request validation schema
const ImportContentSchema = z.object({
  import_format: z.enum(['json', 'csv', 'xml']),
  import_data: z.union([
    z.string(), // Raw string data
    z.array(z.any()), // Parsed array data
    z.record(z.any()), // Parsed object data
  ]),
  import_options: z
    .object({
      validate_before_import: z.boolean().optional().default(true),
      create_missing_categories: z.boolean().optional().default(false),
      update_existing: z.boolean().optional().default(false),
      require_approval: z.boolean().optional().default(true),
      batch_size: z.number().min(1).max(1000).optional().default(50),
    })
    .optional()
    .default({}),
  field_mapping: z.record(z.string()).optional(),
  notes: z.string().optional(),
});

type ImportContentRequest = z.infer<typeof ImportContentSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const fandomId = parseInt(params.id);
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
    const validatedData = ImportContentSchema.parse(body);

    // Initialize service
    const importExportService = new ImportExportService();

    // Prepare import data - convert string data to array if needed
    let contentData = validatedData.import_data;
    if (typeof contentData === 'string') {
      try {
        contentData = JSON.parse(contentData);
      } catch (e) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON data format',
          },
          { status: 400 }
        );
      }
    }

    // Ensure data is an array
    if (!Array.isArray(contentData)) {
      contentData = [contentData];
    }

    // Perform import operation using the actual service method
    const result = await importExportService.importContent(
      fandomId,
      contentData as any[],
      userId
    );

    // Return import results using actual service response structure
    return NextResponse.json(
      {
        success: true,
        data: {
          fandom_id: fandomId,
          status: 'completed',
          summary: {
            total_processed: result.success + result.failed,
            successful: result.success,
            failed: result.failed,
            errors: result.errors,
          },
          import_format: validatedData.import_format,
          notes: validatedData.notes,
          created_at: new Date().toISOString(),
        },
        message: `Import completed: ${result.success} items imported successfully, ${result.failed} failed`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Content import error:', error);

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
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const fandomId = parseInt(params.id);
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
    const status = searchParams.get('status') as
      | 'pending'
      | 'processing'
      | 'completed'
      | 'failed'
      | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // TODO: Implement import history tracking in future version
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      data: {
        import_operations: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0,
        },
        message: 'Import history tracking not yet implemented',
      },
    });
  } catch (error) {
    console.error('Import history error:', error);

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
