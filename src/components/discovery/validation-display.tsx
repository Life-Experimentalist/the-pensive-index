'use client';

import React, { useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import {
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  InformationCircleIcon as InformationCircleIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
} from '@heroicons/react/24/solid';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'suggestion' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description?: string;
  suggestion?: string;
  conflictingItems?: Array<{
    id: string;
    type: 'tag' | 'plot_block';
    name: string;
  }>;
  canAutoFix?: boolean;
  autoFixLabel?: string;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationDisplayProps {
  /**
   * Current validation result
   */
  validation?: ValidationResult;

  /**
   * Loading state for real-time validation
   */
  isValidating?: boolean;

  /**
   * Error state if validation fails
   */
  validationError?: string;

  /**
   * Show detailed mode with all issues expanded
   */
  showDetails?: boolean;

  /**
   * Compact mode for mobile or sidebar display
   */
  compact?: boolean;

  /**
   * Event handlers
   */
  onAutoFix?: (issueId: string) => void;
  onDismissIssue?: (issueId: string) => void;
  onToggleDetails?: () => void;

  /**
   * Optional CSS class
   */
  className?: string;
}

/**
 * Real-time validation display component
 *
 * Features:
 * - Real-time conflict detection and validation feedback
 * - Categorized issues (errors, warnings, suggestions)
 * - Auto-fix suggestions for common problems
 * - Severity-based prioritization and coloring
 * - Compact mode for mobile interfaces
 * - Accessible design with proper ARIA labels
 *
 * Validation performance:
 * - <200ms response time for validation checks
 * - Debounced validation to prevent excessive API calls
 * - Progressive disclosure for complex validation results
 * - Visual feedback during validation process
 */
export function ValidationDisplay({
  validation,
  isValidating = false,
  validationError,
  showDetails = false,
  compact = false,
  onAutoFix,
  onDismissIssue,
  onToggleDetails,
  className = '',
}: ValidationDisplayProps) {
  // Group issues by type for better organization
  const groupedIssues = useMemo(() => {
    if (!validation?.issues) return {};

    return validation.issues.reduce((groups, issue) => {
      if (!groups[issue.type]) {
        groups[issue.type] = [];
      }
      groups[issue.type].push(issue);
      return groups;
    }, {} as Record<string, ValidationIssue[]>);
  }, [validation?.issues]);

  // Get appropriate icon for validation state
  const getValidationIcon = () => {
    if (isValidating) {
      return (
        <div className="animate-spin w-5 h-5">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full"></div>
        </div>
      );
    }

    if (validationError) {
      return <XCircleIconSolid className="w-5 h-5 text-red-500" />;
    }

    if (!validation) {
      return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    }

    const hasErrors = validation.issues.some(issue => issue.type === 'error');
    const hasWarnings = validation.issues.some(
      issue => issue.type === 'warning'
    );

    if (hasErrors) {
      return <XCircleIconSolid className="w-5 h-5 text-red-500" />;
    }

    if (hasWarnings) {
      return (
        <ExclamationTriangleIconSolid className="w-5 h-5 text-yellow-500" />
      );
    }

    return <CheckCircleIconSolid className="w-5 h-5 text-green-500" />;
  };

  // Get validation status text
  const getValidationStatus = () => {
    if (isValidating) return 'Validating pathway...';
    if (validationError) return 'Validation failed';
    if (!validation) return 'No validation data';

    const errorCount = validation.issues.filter(
      issue => issue.type === 'error'
    ).length;
    const warningCount = validation.issues.filter(
      issue => issue.type === 'warning'
    ).length;

    if (errorCount > 0) {
      return `${errorCount} error${errorCount !== 1 ? 's' : ''} found`;
    }

    if (warningCount > 0) {
      return `${warningCount} warning${warningCount !== 1 ? 's' : ''} found`;
    }

    return 'Pathway looks good!';
  };

  // Render individual validation issue
  const renderIssue = (issue: ValidationIssue) => {
    const getIssueIcon = () => {
      switch (issue.type) {
        case 'error':
          return <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />;
        case 'warning':
          return (
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          );
        case 'suggestion':
          return (
            <LightBulbIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
          );
        default:
          return (
            <InformationCircleIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          );
      }
    };

    const getIssueColor = () => {
      switch (issue.type) {
        case 'error':
          return 'bg-red-50 border-red-200';
        case 'warning':
          return 'bg-yellow-50 border-yellow-200';
        case 'suggestion':
          return 'bg-blue-50 border-blue-200';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    };

    return (
      <div
        key={issue.id}
        className={`p-3 border rounded-lg ${getIssueColor()}`}
      >
        <div className="flex items-start space-x-3">
          {getIssueIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{issue.message}</p>
            {issue.description && (
              <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
            )}
            {issue.conflictingItems && issue.conflictingItems.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  Conflicting items:
                </p>
                <div className="flex flex-wrap gap-1">
                  {issue.conflictingItems.map(item => (
                    <span
                      key={item.id}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-white border border-gray-200"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {issue.suggestion && (
              <p className="text-sm text-gray-600 mt-2 italic">
                💡 {issue.suggestion}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-1">
            {issue.canAutoFix && onAutoFix && (
              <button
                onClick={() => onAutoFix(issue.id)}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {issue.autoFixLabel || 'Fix'}
              </button>
            )}
            {onDismissIssue && (
              <button
                onClick={() => onDismissIssue(issue.id)}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Dismiss issue"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`validation-display-compact ${className}`}>
        <div className="flex items-center space-x-2 p-2">
          {getValidationIcon()}
          <span className="text-sm font-medium text-gray-700 flex-1">
            {getValidationStatus()}
          </span>
          {validation && validation.issues.length > 0 && onToggleDetails && (
            <button
              onClick={onToggleDetails}
              className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {showDetails ? 'Hide' : 'Details'}
            </button>
          )}
        </div>
        {showDetails && validation && validation.issues.length > 0 && (
          <div className="border-t border-gray-200 p-2 space-y-2 max-h-40 overflow-y-auto">
            {validation.issues.map(renderIssue)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`validation-display bg-white border border-gray-200 rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getValidationIcon()}
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Pathway Validation
              </h3>
              <p className="text-sm text-gray-600">{getValidationStatus()}</p>
            </div>
          </div>
          {validation && (
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                {validation.score}%
              </div>
              <div className="text-xs text-gray-500">Compatibility Score</div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-800">{validationError}</p>
            </div>
          </div>
        )}

        {validation && !validationError && (
          <div className="space-y-4">
            {/* Issues by type */}
            {Object.entries(groupedIssues).map(([type, issues]) => (
              <div key={type}>
                <h4 className="text-sm font-medium text-gray-900 mb-2 capitalize">
                  {type}s ({issues.length})
                </h4>
                <div className="space-y-2">{issues.map(renderIssue)}</div>
              </div>
            ))}

            {/* Suggestions */}
            {validation.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Suggestions
                </h4>
                <div className="space-y-2">
                  {validation.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-start space-x-2">
                        <LightBulbIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">{suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No issues */}
            {validation.issues.length === 0 && (
              <div className="text-center py-8">
                <CheckCircleIconSolid className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-900 mb-1">
                  Great pathway!
                </h4>
                <p className="text-gray-600">
                  No conflicts or issues detected. Ready to discover stories.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ValidationDisplay;
