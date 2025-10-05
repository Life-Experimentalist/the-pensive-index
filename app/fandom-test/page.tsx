/**
 * Test Fandom Page - Simplified for debugging
 */

export default function FandomTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Fandom Test Page
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          If you can see this, Next.js routing is working!
        </p>
        <div className="mt-8 space-x-4">
          <a
            href="/fandom"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try /fandom route
          </a>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
