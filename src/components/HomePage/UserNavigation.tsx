'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { isAdmin } from '@/lib/auth/roles';
import SafeUserButton from '@/components/ui/SafeUserButton';

export default function UserNavigation() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>;
  }

  const userIsAdmin = user ? isAdmin(user) : false;

  return (
    <>
      {user ? (
        <>
          {userIsAdmin && (
            <Link
              href="/admin"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Admin Dashboard
            </Link>
          )}
          <SafeUserButton />
        </>
      ) : (
        <Link
          href="/sign-in"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Sign In
        </Link>
      )}
    </>
  );
}
