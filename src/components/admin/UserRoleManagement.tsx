'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Shield,
  UserCog,
  Loader2,
  CheckCircle,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface FandomAssignment {
  id: number;
  fandom_id: number;
  fandom_name: string;
  fandom_slug: string;
  assigned_at: string;
  assigned_by: string;
}

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  role: string;
  fandomAssignments: FandomAssignment[];
  createdAt: number;
  lastSignInAt: number | null;
  canManage: boolean;
}

interface Fandom {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface UserManagementData {
  users: User[];
  currentUserRole: string;
  currentUserFandoms: FandomAssignment[];
}

export default function UserRoleManagement() {
  const [data, setData] = useState<UserManagementData | null>(null);
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFandomModal, setShowFandomModal] = useState(false);
  const [selectedFandoms, setSelectedFandoms] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
    fetchFandoms();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/users/roles');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFandoms = async () => {
    try {
      const response = await fetch('/api/admin/fandoms/list');
      const result = await response.json();

      if (response.ok) {
        setFandoms(result.fandoms);
      }
    } catch (err) {
      console.error('Failed to fetch fandoms:', err);
    }
  };

  const updateUserRole = async (
    userId: string,
    newRole: string,
    fandomIds?: number[]
  ) => {
    setUpdating(userId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/users/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          role: newRole,
          fandomIds: fandomIds || [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user role');
      }

      setMessage(result.message);
      await fetchData(); // Refresh data
      setShowFandomModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdating(null);
    }
  };

  const handleRoleChange = (user: User, newRole: string) => {
    if (newRole === 'FandomAdmin') {
      // Show fandom selection modal
      setSelectedUser(user);
      setSelectedFandoms(user.fandomAssignments.map(fa => fa.fandom_id));
      setShowFandomModal(true);
    } else {
      // Direct role update for non-fandom roles
      updateUserRole(user.id, newRole);
    }
  };

  const handleFandomAssignment = () => {
    if (selectedUser) {
      updateUserRole(selectedUser.id, 'FandomAdmin', selectedFandoms);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ProjectAdmin':
        return 'destructive';
      case 'FandomAdmin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.emailAddresses[0]?.emailAddress || 'Unknown User';
  };

  const canAssignRole = (targetRole: string) => {
    if (!data) {
      return false;
    }

    if (data.currentUserRole === 'ProjectAdmin') {
      return true; // ProjectAdmin can assign any role
    }

    if (data.currentUserRole === 'FandomAdmin') {
      return targetRole !== 'ProjectAdmin'; // FandomAdmin cannot assign ProjectAdmin
    }

    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <Alert>
          <AlertDescription>
            Failed to load user management data
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <h1 className="text-2xl font-bold">User Role Management</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Your Role: {data.currentUserRole}</Badge>
          {data.currentUserFandoms.length > 0 && (
            <Badge variant="secondary">
              Fandoms:{' '}
              {data.currentUserFandoms.map(f => f.fandom_name).join(', ')}
            </Badge>
          )}
        </div>
      </div>

      {message && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {message}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {data.users.map(user => (
          <Card
            key={user.id}
            className={
              !user.canManage &&
              user.id !== data.users.find(u => u.id === user.id)?.id
                ? 'opacity-60'
                : ''
            }
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold">
                      {getUserDisplayName(user)}
                    </h3>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                    {!user.canManage &&
                      data.currentUserRole !== 'ProjectAdmin' && (
                        <Badge variant="outline" className="text-xs">
                          Read Only
                        </Badge>
                      )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {user.emailAddresses[0]?.emailAddress}
                  </p>

                  {/* Show fandom assignments for FandomAdmin */}
                  {user.role === 'FandomAdmin' &&
                    user.fandomAssignments.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Fandoms:</span>
                        <div className="flex flex-wrap gap-1">
                          {user.fandomAssignments.map(assignment => (
                            <Badge
                              key={assignment.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {assignment.fandom_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Joined: {formatDate(user.createdAt)}</span>
                    {user.lastSignInAt && (
                      <span>Last sign-in: {formatDate(user.lastSignInAt)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {user.canManage ? (
                    <>
                      {updating === user.id ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </div>
                      ) : (
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user, e.target.value)}
                          disabled={updating === user.id}
                          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                        >
                          <option value="User">User</option>
                          {canAssignRole('FandomAdmin') && (
                            <option value="FandomAdmin">Fandom Admin</option>
                          )}
                          {canAssignRole('ProjectAdmin') && (
                            <option value="ProjectAdmin">Project Admin</option>
                          )}
                        </select>
                      )}

                      {user.role === 'FandomAdmin' && (
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedFandoms(
                              user.fandomAssignments.map(fa => fa.fandom_id)
                            );
                            setShowFandomModal(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Cannot manage</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.users.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      )}

      {/* Fandom Assignment Modal */}
      {showFandomModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-96 overflow-y-auto">
            <CardHeader>
              <CardTitle>
                Assign Fandoms to {getUserDisplayName(selectedUser)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                Select which fandoms this FandomAdmin can manage:
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fandoms.map(fandom => (
                  <label
                    key={fandom.id}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFandoms.includes(fandom.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedFandoms([...selectedFandoms, fandom.id]);
                        } else {
                          setSelectedFandoms(
                            selectedFandoms.filter(id => id !== fandom.id)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{fandom.name}</span>
                  </label>
                ))}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => {
                    setShowFandomModal(false);
                    setSelectedUser(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFandomAssignment}
                  disabled={updating !== null}
                  className="flex-1"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Assign Fandoms'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Role Management Guidelines:</p>
              <ul className="text-xs space-y-1">
                <li>
                  • <strong>ProjectAdmin</strong>: Can manage all users and
                  assign any role
                </li>
                <li>
                  • <strong>FandomAdmin</strong>: Can manage users within
                  assigned fandoms only
                </li>
                <li>
                  • <strong>User</strong>: Regular user with no admin privileges
                </li>
                <li>• FandomAdmins cannot promote users to ProjectAdmin</li>
                <li>
                  • Use GitHub issues for access requests:
                  <Button
                    onClick={() =>
                      window.open(
                        'https://github.com/Life-Experimentalist/the-pensive-index/issues',
                        '_blank'
                      )
                    }
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-blue-600 underline"
                  >
                    Request Access <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
