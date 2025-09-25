import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ErrorFactory } from '@/lib/errors';
import { DatabaseManager } from '@/lib/database';
import { eq } from 'drizzle-orm';
import { fandoms } from '@/lib/database/schema';

/**
 * Authentication context for requests
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
    name?: string;
    roles: string[];
    permissions: string[];
  };
  isAdmin: boolean;
  isAuthenticated: boolean;
}

/**
 * User roles and permissions system
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  CONTRIBUTOR: 'contributor',
  USER: 'user',
} as const;

export const PERMISSIONS = {
  // Fandom permissions
  CREATE_FANDOM: 'create:fandom',
  UPDATE_FANDOM: 'update:fandom',
  DELETE_FANDOM: 'delete:fandom',

  // Fandom management permissions (modular system)
  MANAGE_FANDOM_TEMPLATES: 'manage:fandom_templates',
  CREATE_FANDOM_FROM_TEMPLATE: 'create:fandom_from_template',
  MANAGE_FANDOM_CONTENT: 'manage:fandom_content',
  APPROVE_FANDOM_CONTENT: 'approve:fandom_content',
  BULK_IMPORT_CONTENT: 'bulk:import_content',
  BULK_EXPORT_CONTENT: 'bulk:export_content',
  MANAGE_CONTENT_VERSIONS: 'manage:content_versions',
  VIEW_FANDOM_ANALYTICS: 'view:fandom_analytics',
  CONFIGURE_FANDOM_TAXONOMY: 'configure:fandom_taxonomy',
  MANAGE_APPROVAL_WORKFLOWS: 'manage:approval_workflows',

  // Content-specific permissions
  CREATE_FANDOM_TAG: 'create:fandom_tag',
  UPDATE_FANDOM_TAG: 'update:fandom_tag',
  DELETE_FANDOM_TAG: 'delete:fandom_tag',
  CREATE_FANDOM_PLOT_BLOCK: 'create:fandom_plot_block',
  UPDATE_FANDOM_PLOT_BLOCK: 'update:fandom_plot_block',
  DELETE_FANDOM_PLOT_BLOCK: 'delete:fandom_plot_block',
  CREATE_FANDOM_CHARACTER: 'create:fandom_character',
  UPDATE_FANDOM_CHARACTER: 'update:fandom_character',
  DELETE_FANDOM_CHARACTER: 'delete:fandom_character',
  CREATE_FANDOM_VALIDATION_RULE: 'create:fandom_validation_rule',
  UPDATE_FANDOM_VALIDATION_RULE: 'update:fandom_validation_rule',
  DELETE_FANDOM_VALIDATION_RULE: 'delete:fandom_validation_rule',

  // Tag permissions (legacy)
  CREATE_TAG: 'create:tag',
  UPDATE_TAG: 'update:tag',
  DELETE_TAG: 'delete:tag',

  // Tag class permissions
  CREATE_TAG_CLASS: 'create:tag_class',
  UPDATE_TAG_CLASS: 'update:tag_class',
  DELETE_TAG_CLASS: 'delete:tag_class',

  // Plot block permissions (legacy)
  CREATE_PLOT_BLOCK: 'create:plot_block',
  UPDATE_PLOT_BLOCK: 'update:plot_block',
  DELETE_PLOT_BLOCK: 'delete:plot_block',

  // System permissions
  MANAGE_USERS: 'manage:users',
  VIEW_ANALYTICS: 'view:analytics',
  SYSTEM_CONFIG: 'system:config',
} as const;

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.MODERATOR]: [
    PERMISSIONS.CREATE_TAG,
    PERMISSIONS.UPDATE_TAG,
    PERMISSIONS.DELETE_TAG,
    PERMISSIONS.CREATE_TAG_CLASS,
    PERMISSIONS.UPDATE_TAG_CLASS,
    PERMISSIONS.DELETE_TAG_CLASS,
    PERMISSIONS.CREATE_PLOT_BLOCK,
    PERMISSIONS.UPDATE_PLOT_BLOCK,
    PERMISSIONS.DELETE_PLOT_BLOCK,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  [USER_ROLES.CONTRIBUTOR]: [
    PERMISSIONS.CREATE_TAG,
    PERMISSIONS.UPDATE_TAG,
    PERMISSIONS.CREATE_PLOT_BLOCK,
    PERMISSIONS.UPDATE_PLOT_BLOCK,
  ],
  [USER_ROLES.USER]: [],
} as const;

/**
 * Authentication middleware factory
 */
export class AuthMiddleware {
  /**
   * Require authentication for a route
   */
  static requireAuth<T extends any[]>(
    handler: (
      request: NextRequest,
      authContext: AuthContext,
      ...args: T
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authContext = await AuthMiddleware.getAuthContext(request);

      if (!authContext.isAuthenticated) {
        throw ErrorFactory.unauthorized('Authentication required');
      }

      return handler(request, authContext, ...args);
    };
  }

  /**
   * Require admin role for a route
   */
  static requireAdmin<T extends any[]>(
    handler: (
      request: NextRequest,
      authContext: AuthContext,
      ...args: T
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authContext = await AuthMiddleware.getAuthContext(request);

      if (!authContext.isAuthenticated) {
        throw ErrorFactory.unauthorized('Authentication required');
      }

      if (!authContext.isAdmin) {
        throw ErrorFactory.forbidden('Admin access required');
      }

      return handler(request, authContext, ...args);
    };
  }

  /**
   * Require specific permission for a route
   */
  static requirePermission<T extends any[]>(
    permission: string,
    handler: (
      request: NextRequest,
      authContext: AuthContext,
      ...args: T
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authContext = await AuthMiddleware.getAuthContext(request);

      if (!authContext.isAuthenticated) {
        throw ErrorFactory.unauthorized('Authentication required');
      }

      if (!authContext.user.permissions.includes(permission)) {
        throw ErrorFactory.forbidden(`Permission required: ${permission}`);
      }

      return handler(request, authContext, ...args);
    };
  }

  /**
   * Require multiple permissions for a route
   */
  static requirePermissions<T extends any[]>(
    permissions: string[],
    requireAll: boolean = true,
    handler: (
      request: NextRequest,
      authContext: AuthContext,
      ...args: T
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authContext = await AuthMiddleware.getAuthContext(request);

      if (!authContext.isAuthenticated) {
        throw ErrorFactory.unauthorized('Authentication required');
      }

      const hasPermissions = requireAll
        ? permissions.every(p => authContext.user.permissions.includes(p))
        : permissions.some(p => authContext.user.permissions.includes(p));

      if (!hasPermissions) {
        const verb = requireAll ? 'all' : 'any';
        throw ErrorFactory.forbidden(
          `Requires ${verb} of permissions: ${permissions.join(', ')}`
        );
      }

      return handler(request, authContext, ...args);
    };
  }

  /**
   * Get authentication context from request
   */
  public static async getAuthContext(
    request: NextRequest
  ): Promise<AuthContext> {
    try {
      // Get session from NextAuth
      const session = await getServerSession();

      if (!session?.user?.email) {
        return {
          user: {
            id: '',
            email: '',
            roles: [],
            permissions: [],
          },
          isAdmin: false,
          isAuthenticated: false,
        };
      }

      // In a real implementation, you would fetch user roles and permissions from database
      // For now, we'll use mock data based on email
      const roles = AuthMiddleware.getUserRoles(session.user.email);
      const permissions = AuthMiddleware.getPermissionsForRoles(roles);

      return {
        user: {
          id: session.user.email, // In real app, this would be user ID
          email: session.user.email,
          name: session.user.name || undefined,
          roles,
          permissions,
        },
        isAdmin: roles.includes(USER_ROLES.ADMIN),
        isAuthenticated: true,
      };
    } catch (error) {
      console.error('Auth context error:', error);
      return {
        user: {
          id: '',
          email: '',
          roles: [],
          permissions: [],
        },
        isAdmin: false,
        isAuthenticated: false,
      };
    }
  }

  /**
   * Get user roles (mock implementation)
   * In a real app, this would query the database
   */
  private static getUserRoles(email: string): string[] {
    // Mock role assignment based on email patterns
    if (email.includes('admin')) {
      return [USER_ROLES.ADMIN];
    }
    if (email.includes('mod')) {
      return [USER_ROLES.MODERATOR];
    }
    if (email.includes('contributor')) {
      return [USER_ROLES.CONTRIBUTOR];
    }
    return [USER_ROLES.USER];
  }

  /**
   * Get permissions for given roles
   */
  private static getPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();

    for (const role of roles) {
      const rolePermissions =
        ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    }

    return Array.from(permissions);
  }
}

/**
 * Fandom-specific access control
 */
export class FandomAccessControl {
  /**
   * Check if user has access to a specific fandom
   */
  static async verifyFandomAccess(
    authContext: AuthContext,
    fandomId: string,
    permission: string
  ): Promise<boolean> {
    // Admins have access to all fandoms
    if (authContext.isAdmin) {
      return true;
    }

    // Check if user has the required permission
    if (!authContext.user.permissions.includes(permission)) {
      return false;
    }

    // In a real implementation, you would check fandom-specific permissions
    // For now, return true if user has the permission globally
    return true;
  }

  /**
   * Middleware to require fandom access
   */
  static requireFandomAccess<T extends any[]>(
    permission: string,
    handler: (
      request: NextRequest,
      authContext: AuthContext,
      fandomId: string,
      ...args: T
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      { params }: { params: { fandomId: string } },
      ...args: T
    ): Promise<NextResponse> => {
      const authContext = await AuthMiddleware.getAuthContext(request);
      const fandomId = params.fandomId;

      if (!authContext.isAuthenticated) {
        throw ErrorFactory.unauthorized('Authentication required');
      }

      // Verify fandom exists
      const dbManager = DatabaseManager.getInstance();
      const db = await dbManager.getConnection();

      const fandom = await db.query.fandoms.findFirst({
        where: eq(fandoms.id, fandomId),
      });

      if (!fandom) {
        throw ErrorFactory.notFound('Fandom', fandomId);
      }

      // Check fandom access
      const hasAccess = await FandomAccessControl.verifyFandomAccess(
        authContext,
        fandomId,
        permission
      );

      if (!hasAccess) {
        throw ErrorFactory.forbidden(
          `Insufficient permissions for fandom: ${fandomId}`
        );
      }

      return handler(request, authContext, fandomId, ...args);
    };
  }
}
