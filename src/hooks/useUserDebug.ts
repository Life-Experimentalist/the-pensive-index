/**
 * User Debug Hook
 *
 * Logs current user metadata to console for debugging role assignments.
 * Controlled by DEBUG environment variable.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { getUserDisplayInfo } from '@/lib/auth/roles';

export function useUserDebug() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // Only log in development when DEBUG is enabled
    if (
      process.env.NODE_ENV !== 'development' ||
      process.env.NEXT_PUBLIC_DEBUG !== 'true'
    ) {
      return;
    }

    if (!isLoaded) {
      console.log('🐛 [USER DEBUG] Loading user data...');
      return;
    }

    if (!user) {
      console.log('🐛 [USER DEBUG] No user signed in');
      return;
    }

    const userInfo = getUserDisplayInfo(user);

    console.group('🐛 [USER DEBUG] Current User Info');
    console.log('📧 Email:', user.emailAddresses?.[0]?.emailAddress);
    console.log('👤 Name:', user.firstName || 'None');
    console.log('🔑 User ID:', user.id);
    console.log('🎭 Role:', userInfo.role);
    console.log('🛡️ Is Admin:', userInfo.isAdmin);
    console.log('📊 Raw Metadata:', user.publicMetadata);

    if (!userInfo.isAdmin) {
      console.log('⚠️ To get admin access:');
      console.log('   1. Go to clerk.com dashboard');
      console.log('   2. Users → Find your account → Metadata tab');
      console.log('   3. In "Public metadata", add: {"role": "ProjectAdmin"}');
      console.log('   4. Save and refresh');
    }

    console.groupEnd();
  }, [user, isLoaded]);

  return { user, isLoaded };
}
