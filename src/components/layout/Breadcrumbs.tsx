/**
 * Breadcrumbs Component
 *
 * Dynamic breadcrumb navigation that adapts based on current route
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center space-x-1 text-sm overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {/* Home Icon */}
      <Link
        href="/"
        className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1 whitespace-nowrap"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Link>

      {/* Breadcrumb Items */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center space-x-1">
            <ChevronRight className="w-4 h-4 text-foreground/40 flex-shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'flex items-center gap-1 whitespace-nowrap',
                  isLast ? 'text-foreground font-medium' : 'text-foreground/60'
                )}
              >
                {item.icon}
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
