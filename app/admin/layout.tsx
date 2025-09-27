/**
 * Admin Dashboard Layout
 *
 * Layout component for admin dashboard with unified navigation,
 * collapsible sidebar, and responsive design.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import UnifiedAdminLayout from '@/components/admin/UnifiedAdminLayout';

// Note: metadata can't be exported from Client Components
// This is handled at the page level instead

export default function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UnifiedAdminLayout>{children}</UnifiedAdminLayout>;
}
