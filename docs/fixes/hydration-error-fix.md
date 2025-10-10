# Hydration Error Fix

## Error Description

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

**Error Location:** `/fandom/[slug]/page.tsx` line 165

**Cause:** Browser extension (likely a password manager or security extension) is adding the `keychainify-checked` class to Link components.

---

## Understanding the Error

This is a **non-critical hydration mismatch** caused by:

1. Server renders HTML with class: `hover:text-indigo-600 transition-colors`
2. Browser extension modifies DOM, adding: `keychainify-checked`
3. React hydration finds mismatch: `hover:text-indigo-600 transition-colors` vs `hover:text-indigo-600 transition-colors keychainify-checked`

---

## Solution Options

### Option 1: Ignore It ✅ Recommended

This error is **cosmetic and non-functional**. It:
- ❌ Does NOT break the application
- ❌ Does NOT affect user experience
- ✅ Only appears in development console
- ✅ Disappears after React hydration completes

**Action:** No code changes needed. Browser extensions will always cause these warnings.

---

### Option 2: Suppress Hydration Warning (If Annoying)

Add `suppressHydrationWarning` to the nav element:

```tsx
// app/fandom/[slug]/page.tsx
<nav
  className="flex items-center space-x-2 text-sm text-gray-500"
  suppressHydrationWarning
>
  <Link href="/" className="hover:text-indigo-600 transition-colors">
    Home
  </Link>
  <span>/</span>
  <Link href="/discover" className="hover:text-indigo-600 transition-colors">
    Discover
  </Link>
  <span>/</span>
  <span className="text-gray-900 font-medium">{fandom.name}</span>
</nav>
```

**Pros:**
- Silences the console warning
- No functionality change

**Cons:**
- Hides other potential hydration issues in that element
- Not addressing root cause

---

### Option 3: Use Client Component for Navigation

Convert the navigation to a client component:

```tsx
// components/fandom/FandomBreadcrumb.tsx
'use client';

import Link from 'next/link';

export function FandomBreadcrumb({ fandomName }: { fandomName: string }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500">
      <Link href="/" className="hover:text-indigo-600 transition-colors">
        Home
      </Link>
      <span>/</span>
      <Link href="/discover" className="hover:text-indigo-600 transition-colors">
        Discover
      </Link>
      <span>/</span>
      <span className="text-gray-900 font-medium">{fandomName}</span>
    </nav>
  );
}
```

Then in the page:
```tsx
// app/fandom/[slug]/page.tsx
import { FandomBreadcrumb } from '@/components/fandom/FandomBreadcrumb';

// In the render:
<FandomBreadcrumb fandomName={fandom.name} />
```

**Pros:**
- Cleaner separation of concerns
- Can add client-side interactivity if needed

**Cons:**
- Extra component file
- Still won't prevent browser extension modifications

---

## Recommendation

**Do Nothing** (Option 1) because:

1. This is a known issue with browser extensions
2. It doesn't affect functionality
3. Users won't see any problems
4. Common extensions causing this:
   - LastPass
   - 1Password
   - Dashlane
   - Keeper
   - Chrome Password Manager

---

## If You Still Want to Suppress It

Just add this one line to the nav element:

```tsx
<nav
  className="flex items-center space-x-2 text-sm text-gray-500"
  suppressHydrationWarning  // Add this
>
```

That's it. Error gone. ✅

---

## Related Resources

- [React Hydration Mismatch Docs](https://react.dev/link/hydration-mismatch)
- [Next.js Hydration Error Guide](https://nextjs.org/docs/messages/react-hydration-error)
- [Suppress Hydration Warning](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors)

---

## Note

The error message shows:
```
+ Home
<span>
```

This means React is comparing:
- Expected (server): `<a>Home</a>`
- Actual (browser): `<a class="...keychainify-checked">Home</a><span>`

The browser extension is injecting its own elements. There's no clean way to prevent this without breaking the extension's functionality for users who rely on it.

**Verdict:** This is a browser extension issue, not a code issue. Safe to ignore. ✅
