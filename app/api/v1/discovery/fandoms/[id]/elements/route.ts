import { NextResponse } from 'next/server';
import { TagModel, PlotBlockModel } from '@/lib/database/models';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/discovery/fandoms/[id]/elements
 *
 * Returns all tags and plot blocks for a specific fandom.
 * Used by the discovery interface for pathway building.
 *
 * Performance target: <200ms response time
 * Caching: 10 minute cache with stale-while-revalidate
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const fandomSlug = resolvedParams.id;

  try {
    const startTime = Date.now();

    // Convert slug to numeric ID if needed, or use slug directly
    // For now, treating id as fandom slug for SEO-friendly URLs

    // Get tags organized by category
    const tags = await TagModel.getByFandom(fandomSlug);
    const tagCategories = await TagModel.getCategoriesByFandom(fandomSlug);

    // Get plot blocks with hierarchy
    const rootPlotBlocks = await PlotBlockModel.getRootBlocks(fandomSlug);

    // Build hierarchical plot block tree
    const plotBlockTree = await Promise.all(
      rootPlotBlocks.map(async block => {
        const children = await PlotBlockModel.getChildBlocks(block.id);
        return {
          ...block,
          children: children || [],
        };
      })
    );

    const executionTime = Date.now() - startTime;

    // Transform for discovery interface format
    const response = {
      fandom: fandomSlug,
      elements: {
        tags: {
          byCategory: tagCategories.map(categoryName => ({
            category: categoryName,
            description: '', // Categories are just strings for now
            tags: tags
              .filter(tag => tag.category === categoryName)
              .map(tag => ({
                id: tag.id,
                name: tag.name,
                description: tag.description,
                category: tag.category,
                requires: tag.requires || [],
                enhances: tag.enhances || [],
                conflicts: [], // Not implemented in current schema
                isActive: tag.is_active,
              })),
          })),
          total: tags.length,
        },
        plotBlocks: {
          tree: plotBlockTree.map(block => ({
            id: block.id,
            name: block.name,
            description: block.description,
            category: block.category,
            requires: block.requires || [],
            enhances: block.enhances || [],
            conflicts: [], // Not implemented in current schema
            children:
              block.children?.map(child => ({
                id: child.id,
                name: child.name,
                description: child.description,
                parentId: child.parent_id,
              })) || [],
            isActive: block.is_active,
          })),
          total: rootPlotBlocks.length,
        },
      },
      metadata: {
        fandom: fandomSlug,
        tagCount: tags.length,
        plotBlockCount: rootPlotBlocks.length,
        categories: tagCategories.length,
        executionTime,
        timestamp: new Date().toISOString(),
      },
    };

    // Performance-optimized caching headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800', // 10 min cache
      'X-Execution-Time': executionTime.toString(),
      'X-Fandom': fandomSlug,
      'X-Tag-Count': tags.length.toString(),
      'X-Plot-Block-Count': rootPlotBlocks.length.toString(),
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(`Error fetching elements for fandom ${fandomSlug}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to fetch fandom elements',
        message: 'An error occurred while retrieving tags and plot blocks',
        fandom: fandomSlug,
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
 * OPTIONS /api/v1/discovery/fandoms/[id]/elements
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
