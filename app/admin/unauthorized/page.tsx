/**
 * Admin Unauthorized Page
 *
 * Displayed when users have some admin access but not enough for specific features
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';

export default async function AdminUnauthorizedPage() {
  const user = await currentUser();
  const userRole = user?.publicMetadata?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin'
    | undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                The Pensieve Index
              </Link>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Admin Area
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    ← Back to Admin
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-yellow-100 mb-8">
            <svg
              className="h-12 w-12 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Insufficient Permissions
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            You need higher admin privileges to access this feature.
          </p>

          {user && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                Current Access Level: {userRole || 'None'}
              </h3>
              <p className="text-yellow-800 mb-4">
                You're signed in as:{' '}
                <strong>
                  {user.firstName || user.emailAddresses[0]?.emailAddress}
                </strong>
              </p>

              {userRole === 'FandomAdmin' ? (
                <div className="text-yellow-800">
                  <p className="mb-4">
                    You have <strong>Fandom Admin</strong> access, but this
                    feature requires <strong>Project Admin</strong> privileges.
                  </p>
                  <div className="bg-yellow-100 rounded p-4 text-sm">
                    <strong>Features available to Fandom Admins:</strong>
                    <ul className="mt-2 space-y-1 text-left">
                      <li>• Manage fandom-specific validation rules</li>
                      <li>• View limited analytics</li>
                      <li>• Access testing sandbox</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-yellow-800">
                  Contact a Project Administrator to upgrade your permissions.
                </p>
              )}
            </div>
          )}

          {/* Permission Levels */}
          <div className="mt-12 bg-white rounded-lg shadow p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Admin Permission Levels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                  <h3 className="font-bold text-gray-900">Project Admin</h3>
                </div>
                <ul className="text-gray-700 space-y-2 text-sm text-left">
                  <li>• Full access to all features</li>
                  <li>• Manage all validation rules</li>
                  <li>• User management</li>
                  <li>• Global settings</li>
                  <li>• Complete analytics</li>
                  <li>• Rule templates</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="h-3 w-3 bg-blue-500 rounded-full mr-3"></div>
                  <h3 className="font-bold text-gray-900">Fandom Admin</h3>
                </div>
                <ul className="text-gray-700 space-y-2 text-sm text-left">
                  <li>• Limited admin access</li>
                  <li>• Fandom-specific rules</li>
                  <li>• Tag class management</li>
                  <li>• Testing sandbox</li>
                  <li>• Basic analytics</li>
                  <li className="text-gray-400">• No user management</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex justify-center space-x-4">
            <Link
              href="/admin"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
            >
              ← Back to Admin Dashboard
            </Link>
            <Link
              href="/"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-md font-medium"
            >
              Go to Home
            </Link>
          </div>

          {/* Contact Admin */}
          <div className="mt-16 bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Need Higher Permissions?
            </h3>
            <p className="text-blue-800 mb-4">
              Contact a Project Administrator to request elevated privileges.
              They can update your role in the Clerk dashboard.
            </p>
            <div className="text-sm text-blue-700">
              <strong>For Admins:</strong> Update user metadata in Clerk
              dashboard with{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">{`{"role": "ProjectAdmin"}`}</code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
