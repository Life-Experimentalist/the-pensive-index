/**
 * Admin Top Navigation Bar
 *
 * A unified top navigation bar for the admin dashboard that includes project branding,
 * user information, notifications, and sign out functionality.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import SafeSignOutButton from '@/components/ui/SafeSignOutButton';
import { cn } from '@/lib/utils';
import {
  LogOut,
  User,
  Settings,
  Bell,
  Home,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { useState } from 'react';

interface AdminTopBarProps {
  className?: string;
  title?: string;
  onMobileMenuToggle?: () => void;
}

export default function AdminTopBar({
  className,
  title,
  onMobileMenuToggle,
}: AdminTopBarProps) {
  const { user } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userRole = user?.publicMetadata?.role as string;
  const displayName =
    user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress;

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50',
        className
      )}
    >
      <div className="h-16 px-4 flex items-center justify-between">
        {/* Left section - Branding and title */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu toggle */}
          {onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="sm"
              className="p-2 md:hidden"
              onClick={onMobileMenuToggle}
              title="Toggle navigation menu"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </Button>
          )}

          {/* Logo and project name */}
          <Link
            href="/"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/icon.png"
              alt="The Pensieve Index"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-gray-900">
                The Pensieve Index
              </h1>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </div>
          </Link>

          {/* Admin badge */}
          <Badge
            variant="secondary"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Admin Panel
          </Badge>

          {/* Page title separator */}
          {title && (
            <>
              <div className="h-6 w-px bg-gray-300" />
              <h2 className="text-lg font-medium text-gray-700">{title}</h2>
            </>
          )}
        </div>

        {/* Right section - User actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications (placeholder for future) */}
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-gray-100"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {/* Notification badge - hidden for now */}
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full opacity-0" />
          </Button>

          {/* Quick settings */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-gray-100"
            title="Quick Settings"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </Button>

          {/* Main site link */}
          <Link href="/" title="Go to main site">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100">
              <Home className="h-5 w-5 text-gray-600" />
            </Button>
          </Link>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              {/* User avatar */}
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={displayName || 'User'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              )}

              {/* User info - hidden on mobile */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole?.replace(/([A-Z])/g, ' $1').trim() || 'Admin'}
                </p>
              </div>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                {/* User info in dropdown */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.emailAddresses[0]?.emailAddress}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {userRole?.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/user-profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile Settings
                  </Link>

                  <Link
                    href="/admin/users"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Admin Settings
                  </Link>
                </div>

                {/* Sign out */}
                <div className="border-t border-gray-100 py-1">
                  <SafeSignOutButton>
                    <div className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer">
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </div>
                  </SafeSignOutButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside handler */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}
