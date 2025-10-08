/**
 * Rate Limiter Durable Object
 * Feature: 003-optimize-the-platform
 *
 * Implements sliding window rate limiting with Cloudflare Durable Objects
 *
 * Rate limits:
 * - Anonymous: 60 requests/minute
 * - Authenticated: 120 requests/minute
 * - Admin: Unlimited
 *
 * Features:
 * - Sliding window algorithm (1-minute buckets)
 * - Whitelist support for trusted IPs
 * - Violation logging to D1
 * - Retry-After header calculation
 */

import type { UserType } from '@/types/performance';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  anonymous: number; // Requests per minute
  authenticated: number; // Requests per minute
  admin: number; // Requests per minute (set to 0 for unlimited)
}

/**
 * Rate limit state for a single identifier
 */
interface RateLimitState {
  identifier: string;
  userType: UserType;
  buckets: Map<number, number>; // Timestamp (minute) -> request count
  totalRequests: number;
  firstRequestAt: number; // Unix timestamp
  lastRequestAt: number; // Unix timestamp
}

/**
 * Rate limit check result
 */
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  retryAfter?: number; // Seconds to wait
}

/**
 * Default rate limits
 */
const DEFAULT_LIMITS: RateLimitConfig = {
  anonymous: 60,
  authenticated: 120,
  admin: 0, // Unlimited
};

/**
 * Whitelist of IPs that bypass rate limiting
 */
const WHITELISTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  // Add production IPs here
]);

/**
 * Rate Limiter Durable Object
 *
 * Each instance manages rate limiting for a single identifier (IP or user ID)
 * Uses sliding window algorithm with 1-minute buckets
 */
export class RateLimiter implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private rateLimitState: RateLimitState | null = null;
  private config: RateLimitConfig = DEFAULT_LIMITS;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handle incoming fetch requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route requests
    if (path === '/check' && request.method === 'POST') {
      return this.handleCheck(request);
    }

    if (path === '/reset' && request.method === 'POST') {
      return this.handleReset();
    }

    if (path === '/stats' && request.method === 'GET') {
      return this.handleStats();
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Check if request is allowed
   */
  private async handleCheck(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        identifier: string;
        userType: UserType;
        ip?: string;
      };

      // Check whitelist
      if (body.ip && WHITELISTED_IPS.has(body.ip)) {
        return Response.json({
          allowed: true,
          remaining: 999999,
          resetAt: Date.now() + 60000,
        } as RateLimitResult);
      }

      // Admin bypass
      if (body.userType === 'ADMIN') {
        return Response.json({
          allowed: true,
          remaining: 999999,
          resetAt: Date.now() + 60000,
        } as RateLimitResult);
      }

      // Load state
      await this.loadState(body.identifier, body.userType);

      // Check rate limit
      const result = this.checkRateLimit(body.userType);

      // If allowed, increment counter
      if (result.allowed) {
        this.incrementCounter();
        await this.saveState();
      } else {
        // Log violation
        await this.logViolation(body.identifier, body.userType, body.ip);
      }

      return Response.json(result);
    } catch (error) {
      console.error('[RateLimiter] Error checking rate limit:', error);
      return Response.json({ error: 'Internal error' }, { status: 500 });
    }
  }

  /**
   * Reset rate limit state
   */
  private async handleReset(): Promise<Response> {
    this.rateLimitState = null;
    await this.state.storage.deleteAll();
    return Response.json({ success: true });
  }

  /**
   * Get current stats
   */
  private async handleStats(): Promise<Response> {
    if (!this.rateLimitState) {
      await this.loadStateFromStorage();
    }

    if (!this.rateLimitState) {
      return Response.json({
        identifier: 'unknown',
        totalRequests: 0,
        currentWindow: 0,
      });
    }

    const currentMinute = this.getCurrentMinute();
    const currentWindow = this.countRequestsInWindow(currentMinute);

    return Response.json({
      identifier: this.rateLimitState.identifier,
      userType: this.rateLimitState.userType,
      totalRequests: this.rateLimitState.totalRequests,
      currentWindow,
      buckets: Array.from(this.rateLimitState.buckets.entries()),
    });
  }

  // =============================================================================
  // RATE LIMITING LOGIC
  // =============================================================================

  /**
   * Check if request should be allowed
   */
  private checkRateLimit(userType: UserType): RateLimitResult {
    const limit = this.getLimit(userType);

    // Admin unlimited
    if (limit === 0) {
      return {
        allowed: true,
        remaining: 999999,
        resetAt: Date.now() + 60000,
      };
    }

    const currentMinute = this.getCurrentMinute();
    const requestsInWindow = this.countRequestsInWindow(currentMinute);

    const allowed = requestsInWindow < limit;
    const remaining = Math.max(0, limit - requestsInWindow);
    const resetAt = (currentMinute + 1) * 60000; // Next minute

    const result: RateLimitResult = {
      allowed,
      remaining,
      resetAt,
    };

    if (!allowed) {
      // Calculate retry-after in seconds
      const now = Date.now();
      result.retryAfter = Math.ceil((resetAt - now) / 1000);
    }

    return result;
  }

  /**
   * Increment request counter for current minute
   */
  private incrementCounter(): void {
    if (!this.rateLimitState) {
      return;
    }

    const currentMinute = this.getCurrentMinute();
    const count = this.rateLimitState.buckets.get(currentMinute) || 0;
    this.rateLimitState.buckets.set(currentMinute, count + 1);
    this.rateLimitState.totalRequests++;
    this.rateLimitState.lastRequestAt = Date.now();

    // Cleanup old buckets (keep only last 2 minutes)
    for (const [minute] of this.rateLimitState.buckets) {
      if (minute < currentMinute - 1) {
        this.rateLimitState.buckets.delete(minute);
      }
    }
  }

  /**
   * Count requests in current sliding window
   */
  private countRequestsInWindow(currentMinute: number): number {
    if (!this.rateLimitState) {
      return 0;
    }

    // Sliding window: current minute + previous minute (weighted)
    const now = Date.now();
    const currentMinuteStart = currentMinute * 60000;
    const elapsedInCurrentMinute = now - currentMinuteStart;
    const percentageOfCurrentMinute = elapsedInCurrentMinute / 60000;

    const currentCount = this.rateLimitState.buckets.get(currentMinute) || 0;
    const previousCount =
      this.rateLimitState.buckets.get(currentMinute - 1) || 0;

    // Weighted sliding window
    const weightedPreviousCount =
      previousCount * (1 - percentageOfCurrentMinute);

    return Math.floor(currentCount + weightedPreviousCount);
  }

  /**
   * Get rate limit for user type
   */
  private getLimit(userType: UserType): number {
    switch (userType) {
      case 'ANONYMOUS':
        return this.config.anonymous;
      case 'AUTHENTICATED':
        return this.config.authenticated;
      case 'ADMIN':
        return this.config.admin;
      default:
        return this.config.anonymous;
    }
  }

  /**
   * Get current minute timestamp
   */
  private getCurrentMinute(): number {
    return Math.floor(Date.now() / 60000);
  }

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================

  /**
   * Load state from storage or create new
   */
  private async loadState(
    identifier: string,
    userType: UserType
  ): Promise<void> {
    if (this.rateLimitState?.identifier === identifier) {
      return; // Already loaded
    }

    await this.loadStateFromStorage();

    if (!this.rateLimitState || this.rateLimitState.identifier !== identifier) {
      // Create new state
      this.rateLimitState = {
        identifier,
        userType,
        buckets: new Map(),
        totalRequests: 0,
        firstRequestAt: Date.now(),
        lastRequestAt: Date.now(),
      };
    }
  }

  /**
   * Load state from Durable Object storage
   */
  private async loadStateFromStorage(): Promise<void> {
    const stored = await this.state.storage.get<{
      identifier: string;
      userType: UserType;
      buckets: Array<[number, number]>;
      totalRequests: number;
      firstRequestAt: number;
      lastRequestAt: number;
    }>('state');

    if (stored) {
      this.rateLimitState = {
        ...stored,
        buckets: new Map(stored.buckets),
      };
    }
  }

  /**
   * Save state to Durable Object storage
   */
  private async saveState(): Promise<void> {
    if (!this.rateLimitState) {
      return;
    }

    await this.state.storage.put('state', {
      identifier: this.rateLimitState.identifier,
      userType: this.rateLimitState.userType,
      buckets: Array.from(this.rateLimitState.buckets.entries()),
      totalRequests: this.rateLimitState.totalRequests,
      firstRequestAt: this.rateLimitState.firstRequestAt,
      lastRequestAt: this.rateLimitState.lastRequestAt,
    });
  }

  // =============================================================================
  // VIOLATION LOGGING
  // =============================================================================

  /**
   * Log rate limit violation to D1
   */
  private async logViolation(
    identifier: string,
    userType: UserType,
    ip?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO rate_limit_violations (
          timestamp,
          identifier,
          user_type,
          ip_address,
          endpoint,
          limit_type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      await this.env.DB.prepare(query)
        .bind(
          Date.now(),
          identifier,
          userType,
          ip || null,
          'api', // Could be enhanced to include actual endpoint
          'per_minute'
        )
        .run();
    } catch (error) {
      console.error('[RateLimiter] Error logging violation:', error);
      // Don't throw - logging failure shouldn't block the response
    }
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface DurableObject {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteAll(): Promise<void>;
  list(): Promise<Map<string, unknown>>;
}

interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
}

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
}

interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
  error?: string;
}

interface KVNamespace {
  get<T>(key: string, options?: { type: 'json' }): Promise<T | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}
