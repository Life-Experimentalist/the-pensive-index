/**
 * Admin Dashboard Layout Component
 *
 * Main layout for the admin dashboard with:
 * - Responsive navigation sidebar
 * - Role-based menu items
 * - User info and logout functionality
 * - Breadcrumb navigation
 * - Main content area
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CogIcon,
  DocumentTextIcon,
  TagIcon,
  FlaskConicalIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('ProjectAdmin' | 'FandomAdmin')[];
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: HomeIcon,
    roles: ['ProjectAdmin', 'FandomAdmin'],
  },
  {
    name: 'Validation Rules',
    href: '/admin/validation-rules',
    icon: DocumentTextIcon,
    roles: ['ProjectAdmin', 'FandomAdmin'],
    children: [
      {
        name: 'All Rules',
        href: '/admin/validation-rules',
        icon: DocumentTextIcon,
        roles: ['ProjectAdmin', 'FandomAdmin'],
      },
      {
        name: 'Create Rule',
        href: '/admin/validation-rules/create',
        icon: DocumentTextIcon,
        roles: ['ProjectAdmin', 'FandomAdmin'],
      },
    ],
  },
  {
    name: 'Rule Templates',
    href: '/admin/rule-templates',
    icon: CogIcon,
    roles: ['ProjectAdmin'],
    children: [
      {
        name: 'All Templates',
        href: '/admin/rule-templates',
        icon: CogIcon,
        roles: ['ProjectAdmin'],
      },
      {
        name: 'Create Template',
        href: '/admin/rule-templates/create',
        icon: CogIcon,
        roles: ['ProjectAdmin'],
      },
    ],
  },
  {
    name: 'Tag Classes',
    href: '/admin/tag-classes',
    icon: TagIcon,
    roles: ['ProjectAdmin', 'FandomAdmin'],
    children: [
      {
        name: 'All Classes',
        href: '/admin/tag-classes',
        icon: TagIcon,
        roles: ['ProjectAdmin', 'FandomAdmin'],
      },
      {
        name: 'Create Class',
        href: '/admin/tag-classes/create',
        icon: TagIcon,
        roles: ['ProjectAdmin', 'FandomAdmin'],
      },
    ],
  },
  {
    name: 'Testing Sandbox',
    href: '/admin/testing-sandbox',
    icon: FlaskConicalIcon,
    roles: ['ProjectAdmin', 'FandomAdmin'],
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: UsersIcon,
    roles: ['ProjectAdmin'],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: ChartBarIcon,
    roles: ['ProjectAdmin'],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const userRole = (session?.user as any)?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin';

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(userRole)
  );

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Admin', href: '/admin' }];

    let currentPath = '/admin';
    for (let i = 1; i < segments.length; i++) {
      currentPath += `/${segments[i]}`;
      const segment = segments[i];

      // Convert kebab-case to title case
      const name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({ name, href: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + '/');
    const isExpanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;
    const filteredChildren = item.children?.filter(child =>
      child.roles.includes(userRole)
    );

    return (
      <li key={item.name}>
        <div className="flex items-center">
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(item.name)}
              className={`flex flex-1 items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                isActive
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-700'
              }`}
            >
              <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {item.name}
              {hasChildren && (
                <ChevronRightIcon
                  className={`ml-auto h-5 w-5 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              className={`flex flex-1 items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                isActive
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-700'
              }`}
            >
              <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          )}
        </div>

        {hasChildren && filteredChildren && isExpanded && (
          <ul className="mt-1 px-2">
            {filteredChildren.map(child => (
              <li key={child.name} className="ml-4">
                <Link
                  href={child.href}
                  className={`flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 ${
                    pathname === child.href
                      ? 'bg-indigo-700 text-white font-semibold'
                      : 'text-indigo-200 hover:text-white hover:bg-indigo-700'
                  }`}
                >
                  <child.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`relative z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div
          className="fixed inset-0 bg-gray-900/80"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4">
              <div className="flex h-16 shrink-0 items-center">
                <h1 className="text-xl font-bold text-white">Pensieve Admin</h1>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {filteredNavigation.map(item =>
                        renderNavigationItem(item)
                      )}
                    </ul>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-bold text-white">Pensieve Admin</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNavigation.map(item => renderNavigationItem(item))}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="rounded-md bg-indigo-700 p-3">
                  <div className="flex items-center gap-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {session?.user?.name?.charAt(0) || 'A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {session?.user?.name || 'Admin User'}
                      </p>
                      <p className="text-xs text-indigo-200 truncate">
                        {userRole}
                      </p>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex-shrink-0 p-1 text-indigo-200 hover:text-white"
                      title="Sign out"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex flex-1" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.href} className="flex items-center">
                  {index > 0 && (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
                  )}
                  <Link
                    href={crumb.href}
                    className={`text-sm font-medium ${
                      index === breadcrumbs.length - 1
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {crumb.name}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
