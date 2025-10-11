/**
 * Main Layout Component
 *
 * Standardized layout wrapper for all public pages
 * Includes navbar, footer, and consistent spacing
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import MainNavigation from './MainNavigation';
import MainFooter from './MainFooter';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  /**
   * If true, uses a full-width layout without max-width constraint
   */
  fullWidth?: boolean;
}

export default function MainLayout({
  children,
  className,
  fullWidth = false,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNavigation />

      <main
        className={cn(
          'flex-1',
          !fullWidth && 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
          className
        )}
      >
        {children}
      </main>

      <MainFooter />
    </div>
  );
}
