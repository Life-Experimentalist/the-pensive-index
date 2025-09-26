'use client';

import Link from 'next/link';
import { useUser, ClerkLoaded, ClerkLoading } from '@clerk/nextjs';
import { getUserDisplayInfo } from '@/lib/auth/roles';
import { useUserDebug } from '@/hooks/useUserDebug';

export default function UserContent() {
  const { user } = useUser();

  // Debug logging (only in development when DEBUG=true)
  useUserDebug();

  return (
    <>
      <ClerkLoading>
        <div className="mt-10">
          <div className="h-6 bg-gray-200 rounded animate-pulse max-w-md mx-auto mb-6"></div>
          <div className="flex justify-center space-x-4">
            <div className="h-12 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        {!user ? (
          <div className="mt-10">
            <div className="flex justify-center space-x-4">
              <Link
                href="/sign-in"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md text-lg font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-md text-lg font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        ) : (
          (() => {
            const userInfo = getUserDisplayInfo(user);
            return (
              <div className="mt-10">
                <p className="text-lg text-gray-700 mb-2">
                  Welcome back, {userInfo.name}!
                </p>
                {userInfo.isAdmin && (
                  <p className="text-sm text-blue-600 mb-6">
                    Role: {userInfo.role}
                  </p>
                )}

                <div className="flex justify-center space-x-4">
                  {userInfo.isAdmin ? (
                    <Link
                      href="/admin"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md text-lg font-medium"
                    >
                      Go to Admin Dashboard
                    </Link>
                  ) : (
                    <p className="text-gray-600 px-8 py-3">
                      Welcome to The Pensieve Index! Admin access requires
                      special permissions.
                    </p>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </ClerkLoaded>
    </>
  );
}
