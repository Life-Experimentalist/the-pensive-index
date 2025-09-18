/**
 * Testing Sandbox API Endpoints
 *
 * Provides REST API for testing validation rules:
 * - POST /api/admin/testing-sandbox/validate-pathway - Test pathway validation
 * - POST /api/admin/testing-sandbox/test-rule - Test individual rule
 * - Allows safe testing of rules without affecting production data
 * - Supports both ProjectAdmin and FandomAdmin with appropriate scoping
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { AdminPermissions } from '@/lib/admin/permissions';
import { AdminQueries } from '@/lib/database/admin-queries';
import { RuleEngine } from '@/lib/admin/rule-engine';
import { getDatabase } from '@/lib/database';
import type { AdminUser } from '@/types/admin';
import { z } from 'zod';

// Pathway validation test schema
const validatePathwaySchema = z.object({
  fandomId: z.string().min(1, 'Fandom ID is required'),
  pathway: z.object({
    tags: z.array(z.string()).default([]),
    plotBlocks: z.array(z.string()).default([]),
    selections: z.record(z.any()).default({}),
  }),
  ruleIds: z.array(z.string()).optional(), // Specific rules to test
  includeInactive: z.boolean().default(false),
});

// Individual rule test schema
const testRuleSchema = z.object({
  ruleId: z.string().min(1, 'Rule ID is required'),
  testData: z.object({
    tags: z.array(z.string()).default([]),
    plotBlocks: z.array(z.string()).default([]),
    selections: z.record(z.any()).default({}),
  }),
  mockContext: z.record(z.any()).optional(),
});

/**
 * POST /api/admin/testing-sandbox/validate-pathway
 * Tests pathway validation against rules
 */
export async function POST(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);

    if (pathname.endsWith('/validate-pathway')) {
      return handleValidatePathway(request);
    } else if (pathname.endsWith('/test-rule')) {
      return handleTestRule(request);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid endpoint' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in testing sandbox:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle pathway validation testing
 */
async function handleValidatePathway(request: NextRequest) {
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

  const validationResult = validatePathwaySchema.safeParse(body);
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

  const testData = validationResult.data;

  // Check permission to test rules for this fandom
  const permissionResult = AdminPermissions.validatePermission(
    adminUser,
    'rule:read',
    testData.fandomId
  );

  if (!permissionResult.hasPermission) {
    return NextResponse.json(
      {
        success: false,
        error: 'No permission to test rules for this fandom',
        reason: permissionResult.reason,
      },
      { status: 403 }
    );
  }

  // Get database and rules
  const db = await getDatabase();
  const adminQueries = new AdminQueries(db);

  let rules;
  if (testData.ruleIds && testData.ruleIds.length > 0) {
    // Test specific rules
    rules = await Promise.all(
      testData.ruleIds.map(id => adminQueries.validationRules.getById(id))
    );
    rules = rules.filter(Boolean); // Remove null results
  } else {
    // Test all active rules for fandom
    const result = await adminQueries.validationRules.listByFandom(
      testData.fandomId,
      { isActive: !testData.includeInactive }
    );
    rules = result.rules;
  }

  // Initialize rule engine and test pathway
  const ruleEngine = new RuleEngine();

  // Convert rules to engine format
  const engineRules = rules.map(rule => ({
    id: rule.id,
    name: rule.name,
    category: rule.category,
    priority: rule.priority,
    conditions: rule.conditions || [],
    actions: rule.actions || [],
    isActive: rule.isActive,
  }));

  // Perform validation
  const startTime = performance.now();
  const validationResults = await ruleEngine.validatePathway(
    testData.pathway,
    engineRules
  );
  const endTime = performance.now();
  const executionTime = endTime - startTime;

  return NextResponse.json({
    success: true,
    results: {
      isValid: validationResults.isValid,
      errors: validationResults.errors,
      warnings: validationResults.warnings,
      info: validationResults.info,
      appliedRules: validationResults.appliedRules,
      executionTime: `${executionTime.toFixed(2)}ms`,
      testedRules: engineRules.length,
      pathway: testData.pathway,
    },
  });
}

/**
 * Handle individual rule testing
 */
async function handleTestRule(request: NextRequest) {
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

  const validationResult = testRuleSchema.safeParse(body);
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

  const testData = validationResult.data;

  // Get rule and check permissions
  const db = await getDatabase();
  const adminQueries = new AdminQueries(db);
  const rule = await adminQueries.validationRules.getById(testData.ruleId);

  if (!rule) {
    return NextResponse.json(
      { success: false, error: 'Rule not found' },
      { status: 404 }
    );
  }

  // Check permission to test this rule
  const permissionResult = AdminPermissions.validatePermission(
    adminUser,
    'rule:read',
    rule.fandomId
  );

  if (!permissionResult.hasPermission) {
    return NextResponse.json(
      {
        success: false,
        error: 'No permission to test this rule',
        reason: permissionResult.reason,
      },
      { status: 403 }
    );
  }

  // Initialize rule engine and test rule
  const ruleEngine = new RuleEngine();

  // Convert rule to engine format
  const engineRule = {
    id: rule.id,
    name: rule.name,
    category: rule.category,
    priority: rule.priority,
    conditions: rule.conditions || [],
    actions: rule.actions || [],
    isActive: rule.isActive,
  };

  // Test individual conditions if provided
  const conditionResults = [];
  if (rule.conditions && rule.conditions.length > 0) {
    for (const condition of rule.conditions) {
      try {
        const startTime = performance.now();
        const result = await ruleEngine.evaluateCondition(
          condition,
          testData.testData,
          testData.mockContext
        );
        const endTime = performance.now();

        conditionResults.push({
          condition,
          result,
          executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        });
      } catch (error) {
        conditionResults.push({
          condition,
          result: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: '0ms',
        });
      }
    }
  }

  // Test full rule
  const startTime = performance.now();
  const validationResults = await ruleEngine.validatePathway(
    testData.testData,
    [engineRule]
  );
  const endTime = performance.now();
  const executionTime = endTime - startTime;

  return NextResponse.json({
    success: true,
    results: {
      rule: {
        id: rule.id,
        name: rule.name,
        category: rule.category,
        priority: rule.priority,
        isActive: rule.isActive,
      },
      conditionResults,
      overallResult: {
        isValid: validationResults.isValid,
        errors: validationResults.errors,
        warnings: validationResults.warnings,
        info: validationResults.info,
        appliedRules: validationResults.appliedRules,
        executionTime: `${executionTime.toFixed(2)}ms`,
      },
      testData: testData.testData,
      mockContext: testData.mockContext,
    },
  });
}
