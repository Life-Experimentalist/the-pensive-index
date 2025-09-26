import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { ErrorFactory } from '@/lib/errors';
import { eq, and } from 'drizzle-orm';
import { fandoms, tagClasses } from '@/lib/database/schema';

/**
 * GET /api/v1/validation/rules/[fandom_id]
 * Get validation rules for a specific fandom
 */
export const GET = CommonMiddleware.public(
  withErrorHandling(
    async (
      request: NextRequest,
      { params }: { params: { fandom_id: string } }
    ) => {
      const fandomId = params.fandom_id;

      const dbManager = DatabaseManager.getInstance();
      const db = dbManager.getConnection();

      // Verify fandom exists
      const fandom = await db.query.fandoms.findFirst({
        where: eq(fandoms.id, fandomId),
      });

      if (!fandom) {
        throw ErrorFactory.notFound('Fandom', fandomId);
      }

      // Get all tag classes with validation rules for this fandom
      const tagClassesList = await db.query.tagClasses.findMany({
        where: and(
          eq(tagClasses.fandom_id, fandomId),
          eq(tagClasses.is_active, true)
        ),
        columns: {
          id: true,
          name: true,
          validation_rules: true,
        },
      });

      // Get plot block dependencies and conflicts
      // This would require additional schema for plot block relationships
      // For now, return basic structure

      return ResponseHandler.success({
        fandom: {
          id: fandom.id,
          name: fandom.name,
        },
        tag_classes: tagClassesList,
        plot_block_rules: {
          // This would be expanded with actual plot block relationship data
          dependencies: [],
          conflicts: [],
          tree_structure: [],
        },
        metadata: {
          rules_timestamp: new Date().toISOString(),
          total_tag_classes: tagClassesList.length,
        },
      });
    }
  )
);
