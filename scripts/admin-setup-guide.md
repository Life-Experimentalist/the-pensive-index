# Admin Setup Guide

## Setting Up First Admin Access

Since we've removed the insecure bootstrap system, here are the secure ways to set up initial admin access:

### Method 1: Development Mode (Recommended for Testing)

1. **Start the development server:**
   ```powershell
   npm run dev
   ```

2. **Sign in with your user account:**
   - Go to `http://localhost:3000/sign-in`
   - Sign in with the account you want to make admin

3. **Access the admin panel:**
   - Go to `http://localhost:3000/admin`
   - You'll see "Access Denied" with a "🔧 Become First Admin" button
   - Click the button (only works if no ProjectAdmin exists)

4. **Verify admin access:**
   - Refresh the page
   - You should now see the full admin dashboard
   - Navigate to "User Management" to test the new role system

### Method 2: API Endpoint (Alternative)

If the button doesn't work, you can directly call the API:

```javascript
// In browser console (while signed in):
fetch('/api/admin/first-admin', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log(data);
    if (data.success) {
      location.reload();
    }
  });
```

### Method 3: Database Direct (Last Resort)

If both methods fail, you can manually update the database:

```powershell
# Connect to database
sqlite3 data/the-pensive-index.db

# Find your user ID from Clerk dashboard, then:
INSERT INTO admin_users (clerk_user_id, role, permissions, created_at, updated_at)
VALUES ('your_clerk_user_id', 'ProjectAdmin', '["admin:read","admin:write","admin:manage"]', datetime('now'), datetime('now'));
```

## Testing the New Role System

Once you have ProjectAdmin access:

1. **Test User Management:**
   - Go to `/admin/users`
   - See all users with their current roles
   - Try promoting a test user to FandomAdmin

2. **Test Fandom Assignment:**
   - When promoting to FandomAdmin, assign specific fandoms
   - Test that FandomAdmins can only manage their assigned fandoms

3. **Test Permission Hierarchy:**
   - Verify ProjectAdmin can manage all users
   - Verify FandomAdmin can only manage users in their fandoms
   - Verify regular users cannot access admin functions

## Available Test Fandoms

The system has these test fandoms available:
- Harry Potter (ID: 1)
- Percy Jackson (ID: 2)
- Marvel Cinematic Universe (ID: 3)
- Naruto (ID: 4)
- My Hero Academia (ID: 5)

## Security Features

✅ **No Self-Promotion**: Users cannot upgrade themselves to admin
✅ **Permission Hierarchy**: ProjectAdmin > FandomAdmin > User
✅ **Fandom Isolation**: FandomAdmins only manage their assigned fandoms
✅ **First-Admin Protection**: Only works when no ProjectAdmin exists
✅ **GitHub Integration**: Non-admins directed to GitHub for access requests

## Troubleshooting

**"First Admin button doesn't appear":**
- Only visible in development mode (`NODE_ENV=development`)
- Make sure you're running `npm run dev`

**"First Admin fails":**
- Check if a ProjectAdmin already exists
- Verify you're signed in to Clerk
- Check browser console for errors

**"Access still denied after setup":**
- Refresh the page
- Clear browser cache
- Check Clerk user metadata in dashboard