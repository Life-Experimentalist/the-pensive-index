import { describe, it, expect, beforeEach } from 'vitest';

// Mock imports - these will be replaced with actual implementations
interface PlotBlock {
  id: string;
  name: string;
  category: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  requires?: string[];
  soft_requires?: string[];
  enhances?: string[];
  enabled_by?: string[];
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
  requires?: string[];
  enables?: string[];
}

interface Tag {
  id: string;
  name: string;
  fandom_id: string;
  category?: string;
  created_at: Date;
  updated_at: Date;
  requires?: string[];
  enhances?: string[];
}

interface DependencyContext {
  plot_blocks: PlotBlock[];
  conditions: PlotBlockCondition[];
  tags: Tag[];
  selected_plot_blocks?: string[];
  selected_conditions?: string[];
  selected_tags?: string[];
}

interface DependencyValidationResult {
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

// Import the actual implementation
import { DependencyValidator } from '../../src/lib/validation/dependencies';
import type {
  DependencyContext,
  DependencyValidationResult,
} from '../../src/lib/validation/dependencies';
import type { PlotBlock, PlotBlockCondition, Tag } from '../../src/types';

describe('DependencyValidator', () => {
  let samplePlotBlocks: PlotBlock[];
  let sampleConditions: PlotBlockCondition[];
  let sampleTags: Tag[];

  beforeEach(() => {
    const now = new Date();

    samplePlotBlocks = [
      {
        id: 'pb-1',
        name: 'Time Travel Setup',
        category: 'temporal',
        description: 'Establishes time travel mechanics',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pb-2',
        name: 'Marauders Era Travel',
        category: 'temporal',
        description: 'Travel to Marauders era specifically',
        created_at: now,
        updated_at: now,
        requires: ['pb-1'], // Requires Time Travel Setup
        enhances: ['pb-4'], // Enhances Character Interaction
      },
      {
        id: 'pb-3',
        name: 'Founders Era Travel',
        category: 'temporal',
        description: 'Travel to Founders era',
        created_at: now,
        updated_at: now,
        requires: ['pb-1'], // Also requires Time Travel Setup
        soft_requires: ['pb-5'], // Soft requirement for Historical Knowledge
      },
      {
        id: 'pb-4',
        name: 'Character Interaction',
        category: 'relationship',
        description: 'Deep character interactions',
        created_at: now,
        updated_at: now,
        enabled_by: ['pb-2', 'pb-3'], // Can be enabled by either time travel
      },
      {
        id: 'pb-5',
        name: 'Historical Knowledge',
        category: 'knowledge',
        description: 'Character has historical knowledge',
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
        requires: ['pb-4'], // Requires Character Interaction
        enhances: ['pb-7'], // Enhances Emotional Development
      },
      {
        id: 'pb-7',
        name: 'Emotional Development',
        category: 'character',
        description: 'Character emotional growth',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pb-8',
        name: 'Circular Dependency A',
        category: 'test',
        description: 'Test circular dependency',
        created_at: now,
        updated_at: now,
        requires: ['pb-9'], // Creates circular dependency
      },
      {
        id: 'pb-9',
        name: 'Circular Dependency B',
        category: 'test',
        description: 'Test circular dependency',
        created_at: now,
        updated_at: now,
        requires: ['pb-8'], // Completes circular dependency
      },
    ];

    sampleConditions = [
      {
        id: 'cond-1',
        plot_block_id: 'pb-2', // Marauders Era Travel
        name: 'Meet James Potter',
        description: 'Encounters James Potter',
        order: 1,
        created_at: now,
        updated_at: now,
        enables: ['cond-2'], // Enables befriending James
      },
      {
        id: 'cond-2',
        plot_block_id: 'pb-2', // Marauders Era Travel
        name: 'Befriend James Potter',
        description: 'Becomes friends with James',
        order: 2,
        created_at: now,
        updated_at: now,
        requires: ['cond-1'], // Requires meeting first
      },
      {
        id: 'cond-3',
        plot_block_id: 'pb-3', // Founders Era Travel
        name: 'Meet Godric Gryffindor',
        description: 'Encounters Godric Gryffindor',
        order: 1,
        created_at: now,
        updated_at: now,
        requires: ['pb-5'], // Requires Historical Knowledge plot block
      },
      {
        id: 'cond-4',
        plot_block_id: 'pb-6', // Romance Arc
        name: 'First Kiss',
        description: 'Romantic first kiss scene',
        order: 1,
        created_at: now,
        updated_at: now,
        requires: ['cond-2'], // Requires friendship from other plot block
      },
    ];

    sampleTags = [
      {
        id: 'tag-1',
        name: 'time-travel',
        fandom_id: 'fandom-1',
        category: 'plot',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tag-2',
        name: 'marauders-era',
        fandom_id: 'fandom-1',
        category: 'setting',
        created_at: now,
        updated_at: now,
        requires: ['tag-1'], // Requires time-travel tag
      },
      {
        id: 'tag-3',
        name: 'founders-era',
        fandom_id: 'fandom-1',
        category: 'setting',
        created_at: now,
        updated_at: now,
        requires: ['tag-1'], // Also requires time-travel tag
      },
      {
        id: 'tag-4',
        name: 'james-potter',
        fandom_id: 'fandom-1',
        category: 'character',
        created_at: now,
        updated_at: now,
        enhances: ['tag-2'], // Enhances marauders-era
      },
      {
        id: 'tag-5',
        name: 'romance',
        fandom_id: 'fandom-1',
        category: 'genre',
        created_at: now,
        updated_at: now,
        requires: ['tag-6'], // Requires relationship tag
      },
      {
        id: 'tag-6',
        name: 'relationship',
        fandom_id: 'fandom-1',
        category: 'genre',
        created_at: now,
        updated_at: now,
      },
    ];
  });

  describe('Plot Block Dependencies', () => {
    it('should validate missing hard requirements', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[1]], // Marauders Era Travel (requires Time Travel Setup)
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(result.missing_requirements).toHaveLength(1);
      expect(result.missing_requirements[0]).toMatchObject({
        type: 'plot_block',
        source_id: 'pb-2',
        required_id: 'pb-1',
        requirement_type: 'hard',
        severity: 'error',
      });
    });

    it('should validate satisfied dependencies', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[1]], // Time Travel Setup + Marauders Era Travel
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true);
      expect(result.missing_requirements).toHaveLength(0);
    });

    it('should handle soft requirements with warnings', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[2]], // Time Travel Setup + Founders Era Travel (missing Historical Knowledge)
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true); // Soft requirements don't invalidate
      expect(result.missing_requirements).toHaveLength(1);
      expect(result.missing_requirements[0]).toMatchObject({
        type: 'plot_block',
        source_id: 'pb-3',
        required_id: 'pb-5',
        requirement_type: 'soft',
        severity: 'warning',
      });
    });

    it('should detect enabled_by relationships', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [
          samplePlotBlocks[0],
          samplePlotBlocks[1],
          samplePlotBlocks[3],
        ], // Includes Character Interaction
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true);
      // Character Interaction should be enabled by Marauders Era Travel
    });
  });

  describe('Condition Dependencies', () => {
    it('should validate condition requirements within same plot block', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[1]], // Time Travel + Marauders Era
        selected_conditions: [sampleConditions[1]], // Befriend James (requires Meet James)
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.missing_requirements.some(
          req => req.type === 'condition' && req.required_id === 'cond-1'
        )
      ).toBe(true);
    });

    it('should validate cross-plot-block condition requirements', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[2]], // Time Travel + Founders Era (missing Historical Knowledge)
        selected_conditions: [sampleConditions[2]], // Meet Godric (requires Historical Knowledge plot block)
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.missing_requirements.some(
          req => req.type === 'plot_block' && req.required_id === 'pb-5'
        )
      ).toBe(true);
    });

    it('should validate complex cross-dependencies', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [
          samplePlotBlocks[0], // Time Travel Setup
          samplePlotBlocks[1], // Marauders Era Travel
          samplePlotBlocks[5], // Romance Arc
        ],
        selected_conditions: [sampleConditions[3]], // First Kiss (requires Befriend James from different plot block)
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.missing_requirements.some(
          req => req.type === 'condition' && req.required_id === 'cond-2'
        )
      ).toBe(true);
    });

    it('should handle condition enables relationships', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[1]], // Time Travel + Marauders Era
        selected_conditions: [sampleConditions[0], sampleConditions[1]], // Meet James + Befriend James
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true);
      // Meet James enables Befriend James
    });
  });

  describe('Tag Dependencies', () => {
    it('should validate tag requirements', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [],
        selected_conditions: [],
        selected_tags: ['tag-2'], // marauders-era (requires time-travel)
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.missing_requirements.some(
          req => req.type === 'tag' && req.required_id === 'tag-1'
        )
      ).toBe(true);
    });

    it('should validate satisfied tag dependencies', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [],
        selected_conditions: [],
        selected_tags: ['tag-1', 'tag-2'], // time-travel + marauders-era
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true);
      expect(result.missing_requirements).toHaveLength(0);
    });

    it('should handle tag enhancement relationships', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [],
        selected_conditions: [],
        selected_tags: ['tag-1', 'tag-2', 'tag-4'], // time-travel + marauders-era + james-potter
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true);
      // james-potter should enhance marauders-era
    });
  });

  describe('Dependency Chain Building', () => {
    it('should build complete dependency chain', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [
          samplePlotBlocks[0], // Time Travel Setup (level 0)
          samplePlotBlocks[1], // Marauders Era Travel (level 1, requires pb-1)
          samplePlotBlocks[3], // Character Interaction (level 2, enabled by pb-2)
          samplePlotBlocks[5], // Romance Arc (level 3, requires pb-4)
        ],
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.buildDependencyChain(context);

      expect(result.dependency_chain).toBeDefined();
      expect(result.dependency_chain!.length).toBe(4);

      const timeTravel = result.dependency_chain!.find(d => d.id === 'pb-1');
      const romance = result.dependency_chain!.find(d => d.id === 'pb-6');

      expect(timeTravel!.level).toBe(0); // No dependencies
      expect(romance!.level).toBe(3); // End of chain
    });

    it('should detect deep dependency chains', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [
          samplePlotBlocks[0], // Level 0
          samplePlotBlocks[1], // Level 1
          samplePlotBlocks[3], // Level 2
          samplePlotBlocks[5], // Level 3
          samplePlotBlocks[6], // Level 4 (enhanced by Romance Arc)
        ],
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.buildDependencyChain(context);

      expect(result.dependency_chain).toBeDefined();
      expect(result.dependency_chain!.some(d => d.level >= 3)).toBe(true);
    });

    it('should handle parallel dependency branches', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [
          samplePlotBlocks[0], // Time Travel Setup (level 0)
          samplePlotBlocks[1], // Marauders Era Travel (level 1)
          samplePlotBlocks[2], // Founders Era Travel (level 1, parallel branch)
          samplePlotBlocks[4], // Historical Knowledge (level 0, independent)
        ],
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.buildDependencyChain(context);

      expect(result.dependency_chain).toBeDefined();

      const level0Blocks = result.dependency_chain!.filter(d => d.level === 0);
      const level1Blocks = result.dependency_chain!.filter(d => d.level === 1);

      expect(level0Blocks.length).toBe(2); // Time Travel Setup + Historical Knowledge
      expect(level1Blocks.length).toBe(2); // Both era travels
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependencies', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[7], samplePlotBlocks[8]], // Circular Dependency A + B
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.detectCircularDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.missing_requirements.some(req =>
          req.message.includes('circular')
        )
      ).toBe(true);
    });

    it('should detect complex circular dependencies', () => {
      // Create complex circular dependency: A -> B -> C -> A
      const complexCircularBlocks = [
        {
          ...samplePlotBlocks[0],
          id: 'circle-a',
          requires: ['circle-c'], // A requires C
        },
        {
          ...samplePlotBlocks[1],
          id: 'circle-b',
          requires: ['circle-a'], // B requires A
        },
        {
          ...samplePlotBlocks[2],
          id: 'circle-c',
          requires: ['circle-b'], // C requires B, completing circle
        },
      ];

      const context: DependencyContext = {
        selected_plot_blocks: complexCircularBlocks,
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: [...samplePlotBlocks, ...complexCircularBlocks],
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.detectCircularDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.missing_requirements.some(req =>
          req.message.includes('circular')
        )
      ).toBe(true);
    });

    it('should not flag valid dependency chains as circular', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [
          samplePlotBlocks[0], // Time Travel Setup
          samplePlotBlocks[1], // Marauders Era Travel (requires Time Travel)
          samplePlotBlocks[3], // Character Interaction (enabled by Marauders Era)
        ],
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.detectCircularDependencies(context);

      expect(result.is_valid).toBe(true);
      expect(
        result.missing_requirements.every(
          req => !req.message.includes('circular')
        )
      ).toBe(true);
    });
  });

  describe('Enhancement Suggestions', () => {
    it('should suggest required additions', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[1]], // Marauders Era Travel (requires Time Travel Setup)
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.suggestEnhancements(context);

      expect(result.suggested_additions).toBeDefined();
      expect(
        result.suggested_additions!.some(
          add => add.id === 'pb-1' && add.impact === 'required'
        )
      ).toBe(true);
    });

    it('should suggest enhancement opportunities', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[1]], // Time Travel + Marauders Era
        selected_conditions: [],
        selected_tags: ['tag-1', 'tag-2'], // time-travel + marauders-era
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.suggestEnhancements(context);

      expect(result.suggested_additions).toBeDefined();
      expect(
        result.suggested_additions!.some(
          add => add.id === 'tag-4' && add.impact === 'enhancement' // james-potter enhances marauders-era
        )
      ).toBe(true);
    });

    it('should suggest soft requirement additions', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[2]], // Time Travel + Founders Era (missing soft requirement)
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.suggestEnhancements(context);

      expect(result.suggested_additions).toBeDefined();
      expect(
        result.suggested_additions!.some(
          add => add.id === 'pb-5' && add.impact === 'recommended' // Historical Knowledge
        )
      ).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle large dependency graphs efficiently', () => {
      const startTime = performance.now();

      // Create large dependency graph
      const manyPlotBlocks = Array(100)
        .fill(null)
        .map((_, i) => ({
          ...samplePlotBlocks[0],
          id: `large-pb-${i}`,
          name: `Large Plot Block ${i}`,
          requires: i > 0 ? [`large-pb-${i - 1}`] : undefined, // Chain dependency
        }));

      const context: DependencyContext = {
        selected_plot_blocks: manyPlotBlocks.slice(0, 50),
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: manyPlotBlocks,
        conditions: [],
        tags: [],
      };

      const result = DependencyValidator.validateDependencies(context);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
      expect(result).toBeDefined();
    });

    it('should handle complex circular dependency detection efficiently', () => {
      const startTime = performance.now();

      // Create complex graph with multiple potential circles
      const complexGraph = Array(50)
        .fill(null)
        .map((_, i) => ({
          ...samplePlotBlocks[0],
          id: `complex-${i}`,
          requires: [
            `complex-${(i + 1) % 50}`, // Creates large circle
            `complex-${(i + 25) % 50}`, // Creates crossing dependencies
          ],
        }));

      const context: DependencyContext = {
        selected_plot_blocks: complexGraph.slice(0, 20),
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: complexGraph,
        conditions: [],
        tags: [],
      };

      const result = DependencyValidator.detectCircularDependencies(context);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selections gracefully', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [],
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true);
      expect(result.missing_requirements).toHaveLength(0);
    });

    it('should handle missing dependency references', () => {
      const malformedPlotBlock = {
        ...samplePlotBlocks[0],
        requires: ['nonexistent-plot-block'],
      };

      const context: DependencyContext = {
        selected_plot_blocks: [malformedPlotBlock],
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: [malformedPlotBlock],
        conditions: [],
        tags: [],
      };

      expect(() => {
        DependencyValidator.validateDependencies(context);
      }).not.toThrow();
    });

    it('should handle self-dependencies', () => {
      const selfDependent = {
        ...samplePlotBlocks[0],
        requires: [samplePlotBlocks[0].id], // Self-dependency
      };

      const context: DependencyContext = {
        selected_plot_blocks: [selfDependent],
        selected_conditions: [],
        selected_tags: [],
        plot_blocks: [selfDependent],
        conditions: [],
        tags: [],
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.missing_requirements.some(
          req =>
            req.message.includes('self') || req.message.includes('circular')
        )
      ).toBe(true);
    });

    it('should handle mixed dependency types', () => {
      const context: DependencyContext = {
        selected_plot_blocks: [samplePlotBlocks[0], samplePlotBlocks[1]], // Time Travel + Marauders Era
        selected_conditions: [sampleConditions[0]], // Meet James
        selected_tags: ['tag-1', 'tag-2'], // time-travel + marauders-era
        plot_blocks: samplePlotBlocks,
        conditions: sampleConditions,
        tags: sampleTags,
      };

      const result = DependencyValidator.validateDependencies(context);

      expect(result.is_valid).toBe(true);
      expect(result.dependency_chain).toBeDefined();
      expect(result.dependency_chain!.some(d => d.type === 'plot_block')).toBe(
        true
      );
      expect(result.dependency_chain!.some(d => d.type === 'condition')).toBe(
        true
      );
      expect(result.dependency_chain!.some(d => d.type === 'tag')).toBe(true);
    });
  });
});
