/**
 * Loading Page
 *
 * Displayed while authentication and authorization checks are in progress
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import Image from 'next/image';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="mb-8">
          <Image
            src="/logos.png"
            alt="The Pensieve Index - Loading"
            width={200}
            height={100}
            className="mx-auto animate-pulse"
            priority
          />
        </div>

        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"></div>
          <div
            className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          The Pensieve Index
        </h1>
        <p className="text-gray-600 mb-8">
          Loading your personalized experience...
        </p>

        {/* Loading Steps */}
        <div className="max-w-md mx-auto space-y-3">
          <div className="flex items-center text-sm text-gray-500">
            <div className="animate-pulse h-2 w-2 bg-indigo-600 rounded-full mr-3"></div>
            Checking authentication status
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <div
              className="animate-pulse h-2 w-2 bg-indigo-600 rounded-full mr-3"
              style={{ animationDelay: '0.2s' }}
            ></div>
            Verifying permissions
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <div
              className="animate-pulse h-2 w-2 bg-indigo-600 rounded-full mr-3"
              style={{ animationDelay: '0.4s' }}
            ></div>
            Preparing dashboard
          </div>
        </div>

        {/* Fallback message */}
        <div className="mt-12 text-xs text-gray-400">
          Taking longer than expected? Try refreshing the page.
        </div>
      </div>
    </div>
  );
}
