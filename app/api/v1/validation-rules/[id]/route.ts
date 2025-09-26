import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { ResponseHandler, withErrorHandling } from '@/lib/api/responses';
import { CommonMiddleware } from '@/lib/api/middleware';
import { ErrorFactory } from '@/lib/errors';
import { eq } from 'drizzle-orm';
import {
  validationRules,
  ruleConditions,
  ruleActions,
} from '@/lib/database/schema';
import { UpdateValidationRuleRequestSchema } from '@/types/validation-rules';

/**
 * GET /api/v1/validation-rules/[id]
 * Get a specific validation rule by ID
 */
export const GET = CommonMiddleware.admin(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const ruleId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = dbManager.getConnection();

      const rule = await db.query.validationRules.findFirst({
        where: eq(validationRules.id, ruleId),
        with: {
          conditions: {
            orderBy: (conditions: any, { asc }: any) => [
              asc(conditions.orderIndex),
            ],
          },
          actions: {
            orderBy: (actions: any, { asc }: any) => [asc(actions.orderIndex)],
          },
        },
      });

      if (!rule) {
        throw ErrorFactory.notFound('Validation Rule', ruleId);
      }

      return ResponseHandler.success({ rule });
    }
  )
);

/**
 * PUT /api/v1/validation-rules/[id]
 * Update a validation rule
 */
export const PUT = CommonMiddleware.admin(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const ruleId = params.id;
      const body = await request.json();

      // Validate request body
      const validatedData = UpdateValidationRuleRequestSchema.parse(body);

      const dbManager = DatabaseManager.getInstance();
      const db = dbManager.getConnection();

      // Check if rule exists
      const existingRule = await db.query.validationRules.findFirst({
        where: eq(validationRules.id, ruleId),
      });

      if (!existingRule) {
        throw ErrorFactory.notFound('Validation Rule', ruleId);
      }

      // Update the rule
      const [updatedRule] = await db
        .update(validationRules)
        .set({
          ...validatedData,
          // updatedBy and updatedAt are handled by database defaults
        })
        .where(eq(validationRules.id, ruleId))
        .returning();

      return ResponseHandler.success({
        rule: updatedRule,
        message: 'Validation rule updated successfully',
      });
    }
  )
);

/**
 * DELETE /api/v1/validation-rules/[id]
 * Delete a validation rule
 */
export const DELETE = CommonMiddleware.admin(
  withErrorHandling(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const ruleId = params.id;

      const dbManager = DatabaseManager.getInstance();
      const db = dbManager.getConnection();

      // Check if rule exists
      const existingRule = await db.query.validationRules.findFirst({
        where: eq(validationRules.id, ruleId),
      });

      if (!existingRule) {
        throw ErrorFactory.notFound('Validation Rule', ruleId);
      }

      // Delete the rule (cascade will handle conditions and actions)
      await db.delete(validationRules).where(eq(validationRules.id, ruleId));

      return ResponseHandler.success({
        message: 'Validation rule deleted successfully',
        deletedRuleId: ruleId,
      });
    }
  )
);
