// Setup Initial Admin Script
// This script helps set up the first ProjectAdmin for development

const { clerkClient } = require('@clerk/nextjs/server');

async function setupInitialAdmin() {
  try {
    console.log('🔧 Setting up initial admin...');

    // You'll need to replace this with your actual Clerk user ID
    // You can find this in the Clerk dashboard or by logging it from your app
    const userEmail = 'krishna.gsvv@hotmail.com'; // Replace with your email

    const client = await clerkClient();

    // Find user by email
    const users = await client.users.getUserList({
      emailAddress: [userEmail],
    });

    if (users.data.length === 0) {
      console.error('❌ User not found with email:', userEmail);
      console.log(
        '📝 Please sign in to the app first, then check your user email in Clerk dashboard'
      );
      return;
    }

    const user = users.data[0];
    console.log(
      '👤 Found user:',
      user.firstName,
      user.lastName,
      '(' + user.emailAddresses[0]?.emailAddress + ')'
    );

    // Update user to ProjectAdmin
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        role: 'ProjectAdmin',
        setupAdmin: true,
        grantedAt: new Date().toISOString(),
      },
    });

    console.log('✅ Successfully granted ProjectAdmin role!');
    console.log('🔄 Please refresh your admin page to access the dashboard');
    console.log('🎉 You can now manage user roles from the admin panel');
  } catch (error) {
    console.error('💥 Failed to setup admin:', error);
  }
}

// Only run if called directly (not when testing)
if (require.main === module) {
  setupInitialAdmin();
}
