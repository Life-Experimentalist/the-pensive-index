/**
 * Condition Node Component for Rule Builder
 *
 * Represents a validation condition in the visual rule builder:
 * - Configurable condition types (tag-exists, count, comparison)
 * - Target and operator selection
 * - Value input with validation
 * - Negation support
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
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface ConditionNodeData {
  type: string;
  target: string;
  operator: string;
  value: any;
  weight?: number;
  groupId?: string | null;
  isNegated?: boolean;
  metadata?: Record<string, any>;
}

interface ConditionNodeProps {
  id: string;
  data: ConditionNodeData;
  onUpdate?: (data: Partial<ConditionNodeData>) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const conditionTypes = [
  { value: 'tag-exists', label: 'Tag Exists' },
  { value: 'tag-count', label: 'Tag Count' },
  { value: 'plot-block-exists', label: 'Plot Block Exists' },
  { value: 'selection-value', label: 'Selection Value' },
  { value: 'pathway-length', label: 'Pathway Length' },
  { value: 'custom-rule', label: 'Custom Rule' },
];

const operators = {
  'tag-exists': [
    { value: 'exists', label: 'Exists' },
    { value: 'not-exists', label: 'Does Not Exist' },
  ],
  'tag-count': [
    { value: 'equals', label: 'Equals' },
    { value: 'greater-than', label: 'Greater Than' },
    { value: 'less-than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ],
  'plot-block-exists': [
    { value: 'exists', label: 'Exists' },
    { value: 'not-exists', label: 'Does Not Exist' },
  ],
  'selection-value': [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts-with', label: 'Starts With' },
    { value: 'matches-regex', label: 'Matches Pattern' },
  ],
  'pathway-length': [
    { value: 'equals', label: 'Equals' },
    { value: 'greater-than', label: 'Greater Than' },
    { value: 'less-than', label: 'Less Than' },
  ],
  'custom-rule': [{ value: 'evaluates-true', label: 'Evaluates True' }],
};

export default function ConditionNode({
  id,
  data,
  onUpdate,
  onDelete,
  readOnly = false,
}: ConditionNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState(data);

  const handleUpdate = (field: keyof ConditionNodeData, value: any) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onUpdate?.(newData);
  };

  const getOperators = () => {
    return operators[localData.type as keyof typeof operators] || [];
  };

  const renderValueInput = () => {
    switch (localData.type) {
      case 'tag-exists':
      case 'plot-block-exists':
        return (
          <input
            type="text"
            placeholder="Tag/Block name"
            value={localData.target || ''}
            onChange={e => handleUpdate('target', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={readOnly}
          />
        );

      case 'tag-count':
      case 'pathway-length':
        return (
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Target"
              value={localData.target || ''}
              onChange={e => handleUpdate('target', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={readOnly}
            />
            <input
              type="number"
              placeholder="Value"
              value={localData.value || ''}
              onChange={e =>
                handleUpdate('value', parseInt(e.target.value) || 0)
              }
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
        );

      case 'selection-value':
        return (
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Selection key"
              value={localData.target || ''}
              onChange={e => handleUpdate('target', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={readOnly}
            />
            <input
              type="text"
              placeholder="Expected value"
              value={localData.value || ''}
              onChange={e => handleUpdate('value', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
        );

      case 'custom-rule':
        return (
          <textarea
            placeholder="Custom rule expression"
            value={localData.value || ''}
            onChange={e => handleUpdate('value', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={readOnly}
          />
        );

      default:
        return null;
    }
  };

  const isValid = () => {
    if (!localData.type) return false;
    if (localData.type === 'custom-rule') return !!localData.value;
    return !!localData.target;
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        isValid() ? 'border-blue-300' : 'border-red-300'
      }`}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-t-lg">
        <div className="flex items-center space-x-1">
          <ExclamationCircleIcon className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-800">Condition</span>
          {localData.isNegated && (
            <span className="text-xs bg-red-100 text-red-700 px-1 rounded">
              NOT
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {!readOnly && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1 text-blue-600 hover:text-blue-800"
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
        {/* Condition Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={localData.type || ''}
            onChange={e => handleUpdate('type', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={readOnly}
          >
            <option value="">Select type...</option>
            {conditionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operator */}
        {localData.type && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Operator
            </label>
            <select
              value={localData.operator || ''}
              onChange={e => handleUpdate('operator', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={readOnly}
            >
              <option value="">Select operator...</option>
              {getOperators().map(op => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Value Input */}
        {localData.type && localData.operator && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Value
            </label>
            {renderValueInput()}
          </div>
        )}

        {/* Advanced Options */}
        {isEditing && !readOnly && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`negate-${id}`}
                checked={localData.isNegated || false}
                onChange={e => handleUpdate('isNegated', e.target.checked)}
                className="w-3 h-3 text-blue-600 rounded"
              />
              <label htmlFor={`negate-${id}`} className="text-xs text-gray-700">
                Negate condition
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Weight
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={localData.weight || 1}
                onChange={e =>
                  handleUpdate('weight', parseFloat(e.target.value) || 1)
                }
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Group ID
              </label>
              <input
                type="text"
                placeholder="Optional grouping"
                value={localData.groupId || ''}
                onChange={e => handleUpdate('groupId', e.target.value || null)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* Output handle */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
