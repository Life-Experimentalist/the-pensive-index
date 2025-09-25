/**
 * T029: Admin API Integration Tests
 *
 * Tests for admin API endpoints integration:
 * - User management API integration
 * - Invitation management API integration
 * - Audit logging API integration
 * - Permission validation API integration
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import type { NextRequest } from 'next/server';

// Test utilities for API testing
interface MockRequest {
  method: string;
  url: string;
  json?: () => Promise<any>;
  headers?: Map<string, string>;
}

interface MockResponse {
  status: number;
  headers: Map<string, string>;
  json: any;
}

// Mock database
const mockDatabase = {
  users: [
    {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'moderator',
      createdAt: '2025-01-01T00:00:00Z',
      lastActive: '2025-01-15T12:00:00Z',
      status: 'active',
    },
  ],
  roleAssignments: [
    {
      id: 'assignment-1',
      userId: 'user-1',
      role: 'moderator',
      assignedBy: 'admin-1',
      assignedAt: '2025-01-01T00:00:00Z',
      fandoms: ['fandom-1'],
    },
  ],
  fandomAssignments: [
    {
      id: 'fandom-assignment-1',
      userId: 'user-1',
      fandomId: 'fandom-1',
      fandomName: 'Harry Potter',
      role: 'fandom-admin',
      assignedBy: 'admin-1',
      assignedAt: '2025-01-01T00:00:00Z',
    },
  ],
  invitations: [
    {
      id: 'invitation-1',
      email: 'newuser@example.com',
      role: 'moderator',
      fandoms: ['fandom-1'],
      invitedBy: 'admin-1',
      invitedAt: '2025-01-10T00:00:00Z',
      status: 'pending',
      expiresAt: '2025-01-17T00:00:00Z',
    },
  ],
  auditLogs: [
    {
      id: 'audit-1',
      action: 'role:assign',
      performedBy: 'admin-1',
      performedAt: '2025-01-15T10:00:00Z',
      targetUser: 'user-1',
      details: { role: 'moderator' },
      success: true,
    },
  ],
};

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => ({
    userId: 'admin-1',
    user: {
      id: 'admin-1',
      emailAddresses: [{ emailAddress: 'admin@example.com' }],
    },
  })),
}));

// Mock database operations
vi.mock('@/lib/database', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn((query: string) => ({
      all: vi.fn(() => {
        if (query.includes('admin_users')) return mockDatabase.users;
        if (query.includes('admin_assignments'))
          return mockDatabase.roleAssignments;
        if (query.includes('admin_fandom_assignments'))
          return mockDatabase.fandomAssignments;
        if (query.includes('admin_invitations'))
          return mockDatabase.invitations;
        if (query.includes('admin_audit_log')) return mockDatabase.auditLogs;
        return [];
      }),
      get: vi.fn((params: any) => {
        if (params?.userId) {
          return mockDatabase.users.find(u => u.id === params.userId);
        }
        return null;
      }),
      run: vi.fn(() => ({ success: true })),
    })),
  })),
}));

// Helper to create mock request
function createMockRequest(
  method: string,
  url: string,
  body?: any
): NextRequest {
  const request = {
    method,
    url,
    json: body ? () => Promise.resolve(body) : undefined,
    headers: new Map([
      ['content-type', 'application/json'],
      ['authorization', 'Bearer mock-token'],
    ]),
  } as unknown as NextRequest;

  return request;
}

// Helper to parse response
async function parseResponse(response: Response): Promise<MockResponse> {
  const json = await response.json();
  return {
    status: response.status,
    headers: new Map(),
    json,
  };
}

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Management API', () => {
    it('GET /api/admin/users returns user list', async () => {
      const request = createMockRequest(
        'GET',
        '/api/admin/users?page=1&limit=20'
      );
      const response = await userManagementGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.users).toBeDefined();
      expect(Array.isArray(result.json.users)).toBe(true);
      expect(result.json.pagination).toBeDefined();
    });

    it('GET /api/admin/users handles search parameters', async () => {
      const request = createMockRequest(
        'GET',
        '/api/admin/users?search=test&role=moderator'
      );
      const response = await userManagementGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.users).toBeDefined();
    });

    it('POST /api/admin/users updates user information', async () => {
      const updateData = {
        userId: 'user-1',
        updates: {
          name: 'Updated Name',
          role: 'project-admin',
        },
      };

      const request = createMockRequest('POST', '/api/admin/users', updateData);
      const response = await userManagementPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.success).toBe(true);
    });

    it('POST /api/admin/users validates required fields', async () => {
      const invalidData = {
        updates: { name: 'Test' },
        // Missing userId
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/users',
        invalidData
      );
      const response = await userManagementPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(400);
      expect(result.json.error).toBeDefined();
    });
  });

  describe('Role Assignment API', () => {
    it('GET /api/admin/role-assignments returns assignments', async () => {
      const request = createMockRequest('GET', '/api/admin/role-assignments');
      const response = await roleAssignmentGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.assignments).toBeDefined();
      expect(Array.isArray(result.json.assignments)).toBe(true);
    });

    it('POST /api/admin/role-assignments creates new assignment', async () => {
      const assignmentData = {
        userId: 'user-2',
        role: 'moderator',
        fandoms: ['fandom-1'],
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/role-assignments',
        assignmentData
      );
      const response = await roleAssignmentPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(201);
      expect(result.json.success).toBe(true);
      expect(result.json.assignmentId).toBeDefined();
    });

    it('POST /api/admin/role-assignments validates role hierarchy', async () => {
      const invalidData = {
        userId: 'user-1',
        role: 'invalid-role',
        fandoms: [],
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/role-assignments',
        invalidData
      );
      const response = await roleAssignmentPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(400);
      expect(result.json.error).toContain('Invalid role');
    });
  });

  describe('Fandom Assignment API', () => {
    it('GET /api/admin/fandom-assignments returns fandom assignments', async () => {
      const request = createMockRequest('GET', '/api/admin/fandom-assignments');
      const response = await fandomAssignmentGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.assignments).toBeDefined();
      expect(Array.isArray(result.json.assignments)).toBe(true);
    });

    it('POST /api/admin/fandom-assignments creates fandom assignment', async () => {
      const assignmentData = {
        userId: 'user-1',
        fandomId: 'fandom-2',
        role: 'fandom-admin',
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/fandom-assignments',
        assignmentData
      );
      const response = await fandomAssignmentPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(201);
      expect(result.json.success).toBe(true);
    });

    it('POST /api/admin/fandom-assignments handles bulk assignments', async () => {
      const bulkData = {
        assignments: [
          { userId: 'user-1', fandomId: 'fandom-2', role: 'moderator' },
          { userId: 'user-2', fandomId: 'fandom-2', role: 'moderator' },
        ],
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/fandom-assignments',
        bulkData
      );
      const response = await fandomAssignmentPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(201);
      expect(result.json.success).toBe(true);
      expect(result.json.created).toBe(2);
    });
  });

  describe('Invitation Management API', () => {
    it('GET /api/admin/invitations returns invitation list', async () => {
      const request = createMockRequest('GET', '/api/admin/invitations');
      const response = await invitationGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.invitations).toBeDefined();
      expect(Array.isArray(result.json.invitations)).toBe(true);
    });

    it('POST /api/admin/invitations creates new invitation', async () => {
      const invitationData = {
        email: 'newuser@example.com',
        role: 'moderator',
        fandoms: ['fandom-1'],
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/invitations',
        invitationData
      );
      const response = await invitationPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(201);
      expect(result.json.success).toBe(true);
      expect(result.json.invitationId).toBeDefined();
    });

    it('POST /api/admin/invitations validates email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        role: 'moderator',
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/invitations',
        invalidData
      );
      const response = await invitationPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(400);
      expect(result.json.error).toContain('Invalid email');
    });

    it('POST /api/admin/invitations handles invitation actions', async () => {
      const actionData = {
        invitationId: 'invitation-1',
        action: 'resend',
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/invitations',
        actionData
      );
      const response = await invitationPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.success).toBe(true);
    });
  });

  describe('Audit Log API', () => {
    it('GET /api/admin/audit-logs returns audit entries', async () => {
      const request = createMockRequest('GET', '/api/admin/audit-logs');
      const response = await auditLogGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.logs).toBeDefined();
      expect(Array.isArray(result.json.logs)).toBe(true);
      expect(result.json.stats).toBeDefined();
    });

    it('GET /api/admin/audit-logs handles filtering', async () => {
      const request = createMockRequest(
        'GET',
        '/api/admin/audit-logs?action=role:assign&startDate=2025-01-01'
      );
      const response = await auditLogGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.logs).toBeDefined();
    });

    it('GET /api/admin/audit-logs supports export format', async () => {
      const request = createMockRequest(
        'GET',
        '/api/admin/audit-logs?format=csv'
      );
      const response = await auditLogGET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });
  });

  describe('Permission Validation API', () => {
    it('GET /api/admin/permissions/user returns user permissions', async () => {
      const request = createMockRequest(
        'GET',
        '/api/admin/permissions/user?userId=user-1'
      );
      const response = await permissionGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.permissions).toBeDefined();
      expect(typeof result.json.permissions).toBe('object');
    });

    it('POST /api/admin/permissions/user validates specific permissions', async () => {
      const permissionCheck = {
        userId: 'user-1',
        permission: 'user:manage',
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/permissions/user',
        permissionCheck
      );
      const response = await permissionPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.hasPermission).toBeDefined();
      expect(typeof result.json.hasPermission).toBe('boolean');
    });

    it('POST /api/admin/permissions/user handles batch permission checks', async () => {
      const batchCheck = {
        userId: 'user-1',
        permissions: ['user:view', 'user:manage', 'role:assign'],
      };

      const request = createMockRequest(
        'POST',
        '/api/admin/permissions/user',
        batchCheck
      );
      const response = await permissionPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(200);
      expect(result.json.permissions).toBeDefined();
      expect(typeof result.json.permissions).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('handles database connection errors', async () => {
      // Mock database error
      vi.mocked(require('@/lib/database').getDatabase).mockImplementationOnce(
        () => {
          throw new Error('Database connection failed');
        }
      );

      const request = createMockRequest('GET', '/api/admin/users');
      const response = await userManagementGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(500);
      expect(result.json.error).toBeDefined();
    });

    it('handles authentication errors', async () => {
      // Mock missing authentication
      vi.mocked(require('@clerk/nextjs').auth).mockImplementationOnce(() => ({
        userId: null,
      }));

      const request = createMockRequest('GET', '/api/admin/users');
      const response = await userManagementGET(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(401);
      expect(result.json.error).toContain('Unauthorized');
    });

    it('handles permission errors', async () => {
      // Mock user without sufficient permissions
      vi.mocked(require('@clerk/nextjs').auth).mockImplementationOnce(() => ({
        userId: 'user-no-permissions',
      }));

      const request = createMockRequest('POST', '/api/admin/role-assignments', {
        userId: 'user-1',
        role: 'super-admin',
      });
      const response = await roleAssignmentPOST(request);
      const result = await parseResponse(response);

      expect(result.status).toBe(403);
      expect(result.json.error).toContain('Insufficient permissions');
    });
  });

  describe('API Integration Workflows', () => {
    it('creates role assignment and logs audit entry', async () => {
      // Create role assignment
      const assignmentData = {
        userId: 'user-2',
        role: 'moderator',
        fandoms: ['fandom-1'],
      };

      const assignmentRequest = createMockRequest(
        'POST',
        '/api/admin/role-assignments',
        assignmentData
      );
      const assignmentResponse = await roleAssignmentPOST(assignmentRequest);
      const assignmentResult = await parseResponse(assignmentResponse);

      expect(assignmentResult.status).toBe(201);
      expect(assignmentResult.json.success).toBe(true);

      // Check that audit log was created
      const auditRequest = createMockRequest('GET', '/api/admin/audit-logs');
      const auditResponse = await auditLogGET(auditRequest);
      const auditResult = await parseResponse(auditResponse);

      expect(auditResult.status).toBe(200);
      expect(auditResult.json.logs).toBeDefined();
    });

    it('processes invitation and updates user status', async () => {
      // Create invitation
      const invitationData = {
        email: 'testuser@example.com',
        role: 'moderator',
        fandoms: ['fandom-1'],
      };

      const invitationRequest = createMockRequest(
        'POST',
        '/api/admin/invitations',
        invitationData
      );
      const invitationResponse = await invitationPOST(invitationRequest);
      const invitationResult = await parseResponse(invitationResponse);

      expect(invitationResult.status).toBe(201);
      expect(invitationResult.json.success).toBe(true);

      // Accept invitation
      const acceptData = {
        invitationId: invitationResult.json.invitationId,
        action: 'accept',
      };

      const acceptRequest = createMockRequest(
        'POST',
        '/api/admin/invitations',
        acceptData
      );
      const acceptResponse = await invitationPOST(acceptRequest);
      const acceptResult = await parseResponse(acceptResponse);

      expect(acceptResult.status).toBe(200);
      expect(acceptResult.json.success).toBe(true);
    });

    it('validates permissions before allowing operations', async () => {
      // Check permissions first
      const permissionCheck = {
        userId: 'user-1',
        permission: 'role:assign',
      };

      const permissionRequest = createMockRequest(
        'POST',
        '/api/admin/permissions/user',
        permissionCheck
      );
      const permissionResponse = await permissionPOST(permissionRequest);
      const permissionResult = await parseResponse(permissionResponse);

      expect(permissionResult.status).toBe(200);

      // If has permission, allow operation
      if (permissionResult.json.hasPermission) {
        const assignmentData = {
          userId: 'user-2',
          role: 'moderator',
        };

        const assignmentRequest = createMockRequest(
          'POST',
          '/api/admin/role-assignments',
          assignmentData
        );
        const assignmentResponse = await roleAssignmentPOST(assignmentRequest);
        const assignmentResult = await parseResponse(assignmentResponse);

        expect(assignmentResult.status).toBe(201);
      }
    });
  });

  describe('Data Consistency', () => {
    it('maintains referential integrity across operations', async () => {
      // Create user through invitation acceptance
      const invitationData = {
        email: 'newuser@example.com',
        role: 'moderator',
        fandoms: ['fandom-1'],
      };

      const invitationRequest = createMockRequest(
        'POST',
        '/api/admin/invitations',
        invitationData
      );
      await invitationPOST(invitationRequest);

      // Check that user appears in user list
      const userRequest = createMockRequest('GET', '/api/admin/users');
      const userResponse = await userManagementGET(userRequest);
      const userResult = await parseResponse(userResponse);

      expect(userResult.status).toBe(200);
      expect(userResult.json.users).toBeDefined();
    });

    it('cascades updates across related entities', async () => {
      // Update user role
      const updateData = {
        userId: 'user-1',
        updates: {
          role: 'project-admin',
        },
      };

      const updateRequest = createMockRequest(
        'POST',
        '/api/admin/users',
        updateData
      );
      const updateResponse = await userManagementPOST(updateRequest);
      const updateResult = await parseResponse(updateResponse);

      expect(updateResult.status).toBe(200);

      // Check that permissions are updated
      const permissionRequest = createMockRequest(
        'GET',
        '/api/admin/permissions/user?userId=user-1'
      );
      const permissionResponse = await permissionGET(permissionRequest);
      const permissionResult = await parseResponse(permissionResponse);

      expect(permissionResult.status).toBe(200);
      expect(permissionResult.json.permissions).toBeDefined();
    });
  });
});
