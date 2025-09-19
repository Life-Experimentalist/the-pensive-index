/**
 * Visual Rule Builder Component using React Flow
 *
 * Interactive visual interface for building validation rules:
 * - Drag and drop conditions and actions
 * - Visual node connections
 * - Real-time rule preview
 * - Complex logic building (AND/OR operations)
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom node types
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import LogicGateNode from './nodes/LogicGateNode';
import StartNode from './nodes/StartNode';

interface RuleBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onRuleChange?: (nodes: Node[], edges: Edge[]) => void;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  readOnly?: boolean;
  initialRule?: {
    id?: string;
    name?: string;
    description?: string;
    ruleType?: 'conditional' | 'exclusivity' | 'transformation';
    fandomId?: string;
  };
}

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: 'Rule Start' },
  },
];

const initialEdges: Edge[] = [];

export default function RuleBuilder({
  initialNodes: propInitialNodes,
  initialEdges: propInitialEdges,
  onRuleChange,
  onSave,
  onCancel,
  readOnly = false,
  initialRule,
}: RuleBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    propInitialNodes || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    propInitialEdges || initialEdges
  );
  const [nextNodeId, setNextNodeId] = useState(2);

  // Rule properties state
  const [ruleName, setRuleName] = useState(initialRule?.name || '');
  const [ruleDescription, setRuleDescription] = useState(
    initialRule?.description || ''
  );
  const [ruleType, setRuleType] = useState(
    initialRule?.ruleType || 'conditional'
  );

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
      onRuleChange?.(nodes, newEdge);
    },
    [edges, nodes, onRuleChange, setEdges]
  );

  const addConditionNode = useCallback(() => {
    if (readOnly) return;

    const newNode: Node = {
      id: `condition-${nextNodeId}`,
      type: 'condition',
      position: { x: 100 + Math.random() * 400, y: 150 + Math.random() * 200 },
      data: {
        type: 'tag-exists',
        target: '',
        operator: 'equals',
        value: '',
        weight: 1,
        groupId: null,
        isNegated: false,
      },
    };

    setNodes(nodes => [...nodes, newNode]);
    setNextNodeId(id => id + 1);
    onRuleChange?.([...nodes, newNode], edges);
  }, [edges, nextNodeId, nodes, onRuleChange, readOnly, setNodes]);

  const addActionNode = useCallback(() => {
    if (readOnly) return;

    const newNode: Node = {
      id: `action-${nextNodeId}`,
      type: 'action',
      position: { x: 100 + Math.random() * 400, y: 350 + Math.random() * 200 },
      data: {
        type: 'validation-error',
        severity: 'error',
        message: 'Validation failed',
        data: {},
        conditionGroup: null,
      },
    };

    setNodes(nodes => [...nodes, newNode]);
    setNextNodeId(id => id + 1);
    onRuleChange?.([...nodes, newNode], edges);
  }, [edges, nextNodeId, nodes, onRuleChange, readOnly, setNodes]);

  const addLogicGateNode = useCallback(
    (gateType: 'AND' | 'OR') => {
      if (readOnly) return;

      const newNode: Node = {
        id: `logic-${nextNodeId}`,
        type: 'logicGate',
        position: {
          x: 250 + Math.random() * 200,
          y: 200 + Math.random() * 100,
        },
        data: {
          gateType,
          label: gateType,
        },
      };

      setNodes(nodes => [...nodes, newNode]);
      setNextNodeId(id => id + 1);
      onRuleChange?.([...nodes, newNode], edges);
    },
    [edges, nextNodeId, nodes, onRuleChange, readOnly, setNodes]
  );

  const onNodeUpdate = useCallback(
    (nodeId: string, newData: any) => {
      if (readOnly) return;

      setNodes(nodes =>
        nodes.map(node =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node
        )
      );

      const updatedNodes = nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      );
      onRuleChange?.(updatedNodes, edges);
    },
    [edges, nodes, onRuleChange, readOnly, setNodes]
  );

  const onNodeDelete = useCallback(
    (nodeId: string) => {
      if (readOnly) return;

      setNodes(nodes => nodes.filter(node => node.id !== nodeId));
      setEdges(edges =>
        edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
      );

      const filteredNodes = nodes.filter(node => node.id !== nodeId);
      const filteredEdges = edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      );
      onRuleChange?.(filteredNodes, filteredEdges);
    },
    [edges, nodes, onRuleChange, readOnly, setEdges, setNodes]
  );

  // Update node types with callbacks
  const enhancedNodeTypes = useMemo(
    () => ({
      start: (props: any) => <StartNode {...props} />,
      condition: (props: any) => (
        <ConditionNode
          {...props}
          onUpdate={data => onNodeUpdate(props.id, data)}
          onDelete={() => onNodeDelete(props.id)}
          readOnly={readOnly}
        />
      ),
      action: (props: any) => (
        <ActionNode
          {...props}
          onUpdate={data => onNodeUpdate(props.id, data)}
          onDelete={() => onNodeDelete(props.id)}
          readOnly={readOnly}
        />
      ),
      logicGate: (props: any) => (
        <LogicGateNode
          {...props}
          onUpdate={data => onNodeUpdate(props.id, data)}
          onDelete={() => onNodeDelete(props.id)}
          readOnly={readOnly}
        />
      ),
    }),
    [onNodeUpdate, onNodeDelete, readOnly]
  );

  const validateRule = useCallback(() => {
    // Basic validation logic
    const hasStart = nodes.some(node => node.type === 'start');
    const hasConditions = nodes.some(node => node.type === 'condition');
    const hasActions = nodes.some(node => node.type === 'action');

    if (!hasStart)
      return { isValid: false, message: 'Rule must have a start node' };
    if (!hasConditions)
      return {
        isValid: false,
        message: 'Rule must have at least one condition',
      };
    if (!hasActions)
      return { isValid: false, message: 'Rule must have at least one action' };

    // Check for disconnected nodes (except start)
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const disconnectedNodes = nodes.filter(
      node => node.type !== 'start' && !connectedNodeIds.has(node.id)
    );

    if (disconnectedNodes.length > 0) {
      return {
        isValid: false,
        message: 'All nodes must be connected to the rule flow',
      };
    }

    return { isValid: true, message: 'Rule is valid' };
  }, [nodes, edges]);

  const ruleValidation = validateRule();

  return (
    <div
      className="h-full flex flex-col"
      data-testid="rule-builder"
      role="application"
      aria-label="Visual rule builder interface"
    >
      {/* Toolbar */}
      {!readOnly && (
        <div
          className="flex items-center justify-between p-4 bg-white border-b border-gray-200"
          data-testid="rule-builder-toolbar"
        >
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">Rule Builder</h3>
            <div
              className={`px-2 py-1 text-xs rounded-full ${
                ruleValidation.isValid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {ruleValidation.message}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={addConditionNode}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              tabIndex={10}
            >
              + Condition
            </button>
            <button
              onClick={addActionNode}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
              tabIndex={11}
            >
              + Action
            </button>
            <button
              onClick={() => addLogicGateNode('AND')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
              tabIndex={12}
            >
              + AND
            </button>
            <button
              onClick={() => addLogicGateNode('OR')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200"
              tabIndex={13}
            >
              + OR
            </button>
            <button
              data-testid="validate-rule"
              onClick={() => {
                const validation = validateRule();
                // Could show a toast or modal with validation results
                console.log('Rule validation:', validation);
              }}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              tabIndex={14}
            >
              Validate
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Properties Panel */}
        <div
          className="w-80 bg-gray-50 border-r border-gray-200 p-4"
          data-testid="rule-properties"
        >
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Rule Properties
          </h4>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="rule-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rule Name
              </label>
              <input
                id="rule-name"
                data-testid="rule-name"
                type="text"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter rule name"
                disabled={readOnly}
                aria-label="Rule name"
                tabIndex={1}
              />
            </div>

            <div>
              <label
                htmlFor="rule-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="rule-description"
                data-testid="rule-description"
                value={ruleDescription}
                onChange={e => setRuleDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this rule does"
                disabled={readOnly}
                aria-label="Rule description"
                tabIndex={2}
              />
            </div>

            <div>
              <label
                htmlFor="rule-type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rule Type
              </label>
              <select
                id="rule-type"
                data-testid="rule-type"
                value={ruleType}
                onChange={e =>
                  setRuleType(
                    e.target.value as
                      | 'conditional'
                      | 'exclusivity'
                      | 'transformation'
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={readOnly}
                aria-label="Rule type"
                tabIndex={3}
              >
                <option value="conditional">Conditional</option>
                <option value="exclusivity">Exclusivity</option>
                <option value="transformation">Transformation</option>
              </select>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" data-testid="rule-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={enhancedNodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Rule Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Nodes:</span>
              <span className="ml-1 text-gray-900">{nodes.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Conditions:</span>
              <span className="ml-1 text-gray-900">
                {nodes.filter(n => n.type === 'condition').length}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Actions:</span>
              <span className="ml-1 text-gray-900">
                {nodes.filter(n => n.type === 'action').length}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Connections:</span>
              <span className="ml-1 text-gray-900">{edges.length}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              data-testid="cancel-rule"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={!onCancel}
              tabIndex={20}
            >
              Cancel
            </button>
            <button
              data-testid="save-rule"
              onClick={onSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              disabled={!onSave}
              tabIndex={21}
            >
              Save Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
