/**
 * Collapsible Sidebar Component
 *
 * A modern collapsible sidebar that shows only icons by default and expands on hover.
 * Features smooth animations, active states, and responsive design.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Settings,
  Users,
  Tag,
  FileText,
  TestTube,
  BarChart3,
  Shield,
  UserCog,
  Mail,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview and quick actions',
  },
  {
    label: 'Validation Rules',
    href: '/admin/validation-rules',
    icon: Settings,
    description: 'Manage validation rules',
  },
  {
    label: 'Rule Templates',
    href: '/admin/rule-templates',
    icon: FileText,
    description: 'Reusable rule templates',
  },
  {
    label: 'Tag Classes',
    href: '/admin/tag-classes',
    icon: Tag,
    description: 'Configure tag classification',
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management',
  },
  {
    label: 'Role Assignment',
    href: '/admin/role-assignment',
    icon: Shield,
    description: 'Manage user roles',
  },
  {
    label: 'Fandom Assignment',
    href: '/admin/fandom-assignment',
    icon: UserCog,
    description: 'Assign fandom permissions',
  },
  {
    label: 'Invitations',
    href: '/admin/invitations',
    icon: Mail,
    description: 'Manage invitations',
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: Activity,
    description: 'System audit logs',
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Platform analytics',
  },
  {
    label: 'Testing Sandbox',
    href: '/admin/testing-sandbox',
    icon: TestTube,
    description: 'Test validation rules',
  },
];

interface CollapsibleSidebarProps {
  className?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function CollapsibleSidebar({
  className,
  isMobileOpen,
  onMobileClose,
}: CollapsibleSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const pathname = usePathname();

  // Note: Sidebar now floats above content, no need to adjust main content padding

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsExpanded(false);
    }
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      setIsExpanded(true);
    } else {
      // When unpinning, collapse it
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <aside
          className={cn(
            'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out z-40 w-64 md:hidden',
            className
          )}
        >
          {/* Mobile navigation content */}
          <nav className="pt-4 pb-4 h-full overflow-y-auto">
            <div className="space-y-1 px-2">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'group flex items-center px-3 py-3 rounded-lg transition-all duration-200',
                      'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                    )}

                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-3 font-medium text-sm">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>
      )}

      {/* Desktop sidebar - Original expanding behavior but with better positioning */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out',
          // Desktop behavior - z-50 when expanded to float above content
          'hidden md:flex md:flex-col',
          isExpanded || isPinned ? 'w-64 z-50' : 'w-16 z-20',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Pin/Unpin Toggle */}
        <div className="absolute top-4 right-2 z-50">
          <button
            onClick={togglePin}
            className={cn(
              'p-1.5 rounded-md hover:bg-gray-100 transition-all duration-200',
              isExpanded || isPinned ? 'opacity-100' : 'opacity-0'
            )}
            title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            {isPinned ? (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="pt-12 pb-4">
          <div className="space-y-1 px-2">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center relative rounded-lg transition-all duration-200',
                    'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                    isExpanded || isPinned ? 'px-3 py-2.5' : 'px-3 py-3',
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                  title={isExpanded || isPinned ? undefined : item.label}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                  )}

                  {/* Icon */}
                  <Icon
                    className={cn(
                      'flex-shrink-0 transition-colors duration-200',
                      isExpanded || isPinned ? 'h-5 w-5' : 'h-6 w-6',
                      isActive
                        ? 'text-blue-600'
                        : 'text-gray-500 group-hover:text-gray-700'
                    )}
                  />

                  {/* Label - only shown when expanded */}
                  <span
                    className={cn(
                      'font-medium text-sm transition-all duration-200',
                      isExpanded || isPinned
                        ? 'ml-3 opacity-100'
                        : 'ml-0 opacity-0 w-0 overflow-hidden'
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Tooltip for collapsed state */}
                  {!isExpanded && !isPinned && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                      {item.description && (
                        <div className="text-gray-300 text-xs mt-0.5">
                          {item.description}
                        </div>
                      )}
                      {/* Tooltip arrow */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section with role indicator */}
        <div
          className={cn(
            'absolute bottom-4 left-0 right-0 px-2 transition-all duration-200',
            isExpanded || isPinned ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center text-xs text-gray-500 px-3">
              <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
              Admin Mode
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
