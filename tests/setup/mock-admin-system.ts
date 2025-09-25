/**
 * Mock Admin System for Workflow Testing
 *
 * Simulates the admin system behavior for comprehensive workflow testing
 */

import { vi } from 'vitest';
import {
  TestUser,
  TestHierarchy,
  AuditEvent,
  APICall,
  DatabaseOperation,
  MockSystemState,
} from '../types/workflow-types';

export class MockAdminSystem {
  private state: MockSystemState;
  private networkErrors: Map<string, boolean> = new Map();

  constructor() {
    this.state = {
      users: [],
      roles: new Map(),
      permissions: new Map(),
      invitations: new Map(),
      auditEvents: [],
      apiCalls: [],
      databaseOperations: [],
    };
  }

  async initialize(): Promise<void> {
    console.log('Initializing Mock Admin System');

    // Setup mock API handlers
    this.setupMockAPI();

    // Create default admin user
    await this.createTestUsers([
      { email: 'admin@example.com', name: 'Admin User', role: 'super-admin' },
    ]);
  }

  private setupMockAPI(): void {
    // Mock fetch globally for API calls
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, options: any = {}) => {
        const method = options.method || 'GET';
        const key = `${method}:${url}`;

        // Record API call
        this.state.apiCalls.push({
          method,
          path: url,
          data: options.body ? JSON.parse(options.body) : undefined,
          timestamp: new Date(),
        });

        // Check for simulated network errors
        if (this.networkErrors.has(key)) {
          return Promise.reject(new Error('Network error'));
        }

        // Return mock responses based on endpoint
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(this.generateMockResponse(url, method, options)),
        });
      });
  }

  private generateMockResponse(url: string, method: string, options: any): any {
    if (url.includes('/api/admin/users') && method === 'POST') {
      return { success: true, message: 'User created successfully' };
    }

    if (url.includes('/api/admin/roles/assign') && method === 'POST') {
      return { success: true, message: 'Role assigned successfully' };
    }

    if (url.includes('/api/admin/invitations') && method === 'POST') {
      return { success: true, message: 'Invitation sent successfully' };
    }

    if (url.includes('/api/admin/audit') && method === 'GET') {
      return {
        success: true,
        data: this.state.auditEvents.slice(0, 10),
        total: this.state.auditEvents.length,
      };
    }

    return { success: true, data: {} };
  }

  async createTestUsers(users: TestUser[]): Promise<void> {
    for (const user of users) {
      this.state.users.push(user);

      if (user.role) {
        this.state.roles.set(user.email, [user.role]);
      }

      // Create audit event
      this.state.auditEvents.push({
        action: 'USER_CREATED',
        actor: 'system',
        target: user.email,
        timestamp: new Date(),
      });

      // Record database operation
      this.state.databaseOperations.push({
        table: 'users',
        operation: 'INSERT',
        data: user,
      });
    }

    console.log(`Created ${users.length} test users`);
  }

  async createTestHierarchy(hierarchy: TestHierarchy): Promise<void> {
    const users = Object.values(hierarchy);
    await this.createTestUsers(users);

    console.log('Test hierarchy created');
  }

  async generateAuditEvents(events: AuditEvent[]): Promise<void> {
    for (const event of events) {
      this.state.auditEvents.push({
        ...event,
        timestamp: event.timestamp || new Date(),
      });
    }

    console.log(`Generated ${events.length} audit events`);
  }

  simulateNetworkError(path: string, method: string = 'GET'): void {
    const key = `${method}:${path}`;
    this.networkErrors.set(key, true);
    console.log(`Simulating network error for ${key}`);
  }

  clearNetworkError(path: string, method: string = 'GET'): void {
    const key = `${method}:${path}`;
    this.networkErrors.delete(key);
    console.log(`Cleared network error for ${key}`);
  }

  async simulateInvitationAcceptance(email: string): Promise<void> {
    this.state.invitations.set(email, {
      status: 'accepted',
      acceptedAt: new Date(),
    });

    // Create user account
    await this.createTestUsers([
      { email, name: 'Invited User', role: 'moderator' },
    ]);

    console.log(`Simulated invitation acceptance for ${email}`);
  }

  async expireInvitation(email: string): Promise<void> {
    this.state.invitations.set(email, {
      status: 'expired',
      expiredAt: new Date(),
    });

    console.log(`Expired invitation for ${email}`);
  }

  // Verification methods for assertions
  verifyAPICall(method: string, path: string, data?: any): boolean {
    return this.state.apiCalls.some(
      call =>
        call.method === method &&
        call.path.includes(path) &&
        (!data || JSON.stringify(call.data) === JSON.stringify(data))
    );
  }

  verifyAPIRejection(method: string, path: string): boolean {
    const key = `${method}:${path}`;
    return this.networkErrors.has(key);
  }

  hasAPICall(method: string, path: string, data?: any): boolean {
    return this.verifyAPICall(method, path, data);
  }

  verifyDatabaseUpdate(table: string, data: any): boolean {
    return this.state.databaseOperations.some(
      op =>
        op.table === table &&
        op.operation === 'UPDATE' &&
        Object.keys(data).every(key => op.data && op.data[key] === data[key])
    );
  }

  verifyAuditEntry(action: string, details: any): boolean {
    return this.state.auditEvents.some(
      event =>
        event.action === action &&
        Object.keys(details).every(
          key => event.details && event.details[key] === details[key]
        )
    );
  }

  verifyUserCount(expectedCount: number): boolean {
    return this.state.users.length === expectedCount;
  }

  verifyHierarchySetup(): boolean {
    const roles = ['super-admin', 'project-admin', 'fandom-admin', 'moderator'];
    return roles.every(role =>
      Array.from(this.state.roles.values()).some(userRoles =>
        userRoles.includes(role)
      )
    );
  }

  verifyInvitationCreated(email: string): boolean {
    return this.state.invitations.has(email);
  }

  verifyUserExists(email: string): boolean {
    return this.state.users.some(user => user.email === email);
  }

  verifyAuditEventCount(expectedCount: number): boolean {
    return this.state.auditEvents.length >= expectedCount;
  }

  verifyUserPermissions(email: string, expectedPermissions: string[]): boolean {
    const userPermissions = this.state.permissions.get(email) || [];
    return expectedPermissions.every(permission =>
      userPermissions.includes(permission)
    );
  }

  reset(): void {
    this.state = {
      users: [],
      roles: new Map(),
      permissions: new Map(),
      invitations: new Map(),
      auditEvents: [],
      apiCalls: [],
      databaseOperations: [],
    };
    this.networkErrors.clear();
    console.log('Mock admin system reset');
  }

  // Debug methods
  getState(): MockSystemState {
    return this.state;
  }

  printState(): void {
    console.log('Mock Admin System State:', {
      userCount: this.state.users.length,
      roleCount: this.state.roles.size,
      permissionCount: this.state.permissions.size,
      invitationCount: this.state.invitations.size,
      auditEventCount: this.state.auditEvents.length,
      apiCallCount: this.state.apiCalls.length,
      databaseOpCount: this.state.databaseOperations.length,
    });
  }
}
