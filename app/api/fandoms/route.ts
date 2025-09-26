import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { apiResponseSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * Get all fandoms
 * GET /api/fandoms
 */
export async function GET(request: NextRequest) {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getConnection();

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query with search filter if provided
    let query = db.query.fandoms.findMany({
      limit,
      offset,
      orderBy: (fandoms, { asc }) => [asc(fandoms.name)],
    });

    // If search term provided, add filtering logic here
    // (This would need to be implemented based on your specific search requirements)

    const fandoms = await query;

    // Get total count for pagination
    const totalCount = await db.query.fandoms.findMany();
    const total = totalCount.length;

    const response = {
      data: fandoms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Validate response against schema
    const validatedResponse = apiResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error('Error fetching fandoms:', error);

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
