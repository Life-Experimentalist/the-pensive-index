/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Enhanced middleware for role-based access control in the hierarchical admin system.
 * Provides fine-grained permission checking for API routes and admin dashboard access.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AdminRole } from '@/types/admin';
import { AdminUserModel } from '@/lib/admin/models/AdminUser';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';
import { AuditLogService } from '@/lib/admin/services/AuditLogService';

export interface RBACConfig {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requiredRole?: AdminRole;
  requiredPermission?: string;
  fandomContext?: boolean; // Whether to extract fandom ID from request
  bypassForSuperAdmin?: boolean;
}

export class RBACMiddleware {
  private static instance: RBACMiddleware;
  private adminModel: AdminUserModel;
  private permissionValidator: PermissionValidator;
  private auditService: AuditLogService;

  constructor() {
    this.adminModel = AdminUserModel.getInstance();
    this.permissionValidator = PermissionValidator.getInstance();
    this.auditService = AuditLogService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RBACMiddleware {
    if (!RBACMiddleware.instance) {
      RBACMiddleware.instance = new RBACMiddleware();
    }
    return RBACMiddleware.instance;
  }

  /**
   * Main RBAC check middleware factory
   */
  requirePermission(
    permission: string,
    options: {
      fandomContext?: boolean;
      allowSelfAccess?: boolean;
      logAccess?: boolean;
    } = {}
  ) {
    return async (
      request: NextRequest,
      userId: string,
      context?: { fandomId?: string; targetUserId?: string }
    ): Promise<NextResponse | null> => {
      try {
        const fandomId = options.fandomContext ? context?.fandomId : undefined;

        // Check if user has required permission
        const permissionCheck = await this.permissionValidator.checkPermission(
          userId,
          permission,
          fandomId
        );

        if (!permissionCheck.granted) {
          // Check for self-access exception
          if (options.allowSelfAccess && context?.targetUserId === userId) {
            if (options.logAccess) {
              await this.logAccessAttempt(
                request,
                userId,
                permission,
                true,
                'self_access'
              );
            }
            return null; // Allow access
          }

          // Log unauthorized access attempt
          if (options.logAccess) {
            await this.logAccessAttempt(
              request,
              userId,
              permission,
              false,
              'insufficient_permissions'
            );
          }

          return new NextResponse(
            JSON.stringify({
              error: 'Insufficient permissions',
              required_permission: permission,
              fandom_context: fandomId,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // Log successful access
        if (options.logAccess) {
          await this.logAccessAttempt(request, userId, permission, true);
        }

        return null; // Allow access
      } catch (error) {
        console.error('Error in RBAC permission check:', error);
        return new NextResponse(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  }

  /**
   * Require specific admin role
   */
  requireRole(role: AdminRole, fandomContext: boolean = false) {
    return async (
      request: NextRequest,
      userId: string,
      context?: { fandomId?: string }
    ): Promise<NextResponse | null> => {
      try {
        const user = await this.adminModel.getAdminUser(userId);

        if (!user) {
          return new NextResponse(
            JSON.stringify({ error: 'Admin access required' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        const assignments = await this.adminModel.getUserAssignments(userId);
        const fandomId = fandomContext ? context?.fandomId : undefined;

        // Check if user has required role
        const hasRole = assignments.some(assignment => {
          if (!assignment.is_active) return false;
          if (assignment.role.name !== role) return false;

          // If fandom context required, check fandom assignment
          if (fandomContext && fandomId) {
            return assignment.fandom_id === fandomId;
          }

          // For global roles, assignment should not have fandom_id
          if (!fandomContext) {
            return !assignment.fandom_id;
          }

          return true;
        });

        if (!hasRole) {
          await this.logAccessAttempt(
            request,
            userId,
            `role:${role}`,
            false,
            'insufficient_role'
          );

          return new NextResponse(
            JSON.stringify({
              error: 'Insufficient role',
              required_role: role,
              fandom_context: fandomId,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return null; // Allow access
      } catch (error) {
        console.error('Error in RBAC role check:', error);
        return new NextResponse(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  }

  /**
   * Require admin access (any admin role)
   */
  requireAdmin(fandomContext: boolean = false) {
    return async (
      request: NextRequest,
      userId: string,
      context?: { fandomId?: string }
    ): Promise<NextResponse | null> => {
      try {
        const user = await this.adminModel.getAdminUser(userId);

        if (!user) {
          await this.logAccessAttempt(
            request,
            userId,
            'admin:any',
            false,
            'not_admin'
          );

          return new NextResponse(
            JSON.stringify({ error: 'Admin access required' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // If fandom context required, check fandom access
        if (fandomContext && context?.fandomId) {
          const hasAccess = await this.adminModel.hasPermission(
            userId,
            'validation:fandom',
            context.fandomId
          );

          if (!hasAccess) {
            // Check if user is Project Admin (can access all fandoms)
            const isProjectAdmin = await this.adminModel.hasPermission(
              userId,
              'validation:global'
            );

            if (!isProjectAdmin) {
              await this.logAccessAttempt(
                request,
                userId,
                'admin:fandom',
                false,
                'no_fandom_access'
              );

              return new NextResponse(
                JSON.stringify({
                  error: 'No access to this fandom',
                  fandom_id: context.fandomId,
                }),
                {
                  status: 403,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }
          }
        }

        return null; // Allow access
      } catch (error) {
        console.error('Error in RBAC admin check:', error);
        return new NextResponse(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  }

  /**
   * Check multiple permissions (all must pass)
   */
  requireAllPermissions(permissions: string[], fandomContext: boolean = false) {
    return async (
      request: NextRequest,
      userId: string,
      context?: { fandomId?: string }
    ): Promise<NextResponse | null> => {
      try {
        const fandomId = fandomContext ? context?.fandomId : undefined;

        const permissionChecks =
          await this.permissionValidator.checkMultiplePermissions(
            userId,
            permissions,
            fandomId
          );

        const failedPermissions = permissionChecks
          .filter(check => !check.granted)
          .map(check => check.permission);

        if (failedPermissions.length > 0) {
          await this.logAccessAttempt(
            request,
            userId,
            permissions.join(','),
            false,
            'missing_permissions'
          );

          return new NextResponse(
            JSON.stringify({
              error: 'Insufficient permissions',
              missing_permissions: failedPermissions,
              fandom_context: fandomId,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return null; // Allow access
      } catch (error) {
        console.error('Error in RBAC multiple permission check:', error);
        return new NextResponse(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  }

  /**
   * Check if user can access resource (with ownership check)
   */
  requireResourceAccess(
    resourceType: string,
    resourceId: string,
    requiredPermission: string,
    allowOwnerAccess: boolean = true
  ) {
    return async (
      request: NextRequest,
      userId: string,
      context?: { fandomId?: string }
    ): Promise<NextResponse | null> => {
      try {
        // Check permission first
        const permissionCheck = await this.permissionValidator.checkPermission(
          userId,
          requiredPermission,
          context?.fandomId
        );

        if (permissionCheck.granted) {
          return null; // Allow access via permission
        }

        // Check ownership if allowed
        if (allowOwnerAccess) {
          const isOwner = await this.checkResourceOwnership(
            userId,
            resourceType,
            resourceId
          );

          if (isOwner) {
            await this.logAccessAttempt(
              request,
              userId,
              `resource:${resourceType}:${resourceId}`,
              true,
              'owner_access'
            );
            return null; // Allow access via ownership
          }
        }

        await this.logAccessAttempt(
          request,
          userId,
          `resource:${resourceType}:${resourceId}`,
          false,
          'no_access'
        );

        return new NextResponse(
          JSON.stringify({
            error: 'Access denied',
            resource_type: resourceType,
            resource_id: resourceId,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Error in RBAC resource access check:', error);
        return new NextResponse(
          JSON.stringify({ error: 'Internal server error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  }

  /**
   * Extract fandom ID from request
   */
  extractFandomContext(request: NextRequest): string | undefined {
    // Check URL parameters
    const url = new URL(request.url);
    const fandomFromPath = url.pathname.match(/\/fandom\/([^\/]+)/)?.[1];
    if (fandomFromPath) return fandomFromPath;

    // Check query parameters
    const fandomFromQuery = url.searchParams.get('fandom_id');
    if (fandomFromQuery) return fandomFromQuery;

    // Check headers
    const fandomFromHeader = request.headers.get('X-Fandom-ID');
    if (fandomFromHeader) return fandomFromHeader;

    return undefined;
  }

  /**
   * Get user context from request
   */
  async getUserContext(userId: string): Promise<{
    user: any;
    permissions: string[];
    roles: AdminRole[];
    fandoms: string[];
  } | null> {
    try {
      const user = await this.adminModel.getAdminUser(userId);
      if (!user) return null;

      const assignments = await this.adminModel.getUserAssignments(userId);
      const permissions: string[] = [];
      const roles: AdminRole[] = [];
      const fandoms: string[] = [];

      for (const assignment of assignments) {
        if (!assignment.is_active) continue;

        if (!roles.includes(assignment.role.name)) {
          roles.push(assignment.role.name);
        }

        if (assignment.fandom_id && !fandoms.includes(assignment.fandom_id)) {
          fandoms.push(assignment.fandom_id);
        }
      }

      // Get effective permissions
      const effectivePermissions =
        await this.permissionValidator.getUserEffectivePermissions(userId);
      permissions.push(...effectivePermissions.global_permissions);

      return {
        user,
        permissions,
        roles,
        fandoms,
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return null;
    }
  }

  // Private helper methods

  private async logAccessAttempt(
    request: NextRequest,
    userId: string,
    resource: string,
    success: boolean,
    reason?: string
  ): Promise<void> {
    try {
      const ip =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown';

      const userAgent = request.headers.get('user-agent') || 'unknown';

      await this.auditService.logAction({
        user_id: userId,
        user_email: '', // Would get from user context
        action: 'access:attempt',
        resource_type: 'api_endpoint',
        resource_id: request.url,
        details: {
          method: request.method,
          url: request.url,
          resource,
          success,
          reason,
          ip_address: ip,
          user_agent: userAgent,
        },
        ip_address: ip,
        user_agent: userAgent,
        success,
      });
    } catch (error) {
      console.error('Error logging access attempt:', error);
      // Don't throw - logging failure shouldn't break access control
    }
  }

  private async checkResourceOwnership(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      // This would check ownership based on resource type
      // For now, returning false as it depends on specific resource implementations
      return false;
    } catch (error) {
      console.error('Error checking resource ownership:', error);
      return false;
    }
  }
}
