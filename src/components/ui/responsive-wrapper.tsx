import { ReactNode } from 'react';

interface ResponsiveWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * ResponsiveWrapper provides consistent responsive layout structure
 * across different device types and screen sizes
 */
export function ResponsiveWrapper({
  children,
  className = '',
}: ResponsiveWrapperProps) {
  return (
    <div
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
