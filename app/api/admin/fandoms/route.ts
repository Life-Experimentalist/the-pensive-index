import { NextRequest, NextResponse } from 'next/server';
import {
  FandomCreationService,
  type FandomCreationOptions,
} from '@/lib/admin/services/FandomCreationService';
import { ContentValidationService } from '@/lib/admin/services/ContentValidationService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Request validation schema
const CreateFandomSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  template_id: z.number().optional(),
  custom_config: z
    .object({
      default_tags: z.array(z.string()),
      default_plot_blocks: z.array(z.string()),
      validation_rules: z.array(z.any()),
    })
    .optional(),
  taxonomy_overrides: z.record(z.any()).optional(),
});

type CreateFandomRequest = z.infer<typeof CreateFandomSchema>;

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication once auth system is configured
    // For now, use placeholder user ID for development
    const userId = 'dev-user-id';

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateFandomSchema.parse(body);

    // Initialize services
    // Create fandom creation options
    const options: FandomCreationOptions = {
      name: validatedData.name,
      slug: validatedData.slug,
      description: validatedData.description,
      template_id: validatedData.template_id,
      template_customizations: validatedData.taxonomy_overrides,
      initial_content: validatedData.custom_config
        ? {
            tags: validatedData.custom_config.default_tags?.map(tag => ({
              name: tag,
            })),
            plotBlocks: validatedData.custom_config.default_plot_blocks?.map(
              pb => ({ name: pb })
            ),
            validationRules: validatedData.custom_config.validation_rules,
          }
        : undefined,
      created_by: userId,
    };

    // Create fandom using the service
    const result = await FandomCreationService.createFandom(options);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.fandom.id,
          name: result.fandom.name,
          slug: result.fandom.slug,
          description: result.fandom.description,
          template_id: result.fandom.template_id,
          template_version: result.fandom.template_version,
          status: result.fandom.is_active ? 'active' : 'draft',
          created_by: result.fandom.created_by,
          created_at: result.fandom.created_at,
        },
        message: `Fandom "${validatedData.name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Fandom creation error:', error);

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

export function GET(request: NextRequest) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;

    // Simple response for now - this would integrate with the service layer
    return NextResponse.json({
      success: true,
      data: {
        fandoms: [], // TODO: Implement list functionality in service
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0,
        },
      },
    });
  } catch (error) {
    console.error('Fandoms list error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
