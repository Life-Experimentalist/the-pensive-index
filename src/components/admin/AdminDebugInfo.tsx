/**
 * Admin Debug Utility
 *
 * Helper component to debug admin access issues
 */

'use client';

import { useUser } from '@clerk/nextjs';

export default function AdminDebugInfo() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading user data...</div>;
  }

  if (!user) {
    return <div>No user found</div>;
  }

  const userRole = user.publicMetadata?.role as string;
  const isAdmin = userRole === 'ProjectAdmin' || userRole === 'FandomAdmin';

  return (
    <div className="p-6 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Admin Debug Information</h3>

      <div className="space-y-2 text-sm">
        <div>
          <strong>User ID:</strong> {user.id}
        </div>
        <div>
          <strong>Email:</strong> {user.emailAddresses[0]?.emailAddress}
        </div>
        <div>
          <strong>Name:</strong> {user.firstName} {user.lastName}
        </div>
        <div>
          <strong>Role from metadata:</strong>{' '}
          <code>{userRole || 'undefined'}</code>
        </div>
        <div>
          <strong>Is Admin:</strong> {isAdmin ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Expected roles:</strong> <code>ProjectAdmin</code> or{' '}
          <code>FandomAdmin</code>
        </div>

        <div className="mt-4">
          <strong>Full Public Metadata:</strong>
          <pre className="bg-white p-2 rounded text-xs overflow-auto">
            {JSON.stringify(user.publicMetadata, null, 2)}
          </pre>
        </div>

        <div className="mt-4">
          <strong>Private Metadata:</strong>
          <pre className="bg-white p-2 rounded text-xs overflow-auto">
            {JSON.stringify((user as any).privateMetadata || {}, null, 2)}
          </pre>
        </div>

        <div className="mt-4">
          <strong>Unsafe Metadata:</strong>
          <pre className="bg-white p-2 rounded text-xs overflow-auto">
            {JSON.stringify(user.unsafeMetadata, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-semibold text-yellow-800">Setup Instructions:</h4>
        <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside">
          <li>Go to your Clerk Dashboard</li>
          <li>Navigate to "Users"</li>
          <li>Find your user and click on it</li>
          <li>Go to the "Metadata" tab</li>
          <li>In "Public metadata", add:</li>
        </ol>
        <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs">
          {`{
  "role": "ProjectAdmin"
}`}
        </pre>
        <p className="mt-2 text-sm text-yellow-700">
          Or use <code>"FandomAdmin"</code> for fandom-specific access.
        </p>
      </div>
    </div>
  );
}
