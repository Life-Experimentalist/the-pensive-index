import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { ValidationEngine } from '@/lib/validation/engine';
import { ErrorFactory } from '@/lib/errors';
import { eq, and } from 'drizzle-orm';
import { fandoms, tagClasses } from '@/lib/database/schema';
import { z } from 'zod';

/**
 * Validation request schema
 */
const validationRequestSchema = z.object({
  fandom_id: z.string(),
  tags: z.array(z.string()).optional().default([]),
  plot_blocks: z.array(z.string()).optional().default([]),
  pathway: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['tag', 'plot_block']),
      })
    )
    .optional()
    .default([]),
});

/**
 * POST /api/v1/validation/validate
 * Validate a collection of tags and plot blocks
 */
export const POST = CommonMiddleware.public(
  withErrorHandling(async (request: NextRequest) => {
    const body = await request.json();
    const validatedData = validationRequestSchema.parse(body);

    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Verify fandom exists
    const fandom = await db.query.fandoms.findFirst({
      where: eq(fandoms.id, validatedData.fandom_id),
    });

    if (!fandom) {
      throw ErrorFactory.notFound('Fandom', validatedData.fandom_id);
    }

    // Initialize validation engine
    const validationEngine = new ValidationEngine();

    // Perform basic validation
    const validationContext = {
      fandom_id: validatedData.fandom_id,
      tags: validatedData.tags,
      plot_blocks: validatedData.plot_blocks,
      pathway: validatedData.pathway,
    };

    // For now, return a simple validation result structure
    // This would be expanded with actual validation logic
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    return ResponseHandler.success({
      is_valid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      suggestions: validationResult.suggestions,
      metadata: {
        validation_timestamp: new Date().toISOString(),
        fandom_id: validatedData.fandom_id,
        total_items:
          validatedData.tags.length + validatedData.plot_blocks.length,
      },
    });
  })
);

/**
 * POST /api/v1/validation/conflicts
 * Check for conflicts between specific items
 */
export const conflictsHandler = CommonMiddleware.public(
  withErrorHandling(async (request: NextRequest) => {
    const body = await request.json();

    const conflictRequestSchema = z.object({
      fandom_id: z.string(),
      item_ids: z.array(z.string()),
      item_types: z.array(z.enum(['tag', 'plot_block'])),
    });

    const validatedData = conflictRequestSchema.parse(body);

    if (validatedData.item_ids.length !== validatedData.item_types.length) {
      throw ErrorFactory.validation(
        'Item IDs and types arrays must have the same length'
      );
    }

    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Verify fandom exists
    const fandom = await db.query.fandoms.findFirst({
      where: eq(fandoms.id, validatedData.fandom_id),
    });

    if (!fandom) {
      throw ErrorFactory.notFound('Fandom', validatedData.fandom_id);
    }

    // Initialize validation engine
    const validationEngine = new ValidationEngine();

    // For now, return basic conflict structure
    // This would be expanded with actual conflict detection logic
    const conflicts: Array<{
      type: string;
      source_id: string;
      target_id: string;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    return ResponseHandler.success({
      conflicts,
      has_conflicts: conflicts.length > 0,
      metadata: {
        check_timestamp: new Date().toISOString(),
        fandom_id: validatedData.fandom_id,
        items_checked: validatedData.item_ids.length,
      },
    });
  })
);

/**
 * GET /api/v1/validation/rules/[fandom_id]
 * Get validation rules for a specific fandom
 */
export const rulesHandler = CommonMiddleware.public(
  withErrorHandling(
    async (
      request: NextRequest,
      { params }: { params: { fandom_id: string } }
    ) => {
      const fandomId = params.fandom_id;

      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

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
