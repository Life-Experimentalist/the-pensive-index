/**
 * Admin Dashboard Layout
 *
 * Layout component for admin dashboard with role-based navigation,
 * responsive design, and permission-gated content.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

/**
 * Admin Dashboard Layout
 *
 * Layout component for admin dashboard with role-based navigation,
 * responsive design, and permission-gated content.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { Metadata } from 'next';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export const metadata: Metadata = {
  title: 'Admin Dashboard - The Pensieve Index',
  description:
    'Administrative dashboard for managing fanfiction validation rules and content',
};

export default function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
