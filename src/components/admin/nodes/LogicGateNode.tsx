/**
 * Logic Gate Node Component for Rule Builder
 *
 * Represents logical operations (AND/OR) in the visual rule builder:
 * - AND gate: All inputs must be true
 * - OR gate: At least one input must be true
 * - Multiple input/output connections
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface LogicGateNodeData {
  gateType: 'AND' | 'OR';
  label: string;
}

interface LogicGateNodeProps {
  id: string;
  data: LogicGateNodeData;
  onUpdate?: (data: Partial<LogicGateNodeData>) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export default function LogicGateNode({
  id,
  data,
  onUpdate,
  onDelete,
  readOnly = false,
}: LogicGateNodeProps) {
  const handleTypeChange = (gateType: 'AND' | 'OR') => {
    onUpdate?.({ gateType, label: gateType });
  };

  const getGateStyle = () => {
    if (data.gateType === 'AND') {
      return 'bg-purple-100 border-purple-300 text-purple-800';
    } else {
      return 'bg-orange-100 border-orange-300 text-orange-800';
    }
  };

  return (
    <div className={`rounded-lg border-2 shadow-md ${getGateStyle()}`}>
      {/* Multiple input handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="input-1"
        className="w-3 h-3"
        style={{ left: '25%' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="input-2"
        className="w-3 h-3"
        style={{ left: '75%' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold">{data.gateType}</span>
          {!readOnly && (
            <div className="flex">
              <button
                onClick={() => handleTypeChange('AND')}
                className={`px-2 py-1 text-xs rounded-l ${
                  data.gateType === 'AND'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-600 border border-purple-300'
                }`}
              >
                AND
              </button>
              <button
                onClick={() => handleTypeChange('OR')}
                className={`px-2 py-1 text-xs rounded-r ${
                  data.gateType === 'OR'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-orange-600 border border-orange-300'
                }`}
              >
                OR
              </button>
            </div>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:text-red-800"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Description */}
      <div className="px-2 pb-2">
        <span className="text-xs opacity-75">
          {data.gateType === 'AND'
            ? 'All inputs must be true'
            : 'At least one input must be true'}
        </span>
      </div>

      {/* Output handle */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
