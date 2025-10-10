/**
 * ValidationIndicator Component
 * Displays validation errors, warnings, and suggestions for pathway building
 * Feature 004-integrate-the-pathway: User Story US1
 */

'use client';

import React, { useState, memo } from 'react';
import type { ValidationResult, ValidationSuggestion } from '@/types';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  X,
} from 'lucide-react';

export interface ValidationIndicatorProps {
  validationResult: ValidationResult;
  onApplySuggestion?: (suggestion: ValidationSuggestion) => void;
  collapsible?: boolean;
  onRender?: () => void;
}

export const ValidationIndicator = memo(function ValidationIndicator({
  validationResult,
  onApplySuggestion,
  collapsible = false,
  onRender,
}: ValidationIndicatorProps) {
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(
    new Set()
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Call onRender for testing purposes
  React.useEffect(() => {
    onRender?.();
  }, [onRender]);

  const handleDismissWarning = (warningMessage: string) => {
    setDismissedWarnings(prev => new Set(prev).add(warningMessage));
  };

  const handleApplySuggestion = (suggestion: ValidationSuggestion) => {
    onApplySuggestion?.(suggestion);
  };

  const visibleWarnings =
    validationResult.warnings?.filter(w => !dismissedWarnings.has(w.message)) ||
    [];

  if (validationResult.is_valid && visibleWarnings.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <span className="text-sm text-green-700 font-medium">
          Pathway is valid
        </span>
      </div>
    );
  }

  return (
    <div className="validation-indicator space-y-3">
      {/* Header for collapsible mode */}
      {collapsible && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
          aria-label="toggle validation details"
        >
          <div className="flex items-center gap-2">
            {!validationResult.is_valid ? (
              <AlertCircle
                className="w-5 h-5 text-red-600"
                data-testid="validation-error-icon"
              />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="text-sm font-medium">
              {validationResult.errors.length > 0
                ? `${validationResult.errors.length} Error${
                    validationResult.errors.length !== 1 ? 's' : ''
                  }`
                : `${visibleWarnings.length} Warning${
                    visibleWarnings.length !== 1 ? 's' : ''
                  }`}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              isCollapsed && 'rotate-180'
            )}
          />
        </button>
      )}

      {/* Validation details */}
      {(!collapsible || !isCollapsed) && (
        <div className="space-y-3">
          {/* Errors */}
          {validationResult.errors.map((error, index) => (
            <div
              key={`error-${index}`}
              className="p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                  data-testid="validation-error-icon"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-800 uppercase error">
                      {error.severity}
                    </span>
                  </div>
                  <p className="text-sm text-red-700">{error.message}</p>
                  {error.field && (
                    <p className="text-xs text-red-600">Field: {error.field}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Warnings */}
          {visibleWarnings.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-700">{warning.message}</p>
                </div>
                <button
                  onClick={() => handleDismissWarning(warning.message)}
                  className="p-1 hover:bg-yellow-100 rounded"
                  aria-label="dismiss warning"
                >
                  <X className="w-4 h-4 text-yellow-600" />
                </button>
              </div>
            </div>
          ))}

          {/* Suggestions */}
          {validationResult.suggestions?.map((suggestion, index) => (
            <div
              key={`suggestion-${index}`}
              className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm text-blue-700">{suggestion.message}</p>
                </div>
                {suggestion.action && (
                  <button
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                    aria-label="apply suggestion"
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
