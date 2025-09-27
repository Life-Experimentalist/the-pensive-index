/**
 * Individual Rule Template API Endpoints
 *
 * Provides REST API for individual rule template operations:
 * - GET /api/admin/rule-templates/[id] - Get specific template
 * - PUT /api/admin/rule-templates/[id] - Update template (ProjectAdmin only)
 * - DELETE /api/admin/rule-templates/[id] - Delete template (ProjectAdmin only)
 * - POST /api/admin/rule-templates/[id]/clone - Clone template to fandom rule
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api/clerk-auth';
import { AdminPermissions } from '@/lib/admin/permissions';
import { AdminQueries } from '@/lib/database/admin-queries';
import { getDatabase } from '@/lib/database';
import { RuleCategory } from '@/types/admin';

import { z } from 'zod';

// Update template validation schema
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  category: z
    .enum(['conditional', 'exclusivity', 'prerequisite', 'hierarchy', 'custom'])
    .optional(),
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

const cloneTemplateSchema = z.object({
  fandomId: z.string().min(1, 'Fandom ID is required'),
  name: z.string().min(1, 'Name is required').optional(),
  priority: z.number().int().min(1).default(1),
  customizations: z.record(z.any()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/rule-templates/[id]
 * Retrieves a specific rule template
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();

    if (!authResult.success) {
      if (!authResult.response) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        );
      }
      return authResult.response;
    }

    const user = authResult.user;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = authResult.user;
    const { id: templateId } = await params;

    // Only ProjectAdmin can access templates
    if (adminUser.role !== 'ProjectAdmin') {
      return NextResponse.json(
        { success: false, error: 'ProjectAdmin access required for templates' },
        { status: 403 }
      );
    }

    // Get the template
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const template = await adminQueries.ruleTemplates.findById(templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Rule template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error fetching rule template:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/rule-templates/[id]
 * Updates a rule template (ProjectAdmin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();

    if (!authResult.success) {
      if (!authResult.response) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        );
      }
      return authResult.response;
    }

    const user = authResult.user;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = authResult.user;
    const { id: templateId } = await params;

    // Only ProjectAdmin can update templates
    if (adminUser.role !== 'ProjectAdmin') {
      return NextResponse.json(
        {
          success: false,
          error: 'ProjectAdmin access required for template updates',
        },
        { status: 403 }
      );
    }

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

    const validationResult = updateTemplateSchema.safeParse(body);
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

    // Check if template exists
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const existingTemplate = await adminQueries.ruleTemplates.findById(
      templateId
    );

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Rule template not found' },
        { status: 404 }
      );
    }

    // Update the template
    const updatedTemplate = await adminQueries.ruleTemplates.update(
      templateId,
      validationResult.data
    );

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
    });
  } catch (error) {
    console.error('Error updating rule template:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/rule-templates/[id]
 * Deletes a rule template (ProjectAdmin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();

    if (!authResult.success) {
      if (!authResult.response) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        );
      }
      return authResult.response;
    }

    const user = authResult.user;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = authResult.user;
    const { id: templateId } = await params;

    // Only ProjectAdmin can delete templates
    if (adminUser.role !== 'ProjectAdmin') {
      return NextResponse.json(
        {
          success: false,
          error: 'ProjectAdmin access required for template deletion',
        },
        { status: 403 }
      );
    }

    // Check if template exists
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const existingTemplate = await adminQueries.ruleTemplates.findById(
      templateId
    );

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Rule template not found' },
        { status: 404 }
      );
    }

    // Delete the template
    await adminQueries.ruleTemplates.deactivate(templateId);

    return NextResponse.json({
      success: true,
      message: 'Rule template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rule template:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
