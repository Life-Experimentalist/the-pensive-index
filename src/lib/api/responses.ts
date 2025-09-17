import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API response formatting utilities for The Pensieve Index
 * Provides consistent response structures and error handling
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Response handler class for creating consistent API responses
 */
export class ResponseHandler {
  /**
   * Create a successful response
   */
  static success<T>(
    data: T,
    options: {
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages?: number;
      };
      metadata?: Record<string, any>;
      status?: number;
    } = {}
  ): NextResponse {
    const { pagination, metadata, status = 200 } = options;

    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
    };

    if (pagination) {
      response.pagination = {
        ...pagination,
        totalPages:
          pagination.totalPages ||
          Math.ceil(pagination.total / pagination.limit),
      };
    }

    if (metadata) {
      response.metadata = metadata;
    }

    return NextResponse.json(response, { status });
  }

  /**
   * Create an error response
   */
  static error(
    code: string,
    message: string,
    options: {
      details?: any;
      status?: number;
    } = {}
  ): NextResponse {
    const { details, status = 500 } = options;

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status });
  }

  /**
   * Handle validation errors from Zod
   */
  static validationError(error: z.ZodError): NextResponse {
    return this.error('VALIDATION_ERROR', 'Request validation failed', {
      details: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
      status: 400,
    });
  }

  /**
   * Handle not found errors
   */
  static notFound(resource: string = 'Resource'): NextResponse {
    return this.error('NOT_FOUND', `${resource} not found`, { status: 404 });
  }

  /**
   * Handle unauthorized errors
   */
  static unauthorized(message: string = 'Unauthorized access'): NextResponse {
    return this.error('UNAUTHORIZED', message, { status: 401 });
  }

  /**
   * Handle forbidden errors
   */
  static forbidden(message: string = 'Access forbidden'): NextResponse {
    return this.error('FORBIDDEN', message, { status: 403 });
  }

  /**
   * Handle internal server errors
   */
  static internalError(
    message: string = 'Internal server error',
    details?: any
  ): NextResponse {
    return this.error('INTERNAL_ERROR', message, { details, status: 500 });
  }

  /**
   * Handle method not allowed errors
   */
  static methodNotAllowed(allowedMethods: string[] = []): NextResponse {
    return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', {
      details: { allowed_methods: allowedMethods },
      status: 405,
    });
  }

  /**
   * Handle rate limit errors
   */
  static rateLimitExceeded(resetTime?: Date): NextResponse {
    return this.error('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', {
      details: resetTime ? { reset_time: resetTime.toISOString() } : undefined,
      status: 429,
    });
  }

  /**
   * Handle database connection errors
   */
  static databaseError(operation: string = 'Database operation'): NextResponse {
    return this.error('DATABASE_ERROR', `${operation} failed`, { status: 503 });
  }

  /**
   * Handle paginated responses
   */
  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    metadata?: Record<string, any>
  ): NextResponse {
    return this.success(data, {
      pagination,
      metadata,
    });
  }

  /**
   * Handle search responses with metadata
   */
  static searchResults<T>(
    data: T[],
    searchMetadata: {
      query: string;
      total_matches: number;
      execution_time?: number;
      filters_applied?: any;
    },
    pagination?: {
      page: number;
      limit: number;
      total: number;
    }
  ): NextResponse {
    return this.success(data, {
      pagination,
      metadata: {
        search: searchMetadata,
      },
    });
  }

  /**
   * Handle validation results
   */
  static validationResult(
    isValid: boolean,
    errors: any[] = [],
    warnings: any[] = [],
    suggestions: any[] = []
  ): NextResponse {
    const data = {
      is_valid: isValid,
      errors,
      warnings,
      suggestions,
    };

    const status = isValid ? 200 : 400;

    return this.success(data, { status });
  }

  /**
   * Handle health check responses
   */
  static healthCheck(
    status: 'healthy' | 'degraded' | 'unhealthy',
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message?: string;
    }>,
    metadata?: Record<string, any>
  ): NextResponse {
    const httpStatus =
      status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    const data = {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };

    return this.success(data, {
      status: httpStatus,
      metadata,
    });
  }
}

/**
 * Error handling middleware wrapper
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof z.ZodError) {
        return ResponseHandler.validationError(error);
      }

      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('not found')) {
          return ResponseHandler.notFound();
        }

        if (error.message.includes('unauthorized')) {
          return ResponseHandler.unauthorized();
        }

        if (error.message.includes('forbidden')) {
          return ResponseHandler.forbidden();
        }

        // Generic error handling
        return ResponseHandler.internalError(
          'An unexpected error occurred',
          process.env.NODE_ENV === 'development' ? error.message : undefined
        );
      }

      return ResponseHandler.internalError();
    }
  };
}

/**
 * Request validation wrapper
 */
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (
    handler: (validatedData: T, ...args: any[]) => Promise<NextResponse>
  ) => {
    return async (request: Request, ...args: any[]): Promise<NextResponse> => {
      try {
        const body = await request.json();
        const validatedData = schema.parse(body);
        return await handler(validatedData, ...args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseHandler.validationError(error);
        }
        throw error;
      }
    };
  };
}

/**
 * Authentication wrapper (placeholder)
 */
export function withAuth(requiredRole?: string) {
  return (handler: (...args: any[]) => Promise<NextResponse>) => {
    return async (...args: any[]): Promise<NextResponse> => {
      // TODO: Implement actual authentication logic
      // For now, return unauthorized for any protected route
      if (requiredRole) {
        return ResponseHandler.unauthorized('Authentication required');
      }
      return await handler(...args);
    };
  };
}

/**
 * Type-safe response helpers for specific data types
 */
export const ResponseHelpers = {
  fandom: (data: any) => ResponseHandler.success(data),
  tag: (data: any) => ResponseHandler.success(data),
  plotBlock: (data: any) => ResponseHandler.success(data),
  story: (data: any) => ResponseHandler.success(data),

  fandoms: (data: any[], pagination?: any) =>
    ResponseHandler.paginated(data, pagination),
  tags: (data: any[], pagination?: any) =>
    ResponseHandler.paginated(data, pagination),
  plotBlocks: (data: any[], pagination?: any) =>
    ResponseHandler.paginated(data, pagination),
  stories: (data: any[], pagination?: any) =>
    ResponseHandler.paginated(data, pagination),
} as const;
