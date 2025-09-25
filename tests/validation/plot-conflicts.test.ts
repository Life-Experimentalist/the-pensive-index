import { describe, it, expect, beforeEach } from 'vitest';

// Mock imports - these will be replaced with actual implementations
interface PlotBlock {
  id: string;
  name: string;
  category: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  conflicts_with?: string[];
  requires?: string[];
  excludes_categories?: string[];
  max_instances?: number;
}

interface PlotBlockCondition {
  id: string;
  plot_block_id: string;
  parent_id?: string;
  name: string;
  description: string;
  order: number;
  created_at: Date;
  updated_at: Date;
  conflicts_with?: string[];
  requires?: string[];
}

interface ConflictDetectionContext {
  selected_plot_blocks: PlotBlock[];
  selected_conditions: PlotBlockCondition[];
  all_plot_blocks: PlotBlock[];
  all_conditions: PlotBlockCondition[];
}

interface ConflictResult {
  has_conflicts: boolean;
  conflicts: Array<{
    type:
      | 'direct_exclusion'
      | 'category_exclusion'
      | 'instance_limit'
      | 'condition_conflict';
    source_id: string;
    target_id: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  suggested_resolutions?: Array<{
    action: 'remove' | 'replace' | 'modify';
    target_id: string;
    alternative_ids?: string[];
    reason: string;
  }>;
}

// Actual implementation of PlotBlockConflictDetector
class PlotBlockConflictDetector {
  static detectConflicts(context: ConflictDetectionContext): ConflictResult {
    const conflicts: ConflictResult['conflicts'] = [];
    const suggested_resolutions: ConflictResult['suggested_resolutions'] = [];

    // Check direct plot block conflicts
    const directConflicts = this.validatePlotBlockCombination(context.selected_plot_blocks, context.all_plot_blocks);
    conflicts.push(...directConflicts.conflicts);
    if (directConflicts.suggested_resolutions) {
      suggested_resolutions.push(...directConflicts.suggested_resolutions);
    }

    // Check category exclusion conflicts
    const categoryConflicts = this.detectCategoryConflicts(context.selected_plot_blocks, context.all_plot_blocks);
    conflicts.push(...categoryConflicts.conflicts);
    if (categoryConflicts.suggested_resolutions) {
      suggested_resolutions.push(...categoryConflicts.suggested_resolutions);
    }

    // Check instance limit violations
    const instanceConflicts = this.validateInstanceLimits(context.selected_plot_blocks);
    conflicts.push(...instanceConflicts.conflicts);
    if (instanceConflicts.suggested_resolutions) {
      suggested_resolutions.push(...instanceConflicts.suggested_resolutions);
    }

    // Check condition conflicts
    const conditionConflicts = this.detectConditionConflicts(
      context.selected_conditions,
      context.selected_plot_blocks
    );
    conflicts.push(...conditionConflicts.conflicts);
    if (conditionConflicts.suggested_resolutions) {
      suggested_resolutions.push(...conditionConflicts.suggested_resolutions);
    }

    // Check for missing required dependencies
    const missingDeps = this.checkMissingRequirements(context);
    conflicts.push(...missingDeps.conflicts);
    if (missingDeps.suggested_resolutions) {
      suggested_resolutions.push(...missingDeps.suggested_resolutions);
    }

    // Sort conflicts by severity (errors first, then warnings)
    conflicts.sort((a, b) => {
      if (a.severity === 'error' && b.severity === 'warning') return -1;
      if (a.severity === 'warning' && b.severity === 'error') return 1;
      return 0;
    });

    return {
      has_conflicts: conflicts.length > 0,
      conflicts,
      suggested_resolutions: suggested_resolutions.length > 0 ? suggested_resolutions : undefined,
    };
  }

  static validatePlotBlockCombination(plotBlocks: PlotBlock[], allPlotBlocks: PlotBlock[] = []): ConflictResult {
    const conflicts: ConflictResult['conflicts'] = [];
    const suggested_resolutions: ConflictResult['suggested_resolutions'] = [];
    const processedPairs = new Set<string>();

    // Check for direct conflicts_with relationships
    for (let i = 0; i < plotBlocks.length; i++) {
      for (let j = i + 1; j < plotBlocks.length; j++) {
        const block1 = plotBlocks[i];
        const block2 = plotBlocks[j];

        // Create a unique key for this pair to avoid duplicates
        const pairKey = [block1.id, block2.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Check if either block conflicts with the other
        const block1ConflictsWithBlock2 = block1.conflicts_with?.includes(block2.id);
        const block2ConflictsWithBlock1 = block2.conflicts_with?.includes(block1.id);

        if (block1ConflictsWithBlock2 || block2ConflictsWithBlock1) {
          const sourceBlock = block1ConflictsWithBlock2 ? block1 : block2;
          const targetBlock = block1ConflictsWithBlock2 ? block2 : block1;

          conflicts.push({
            type: 'direct_exclusion',
            source_id: sourceBlock.id,
            target_id: targetBlock.id,
            message: `"${sourceBlock.name}" conflicts with "${targetBlock.name}"`,
            severity: 'error',
          });

          // Find compatible alternatives from all available blocks
          const alternativeBlocks = allPlotBlocks.filter(b =>
            b.id !== targetBlock.id &&
            b.id !== sourceBlock.id &&
            !plotBlocks.some(selected => selected.id === b.id) && // Not already selected
            !sourceBlock.conflicts_with?.includes(b.id) // Not conflicting with source
          );

          suggested_resolutions.push({
            action: 'remove',
            target_id: targetBlock.id,
            alternative_ids: alternativeBlocks.length > 0 ? alternativeBlocks.map(b => b.id) : undefined,
            reason: `Remove "${targetBlock.name}" due to conflict with "${sourceBlock.name}"`,
          });
        }
      }
    }

    return {
      has_conflicts: conflicts.length > 0,
      conflicts,
      suggested_resolutions: suggested_resolutions.length > 0 ? suggested_resolutions : undefined,
    };
  }

  static detectCategoryConflicts(plotBlocks: PlotBlock[], allPlotBlocks: PlotBlock[] = []): ConflictResult {
    const conflicts: ConflictResult['conflicts'] = [];
    const suggested_resolutions: ConflictResult['suggested_resolutions'] = [];

    for (let i = 0; i < plotBlocks.length; i++) {
      const block = plotBlocks[i];

      if (block.excludes_categories && block.excludes_categories.length > 0) {
        // Find other blocks that belong to excluded categories
        for (let j = 0; j < plotBlocks.length; j++) {
          if (i === j) continue;

          const otherBlock = plotBlocks[j];
          if (block.excludes_categories.includes(otherBlock.category)) {
            conflicts.push({
              type: 'category_exclusion',
              source_id: block.id,
              target_id: otherBlock.id,
              message: `"${block.name}" excludes category "${otherBlock.category}" containing "${otherBlock.name}"`,
              severity: 'error',
            });

            // Find alternative blocks from non-excluded categories
            const alternativeBlocks = allPlotBlocks.filter(b =>
              b.id !== otherBlock.id &&
              b.id !== block.id &&
              !plotBlocks.some(selected => selected.id === b.id) && // Not already selected
              !block.excludes_categories!.includes(b.category) // Not from excluded category
            );

            suggested_resolutions.push({
              action: 'remove',
              target_id: otherBlock.id,
              alternative_ids: alternativeBlocks.length > 0 ? alternativeBlocks.map(b => b.id) : undefined,
              reason: `Remove "${otherBlock.name}" from excluded category "${otherBlock.category}"`,
            });
          }
        }
      }
    }

    return {
      has_conflicts: conflicts.length > 0,
      conflicts,
      suggested_resolutions: suggested_resolutions.length > 0 ? suggested_resolutions : undefined,
    };
  }

  static validateInstanceLimits(plotBlocks: PlotBlock[]): ConflictResult {
    const conflicts: ConflictResult['conflicts'] = [];
    const suggested_resolutions: ConflictResult['suggested_resolutions'] = [];

    // Group plot blocks by name to count instances
    const instanceCounts = new Map<string, PlotBlock[]>();

    for (const block of plotBlocks) {
      if (!instanceCounts.has(block.name)) {
        instanceCounts.set(block.name, []);
      }
      instanceCounts.get(block.name)!.push(block);
    }

    // Check instance limits
    for (const [name, instances] of instanceCounts) {
      // Find the first instance that has max_instances defined
      const limitBlock = instances.find(block => typeof block.max_instances === 'number');

      if (limitBlock && typeof limitBlock.max_instances === 'number') {
        if (instances.length > limitBlock.max_instances) {
          // Create conflict for the excess instances
          const excessInstances = instances.slice(limitBlock.max_instances);

          conflicts.push({
            type: 'instance_limit',
            source_id: limitBlock.id,
            target_id: excessInstances[0].id,
            message: `Too many instances of "${name}": ${instances.length} found, maximum ${limitBlock.max_instances} allowed`,
            severity: 'error',
          });

          suggested_resolutions.push({
            action: 'remove',
            target_id: excessInstances[0].id,
            alternative_ids: excessInstances.slice(1).map(b => b.id),
            reason: `Remove excess instances of "${name}" to stay within limit of ${limitBlock.max_instances}`,
          });
        }
      }
    }

    return {
      has_conflicts: conflicts.length > 0,
      conflicts,
      suggested_resolutions: suggested_resolutions.length > 0 ? suggested_resolutions : undefined,
    };
  }

  static detectConditionConflicts(
    conditions: PlotBlockCondition[],
    plotBlocks: PlotBlock[]
  ): ConflictResult {
    const conflicts: ConflictResult['conflicts'] = [];
    const suggested_resolutions: ConflictResult['suggested_resolutions'] = [];

    // Check conflicts between conditions
    for (let i = 0; i < conditions.length; i++) {
      for (let j = i + 1; j < conditions.length; j++) {
        const cond1 = conditions[i];
        const cond2 = conditions[j];

        // Check if conditions are mutually exclusive
        if (cond1.conflicts_with?.includes(cond2.id)) {
          conflicts.push({
            type: 'condition_conflict',
            source_id: cond1.id,
            target_id: cond2.id,
            message: `Condition "${cond1.name}" conflicts with "${cond2.name}"`,
            severity: 'error',
          });
          suggested_resolutions.push({
            action: 'remove',
            target_id: cond2.id,
            reason: `Remove conflicting condition "${cond2.name}"`,
          });
        }

        if (cond2.conflicts_with?.includes(cond1.id)) {
          conflicts.push({
            type: 'condition_conflict',
            source_id: cond2.id,
            target_id: cond1.id,
            message: `Condition "${cond2.name}" conflicts with "${cond1.name}"`,
            severity: 'error',
          });
          suggested_resolutions.push({
            action: 'remove',
            target_id: cond1.id,
            reason: `Remove conflicting condition "${cond1.name}"`,
          });
        }
      }
    }

    return {
      has_conflicts: conflicts.length > 0,
      conflicts,
      suggested_resolutions: suggested_resolutions.length > 0 ? suggested_resolutions : undefined,
    };
  }

  static checkMissingRequirements(context: ConflictDetectionContext): ConflictResult {
    const conflicts: ConflictResult['conflicts'] = [];
    const suggested_resolutions: ConflictResult['suggested_resolutions'] = [];

    const selectedBlockIds = new Set(context.selected_plot_blocks.map(b => b.id));
    const selectedConditionIds = new Set(context.selected_conditions.map(c => c.id));

    // Check plot block requirements
    for (const block of context.selected_plot_blocks) {
      if (block.requires && block.requires.length > 0) {
        for (const requiredId of block.requires) {
          if (!selectedBlockIds.has(requiredId) && !selectedConditionIds.has(requiredId)) {
            // Find the required block/condition in all available options
            const requiredBlock = context.all_plot_blocks.find(b => b.id === requiredId);
            const requiredCondition = context.all_conditions.find(c => c.id === requiredId);

            const requiredName = requiredBlock?.name || requiredCondition?.name || requiredId;

            conflicts.push({
              type: 'condition_conflict',
              source_id: block.id,
              target_id: requiredId,
              message: `"${block.name}" requires "${requiredName}" which is not selected`,
              severity: 'error',
            });

            suggested_resolutions.push({
              action: 'modify',
              target_id: requiredId,
              reason: `Add required dependency "${requiredName}" for "${block.name}"`,
            });
          }
        }
      }
    }

    // Check condition requirements
    for (const condition of context.selected_conditions) {
      if (condition.requires && condition.requires.length > 0) {
        for (const requiredId of condition.requires) {
          if (!selectedBlockIds.has(requiredId) && !selectedConditionIds.has(requiredId)) {
            const requiredBlock = context.all_plot_blocks.find(b => b.id === requiredId);
            const requiredCondition = context.all_conditions.find(c => c.id === requiredId);

            const requiredName = requiredBlock?.name || requiredCondition?.name || requiredId;

            conflicts.push({
              type: 'condition_conflict',
              source_id: condition.id,
              target_id: requiredId,
              message: `Condition "${condition.name}" requires "${requiredName}" which is not selected`,
              severity: 'error',
            });

            suggested_resolutions.push({
              action: 'modify',
              target_id: requiredId,
              reason: `Add required dependency "${requiredName}" for condition "${condition.name}"`,
            });
          }
        }
      }
    }

    return {
      has_conflicts: conflicts.length > 0,
      conflicts,
      suggested_resolutions: suggested_resolutions.length > 0 ? suggested_resolutions : undefined,
    };
  }
}

describe('PlotBlockConflictDetector', () => {
  let samplePlotBlocks: PlotBlock[];
  let sampleConditions: PlotBlockCondition[];

  beforeEach(() => {
    const now = new Date();

    samplePlotBlocks = [
      {
        id: 'pb-1',
        name: 'Goblin Inheritance',
        category: 'inheritance',
        description: 'Harry discovers his true inheritance through Gringotts',
        created_at: now,
        updated_at: now,
        conflicts_with: ['pb-3'], // Conflicts with Muggle Raised
        max_instances: 1,
      },
      {
        id: 'pb-2',
        name: 'Time Travel',
        category: 'temporal',
        description: 'Character travels back in time',
        created_at: now,
        updated_at: now,
        excludes_categories: ['multiverse'], // Cannot coexist with multiverse plots
        max_instances: 1,
      },
      {
        id: 'pb-3',
        name: 'Muggle Raised',
        category: 'background',
        description: 'Character raised in muggle world',
        created_at: now,
        updated_at: now,
        conflicts_with: ['pb-1'], // Conflicts with Goblin Inheritance
      },
      {
        id: 'pb-4',
        name: 'Multiverse Travel',
        category: 'multiverse',
        description: 'Character travels between alternate universes',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pb-5',
        name: 'Dimensional Shift',
        category: 'multiverse',
        description: 'Reality shifts between dimensions',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pb-6',
        name: 'Romance Arc',
        category: 'relationship',
        description: 'Central romantic plot',
        created_at: now,
        updated_at: now,
        requires: ['pb-7'], // Requires Character Development
      },
      {
        id: 'pb-7',
        name: 'Character Development',
        category: 'character',
        description: 'Significant character growth',
        created_at: now,
        updated_at: now,
      },
    ];

    sampleConditions = [
      {
        id: 'cond-1',
        plot_block_id: 'pb-1', // Goblin Inheritance
        name: 'Black Lordship',
        description: 'Inherits Black family lordship',
        order: 1,
        created_at: now,
        updated_at: now,
        conflicts_with: ['cond-3'], // Cannot have both Black and Malfoy lordships
      },
      {
        id: 'cond-2',
        plot_block_id: 'pb-1', // Goblin Inheritance
        parent_id: 'cond-1', // Child of Black Lordship
        name: 'Grimmauld Place Control',
        description: 'Gains control of Black family home',
        order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cond-3',
        plot_block_id: 'pb-1', // Goblin Inheritance
        name: 'Malfoy Lordship',
        description: 'Inherits Malfoy family lordship through conquest',
        order: 2,
        created_at: now,
        updated_at: now,
        conflicts_with: ['cond-1'], // Cannot have both lordships
        requires: ['cond-4'], // Requires defeating Lucius
      },
      {
        id: 'cond-4',
        plot_block_id: 'pb-1', // Goblin Inheritance
        name: 'Lucius Defeat',
        description: 'Defeats Lucius Malfoy in combat',
        order: 1,
        created_at: now,
        updated_at: now,
      },
    ];
  });

  describe('Direct Plot Block Conflicts', () => {
    it('should detect explicitly conflicting plot blocks', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[2]], // Goblin Inheritance + Muggle Raised
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        type: 'direct_exclusion',
        source_id: 'pb-1',
        target_id: 'pb-3',
        message: expect.stringContaining('conflicts with'),
        severity: 'error',
      });
    });

    it('should detect bidirectional conflicts', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[2], samplePlotBlocks[0]], // Reverse order
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('direct_exclusion');
    });

    it('should not detect conflicts between compatible plot blocks', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[6]], // Goblin Inheritance + Character Development
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('Category Exclusion Conflicts', () => {
    it('should detect category exclusion conflicts', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[1], samplePlotBlocks[3]], // Time Travel + Multiverse Travel
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        type: 'category_exclusion',
        source_id: 'pb-2',
        target_id: 'pb-4',
        message: expect.stringContaining('excludes category'),
        severity: 'error',
      });
    });

    it('should detect multiple category conflicts', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [
          samplePlotBlocks[1], // Time Travel (excludes multiverse)
          samplePlotBlocks[3], // Multiverse Travel
          samplePlotBlocks[4], // Dimensional Shift (also multiverse)
        ],
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
      expect(result.conflicts.every(c => c.type === 'category_exclusion')).toBe(
        true
      );
    });

    it('should not detect category conflicts when categories are compatible', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[6]], // Inheritance + Character Development
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(false);
    });
  });

  describe('Instance Limit Validation', () => {
    it('should detect instance limit violations', () => {
      const duplicateInheritance = {
        ...samplePlotBlocks[0],
        id: 'pb-1-duplicate',
      };

      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0], duplicateInheritance], // Two Goblin Inheritance
        selected_conditions: [],
        all_plot_blocks: [...samplePlotBlocks, duplicateInheritance],
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts.some(c => c.type === 'instance_limit')).toBe(
        true
      );
    });

    it('should allow multiple instances when no limit is set', () => {
      const duplicateCharDev = { ...samplePlotBlocks[6], id: 'pb-7-duplicate' };

      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[6], duplicateCharDev], // Two Character Development
        selected_conditions: [],
        all_plot_blocks: [...samplePlotBlocks, duplicateCharDev],
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(false);
    });

    it('should correctly count instances by name rather than ID', () => {
      const sameNameDifferentId = {
        ...samplePlotBlocks[0],
        id: 'pb-different-id',
        name: 'Goblin Inheritance', // Same name
      };

      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0], sameNameDifferentId],
        selected_conditions: [],
        all_plot_blocks: [...samplePlotBlocks, sameNameDifferentId],
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts.some(c => c.type === 'instance_limit')).toBe(
        true
      );
    });
  });

  describe('Condition Conflicts', () => {
    it('should detect conflicting conditions within same plot block', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0]], // Goblin Inheritance
        selected_conditions: [sampleConditions[0], sampleConditions[2]], // Black + Malfoy Lordships
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts.some(c => c.type === 'condition_conflict')).toBe(
        true
      );
      expect(
        result.conflicts.some(
          c => c.source_id === 'cond-1' && c.target_id === 'cond-3'
        )
      ).toBe(true);
    });

    it('should allow compatible conditions', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0]], // Goblin Inheritance
        selected_conditions: [sampleConditions[0], sampleConditions[1]], // Black Lordship + Grimmauld Place
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(false);
    });

    it('should detect missing required conditions', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0]], // Goblin Inheritance
        selected_conditions: [sampleConditions[2]], // Malfoy Lordship (requires Lucius Defeat)
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(
        result.conflicts.some(
          c => c.message.includes('requires') && c.target_id === 'cond-4'
        )
      ).toBe(true);
    });
  });

  describe('Missing Requirements', () => {
    it('should detect missing required plot blocks', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[5]], // Romance Arc (requires Character Development)
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(
        result.conflicts.some(
          c => c.message.includes('requires') && c.target_id === 'pb-7'
        )
      ).toBe(true);
    });

    it('should not flag requirements when they are satisfied', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[5], samplePlotBlocks[6]], // Romance Arc + Character Development
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(false);
    });
  });

  describe('Complex Conflict Scenarios', () => {
    it('should detect multiple types of conflicts simultaneously', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [
          samplePlotBlocks[0], // Goblin Inheritance
          samplePlotBlocks[1], // Time Travel (excludes multiverse)
          samplePlotBlocks[2], // Muggle Raised (conflicts with Goblin Inheritance)
          samplePlotBlocks[3], // Multiverse Travel (conflicts with Time Travel)
          samplePlotBlocks[5], // Romance Arc (missing Character Development requirement)
        ],
        selected_conditions: [sampleConditions[0], sampleConditions[2]], // Conflicting lordships
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(1);

      const conflictTypes = result.conflicts.map(c => c.type);
      expect(conflictTypes).toContain('direct_exclusion');
      expect(conflictTypes).toContain('category_exclusion');
      expect(conflictTypes).toContain('condition_conflict');
    });

    it('should prioritize conflict severity correctly', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[2]], // Direct conflict
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts[0].severity).toBe('error');
    });
  });

  describe('Conflict Resolution Suggestions', () => {
    it('should provide resolution suggestions for conflicts', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[2]], // Conflicting blocks
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.suggested_resolutions).toBeDefined();
      expect(result.suggested_resolutions!.length).toBeGreaterThan(0);
      expect(result.suggested_resolutions![0]).toMatchObject({
        action: expect.stringMatching(/^(remove|replace|modify)$/),
        target_id: expect.any(String),
        reason: expect.any(String),
      });
    });

    it('should suggest alternatives when removing conflicting elements', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[1], samplePlotBlocks[3]], // Category conflict
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.suggested_resolutions).toBeDefined();

      const removeAction = result.suggested_resolutions!.find(
        r => r.action === 'remove'
      );
      expect(removeAction).toBeDefined();
      expect(removeAction!.alternative_ids).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should detect conflicts within performance requirements', () => {
      const startTime = performance.now();

      // Create large conflict scenario
      const manyPlotBlocks = Array(50)
        .fill(null)
        .map((_, i) => ({
          ...samplePlotBlocks[0],
          id: `pb-${i}`,
          name: `Plot Block ${i}`,
          conflicts_with: i % 2 === 0 ? [`pb-${i + 1}`] : [`pb-${i - 1}`],
        }));

      const context: ConflictDetectionContext = {
        selected_plot_blocks: manyPlotBlocks.slice(0, 20),
        selected_conditions: [],
        all_plot_blocks: manyPlotBlocks,
        all_conditions: [],
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
      expect(result).toBeDefined();
    });

    it('should handle large condition sets efficiently', () => {
      const startTime = performance.now();

      const manyConditions = Array(100)
        .fill(null)
        .map((_, i) => ({
          ...sampleConditions[0],
          id: `cond-${i}`,
          name: `Condition ${i}`,
          conflicts_with: i % 3 === 0 ? [`cond-${i + 1}`] : undefined,
        }));

      const context: ConflictDetectionContext = {
        selected_plot_blocks: [samplePlotBlocks[0]],
        selected_conditions: manyConditions.slice(0, 30),
        all_plot_blocks: samplePlotBlocks,
        all_conditions: manyConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selections gracefully', () => {
      const context: ConflictDetectionContext = {
        selected_plot_blocks: [],
        selected_conditions: [],
        all_plot_blocks: samplePlotBlocks,
        all_conditions: sampleConditions,
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle malformed conflict references', () => {
      const malformedPlotBlock = {
        ...samplePlotBlocks[0],
        conflicts_with: ['nonexistent-id'],
      };

      const context: ConflictDetectionContext = {
        selected_plot_blocks: [malformedPlotBlock, samplePlotBlocks[1]],
        selected_conditions: [],
        all_plot_blocks: [malformedPlotBlock, ...samplePlotBlocks.slice(1)],
        all_conditions: sampleConditions,
      };

      expect(() => {
        PlotBlockConflictDetector.detectConflicts(context);
      }).not.toThrow();
    });

    it('should handle circular conflict references', () => {
      const circularA = {
        ...samplePlotBlocks[0],
        id: 'circular-a',
        conflicts_with: ['circular-b'],
      };

      const circularB = {
        ...samplePlotBlocks[1],
        id: 'circular-b',
        conflicts_with: ['circular-a'],
      };

      const context: ConflictDetectionContext = {
        selected_plot_blocks: [circularA, circularB],
        selected_conditions: [],
        all_plot_blocks: [circularA, circularB],
        all_conditions: [],
      };

      const result = PlotBlockConflictDetector.detectConflicts(context);

      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1); // Should detect once, not infinite loop
    });

    it('should handle self-referencing conflicts', () => {
      const selfReferencing = {
        ...samplePlotBlocks[0],
        conflicts_with: [samplePlotBlocks[0].id], // Self-conflict
      };

      const context: ConflictDetectionContext = {
        selected_plot_blocks: [selfReferencing],
        selected_conditions: [],
        all_plot_blocks: [selfReferencing],
        all_conditions: [],
      };

      expect(() => {
        PlotBlockConflictDetector.detectConflicts(context);
      }).not.toThrow();
    });
  });
});
