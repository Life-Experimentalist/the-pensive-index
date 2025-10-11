/**
 * Clerk Sign In Page
 *
 * This page handles user sign-in using Clerk's SignIn component.
 * The [[...sign-in]] dynamic route catches all sign-in related paths.
 *
 * If the user is already authenticated and a redirect_url is present,
 * they will be automatically redirected to that URL.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import SafeSignIn from '@/components/ui/SafeSignIn';

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) return;

    // If user is already signed in and there's a redirect_url, redirect them
    if (isSignedIn) {
      const redirectUrl = searchParams.get('redirect_url');
      if (redirectUrl) {
        // Decode the URL in case it's encoded
        const decodedUrl = decodeURIComponent(redirectUrl);
        router.push(decodedUrl);
      } else {
        // Default redirect to admin if no redirect_url specified
        router.push('/admin');
      }
    }
  }, [isSignedIn, isLoaded, searchParams, router]);

  // Show loading state while checking auth
  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access the admin dashboard
          </p>
        </div>
        <div className="flex justify-center">
          <SafeSignIn
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-lg',
              },
            }}
            redirectUrl="/admin"
          />
        </div>
      </div>
    </div>
  );
}
