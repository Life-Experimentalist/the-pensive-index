/**
 * 404 Not Found Page
 *
 * Custom 404 page for The Pensieve Index
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import Link from 'next/link';
import Image from 'next/image';
import SafeUserButton from '@/components/ui/SafeUserButton';
import { currentUser } from '@clerk/nextjs/server';

export default async function NotFoundPage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/icon.png"
                alt="The Pensieve Index"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <Link href="/" className="text-xl font-bold text-gray-900">
                The Pensieve Index
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Admin Dashboard
                  </Link>
                  <SafeUserButton afterSignOutUrl="/" />
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
          {/* 404 Animation */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-indigo-600 opacity-20 select-none">
              404
            </div>
            <div className="relative -mt-16">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-indigo-100">
                <svg
                  className="h-12 w-12 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.93-6.086-2.44.16-3.2.943-6.12 2.242-8.56.188-.353.537-.577.907-.598.37-.02.727.177.926.519.199.342.199.764 0 1.106-.001.001-.003.003-.005.005-.005.005-.011.012-.018.02-.137.157-.3.347-.486.57z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Page Not Found
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Suggestions */}
          <div className="mt-12 bg-white rounded-lg shadow p-8 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Try these instead:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <div className="ml-3 text-left">
                  <div className="font-medium text-gray-900">Home</div>
                  <div className="text-sm text-gray-500">Back to main page</div>
                </div>
              </Link>

              {user ? (
                <Link
                  href="/admin"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 text-left">
                    <div className="font-medium text-gray-900">Admin</div>
                    <div className="text-sm text-gray-500">
                      Dashboard & tools
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 text-left">
                    <div className="font-medium text-gray-900">Sign In</div>
                    <div className="text-sm text-gray-500">
                      Access your account
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex justify-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-md font-medium"
            >
              ← Go Back
            </button>
            <Link
              href="/"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
            >
              Home Page
            </Link>
          </div>

          {/* Fun message */}
          <div className="mt-16 text-gray-400 text-sm">
            <p>
              🧙‍♂️ Even wizards get lost sometimes. Let's get you back on track!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
