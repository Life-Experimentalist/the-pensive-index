'use client';

import React, { useState } from 'react';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
} from '../../types';

interface ValidationErrorDisplayProps {
  validationResult: ValidationResult;
  onFixError?: (error: ValidationError, fix: any) => Promise<void>;
  onDismissError?: (errorIndex: number) => void;
  showSuggestions?: boolean;
  compactMode?: boolean;
}

export function ValidationErrorDisplay({
  validationResult,
  onFixError,
  onDismissError,
  showSuggestions = true,
  compactMode = false,
}: ValidationErrorDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['errors'])
  );
  const [selectedError, setSelectedError] = useState<ValidationError | null>(
    null
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  if (compactMode) {
    const totalIssues =
      validationResult.errors.length + validationResult.warnings.length;

    return (
      <div className="p-3 rounded-md border">
        {validationResult.is_valid ? (
          <div className="flex items-center text-green-600">
            <span className="mr-2">✅</span>
            <span className="text-sm font-medium">Validation passed</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <span className="mr-2">❌</span>
            <span className="text-sm font-medium">
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''} found
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      <div
        className={`p-4 rounded-lg border ${
          validationResult.is_valid
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        <div className="flex items-center">
          <span className="mr-2">
            {validationResult.is_valid ? '✅' : '❌'}
          </span>
          <h3 className="text-lg font-semibold">
            {validationResult.is_valid
              ? 'Validation Passed'
              : 'Validation Failed'}
          </h3>
        </div>
      </div>

      {/* Errors Section */}
      {validationResult.errors && validationResult.errors.length > 0 && (
        <div className="border border-red-200 rounded-lg">
          <button
            onClick={() => toggleSection('errors')}
            className="w-full p-4 text-left bg-red-50 hover:bg-red-100 transition-colors rounded-t-lg"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-red-800">
                Errors ({validationResult.errors.length})
              </h4>
              <span className="text-red-600">
                {expandedSections.has('errors') ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {expandedSections.has('errors') && (
            <div className="p-4 space-y-3">
              {validationResult.errors.map((error, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${getSeverityColor(
                    error.severity
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="mr-2">
                          {getSeverityIcon(error.severity)}
                        </span>
                        <span className="font-medium text-sm uppercase tracking-wide">
                          {error.type}
                        </span>
                      </div>
                      <p className="text-sm mb-1">{error.message}</p>
                      {error.field && (
                        <p className="text-xs text-gray-600">
                          Field: {error.field}
                        </p>
                      )}
                      {error.value && (
                        <p className="text-xs text-gray-600">
                          Value: {JSON.stringify(error.value)}
                        </p>
                      )}
                    </div>
                    {onDismissError && (
                      <button
                        onClick={() => onDismissError(index)}
                        className="ml-2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings Section */}
      {validationResult.warnings && validationResult.warnings.length > 0 && (
        <div className="border border-yellow-200 rounded-lg">
          <button
            onClick={() => toggleSection('warnings')}
            className="w-full p-4 text-left bg-yellow-50 hover:bg-yellow-100 transition-colors rounded-t-lg"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-yellow-800">
                Warnings ({validationResult.warnings.length})
              </h4>
              <span className="text-yellow-600">
                {expandedSections.has('warnings') ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {expandedSections.has('warnings') && (
            <div className="p-4 space-y-3">
              {validationResult.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="p-3 rounded border border-yellow-200 bg-yellow-50 text-yellow-800"
                >
                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm uppercase tracking-wide mb-1">
                        {warning.type}
                      </div>
                      <p className="text-sm mb-1">{warning.message}</p>
                      {warning.field && (
                        <p className="text-xs text-yellow-700">
                          Field: {warning.field}
                        </p>
                      )}
                      {warning.suggestion && (
                        <p className="text-xs text-yellow-700">
                          Suggestion: {warning.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflicts Section */}
      {validationResult.conflicts && validationResult.conflicts.length > 0 && (
        <div className="border border-purple-200 rounded-lg">
          <button
            onClick={() => toggleSection('conflicts')}
            className="w-full p-4 text-left bg-purple-50 hover:bg-purple-100 transition-colors rounded-t-lg"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-purple-800">
                Conflicts ({validationResult.conflicts.length})
              </h4>
              <span className="text-purple-600">
                {expandedSections.has('conflicts') ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {expandedSections.has('conflicts') && (
            <div className="p-4 space-y-3">
              {validationResult.conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className="p-3 rounded border border-purple-200 bg-purple-50 text-purple-800"
                >
                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5">⚔️</span>
                    <p className="text-sm">{conflict.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Missing Requirements Section */}
      {validationResult.missing_requirements &&
        validationResult.missing_requirements.length > 0 && (
          <div className="border border-orange-200 rounded-lg">
            <button
              onClick={() => toggleSection('missing')}
              className="w-full p-4 text-left bg-orange-50 hover:bg-orange-100 transition-colors rounded-t-lg"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-orange-800">
                  Missing Requirements (
                  {validationResult.missing_requirements.length})
                </h4>
                <span className="text-orange-600">
                  {expandedSections.has('missing') ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {expandedSections.has('missing') && (
              <div className="p-4 space-y-3">
                {validationResult.missing_requirements.map((missing, index) => (
                  <div
                    key={index}
                    className="p-3 rounded border border-orange-200 bg-orange-50 text-orange-800"
                  >
                    <div className="flex items-start">
                      <span className="mr-2 mt-0.5">📋</span>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{missing.type}:</span>{' '}
                          {missing.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Suggestions Section */}
      {showSuggestions &&
        validationResult.suggestions &&
        validationResult.suggestions.length > 0 && (
          <div className="border border-blue-200 rounded-lg">
            <button
              onClick={() => toggleSection('suggestions')}
              className="w-full p-4 text-left bg-blue-50 hover:bg-blue-100 transition-colors rounded-t-lg"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-blue-800">
                  Suggestions ({validationResult.suggestions.length})
                </h4>
                <span className="text-blue-600">
                  {expandedSections.has('suggestions') ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {expandedSections.has('suggestions') && (
              <div className="p-4 space-y-3">
                {validationResult.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 rounded border border-blue-200 bg-blue-50 text-blue-800"
                  >
                    <div className="flex items-start">
                      <span className="mr-2 mt-0.5">💡</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm uppercase tracking-wide mb-1">
                          {suggestion.type} - {suggestion.action}
                        </div>
                        <p className="text-sm mb-1">{suggestion.message}</p>
                        {suggestion.target_id && (
                          <p className="text-xs text-blue-700">
                            Target: {suggestion.target_id}
                          </p>
                        )}
                        {suggestion.alternative_ids &&
                          suggestion.alternative_ids.length > 0 && (
                            <p className="text-xs text-blue-700">
                              Alternatives:{' '}
                              {suggestion.alternative_ids.join(', ')}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* No Issues */}
      {validationResult.is_valid &&
        (!validationResult.errors || validationResult.errors.length === 0) &&
        (!validationResult.warnings ||
          validationResult.warnings.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">🎉 All validation checks passed!</p>
            <p className="text-sm mt-2">
              No issues found with the current configuration.
            </p>
          </div>
        )}
    </div>
  );
}

export default ValidationErrorDisplay;
