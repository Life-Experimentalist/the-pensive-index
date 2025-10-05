'use client';

/**
 * Client-side Theme Toggle Wrapper
 * Ensures theme toggle is always rendered on client
 */

import dynamic from 'next/dynamic';

const ThemeToggle = dynamic(() => import('./ThemeToggle'), {
  ssr: false,
  loading: () => (
    <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
  ),
});

export default function ClientThemeToggle() {
  return <ThemeToggle />;
}
