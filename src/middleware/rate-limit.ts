/**
 * Rate Limiting Middleware
 * Feature: 003-optimize-the-platform
 *
 * Enforces rate limits using Cloudflare Durable Objects
 *
 * Features:
 * - Per-user rate limiting (IP or user ID)
 * - Different limits for anonymous, authenticated, admin users
 * - 429 responses with Retry-After headers
 * - Whitelist support for trusted IPs/admins
 * - Graceful degradation if rate limiter unavailable
 */

import { NextRequest, NextResponse } from 'next/server';
import type { UserType } from '@/types/performance';

/**
 * Rate limit response
 */
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Rate limiting middleware
 *
 * Usage in middleware.ts:
 * ```typescript
 * import { rateLimitMiddleware } from '@/middleware/rate-limit';
 *
 * export async function middleware(request: NextRequest) {
 *   return rateLimitMiddleware(request, env);
 * }
 * ```
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>,
  env?: {
    RATE_LIMITER?: DurableObjectNamespace;
  }
): Promise<NextResponse> {
  // Skip if rate limiter not available (graceful degradation)
  if (!env?.RATE_LIMITER) {
    console.warn(
      '[RateLimit] Durable Object not available - skipping rate limit'
    );
    return next();
  }

  // Skip for whitelisted paths
  if (shouldSkipRateLimit(request.nextUrl.pathname)) {
    return next();
  }

  try {
    // Get user identifier and type
    const identifier = getUserIdentifier(request);
    const userType = getUserType(request);
    const ip = getClientIP(request);

    // Check rate limit
    const result = await checkRateLimit(
      env.RATE_LIMITER,
      identifier,
      userType,
      ip
    );

    // If not allowed, return 429
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': String(getRateLimitForType(userType)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
          },
        }
      );
    }

    // Continue to next middleware/handler
    const response = await next();

    // Add rate limit headers to successful response
    response.headers.set(
      'X-RateLimit-Limit',
      String(getRateLimitForType(userType))
    );
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set(
      'X-RateLimit-Reset',
      String(Math.floor(result.resetAt / 1000))
    );

    return response;
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // Graceful degradation - allow request on error
    return next();
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check rate limit via Durable Object
 */
async function checkRateLimit(
  rateLimiter: DurableObjectNamespace,
  identifier: string,
  userType: UserType,
  ip?: string
): Promise<RateLimitResult> {
  // Get Durable Object instance for this identifier
  const id = rateLimiter.idFromName(identifier);
  const stub = rateLimiter.get(id);

  // Call rate limiter
  const response = await stub.fetch('http://rate-limiter/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, userType, ip }),
  });

  if (!response.ok) {
    throw new Error(`Rate limiter error: ${response.status}`);
  }

  return response.json() as Promise<RateLimitResult>;
}

/**
 * Get user identifier (IP address or user ID)
 */
function getUserIdentifier(request: NextRequest): string {
  // Try to get authenticated user ID
  const userId = request.cookies.get('user_id')?.value;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip = getClientIP(request);
  return `ip:${ip}`;
}

/**
 * Get user type from request
 */
function getUserType(request: NextRequest): UserType {
  // Check for admin
  const adminCookie = request.cookies.get('admin_role');
  if (adminCookie) {
    return 'ADMIN';
  }

  // Check for authenticated user
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('session');
  if (authHeader || sessionCookie) {
    return 'AUTHENTICATED';
  }

  return 'ANONYMOUS';
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  // Try Cloudflare headers first
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // Try standard headers
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }

  return 'unknown';
}

/**
 * Check if path should skip rate limiting
 */
function shouldSkipRateLimit(pathname: string): boolean {
  // Skip static assets
  if (pathname.startsWith('/_next/')) {
    return true;
  }
  if (pathname.startsWith('/static/')) {
    return true;
  }
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)) {
    return true;
  }

  // Skip health checks
  if (pathname === '/health') {
    return true;
  }
  if (pathname === '/api/health') {
    return true;
  }

  // Skip admin paths (they have unlimited rate limit anyway)
  if (pathname.startsWith('/admin')) {
    return true;
  }

  return false;
}

/**
 * Get rate limit value for user type
 */
function getRateLimitForType(userType: UserType): number {
  switch (userType) {
    case 'ANONYMOUS':
      return 60; // 60 requests per minute
    case 'AUTHENTICATED':
      return 120; // 120 requests per minute
    case 'ADMIN':
      return 999999; // Unlimited
    default:
      return 60;
  }
}

/**
 * Enhanced middleware with endpoint filtering
 */
export async function enforceRateLimit(
  request: NextRequest,
  next: () => Promise<NextResponse>,
  env?: {
    RATE_LIMITER?: DurableObjectNamespace;
  }
): Promise<NextResponse> {
  // Check if should rate limit
  if (shouldSkipRateLimit(request.nextUrl.pathname)) {
    return next();
  }

  return rateLimitMiddleware(request, next, env);
}

/**
 * Utility to manually reset rate limit for an identifier
 * Use for testing or admin operations
 */
export async function resetRateLimit(
  rateLimiter: DurableObjectNamespace,
  identifier: string
): Promise<boolean> {
  try {
    const id = rateLimiter.idFromName(identifier);
    const stub = rateLimiter.get(id);

    const response = await stub.fetch('http://rate-limiter/reset', {
      method: 'POST',
    });

    return response.ok;
  } catch (error) {
    console.error('[RateLimit] Error resetting rate limit:', error);
    return false;
  }
}

/**
 * Get rate limit statistics for an identifier
 */
export async function getRateLimitStats(
  rateLimiter: DurableObjectNamespace,
  identifier: string
): Promise<{
  identifier: string;
  userType: UserType;
  totalRequests: number;
  currentWindow: number;
  buckets: Array<[number, number]>;
} | null> {
  try {
    const id = rateLimiter.idFromName(identifier);
    const stub = rateLimiter.get(id);

    const response = await stub.fetch('http://rate-limiter/stats', {
      method: 'GET',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[RateLimit] Error getting stats:', error);
    return null;
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectStub {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}
