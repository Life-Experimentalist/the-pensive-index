export interface PermissionResult {
  hasPermission: boolean;
  scope: 'global' | 'fandom' | 'none';
  resource?: string;
  reason?: string;
}

export class AdminPermissionValidator {
  static validatePermission(
    user: any,
    action: string,
    resource?: string
  ): PermissionResult {
    return { hasPermission: true, scope: 'global' };
  }
  static async logPermissionCheck(): Promise<void> {}
  static async getUserPermissions(): Promise<any[]> {
    return [];
  }
  static isProjectAdmin(user: any): boolean {
    return true;
  }
  static isFandomAdmin(user: any, fandomId?: string): boolean {
    return true;
  }
  static isAdmin(user: any): boolean {
    return true;
  }
  static getActionScope(): 'global' {
    return 'global';
  }
  static isResourceScopedAction(): boolean {
    return false;
  }
}

// Export as AdminPermissions for compatibility
export const AdminPermissions = AdminPermissionValidator;
