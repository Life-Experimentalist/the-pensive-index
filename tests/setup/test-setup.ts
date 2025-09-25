import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global type declarations for test utilities
declare global {
  var testUtils: {
    mockApiCall: any;
    mockUser: {
      id: string;
      role: string;
      permissions: string[];
    };
  };
}

// Mock Navigator API that's causing issues
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'node.js',
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
      readText: vi.fn(() => Promise.resolve('')),
    },
  },
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock HTMLElement methods
HTMLElement.prototype.releasePointerCapture = vi.fn();
HTMLElement.prototype.setPointerCapture = vi.fn();

// Mock window.getComputedStyle
window.getComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => ''),
})) as any;

// Global test utilities
globalThis.testUtils = {
  mockApiCall: vi.fn(),
  mockUser: {
    id: 'test-user',
    role: 'ProjectAdmin',
    permissions: ['read', 'write', 'admin'],
  },
};
