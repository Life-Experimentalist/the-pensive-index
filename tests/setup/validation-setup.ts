import { expect } from 'vitest';

// Performance assertion helpers for <100ms validation target
const PERFORMANCE_TARGET_MS = 100;
const VALIDATION_TIMEOUT_MS = 200;

// Type for custom matcher results
interface MatcherResult {
  pass: boolean;
  message: () => string;
}

// Custom matchers for validation engine testing
interface CustomMatchers<R = unknown> {
  toExecuteWithinTarget(): R;
  toValidateWithinTimeout(): R;
  toHaveValidationError(expectedError: string): R;
  toBeValidRule(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Performance matcher: ensures validation executes within 100ms target
expect.extend({
  toExecuteWithinTarget(received: () => Promise<any> | any): MatcherResult {
    const start = performance.now();

    const result = typeof received === 'function' ? received() : received;

    if (result instanceof Promise) {
      return {
        pass: false,
        message: () =>
          'toExecuteWithinTarget cannot be used with async functions. Use await first.',
      };
    }

    const duration = performance.now() - start;
    const pass = duration <= PERFORMANCE_TARGET_MS;

    return {
      pass,
      message: () =>
        pass
          ? `Expected validation to take more than ${PERFORMANCE_TARGET_MS}ms, but it took ${duration.toFixed(
              2
            )}ms`
          : `Expected validation to complete within ${PERFORMANCE_TARGET_MS}ms, but it took ${duration.toFixed(
              2
            )}ms`,
    };
  },

  async toValidateWithinTimeout(
    received: () => Promise<any>
  ): Promise<MatcherResult> {
    const start = performance.now();

    try {
      await Promise.race([
        received(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Validation timeout')),
            VALIDATION_TIMEOUT_MS
          )
        ),
      ]);

      const duration = performance.now() - start;
      const pass = duration <= VALIDATION_TIMEOUT_MS;

      return {
        pass,
        message: () =>
          pass
            ? `Expected validation to take more than ${VALIDATION_TIMEOUT_MS}ms, but it took ${duration.toFixed(
                2
              )}ms`
            : `Expected validation to complete within ${VALIDATION_TIMEOUT_MS}ms, but it took ${duration.toFixed(
                2
              )}ms`,
      };
    } catch (error: any) {
      if (error.message === 'Validation timeout') {
        return {
          pass: false,
          message: () =>
            `Validation failed to complete within ${VALIDATION_TIMEOUT_MS}ms timeout`,
        };
      }
      throw error;
    }
  },

  toHaveValidationError(received: any, expectedError: string): MatcherResult {
    const hasError = received && received.errors && received.errors.length > 0;
    const hasExpectedError =
      hasError &&
      received.errors.some(
        (error: any) => error.message && error.message.includes(expectedError)
      );

    return {
      pass: hasExpectedError,
      message: () =>
        hasExpectedError
          ? `Expected validation not to have error "${expectedError}"`
          : `Expected validation to have error "${expectedError}", but got: ${
              hasError
                ? received.errors.map((e: any) => e.message).join(', ')
                : 'no errors'
            }`,
    };
  },

  toBeValidRule(received: any): MatcherResult {
    const isValid =
      received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      Array.isArray(received.conditions) &&
      Array.isArray(received.actions) &&
      typeof received.isActive === 'boolean';

    return {
      pass: isValid,
      message: () =>
        isValid
          ? 'Expected object not to be a valid rule'
          : 'Expected object to be a valid rule with id, name, conditions, actions, and isActive properties',
    };
  },
});

// Global test helpers - using proper global declaration
declare global {
  var PERFORMANCE_TARGET_MS: number;
  var VALIDATION_TIMEOUT_MS: number;
}

globalThis.PERFORMANCE_TARGET_MS = PERFORMANCE_TARGET_MS;
globalThis.VALIDATION_TIMEOUT_MS = VALIDATION_TIMEOUT_MS;

// Mock performance.now for consistent testing
global.performance = global.performance || {
  now: () => Date.now(),
};

// Setup test database and cleanup
export const setupValidationTests = async () => {
  // Initialize test database schema
  // This will be implemented when we create the database schema
};

export const cleanupValidationTests = async () => {
  // Clean up test database
  // This will be implemented when we create the database schema
};
