/**
 * Action Node Component for Rule Builder
 *
 * Represents a validation action in the visual rule builder:
 * - Configurable action types (error, warning, info)
 * - Severity levels
 * - Custom messages
 * - Action data configuration
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Cog6ToothIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ActionNodeData {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  data?: Record<string, any>;
  conditionGroup?: string | null;
}

interface ActionNodeProps {
  id: string;
  data: ActionNodeData;
  onUpdate?: (data: Partial<ActionNodeData>) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const actionTypes = [
  { value: 'validation-error', label: 'Validation Error' },
  { value: 'validation-warning', label: 'Validation Warning' },
  { value: 'validation-info', label: 'Validation Info' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'auto-fix', label: 'Auto Fix' },
  { value: 'block-submission', label: 'Block Submission' },
  { value: 'custom-action', label: 'Custom Action' },
];

const severityLevels = [
  { value: 'error', label: 'Error', color: 'red' },
  { value: 'warning', label: 'Warning', color: 'yellow' },
  { value: 'info', label: 'Info', color: 'blue' },
];

export default function ActionNode({
  id,
  data,
  onUpdate,
  onDelete,
  readOnly = false,
}: ActionNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState(data);

  const handleUpdate = (field: keyof ActionNodeData, value: any) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onUpdate?.(newData);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return ExclamationTriangleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'info':
        return InformationCircleIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-300';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-300';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-300';
      default:
        return 'text-green-600 bg-green-50 border-green-300';
    }
  };

  const renderActionConfig = () => {
    switch (localData.type) {
      case 'validation-error':
      case 'validation-warning':
      case 'validation-info':
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                placeholder="Validation message"
                value={localData.message || ''}
                onChange={e => handleUpdate('message', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                rows={2}
                disabled={readOnly}
              />
            </div>
          </div>
        );

      case 'suggestion':
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Suggestion
              </label>
              <textarea
                placeholder="Helpful suggestion"
                value={localData.message || ''}
                onChange={e => handleUpdate('message', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                rows={2}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Suggested Tags
              </label>
              <input
                type="text"
                placeholder="Comma-separated tags"
                value={localData.data?.suggestedTags?.join(', ') || ''}
                onChange={e =>
                  handleUpdate('data', {
                    ...localData.data,
                    suggestedTags: e.target.value
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                disabled={readOnly}
              />
            </div>
          </div>
        );

      case 'auto-fix':
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fix Description
              </label>
              <textarea
                placeholder="What will be automatically fixed"
                value={localData.message || ''}
                onChange={e => handleUpdate('message', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                rows={2}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fix Action
              </label>
              <select
                value={localData.data?.fixAction || ''}
                onChange={e =>
                  handleUpdate('data', {
                    ...localData.data,
                    fixAction: e.target.value,
                  })
                }
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                disabled={readOnly}
              >
                <option value="">Select fix action...</option>
                <option value="add-tag">Add Tag</option>
                <option value="remove-tag">Remove Tag</option>
                <option value="replace-tag">Replace Tag</option>
                <option value="add-warning">Add Warning</option>
                <option value="update-selection">Update Selection</option>
              </select>
            </div>
          </div>
        );

      case 'block-submission':
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Block Reason
              </label>
              <textarea
                placeholder="Why submission is blocked"
                value={localData.message || ''}
                onChange={e => handleUpdate('message', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                rows={2}
                disabled={readOnly}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`allow-override-${id}`}
                checked={localData.data?.allowOverride || false}
                onChange={e =>
                  handleUpdate('data', {
                    ...localData.data,
                    allowOverride: e.target.checked,
                  })
                }
                className="w-3 h-3 text-green-600 rounded"
                disabled={readOnly}
              />
              <label
                htmlFor={`allow-override-${id}`}
                className="text-xs text-gray-700"
              >
                Allow admin override
              </label>
            </div>
          </div>
        );

      case 'custom-action':
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Action Code
              </label>
              <textarea
                placeholder="Custom action implementation"
                value={localData.data?.code || ''}
                onChange={e =>
                  handleUpdate('data', {
                    ...localData.data,
                    code: e.target.value,
                  })
                }
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 resize-none font-mono"
                rows={3}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Display Message
              </label>
              <input
                type="text"
                placeholder="Message to show user"
                value={localData.message || ''}
                onChange={e => handleUpdate('message', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                disabled={readOnly}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isValid = () => {
    if (!localData.type) return false;
    if (!localData.message) return false;
    return true;
  };

  const SeverityIcon = getSeverityIcon(localData.severity);
  const colorClasses = getSeverityColor(localData.severity);

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        isValid() ? `border-green-300` : 'border-red-300'
      }`}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      {/* Header */}
      <div
        className={`flex items-center justify-between p-2 rounded-t-lg ${colorClasses}`}
      >
        <div className="flex items-center space-x-1">
          <SeverityIcon className="w-4 h-4" />
          <span className="text-xs font-medium">Action</span>
          <span className="text-xs bg-white bg-opacity-70 px-1 rounded">
            {localData.severity?.toUpperCase() || 'INFO'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {!readOnly && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1 hover:opacity-75"
              >
                <Cog6ToothIcon className="w-3 h-3" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Action Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={localData.type || ''}
            onChange={e => handleUpdate('type', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={readOnly}
          >
            <option value="">Select type...</option>
            {actionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Severity
          </label>
          <select
            value={localData.severity || 'info'}
            onChange={e => handleUpdate('severity', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={readOnly}
          >
            {severityLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Configuration */}
        {localData.type && renderActionConfig()}

        {/* Advanced Options */}
        {isEditing && !readOnly && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Condition Group
              </label>
              <input
                type="text"
                placeholder="Optional group filter"
                value={localData.conditionGroup || ''}
                onChange={e =>
                  handleUpdate('conditionGroup', e.target.value || null)
                }
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Validation Status */}
      {!isValid() && (
        <div className="px-3 py-1 bg-red-50 border-t border-red-200 rounded-b-lg">
          <span className="text-xs text-red-600">Configuration incomplete</span>
        </div>
      )}
    </div>
  );
}
