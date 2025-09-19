/**
 * Clerk Sign Up Page
 *
 * This page handles user registration using Clerk's SignUp component.
 * The [[...sign-up]] dynamic route catches all sign-up related paths.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Register for admin access
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp
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
