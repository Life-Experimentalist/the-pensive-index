import { describe, it, expect, beforeEach } from 'vitest';

// Import the actual implementation and types
import { PlotBlockConflictDetector } from '../../src/lib/validation/plot-conflicts';
import type {
  ConflictDetectionContext,
  ConflictResult,
} from '../../src/lib/validation/plot-conflicts';
import type { PlotBlock, PlotBlockCondition } from '../../src/types';

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
        fandom_id: 'test-fandom',
        is_active: true,
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
        fandom_id: 'test-fandom',
        is_active: true,
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
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        conflicts_with: ['pb-1'], // Conflicts with Goblin Inheritance
      },
      {
        id: 'pb-4',
        name: 'Multiverse Travel',
        category: 'multiverse',
        description: 'Character travels between alternate universes',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pb-5',
        name: 'Dimensional Shift',
        category: 'multiverse',
        description: 'Reality shifts between dimensions',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pb-6',
        name: 'Romance Arc',
        category: 'relationship',
        description: 'Central romantic plot',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-7'], // Requires Character Development
      },
      {
        id: 'pb-7',
        name: 'Character Development',
        category: 'character',
        description: 'Significant character growth',
        fandom_id: 'test-fandom',
        is_active: true,
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
        is_active: true,
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
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cond-3',
        plot_block_id: 'pb-1', // Goblin Inheritance
        name: 'Malfoy Lordship',
        description: 'Inherits Malfoy family lordship through conquest',
        order: 2,
        is_active: true,
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
        is_active: true,
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
        r => r.action === 'remove_element'
      );
      expect(removeAction).toBeDefined();
      expect(removeAction!.alternatives).toBeDefined();
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
