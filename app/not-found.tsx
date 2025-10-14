/**
 * 404 Not Found Page
 *
 * Custom 404 page for The Pensieve Index
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import Link from 'next/link';
import MainNavigation from '@/components/layout/MainNavigation';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Navigation */}
      <MainNavigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* 404 Animation */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-indigo-600 dark:text-indigo-400 opacity-20 select-none">
              404
            </div>
            <div className="relative -mt-16">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-indigo-100 dark:bg-indigo-900">
                <svg
                  className="h-12 w-12 text-indigo-600 dark:text-indigo-400"
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

          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            Page Not Found
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Suggestions */}
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow p-8 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Try these instead:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
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
                  <div className="font-medium text-gray-900 dark:text-white">
                    Home
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Back to main page
                  </div>
                </div>
              </Link>

              <Link
                href="/fandom"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="ml-3 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Fandoms
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Browse all fandoms
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex justify-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-6 py-3 rounded-md font-medium"
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
          <div className="mt-16 text-gray-400 dark:text-gray-500 text-sm">
            <p>
              🧙‍♂️ Even wizards get lost sometimes. Let's apparate or knight bus
              you back on track!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
