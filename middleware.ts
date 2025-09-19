import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected route matchers
const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isProjectAdminRoute = createRouteMatcher([
  '/admin/project-admin(.*)',
  '/admin/users(.*)',
  '/admin/analytics(.*)',
  '/api/admin/roles(.*)',
  '/api/admin/fandoms/assign(.*)',
]);
const isFandomAdminRoute = createRouteMatcher([
  '/admin/fandom-admin(.*)',
  '/admin/tag-classes(.*)',
  '/admin/validation-rules(.*)',
  '/admin/testing-sandbox(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Allow unauthenticated access to public routes
  if (!isAdminRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication for all admin routes
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Check admin permissions based on route type
  if (isProjectAdminRoute(req)) {
    // Project Admin routes require ProjectAdmin role
    const hasProjectAdminRole = await checkProjectAdminRole(userId);
    if (!hasProjectAdminRole) {
      return NextResponse.redirect(new URL('/admin/unauthorized', req.url));
    }
  } else if (isFandomAdminRoute(req)) {
    // Fandom Admin routes require either ProjectAdmin or FandomAdmin role
    const hasAdminRole = await checkAdminRole(userId);
    if (!hasAdminRole) {
      return NextResponse.redirect(new URL('/admin/unauthorized', req.url));
    }
  } else if (isAdminRoute(req)) {
    // General admin routes require any admin role
    const hasAdminRole = await checkAdminRole(userId);
    if (!hasAdminRole) {
      return NextResponse.redirect(new URL('/admin/unauthorized', req.url));
    }
  }

  return NextResponse.next();
});

// Helper functions for role checking
async function checkProjectAdminRole(userId: string): Promise<boolean> {
  try {
    // This would typically check against your database
    // For now, return true - will be implemented with actual DB queries
    return true;
  } catch (error) {
    console.error('Error checking Project Admin role:', error);
    return false;
  }
}

async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    // This would check for any admin role (Project or Fandom)
    // For now, return true - will be implemented with actual DB queries
    return true;
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
