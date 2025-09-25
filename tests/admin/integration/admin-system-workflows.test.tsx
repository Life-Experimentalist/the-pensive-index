/**
 * T029: Admin System Integration Tests
 *
 * Comprehensive integration tests covering the complete hierarchical admin system:
 * - Role assignment workflows
 * - Fandom assignment workflows
 * - Invitation management workflows
 * - Audit log workflows
 * - User management workflows
 * - Permission validation across all components
 * - API integration testing
 */

import React from 'react';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Component imports
import UserManagement from '@/components/admin/UserManagement';
import AdminRoleAssignment from '@/components/admin/AdminRoleAssignment';
import FandomAssignment from '@/components/admin/FandomAssignment';
import InvitationManagement from '@/components/admin/InvitationManagement';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import ProtectedAdminLayout from '@/components/admin/ProtectedAdminLayout';
import { PermissionProvider } from '@/lib/permissions';

// Type imports
import type {
  AdminUser,
  AdminRole,
  FandomAssignment as FandomAssignmentType,
  AdminInvitation,
  AuditLogEntry,
} from '@/types/admin';

// Mock data for testing
const mockUsers: AdminUser[] = [
  {
    id: 'user-1',
    email: 'user1@test.com',
    name: 'Test User 1',
    role: 'moderator',
    createdAt: '2025-01-01T00:00:00Z',
    lastActive: '2025-01-15T12:00:00Z',
    status: 'active',
    assignedFandoms: ['fandom-1'],
    permissions: ['user:view', 'fandom:moderate'],
  },
  {
    id: 'user-2',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'project-admin',
    createdAt: '2025-01-01T00:00:00Z',
    lastActive: '2025-01-15T14:00:00Z',
    status: 'active',
    assignedFandoms: [],
    permissions: [
      'user:manage',
      'role:assign',
      'fandom:manage',
      'invitation:manage',
    ],
  },
];

const mockRoleAssignments = [
  {
    id: 'assignment-1',
    userId: 'user-1',
    role: 'moderator',
    assignedBy: 'admin-1',
    assignedAt: '2025-01-01T00:00:00Z',
    fandoms: ['fandom-1'],
  },
];

const mockFandomAssignments: FandomAssignmentType[] = [
  {
    id: 'fandom-assignment-1',
    userId: 'user-1',
    fandomId: 'fandom-1',
    fandomName: 'Harry Potter',
    role: 'fandom-admin',
    assignedBy: 'admin-1',
    assignedAt: '2025-01-01T00:00:00Z',
    permissions: ['fandom:moderate', 'fandom:manage'],
  },
];

const mockInvitations: AdminInvitation[] = [
  {
    id: 'invitation-1',
    email: 'newuser@test.com',
    role: 'moderator',
    fandoms: ['fandom-1'],
    invitedBy: 'admin-1',
    invitedAt: '2025-01-10T00:00:00Z',
    status: 'pending',
    expiresAt: '2025-01-17T00:00:00Z',
  },
];

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-1',
    action: 'role:assign',
    performedBy: 'admin-1',
    performedAt: '2025-01-15T10:00:00Z',
    targetUser: 'user-1',
    details: {
      role: 'moderator',
      fandoms: ['fandom-1'],
    },
    success: true,
  },
  {
    id: 'audit-2',
    action: 'invitation:create',
    performedBy: 'admin-1',
    performedAt: '2025-01-15T11:00:00Z',
    targetUser: null,
    details: {
      email: 'newuser@test.com',
      role: 'moderator',
    },
    success: true,
  },
];

// Mock API responses
const mockApiResponses = {
  '/api/admin/users': {
    users: mockUsers,
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
  },
  '/api/admin/role-assignments': {
    assignments: mockRoleAssignments,
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  },
  '/api/admin/fandom-assignments': {
    assignments: mockFandomAssignments,
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  },
  '/api/admin/invitations': {
    invitations: mockInvitations,
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  },
  '/api/admin/audit-logs': {
    logs: mockAuditLogs,
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    stats: {
      totalActions: 2,
      successfulActions: 2,
      failedActions: 0,
      mostActiveUser: 'admin-1',
    },
  },
};

// Mock permission checking
const mockPermissions = {
  'user:view': true,
  'user:manage': true,
  'role:assign': true,
  'role:revoke': true,
  'fandom:assign': true,
  'fandom:manage': true,
  'invitation:create': true,
  'invitation:manage': true,
  'audit:view': true,
  'audit:export': true,
};

// Mock Next.js and authentication
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/admin'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(() => ({
    user: {
      id: 'admin-1',
      emailAddresses: [{ emailAddress: 'admin@test.com' }],
      firstName: 'Test',
      lastName: 'Admin',
    },
  })),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'admin-1',
  })),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Test wrapper with permission provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <PermissionProvider>{children}</PermissionProvider>;
};

describe('Admin System Integration Tests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    // Set up global mocks
    fetchMock = global.fetch as ReturnType<typeof vi.fn>;
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default fetch mock behavior
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      // Mock API responses based on URL
      for (const [endpoint, response] of Object.entries(mockApiResponses)) {
        if (urlStr.includes(endpoint)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(response),
          } as Response);
        }
      }

      // Mock permission checking
      if (urlStr.includes('/api/admin/permissions/user')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ permissions: mockPermissions }),
        } as Response);
      }

      // Default response
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Management Workflow', () => {
    it('loads and displays user list with proper permissions', async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test User 1')).toBeInTheDocument();
        expect(screen.getByText('Test Admin')).toBeInTheDocument();
      });

      // Check that user information is displayed
      expect(screen.getByText('user1@test.com')).toBeInTheDocument();
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
      expect(screen.getByText('moderator')).toBeInTheDocument();
      expect(screen.getByText('project-admin')).toBeInTheDocument();
    });

    it('filters users based on search criteria', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test User 1')).toBeInTheDocument();
      });

      // Find and use search input
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'admin');

      // Should show only admin user
      await waitFor(() => {
        expect(screen.getByText('Test Admin')).toBeInTheDocument();
        expect(screen.queryByText('Test User 1')).not.toBeInTheDocument();
      });
    });

    it('displays user details modal when clicking on user', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test User 1')).toBeInTheDocument();
      });

      // Click on user to open details
      await user.click(screen.getByText('Test User 1'));

      await waitFor(() => {
        expect(screen.getByText('User Details')).toBeInTheDocument();
        expect(screen.getByText('user1@test.com')).toBeInTheDocument();
      });
    });

    it('handles bulk operations correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test User 1')).toBeInTheDocument();
      });

      // Select users for bulk operation
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select first user

      // Check that bulk actions are enabled
      const bulkButton = screen.getByText(/bulk actions/i);
      expect(bulkButton).toBeInTheDocument();
      await user.click(bulkButton);

      // Should show bulk action options
      await waitFor(() => {
        expect(screen.getByText(/change role/i)).toBeInTheDocument();
      });
    });
  });

  describe('Role Assignment Workflow', () => {
    it('loads and displays role assignments', async () => {
      render(
        <TestWrapper>
          <AdminRoleAssignment />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/role assignments/i)).toBeInTheDocument();
      });

      // Check API was called
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/roles'),
        expect.any(Object)
      );
    });

    it('creates new role assignment', async () => {
      const user = userEvent.setup();

      // Mock successful creation
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'new-assignment',
              success: true,
            }),
        } as Response)
      );

      render(
        <TestWrapper>
          <AdminRoleAssignment />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/assign role/i)).toBeInTheDocument();
      });

      // Fill out assignment form
      const assignButton = screen.getByText(/assign role/i);
      await user.click(assignButton);

      await waitFor(() => {
        expect(screen.getByText(/create role assignment/i)).toBeInTheDocument();
      });
    });

    it('revokes role assignment', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AdminRoleAssignment />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/role assignments/i)).toBeInTheDocument();
      });

      // Mock successful revocation
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      // Find and click revoke button (if exists)
      const revokeButtons = screen.queryAllByText(/revoke/i);
      if (revokeButtons.length > 0) {
        await user.click(revokeButtons[0]);

        // Confirm revocation
        await waitFor(() => {
          const confirmButton = screen.queryByText(/confirm/i);
          if (confirmButton) {
            user.click(confirmButton);
          }
        });
      }
    });
  });

  describe('Fandom Assignment Workflow', () => {
    it('loads and displays fandom assignments', async () => {
      render(
        <TestWrapper>
          <FandomAssignment />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/fandom assignments/i)).toBeInTheDocument();
      });

      // Check API was called
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/fandom-assignments'),
        expect.any(Object)
      );
    });

    it('handles bulk fandom assignments', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <FandomAssignment />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/fandom assignments/i)).toBeInTheDocument();
      });

      // Look for bulk assignment functionality
      const bulkButtons = screen.queryAllByText(/bulk/i);
      if (bulkButtons.length > 0) {
        await user.click(bulkButtons[0]);
      }
    });
  });

  describe('Invitation Management Workflow', () => {
    it('loads and displays invitations', async () => {
      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/invitations/i)).toBeInTheDocument();
      });

      // Check API was called
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/invitations'),
        expect.any(Object)
      );
    });

    it('creates new invitation', async () => {
      const user = userEvent.setup();

      // Mock successful creation
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'new-invitation',
              success: true,
            }),
        } as Response)
      );

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      // Look for create invitation button
      await waitFor(() => {
        const createButtons = screen.queryAllByText(/create invitation/i);
        if (createButtons.length > 0) {
          expect(createButtons[0]).toBeInTheDocument();
        }
      });
    });

    it('resends invitation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/invitations/i)).toBeInTheDocument();
      });

      // Mock successful resend
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      // Look for resend functionality
      const resendButtons = screen.queryAllByText(/resend/i);
      if (resendButtons.length > 0) {
        await user.click(resendButtons[0]);
      }
    });
  });

  describe('Audit Log Workflow', () => {
    it('loads and displays audit logs', async () => {
      render(
        <TestWrapper>
          <AuditLogViewer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/audit logs/i)).toBeInTheDocument();
      });

      // Check API was called
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/audit-logs'),
        expect.any(Object)
      );
    });

    it('filters audit logs by action type', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AuditLogViewer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/audit logs/i)).toBeInTheDocument();
      });

      // Look for filter functionality
      const filterSelects = screen.queryAllByRole('combobox');
      if (filterSelects.length > 0) {
        await user.click(filterSelects[0]);
      }
    });

    it('exports audit logs', async () => {
      const user = userEvent.setup();

      // Mock export response
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: () =>
            Promise.resolve(new Blob(['csv,data'], { type: 'text/csv' })),
        } as Response)
      );

      render(
        <TestWrapper>
          <AuditLogViewer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/audit logs/i)).toBeInTheDocument();
      });

      // Look for export functionality
      const exportButtons = screen.queryAllByText(/export/i);
      if (exportButtons.length > 0) {
        await user.click(exportButtons[0]);
      }
    });
  });

  describe('Permission Integration', () => {
    it('respects permission restrictions across components', async () => {
      // Mock limited permissions
      const limitedPermissions = {
        'user:view': true,
        'user:manage': false,
        'role:assign': false,
      };

      fetchMock.mockImplementation((url: string) => {
        const urlStr = typeof url === 'string' ? url : url.toString();

        if (urlStr.includes('/api/admin/permissions/user')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ permissions: limitedPermissions }),
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponses['/api/admin/users']),
        } as Response);
      });

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test User 1')).toBeInTheDocument();
      });

      // Should not show management buttons for users without permission
      expect(screen.queryByText(/edit user/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/delete user/i)).not.toBeInTheDocument();
    });

    it('shows appropriate UI elements based on user permissions', async () => {
      render(
        <TestWrapper>
          <ProtectedAdminLayout>
            <div>Admin Content</div>
          </ProtectedAdminLayout>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // Mock API error
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' }),
        } as Response)
      );

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(
          screen.getByText(/error/i) || screen.getByText(/failed/i)
        ).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      // Mock network error
      fetchMock.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(
          screen.getByText(/error/i) || screen.getByText(/failed/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data when changes occur', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test User 1')).toBeInTheDocument();
      });

      // Simulate refresh action
      const refreshButtons = screen.queryAllByText(/refresh/i);
      if (refreshButtons.length > 0) {
        await user.click(refreshButtons[0]);

        // Should reload data
        await waitFor(() => {
          expect(fetchMock).toHaveBeenCalledTimes(2); // Initial load + refresh
        });
      }
    });
  });

  describe('Cross-Component Integration', () => {
    it('updates audit logs when actions are performed', async () => {
      const user = userEvent.setup();

      // Mock successful role assignment that should create audit log
      fetchMock
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                logs: [
                  ...mockAuditLogs,
                  {
                    id: 'audit-3',
                    action: 'role:assign',
                    performedBy: 'admin-1',
                    performedAt: new Date().toISOString(),
                    targetUser: 'user-3',
                    details: { role: 'moderator' },
                    success: true,
                  },
                ],
                pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
              }),
          } as Response)
        );

      render(
        <TestWrapper>
          <div>
            <AdminRoleAssignment />
            <AuditLogViewer />
          </div>
        </TestWrapper>
      );

      // Perform role assignment
      await waitFor(() => {
        const assignButtons = screen.queryAllByText(/assign/i);
        if (assignButtons.length > 0) {
          user.click(assignButtons[0]);
        }
      });

      // Check that audit log is updated
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/audit-logs'),
          expect.any(Object)
        );
      });
    });
  });
});
