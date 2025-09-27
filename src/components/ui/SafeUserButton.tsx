'use client';

import { UserButton as ClerkUserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

interface SafeUserButtonProps {
  placeholder?: React.ReactNode;
  afterSignOutUrl?: string;
}

export default function SafeUserButton({
  placeholder,
  afterSignOutUrl,
}: SafeUserButtonProps = {}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a placeholder during SSR
    return (
      placeholder || (
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
      )
    );
  }

  // Only render Clerk UserButton on client side
  return <ClerkUserButton afterSignOutUrl={afterSignOutUrl} />;
}
