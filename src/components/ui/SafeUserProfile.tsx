'use client';

import { UserProfile } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

interface SafeUserProfileProps {
  appearance?: {
    elements?: {
      rootBox?: string;
      card?: string;
    };
  };
}

export default function SafeUserProfile({ appearance }: SafeUserProfileProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show loading state during SSR
  if (!isMounted) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="h-32 bg-gray-200 rounded-full w-32 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
            </div>
            <div className="md:col-span-2">
              <div className="h-8 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <UserProfile appearance={appearance} />;
}
