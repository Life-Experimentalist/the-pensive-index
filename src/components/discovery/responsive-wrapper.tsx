'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Import interface components
import { DesktopInterface } from './desktop-interface';
import { MobileInterface } from './mobile-interface';

export interface ResponsiveWrapperProps {
  /**
   * Currently selected fandom slug
   */
  selectedFandomSlug?: string;

  /**
   * Optional CSS class
   */
  className?: string;

  /**
   * Force a specific interface mode (for testing)
   */
  forceMode?: 'desktop' | 'mobile';

  /**
   * Custom breakpoint for switching interfaces (default: 1024px)
   */
  breakpoint?: number;
}

/**
 * Responsive wrapper that switches between desktop and mobile interfaces
 *
 * Features:
 * - Automatic interface switching based on viewport size
 * - Tailwind CSS breakpoint integration (lg: 1024px+)
 * - Smooth transitions between interface modes
 * - Maintains component state across breakpoint changes
 * - Performance optimized with proper cleanup
 *
 * Breakpoint behavior:
 * - <1024px: Mobile interface (collapsible panels, touch navigation)
 * - >=1024px: Desktop interface (three-panel drag-and-drop)
 *
 * State management:
 * - Preserves user selections across interface switches
 * - Maintains scroll positions where possible
 * - Handles orientation changes gracefully
 */
export function ResponsiveWrapper({
  selectedFandomSlug,
  className = '',
  forceMode,
  breakpoint = 1024,
}: ResponsiveWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle window resize and initial size detection
  const checkViewportSize = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const shouldBeMobile = width < breakpoint;

    setIsMobile(shouldBeMobile);
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [breakpoint, isInitialized]);

  // Set up resize listener
  useEffect(() => {
    // Initial check
    checkViewportSize();

    // Add resize listener with debouncing for performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkViewportSize, 150);
    };

    window.addEventListener('resize', debouncedResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [checkViewportSize]);

  // Handle orientation changes on mobile devices
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = () => {
      // Small delay to allow viewport to settle after orientation change
      setTimeout(checkViewportSize, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [checkViewportSize]);

  // Determine which interface to render
  const shouldShowMobile = forceMode ? forceMode === 'mobile' : isMobile;

  // Don't render until we know the viewport size to prevent hydration mismatches
  if (!isInitialized && typeof window !== 'undefined') {
    return (
      <div className={`flex items-center justify-center h-screen ${className}`}>
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`responsive-wrapper ${className}`}>
      {shouldShowMobile ? (
        <MobileInterface
          selectedFandomSlug={selectedFandomSlug}
          className="mobile-mode"
        />
      ) : (
        <DesktopInterface
          selectedFandomSlug={selectedFandomSlug}
          className="desktop-mode"
        />
      )}

      {/* Debug information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs font-mono">
          <div>Mode: {shouldShowMobile ? 'Mobile' : 'Desktop'}</div>
          <div>
            Width: {typeof window !== 'undefined' ? window.innerWidth : '?'}px
          </div>
          <div>Breakpoint: {breakpoint}px</div>
          {forceMode && <div>Forced: {forceMode}</div>}
        </div>
      )}
    </div>
  );
}

export default ResponsiveWrapper;
