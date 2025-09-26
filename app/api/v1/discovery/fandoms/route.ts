import { NextResponse } from 'next/server';
import { FandomModel } from '@/lib/database/models';

export const dynamic = 'force-dynamic'; // Ensure fresh data for public API

/**
 * GET /api/v1/discovery/fandoms
 *
 * Public endpoint returning all active fandoms for story discovery.
 * Used by the discovery interface for fandom selection.
 *
 * Performance target: <100ms response time
 * Caching: Server-side rendered with Next.js edge caching
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // Get all active fandoms with basic metadata
    const fandoms = await FandomModel.getAllActive();

    // Add performance metrics for monitoring
    const executionTime = Date.now() - startTime;

    // Transform for public API format
    const response = {
      fandoms: fandoms.map(fandom => ({
        id: fandom.id,
        name: fandom.name,
        slug: fandom.slug,
        description: fandom.description,
        storyCount: 0, // Will be populated by aggregation query later
        tagCount: 0, // Will be populated by aggregation query later
        plotBlockCount: 0, // Will be populated by aggregation query later
        isActive: fandom.is_active,
        lastUpdated: fandom.updated_at,
      })),
      metadata: {
        total: fandoms.length,
        executionTime,
        timestamp: new Date().toISOString(),
      },
    };

    // Add performance monitoring headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache
      'X-Execution-Time': executionTime.toString(),
      'X-Total-Count': fandoms.length.toString(),
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching fandoms:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch fandoms',
        message: 'An error occurred while retrieving fandom data',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

/**
 * OPTIONS /api/v1/discovery/fandoms
 *
 * CORS preflight handler for public API access
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
