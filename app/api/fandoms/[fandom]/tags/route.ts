import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { apiResponseSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * Get tags for a specific fandom
 * GET /api/fandoms/[fandom]/tags
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fandom: string }> }
) {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    const { fandom } = await params;
    const fandomSlug = fandom;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const tagClass = searchParams.get('class') || '';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Find the fandom first
    const fandomRecord = await db.query.fandoms.findFirst({
      where: (fandoms, { eq }) => eq(fandoms.slug, fandomSlug),
    });

    if (!fandomRecord) {
      return NextResponse.json({ error: 'Fandom not found' }, { status: 404 });
    }

    // Get tags for this fandom with optional filtering
    const tags = await db.query.tags.findMany({
      where: (tags, { eq, and, like }) => {
        const conditions = [eq(tags.fandom_id, fandomRecord.id)];

        if (search) {
          conditions.push(like(tags.name, `%${search}%`));
        }

        if (tagClass) {
          conditions.push(eq(tags.tag_class_id, tagClass));
        }

        return and(...conditions);
      },
      limit,
      offset,
      orderBy: (tags, { asc }) => [asc(tags.name)],
    });

    // Get total count for pagination
    const totalTags = await db.query.tags.findMany({
      where: (tags, { eq }) => eq(tags.fandom_id, fandomRecord.id),
    });
    const total = totalTags.length;

    const response = {
      data: tags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Validate response
    const validatedResponse = apiResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('Error fetching tags:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid response format', details: error.issues },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
