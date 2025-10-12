'use client';

import Link from 'next/link';

export default function FandomErrorFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-red-950 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md border border-red-200 dark:border-red-900">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          We encountered an error while loading the discovery interface.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
