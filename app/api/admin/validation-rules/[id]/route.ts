/**
 * Individual Validation Rule API Endpoints
 *
 * Provides REST API for individual validation rule operations:
 * - GET /api/admin/validation-rules/[id] - Get specific rule
 * - PUT /api/admin/validation-rules/[id] - Update rule
 * - DELETE /api/admin/validation-rules/[id] - Delete rule
 * - Role-based access control and fandom scoping
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { AdminPermissions } from '@/lib/admin/permissions';
import { AdminQueries } from '@/lib/database/admin-queries';
import { getDatabase } from '@/lib/database';
import type { AdminUser } from '@/types/admin';
import { z } from 'zod';

// Update rule validation schema
const updateRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  appliesTo: z.array(z.string()).optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  conditions: z
    .array(
      z.object({
        type: z.string(),
        target: z.string(),
        operator: z.string(),
        value: z.any(),
        weight: z.number().optional(),
        groupId: z.string().optional(),
        isNegated: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .optional(),
  actions: z
    .array(
      z.object({
        type: z.string(),
        severity: z.string(),
        message: z.string(),
        data: z.record(z.any()).optional(),
        conditionGroup: z.string().optional(),
      })
    )
    .optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/admin/validation-rules/[id]
 * Retrieves a specific validation rule
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and validate admin access
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = user as AdminUser;
    const ruleId = params.id;

    // Get the rule
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const rule = await adminQueries.validationRules.getById(ruleId);

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Validation rule not found' },
        { status: 404 }
      );
    }

    // Check permission to view rule
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'rule:read',
      rule.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to view this rule',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Error fetching validation rule:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/validation-rules/[id]
 * Updates a validation rule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and validate admin access
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = user as AdminUser;
    const ruleId = params.id;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = updateRuleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Get existing rule to check permissions
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const existingRule = await adminQueries.validationRules.getById(ruleId);

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Validation rule not found' },
        { status: 404 }
      );
    }

    // Check permission to update rule
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'rule:update',
      existingRule.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to update this rule',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    // Update the rule
    const updatedRule = await adminQueries.validationRules.update(
      ruleId,
      validationResult.data as any, // Type assertion for complex nested type
      adminUser.id
    );

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    console.error('Error updating validation rule:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/validation-rules/[id]
 * Deletes a validation rule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and validate admin access
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = user as AdminUser;
    const ruleId = params.id;

    // Get existing rule to check permissions
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const existingRule = await adminQueries.validationRules.getById(ruleId);

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Validation rule not found' },
        { status: 404 }
      );
    }

    // Check permission to delete rule
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'rule:delete',
      existingRule.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to delete this rule',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    // Delete the rule
    await adminQueries.validationRules.delete(ruleId, adminUser.id);

    return NextResponse.json({
      success: true,
      message: 'Validation rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting validation rule:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
