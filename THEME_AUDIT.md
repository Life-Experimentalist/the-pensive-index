# Theme Audit Report - The Pensieve Index

## Homepage (`app/page.tsx`)

### ✅ Working Well

**Header**
- Background: `bg-white dark:bg-gray-800` ✅
- Border: `border-gray-200 dark:border-gray-700` ✅
- Logo/Title text: `text-gray-900 dark:text-white` ✅

**Hero Section**
- Gradient background with dark mode variants ✅
- Text: All white on colored background (works in both modes) ✅
- Stats cards: Semi-transparent white with backdrop blur ✅
- Interactive demo: Good contrast in both modes ✅

### ⚠️ Potential Issues to Check

1. **Buttons on gradient backgrounds**
   - White button with indigo text may need dark mode adjustment
   - Check hover states

2. **Glass-morphism elements**
   - Semi-transparent backgrounds may have contrast issues in dark mode
   - Test readability with actual content

3. **Animation elements**
   - Pulse animations use `bg-white dark:bg-gray-800 opacity-10` - verify visibility

## Recommended Pattern

```tsx
// Button on gradient (ensure readability)
<button className="
  bg-white dark:bg-gray-900
  text-indigo-600 dark:text-indigo-400
  border-2 border-transparent dark:border-indigo-500
  hover:bg-gray-100 dark:hover:bg-gray-800
">

// Text on colored backgrounds
<div className="bg-indigo-600 dark:bg-indigo-900">
  <p className="text-white"> {/* White works on both */}</p>
</div>

// Cards with glass effect
<div className="
  bg-white/10 dark:bg-white/5
  backdrop-blur-lg
  border border-white/20 dark:border-white/10
">
```

## Admin Dashboard Audit Needed

Files to check:
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/*/page.tsx` (all sub-pages)

Common issues to fix:
1. Tables: Row hover states, header backgrounds
2. Forms: Input borders, focus states, disabled states
3. Modals: Background overlays, card backgrounds
4. Sidebar: Active tab highlighting, text colors

## Next Steps

1. Visual test in browser (light mode)
2. Toggle to dark mode
3. Test all interactive elements
4. Fix any low-contrast text
5. Verify WCAG AA compliance (4.5:1 contrast ratio)
