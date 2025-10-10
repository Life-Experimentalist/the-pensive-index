/**
 * ValidationIndicator Component Tests
 * Test validation error display, warnings, and suggestions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationIndicator } from 'src/components/pathway/ValidationIndicator';
import type { ValidationResult } from '@/types';

describe('ValidationIndicator Component', () => {
  const mockValidationResult: ValidationResult = {
    is_valid: false,
    errors: [
      {
        name: '',
        type: 'TAG_CONFLICT',
        message: 'Cannot select both harry/hermione and harry/ginny tags',
        field: 'tags',
        severity: 'error' as const,
      },
    ],
    warnings: [
      {
        type: 'INCOMPLETE_PATHWAY',
        message: 'Consider adding more plot blocks for a complete story',
      },
    ],
    suggestions: [
      {
        type: 'TAG_SUGGESTION',
        message: 'Remove one of the conflicting shipping tags',
        action: 'REMOVE_TAG',
        target_id: 'harry-ginny',
      },
    ],
  };

  describe('Error Display', () => {
    it('should display validation errors when present', () => {
      render(<ValidationIndicator validationResult={mockValidationResult} />);

      expect(
        screen.getByText(
          /Cannot select both harry\/hermione and harry\/ginny tags/i
        )
      ).toBeInTheDocument();
    });

    it('should show error severity badge', () => {
      render(<ValidationIndicator validationResult={mockValidationResult} />);

      const errorBadge = screen.getByText('error', { exact: false });
      expect(errorBadge).toHaveClass('error');
    });

    it('should not display errors when validation passes', () => {
      const validResult: ValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
      };

      render(<ValidationIndicator validationResult={validResult} />);

      expect(screen.queryByText(/Cannot select/i)).not.toBeInTheDocument();
    });
  });

  describe('Warning Display', () => {
    it('should display validation warnings', () => {
      render(<ValidationIndicator validationResult={mockValidationResult} />);

      expect(
        screen.getByText(/Consider adding more plot blocks/i)
      ).toBeInTheDocument();
    });

    it('should allow dismissing warnings', () => {
      const { rerender } = render(
        <ValidationIndicator validationResult={mockValidationResult} />
      );

      // Find and click dismiss button
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      dismissButton.click();

      // Warning should be hidden (in actual implementation)
      // This test will need to be updated when component is implemented
    });
  });

  describe('Suggestion Display', () => {
    it('should display actionable suggestions', () => {
      render(<ValidationIndicator validationResult={mockValidationResult} />);

      expect(
        screen.getByText(/Remove one of the conflicting shipping tags/i)
      ).toBeInTheDocument();
    });

    it('should render action button for actionable suggestions', () => {
      render(<ValidationIndicator validationResult={mockValidationResult} />);

      const actionButton = screen.getByRole('button', { name: /apply/i });
      expect(actionButton).toBeInTheDocument();
    });

    it('should call onApplySuggestion when action button clicked', () => {
      const mockApplySuggestion = vi.fn();

      render(
        <ValidationIndicator
          validationResult={mockValidationResult}
          onApplySuggestion={mockApplySuggestion}
        />
      );

      const actionButton = screen.getByRole('button', { name: /apply/i });
      actionButton.click();

      expect(mockApplySuggestion).toHaveBeenCalledWith({
        type: 'TAG_SUGGESTION',
        message: 'Remove one of the conflicting shipping tags',
        action: 'REMOVE_TAG',
        target_id: 'harry-ginny',
      });
    });
  });

  describe('Visual States', () => {
    it('should show success state when valid', () => {
      const validResult: ValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
      };

      render(<ValidationIndicator validationResult={validResult} />);

      expect(screen.getByText(/Pathway is valid/i)).toBeInTheDocument();
    });

    it('should show error state icon for invalid pathways', () => {
      render(<ValidationIndicator validationResult={mockValidationResult} />);

      // Check for error icon or badge
      const errorIndicator = screen.getByTestId('validation-error-icon');
      expect(errorIndicator).toBeInTheDocument();
    });

    it('should be collapsible for mobile view', () => {
      render(
        <ValidationIndicator
          validationResult={mockValidationResult}
          collapsible={true}
        />
      );

      const collapseButton = screen.getByRole('button', { name: /toggle/i });
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when props unchanged', () => {
      const renderSpy = vi.fn();

      const { rerender } = render(
        <ValidationIndicator
          validationResult={mockValidationResult}
          onRender={renderSpy}
        />
      );

      rerender(
        <ValidationIndicator
          validationResult={mockValidationResult}
          onRender={renderSpy}
        />
      );

      // Should only render once when props are the same
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});
