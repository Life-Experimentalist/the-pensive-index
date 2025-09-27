import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { ErrorFactory } from '@/lib/errors';
import { eq, and, isNull } from 'drizzle-orm';
import { fandoms, tags, plotBlocks, tagClasses } from '@/lib/database/schema';

/**
 * GET /api/v1/fandoms/[fandomId]/tree
 * Get the complete content tree for a fandom (tags, plot blocks, hierarchies)
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ fandomId: string }> }
    ) => {
      const { fandomId } = await params;
      const { searchParams } = new URL(request.url);
      const includeInactive = searchParams.get('include_inactive') === 'true';

      const dbManager = DatabaseManager.getInstance();
      const db = dbManager.getConnection();

      // Verify fandom exists
      const fandom = await db.query.fandoms.findFirst({
        where: eq(fandoms.id, fandomId),
      });

      if (!fandom) {
        throw ErrorFactory.notFound('Fandom', fandomId);
      }

      // Build filter conditions
      const activeFilter = includeInactive
        ? undefined
        : eq(tags.is_active, true);
      const plotBlockActiveFilter = includeInactive
        ? undefined
        : eq(plotBlocks.is_active, true);
      const tagClassActiveFilter = includeInactive
        ? undefined
        : eq(tagClasses.is_active, true);

      // Get all tag classes for this fandom
      const fandomTagClasses = await db.query.tagClasses.findMany({
        where: tagClassActiveFilter
          ? and(eq(tagClasses.fandom_id, fandomId), tagClassActiveFilter)
          : eq(tagClasses.fandom_id, fandomId),
        orderBy: [tagClasses.name],
      });

      // Get all tags for this fandom, grouped by tag class
      const fandomTags = await db.query.tags.findMany({
        where: activeFilter
          ? and(eq(tags.fandom_id, fandomId), activeFilter)
          : eq(tags.fandom_id, fandomId),
        orderBy: [tags.category, tags.name],
      });

      // Get all plot blocks for this fandom
      const fandomPlotBlocks = await db.query.plotBlocks.findMany({
        where: plotBlockActiveFilter
          ? and(eq(plotBlocks.fandom_id, fandomId), plotBlockActiveFilter)
          : eq(plotBlocks.fandom_id, fandomId),
        orderBy: [plotBlocks.category, plotBlocks.name],
      });

      // Build tag hierarchy by tag class
      const tagsByClass = new Map<string, typeof fandomTags>();
      const unclassifiedTags: typeof fandomTags = [];

      for (const tag of fandomTags) {
        if (tag.tag_class_id) {
          if (!tagsByClass.has(tag.tag_class_id)) {
            tagsByClass.set(tag.tag_class_id, []);
          }
          tagsByClass.get(tag.tag_class_id)?.push(tag);
        } else {
          unclassifiedTags.push(tag);
        }
      }

      // Build plot block tree structure
      const plotBlockTree = buildPlotBlockTree(fandomPlotBlocks);

      // Group plot blocks by category
      const plotBlocksByCategory = new Map<string, typeof fandomPlotBlocks>();
      for (const plotBlock of fandomPlotBlocks) {
        if (!plotBlocksByCategory.has(plotBlock.category)) {
          plotBlocksByCategory.set(plotBlock.category, []);
        }
        plotBlocksByCategory.get(plotBlock.category)?.push(plotBlock);
      }

      // Build the complete tree structure
      const contentTree = {
        fandom: {
          id: fandom.id,
          name: fandom.name,
          description: fandom.description,
          slug: fandom.slug,
        },
        tag_classes: fandomTagClasses.map(tagClass => ({
          ...tagClass,
          tags: tagsByClass.get(tagClass.id) || [],
          tag_count: (tagsByClass.get(tagClass.id) || []).length,
        })),
        unclassified_tags: unclassifiedTags,
        plot_blocks: {
          by_category: Array.from(plotBlocksByCategory.entries()).map(
            ([category, blocks]) => ({
              category,
              blocks,
              count: blocks.length,
            })
          ),
          tree_structure: plotBlockTree,
          total_count: fandomPlotBlocks.length,
        },
        metadata: {
          tree_timestamp: new Date().toISOString(),
          include_inactive: includeInactive,
          total_tag_classes: fandomTagClasses.length,
          total_tags: fandomTags.length,
          total_plot_blocks: fandomPlotBlocks.length,
        },
      };

      return ResponseHandler.success(contentTree);
    }
  )
);

/**
 * Build hierarchical tree structure from plot blocks
 */
function buildPlotBlockTree(plotBlocks: any[]): any[] {
  const plotBlockMap = new Map(
    plotBlocks.map(pb => [pb.id, { ...pb, children: [] }])
  );
  const rootPlotBlocks: any[] = [];

  for (const plotBlock of plotBlocks) {
    const plotBlockWithChildren = plotBlockMap.get(plotBlock.id);

    if (plotBlock.parent_id) {
      const parent = plotBlockMap.get(plotBlock.parent_id);
      if (parent && plotBlockWithChildren) {
        parent.children.push(plotBlockWithChildren);
      }
    } else if (plotBlockWithChildren) {
      rootPlotBlocks.push(plotBlockWithChildren);
    }
  }

  return rootPlotBlocks;
}
