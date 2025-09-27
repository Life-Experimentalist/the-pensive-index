'use client';

import { SignUp } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

interface SafeSignUpProps {
  appearance?: {
    elements?: {
      rootBox?: string;
      card?: string;
    };
  };
  redirectUrl?: string;
}

export default function SafeSignUp({
  appearance,
  redirectUrl,
}: SafeSignUpProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show loading state during SSR
  if (!isMounted) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return <SignUp appearance={appearance} redirectUrl={redirectUrl} />;
}
