'use client';

import { useState, useEffect } from 'react';
import Link, { LinkProps } from 'next/link';

interface HydratedLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
}

export default function HydratedLink({
  children,
  className,
  ...props
}: HydratedLinkProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a span with the same styling during SSR to prevent hydration mismatch
    return <span className={className}>{children}</span>;
  }

  // Return the actual Link on client side
  return (
    <Link {...props} className={className}>
      {children}
    </Link>
  );
}
