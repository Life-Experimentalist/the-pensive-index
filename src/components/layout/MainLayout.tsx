/**
 * Main Layout Component
 *
 * Standardized layout wrapper for all public pages
 * Includes navbar with optional breadcrumbs and share button, footer, and consistent spacing
 *
 * @package the-pensive-index
 * @version 2.0.0
 */

import MainNavigation from './MainNavigation';
import MainFooter from './MainFooter';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from './Breadcrumbs';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  /**
   * If true, uses a full-width layout without max-width constraint
   */
  fullWidth?: boolean;
  /**
   * Optional breadcrumb items to display below the navbar
   */
  breadcrumbs?: BreadcrumbItem[];
  /**
   * Show share button in navbar
   */
  showShare?: boolean;
  /**
   * Custom share data (defaults to current page)
   */
  shareData?: {
    title?: string;
    text?: string;
    url?: string;
  };
}

export default function MainLayout({
  children,
  className,
  fullWidth = false,
  breadcrumbs,
  showShare = false,
  shareData,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNavigation
        breadcrumbs={breadcrumbs}
        showShare={showShare}
        shareData={shareData}
      />

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
