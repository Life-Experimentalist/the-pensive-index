/**
 * Manual Admin Setup via API Call
 *
 * Since you need to be signed in through Clerk, we'll make this as a browser console command
 * Copy and paste this into your browser console while signed in to grant yourself admin access
 */

// Browser Console Command - Run this in your browser console while signed in to the admin page:

fetch('/api/admin/bootstrap', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then(response => response.json())
  .then(data => {
    console.log('Admin Bootstrap Result:', data);
    if (data.success) {
      console.log('✅ Admin access granted! Refreshing page...');
      window.location.reload();
    } else {
      console.log('❌ Failed to grant admin access:', data.error);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });

// Alternative: Direct Clerk Metadata Update
// If you have access to Clerk dashboard, you can manually set user metadata:
// publicMetadata: { "role": "ProjectAdmin" }

console.log('📋 Instructions:');
console.log('1. Make sure you are signed in to your app');
console.log('2. Copy and paste the fetch() command above into this console');
console.log('3. Press Enter to execute');
console.log('4. Check the console output for success/error messages');
