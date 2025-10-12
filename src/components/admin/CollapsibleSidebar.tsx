/**
 * Collapsible Sidebar Component
 *
 * A modern collapsible sidebar that shows only icons by default and expands on hover.
 * Features smooth animations, active states, theme toggle integration, and responsive design.
 *
 * @package the-pensive-index
 * @version 2.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/theme/ThemeToggle';
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
            'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border shadow-lg transition-all duration-300 ease-in-out z-40 w-64 md:hidden',
            className
          )}
        >
          {/* Mobile navigation content */}
          <nav className="pt-4 pb-4 h-full overflow-y-auto flex flex-col">
            <div className="space-y-1 px-2 flex-1">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'group flex items-center px-3 py-3 rounded-lg transition-all duration-300 ease-out',
                      'hover:bg-accent hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      isActive
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full shadow-sm" />
                    )}

                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-3 font-medium text-sm">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Theme Toggle */}
            <div className="border-t border-border pt-4 px-2">
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </aside>
      )}

      {/* Desktop sidebar - Original expanding behavior but with better positioning */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border shadow-lg transition-all duration-300 ease-in-out',
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
              'p-1.5 rounded-md hover:bg-accent transition-all duration-200',
              isExpanded || isPinned ? 'opacity-100' : 'opacity-0'
            )}
            title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            {isPinned ? (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                    'group flex items-center relative rounded-lg transition-all duration-300 ease-out',
                    'hover:bg-accent hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    isExpanded || isPinned ? 'px-3 py-2.5' : 'px-3 py-3',
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={isExpanded || isPinned ? undefined : item.label}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full shadow-sm" />
                  )}

                  {/* Icon */}
                  <Icon
                    className={cn(
                      'flex-shrink-0 transition-all duration-300 ease-out',
                      isExpanded || isPinned ? 'h-5 w-5' : 'h-6 w-6',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground group-hover:scale-110'
                    )}
                  />

                  {/* Label - only shown when expanded */}
                  <span
                    className={cn(
                      'font-medium text-sm transition-all duration-300 ease-out',
                      isExpanded || isPinned
                        ? 'ml-3 opacity-100 translate-x-0'
                        : 'ml-0 opacity-0 -translate-x-2 w-0 overflow-hidden'
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Tooltip for collapsed state */}
                  {!isExpanded && !isPinned && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-popover text-popover-foreground border border-border text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                      {item.description && (
                        <div className="text-muted-foreground text-xs mt-0.5">
                          {item.description}
                        </div>
                      )}
                      {/* Tooltip arrow */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Role Indicator */}
        <div
          className={cn(
            'px-2 pb-2 border-t border-border pt-4 transition-all duration-200',
            isExpanded || isPinned ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center text-xs text-muted-foreground px-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Admin Mode
          </div>
        </div>

        {/* Theme Toggle - Always visible */}
        <div className="px-2 pb-4 border-t border-border pt-4">
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      </aside>;
    </>
  );
}
