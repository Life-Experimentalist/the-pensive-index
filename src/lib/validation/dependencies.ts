import { PlotBlock, PlotBlockCondition, Tag } from '@/types';

export interface DependencyContext {
  plot_blocks: PlotBlock[];
  conditions: PlotBlockCondition[];
  tags: Tag[];
  selected_plot_blocks?: string[];
  selected_conditions?: string[];
  selected_tags?: string[];
}

export interface DependencyValidationResult {
  is_valid: boolean;
  missing_requirements: Array<{
    type: 'plot_block' | 'condition' | 'tag';
    source_id: string;
    required_id: string;
    requirement_type: 'hard' | 'soft' | 'enhancement';
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  dependency_chain?: Array<{
    id: string;
    type: 'plot_block' | 'condition' | 'tag';
    dependencies: string[];
    level: number;
  }>;
  suggested_additions?: Array<{
    id: string;
    type: 'plot_block' | 'condition' | 'tag';
    name: string;
    reason: string;
    impact: 'required' | 'recommended' | 'enhancement';
  }>;
}

export class DependencyValidator {
  static validateDependencies(
    context: DependencyContext
  ): DependencyValidationResult {
    const missing_requirements: DependencyValidationResult['missing_requirements'] =
      [];
    const dependency_chain: DependencyValidationResult['dependency_chain'] = [];

    // Create maps for quick lookup
    const plotBlockMap = new Map(context.plot_blocks.map(pb => [pb.id, pb]));
    const conditionMap = new Map(context.conditions.map(c => [c.id, c]));
    const tagMap = new Map(context.tags.map(t => [t.id, t]));

    const selectedPlotBlocks = new Set(context.selected_plot_blocks || []);
    const selectedConditions = new Set(context.selected_conditions || []);
    const selectedTags = new Set(context.selected_tags || []);

    // Validate plot block dependencies
    for (const pbId of selectedPlotBlocks) {
      const plotBlock = plotBlockMap.get(pbId);
      if (!plotBlock) continue;

      // Check hard requirements
      if (plotBlock.requires) {
        for (const requiredId of plotBlock.requires) {
          if (!selectedPlotBlocks.has(requiredId)) {
            missing_requirements.push({
              type: 'plot_block',
              source_id: pbId,
              required_id: requiredId,
              requirement_type: 'hard',
              message: `${plotBlock.name} requires ${
                plotBlockMap.get(requiredId)?.name || requiredId
              }`,
              severity: 'error',
            });
          }
        }
      }

      // Check soft requirements
      if ('soft_requires' in plotBlock && plotBlock.soft_requires) {
        for (const requiredId of plotBlock.soft_requires) {
          if (!selectedPlotBlocks.has(requiredId)) {
            missing_requirements.push({
              type: 'plot_block',
              source_id: pbId,
              required_id: requiredId,
              requirement_type: 'soft',
              message: `${plotBlock.name} is enhanced by ${
                plotBlockMap.get(requiredId)?.name || requiredId
              }`,
              severity: 'warning',
            });
          }
        }
      }

      // Build dependency chain entry
      const dependencies = [
        ...(plotBlock.requires || []),
        ...((plotBlock as any).soft_requires || []),
      ];
      if (dependencies.length > 0) {
        dependency_chain.push({
          id: pbId,
          type: 'plot_block',
          dependencies,
          level: this.calculateDependencyLevel(pbId, plotBlockMap, new Set()),
        });
      }
    }

    // Validate condition dependencies
    for (const condId of selectedConditions) {
      const condition = conditionMap.get(condId);
      if (!condition) continue;

      if (condition.requires) {
        for (const requiredId of condition.requires) {
          if (!selectedConditions.has(requiredId)) {
            missing_requirements.push({
              type: 'condition',
              source_id: condId,
              required_id: requiredId,
              requirement_type: 'hard',
              message: `${condition.name} requires ${
                conditionMap.get(requiredId)?.name || requiredId
              }`,
              severity: 'error',
            });
          }
        }
      }
    }

    // Validate tag dependencies
    for (const tagId of selectedTags) {
      const tag = tagMap.get(tagId);
      if (!tag) continue;

      if (tag.requires) {
        for (const requiredId of tag.requires) {
          if (!selectedTags.has(requiredId)) {
            missing_requirements.push({
              type: 'tag',
              source_id: tagId,
              required_id: requiredId,
              requirement_type: 'hard',
              message: `${tag.name} requires ${
                tagMap.get(requiredId)?.name || requiredId
              }`,
              severity: 'error',
            });
          }
        }
      }
    }

    const is_valid =
      missing_requirements.filter(req => req.severity === 'error').length === 0;

    return {
      is_valid,
      missing_requirements,
      dependency_chain,
      suggested_additions: [],
    };
  }

  private static calculateDependencyLevel(
    id: string,
    plotBlockMap: Map<string, PlotBlock>,
    visited: Set<string>
  ): number {
    if (visited.has(id)) return 0; // Circular reference protection
    visited.add(id);

    const plotBlock = plotBlockMap.get(id);
    if (!plotBlock || !plotBlock.requires) return 0;

    let maxLevel = 0;
    for (const depId of plotBlock.requires) {
      const depLevel = this.calculateDependencyLevel(depId, plotBlockMap, new Set(visited));
      maxLevel = Math.max(maxLevel, depLevel + 1);
    }

    return maxLevel;
  }

  static detectCircularDependencies(context: DependencyContext): DependencyValidationResult {
    const missing_requirements: DependencyValidationResult['missing_requirements'] = [];
    const plotBlockMap = new Map(context.plot_blocks.map(pb => [pb.id, pb]));

    // Detect circular dependencies in plot blocks
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircular = (id: string, path: string[]): boolean => {
      if (recursionStack.has(id)) {
        // Found circular dependency
        const circleStart = path.indexOf(id);
        const circularPath = path.slice(circleStart);
        missing_requirements.push({
          type: 'plot_block',
          source_id: id,
          required_id: circularPath[circularPath.length - 1],
          requirement_type: 'hard',
          message: `Circular dependency detected: ${circularPath.join(
            ' -> '
          )} -> ${id}`,
          severity: 'error',
        });
        return true;
      }

      if (visited.has(id)) return false;

      visited.add(id);
      recursionStack.add(id);

      const plotBlock = plotBlockMap.get(id);
      if (plotBlock?.requires) {
        for (const depId of plotBlock.requires) {
          if (hasCircular(depId, [...path, id])) {
            return true;
          }
        }
      }

      recursionStack.delete(id);
      return false;
    };

    let circularFound = false;
    for (const plotBlock of context.plot_blocks) {
      if (!visited.has(plotBlock.id)) {
        if (hasCircular(plotBlock.id, [])) {
          circularFound = true;
        }
      }
    }

    return {
      is_valid: !circularFound,
      missing_requirements,
      dependency_chain: [],
      suggested_additions: []
    };
  }

  static buildDependencyChain(context: DependencyContext): DependencyValidationResult {
    const dependency_chain: DependencyValidationResult['dependency_chain'] = [];
    const plotBlockMap = new Map(context.plot_blocks.map(pb => [pb.id, pb]));

    // Build complete dependency chain for all plot blocks
    for (const plotBlock of context.plot_blocks) {
      const dependencies = plotBlock.requires || [];
      if (dependencies.length > 0) {
        dependency_chain.push({
          id: plotBlock.id,
          type: 'plot_block',
          dependencies,
          level: this.calculateDependencyLevel(
            plotBlock.id,
            plotBlockMap,
            new Set()
          ),
        });
      }
    }

    return {
      is_valid: true,
      missing_requirements: [],
      dependency_chain,
      suggested_additions: [],
    };
  }

  static suggestEnhancements(context: DependencyContext): DependencyValidationResult {
    const suggested_additions: DependencyValidationResult['suggested_additions'] = [];
    const plotBlockMap = new Map(context.plot_blocks.map(pb => [pb.id, pb]));
    const selectedPlotBlocks = new Set(context.selected_plot_blocks || []);

    // Suggest plot blocks that could enhance selected ones
    for (const pbId of selectedPlotBlocks) {
      const plotBlock = plotBlockMap.get(pbId);
      if (!plotBlock) continue;

      // Look for plot blocks that this one enhances
      if (plotBlock.enhances) {
        for (const enhancedId of plotBlock.enhances) {
          if (!selectedPlotBlocks.has(enhancedId)) {
            const enhancedPB = plotBlockMap.get(enhancedId);
            if (enhancedPB) {
              suggested_additions.push({
                id: enhancedId,
                type: 'plot_block',
                name: enhancedPB.name,
                reason: `Enhanced by selected ${plotBlock.name}`,
                impact: 'recommended',
              });
            }
          }
        }
      }

      // Look for plot blocks that are enabled by this one
      if ('enabled_by' in plotBlock && plotBlock.enabled_by) {
        // This is handled in the enhancement suggestions
      }
    }

    // Look for plot blocks that could be enabled by current selection
    for (const plotBlock of context.plot_blocks) {
      if (
        !selectedPlotBlocks.has(plotBlock.id) &&
        'enabled_by' in plotBlock &&
        plotBlock.enabled_by
      ) {
        const enabledBy = plotBlock.enabled_by as string[];
        const canEnable = enabledBy.some(pbId => selectedPlotBlocks.has(pbId));
        if (canEnable) {
          suggested_additions.push({
            id: plotBlock.id,
            type: 'plot_block',
            name: plotBlock.name,
            reason: `Can be enabled by current selection`,
            impact: 'enhancement',
          });
        }
      }
    }

    return {
      is_valid: true,
      missing_requirements: [],
      dependency_chain: [],
      suggested_additions
    };
  }
}
