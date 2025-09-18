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
    permissions: Array<{
      id: string;
      name: string;
      description: string;
      scope: 'global' | 'fandom' | 'content';
      resource?: string; // e.g., fandomId for scoped permissions
    }>;
  };
  isAdmin: boolean;
  isAuthenticated: boolean;
}

/**
 * User roles and permissions system
 */
export const USER_ROLES = {
  PROJECT_ADMIN: 'ProjectAdmin',
  FANDOM_ADMIN: 'FandomAdmin',
  // Legacy roles (to be migrated)
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  CONTRIBUTOR: 'contributor',
  USER: 'user',
} as const;

export const ADMIN_PERMISSIONS = {
  // Rule management permissions
  CREATE_RULE: 'rule:create',
  UPDATE_RULE: 'rule:update',
  DELETE_RULE: 'rule:delete',
  PUBLISH_RULE: 'rule:publish',
  
  // Template management permissions
  CREATE_TEMPLATE: 'template:create',
  UPDATE_TEMPLATE: 'template:update',
  DELETE_TEMPLATE: 'template:delete',
  MANAGE_TEMPLATES: 'template:manage',
  
  // Testing permissions
  RUN_TESTS: 'test:run',
  CREATE_TEST_SCENARIO: 'test:create',
  MANAGE_TEST_SANDBOX: 'test:sandbox',
  
  // Import/Export permissions
  EXPORT_RULES: 'export:rules',
  IMPORT_RULES: 'import:rules',
  
  // Fandom administration
  MANAGE_FANDOM: 'fandom:manage',
  ACCESS_FANDOM: 'fandom:access',
  
  // System administration
  MANAGE_ADMINS: 'admin:manage',
  VIEW_ANALYTICS: 'analytics:view',
  SYSTEM_CONFIG: 'system:config',
} as const;

export const PERMISSIONS = {
  // Fandom permissions
  CREATE_FANDOM: 'create:fandom',
  UPDATE_FANDOM: 'update:fandom',
  DELETE_FANDOM: 'delete:fandom',

  // Tag permissions
  CREATE_TAG: 'create:tag',
  UPDATE_TAG: 'update:tag',
  DELETE_TAG: 'delete:tag',

  // Tag class permissions
  CREATE_TAG_CLASS: 'create:tag_class',
  UPDATE_TAG_CLASS: 'update:tag_class',
  DELETE_TAG_CLASS: 'delete:tag_class',

  // Plot block permissions
  CREATE_PLOT_BLOCK: 'create:plot_block',
  UPDATE_PLOT_BLOCK: 'update:plot_block',
  DELETE_PLOT_BLOCK: 'delete:plot_block',

  // System permissions
  MANAGE_USERS: 'manage:users',
  
  // Include admin permissions
  ...ADMIN_PERMISSIONS,
} as const;

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS = {
  [USER_ROLES.PROJECT_ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.FANDOM_ADMIN]: [
    // Rule management for assigned fandoms
    PERMISSIONS.CREATE_RULE,
    PERMISSIONS.UPDATE_RULE,
    PERMISSIONS.DELETE_RULE,
    PERMISSIONS.PUBLISH_RULE,
    
    // Template usage (not creation)
    PERMISSIONS.EXPORT_RULES,
    PERMISSIONS.IMPORT_RULES,
    
    // Testing
    PERMISSIONS.RUN_TESTS,
    PERMISSIONS.CREATE_TEST_SCENARIO,
    PERMISSIONS.MANAGE_TEST_SANDBOX,
    
    // Fandom access (scoped to assigned fandoms)
    PERMISSIONS.ACCESS_FANDOM,
    
    // Standard content permissions
    PERMISSIONS.CREATE_TAG,
    PERMISSIONS.UPDATE_TAG,
    PERMISSIONS.DELETE_TAG,
    PERMISSIONS.CREATE_TAG_CLASS,
    PERMISSIONS.UPDATE_TAG_CLASS,
    PERMISSIONS.DELETE_TAG_CLASS,
    PERMISSIONS.CREATE_PLOT_BLOCK,
    PERMISSIONS.UPDATE_PLOT_BLOCK,
    PERMISSIONS.DELETE_PLOT_BLOCK,
  ],
  // Legacy roles
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

      if (!AdminAccessControl.hasPermission(authContext, permission)) {
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
        ? permissions.every(p => AdminAccessControl.hasPermission(authContext, p))
        : permissions.some(p => AdminAccessControl.hasPermission(authContext, p));

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
  private static getPermissionsForRoles(roles: string[]): Array<{
    id: string;
    name: string;
    description: string;
    scope: 'global' | 'fandom' | 'content';
    resource?: string;
  }> {
    const permissions = new Set<string>();

    for (const role of roles) {
      const rolePermissions =
        ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    }

    // Convert permission strings to permission objects
    return Array.from(permissions).map(permissionId => ({
      id: permissionId,
      name: permissionId.replace(/[:\-]/g, ' ').toUpperCase(),
      description: `Permission to ${permissionId}`,
      scope: 'global' as const, // Default to global scope, could be enhanced
    }));
  }
}

/**
 * Admin-specific access control utilities
 */
export class AdminAccessControl {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(authContext: AuthContext, permissionId: string, resource?: string): boolean {
    return authContext.user.permissions.some(permission => {
      if (permission.id !== permissionId) return false;
      
      // If resource is specified, check scoped permissions
      if (resource) {
        return permission.scope !== 'global' && permission.resource === resource;
      }
      
      // Otherwise, any scope is acceptable
      return true;
    });
  }

  /**
   * Check if user is a ProjectAdmin (global access)
   */
  static isProjectAdmin(authContext: AuthContext): boolean {
    return authContext.user.roles.includes(USER_ROLES.PROJECT_ADMIN);
  }

  /**
   * Check if user is a FandomAdmin for specific fandom
   */
  static isFandomAdmin(authContext: AuthContext, fandomId?: string): boolean {
    if (!authContext.user.roles.includes(USER_ROLES.FANDOM_ADMIN)) {
      return false;
    }
    
    // If no fandomId specified, check if user is any kind of FandomAdmin
    if (!fandomId) {
      return true;
    }
    
    // Check if user has access to specific fandom
    return authContext.user.permissions.some(
      permission => permission.scope === 'fandom' && permission.resource === fandomId
    );
  }

  /**
   * Check if user can manage validation rules for a fandom
   */
  static canManageRules(authContext: AuthContext, fandomId: string): boolean {
    // ProjectAdmin can manage all rules
    if (AdminAccessControl.isProjectAdmin(authContext)) {
      return true;
    }
    
    // FandomAdmin can manage rules for assigned fandoms
    return AdminAccessControl.isFandomAdmin(authContext, fandomId) &&
           AdminAccessControl.hasPermission(authContext, PERMISSIONS.CREATE_RULE, fandomId);
  }

  /**
   * Check if user can manage rule templates (ProjectAdmin only)
   */
  static canManageTemplates(authContext: AuthContext): boolean {
    return AdminAccessControl.isProjectAdmin(authContext) &&
           AdminAccessControl.hasPermission(authContext, PERMISSIONS.MANAGE_TEMPLATES);
  }

  /**
   * Require ProjectAdmin role
   */
  static requireProjectAdmin<T extends any[]>(
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

      if (!AdminAccessControl.isProjectAdmin(authContext)) {
        throw ErrorFactory.forbidden('ProjectAdmin access required');
      }

      return handler(request, authContext, ...args);
    };
  }

  /**
   * Require FandomAdmin role for specific fandom
   */
  static requireFandomAdmin<T extends any[]>(
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

      if (!AdminAccessControl.canManageRules(authContext, fandomId)) {
        throw ErrorFactory.forbidden(
          `FandomAdmin access required for fandom: ${fandomId}`
        );
      }

      return handler(request, authContext, fandomId, ...args);
    };
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
    if (!AdminAccessControl.hasPermission(authContext, permission, fandomId)) {
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
