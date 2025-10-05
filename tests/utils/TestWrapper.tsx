/**
 * Test Wrapper Component
 * Provides common context providers for component testing
 */

import React from 'react';
import { ReactNode } from 'react';

export interface TestWrapperProps {
  children: ReactNode;
}

/**
 * Wraps components with necessary providers for testing
 */
export function TestWrapper({ children }: TestWrapperProps): JSX.Element {
  return <div data-testid="test-wrapper">{children}</div>;
}

export default TestWrapper;
