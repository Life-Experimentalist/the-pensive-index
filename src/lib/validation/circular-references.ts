import { PlotBlock, PlotBlockCondition, Tag } from '@/types';

interface CircularReferenceContext {
  plot_blocks: PlotBlock[];
  conditions: PlotBlockCondition[];
  tags: Tag[];
}

interface CircularReferenceResult {
  has_circular_references: boolean;
  circular_chains: Array<{
    type: 'plot_block' | 'condition' | 'tag' | 'mixed';
    chain: Array<{
      id: string;
      type: 'plot_block' | 'condition' | 'tag';
      name: string;
    }>;
    relationship_type:
      | 'requires'
      | 'enables'
      | 'enhances'
      | 'parent_child'
      | 'mixed';
    severity: 'error' | 'warning';
    message: string;
  }>;
  affected_elements: Array<{
    id: string;
    type: 'plot_block' | 'condition' | 'tag';
    circular_chains_involved: number;
    can_break_cycle: boolean;
    suggested_resolution?: {
      action: 'remove_dependency' | 'remove_element' | 'change_hierarchy';
      target_relationship: string;
      reason: string;
    };
  }>;
  suggested_resolutions?: Array<{
    action: 'remove_dependency' | 'restructure_hierarchy' | 'remove_element';
    target_ids: string[];
    impact: 'minimal' | 'moderate' | 'major';
    reason: string;
    alternative_structure?: any;
  }>;
}

/**
 * Circular Reference Detection for Plot Blocks, Conditions, and Tags
 * Implements graph algorithms to detect and resolve circular dependencies
 */
export class CircularReferenceDetector {
  /**
   * Detect circular references across all element types
   */
  static detectCircularReferences(
    context: CircularReferenceContext
  ): CircularReferenceResult {
    const allChains: CircularReferenceResult['circular_chains'] = [];
    const affectedElements = new Map<string, any>();

    // Detect cycles in each element type
    const plotBlockResult = this.detectPlotBlockCircles(context.plot_blocks);
    const conditionResult = this.detectConditionCircles(context.conditions);
    const tagResult = this.detectTagCircles(context.tags);
    const mixedResult = this.detectMixedCircles(context);

    // Combine all circular chains
    allChains.push(...plotBlockResult.circular_chains);
    allChains.push(...conditionResult.circular_chains);
    allChains.push(...tagResult.circular_chains);
    allChains.push(...mixedResult.circular_chains);

    // Track affected elements
    for (const result of [
      plotBlockResult,
      conditionResult,
      tagResult,
      mixedResult,
    ]) {
      for (const element of result.affected_elements) {
        if (affectedElements.has(element.id)) {
          affectedElements.get(element.id).circular_chains_involved++;
        } else {
          affectedElements.set(element.id, { ...element });
        }
      }
    }

    // Generate resolution suggestions
    const suggested_resolutions = this.generateResolutionSuggestions(
      allChains,
      Array.from(affectedElements.values())
    );

    return {
      has_circular_references: allChains.length > 0,
      circular_chains: allChains,
      affected_elements: Array.from(affectedElements.values()),
      suggested_resolutions,
    };
  }

  /**
   * Detect circular references in plot blocks
   */
  static detectPlotBlockCircles(
    plotBlocks: PlotBlock[]
  ): CircularReferenceResult {
    const chains: CircularReferenceResult['circular_chains'] = [];
    const affected = new Map<string, any>();

    // Build dependency graph
    const graph = new Map<string, Set<string>>();
    const blockMap = new Map<string, PlotBlock>();

    for (const block of plotBlocks) {
      blockMap.set(block.id, block);
      graph.set(block.id, new Set());

      // Add requires relationships
      if (block.requires) {
        for (const req of block.requires) {
          graph.get(block.id)!.add(req);
        }
      }

      // Add parent-child relationships
      if (block.children) {
        for (const child of block.children) {
          if (!graph.has(child)) graph.set(child, new Set());
          graph.get(child)!.add(block.id);
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const blockId of plotBlocks.map(b => b.id)) {
      if (!visited.has(blockId)) {
        const cycle = this.dfsDetectCycle(
          blockId,
          graph,
          blockMap,
          visited,
          recursionStack,
          []
        );
        if (cycle) {
          chains.push(cycle);

          // Track affected elements
          for (const node of cycle.chain) {
            affected.set(node.id, {
              id: node.id,
              type: node.type,
              circular_chains_involved: 1,
              can_break_cycle: true,
              suggested_resolution: {
                action: 'remove_dependency',
                target_relationship: 'requires',
                reason:
                  'Breaking this dependency will resolve the circular reference',
              },
            });
          }
        }
      }
    }

    return {
      has_circular_references: chains.length > 0,
      circular_chains: chains,
      affected_elements: Array.from(affected.values()),
    };
  }

  /**
   * DFS cycle detection helper with full path tracking
   */
  private static dfsDetectCycle(
    nodeId: string,
    graph: Map<string, Set<string>>,
    blockMap: Map<string, PlotBlock>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[] = []
  ): CircularReferenceResult['circular_chains'][0] | null {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = this.dfsDetectCycle(
          neighbor,
          graph,
          blockMap,
          visited,
          recursionStack,
          [...path]
        );
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle, build full chain
        const cycleStartIndex = path.indexOf(neighbor);
        const cyclePath = [...path.slice(cycleStartIndex), neighbor]; // Complete the cycle

        const chain = cyclePath.map(id => ({
          id,
          type: 'plot_block' as const,
          name: blockMap.get(id)?.name || id,
        }));

        return {
          type: 'plot_block',
          chain,
          relationship_type: 'requires',
          severity: 'error',
          message: `Circular dependency detected between plot blocks: ${chain
            .map(c => c.name)
            .join(' -> ')}`,
        };
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return null;
  }

  /**
   * Detect circular references in conditions
   */
  static detectConditionCircles(
    conditions: PlotBlockCondition[]
  ): CircularReferenceResult {
    const chains: CircularReferenceResult['circular_chains'] = [];
    const affected = new Map<string, any>();

    // Build dependency graph
    const graph = new Map<string, Set<string>>();
    const conditionMap = new Map<string, PlotBlockCondition>();

    for (const condition of conditions) {
      conditionMap.set(condition.id, condition);
      graph.set(condition.id, new Set());

      // Add requires relationships
      if (condition.requires) {
        for (const req of condition.requires) {
          graph.get(condition.id)!.add(req);
        }
      }

      // Add parent-child relationships
      if (condition.children) {
        for (const child of condition.children) {
          if (!graph.has(child)) graph.set(child, new Set());
          graph.get(child)!.add(condition.id);
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const conditionId of conditions.map(c => c.id)) {
      if (!visited.has(conditionId)) {
        const cycle = this.dfsDetectConditionCycle(
          conditionId,
          graph,
          conditionMap,
          visited,
          recursionStack,
          []
        );
        if (cycle) {
          chains.push(cycle);

          // Track affected elements
          for (const node of cycle.chain) {
            affected.set(node.id, {
              id: node.id,
              type: node.type,
              circular_chains_involved: 1,
              can_break_cycle: true,
              suggested_resolution: {
                action: 'remove_dependency',
                target_relationship: 'requires',
                reason:
                  'Breaking this dependency will resolve the circular reference',
              },
            });
          }
        }
      }
    }

    return {
      has_circular_references: chains.length > 0,
      circular_chains: chains,
      affected_elements: Array.from(affected.values()),
    };
  }

  private static dfsDetectConditionCycle(
    nodeId: string,
    graph: Map<string, Set<string>>,
    conditionMap: Map<string, PlotBlockCondition>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[] = []
  ): CircularReferenceResult['circular_chains'][0] | null {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = this.dfsDetectConditionCycle(
          neighbor,
          graph,
          conditionMap,
          visited,
          recursionStack,
          [...path]
        );
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle, build full chain
        const cycleStartIndex = path.indexOf(neighbor);
        const cyclePath = [...path.slice(cycleStartIndex), neighbor]; // Complete the cycle

        const chain = cyclePath.map(id => ({
          id,
          type: 'condition' as const,
          name: conditionMap.get(id)?.name || id,
        }));

        return {
          type: 'condition',
          chain,
          relationship_type: 'requires',
          severity: 'error',
          message: `Circular dependency detected between conditions: ${chain
            .map(c => c.name)
            .join(' -> ')}`,
        };
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return null;
  }

  /**
   * Detect circular references in tags
   */
  static detectTagCircles(tags: Tag[]): CircularReferenceResult {
    const chains: CircularReferenceResult['circular_chains'] = [];
    const affected = new Map<string, any>();

    // Build dependency graph
    const graph = new Map<string, Set<string>>();
    const tagMap = new Map<string, Tag>();

    for (const tag of tags) {
      tagMap.set(tag.id, tag);
      graph.set(tag.id, new Set());

      // Add requires relationships
      if (tag.requires) {
        for (const req of tag.requires) {
          graph.get(tag.id)!.add(req);
        }
      }

      // Add enhances relationships
      if (tag.enhances) {
        for (const enh of tag.enhances) {
          graph.get(tag.id)!.add(enh);
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const tagId of tags.map(t => t.id)) {
      if (!visited.has(tagId)) {
        const cycle = this.dfsDetectTagCycle(
          tagId,
          graph,
          tagMap,
          visited,
          recursionStack,
          []
        );
        if (cycle) {
          chains.push(cycle);

          // Track affected elements
          for (const node of cycle.chain) {
            affected.set(node.id, {
              id: node.id,
              type: node.type,
              circular_chains_involved: 1,
              can_break_cycle: true,
              suggested_resolution: {
                action: 'remove_dependency',
                target_relationship: 'requires',
                reason:
                  'Breaking this dependency will resolve the circular reference',
              },
            });
          }
        }
      }
    }

    return {
      has_circular_references: chains.length > 0,
      circular_chains: chains,
      affected_elements: Array.from(affected.values()),
    };
  }

  private static dfsDetectTagCycle(
    nodeId: string,
    graph: Map<string, Set<string>>,
    tagMap: Map<string, Tag>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[] = []
  ): CircularReferenceResult['circular_chains'][0] | null {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = this.dfsDetectTagCycle(
          neighbor,
          graph,
          tagMap,
          visited,
          recursionStack,
          [...path]
        );
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle, build full chain
        const cycleStartIndex = path.indexOf(neighbor);
        const cyclePath = [...path.slice(cycleStartIndex), neighbor]; // Complete the cycle

        const chain = cyclePath.map(id => ({
          id,
          type: 'tag' as const,
          name: tagMap.get(id)?.name || id,
        }));

        return {
          type: 'tag',
          chain,
          relationship_type: 'requires',
          severity: 'error',
          message: `Circular dependency detected between tags: ${chain
            .map(c => c.name)
            .join(' -> ')}`,
        };
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return null;
  }

  /**
   * Detect mixed circular references across element types
   */
  static detectMixedCircles(
    context: CircularReferenceContext
  ): CircularReferenceResult {
    const chains: CircularReferenceResult['circular_chains'] = [];
    const affected = new Map<string, any>();

    // Build unified dependency graph across all types
    const graph = new Map<string, Set<string>>();
    const itemMap = new Map<
      string,
      { type: string; name: string; item: any }
    >();

    // Add plot blocks to graph
    for (const plotBlock of context.plot_blocks) {
      graph.set(plotBlock.id, new Set());
      itemMap.set(plotBlock.id, {
        type: 'plot_block',
        name: plotBlock.name,
        item: plotBlock,
      });

      // Add requires relationships
      if (plotBlock.requires) {
        for (const req of plotBlock.requires) {
          graph.get(plotBlock.id)!.add(req);
        }
      }
    }

    // Add conditions to graph
    for (const condition of context.conditions) {
      graph.set(condition.id, new Set());
      itemMap.set(condition.id, {
        type: 'condition',
        name: condition.name,
        item: condition,
      });

      // Add requires relationships
      if (condition.requires) {
        for (const req of condition.requires) {
          graph.get(condition.id)!.add(req);
        }
      }
    }

    // Add tags to graph
    for (const tag of context.tags) {
      graph.set(tag.id, new Set());
      itemMap.set(tag.id, {
        type: 'tag',
        name: tag.name,
        item: tag,
      });

      // Add requires relationships
      if (tag.requires) {
        for (const req of tag.requires) {
          graph.get(tag.id)!.add(req);
        }
      }

      // Add enhances relationships
      if (tag.enhances) {
        for (const enh of tag.enhances) {
          graph.get(tag.id)!.add(enh);
        }
      }
    }

    // Detect cycles using DFS across all types
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const itemId of itemMap.keys()) {
      if (!visited.has(itemId)) {
        const cycle = this.dfsDetectMixedCycle(
          itemId,
          graph,
          itemMap,
          visited,
          recursionStack,
          []
        );
        if (cycle) {
          chains.push(cycle);

          // Track affected elements
          for (const node of cycle.chain) {
            affected.set(node.id, {
              id: node.id,
              type: node.type,
              circular_chains_involved: 1,
              can_break_cycle: true,
              suggested_resolution: {
                action: 'remove_dependency',
                target_relationship: 'requires',
                reason:
                  'Breaking this cross-type dependency will resolve the circular reference',
              },
            });
          }
        }
      }
    }

    return {
      has_circular_references: chains.length > 0,
      circular_chains: chains,
      affected_elements: Array.from(affected.values()),
    };
  }

  private static dfsDetectMixedCycle(
    nodeId: string,
    graph: Map<string, Set<string>>,
    itemMap: Map<string, { type: string; name: string; item: any }>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[] = []
  ): CircularReferenceResult['circular_chains'][0] | null {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = this.dfsDetectMixedCycle(
          neighbor,
          graph,
          itemMap,
          visited,
          recursionStack,
          [...path]
        );
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle, build full chain
        const cycleStartIndex = path.indexOf(neighbor);
        const cyclePath = [...path.slice(cycleStartIndex), neighbor]; // Complete the cycle

        const chain = cyclePath.map(id => {
          const item = itemMap.get(id);
          return {
            id,
            type: (item?.type || 'unknown') as
              | 'plot_block'
              | 'condition'
              | 'tag',
            name: item?.name || id,
          };
        });

        // Determine if this is truly mixed (contains multiple types)
        const types = new Set(chain.map(c => c.type));
        const isMixed = types.size > 1;

        return {
          type: isMixed ? 'mixed' : (Array.from(types)[0] as any),
          chain,
          relationship_type: isMixed ? 'mixed' : 'requires',
          severity: 'error',
          message: `Circular dependency detected across ${
            isMixed ? 'multiple types' : 'same type'
          }: ${chain.map(c => c.name).join(' -> ')}`,
        };
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return null;
  }

  /**
   * Detect hierarchy circular references
   */
  static detectHierarchyCircles(
    items: Array<{ id: string; parent_id?: string; children?: string[] }>
  ): CircularReferenceResult {
    const chains: CircularReferenceResult['circular_chains'] = [];
    const affected = new Map<string, any>();

    // Build parent-child graph
    const graph = new Map<string, Set<string>>();
    const itemMap = new Map<string, any>();

    for (const item of items) {
      itemMap.set(item.id, item);
      graph.set(item.id, new Set());

      if (item.children) {
        for (const child of item.children) {
          graph.get(item.id)!.add(child);
        }
      }
    }

    // Detect cycles in hierarchy
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const itemId of items.map(i => i.id)) {
      if (!visited.has(itemId)) {
        const cycle = this.dfsDetectHierarchyCycle(
          itemId,
          graph,
          itemMap,
          visited,
          recursionStack
        );
        if (cycle) {
          chains.push(cycle);
        }
      }
    }

    return {
      has_circular_references: chains.length > 0,
      circular_chains: chains,
      affected_elements: Array.from(affected.values()),
    };
  }

  private static dfsDetectHierarchyCycle(
    nodeId: string,
    graph: Map<string, Set<string>>,
    itemMap: Map<string, any>,
    visited: Set<string>,
    recursionStack: Set<string>
  ): CircularReferenceResult['circular_chains'][0] | null {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const children = graph.get(nodeId) || new Set();
    for (const child of children) {
      if (!visited.has(child)) {
        const cycle = this.dfsDetectHierarchyCycle(
          child,
          graph,
          itemMap,
          visited,
          recursionStack
        );
        if (cycle) return cycle;
      } else if (recursionStack.has(child)) {
        const chain = [child, nodeId].map(id => ({
          id,
          type: 'plot_block' as const,
          name: itemMap.get(id)?.name || id,
        }));

        return {
          type: 'plot_block',
          chain,
          relationship_type: 'parent_child',
          severity: 'error',
          message: `Circular hierarchy detected: ${chain
            .map(c => c.name)
            .join(' -> ')}`,
        };
      }
    }

    recursionStack.delete(nodeId);
    return null;
  }

  /**
   * Find the shortest circular path
   */
  static findShortestCircle(
    context: CircularReferenceContext
  ): CircularReferenceResult {
    const result = this.detectCircularReferences(context);

    if (result.circular_chains.length === 0) {
      return result;
    }

    // Find shortest chain
    const shortestChain = result.circular_chains.reduce((shortest, current) =>
      current.chain.length < shortest.chain.length ? current : shortest
    );

    return {
      has_circular_references: true,
      circular_chains: [shortestChain],
      affected_elements: result.affected_elements.filter(el =>
        shortestChain.chain.some(node => node.id === el.id)
      ),
    };
  }

  /**
   * Suggest circle resolutions
   */
  static suggestCircleResolution(
    context: CircularReferenceContext
  ): CircularReferenceResult {
    const result = this.detectCircularReferences(context);

    if (result.circular_chains.length === 0) {
      return result;
    }

    // Generate specific resolution suggestions
    const suggested_resolutions = result.circular_chains.map(chain => ({
      action: 'remove_dependency' as const,
      target_ids: [chain.chain[0].id],
      impact: 'minimal' as const,
      reason: `Remove dependency to break circular reference in ${chain.type}`,
    }));

    return {
      ...result,
      suggested_resolutions,
    };
  }

  /**
   * Generate resolution suggestions
   */
  private static generateResolutionSuggestions(
    chains: CircularReferenceResult['circular_chains'],
    affectedElements: CircularReferenceResult['affected_elements']
  ): CircularReferenceResult['suggested_resolutions'] {
    const resolutions: CircularReferenceResult['suggested_resolutions'] = [];

    for (const chain of chains) {
      // Suggest removing the first dependency as minimal impact
      resolutions.push({
        action: 'remove_dependency',
        target_ids: [chain.chain[0].id],
        impact: 'minimal',
        reason: `Break cycle by removing dependency from ${chain.chain[0].name}`,
      });
    }

    return resolutions;
  }
}

export type { CircularReferenceContext, CircularReferenceResult };
