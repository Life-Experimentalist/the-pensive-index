/**
 * Comprehensive error handling system for The Pensieve Index
 * Provides error classification, logging, and recovery mechanisms
 */

export enum ErrorType {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SCHEMA_VALIDATION_ERROR = 'SCHEMA_VALIDATION_ERROR',
  TYPE_ERROR = 'TYPE_ERROR',

  // Authentication errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',
  DATABASE_TIMEOUT_ERROR = 'DATABASE_TIMEOUT_ERROR',

  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',

  // Client errors
  BAD_REQUEST = 'BAD_REQUEST',
  MALFORMED_REQUEST = 'MALFORMED_REQUEST',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  resource?: string;
  timestamp?: Date;
  userAgent?: string;
  ip?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorDetails {
  type: ErrorType;
  code: string;
  message: string;
  severity: ErrorSeverity;
  isRetryable: boolean;
  context?: ErrorContext;
  cause?: Error;
  suggestions?: string[];
  documentation?: string;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly isRetryable: boolean;
  public readonly context?: ErrorContext;
  public readonly suggestions?: string[];
  public readonly documentation?: string;
  public readonly timestamp: Date;
  public readonly originalCause?: Error;

  constructor(details: ErrorDetails) {
    super(details.message);

    this.name = 'AppError';
    this.type = details.type;
    this.code = details.code;
    this.severity = details.severity;
    this.isRetryable = details.isRetryable;
    this.context = details.context;
    this.suggestions = details.suggestions;
    this.documentation = details.documentation;
    this.timestamp = new Date();

    if (details.cause) {
      this.originalCause = details.cause;
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to API response format
   */
  toAPIResponse() {
    return {
      success: false,
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        severity: this.severity,
        suggestions: this.suggestions,
        documentation: this.documentation,
      },
      timestamp: this.timestamp.toISOString(),
      context: this.context
        ? {
            requestId: this.context.requestId,
            operation: this.context.operation,
            resource: this.context.resource,
          }
        : undefined,
    };
  }

  /**
   * Get HTTP status code for this error type
   */
  getHTTPStatus(): number {
    switch (this.type) {
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.SCHEMA_VALIDATION_ERROR:
      case ErrorType.TYPE_ERROR:
      case ErrorType.BAD_REQUEST:
      case ErrorType.MALFORMED_REQUEST:
        return 400;

      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.TOKEN_EXPIRED:
      case ErrorType.INVALID_CREDENTIALS:
        return 401;

      case ErrorType.AUTHORIZATION_ERROR:
        return 403;

      case ErrorType.RESOURCE_NOT_FOUND:
        return 404;

      case ErrorType.RESOURCE_CONFLICT:
      case ErrorType.RESOURCE_ALREADY_EXISTS:
      case ErrorType.BUSINESS_RULE_VIOLATION:
      case ErrorType.INVALID_STATE:
        return 409;

      case ErrorType.UNSUPPORTED_MEDIA_TYPE:
        return 415;

      case ErrorType.RATE_LIMIT_EXCEEDED:
        return 429;

      case ErrorType.INTERNAL_SERVER_ERROR:
      case ErrorType.CONFIGURATION_ERROR:
      case ErrorType.MEMORY_ERROR:
        return 500;

      case ErrorType.OPERATION_NOT_ALLOWED:
        return 501;

      case ErrorType.DATABASE_CONNECTION_ERROR:
      case ErrorType.DATABASE_TIMEOUT_ERROR:
      case ErrorType.EXTERNAL_SERVICE_ERROR:
      case ErrorType.SERVICE_UNAVAILABLE:
        return 503;

      default:
        return 500;
    }
  }
}

/**
 * Specific error classes for different error categories
 */

export class ValidationError extends AppError {
  constructor(
    message: string,
    field?: string,
    value?: any,
    context?: ErrorContext
  ) {
    super({
      type: ErrorType.VALIDATION_ERROR,
      code: 'VALIDATION_FAILED',
      message,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
      context: {
        ...context,
        additionalData: { field, value },
      },
      suggestions: ['Check the request format and try again'],
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    context?: ErrorContext
  ) {
    super({
      type: ErrorType.AUTHENTICATION_ERROR,
      code: 'AUTH_FAILED',
      message,
      severity: ErrorSeverity.HIGH,
      isRetryable: false,
      context,
      suggestions: ['Provide valid authentication credentials'],
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    requiredRole?: string,
    context?: ErrorContext
  ) {
    super({
      type: ErrorType.AUTHORIZATION_ERROR,
      code: 'ACCESS_DENIED',
      message,
      severity: ErrorSeverity.HIGH,
      isRetryable: false,
      context: {
        ...context,
        additionalData: { requiredRole },
      },
      suggestions: ['Contact an administrator for access'],
    });
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    operation?: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    super({
      type: ErrorType.DATABASE_QUERY_ERROR,
      code: 'DB_OPERATION_FAILED',
      message,
      severity: ErrorSeverity.HIGH,
      isRetryable: true,
      context: {
        ...context,
        operation,
      },
      cause,
      suggestions: [
        'Try again later',
        'Contact support if the problem persists',
      ],
    });
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(resource: string, identifier?: string, context?: ErrorContext) {
    super({
      type: ErrorType.RESOURCE_NOT_FOUND,
      code: 'RESOURCE_NOT_FOUND',
      message: `${resource} not found${identifier ? `: ${identifier}` : ''}`,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
      context: {
        ...context,
        resource,
        additionalData: { identifier },
      },
      suggestions: ['Check the resource identifier and try again'],
    });
  }
}

export class BusinessRuleViolationError extends AppError {
  constructor(rule: string, details?: string, context?: ErrorContext) {
    super({
      type: ErrorType.BUSINESS_RULE_VIOLATION,
      code: 'BUSINESS_RULE_VIOLATION',
      message: `Business rule violation: ${rule}${
        details ? ` - ${details}` : ''
      }`,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
      context,
      suggestions: ['Review the business rules and adjust your request'],
    });
  }
}

export class RateLimitError extends AppError {
  constructor(
    limit: number,
    window: string,
    resetTime?: Date,
    context?: ErrorContext
  ) {
    super({
      type: ErrorType.RATE_LIMIT_EXCEEDED,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded: ${limit} requests per ${window}`,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: true,
      context: {
        ...context,
        additionalData: { limit, window, resetTime },
      },
      suggestions: [
        `Wait until ${
          resetTime?.toISOString() || 'rate limit resets'
        } before retrying`,
      ],
    });
  }
}

/**
 * Error factory for creating specific error types
 */
export class ErrorFactory {
  static validation(
    message: string,
    field?: string,
    value?: any,
    context?: ErrorContext
  ): ValidationError {
    return new ValidationError(message, field, value, context);
  }

  static authentication(
    message?: string,
    context?: ErrorContext
  ): AuthenticationError {
    return new AuthenticationError(message, context);
  }

  static authorization(
    message?: string,
    requiredRole?: string,
    context?: ErrorContext
  ): AuthorizationError {
    return new AuthorizationError(message, requiredRole, context);
  }

  static database(
    message: string,
    operation?: string,
    cause?: Error,
    context?: ErrorContext
  ): DatabaseError {
    return new DatabaseError(message, operation, cause, context);
  }

  static notFound(
    resource: string,
    identifier?: string,
    context?: ErrorContext
  ): ResourceNotFoundError {
    return new ResourceNotFoundError(resource, identifier, context);
  }

  static businessRule(
    rule: string,
    details?: string,
    context?: ErrorContext
  ): BusinessRuleViolationError {
    return new BusinessRuleViolationError(rule, details, context);
  }

  static rateLimit(
    limit: number,
    window: string,
    resetTime?: Date,
    context?: ErrorContext
  ): RateLimitError {
    return new RateLimitError(limit, window, resetTime, context);
  }

  static unauthorized(
    message: string = 'Unauthorized access',
    context?: ErrorContext
  ): AuthenticationError {
    return new AuthenticationError(message, context);
  }

  static forbidden(
    message: string = 'Forbidden access',
    context?: ErrorContext
  ): AuthorizationError {
    return new AuthorizationError(message, undefined, context);
  }

  static internal(
    message: string = 'Internal server error',
    cause?: Error,
    context?: ErrorContext
  ): AppError {
    return new AppError({
      type: ErrorType.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message,
      severity: ErrorSeverity.CRITICAL,
      isRetryable: true,
      context,
      cause,
      suggestions: [
        'Try again later',
        'Contact support if the problem persists',
      ],
    });
  }
}

/**
 * Error logger interface
 */
export interface ErrorLogger {
  log(error: AppError): void;
  logUnhandled(error: Error, context?: ErrorContext): void;
}

/**
 * Console error logger implementation
 */
export class ConsoleErrorLogger implements ErrorLogger {
  log(error: AppError): void {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      stack: error.stack,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('[ERROR]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[WARN]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.LOW:
        console.info('[INFO]', JSON.stringify(logData, null, 2));
        break;
    }
  }

  logUnhandled(error: Error, context?: ErrorContext): void {
    const logData = {
      timestamp: new Date().toISOString(),
      type: 'UNHANDLED_ERROR',
      message: error.message,
      severity: ErrorSeverity.CRITICAL,
      context,
      stack: error.stack,
    };

    console.error('[UNHANDLED ERROR]', JSON.stringify(logData, null, 2));
  }
}

/**
 * Global error handler
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: ErrorLogger;

  private constructor(logger: ErrorLogger = new ConsoleErrorLogger()) {
    this.logger = logger;
  }

  static getInstance(logger?: ErrorLogger): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(logger);
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle application errors
   */
  handle(error: AppError): void {
    this.logger.log(error);

    // Additional handling based on severity
    if (error.severity === ErrorSeverity.CRITICAL) {
      // In production, this might trigger alerts, notifications, etc.
      console.error('CRITICAL ERROR DETECTED:', error.message);
    }
  }

  /**
   * Handle unknown errors
   */
  handleUnknown(error: Error, context?: ErrorContext): AppError {
    this.logger.logUnhandled(error, context);

    // Convert to AppError
    const appError = ErrorFactory.internal(
      `Unhandled error: ${error.message}`,
      error,
      context
    );

    this.handle(appError);
    return appError;
  }

  /**
   * Wrap async functions with error handling
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: Partial<ErrorContext>
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (error instanceof AppError) {
          // Create new error with merged context if provided
          if (context) {
            const mergedContext = { ...error.context, ...context };
            const newError = new AppError({
              type: error.type,
              code: error.code,
              message: error.message,
              severity: error.severity,
              isRetryable: error.isRetryable,
              context: mergedContext,
              suggestions: error.suggestions,
              documentation: error.documentation,
              cause: error.originalCause,
            });
            this.handle(newError);
            throw newError;
          }
          this.handle(error);
          throw error;
        }

        // Convert unknown errors
        const appError = this.handleUnknown(
          error as Error,
          context as ErrorContext
        );
        throw appError;
      }
    }) as T;
  }
}

/**
 * Utility functions for error handling
 */
export const ErrorUtils = {
  /**
   * Check if an error is retryable
   */
  isRetryable(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.isRetryable;
    }
    return false;
  },

  /**
   * Get error severity
   */
  getSeverity(error: unknown): ErrorSeverity {
    if (error instanceof AppError) {
      return error.severity;
    }
    return ErrorSeverity.HIGH;
  },

  /**
   * Extract error message
   */
  getMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  },

  /**
   * Create error context from request
   */
  createContext(
    request?: Request,
    additionalData?: Record<string, any>
  ): ErrorContext {
    return {
      timestamp: new Date(),
      userAgent: request?.headers.get('user-agent') || undefined,
      additionalData,
    };
  },
} as const;
