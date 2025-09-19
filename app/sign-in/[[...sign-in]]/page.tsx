/**
 * Clerk Sign In Page
 *
 * This page handles user sign-in using Clerk's SignIn component.
 * The [[...sign-in]] dynamic route catches all sign-in related paths.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { SignIn } from '@clerk/nextjs';

export default function Page() {
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
          <SignIn
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
