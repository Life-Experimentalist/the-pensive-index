import { NextRequest, NextResponse } from 'next/server';
import { ResponseHandler } from '@/lib/api/responses';

/**
 * Authentication and authorization middleware for The Pensieve Index
 * Handles user authentication, role-based access control, and request validation
 */

export interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin' | 'super_admin';
    permissions: string[];
  };
  session?: {
    id: string;
    expires: Date;
  };
}

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
}

/**
 * Request rate limiting store (in-memory for development)
 * In production, this should use Redis or similar
 */
class InMemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  public increment(
    key: string,
    windowMs: number
  ): { count: number; resetTime: number } {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || now > current.resetTime) {
      // First request or window expired
      const data = { count: 1, resetTime: now + windowMs };
      this.store.set(key, data);
      return data;
    }

    // Increment existing count
    current.count++;
    this.store.set(key, current);
    return current;
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new InMemoryRateLimitStore();

// Cleanup expired entries every 5 minutes
setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);

/**
 * Rate limiting middleware
 */
export function withRateLimit(config: RateLimitConfig) {
  return function (
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> => {
      // Get client identifier (IP address + user agent hash)
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown';
      const userAgent = request.headers.get('user-agent') || '';
      const clientKey = `${ip}:${Buffer.from(userAgent)
        .toString('base64')
        .slice(0, 10)}`;

      // Check rate limit
      const { count, resetTime } = rateLimitStore.increment(
        clientKey,
        config.windowMs
      );

      // Add rate limit headers
      const headers = new Headers();
      headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      headers.set(
        'X-RateLimit-Remaining',
        Math.max(0, config.maxRequests - count).toString()
      );
      headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());

      if (count > config.maxRequests) {
        return ResponseHandler.rateLimitExceeded(new Date(resetTime));
      }

      // Execute handler and add headers to response
      const response = await handler(request, ...args);

      // Add rate limit headers to the response
      for (const [key, value] of headers.entries()) {
        response.headers.set(key, value);
      }

      return response;
    };
  };
}

/**
 * CORS middleware
 */
export function withCORS(
  options: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}
) {
  const {
    origins = ['*'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = false,
  } = options;

  return function (
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> => {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });

        response.headers.set('Access-Control-Allow-Origin', origins.join(', '));
        response.headers.set(
          'Access-Control-Allow-Methods',
          methods.join(', ')
        );
        response.headers.set(
          'Access-Control-Allow-Headers',
          headers.join(', ')
        );

        if (credentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }

        return response;
      }

      // Execute handler
      const response = await handler(request, ...args);

      // Add CORS headers to response
      response.headers.set('Access-Control-Allow-Origin', origins.join(', '));

      if (credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      return response;
    };
  };
}

/**
 * Authentication middleware
 */
export function withAuth(
  options: {
    required?: boolean;
    roles?: string[];
  } = {}
) {
  const { required = true, roles = [] } = options;

  return function (
    handler: (
      request: NextRequest,
      context: AuthContext,
      ...args: any[]
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> => {
      const authContext: AuthContext = {
        isAuthenticated: false,
      };

      // Extract auth token from headers
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      if (token) {
        try {
          // TODO: Implement actual token validation
          // This is a placeholder implementation
          const user = await validateToken(token);

          if (user) {
            authContext.isAuthenticated = true;
            authContext.user = user;
          }
        } catch (error) {
          console.error('Token validation failed:', error);
        }
      }

      // Check if authentication is required
      if (required && !authContext.isAuthenticated) {
        return ResponseHandler.unauthorized('Authentication required');
      }

      // Check role-based access
      if (roles.length > 0 && authContext.user) {
        const hasRequiredRole = roles.includes(authContext.user.role);
        if (!hasRequiredRole) {
          return ResponseHandler.forbidden('Insufficient permissions');
        }
      }

      // Execute handler with auth context
      return await handler(request, authContext, ...args);
    };
  };
}

/**
 * Request logging middleware
 */
export function withLogging(
  options: {
    includeBody?: boolean;
    includeHeaders?: boolean;
  } = {}
) {
  const { includeBody = false, includeHeaders = false } = options;

  return function (
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> => {
      const startTime = Date.now();
      const requestId = generateRequestId();

      // Log request
      console.log(`[${requestId}] ${request.method} ${request.url}`);

      if (includeHeaders) {
        console.log(
          `[${requestId}] Headers:`,
          Object.fromEntries(request.headers.entries())
        );
      }

      if (includeBody && request.method !== 'GET') {
        try {
          const body = await request.clone().text();
          console.log(`[${requestId}] Body:`, body);
        } catch (error) {
          console.log(`[${requestId}] Body: [Unable to read]`);
        }
      }

      // Execute handler
      const response = await handler(request, ...args);

      // Log response
      const duration = Date.now() - startTime;
      console.log(
        `[${requestId}] Response: ${response.status} (${duration}ms)`
      );

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);

      return response;
    };
  };
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders() {
  return function (
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> => {
      const response = await handler(request, ...args);

      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
      );

      return response;
    };
  };
}

/**
 * Middleware composition utility
 */
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}

/**
 * Placeholder token validation function
 * TODO: Implement actual JWT validation logic
 */
async function validateToken(
  token: string
): Promise<AuthContext['user'] | null> {
  // This is a placeholder implementation
  // In a real application, this would:
  // 1. Verify JWT signature
  // 2. Check token expiration
  // 3. Look up user in database
  // 4. Return user with permissions

  if (token === 'admin-token') {
    return {
      id: 'admin-1',
      email: 'admin@pensieve.local',
      role: 'admin',
      permissions: ['read', 'write', 'admin'],
    };
  }

  if (token === 'user-token') {
    return {
      id: 'user-1',
      email: 'user@pensieve.local',
      role: 'user',
      permissions: ['read'],
    };
  }

  return null;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Pre-configured middleware compositions for common use cases
 */
export const CommonMiddleware = {
  /**
   * Public API endpoints (no auth required)
   */
  public: compose(
    withSecurityHeaders(),
    withCORS(),
    withRateLimit({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
    withLogging()
  ),

  /**
   * Authenticated API endpoints
   */
  authenticated: compose(
    withSecurityHeaders(),
    withCORS(),
    withAuth({ required: true }),
    withRateLimit({ windowMs: 60 * 1000, maxRequests: 200 }), // 200 requests per minute for authenticated users
    withLogging()
  ),

  /**
   * Admin-only API endpoints
   */
  admin: compose(
    withSecurityHeaders(),
    withCORS(),
    withAuth({ required: true, roles: ['admin', 'super_admin'] }),
    withRateLimit({ windowMs: 60 * 1000, maxRequests: 500 }), // 500 requests per minute for admins
    withLogging({ includeBody: true, includeHeaders: true })
  ),

  /**
   * Development middleware (more permissive)
   */
  development: compose(
    withCORS({ origins: ['*'] }),
    withRateLimit({ windowMs: 60 * 1000, maxRequests: 1000 }),
    withLogging({ includeBody: true })
  ),
} as const;
