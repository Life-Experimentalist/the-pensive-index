import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/fandom(.*)',
  '/story(.*)',
  '/pathway(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/fandoms(.*)',
  '/api/stories(.*)',
]);

/**
 * Simplified middleware for Next.js 15
 *
 * NOTE: Performance tracking, rate limiting, and caching are handled
 * at the API route level rather than in middleware due to Next.js 15
 * middleware limitations with Cloudflare Workers runtime.
 *
 * See: src/middleware/performance-tracking.ts for usage in API routes
 */
export default clerkMiddleware(async (auth, req) => {
  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
