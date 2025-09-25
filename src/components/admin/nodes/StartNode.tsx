/**
 * Start Node Component for Rule Builder
 *
 * Represents the starting point of a validation rule:
 * - Entry point for rule flow
 * - Non-deletable system node
 * - Single output connection
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlayIcon } from '@heroicons/react/24/outline';

interface StartNodeData {
  label: string;
}

interface StartNodeProps {
  id: string;
  data: StartNodeData;
}

export default function StartNode({ id, data }: StartNodeProps) {
  return (
    <div className="bg-green-100 border-2 border-green-300 rounded-lg shadow-md">
      {/* Header */}
      <div className="flex items-center justify-center p-3 space-x-2">
        <PlayIcon className="w-5 h-5 text-green-700" />
        <span className="text-sm font-bold text-green-800">{data.label}</span>
      </div>

      {/* Description */}
      <div className="px-3 pb-2 text-center">
        <span className="text-xs text-green-600">
          Rule execution starts here
        </span>
      </div>

      {/* Output handle */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
