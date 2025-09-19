/**
 * Fandom Assignment API
 *
 * API endpoints for managing fandom-specific admin assignments.
 * Handles assigning/removing Fandom Admins and managing fandom ownership.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { FandomAssignmentService } from '@/lib/admin/services/FandomAssignmentService';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';

// Request validation schemas
const AssignFandomAdminSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  fandomId: z.string().min(1, 'Fandom ID is required')
});

const ReassignFandomSchema = z.object({
  fandomId: z.string().min(1, 'Fandom ID is required'),
  newUserId: z.string().min(1, 'New user ID is required'),
  previousAssignmentId: z.string().optional()
});

const RemoveFandomAdminSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  fandomId: z.string().min(1, 'Fandom ID is required')
});

const BulkAssignSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one user ID required'),
  fandomId: z.string().min(1, 'Fandom ID is required')
});

// Initialize services
const fandomService = new FandomAssignmentService();
const permissionValidator = PermissionValidator.getInstance();
const adminModel = AdminUserModel.getInstance();

/**
 * POST /api/admin/fandoms/assign
 * Assign a user as Fandom Admin to a specific fandom
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
    const validatedData = AssignFandomAdminSchema.parse(body);
    const { userId, fandomId } = validatedData;

    // Permission check - can current user assign fandom admins?
    const canAssign = await permissionValidator.canAssignRole(
      currentUserId,
      'FandomAdmin',
      fandomId
    );

    if (!canAssign) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to assign fandom admins',
          required_permission: 'admin:assign',
          fandom_id: fandomId
        },
        { status: 403 }
      );
    }

    // Validate target user exists
    const targetUser = await adminModel.getAdminUser(userId);
    if (!targetUser) {
      const isNewAdmin = await checkIfUserExists(userId);
      if (!isNewAdmin) {
        return NextResponse.json(
          { error: 'Target user not found or not eligible for admin roles' },
          { status: 404 }
        );
      }
    }

    // Check if user already assigned to this fandom
    const existingAssignment = await fandomService.getUserFandomAssignment(userId, fandomId);
    if (existingAssignment) {
      return NextResponse.json(
        {
          error: 'User already assigned to this fandom',
          existing_assignment_id: existingAssignment.id
        },
        { status: 409 }
      );
    }

    // Assign fandom admin role
    const assignment = await fandomService.assignFandomAdmin(
      userId,
      fandomId,
      currentUserId
    );

    return NextResponse.json({
      success: true,
      message: 'Fandom admin assigned successfully',
      assignment: {
        id: assignment.id,
        user_id: assignment.user_id,
        fandom_id: assignment.fandom_id,
        role: assignment.role,
        assigned_by: assignment.assigned_by,
        is_active: assignment.is_active,
        created_at: assignment.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error assigning fandom admin:', error);

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
      if (error.message.includes('already assigned')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
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
 * PUT /api/admin/fandoms/assign
 * Reassign fandom ownership to a new admin
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
    const validatedData = ReassignFandomSchema.parse(body);
    const { fandomId, newUserId, previousAssignmentId } = validatedData;

    // Permission check - can current user reassign fandoms?
    const canReassign = await permissionValidator.canAssignRole(
      currentUserId,
      'FandomAdmin',
      fandomId
    );

    if (!canReassign) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to reassign fandoms',
          fandom_id: fandomId
        },
        { status: 403 }
      );
    }

    // Validate new user exists
    const newUser = await adminModel.getAdminUser(newUserId);
    if (!newUser) {
      const isNewAdmin = await checkIfUserExists(newUserId);
      if (!isNewAdmin) {
        return NextResponse.json(
          { error: 'Target user not found or not eligible for admin roles' },
          { status: 404 }
        );
      }
    }

    // Reassign the fandom
    const newAssignment = await fandomService.reassignFandom(
      fandomId,
      newUserId,
      currentUserId,
      previousAssignmentId
    );

    return NextResponse.json({
      success: true,
      message: 'Fandom reassigned successfully',
      assignment: {
        id: newAssignment.id,
        user_id: newAssignment.user_id,
        fandom_id: newAssignment.fandom_id,
        role: newAssignment.role,
        assigned_by: newAssignment.assigned_by,
        is_active: newAssignment.is_active,
        created_at: newAssignment.created_at
      },
      previous_assignment_id: previousAssignmentId
    });

  } catch (error) {
    console.error('Error reassigning fandom:', error);

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
 * DELETE /api/admin/fandoms/assign
 * Remove a user from fandom admin role
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
    const validatedData = RemoveFandomAdminSchema.parse(body);
    const { userId, fandomId } = validatedData;

    // Permission check - can current user remove fandom admins?
    const canRemove = await permissionValidator.canRevokeRole(
      currentUserId,
      '', // assignment ID not needed for this check
      userId,
      fandomId
    );

    if (!canRemove) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to remove fandom admins',
          fandom_id: fandomId
        },
        { status: 403 }
      );
    }

    // Check if user is assigned to this fandom
    const assignment = await fandomService.getUserFandomAssignment(userId, fandomId);
    if (!assignment) {
      return NextResponse.json(
        { error: 'User is not assigned to this fandom' },
        { status: 404 }
      );
    }

    // Remove fandom admin
    const success = await fandomService.removeFandomAdmin(
      userId,
      fandomId,
      currentUserId
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove fandom admin' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fandom admin removed successfully',
      removed_user_id: userId,
      fandom_id: fandomId,
      removed_by: currentUserId
    });

  } catch (error) {
    console.error('Error removing fandom admin:', error);

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
 * GET /api/admin/fandoms/assign
 * Get fandom assignments with filtering
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const fandomId = searchParams.get('fandom_id');
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action'); // 'assignments' | 'user_fandoms' | 'orphaned' | 'stats'

    // Permission check based on action
    if (action === 'stats' || (!fandomId && !userId)) {
      // Global stats require project admin
      const canViewGlobal = await permissionValidator.canViewAuditLogs(currentUserId);
      if (!canViewGlobal) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view global fandom data' },
          { status: 403 }
        );
      }
    } else if (fandomId) {
      // Fandom-specific data requires fandom access
      const hasAccess = await fandomService.hasAccessToFandom(currentUserId, fandomId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'No access to this fandom',
            fandom_id: fandomId
          },
          { status: 403 }
        );
      }
    }

    // Handle different actions
    switch (action) {
      case 'user_fandoms':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID required for user_fandoms action' },
            { status: 400 }
          );
        }

        const userFandoms = await fandomService.getUserFandoms(userId);
        return NextResponse.json({
          success: true,
          user_id: userId,
          fandoms: userFandoms
        });

      case 'orphaned':
        const orphanedFandoms = await fandomService.getOrphanedFandoms();
        return NextResponse.json({
          success: true,
          orphaned_fandoms: orphanedFandoms
        });

      case 'stats':
        const stats = await fandomService.getFandomStats();
        return NextResponse.json({
          success: true,
          statistics: stats
        });

      default:
        // Get assignments for specific fandom or user
        if (fandomId) {
          const assignments = await fandomService.getFandomAssignments(fandomId);
          return NextResponse.json({
            success: true,
            fandom_id: fandomId,
            assignments: assignments.map(assignment => ({
              id: assignment.id,
              user_id: assignment.user_id,
              role: assignment.role,
              assigned_by: assignment.assigned_by,
              is_active: assignment.is_active,
              expires_at: assignment.expires_at,
              created_at: assignment.created_at
            }))
          });
        } else if (userId) {
          const userFandoms = await fandomService.getUserFandoms(userId);
          return NextResponse.json({
            success: true,
            user_id: userId,
            fandoms: userFandoms
          });
        } else {
          return NextResponse.json(
            { error: 'Either fandom_id or user_id parameter required' },
            { status: 400 }
          );
        }
    }

  } catch (error) {
    console.error('Error fetching fandom assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/fandoms/assign/bulk
 * Bulk assign multiple users to a fandom
 */
export async function PATCH(request: NextRequest) {
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
    const validatedData = BulkAssignSchema.parse(body);
    const { userIds, fandomId } = validatedData;

    // Permission check - can current user assign fandom admins?
    const canAssign = await permissionValidator.canAssignRole(
      currentUserId,
      'FandomAdmin',
      fandomId
    );

    if (!canAssign) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to assign fandom admins',
          fandom_id: fandomId
        },
        { status: 403 }
      );
    }

    // Bulk assign
    const result = await fandomService.bulkAssignFandomAdmins(
      userIds,
      fandomId,
      currentUserId
    );

    return NextResponse.json({
      success: true,
      message: 'Bulk assignment completed',
      fandom_id: fandomId,
      total_users: userIds.length,
      successful_assignments: result.successful.length,
      failed_assignments: result.failed.length,
      results: {
        successful: result.successful.map(assignment => ({
          id: assignment.id,
          user_id: assignment.user_id,
          role: assignment.role
        })),
        failed: result.failed
      }
    });

  } catch (error) {
    console.error('Error in bulk assignment:', error);

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

// Helper functions

/**
 * Check if user exists (in Clerk or system)
 */
async function checkIfUserExists(userId: string): Promise<boolean> {
  try {
    // This would check if user exists in Clerk
    // For now, assuming all users exist
    return true;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
}