/**
 * T029: Permission System Integration Tests
 *
 * Comprehensive tests for the permission system integration:
 * - Role-based permission inheritance
 * - Permission context provider functionality
 * - Component-level permission checking
 * - API-level permission validation
 * - Cross-component permission consistency
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Component imports
import {
  PermissionProvider,
  usePermissions,
  WithPermission,
  type Permission,
  type AdminRole,
} from '@/lib/permissions';

// Test component to verify permission checking
const TestComponent: React.FC<{
  permission: Permission;
  children: React.ReactNode;
}> = ({ permission, children }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <div>Access Denied</div>;
  }

  return <div>{children}</div>;
};

// Test component to verify multiple permissions
const MultiPermissionComponent: React.FC<{
  permissions: Permission[];
  requireAll?: boolean;
}> = ({ permissions, requireAll = false }) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } =
    usePermissions();

  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return <div>Insufficient Permissions</div>;
  }

  return <div>Access Granted</div>;
};

// Mock user contexts for different roles
const mockUsers = {
  superAdmin: {
    id: 'super-admin-1',
    role: 'super-admin' as AdminRole,
    assignedFandoms: [],
  },
  projectAdmin: {
    id: 'project-admin-1',
    role: 'project-admin' as AdminRole,
    assignedFandoms: [],
  },
  fandomAdmin: {
    id: 'fandom-admin-1',
    role: 'fandom-admin' as AdminRole,
    assignedFandoms: ['fandom-1', 'fandom-2'],
  },
  moderator: {
    id: 'moderator-1',
    role: 'moderator' as AdminRole,
    assignedFandoms: ['fandom-1'],
  },
  noRole: {
    id: 'user-1',
    role: undefined,
    assignedFandoms: [],
  },
};

// Mock Clerk authentication
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
  })),
}));

// Mock API responses
global.fetch = vi.fn();

describe('Permission System Integration Tests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    // Default permission response
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          permissions: {
            'user:view': true,
            'user:manage': false,
          },
        }),
    } as Response);
  });

  describe('Role-Based Permission Inheritance', () => {
    it('super-admin has all permissions', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.superAdmin });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:view': true,
              'user:manage': true,
              'user:delete': true,
              'role:assign': true,
              'role:revoke': true,
              'fandom:create': true,
              'fandom:delete': true,
              'invitation:create': true,
              'invitation:revoke': true,
              'audit:view': true,
              'audit:export': true,
              'analytics:view': true,
              'settings:manage': true,
              'validation:override': true,
              'special:emergency': true,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <TestComponent permission="user:delete">
            Super Admin Content
          </TestComponent>
          <TestComponent permission="fandom:delete">
            Fandom Delete
          </TestComponent>
          <TestComponent permission="special:emergency">
            Emergency
          </TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Super Admin Content')).toBeInTheDocument();
        expect(screen.getByText('Fandom Delete')).toBeInTheDocument();
        expect(screen.getByText('Emergency')).toBeInTheDocument();
      });
    });

    it('project-admin has project-level permissions but not special permissions', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:view': true,
              'user:manage': true,
              'user:delete': false,
              'role:assign': true,
              'role:revoke': true,
              'fandom:create': true,
              'fandom:delete': false,
              'invitation:create': true,
              'invitation:revoke': true,
              'audit:view': true,
              'audit:export': true,
              'analytics:view': true,
              'settings:manage': false,
              'validation:override': false,
              'special:emergency': false,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <TestComponent permission="user:manage">
            User Management
          </TestComponent>
          <TestComponent permission="role:assign">
            Role Assignment
          </TestComponent>
          <TestComponent permission="user:delete">User Delete</TestComponent>
          <TestComponent permission="special:emergency">
            Emergency
          </TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument();
        expect(screen.getByText('Role Assignment')).toBeInTheDocument();
        expect(screen.getAllByText('Access Denied')).toHaveLength(2);
      });
    });

    it('fandom-admin has fandom-specific permissions', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.fandomAdmin });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:view': true,
              'user:manage': false,
              'fandom:moderate': true,
              'fandom:assign': true,
              'invitation:create': true,
              'audit:view': true,
              'role:assign': false,
              'user:delete': false,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <TestComponent permission="fandom:moderate">
            Fandom Moderation
          </TestComponent>
          <TestComponent permission="invitation:create">
            Create Invitations
          </TestComponent>
          <TestComponent permission="role:assign">
            Role Assignment
          </TestComponent>
          <TestComponent permission="user:delete">User Delete</TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Fandom Moderation')).toBeInTheDocument();
        expect(screen.getByText('Create Invitations')).toBeInTheDocument();
        expect(screen.getAllByText('Access Denied')).toHaveLength(2);
      });
    });

    it('moderator has limited permissions', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.moderator });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:view': true,
              'fandom:moderate': true,
              'audit:view': true,
              'user:manage': false,
              'role:assign': false,
              'fandom:assign': false,
              'invitation:create': false,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <TestComponent permission="user:view">View Users</TestComponent>
          <TestComponent permission="fandom:moderate">
            Moderate Fandom
          </TestComponent>
          <TestComponent permission="user:manage">Manage Users</TestComponent>
          <TestComponent permission="role:assign">Assign Roles</TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('View Users')).toBeInTheDocument();
        expect(screen.getByText('Moderate Fandom')).toBeInTheDocument();
        expect(screen.getAllByText('Access Denied')).toHaveLength(2);
      });
    });

    it('user with no role has no admin permissions', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.noRole });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {},
          }),
      } as Response);

      render(
        <PermissionProvider>
          <TestComponent permission="user:view">View Users</TestComponent>
          <TestComponent permission="fandom:moderate">
            Moderate Fandom
          </TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Access Denied')).toHaveLength(2);
      });
    });
  });

  describe('Multiple Permission Checking', () => {
    it('hasAllPermissions requires all specified permissions', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:view': true,
              'user:manage': true,
              'role:assign': false,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <MultiPermissionComponent
            permissions={['user:view', 'user:manage']}
            requireAll={true}
          />
          <MultiPermissionComponent
            permissions={['user:view', 'user:manage', 'role:assign']}
            requireAll={true}
          />
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Granted')).toBeInTheDocument();
        expect(
          screen.getByText('Insufficient Permissions')
        ).toBeInTheDocument();
      });
    });

    it('hasAnyPermission requires at least one permission', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.moderator });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:view': true,
              'role:assign': false,
              'fandom:delete': false,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <MultiPermissionComponent
            permissions={['user:view', 'role:assign']}
            requireAll={false}
          />
          <MultiPermissionComponent
            permissions={['role:assign', 'fandom:delete']}
            requireAll={false}
          />
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Granted')).toBeInTheDocument();
        expect(
          screen.getByText('Insufficient Permissions')
        ).toBeInTheDocument();
      });
    });
  });

  describe('WithPermission Component Wrapper', () => {
    it('renders children when permission is granted', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:manage': true,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <WithPermission permission="user:manage">
            <div>Protected Content</div>
          </WithPermission>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('renders fallback when permission is denied', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.moderator });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:manage': false,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <WithPermission
            permission="user:manage"
            fallback={<div>Custom Fallback</div>}
          >
            <div>Protected Content</div>
          </WithPermission>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('renders nothing when no fallback provided and permission denied', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.moderator });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:delete': false,
            },
          }),
      } as Response);

      render(
        <PermissionProvider>
          <WithPermission permission="user:delete">
            <div>Protected Content</div>
          </WithPermission>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Permission Context Updates', () => {
    it('updates permissions when user role changes', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.moderator });

      // Initial permissions
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:manage': false,
            },
          }),
      } as Response);

      const { rerender } = render(
        <PermissionProvider>
          <TestComponent permission="user:manage">
            User Management
          </TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });

      // Update user role
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      // Updated permissions
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:manage': true,
            },
          }),
      } as Response);

      rerender(
        <PermissionProvider>
          <TestComponent permission="user:manage">
            User Management
          </TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument();
      });
    });

    it('handles permission loading states', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      // Delay permission response
      fetchMock.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: () =>
                    Promise.resolve({
                      permissions: {
                        'user:view': true,
                      },
                    }),
                } as Response),
              100
            )
          )
      );

      render(
        <PermissionProvider>
          <TestComponent permission="user:view">User Content</TestComponent>
        </PermissionProvider>
      );

      // Should show loading or default state initially
      expect(screen.queryByText('User Content')).not.toBeInTheDocument();

      // Should show content after permissions load
      await waitFor(
        () => {
          expect(screen.getByText('User Content')).toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });
  });

  describe('Error Handling', () => {
    it('handles permission API errors gracefully', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      // Mock API error
      fetchMock.mockRejectedValueOnce(new Error('Permission API error'));

      render(
        <PermissionProvider>
          <TestComponent permission="user:view">User Content</TestComponent>
        </PermissionProvider>
      );

      // Should default to denying access on error
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });

    it('handles network errors during permission check', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      // Mock network error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      } as Response);

      render(
        <PermissionProvider>
          <TestComponent permission="user:view">User Content</TestComponent>
        </PermissionProvider>
      );

      // Should default to denying access on error
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });
  });

  describe('Fandom-Specific Permissions', () => {
    it('validates fandom-specific access correctly', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.fandomAdmin });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'fandom:moderate': true,
            },
            fandoms: ['fandom-1', 'fandom-2'],
          }),
      } as Response);

      render(
        <PermissionProvider>
          <TestComponent permission="fandom:moderate">
            Fandom Moderation
          </TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Fandom Moderation')).toBeInTheDocument();
      });
    });
  });

  describe('Permission Caching', () => {
    it('caches permission responses to reduce API calls', async () => {
      const mockUseUser = vi.mocked(require('@clerk/nextjs').useUser);
      mockUseUser.mockReturnValue({ user: mockUsers.projectAdmin });

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            permissions: {
              'user:view': true,
              'user:manage': true,
            },
          }),
      } as Response);

      const { rerender } = render(
        <PermissionProvider>
          <TestComponent permission="user:view">User View</TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('User View')).toBeInTheDocument();
      });

      // Re-render with different permission - should use cached data
      rerender(
        <PermissionProvider>
          <TestComponent permission="user:manage">User Manage</TestComponent>
        </PermissionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('User Manage')).toBeInTheDocument();
      });

      // Should only have made one API call due to caching
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
