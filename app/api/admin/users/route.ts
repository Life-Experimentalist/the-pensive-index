/**
 * Admin User Management API
 *
 * API endpoints for managing admin users in the hierarchical system.
 * Provides user information, permission checking, and admin user operations.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';
import { RoleAssignmentService } from '@/lib/admin/services/RoleAssignmentService';
import { AuditLogService } from '@/lib/admin/services/AuditLogService';

// Request validation schemas
const GetUserSchema = z.object({
  user_id: z.string().optional(),
  email: z.string().optional(),
  include_assignments: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  include_permissions: z.enum(['true', 'false']).transform(val => val === 'true').optional()
});

const UpdateUserSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  preferences: z.record(z.any()).optional()
});

const CheckPermissionSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  permission: z.string().min(1, 'Permission is required'),
  fandom_id: z.string().optional()
});

const ListUsersSchema = z.object({
  role: z.string().optional(),
  fandom_id: z.string().optional(),
  is_active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).optional(),
  offset: z.string().transform(val => parseInt(val)).refine(val => val >= 0).optional()
});

// Initialize services
const adminModel = AdminUserModel.getInstance();
const permissionValidator = PermissionValidator.getInstance();
const roleService = new RoleAssignmentService();
const auditService = AuditLogService.getInstance();

/**
 * GET /api/admin/users
 * Get admin user information or list users
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
    const action = searchParams.get('action'); // 'get' | 'list' | 'permissions' | 'assignments'

    // Convert searchParams to object for validation
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Handle different actions
    switch (action) {
      case 'permissions':
        return await handleCheckPermissions(request, currentUserId, queryParams);
      case 'assignments':
        return await handleGetAssignments(request, currentUserId, queryParams);
      case 'list':
        return await handleListUsers(request, currentUserId, queryParams);
      default:
        return await handleGetUser(request, currentUserId, queryParams);
    }

  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle getting a specific user
 */
async function handleGetUser(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Validate parameters
    const validatedParams = GetUserSchema.parse(queryParams);
    const targetUserId = validatedParams.user_id || currentUserId;

    // Permission check - can view this user's info?
    if (targetUserId !== currentUserId) {
      const canView = await permissionValidator.canViewAuditLogs(currentUserId);
      if (!canView) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view other user information' },
          { status: 403 }
        );
      }
    }

    // Get user information
    const user = await adminModel.getAdminUser(targetUserId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found or not an admin' },
        { status: 404 }
      );
    }

    const response: any = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        preferences: user.preferences,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };

    // Include assignments if requested
    if (validatedParams.include_assignments) {
      const assignments = await adminModel.getUserAssignments(targetUserId);
      response.assignments = assignments.map(assignment => ({
        id: assignment.id,
        role: assignment.role,
        fandom_id: assignment.fandom_id,
        fandom_name: assignment.fandom_name,
        assigned_by: assignment.assigned_by,
        is_active: assignment.is_active,
        expires_at: assignment.expires_at,
        created_at: assignment.created_at
      }));
    }

    // Include effective permissions if requested
    if (validatedParams.include_permissions) {
      const effectivePermissions = await permissionValidator.getUserEffectivePermissions(targetUserId);
      response.effective_permissions = effectivePermissions;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting user:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

/**
 * Handle listing users
 */
async function handleListUsers(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Permission check - can list users?
    const canList = await permissionValidator.canViewAuditLogs(currentUserId);
    if (!canList) {
      return NextResponse.json(
        { error: 'Insufficient permissions to list admin users' },
        { status: 403 }
      );
    }

    // Validate parameters
    const validatedParams = ListUsersSchema.parse(queryParams);

    // Build filters based on user's permissions
    const filters = {
      role: validatedParams.role,
      fandom_id: validatedParams.fandom_id,
      is_active: validatedParams.is_active,
      search: validatedParams.search,
      limit: validatedParams.limit || 50,
      offset: validatedParams.offset || 0
    };

    // If user is not Project Admin, restrict to their fandoms
    const isProjectAdmin = await adminModel.hasPermission(currentUserId, 'validation:global');
    if (!isProjectAdmin && validatedParams.fandom_id) {
      const hasAccess = await adminModel.hasPermission(
        currentUserId,
        'validation:fandom',
        validatedParams.fandom_id
      );
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'No access to view users in this fandom',
            fandom_id: validatedParams.fandom_id
          },
          { status: 403 }
        );
      }
    }

    // Get users (this would be implemented in AdminUserModel)
    const users = await getFilteredUsers(filters);

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        assignments: user.assignments?.map(assignment => ({
          id: assignment.id,
          role: assignment.role,
          fandom_id: assignment.fandom_id,
          fandom_name: assignment.fandom_name,
          is_active: assignment.is_active
        }))
      })),
      pagination: {
        total: users.length, // Would be actual total from database
        limit: filters.limit,
        offset: filters.offset,
        has_more: false // Would be calculated from actual total
      },
      filters: filters
    });

  } catch (error) {
    console.error('Error listing users:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

/**
 * Handle checking permissions
 */
async function handleCheckPermissions(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Validate parameters
    const validatedParams = CheckPermissionSchema.parse(queryParams);
    const { user_id, permission, fandom_id } = validatedParams;

    // Permission check - can check this user's permissions?
    if (user_id !== currentUserId) {
      const canCheck = await permissionValidator.canViewAuditLogs(currentUserId);
      if (!canCheck) {
        return NextResponse.json(
          { error: 'Insufficient permissions to check other user permissions' },
          { status: 403 }
        );
      }
    }

    // Check the permission
    const permissionCheck = await permissionValidator.checkPermission(
      user_id,
      permission,
      fandom_id
    );

    return NextResponse.json({
      success: true,
      permission_check: permissionCheck
    });

  } catch (error) {
    console.error('Error checking permissions:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

/**
 * Handle getting user assignments
 */
async function handleGetAssignments(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    const targetUserId = queryParams.user_id || currentUserId;

    // Permission check
    if (targetUserId !== currentUserId) {
      const canView = await permissionValidator.canViewAuditLogs(currentUserId);
      if (!canView) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view other user assignments' },
          { status: 403 }
        );
      }
    }

    // Get assignments
    const assignments = await adminModel.getUserAssignments(targetUserId);

    return NextResponse.json({
      success: true,
      user_id: targetUserId,
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        role: assignment.role,
        fandom_id: assignment.fandom_id,
        fandom_name: assignment.fandom_name,
        assigned_by: assignment.assigned_by,
        is_active: assignment.is_active,
        expires_at: assignment.expires_at,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at
      }))
    });

  } catch (error) {
    console.error('Error getting user assignments:', error);
    throw error;
  }
}

/**
 * PUT /api/admin/users
 * Update admin user information
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
    const validatedData = UpdateUserSchema.parse(body);
    const { user_id, name, is_active, preferences } = validatedData;

    // Permission check - can update this user?
    if (user_id !== currentUserId) {
      const canUpdate = await permissionValidator.canViewAuditLogs(currentUserId);
      if (!canUpdate) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update other users' },
          { status: 403 }
        );
      }
    }

    // Additional check for deactivating users
    if (is_active === false && user_id !== currentUserId) {
      const canDeactivate = await adminModel.hasPermission(currentUserId, 'admin:revoke');
      if (!canDeactivate) {
        return NextResponse.json(
          { error: 'Insufficient permissions to deactivate users' },
          { status: 403 }
        );
      }
    }

    // Get current user
    const user = await adminModel.getAdminUser(user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user (this would be implemented in AdminUserModel)
    const updatedUser = await updateAdminUser(user_id, {
      name,
      is_active,
      preferences
    });

    // Log the update
    await auditService.logAction({
      user_id: currentUserId,
      user_email: '', // Would get from user context
      action: 'user:update',
      resource_type: 'admin_user',
      resource_id: user_id,
      details: {
        updated_fields: Object.keys(body),
        target_user_id: user_id,
        is_self_update: user_id === currentUserId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        is_active: updatedUser.is_active,
        preferences: updatedUser.preferences,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating user:', error);

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
 * DELETE /api/admin/users
 * Deactivate an admin user (soft delete)
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

    // Parse request body
    const body = await request.json();
    const { user_id, reason } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (user_id === currentUserId) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Permission check
    const canDeactivate = await adminModel.hasPermission(currentUserId, 'admin:revoke');
    if (!canDeactivate) {
      return NextResponse.json(
        { error: 'Insufficient permissions to deactivate users' },
        { status: 403 }
      );
    }

    // Get user to verify existence
    const user = await adminModel.getAdminUser(user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Deactivate user and revoke all assignments
    await updateAdminUser(user_id, { is_active: false });

    // Revoke all active assignments
    const assignments = await adminModel.getUserAssignments(user_id);
    for (const assignment of assignments) {
      if (assignment.is_active) {
        await roleService.revokeRole(assignment.id, currentUserId, reason);
      }
    }

    // Log the deactivation
    await auditService.logAction({
      user_id: currentUserId,
      user_email: '',
      action: 'user:deactivate',
      resource_type: 'admin_user',
      resource_id: user_id,
      details: {
        deactivated_user_id: user_id,
        reason: reason,
        revoked_assignments: assignments.filter(a => a.is_active).length
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
      user_id: user_id,
      deactivated_by: currentUserId,
      reason: reason,
      revoked_assignments: assignments.filter(a => a.is_active).length
    });

  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

/**
 * Get filtered users (would be implemented in AdminUserModel)
 */
async function getFilteredUsers(filters: any): Promise<any[]> {
  // This would query the database with filters
  // For now, returning empty array
  return [];
}

/**
 * Update admin user (would be implemented in AdminUserModel)
 */
async function updateAdminUser(userId: string, updates: any): Promise<any> {
  // This would update the user in the database
  // For now, returning mock updated user
  return {
    id: userId,
    email: 'user@example.com',
    name: updates.name || 'Updated User',
    is_active: updates.is_active ?? true,
    preferences: updates.preferences || {},
    updated_at: new Date()
  };
}