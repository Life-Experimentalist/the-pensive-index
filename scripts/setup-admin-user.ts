/**
 * Admin User Setup Script
 *
 * Creates a test admin user for development purposes.
 * This script helps set up the first admin user when developing locally.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { clerkClient } from '@clerk/nextjs/server';

async function createTestAdmin() {
  try {
    // This is meant to be run manually to give admin role to existing users
    console.log('🔧 Admin User Setup Tool');
    console.log('========================');
    console.log('');
    console.log('This script helps you set up admin roles for existing users.');
    console.log('');
    console.log('📋 INSTRUCTIONS:');
    console.log('');
    console.log('1. Go to https://clerk.com and sign in to your dashboard');
    console.log('2. Navigate to "Users" in the left sidebar');
    console.log('3. Find your user account and click on it');
    console.log('4. Go to the "Metadata" tab');
    console.log('5. In "Public metadata" section, add:');
    console.log('   {');
    console.log('     "role": "ProjectAdmin"');
    console.log('   }');
    console.log('6. Click "Save"');
    console.log('7. Refresh your app at http://localhost:3000/admin');
    console.log('');
    console.log('✅ ROLE OPTIONS:');
    console.log('  - "ProjectAdmin": Full admin access');
    console.log('  - "FandomAdmin": Limited admin access');
    console.log('');
    console.log('🚨 IMPORTANT: Use "Public metadata", NOT "Private metadata"');
    console.log('');
    console.log(
      'Need help? Check docs/CLERK-ADMIN-SETUP.md for detailed steps!'
    );
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  createTestAdmin();
}

export default createTestAdmin;
