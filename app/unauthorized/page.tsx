/**
 * Unauthorized Access Page
 *
 * Displayed when users try to access admin areas without proper permissions
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import Link from 'next/link';
import SafeUserButton from '@/components/ui/SafeUserButton';
import { currentUser } from '@clerk/nextjs/server';

export default async function UnauthorizedPage() {
  const user = await currentUser();

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
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <SafeUserButton afterSignOutUrl="/" />
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
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 mb-8">
            <svg
              className="h-12 w-12 text-red-600"
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
            Access Denied
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            You don't have permission to access the admin dashboard.
          </p>

          {user ? (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Signed in as:{' '}
                {user.firstName || user.emailAddresses[0]?.emailAddress}
              </h3>
              <p className="text-blue-800 mb-4">
                To access the admin dashboard, you need admin privileges. Please
                contact an administrator to:
              </p>
              <ul className="text-left text-blue-800 space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Set your role to "ProjectAdmin" or "FandomAdmin" in the Clerk
                  dashboard
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Add the role to your user metadata:{' '}
                  <code className="bg-blue-100 px-2 py-1 rounded text-sm">{`{"role": "ProjectAdmin"}`}</code>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Refresh the page after the role is assigned
                </li>
              </ul>
              <div className="text-sm text-blue-700">
                <strong>Note:</strong> The role must be added to your{' '}
                <em>public metadata</em> in the Clerk dashboard.
              </div>
            </div>
          ) : (
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-xl mx-auto">
              <p className="text-gray-700 mb-4">
                You need to sign in to access admin features.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign In to Continue
              </Link>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-10 flex justify-center space-x-4">
            <Link
              href="/"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-md font-medium"
            >
              ← Back to Home
            </Link>
            {user && (
              <button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
              >
                🔄 Refresh Page
              </button>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-16 bg-gray-100 rounded-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Need Help?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  For Administrators:
                </h3>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>• Go to your Clerk Dashboard</li>
                  <li>• Navigate to "Users" section</li>
                  <li>• Find the user and edit their metadata</li>
                  <li>• Add role to public metadata</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Available Roles:
                </h3>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>
                    • <strong>ProjectAdmin</strong>: Full admin access
                  </li>
                  <li>
                    • <strong>FandomAdmin</strong>: Limited admin access
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
