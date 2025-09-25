/**
 * Clone Template API Endpoint
 *
 * Provides API endpoint for cloning rule templates to fandom-specific rules:
 * - POST /api/admin/rule-templates/[id]/clone - Clone template to fandom rule
 * - Allows FandomAdmin to create rules from ProjectAdmin templates
 * - Validates fandom access permissions
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api/clerk-auth';
import { AdminPermissions } from '@/lib/admin/permissions';
import { AdminQueries } from '@/lib/database/admin-queries';
import { getDatabase } from '@/lib/database';

import { z } from 'zod';

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
 * POST /api/admin/rule-templates/[id]/clone
 * Clones a rule template to create a fandom-specific validation rule
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Get session and validate admin access
    const authResult = await checkAdminAuth();
    
    if (!authResult.success) {
      return authResult.response!;
    }

    const user = authResult.user as any;

    if (!AdminPermissions.isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const adminUser = authResult.user;
    const { id: templateId } = await params;

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

    const validationResult = cloneTemplateSchema.safeParse(body);
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

    const cloneData = validationResult.data;

    // Check permission to create rule for target fandom
    const permissionResult = AdminPermissions.validatePermission(
      adminUser,
      'rule:create',
      cloneData.fandomId
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'No permission to create rule for this fandom',
          reason: permissionResult.reason,
        },
        { status: 403 }
      );
    }

    // Get database connection and check template exists
    const db = await getDatabase();
    const adminQueries = new AdminQueries(db);
    const template = await adminQueries.ruleTemplates.findById(templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Rule template not found' },
        { status: 404 }
      );
    }

    // Clone template to create new rule
    const clonedRule = await adminQueries.ruleTemplates.cloneToRule(
      templateId,
      cloneData.fandomId,
      {
        name: cloneData.name,
        priority: cloneData.priority,
        customizations: cloneData.customizations,
      },
      adminUser.id
    );

    return NextResponse.json(
      {
        success: true,
        rule: clonedRule,
        message: 'Template cloned successfully to fandom rule',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error cloning rule template:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
