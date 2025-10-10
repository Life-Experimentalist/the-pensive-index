# Clerk User Integration Guide

## Current Situation

Your app has **two separate user systems**:

```
┌───────────────────────────────────────┐
│ Clerk (Authentication)                 │
│ - Handles sign in/sign up              │
│ - User sessions                        │
│ - publicMetadata for roles            │
└───────────────────────────────────────┘
          ❌ NOT CONNECTED ❌
┌───────────────────────────────────────┐
│ admin_users Table (Database)           │
│ - 1 test admin                        │
│ - Admin dashboard counts from here    │
└───────────────────────────────────────┘
```

**Problem:** Admin dashboard shows 1 user (from `admin_users` table), but doesn't show Clerk users.

---

## ✅ Recommended Solution: Clerk-First Approach

Use Clerk as the **single source of truth** for users, with optional database sync for performance.

---

## Implementation Options

### Option A: Pure Clerk (Simplest) ⭐ Recommended

**Concept:** Store everything in Clerk, query as needed

**Pros:**
- Single source of truth
- No sync complexity
- Automatic consistency
- Less code to maintain

**Cons:**
- API calls to Clerk for admin list
- Slightly slower queries

**Implementation:**

#### 1. Update Admin Dashboard Stats API

```typescript
// app/api/admin/dashboard/stats/route.ts
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users from Clerk
    const clerk = await clerkClient();
    const userList = await clerk.users.getUserList({
      limit: 500, // Adjust as needed
    });

    // Count admins from Clerk metadata
    const adminUsers = userList.data.filter(user => {
      const role = user.publicMetadata.role;
      return role === 'ProjectAdmin' || role === 'FandomAdmin';
    });

    const stats: DashboardStats = {
      users: {
        total: userList.totalCount, // Total Clerk users
        active: userList.data.filter(u => !u.banned).length,
        admins: adminUsers.length,
        new_this_week: calculateNewUsersThisWeek(userList.data),
      },
      // ... rest of stats
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard statistics' },
      { status: 500 }
    );
  }
}

function calculateNewUsersThisWeek(users: User[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return users.filter(u => u.createdAt > weekAgo).length;
}
```

#### 2. Set Admin Roles in Clerk

```typescript
// Set user role via Clerk Dashboard or API
import { clerkClient } from '@clerk/nextjs/server';

const clerk = await clerkClient();

// Make a user admin
await clerk.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'ProjectAdmin', // or 'FandomAdmin'
    fandomAccess: ['harry-potter', 'percy-jackson'], // for FandomAdmin
  }
});
```

#### 3. Check Admin Permissions

```typescript
// lib/auth/permissions.ts
import { currentUser } from '@clerk/nextjs/server';

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  const role = user.publicMetadata.role as string;
  return role === 'ProjectAdmin' || role === 'FandomAdmin';
}

export async function hasPermission(
  permission: string,
  fandomId?: string
): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  const role = user.publicMetadata.role as string;

  // ProjectAdmin has all permissions
  if (role === 'ProjectAdmin') return true;

  // FandomAdmin needs fandom check
  if (role === 'FandomAdmin') {
    const fandomAccess = user.publicMetadata.fandomAccess as string[];
    return fandomId ? fandomAccess?.includes(fandomId) : false;
  }

  return false;
}
```

#### 4. Remove admin_users Table (Optional)

```sql
-- If you want to fully commit to Clerk-only approach
DROP TABLE admin_users;
```

---

### Option B: Clerk + Database Sync (Better Performance)

**Concept:** Sync Clerk users to database via webhooks for fast queries

**Pros:**
- Fast local queries
- Can join with other tables
- Audit trail in database

**Cons:**
- More complex
- Need to handle sync failures
- Potential data inconsistency

**Implementation:**

#### 1. Update admin_users Table

```sql
-- Modify to match Clerk data structure
ALTER TABLE admin_users ADD COLUMN clerk_id TEXT NOT NULL;
ALTER TABLE admin_users ADD COLUMN created_at INTEGER;
ALTER TABLE admin_users ADD COLUMN updated_at INTEGER;
ALTER TABLE admin_users ADD COLUMN is_banned INTEGER DEFAULT 0;
```

#### 2. Create Clerk Webhook Handler

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/database/init';
import { adminUsers } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;
  const db = await getDatabase();

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;

    const role = public_metadata.role as string;

    // Only sync admin users
    if (role === 'ProjectAdmin' || role === 'FandomAdmin') {
      await db.insert(adminUsers).values({
        id: id,
        clerk_id: id,
        email: email_addresses[0]?.email_address || '',
        name: `${first_name || ''} ${last_name || ''}`.trim(),
        role: role as 'ProjectAdmin' | 'FandomAdmin',
        fandom_access: public_metadata.fandomAccess as string[] || [],
        permissions: [], // Set based on role
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;

    const role = public_metadata.role as string;

    if (role === 'ProjectAdmin' || role === 'FandomAdmin') {
      await db.update(adminUsers)
        .set({
          email: email_addresses[0]?.email_address || '',
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          role: role as 'ProjectAdmin' | 'FandomAdmin',
          fandom_access: public_metadata.fandomAccess as string[] || [],
          updated_at: Date.now(),
        })
        .where(eq(adminUsers.clerk_id, id));
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    await db.update(adminUsers)
      .set({ is_active: false })
      .where(eq(adminUsers.clerk_id, id));
  }

  return new Response('', { status: 200 });
}
```

#### 3. Configure Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **Webhooks** in sidebar
4. Click **Add Endpoint**
5. Enter: `https://your-domain.com/api/webhooks/clerk`
6. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
7. Copy the **Signing Secret**
8. Add to `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

#### 4. Update Stats API to Use Database

```typescript
// app/api/admin/dashboard/stats/route.ts
// Keep existing implementation that queries admin_users table
// It will now have synced data from Clerk
```

---

## Quick Start: Choose Your Path

### Path 1: Pure Clerk (15 minutes)
1. Update `app/api/admin/dashboard/stats/route.ts` with Clerk queries
2. Set admin roles in Clerk Dashboard
3. Test admin dashboard
4. Done! ✅

### Path 2: Clerk + Sync (1-2 hours)
1. Update admin_users table schema
2. Create webhook handler
3. Configure Clerk webhook
4. Test with user creation
5. Sync existing users (one-time script)
6. Done! ✅

---

## Testing

### Test Pure Clerk Approach

```bash
# 1. Create a test user in Clerk Dashboard
# 2. Set role in publicMetadata:
{
  "role": "ProjectAdmin"
}

# 3. Check admin dashboard
# Should show: Total Users = [all Clerk users]
#              Admins = [users with admin roles]
```

### Test Webhook Sync

```bash
# 1. Create user in Clerk
# 2. Check database:
SELECT * FROM admin_users WHERE clerk_id = 'user_xxxxx';

# 3. Update user role in Clerk
# 4. Check database again - should be updated

# 5. Delete user in Clerk
# 6. Check database - is_active should be false
```

---

## Migration Script (If Using Sync)

```typescript
// scripts/sync-clerk-users.ts
import { clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/database/init';
import { adminUsers } from '@/lib/database/schema';

async function syncClerkUsers() {
  const clerk = await clerkClient();
  const db = await getDatabase();

  const userList = await clerk.users.getUserList({ limit: 500 });

  for (const user of userList.data) {
    const role = user.publicMetadata.role as string;

    if (role === 'ProjectAdmin' || role === 'FandomAdmin') {
      await db.insert(adminUsers).values({
        id: user.id,
        clerk_id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: role as 'ProjectAdmin' | 'FandomAdmin',
        fandom_access: user.publicMetadata.fandomAccess as string[] || [],
        permissions: [],
        is_active: !user.banned,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }).onConflictDoUpdate({
        target: adminUsers.clerk_id,
        set: {
          email: user.emailAddresses[0]?.emailAddress || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: role as 'ProjectAdmin' | 'FandomAdmin',
          updated_at: user.updatedAt,
        }
      });

      console.log(`Synced: ${user.emailAddresses[0]?.emailAddress}`);
    }
  }

  console.log('✅ Sync complete!');
}

syncClerkUsers();
```

Run with:
```bash
npx tsx scripts/sync-clerk-users.ts
```

---

## Recommended Choice

**Start with Pure Clerk (Option A)** because:
- ✅ Simpler to implement
- ✅ Less code to maintain
- ✅ No sync issues
- ✅ Good enough for most use cases

**Upgrade to Sync (Option B) later if:**
- Need faster queries with joins
- Have >10,000 users
- Need audit trail in database
- Want offline admin queries

---

## Files to Modify

### Pure Clerk Approach
- `app/api/admin/dashboard/stats/route.ts` - Update user counts
- `lib/auth/permissions.ts` - Add permission helpers

### Sync Approach (Additional)
- `app/api/webhooks/clerk/route.ts` - Create webhook handler
- `src/lib/database/schema.ts` - Update admin_users table
- `scripts/sync-clerk-users.ts` - One-time migration

---

## Environment Variables Needed

```bash
# .env.local

# Clerk (already have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# For webhook sync (Option B only)
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

---

## Next Steps

1. Choose: Pure Clerk or Clerk + Sync
2. Follow implementation steps above
3. Test admin dashboard
4. Verify user counts are correct
5. Set up admin roles for existing users

Need help deciding? **Go with Pure Clerk first.** You can always add sync later if needed.
