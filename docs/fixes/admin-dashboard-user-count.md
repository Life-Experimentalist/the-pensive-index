# Admin Dashboard User Count Fix

## Issue
The admin dashboard was showing "0 users" even though admin users existed in the database.

## Root Cause
The `/api/admin/dashboard/stats` endpoint had hardcoded user counts to 0:

```typescript
users: {
  total: 0, // Will be updated with real Clerk user count
  active: 0,
  admins: 0,
  new_this_week: 0,
}
```

## Solution
Updated the stats API route to actually query the `admin_users` table:

1. **Added admin count queries** to the Promise.all array:
   - `adminCount`: Total admin users in database
   - `activeAdminCount`: Admin users where `is_active = true`

2. **Updated stats object** to use real counts:
   ```typescript
   users: {
     total: adminCount,        // Total admin users
     active: activeAdminCount, // Active admins
     admins: adminCount,       // Same as total (all users are admins)
     new_this_week: 0,        // TODO: Calculate based on created_at
   }
   ```

3. **Added console logging** for debugging:
   ```typescript
   console.log('Dashboard stats generated:', {
     adminCount,
     activeAdminCount,
     fandomCount,
     activeFandomCount,
     tagCount,
   });
   ```

## Database Verification
The fix was verified using a test script (`scripts/test-admin-count.js`):

```
Testing admin user queries...

1. Total admin users: 1
2. Active admin users: 1

3. Admin user details:
   1. Test Administrator (admin@test.com)
      Role: ProjectAdmin
      Active: Yes

4. Fandom counts (for comparison):
   Total fandoms: 5
   Active fandoms: 5

5. Tag count: 16

✅ Test complete!
```

## How to Test

### Option 1: Test Script (No Auth Required)
```powershell
node scripts/test-admin-count.js
```

### Option 2: Admin Dashboard (Requires Auth)
1. Start the dev server: `npm run dev`
2. Sign in with an admin account
3. Navigate to `/admin`
4. Check the "Total Users" card - should show `1` instead of `0`

### Option 3: Direct API Test (Requires Auth)
```powershell
# Must be authenticated with Clerk
curl http://localhost:3000/api/admin/dashboard/stats
```

## Files Modified
- `app/api/admin/dashboard/stats/route.ts`: Added admin user count queries
- `scripts/test-admin-count.js`: Created test script for verification

## Related Tables
- `admin_users`: Stores admin user information (id, email, name, role, is_active)
- Uses Clerk for authentication, local DB only for admin metadata

## Future Enhancements
- [ ] Calculate `new_this_week` based on `created_at` timestamp
- [ ] Add total user count from Clerk (separate from admin count)
- [ ] Implement activity tracking metrics
- [ ] Add caching for frequently accessed stats
