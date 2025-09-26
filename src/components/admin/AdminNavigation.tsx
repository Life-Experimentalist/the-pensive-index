/**
 * Admin Navigation Component
 *
 * Role-based navigation menu for admin dashboard with permission checking
 * and active route highlighting.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  CogIcon,
  DocumentDuplicateIcon,
  BeakerIcon,
  ChartBarIcon,
  UsersIcon,
  FolderIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from '@/hooks/admin/usePermissions';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  permission?: string;
  projectAdminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: HomeIcon,
    description: 'Overview and quick actions',
  },
  {
    name: 'Validation Rules',
    href: '/admin/validation-rules',
    icon: CheckCircleIcon,
    description: 'Manage validation rules',
    permission: 'rule:read',
  },
  {
    name: 'Rule Templates',
    href: '/admin/rule-templates',
    icon: DocumentDuplicateIcon,
    description: 'Manage rule templates',
    permission: 'template:manage',
    projectAdminOnly: true,
  },
  {
    name: 'Tag Classes',
    href: '/admin/tag-classes',
    icon: FolderIcon,
    description: 'Manage tag classifications',
    permission: 'rule:read',
  },
  {
    name: 'Testing Sandbox',
    href: '/admin/testing-sandbox',
    icon: BeakerIcon,
    description: 'Test validation rules',
    permission: 'rule:read',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
    description: 'Usage analytics and metrics',
    permission: 'system:audit',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: UsersIcon,
    description: 'Manage admin users',
    permission: 'admin:manage',
    projectAdminOnly: true,
  },
];

export function AdminNavigation() {
  const pathname = usePathname();
  const { hasPermission, isProjectAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const filteredItems = navigationItems.filter(item => {
    // Show item if no permission required
    if (!item.permission) {
      return true;
    }

    // Hide ProjectAdmin-only items from FandomAdmins
    if (item.projectAdminOnly && !isProjectAdmin) {
      return false;
    }

    // Check specific permission
    return hasPermission(item.permission);
  });

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        Navigation
      </h2>

      <nav className="space-y-1">
        {filteredItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
              title={item.description}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive
                    ? 'text-blue-500'
                    : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Role indicator */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="flex items-center text-xs text-gray-500">
          <div
            className={cn(
              'w-2 h-2 rounded-full mr-2',
              isProjectAdmin ? 'bg-red-400' : 'bg-blue-400'
            )}
          />
          {isProjectAdmin ? 'Project Admin' : 'Fandom Admin'}
        </div>
      </div>
    </div>
  );
}
