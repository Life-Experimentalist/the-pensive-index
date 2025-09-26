'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  BulkOperationRequest,
  BulkOperationResult,
  BulkOperationType,
  Fandom,
  Tag,
  PlotBlock,
  TagClass,
  ValidationResult,
} from '../../types';

interface BulkOperationsPanelProps {
  fandom: Fandom;
  onBulkOperation: (
    operation: BulkOperationRequest
  ) => Promise<BulkOperationResult>;
  onValidate?: (items: any[]) => Promise<ValidationResult>;
  isLoading?: boolean;
}

interface BulkOperationForm {
  operation_type: BulkOperationType;
  target_ids: string[];
  operation_data: Record<string, any>;
}

interface OperationProgress {
  total: number;
  completed: number;
  failed: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  results: BulkOperationResult | null;
}

export function BulkOperationsPanel({
  fandom,
  onBulkOperation,
  onValidate,
  isLoading = false,
}: BulkOperationsPanelProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [operationForm, setOperationForm] = useState<BulkOperationForm>({
    operation_type: 'export',
    target_ids: [],
    operation_data: {},
  });

  const [progress, setProgress] = useState<OperationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    status: 'idle',
    results: null,
  });

  const [importData, setImportData] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationResults, setValidationResults] =
    useState<ValidationResult | null>(null);

  // Get all items that can be bulk operated on
  const getAllItems = useCallback(() => {
    const items: Array<{ id: string; type: string; name: string; item: any }> =
      [];

    fandom.tags?.forEach((tag, index) => {
      items.push({
        id: tag.id || `tag-${index}`,
        type: 'tag',
        name: tag.name,
        item: tag,
      });
    });

    fandom.plot_blocks?.forEach((block, index) => {
      items.push({
        id: block.id || `block-${index}`,
        type: 'plot_block',
        name: block.name,
        item: block,
      });
    });

    fandom.tag_classes?.forEach((tagClass, index) => {
      items.push({
        id: tagClass.id || `class-${index}`,
        type: 'tag_class',
        name: tagClass.name,
        item: tagClass,
      });
    });

    return items;
  }, [fandom]);

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        const allItems = getAllItems();
        setSelectedItems(new Set(allItems.map(item => item.id)));
      } else {
        setSelectedItems(new Set());
      }
    },
    [getAllItems]
  );

  // Update operation form when selected items change
  useEffect(() => {
    setOperationForm(prev => ({
      ...prev,
      target_ids: Array.from(selectedItems),
    }));
  }, [selectedItems]);

  // Execute bulk operation
  const executeBulkOperation = useCallback(async () => {
    if (selectedItems.size === 0 && operationForm.operation_type !== 'import') {
      alert('Please select items to perform the operation on.');
      return;
    }

    setProgress({
      total: selectedItems.size,
      completed: 0,
      failed: 0,
      status: 'running',
      results: null,
    });

    try {
      const request: BulkOperationRequest = {
        fandom_id: fandom.id,
        operation_type: operationForm.operation_type,
        target_ids: Array.from(selectedItems),
        operation_data: operationForm.operation_data,
      };

      const result = await onBulkOperation(request);

      setProgress({
        total: selectedItems.size,
        completed: result.successful_operations?.length || 0,
        failed: result.failed_operations?.length || 0,
        status: result.success ? 'completed' : 'failed',
        results: result,
      });

      if (result.success) {
        setSelectedItems(new Set()); // Clear selection on success
      }
    } catch (error) {
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        results: {
          status: 'failed',
          total_items: selectedItems.size,
          processed_items: 0,
          failed_items: selectedItems.size,
          error_log: [error instanceof Error ? error.message : 'Unknown error'],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          success: false,
          message: error instanceof Error ? error.message : 'Operation failed',
          successful_operations: [],
          failed_operations: Array.from(selectedItems).map(id => ({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })),
        },
      }));
    }
  }, [selectedItems, operationForm, fandom.id, onBulkOperation]);

  // Parse import data
  const parseImportData = useCallback(() => {
    try {
      const parsed = JSON.parse(importData);
      setPreviewData(Array.isArray(parsed) ? parsed : [parsed]);
      setShowPreview(true);

      // Validate imported data if validation function is provided
      if (onValidate) {
        onValidate(Array.isArray(parsed) ? parsed : [parsed]).then(
          setValidationResults
        );
      }
    } catch (error) {
      alert('Invalid JSON data. Please check your import format.');
    }
  }, [importData, onValidate]);

  // Execute import operation
  const executeImport = useCallback(async () => {
    if (!previewData.length) {
      alert('No data to import. Please parse your import data first.');
      return;
    }

    setProgress({
      total: previewData.length,
      completed: 0,
      failed: 0,
      status: 'running',
      results: null,
    });

    try {
      const request: BulkOperationRequest = {
        fandom_id: fandom.id,
        operation_type: 'import',
        target_ids: [],
        operation_data: {
          items: previewData,
          validation_results: validationResults,
        },
      };

      const result = await onBulkOperation(request);

      setProgress({
        total: previewData.length,
        completed: result.successful_operations?.length || 0,
        failed: result.failed_operations?.length || 0,
        status: result.success ? 'completed' : 'failed',
        results: result,
      });

      if (result.success) {
        setImportData('');
        setPreviewData([]);
        setShowPreview(false);
        setValidationResults(null);
      }
    } catch (error) {
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        results: {
          status: 'failed',
          total_items: previewData.length,
          processed_items: 0,
          failed_items: previewData.length,
          error_log: [error instanceof Error ? error.message : 'Unknown error'],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          success: false,
          message: error instanceof Error ? error.message : 'Import failed',
          successful_operations: [],
          failed_operations: previewData.map((item: any, index: number) => ({
            id: `item-${index}`,
            error: error instanceof Error ? error.message : 'Unknown error',
          })),
        },
      }));
    }
  }, [previewData, validationResults, fandom.id, onBulkOperation]);

  const allItems = getAllItems();
  const selectedCount = selectedItems.size;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Bulk Operations - {fandom.name}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Perform operations on multiple items at once
        </p>
      </div>

      {/* Operation Type Selection */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              type: 'export' as BulkOperationType,
              label: 'Export',
              icon: '📤',
              description: 'Export selected items to JSON',
            },
            {
              type: 'import' as BulkOperationType,
              label: 'Import',
              icon: '📥',
              description: 'Import items from JSON data',
            },
            {
              type: 'validate' as BulkOperationType,
              label: 'Validate',
              icon: '✅',
              description: 'Validate selected items',
            },
            {
              type: 'delete' as BulkOperationType,
              label: 'Delete',
              icon: '🗑️',
              description: 'Delete selected items',
            },
          ].map(operation => (
            <button
              key={operation.type}
              onClick={() =>
                setOperationForm(prev => ({
                  ...prev,
                  operation_type: operation.type,
                }))
              }
              className={`p-4 border rounded-lg text-left transition-colors ${
                operationForm.operation_type === operation.type
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isLoading || progress.status === 'running'}
            >
              <div className="text-2xl mb-2">{operation.icon}</div>
              <div className="font-medium text-gray-900">{operation.label}</div>
              <div className="text-sm text-gray-600">
                {operation.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Import Section */}
      {operationForm.operation_type === 'import' && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Import Data
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JSON Data
              </label>
              <textarea
                rows={10}
                value={importData}
                onChange={e => setImportData(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Paste your JSON data here..."
                disabled={isLoading || progress.status === 'running'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={parseImportData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={
                  isLoading ||
                  progress.status === 'running' ||
                  !importData.trim()
                }
              >
                Parse & Preview
              </button>
              {previewData.length > 0 && (
                <button
                  onClick={executeImport}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={isLoading || progress.status === 'running'}
                >
                  Import ({previewData.length} items)
                </button>
              )}
            </div>
          </div>

          {/* Import Preview */}
          {showPreview && previewData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Import Preview
              </h4>
              <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.type || 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.name || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                          {item.description || 'No description'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                            Ready
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Validation Results */}
              {validationResults && !validationResults.is_valid && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h5 className="text-sm font-medium text-yellow-800 mb-2">
                    Validation Warnings
                  </h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validationResults.missing_requirements?.map(
                      (req, index) => (
                        <li key={index}>
                          • Missing {req.type}: {req.name}
                        </li>
                      )
                    )}
                    {validationResults.conflicts?.map((conflict, index) => (
                      <li key={index}>• Conflict: {conflict.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Item Selection (for non-import operations) */}
      {operationForm.operation_type !== 'import' && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Select Items ({selectedCount} selected)
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSelectAll(true)}
                className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
                disabled={isLoading || progress.status === 'running'}
              >
                Select All
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                disabled={isLoading || progress.status === 'running'}
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedCount === allItems.length && allItems.length > 0
                      }
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      disabled={isLoading || progress.status === 'running'}
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allItems.map(item => {
                  const isSelected = selectedItems.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e =>
                            handleItemSelect(item.id, e.target.checked)
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          disabled={isLoading || progress.status === 'running'}
                        />
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            item.type === 'tag'
                              ? 'bg-gray-100 text-gray-800'
                              : item.type === 'plot_block'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                        {item.item.description || 'No description'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operation Configuration */}
      {(operationForm.operation_type === 'export' ||
        operationForm.operation_type === 'validate') && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Operation Settings
          </h3>

          {operationForm.operation_type === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      operationForm.operation_data.include_relationships ||
                      false
                    }
                    onChange={e =>
                      setOperationForm(prev => ({
                        ...prev,
                        operation_data: {
                          ...prev.operation_data,
                          include_relationships: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={isLoading || progress.status === 'running'}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include relationships
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      operationForm.operation_data.include_metadata || false
                    }
                    onChange={e =>
                      setOperationForm(prev => ({
                        ...prev,
                        operation_data: {
                          ...prev.operation_data,
                          include_metadata: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={isLoading || progress.status === 'running'}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include metadata
                  </span>
                </label>
              </div>
            </div>
          )}

          {operationForm.operation_type === 'validate' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      operationForm.operation_data.check_references || true
                    }
                    onChange={e =>
                      setOperationForm(prev => ({
                        ...prev,
                        operation_data: {
                          ...prev.operation_data,
                          check_references: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={isLoading || progress.status === 'running'}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Check references
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      operationForm.operation_data.check_conflicts || true
                    }
                    onChange={e =>
                      setOperationForm(prev => ({
                        ...prev,
                        operation_data: {
                          ...prev.operation_data,
                          check_conflicts: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={isLoading || progress.status === 'running'}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Check for conflicts
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {progress.status === 'running' && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Processing...
            </span>
            <span className="text-sm text-gray-500">
              {progress.completed} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {progress.results && progress.status !== 'running' && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div
            className={`p-4 rounded-md ${
              progress.results.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {progress.results.success ? (
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3
                  className={`text-sm font-medium ${
                    progress.results.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {progress.results.success
                    ? 'Operation Completed'
                    : 'Operation Failed'}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    progress.results.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {progress.results.message}
                </p>

                {progress.results.successful_operations &&
                  progress.results.successful_operations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-green-700">
                        Successfully processed:{' '}
                        {progress.results.successful_operations.length} items
                      </p>
                    </div>
                  )}

                {progress.results.failed_operations &&
                  progress.results.failed_operations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-red-700">
                        Failed: {progress.results.failed_operations.length}{' '}
                        items
                      </p>
                      <ul className="mt-1 text-xs text-red-600 space-y-1">
                        {progress.results.failed_operations
                          .slice(0, 5)
                          .map((failure, index) => (
                            <li key={index}>
                              • {failure.id}: {failure.error}
                            </li>
                          ))}
                        {progress.results.failed_operations.length > 5 && (
                          <li>
                            • ... and{' '}
                            {progress.results.failed_operations.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                {progress.results.errors &&
                  progress.results.errors.length > 0 && (
                    <div className="mt-2">
                      <ul className="text-sm text-red-700 space-y-1">
                        {progress.results.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {operationForm.operation_type !== 'import' && (
              <>
                {selectedCount > 0
                  ? `${selectedCount} items selected for ${operationForm.operation_type}`
                  : `No items selected`}
              </>
            )}
            {operationForm.operation_type === 'import' && (
              <>
                {previewData.length > 0
                  ? `${previewData.length} items ready for import`
                  : `No data to import`}
              </>
            )}
          </div>

          <button
            onClick={
              operationForm.operation_type === 'import'
                ? executeImport
                : executeBulkOperation
            }
            className={`px-6 py-2 rounded-md font-medium ${
              operationForm.operation_type === 'bulk_delete'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={
              isLoading ||
              progress.status === 'running' ||
              (operationForm.operation_type !== 'import' &&
                selectedCount === 0) ||
              (operationForm.operation_type === 'import' &&
                previewData.length === 0)
            }
          >
            {progress.status === 'running'
              ? 'Processing...'
              : `Execute ${
                  operationForm.operation_type.charAt(0).toUpperCase() +
                  operationForm.operation_type.slice(1)
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkOperationsPanel;
