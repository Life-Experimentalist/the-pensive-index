import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { ValidationEngine } from '@/lib/validation/engine';
import { ErrorFactory } from '@/lib/errors';
import { eq, and } from 'drizzle-orm';
import { fandoms, tags, plotBlocks, tagClasses } from '@/lib/database/schema';
import { z } from 'zod';

/**
 * Fandom-specific validation request schema
 */
const fandomValidationRequestSchema = z.object({
  tags: z.array(z.string()).optional().default([]),
  plot_blocks: z.array(z.string()).optional().default([]),
  pathway: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['tag', 'plot_block']),
        position: z.number().optional(),
      })
    )
    .optional()
    .default([]),
  validation_type: z
    .enum(['full', 'conflicts_only', 'dependencies_only'])
    .optional()
    .default('full'),
});

/**
 * POST /api/v1/fandoms/[fandomId]/validate
 * Validate a pathway within a specific fandom context
 */
export const POST = CommonMiddleware.public(
  withErrorHandling(
    async (
      request: NextRequest,
      { params }: { params: { fandomId: string } }
    ) => {
      const fandomId = params.fandomId;
      const body = await request.json();
      const validatedData = fandomValidationRequestSchema.parse(body);

      const dbManager = DatabaseManager.getInstance();
      const db = dbManager.getConnection();

      // Verify fandom exists
      const fandom = await db.query.fandoms.findFirst({
        where: eq(fandoms.id, fandomId),
      });

      if (!fandom) {
        throw ErrorFactory.notFound('Fandom', fandomId);
      }

      // Load tag classes for this fandom
      const fandomTagClasses = await db.query.tagClasses.findMany({
        where: and(
          eq(tagClasses.fandom_id, fandomId),
          eq(tagClasses.is_active, true)
        ),
      });

      // Load plot blocks for this fandom
      const fandomPlotBlocks = await db.query.plotBlocks.findMany({
        where: and(
          eq(plotBlocks.fandom_id, fandomId),
          eq(plotBlocks.is_active, true)
        ),
      });

      // Verify all provided tag IDs exist in this fandom
      if (validatedData.tags.length > 0) {
        const validTagIds = await db.query.tags.findMany({
          where: and(eq(tags.fandom_id, fandomId), eq(tags.is_active, true)),
          columns: { id: true },
        });

        const validTagIdSet = new Set(validTagIds.map(tag => tag.id));
        const invalidTags = validatedData.tags.filter(
          tagId => !validTagIdSet.has(tagId)
        );

        if (invalidTags.length > 0) {
          throw ErrorFactory.businessRule(
            'invalid_tags',
            `Invalid tag IDs for fandom ${fandomId}: ${invalidTags.join(', ')}`
          );
        }
      }

      // Verify all provided plot block IDs exist in this fandom
      if (validatedData.plot_blocks.length > 0) {
        const validPlotBlockIdSet = new Set(fandomPlotBlocks.map(pb => pb.id));
        const invalidPlotBlocks = validatedData.plot_blocks.filter(
          pbId => !validPlotBlockIdSet.has(pbId)
        );

        if (invalidPlotBlocks.length > 0) {
          throw ErrorFactory.businessRule(
            'invalid_plot_blocks',
            `Invalid plot block IDs for fandom ${fandomId}: ${invalidPlotBlocks.join(
              ', '
            )}`
          );
        }
      }

      // Initialize validation engine with fandom data
      const validationEngine = new ValidationEngine(
        fandomTagClasses.map(tc => ({
          ...tc,
          validation_rules: tc.validation_rules || {},
        })),
        fandomPlotBlocks.map(pb => ({
          ...pb,
          requires: pb.requires || undefined,
          enhances: pb.enhances || undefined,
          conflicts_with: pb.conflicts_with || undefined,
          soft_requires: pb.soft_requires || undefined,
          enabled_by: pb.enabled_by || undefined,
          parent_id: pb.parent_id || undefined,
          children: pb.children || undefined,
          excludes_categories: pb.excludes_categories || undefined,
          max_instances: pb.max_instances || undefined,
        }))
      );

      // Perform validation based on type
      let validationResult;

      switch (validatedData.validation_type) {
        case 'conflicts_only':
          const conflicts = await validationEngine.checkConflicts({
            fandom_id: fandomId,
            items: [
              ...validatedData.tags.map(id => ({ id, type: 'tag' as const })),
              ...validatedData.plot_blocks.map(id => ({
                id,
                type: 'plot_block' as const,
              })),
            ],
          });

          validationResult = {
            is_valid: conflicts.length === 0,
            errors: conflicts
              .filter(c => c.severity === 'error')
              .map(c => ({
                code: 'conflict_error',
                message: c.description,
                field: `${c.item1.type}:${c.item1.id},${c.item2.type}:${c.item2.id}`,
                context: {
                  conflict_type: c.conflict_type,
                  items: [c.item1, c.item2],
                },
              })),
            warnings: conflicts
              .filter(c => c.severity === 'warning')
              .map(c => ({
                code: 'conflict_warning',
                message: c.description,
                field: `${c.item1.type}:${c.item1.id},${c.item2.type}:${c.item2.id}`,
                context: {
                  conflict_type: c.conflict_type,
                  items: [c.item1, c.item2],
                },
              })),
            suggestions: [],
          };
          break;

        case 'dependencies_only':
          // This would implement dependency-only validation
          validationResult = {
            is_valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
          };
          break;

        case 'full':
        default:
          validationResult = await validationEngine.validatePathway({
            fandom_id: fandomId,
            tags: validatedData.tags,
            plot_blocks: validatedData.plot_blocks,
            pathway: validatedData.pathway,
          });
          break;
      }

      return ResponseHandler.success({
        fandom: {
          id: fandom.id,
          name: fandom.name,
        },
        validation_type: validatedData.validation_type,
        ...validationResult,
        metadata: {
          validation_timestamp: new Date().toISOString(),
          total_items:
            validatedData.tags.length + validatedData.plot_blocks.length,
          pathway_length: validatedData.pathway.length,
        },
      });
    }
  )
);
