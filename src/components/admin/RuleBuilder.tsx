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
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
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
  readOnly?: boolean;
}

const nodeTypes: NodeTypes = {
  start: StartNode,
  condition: ConditionNode,
  action: ActionNode,
  logicGate: LogicGateNode,
};

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
  readOnly = false,
}: RuleBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    propInitialNodes || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    propInitialEdges || initialEdges
  );
  const [nextNodeId, setNextNodeId] = useState(2);

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
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
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
            >
              + Condition
            </button>
            <button
              onClick={addActionNode}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
            >
              + Action
            </button>
            <button
              onClick={() => addLogicGateNode('AND')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
            >
              + AND
            </button>
            <button
              onClick={() => addLogicGateNode('OR')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200"
            >
              + OR
            </button>
          </div>
        </div>
      )}

      {/* React Flow */}
      <div className="flex-1">
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
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Rule Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
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
      </div>
    </div>
  );
}
