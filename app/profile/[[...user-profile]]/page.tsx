/**
 * User Profile Page
 *
 * Displays and allows editing of user profile using Clerk's UserProfile component
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import SafeUserProfile from '@/components/ui/SafeUserProfile';

export default function UserProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            User Profile
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>
        <div className="flex justify-center">
          <SafeUserProfile
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-lg',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
