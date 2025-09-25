/**
 * Admin Role Assignment API
 *
 * API endpoints for managing admin role assignments in the hierarchical system.
 * Handles both Project Admin and Fandom Admin role assignments with proper RBAC.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { RoleAssignmentService } from '@/lib/admin/services/RoleAssignmentService';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import type { AdminRole } from '@/types/admin';

// Request validation schemas
const AssignRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['ProjectAdmin', 'FandomAdmin'] as const),
  fandomId: z.string().optional(),
  expiresAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
});

const RevokeRoleSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required'),
  reason: z.string().optional()
});

const TransferRoleSchema = z.object({
  fromUserId: z.string().min(1, 'Source user ID is required'),
  toUserId: z.string().min(1, 'Target user ID is required'),
  role: z.enum(['ProjectAdmin', 'FandomAdmin'] as const),
  fandomId: z.string().optional()
});

// Initialize services
const roleService = new RoleAssignmentService();
const permissionValidator = PermissionValidator.getInstance();
const adminModel = AdminUserModel.getInstance();

/**
 * POST /api/admin/roles/assign
 * Assign a role to a user
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AssignRoleSchema.parse(body);
    const { userId, role, fandomId, expiresAt } = validatedData;

    // Permission check - can current user assign this role?
    const canAssign = await permissionValidator.canAssignRole(
      currentUserId,
      role,
      fandomId
    );

    if (!canAssign) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to assign this role',
          required_permission: 'admin:assign',
          role: role,
          fandom_context: fandomId
        },
        { status: 403 }
      );
    }

    // Validate target user exists
    const targetUser = await adminModel.getAdminUser(userId);
    if (!targetUser) {
      // Check if this is a new admin user (might be from Clerk but not in admin system)
      const isNewAdmin = await checkIfNewAdminUser(userId);
      if (!isNewAdmin) {
        return NextResponse.json(
          { error: 'Target user not found or not eligible for admin roles' },
          { status: 404 }
        );
      }
    }

    // Role-specific validations
    if (role === 'FandomAdmin' && !fandomId) {
      return NextResponse.json(
        { error: 'Fandom ID required for Fandom Admin role assignment' },
        { status: 400 }
      );
    }

    if (role === 'ProjectAdmin' && fandomId) {
      return NextResponse.json(
        { error: 'Project Admin roles should not be scoped to fandoms' },
        { status: 400 }
      );
    }

    // Check if user already has this role assignment
    const existingAssignments = await adminModel.getUserAssignments(userId);
    const hasConflictingAssignment = existingAssignments.some(assignment => {
      if (!assignment.is_active) return false;
      if (assignment.role.name !== role) return false;

      // For Fandom Admin, check same fandom
      if (role === 'FandomAdmin') {
        return assignment.fandom_id === fandomId;
      }

      // For Project Admin, check global assignment
      return !assignment.fandom_id;
    });

    if (hasConflictingAssignment) {
      return NextResponse.json(
        {
          error: 'User already has this role assignment',
          role: role,
          fandom_id: fandomId
        },
        { status: 409 }
      );
    }

    // Assign the role
    const assignment = await roleService.assignRole(
      userId,
      role,
      currentUserId,
      fandomId,
      expiresAt
    );

    return NextResponse.json({
      success: true,
      message: 'Role assigned successfully',
      assignment: {
        id: assignment.id,
        user_id: assignment.user_id,
        role: assignment.role,
        fandom_id: assignment.fandom_id,
        assigned_by: assignment.assigned_by,
        is_active: assignment.is_active,
        expires_at: assignment.expires_at,
        created_at: assignment.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error assigning role:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle known business logic errors
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/roles/assign
 * Revoke a role assignment
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = RevokeRoleSchema.parse(body);
    const { assignmentId, reason } = validatedData;

    // Get assignment details for permission check
    const assignment = await roleService.getAssignmentById(assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Permission check - can current user revoke this role?
    const canRevoke = await permissionValidator.canRevokeRole(
      currentUserId,
      assignmentId,
      assignment.user_id,
      assignment.fandom_id || undefined
    );

    if (!canRevoke) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to revoke this role',
          assignment_id: assignmentId
        },
        { status: 403 }
      );
    }

    // Revoke the role
    const success = await roleService.revokeRole(assignmentId, currentUserId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revoke role assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Role revoked successfully',
      assignment_id: assignmentId,
      revoked_by: currentUserId,
      reason: reason
    });

  } catch (error) {
    console.error('Error revoking role:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/roles/assign
 * Transfer role assignment between users
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = TransferRoleSchema.parse(body);
    const { fromUserId, toUserId, role, fandomId } = validatedData;

    // Permission check - can current user transfer this role?
    const canTransfer = await permissionValidator.canAssignRole(
      currentUserId,
      role,
      fandomId
    );

    if (!canTransfer) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to transfer this role',
          role: role,
          fandom_context: fandomId
        },
        { status: 403 }
      );
    }

    // Validate users exist
    const fromUser = await adminModel.getAdminUser(fromUserId);
    const toUser = await adminModel.getAdminUser(toUserId);

    if (!fromUser) {
      return NextResponse.json(
        { error: 'Source user not found' },
        { status: 404 }
      );
    }

    if (!toUser) {
      const isNewAdmin = await checkIfNewAdminUser(toUserId);
      if (!isNewAdmin) {
        return NextResponse.json(
          { error: 'Target user not found or not eligible for admin roles' },
          { status: 404 }
        );
      }
    }

    // Transfer the role assignments
    const result = await roleService.transferAssignments(
      fromUserId,
      toUserId,
      currentUserId,
      fandomId
    );

    return NextResponse.json({
      success: true,
      message: 'Role assignment transferred successfully',
      transfer_details: {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        transferred_by: currentUserId,
        fandom_context: fandomId,
        transferred_assignments: result.transferred,
        failed_transfers: result.failed
      }
    });

  } catch (error) {
    console.error('Error transferring role:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/roles/assign
 * Get role assignments with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Permission check - can view assignments
    const canView = await permissionValidator.canViewAuditLogs(currentUserId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view role assignments' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      user_id: searchParams.get('user_id') || undefined,
      role: searchParams.get('role') as AdminRole || undefined,
      fandom_id: searchParams.get('fandom_id') || undefined,
      active: searchParams.get('active') === 'true' ? true :
              searchParams.get('active') === 'false' ? false : undefined,
      assigned_by: searchParams.get('assigned_by') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Get assignments
    const result = await roleService.getAssignments(filters);

    return NextResponse.json({
      success: true,
      assignments: result.assignments.map(assignment => ({
        id: assignment.id,
        user_id: assignment.user_id,
        role: assignment.role,
        fandom_id: assignment.fandom_id,
        fandom_name: assignment.fandom_name,
        assigned_by: assignment.assigned_by,
        is_active: assignment.is_active,
        expires_at: assignment.expires_at,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at
      })),
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        has_more: result.total > (filters.offset + filters.limit)
      },
      filters: filters
    });

  } catch (error) {
    console.error('Error fetching role assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

/**
 * Check if user is eligible for admin roles (exists in Clerk)
 */
async function checkIfNewAdminUser(userId: string): Promise<boolean> {
  try {
    // This would check if user exists in Clerk
    // For now, assuming all users are eligible
    return true;
  } catch (error) {
    console.error('Error checking user eligibility:', error);
    return false;
  }
}