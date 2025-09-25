import { NextRequest, NextResponse } from 'next/server';
import { TemplateService } from '@/lib/admin/services/TemplateService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Request validation schemas
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  genre: z.string().min(1).max(50),
  base_templates: z.array(z.number()).optional(),
  default_tags: z.array(
    z.object({
      name: z.string(),
      category: z.string().optional(),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
  ),
  default_plot_blocks: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      hierarchy_level: z.number().optional(),
      parent_id: z.number().optional(),
      conditions: z.array(z.string()).optional(),
    })
  ),
  validation_rules: z.array(
    z.object({
      rule_type: z.string(),
      rule_data: z.record(z.any()),
      severity: z
        .enum(['error', 'warning', 'info'])
        .optional()
        .default('error'),
    })
  ),
  metadata: z.record(z.any()).optional(),
  is_public: z.boolean().optional().default(false),
});

type CreateTemplateRequest = z.infer<typeof CreateTemplateSchema>;

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    const search = searchParams.get('search');
    const include_inactive = searchParams.get('include_inactive') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Initialize service
    const templateService = new TemplateService();

    // Get templates list
    const result = await templateService.getTemplates({
      genre: genre || undefined,
      search: search || undefined,
      include_inactive,
      page,
      limit,
      user_id: userId, // For permission filtering
    });

    return NextResponse.json({
      success: true,
      data: {
        templates: result.templates.map((template: any) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          genre: template.genre,
          base_templates: template.base_templates || [],
          usage_count: template.usage_count || 0,
          is_active: template.is_active,
          is_public: template.is_public,
          created_by: template.created_by,
          created_at: template.created_at,
          updated_at: template.updated_at,
          version: template.version,
        })),
        pagination: {
          page,
          limit,
          total: result.total,
          total_pages: Math.ceil(result.total / limit),
        },
        genres: result.available_genres || [],
        statistics: {
          total_templates: result.total,
          public_templates: result.statistics?.public_count || 0,
          private_templates: result.statistics?.private_count || 0,
          by_genre: result.statistics?.by_genre || {},
        },
      },
    });
  } catch (error) {
    console.error('Templates list error:', error);

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

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateTemplateSchema.parse(body);

    // Initialize service
    const templateService = new TemplateService();

    // Create template
    const result = await templateService.createTemplate({
      name: validatedData.name,
      description: validatedData.description,
      genre: validatedData.genre,
      base_template_ids: validatedData.base_templates,
      default_content: {
        tags: validatedData.default_tags,
        plot_blocks: validatedData.default_plot_blocks,
        validation_rules: validatedData.validation_rules,
      },
      metadata: validatedData.metadata,
      is_public: validatedData.is_public,
      created_by: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.template.id,
          name: result.template.name,
          description: result.template.description,
          genre: result.template.genre,
          base_templates: result.template.base_templates || [],
          is_active: result.template.is_active,
          is_public: result.template.is_public,
          version: result.template.version,
          created_by: result.template.created_by,
          created_at: result.template.created_at,
          validation_results: {
            is_valid: result.validation_results.is_valid,
            errors: result.validation_results.errors,
            warnings: result.validation_results.warnings,
          },
        },
        message: `Template "${validatedData.name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Template creation error:', error);

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
