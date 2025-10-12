/**
 * Main Navigation Component
 *
 * Enhanced navbar with breadcrumb navigation, share button, user authentication
 * Responsive design with logo repositioning on smaller screens
 *
 * @package the-pensive-index
 * @version 3.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Search,
  User,
  LogOut,
  Settings,
  BookOpen,
} from 'lucide-react';
import { useUser, SignOutButton } from '@clerk/nextjs';
import ClientThemeToggle from '@/components/theme/ClientThemeToggle';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getUserDisplayInfo } from '@/lib/auth/roles';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import ShareButton from './ShareButton';

const navigation = [
  { name: 'Home', href: '/', icon: null },
  { name: 'Fandoms', href: '/fandom', icon: BookOpen },
  { name: 'Pathway', href: '/pathway', icon: Search },
];

interface MainNavigationProps {
  /**
   * Optional breadcrumb items to display
   */
  breadcrumbs?: BreadcrumbItem[];
  /**
   * Show share button
   */
  showShare?: boolean;
  /**
   * Custom share data (defaults to current page)
   */
  shareData?: {
    title?: string;
    text?: string;
    url?: string;
  };
}

export default function MainNavigation({
  breadcrumbs,
  showShare = false,
  shareData,
}: MainNavigationProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setUserMenuOpen(false);
    };
    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen]);

  const userInfo = user ? getUserDisplayInfo(user) : null;

  // Determine if we should use compact layout (with breadcrumbs)
  const hasCompactLayout = breadcrumbs && breadcrumbs.length > 0;

  return (
    <>
      <nav className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand - Collapses to icon on small screens with breadcrumbs */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <Link
                href="/"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/icon.png"
                  alt="The Pensieve Index"
                  width={32}
                  height={32}
                  className="w-8 h-8 flex-shrink-0"
                  priority
                />
                <span
                  className={cn(
                    'text-xl font-bold text-foreground transition-all',
                    hasCompactLayout
                      ? 'hidden lg:inline' // Hide on small/medium when breadcrumbs present
                      : 'hidden sm:inline' // Normal behavior without breadcrumbs
                  )}
                >
                  The Pensieve Index
                </span>
                <span
                  className={cn(
                    'text-xl font-bold text-foreground',
                    hasCompactLayout ? 'hidden' : 'sm:hidden' // Adjust mobile title
                  )}
                >
                  Pensieve
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 flex-shrink">
              {!hasCompactLayout &&
                navigation.map(item => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap',
                        isActive
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      {item.name}
                    </Link>
                  );
                })}
              {/* Admin Link - Only show if user is admin and no breadcrumbs */}
              {!hasCompactLayout && isMounted && userInfo?.isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap',
                    pathname.startsWith('/admin')
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </div>

            {/* Right Side: Share Button (if enabled) + Theme Toggle + User Menu */}
            <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
              {showShare && (
                <ShareButton
                  title={shareData?.title}
                  text={shareData?.text}
                  url={shareData?.url}
                />
              )}
              <ClientThemeToggle />

              {/* User Authentication */}
              {!isMounted || !isLoaded ? (
                // Loading skeleton
                <div className="h-9 w-24 bg-accent/20 rounded-md animate-pulse" />
              ) : user ? (
                // User Menu
                <div className="relative">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setUserMenuOpen(!userMenuOpen);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      userMenuOpen
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">
                      {userInfo?.name || 'User'}
                    </span>
                    {userInfo?.isAdmin && (
                      <span className="hidden xl:inline text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {userInfo.role}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-medium text-foreground">
                          {userInfo?.name}
                        </p>
                        <p className="text-xs text-foreground/60">
                          {user.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      {userInfo?.isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      )}
                      <div className="border-t border-border mt-1 pt-1">
                        <SignOutButton>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-colors">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </SignOutButton>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Sign In/Up Buttons
                <div className="flex items-center gap-2">
                  <Link href="/sign-in">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              <ClientThemeToggle />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent/50 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map(item => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {item.name}
                  </Link>
                );
              })}
              {isMounted && userInfo?.isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium',
                    pathname.startsWith('/admin')
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Link>
              )}

              {/* Mobile User Section */}
              <div className="border-t border-border mt-2 pt-2">
                {!isMounted || !isLoaded ? (
                  <div className="px-3 py-2">
                    <div className="h-8 bg-accent/20 rounded animate-pulse" />
                  </div>
                ) : user ? (
                  <>
                    <div className="px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">
                        {userInfo?.name}
                      </p>
                      <p className="text-xs text-foreground/60">
                        {user.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <SignOutButton>
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </SignOutButton>
                  </>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Breadcrumb Bar - Only show when breadcrumbs are provided */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="bg-background/50 border-b border-border backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        </div>
      )}
    </>
  );
}
