'use client';

import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

interface SafeSignOutButtonProps {
  children: React.ReactNode;
  redirectUrl?: string;
}

export default function SafeSignOutButton({
  children,
  redirectUrl,
}: SafeSignOutButtonProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show placeholder during SSR
  if (!isMounted) {
    return (
      <div className="w-full opacity-50 pointer-events-none">{children}</div>
    );
  }

  // Only render Clerk SignOutButton on client side
  return (
    <ClerkSignOutButton redirectUrl={redirectUrl}>
      {children}
    </ClerkSignOutButton>
  );
}
