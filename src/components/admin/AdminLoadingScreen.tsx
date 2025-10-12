/**
 * Admin Loading Screen Component
 *
 * Beautiful loading screen for admin dashboard with animated elements
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import Image from 'next/image';

interface AdminLoadingScreenProps {
  message?: string;
}

export default function AdminLoadingScreen({
  message = 'Loading admin dashboard...',
}: AdminLoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="text-center relative z-10 px-4">
        {/* Animated Logo with Glow */}
        <div className="mb-12 relative">
          <div className="absolute inset-0 blur-2xl bg-indigo-400/30 dark:bg-indigo-600/20 rounded-full animate-pulse"></div>
          <div className="animate-[float_3s_ease-in-out_infinite]">
            <Image
              src="/logo-banner.png"
              alt="The Pensieve Index - Loading"
              width={240}
              height={120}
              className="mx-auto relative h-auto"
              priority
            />
          </div>
        </div>

        {/* Elegant Loading Spinner */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-24 h-24">
            {/* Outer Ring */}
            <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
            {/* Spinning Ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
            {/* Inner Pulsing Dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Title with Gradient */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4">
          The Pensieve Index
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-12 text-lg">
          {message}
        </p>

        {/* Loading Progress Steps */}
        <div className="max-w-md mx-auto space-y-4 mb-8">
          <div className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg px-6 py-3 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-ping absolute"></div>
                <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full relative"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Verifying admin access
              </span>
            </div>
            <div className="w-6 h-6">
              <svg
                className="animate-spin text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Fun Fact */}
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto italic">
          💡 Did you know? The Pensieve allows you to review memories from a
          third-person perspective.
        </p>
      </div>
    </div>
  );
}
