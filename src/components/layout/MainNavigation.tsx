/**
 * Main Navigation Component
 *
 * Standardized navbar for all public pages (non-admin)
 * Matches the clean design of admin dashboard and fandom pages
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import ClientThemeToggle from '@/components/theme/ClientThemeToggle';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Fandoms', href: '/fandom' },
  { name: 'Pathway', href: '/pathway' },
  { name: 'Admin', href: '/admin' },
];

export default function MainNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/icon.png"
                alt="The Pensieve Index"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
              />
              <span className="text-xl font-bold text-foreground hidden sm:inline">
                The Pensieve Index
              </span>
              <span className="text-xl font-bold text-foreground sm:hidden">
                Pensieve
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Theme Toggle + Sign In (Desktop) */}
          <div className="hidden md:flex items-center space-x-3">
            <ClientThemeToggle />
            <Link href="/sign-in">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <ClientThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent/50"
            >
              <span className="sr-only">Open main menu</span>
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
        <div className="md:hidden border-t border-border">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
