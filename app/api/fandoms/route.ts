import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { fandoms } from '@/lib/database/schema';
import { eq, asc, like, and } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Get all fandoms
 * GET /api/fandoms
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];
    if (activeOnly) {
      conditions.push(eq(fandoms.is_active, true));
    }
    if (search) {
      conditions.push(like(fandoms.name, `%${search}%`));
    }

    // Execute query with pagination
    const whereClause =
      conditions.length > 0
        ? conditions.length === 1
          ? conditions[0]
          : and(...conditions)
        : undefined;

    const fandomsData = await db
      .select()
      .from(fandoms)
      .where(whereClause)
      .orderBy(asc(fandoms.name))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db.select().from(fandoms).where(whereClause);

    const total = totalCount.length;

    const response = {
      fandoms: fandomsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching fandoms:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid response format', details: error.issues },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new fandom (Admin only)
 * POST /api/fandoms
 */
export function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware to check admin role
    // For now, return method not allowed
    return NextResponse.json(
      { error: 'Admin authentication required' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error creating fandom:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
