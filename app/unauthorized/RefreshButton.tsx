'use client';

/**
 * Client Component for Refresh Button
 * Handles the window reload action
 */
export default function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
    >
      🔄 Refresh Page
    </button>
  );
}
