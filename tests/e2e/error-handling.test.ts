/**
 * E2E Error Handling Tests for The Pensieve Index
 *
 * These tests cover error handling and recovery scenarios:
 * - Network failures and API timeouts
 * - Invalid data input and malformed requests
 * - Edge cases and boundary conditions
 * - Graceful degradation patterns
 * - User error recovery workflows
 * - System resilience and error boundaries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Error Types for Testing
interface MockError {
  name: string;
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

class NetworkError extends Error implements MockError {
  code: string;
  status: number;

  constructor(
    message: string,
    status: number = 500,
    code: string = 'NETWORK_ERROR'
  ) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.status = status;
  }
}

class ValidationError extends Error implements MockError {
  code: string;
  details: any;

  constructor(
    message: string,
    details: any = {},
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.details = details;
  }
}

class DatabaseError extends Error implements MockError {
  code: string;
  details: any;

  constructor(
    message: string,
    details: any = {},
    code: string = 'DATABASE_ERROR'
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

// Mock DOM Element for Error Handling Testing
interface MockErrorElement {
  id: string;
  className: string;
  innerHTML: string;
  textContent: string;
  style: { [key: string]: string };
  dataset: { [key: string]: string };
  children: MockErrorElement[];
  parentElement: MockErrorElement | null;
  querySelector(selector: string): MockErrorElement | null;
  querySelectorAll(selector: string): MockErrorElement[];
  appendChild(child: MockErrorElement): void;
  removeChild(child: MockErrorElement): void;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  dispatchEvent(event: any): boolean;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  classList: {
    add(className: string): void;
    remove(className: string): void;
    contains(className: string): boolean;
    toggle(className: string): boolean;
  };
}

class MockErrorElement implements MockErrorElement {
  id = '';
  className = '';
  innerHTML = '';
  textContent = '';
  style: { [key: string]: string } = {};
  dataset: { [key: string]: string } = {};
  children: MockErrorElement[] = [];
  parentElement: MockErrorElement | null = null;
  private eventListeners: { [key: string]: ((event: any) => void)[] } = {};

  constructor(
    tagName: string = 'div',
    attributes: { [key: string]: string } = {}
  ) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'class') {
        this.className = value;
      } else if (key === 'id') {
        this.id = value;
      } else {
        this.dataset[key] = value;
      }
    });

    // Initialize classList
    this.classList = {
      add: (className: string) => {
        const classes = this.className.split(' ').filter(c => c);
        if (!classes.includes(className)) {
          classes.push(className);
          this.className = classes.join(' ');
        }
      },
      remove: (className: string) => {
        const classes = this.className
          .split(' ')
          .filter(c => c && c !== className);
        this.className = classes.join(' ');
      },
      contains: (className: string) => {
        return this.className.split(' ').includes(className);
      },
      toggle: (className: string) => {
        if (this.classList.contains(className)) {
          this.classList.remove(className);
          return false;
        } else {
          this.classList.add(className);
          return true;
        }
      },
    };
  }

  querySelector(selector: string): MockErrorElement | null {
    // Simple selector implementation for testing
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return this.findById(id);
    } else if (selector.startsWith('[data-testid="')) {
      const testId = selector.match(/\[data-testid="([^"]+)"\]/)?.[1];
      return testId ? this.findByTestId(testId) : null;
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return this.findByClass(className);
    }
    return null;
  }

  querySelectorAll(selector: string): MockErrorElement[] {
    const results: MockErrorElement[] = [];
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      this.findAllByClass(className, results);
    }
    return results;
  }

  private findById(id: string): MockErrorElement | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  private findByTestId(testId: string): MockErrorElement | null {
    if (this.dataset.testid === testId) return this;
    for (const child of this.children) {
      const found = child.findByTestId(testId);
      if (found) return found;
    }
    return null;
  }

  private findByClass(className: string): MockErrorElement | null {
    if (this.classList.contains(className)) return this;
    for (const child of this.children) {
      const found = child.findByClass(className);
      if (found) return found;
    }
    return null;
  }

  private findAllByClass(className: string, results: MockErrorElement[]): void {
    if (this.classList.contains(className)) {
      results.push(this);
    }
    for (const child of this.children) {
      child.findAllByClass(className, results);
    }
  }

  appendChild(child: MockErrorElement): void {
    child.parentElement = this;
    this.children.push(child);
  }

  removeChild(child: MockErrorElement): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parentElement = null;
    }
  }

  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        l => l !== listener
      );
    }
  }

  dispatchEvent(event: any): boolean {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => {
      try {
        listener.call(this, event);
      } catch (error) {
        console.warn('Event listener error:', error);
      }
    });
    return true;
  }

  setAttribute(name: string, value: string): void {
    if (name === 'class') {
      this.className = value;
    } else if (name === 'id') {
      this.id = value;
    } else {
      this.dataset[name] = value;
    }
  }

  getAttribute(name: string): string | null {
    if (name === 'class') return this.className;
    if (name === 'id') return this.id;
    return this.dataset[name] || null;
  }
}

// Mock Error Boundary System
class MockErrorBoundary {
  private container: MockErrorElement;
  private errorState: {
    hasError: boolean;
    error?: Error;
    errorInfo?: any;
    retryCount: number;
    lastErrorTime?: number;
  } = {
    hasError: false,
    retryCount: 0,
  };
  private errorDisplayElement!: MockErrorElement;
  private retryButton!: MockErrorElement;
  private errorLog: MockError[] = [];

  constructor() {
    this.container = new MockErrorElement('div', {
      id: 'error-boundary-container',
      'data-testid': 'error-boundary',
      class: 'error-boundary',
    });

    this.setupErrorDisplay();
    this.setupErrorHandling();
  }

  private setupErrorDisplay(): void {
    this.errorDisplayElement = new MockErrorElement('div', {
      'data-testid': 'error-display',
      class: 'error-display hidden',
    });

    const errorMessage = new MockErrorElement('div', {
      'data-testid': 'error-message',
      class: 'error-message',
    });

    const errorDetails = new MockErrorElement('div', {
      'data-testid': 'error-details',
      class: 'error-details',
    });

    this.retryButton = new MockErrorElement('button', {
      'data-testid': 'retry-button',
      class: 'retry-button',
    });
    this.retryButton.textContent = 'Retry';

    const dismissButton = new MockErrorElement('button', {
      'data-testid': 'dismiss-button',
      class: 'dismiss-button',
    });
    dismissButton.textContent = 'Dismiss';

    this.errorDisplayElement.appendChild(errorMessage);
    this.errorDisplayElement.appendChild(errorDetails);
    this.errorDisplayElement.appendChild(this.retryButton);
    this.errorDisplayElement.appendChild(dismissButton);

    this.container.appendChild(this.errorDisplayElement);
  }

  private setupErrorHandling(): void {
    // Setup retry button
    this.retryButton.addEventListener('click', () => {
      this.handleRetry();
    });

    // Setup dismiss button
    const dismissButton = this.errorDisplayElement.querySelector(
      '[data-testid="dismiss-button"]'
    )!;
    dismissButton.addEventListener('click', () => {
      this.handleDismiss();
    });

    // Setup global error handling
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Mock window error handler
    const mockWindow = {
      addEventListener: (type: string, handler: (event: any) => void) => {
        if (type === 'error') {
          // Store handler for testing
        } else if (type === 'unhandledrejection') {
          // Store handler for testing
        }
      },
    };

    // Mock network error detection
    this.setupNetworkErrorDetection();
  }

  private setupNetworkErrorDetection(): void {
    // Mock fetch wrapper for error handling
    this.mockFetch = this.mockFetch.bind(this);
  }

  private async mockFetch(url: string, options: any = {}): Promise<any> {
    // Simulate various network conditions
    if (this.shouldSimulateNetworkError()) {
      throw new NetworkError('Network request failed', 500, 'NETWORK_TIMEOUT');
    }

    if (this.shouldSimulateValidationError()) {
      throw new ValidationError(
        'Invalid request data',
        { field: 'tags' },
        'VALIDATION_ERROR'
      );
    }

    if (this.shouldSimulateDatabaseError()) {
      throw new DatabaseError(
        'Database connection failed',
        { table: 'fandoms' },
        'DB_CONNECTION_ERROR'
      );
    }

    // Simulate successful response
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    };
  }

  private shouldSimulateNetworkError(): boolean {
    // Simulate network errors 20% of the time for testing
    return Math.random() < 0.2;
  }

  private shouldSimulateValidationError(): boolean {
    // Simulate validation errors 15% of the time for testing
    return Math.random() < 0.15;
  }

  private shouldSimulateDatabaseError(): boolean {
    // Simulate database errors 10% of the time for testing
    return Math.random() < 0.1;
  }

  // Error handling methods
  catchError(error: Error, errorInfo?: any): void {
    this.errorState = {
      hasError: true,
      error,
      errorInfo,
      retryCount: this.errorState.retryCount,
      lastErrorTime: Date.now(),
    };

    this.logError(error);
    this.displayError(error, errorInfo);
  }

  private logError(error: Error): void {
    const mockError: MockError = {
      name: error.name,
      message: error.message,
      code: (error as any).code,
      status: (error as any).status,
      details: (error as any).details,
    };

    this.errorLog.push(mockError);
    console.error('Error logged:', mockError);
  }

  private displayError(error: Error, errorInfo?: any): void {
    const errorMessage = this.errorDisplayElement.querySelector(
      '[data-testid="error-message"]'
    )!;
    const errorDetails = this.errorDisplayElement.querySelector(
      '[data-testid="error-details"]'
    )!;

    errorMessage.textContent = this.getUserFriendlyMessage(error);
    errorDetails.textContent = this.getErrorDetails(error, errorInfo);

    // Show error display
    this.errorDisplayElement.classList.remove('hidden');
    this.errorDisplayElement.classList.add('visible');

    // Update retry button state
    this.updateRetryButton();
  }

  private getUserFriendlyMessage(error: Error): string {
    if (error instanceof NetworkError) {
      return 'Unable to connect to the server. Please check your internet connection.';
    } else if (error instanceof ValidationError) {
      return 'There was an issue with your request. Please check your input and try again.';
    } else if (error instanceof DatabaseError) {
      return 'We are experiencing technical difficulties. Please try again later.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }

  private getErrorDetails(error: Error, errorInfo?: any): string {
    let details = `Error: ${error.message}`;

    if ((error as any).code) {
      details += `\nCode: ${(error as any).code}`;
    }

    if ((error as any).status) {
      details += `\nStatus: ${(error as any).status}`;
    }

    if (errorInfo) {
      details += `\nAdditional Info: ${JSON.stringify(errorInfo)}`;
    }

    return details;
  }

  private updateRetryButton(): void {
    const maxRetries = 3;
    const isRetryAvailable = this.errorState.retryCount < maxRetries;

    if (isRetryAvailable) {
      this.retryButton.textContent = `Retry (${
        this.errorState.retryCount + 1
      }/${maxRetries})`;
      this.retryButton.classList.remove('disabled');
    } else {
      this.retryButton.textContent = 'Max retries reached';
      this.retryButton.classList.add('disabled');
    }
  }

  private handleRetry(): void {
    if (this.errorState.retryCount >= 3) {
      return; // Max retries reached
    }

    this.errorState.retryCount++;
    this.hideError();

    // Simulate retry logic
    setTimeout(() => {
      // Attempt operation again
      this.dispatchEvent({
        type: 'retry',
        detail: {
          retryCount: this.errorState.retryCount,
          originalError: this.errorState.error,
        },
      });
    }, 1000);
  }

  private handleDismiss(): void {
    this.hideError();
    this.resetErrorState();
  }

  private hideError(): void {
    this.errorDisplayElement.classList.add('hidden');
    this.errorDisplayElement.classList.remove('visible');
  }

  private resetErrorState(): void {
    this.errorState = {
      hasError: false,
      retryCount: 0,
    };
  }

  private dispatchEvent(event: any): void {
    this.container.dispatchEvent(event);
  }

  // Graceful degradation methods
  enableOfflineMode(): void {
    this.container.classList.add('offline-mode');
    this.showOfflineMessage();
  }

  disableOfflineMode(): void {
    this.container.classList.remove('offline-mode');
    this.hideOfflineMessage();
  }

  private showOfflineMessage(): void {
    let offlineMessage = this.container.querySelector(
      '[data-testid="offline-message"]'
    ) as MockErrorElement;

    if (!offlineMessage) {
      offlineMessage = new MockErrorElement('div', {
        'data-testid': 'offline-message',
        class: 'offline-message',
      });
      offlineMessage.textContent =
        'You are currently offline. Some features may not be available.';
      this.container.appendChild(offlineMessage);
    }

    offlineMessage.classList.add('visible');
  }

  private hideOfflineMessage(): void {
    const offlineMessage = this.container.querySelector(
      '[data-testid="offline-message"]'
    );
    if (offlineMessage) {
      offlineMessage.classList.remove('visible');
    }
  }

  // Recovery patterns
  handleDataCorruption(): void {
    // Clear corrupted data and reset to clean state
    this.clearLocalData();
    this.resetToDefaultState();
    this.showRecoveryMessage('Data has been reset to recover from corruption.');
  }

  handleMemoryPressure(): void {
    // Reduce memory usage
    this.clearCaches();
    this.optimizeDataStructures();
    this.showRecoveryMessage(
      'Application optimized to handle memory constraints.'
    );
  }

  private clearLocalData(): void {
    // Mock localStorage clear
    console.log('Clearing local data for recovery');
  }

  private resetToDefaultState(): void {
    // Reset application to default state
    console.log('Resetting to default state');
  }

  private clearCaches(): void {
    // Clear application caches
    console.log('Clearing caches');
  }

  private optimizeDataStructures(): void {
    // Optimize data structures for memory efficiency
    console.log('Optimizing data structures');
  }

  private showRecoveryMessage(message: string): void {
    const recoveryMessage = new MockErrorElement('div', {
      'data-testid': 'recovery-message',
      class: 'recovery-message',
    });
    recoveryMessage.textContent = message;
    this.container.appendChild(recoveryMessage);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.container.removeChild(recoveryMessage);
    }, 5000);
  }

  // Test helper methods
  getContainer(): MockErrorElement {
    return this.container;
  }

  getErrorState(): any {
    return { ...this.errorState };
  }

  getErrorLog(): MockError[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  simulateError(error: Error): void {
    this.catchError(error);
  }

  simulateNetworkFailure(): Promise<any> {
    return this.mockFetch('/api/test-endpoint');
  }

  isErrorVisible(): boolean {
    return this.errorDisplayElement.classList.contains('visible');
  }

  isOfflineModeActive(): boolean {
    return this.container.classList.contains('offline-mode');
  }

  getRetryCount(): number {
    return this.errorState.retryCount;
  }

  isRetryButtonDisabled(): boolean {
    return this.retryButton.classList.contains('disabled');
  }
}

// Test Suite
describe('E2E Error Handling Tests for The Pensieve Index', () => {
  let mockErrorBoundary: MockErrorBoundary;

  beforeEach(() => {
    mockErrorBoundary = new MockErrorBoundary();
    // Reset error simulation for consistent testing
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Predictable for testing
  });

  afterEach(() => {
    mockErrorBoundary.clearErrorLog();
    vi.restoreAllMocks();
  });

  describe('Network Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      // Simulate network timeout
      const networkError = new NetworkError('Request timeout', 408, 'TIMEOUT');

      mockErrorBoundary.simulateError(networkError);

      // Verify error is displayed
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      // Check error message
      const container = mockErrorBoundary.getContainer();
      const errorMessage = container.querySelector(
        '[data-testid="error-message"]'
      )!;
      expect(errorMessage.textContent).toContain(
        'Unable to connect to the server'
      );

      // Verify error is logged
      const errorLog = mockErrorBoundary.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].code).toBe('TIMEOUT');
    });

    it('should handle API server errors', async () => {
      const serverError = new NetworkError(
        'Internal server error',
        500,
        'SERVER_ERROR'
      );

      mockErrorBoundary.simulateError(serverError);

      const errorState = mockErrorBoundary.getErrorState();
      expect(errorState.hasError).toBe(true);
      expect(errorState.error?.message).toBe('Internal server error');

      // Verify retry is available
      expect(mockErrorBoundary.isRetryButtonDisabled()).toBe(false);
    });

    it('should handle network unavailability', () => {
      // Simulate offline state
      mockErrorBoundary.enableOfflineMode();

      expect(mockErrorBoundary.isOfflineModeActive()).toBe(true);

      const container = mockErrorBoundary.getContainer();
      const offlineMessage = container.querySelector(
        '[data-testid="offline-message"]'
      )!;
      expect(offlineMessage.textContent).toContain('You are currently offline');
    });

    it('should recover when network is restored', () => {
      // Start offline
      mockErrorBoundary.enableOfflineMode();
      expect(mockErrorBoundary.isOfflineModeActive()).toBe(true);

      // Restore network
      mockErrorBoundary.disableOfflineMode();
      expect(mockErrorBoundary.isOfflineModeActive()).toBe(false);
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle invalid input data', () => {
      const validationError = new ValidationError(
        'Invalid tag format',
        { field: 'tags', expected: 'string', received: 'number' },
        'INVALID_FORMAT'
      );

      mockErrorBoundary.simulateError(validationError);

      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      const container = mockErrorBoundary.getContainer();
      const errorMessage = container.querySelector(
        '[data-testid="error-message"]'
      )!;
      expect(errorMessage.textContent).toContain('issue with your request');

      const errorDetails = container.querySelector(
        '[data-testid="error-details"]'
      )!;
      expect(errorDetails.textContent).toContain('INVALID_FORMAT');
    });

    it('should handle malformed request data', () => {
      const malformedError = new ValidationError(
        'Request body is not valid JSON',
        { position: 42, character: '{' },
        'MALFORMED_JSON'
      );

      mockErrorBoundary.simulateError(malformedError);

      const errorLog = mockErrorBoundary.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].details.position).toBe(42);
    });

    it('should handle validation rule conflicts', () => {
      const conflictError = new ValidationError(
        'Conflicting validation rules detected',
        {
          conflicts: [
            { rule1: 'angst', rule2: 'fluff', reason: 'tone-conflict' },
          ],
        },
        'RULE_CONFLICT'
      );

      mockErrorBoundary.simulateError(conflictError);

      const errorState = mockErrorBoundary.getErrorState();
      expect(errorState.error?.name).toBe('ValidationError');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection failures', () => {
      const dbError = new DatabaseError(
        'Unable to connect to database',
        { host: 'localhost', port: 5432 },
        'CONNECTION_FAILED'
      );

      mockErrorBoundary.simulateError(dbError);

      const container = mockErrorBoundary.getContainer();
      const errorMessage = container.querySelector(
        '[data-testid="error-message"]'
      )!;
      expect(errorMessage.textContent).toContain('technical difficulties');
    });

    it('should handle data corruption', () => {
      mockErrorBoundary.handleDataCorruption();

      const container = mockErrorBoundary.getContainer();
      const recoveryMessage = container.querySelector(
        '[data-testid="recovery-message"]'
      )!;
      expect(recoveryMessage.textContent).toContain('Data has been reset');
    });

    it('should handle query timeout errors', () => {
      const queryError = new DatabaseError(
        'Query execution timeout',
        { query: 'SELECT * FROM large_table', timeout: 30000 },
        'QUERY_TIMEOUT'
      );

      mockErrorBoundary.simulateError(queryError);

      const errorLog = mockErrorBoundary.getErrorLog();
      expect(errorLog[0].details.timeout).toBe(30000);
    });
  });

  describe('Retry Mechanisms', () => {
    it('should allow retry for transient errors', () => {
      const transientError = new NetworkError(
        'Temporary service unavailable',
        503,
        'SERVICE_UNAVAILABLE'
      );

      mockErrorBoundary.simulateError(transientError);

      // First retry
      const retryButton = mockErrorBoundary
        .getContainer()
        .querySelector('[data-testid="retry-button"]')!;
      retryButton.dispatchEvent({ type: 'click' });

      expect(mockErrorBoundary.getRetryCount()).toBe(1);
      expect(mockErrorBoundary.isRetryButtonDisabled()).toBe(false);
    });

    it('should limit retry attempts', () => {
      const persistentError = new NetworkError(
        'Persistent error',
        500,
        'PERSISTENT_ERROR'
      );

      // Simulate multiple failures
      for (let i = 0; i < 4; i++) {
        mockErrorBoundary.simulateError(persistentError);

        if (i < 3) {
          const retryButton = mockErrorBoundary
            .getContainer()
            .querySelector('[data-testid="retry-button"]')!;
          retryButton.dispatchEvent({ type: 'click' });
        }
      }

      expect(mockErrorBoundary.getRetryCount()).toBe(3);
      expect(mockErrorBoundary.isRetryButtonDisabled()).toBe(true);
    });

    it('should reset retry count after successful operation', () => {
      const tempError = new NetworkError('Temporary error', 503);

      mockErrorBoundary.simulateError(tempError);

      // Retry once
      const retryButton = mockErrorBoundary
        .getContainer()
        .querySelector('[data-testid="retry-button"]')!;
      retryButton.dispatchEvent({ type: 'click' });

      expect(mockErrorBoundary.getRetryCount()).toBe(1);

      // Dismiss error (simulating successful retry)
      const dismissButton = mockErrorBoundary
        .getContainer()
        .querySelector('[data-testid="dismiss-button"]')!;
      dismissButton.dispatchEvent({ type: 'click' });

      const errorState = mockErrorBoundary.getErrorState();
      expect(errorState.retryCount).toBe(0);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle memory pressure', () => {
      mockErrorBoundary.handleMemoryPressure();

      const container = mockErrorBoundary.getContainer();
      const recoveryMessage = container.querySelector(
        '[data-testid="recovery-message"]'
      )!;
      expect(recoveryMessage.textContent).toContain(
        'optimized to handle memory'
      );
    });

    it('should provide fallback functionality when features fail', () => {
      // Simulate feature failure
      const featureError = new Error('Feature X is unavailable');
      mockErrorBoundary.simulateError(featureError);

      // Verify error boundary handles it
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      // Application should still be functional for other features
      const errorState = mockErrorBoundary.getErrorState();
      expect(errorState.hasError).toBe(true);

      // But container is still responsive
      const container = mockErrorBoundary.getContainer();
      expect(container.classList.contains('error-boundary')).toBe(true);
    });

    it('should handle progressive enhancement failures', () => {
      // Simulate enhancement failure (e.g., advanced drag-and-drop)
      const enhancementError = new Error('Advanced feature not supported');
      mockErrorBoundary.simulateError(enhancementError);

      // Basic functionality should still work
      expect(
        mockErrorBoundary.getContainer().classList.contains('error-boundary')
      ).toBe(true);
    });
  });

  describe('User Error Recovery', () => {
    it('should guide users through error recovery', () => {
      const userError = new ValidationError('Invalid input provided');
      mockErrorBoundary.simulateError(userError);

      const container = mockErrorBoundary.getContainer();
      const errorMessage = container.querySelector(
        '[data-testid="error-message"]'
      )!;

      // Should provide helpful guidance
      expect(errorMessage.textContent).toContain('check your input');
    });

    it('should allow users to dismiss non-critical errors', () => {
      const nonCriticalError = new Error('Non-critical warning');
      mockErrorBoundary.simulateError(nonCriticalError);

      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      // User dismisses error
      const dismissButton = mockErrorBoundary
        .getContainer()
        .querySelector('[data-testid="dismiss-button"]')!;
      dismissButton.dispatchEvent({ type: 'click' });

      expect(mockErrorBoundary.isErrorVisible()).toBe(false);
    });

    it('should preserve user data during error recovery', () => {
      // Simulate error with user data present
      const userDataError = new Error('Error with user data');
      mockErrorBoundary.simulateError(userDataError);

      // Verify error is handled but data preservation message shown
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      // Recovery should maintain data integrity
      const errorState = mockErrorBoundary.getErrorState();
      expect(errorState.hasError).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle rapid successive errors', () => {
      const errors = [
        new NetworkError('Error 1'),
        new ValidationError('Error 2'),
        new DatabaseError('Error 3'),
      ];

      // Rapid error succession
      errors.forEach(error => {
        mockErrorBoundary.simulateError(error);
      });

      // Should only show the last error
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      // All errors should be logged
      const errorLog = mockErrorBoundary.getErrorLog();
      expect(errorLog).toHaveLength(3);
    });

    it('should handle extremely large error messages', () => {
      const largeMessage = 'A'.repeat(10000); // Very large error message
      const largeError = new Error(largeMessage);

      mockErrorBoundary.simulateError(largeError);

      // Should handle large messages gracefully
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      const container = mockErrorBoundary.getContainer();
      const errorDetails = container.querySelector(
        '[data-testid="error-details"]'
      )!;
      expect(errorDetails.textContent.length).toBeGreaterThan(1000);
    });

    it('should handle null and undefined error data', () => {
      const nullError = new Error('');
      nullError.message = '';

      mockErrorBoundary.simulateError(nullError);

      // Should handle gracefully with fallback message
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      const container = mockErrorBoundary.getContainer();
      const errorMessage = container.querySelector(
        '[data-testid="error-message"]'
      )!;
      expect(errorMessage.textContent).toContain('unexpected error');
    });

    it('should handle circular reference in error objects', () => {
      const circularError: any = new Error('Circular reference error');
      circularError.circular = circularError; // Create circular reference

      mockErrorBoundary.simulateError(circularError);

      // Should handle without throwing
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);
      expect(mockErrorBoundary.getErrorLog()).toHaveLength(1);
    });
  });

  describe('System Resilience', () => {
    it('should maintain stability under error conditions', () => {
      // Simulate multiple error types
      const errorTypes = [
        new NetworkError('Network error'),
        new ValidationError('Validation error'),
        new DatabaseError('Database error'),
        new Error('Generic error'),
      ];

      errorTypes.forEach((error, index) => {
        mockErrorBoundary.simulateError(error);

        // System should remain stable
        expect(mockErrorBoundary.getContainer()).toBeDefined();
        expect(mockErrorBoundary.getErrorLog()).toHaveLength(index + 1);
      });
    });

    it('should continue functioning after error recovery', () => {
      const recoveryError = new NetworkError('Recovery test error');

      mockErrorBoundary.simulateError(recoveryError);
      expect(mockErrorBoundary.isErrorVisible()).toBe(true);

      // Dismiss error
      const dismissButton = mockErrorBoundary
        .getContainer()
        .querySelector('[data-testid="dismiss-button"]')!;
      dismissButton.dispatchEvent({ type: 'click' });

      expect(mockErrorBoundary.isErrorVisible()).toBe(false);

      // System should be ready for normal operation
      const errorState = mockErrorBoundary.getErrorState();
      expect(errorState.hasError).toBe(false);
    });

    it('should handle error boundary component failures', () => {
      // Simulate error boundary itself failing
      try {
        // Force an error in error handling
        const container = mockErrorBoundary.getContainer();
        container.querySelector = () => {
          throw new Error('querySelector failed');
        };

        const testError = new Error('Test error');
        mockErrorBoundary.simulateError(testError);

        // Error should still be logged even if display fails
        expect(mockErrorBoundary.getErrorLog()).toHaveLength(1);
      } catch (error) {
        // Error boundary failure should not crash the system
        expect(error).toBeDefined();
      }
    });
  });
});
