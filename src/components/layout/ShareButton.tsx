/**
 * Universal Share Button Component
 *
 * Handles page sharing via Web Share API or clipboard fallback
 * with toast notifications
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
  variant?: 'icon' | 'button';
}

export default function ShareButton({
  title,
  text,
  url,
  className,
  variant = 'icon',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: title || document.title,
      text: text || '',
      url: url || window.location.href,
    };

    // Try Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        // User cancelled or share failed
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleShare}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          'bg-accent hover:bg-accent/80 text-accent-foreground',
          className
        )}
        title="Share this page"
        aria-label="Share this page"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            Share
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={cn(
        'p-2 rounded-md transition-colors',
        'text-foreground/60 hover:text-foreground hover:bg-accent/50',
        className
      )}
      title={copied ? 'Link copied!' : 'Share this page'}
      aria-label="Share this page"
    >
      {copied ? (
        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
      ) : (
        <Share2 className="w-5 h-5" />
      )}
    </button>
  );
}
