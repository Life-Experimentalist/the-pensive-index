import { describe, it, expect, beforeEach } from 'vitest';
import { CircularReferenceDetector } from '../../src/lib/validation/circular-references';
import type {
  CircularReferenceContext,
  CircularReferenceResult,
} from '../../src/lib/validation/circular-references';
import type { PlotBlock, PlotBlockCondition, Tag } from '../../src/types';

// Using actual types from src/types and src/lib/validation/circular-references

// Using actual implementation from src/lib/validation/circular-references

describe('CircularReferenceDetector', () => {
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
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pb-2',
        name: 'Marauders Era Travel',
        category: 'temporal',
        description: 'Travel to Marauders era',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-1'],
      },
      // Simple circular reference: A -> B -> A
      {
        id: 'pb-circle-a',
        name: 'Circular A',
        category: 'test',
        description: 'First element in circular chain',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-circle-b'], // A requires B
      },
      {
        id: 'pb-circle-b',
        name: 'Circular B',
        category: 'test',
        description: 'Second element in circular chain',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-circle-a'], // B requires A (creates circle)
      },
      // Complex circular reference: A -> B -> C -> A
      {
        id: 'pb-complex-a',
        name: 'Complex Circular A',
        category: 'test',
        description: 'First in complex chain',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-complex-b'],
      },
      {
        id: 'pb-complex-b',
        name: 'Complex Circular B',
        category: 'test',
        description: 'Second in complex chain',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-complex-c'],
      },
      {
        id: 'pb-complex-c',
        name: 'Complex Circular C',
        category: 'test',
        description: 'Third in complex chain',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-complex-a'], // Completes circle
      },
      // Self-reference
      {
        id: 'pb-self',
        name: 'Self Reference',
        category: 'test',
        description: 'References itself',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['pb-self'], // Self-reference
      },
      // Hierarchical structure with circular parent-child
      {
        id: 'pb-parent',
        name: 'Parent Block',
        category: 'test',
        description: 'Parent in hierarchy',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        children: ['pb-child'],
      },
      {
        id: 'pb-child',
        name: 'Child Block',
        category: 'test',
        description: 'Child in hierarchy',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: now,
        updated_at: now,
        parent_id: 'pb-parent',
        requires: ['pb-parent'], // Child requires parent (creates hierarchy circle)
      },
    ];

    sampleConditions = [
      {
        id: 'cond-1',
        plot_block_id: 'pb-1',
        name: 'Time Travel Preparation',
        description: 'Prepares for time travel',
        order: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cond-2',
        plot_block_id: 'pb-2',
        name: 'Arrive in Marauders Era',
        description: 'Successfully arrives in past',
        order: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['cond-1'],
      },
      // Circular condition references
      {
        id: 'cond-circle-a',
        plot_block_id: 'pb-1',
        name: 'Condition Circular A',
        description: 'First condition in circle',
        order: 2,
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['cond-circle-b'],
      },
      {
        id: 'cond-circle-b',
        plot_block_id: 'pb-1',
        name: 'Condition Circular B',
        description: 'Second condition in circle',
        order: 3,
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['cond-circle-a'], // Creates circle
      },
      // Parent-child circular hierarchy
      {
        id: 'cond-parent',
        plot_block_id: 'pb-1',
        name: 'Parent Condition',
        description: 'Parent condition',
        order: 4,
        is_active: true,
        created_at: now,
        updated_at: now,
        children: ['cond-child'],
        requires: ['cond-child'], // Parent requires child (circular hierarchy)
      },
      {
        id: 'cond-child',
        plot_block_id: 'pb-1',
        name: 'Child Condition',
        description: 'Child condition',
        order: 5,
        is_active: true,
        created_at: now,
        updated_at: now,
        parent_id: 'cond-parent',
      },
    ];

    sampleTags = [
      {
        id: 'tag-1',
        name: 'time-travel',
        fandom_id: 'fandom-1',
        category: 'plot',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tag-2',
        name: 'marauders-era',
        fandom_id: 'fandom-1',
        category: 'setting',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['tag-1'],
      },
      // Circular tag references
      {
        id: 'tag-circle-a',
        name: 'Tag Circular A',
        fandom_id: 'fandom-1',
        category: 'test',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['tag-circle-b'],
      },
      {
        id: 'tag-circle-b',
        name: 'Tag Circular B',
        fandom_id: 'fandom-1',
        category: 'test',
        is_active: true,
        created_at: now,
        updated_at: now,
        enhances: ['tag-circle-a'], // Different relationship type in circle
      },
      // Complex tag circle
      {
        id: 'tag-complex-a',
        name: 'Complex Tag A',
        fandom_id: 'fandom-1',
        category: 'test',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['tag-complex-b'],
      },
      {
        id: 'tag-complex-b',
        name: 'Complex Tag B',
        fandom_id: 'fandom-1',
        category: 'test',
        is_active: true,
        created_at: now,
        updated_at: now,
        enhances: ['tag-complex-c'],
      },
      {
        id: 'tag-complex-c',
        name: 'Complex Tag C',
        fandom_id: 'fandom-1',
        category: 'test',
        is_active: true,
        created_at: now,
        updated_at: now,
        requires: ['tag-complex-a'], // Completes mixed-relationship circle
      },
    ];
  });

  describe('Simple Circular Reference Detection', () => {
    it('should detect simple plot block circular references', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[2], samplePlotBlocks[3]], // pb-circle-a, pb-circle-b
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains).toHaveLength(1);
      expect(result.circular_chains[0]).toMatchObject({
        type: 'plot_block',
        chain: expect.arrayContaining([
          expect.objectContaining({ id: 'pb-circle-a' }),
          expect.objectContaining({ id: 'pb-circle-b' }),
        ]),
        relationship_type: 'requires',
        severity: 'error',
      });
    });

    it('should detect simple condition circular references', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [],
        conditions: [sampleConditions[2], sampleConditions[3]], // cond-circle-a, cond-circle-b
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains).toHaveLength(1);
      expect(result.circular_chains[0].type).toBe('condition');
    });

    it('should detect simple tag circular references', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [],
        conditions: [],
        tags: [sampleTags[2], sampleTags[3]], // tag-circle-a, tag-circle-b
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains).toHaveLength(1);
      expect(result.circular_chains[0].type).toBe('tag');
      expect(result.circular_chains[0].relationship_type).toBe('mixed'); // requires + enhances
    });

    it('should detect self-references', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[7]], // pb-self
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains).toHaveLength(1);
      expect(result.circular_chains[0].chain).toHaveLength(1);
      expect(result.circular_chains[0].chain[0].id).toBe('pb-self');
    });
  });

  describe('Complex Circular Reference Detection', () => {
    it('should detect complex multi-element circles', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [
          samplePlotBlocks[4],
          samplePlotBlocks[5],
          samplePlotBlocks[6],
        ], // complex circle A->B->C->A
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains).toHaveLength(1);
      expect(result.circular_chains[0].chain).toHaveLength(3);
      expect(result.circular_chains[0].chain.map(c => c.id)).toEqual(
        expect.arrayContaining(['pb-complex-a', 'pb-complex-b', 'pb-complex-c'])
      );
    });

    it('should detect multiple circular chains in same dataset', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [
          samplePlotBlocks[2],
          samplePlotBlocks[3], // Simple circle
          samplePlotBlocks[4],
          samplePlotBlocks[5],
          samplePlotBlocks[6], // Complex circle
        ],
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect overlapping circular chains', () => {
      // Create overlapping circles: A->B->A and B->C->B
      const overlappingBlocks = [
        {
          id: 'overlap-a',
          name: 'Overlap A',
          category: 'test',
          description: 'Part of two circles',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['overlap-b'],
        },
        {
          id: 'overlap-b',
          name: 'Overlap B',
          category: 'test',
          description: 'Central to both circles',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['overlap-a', 'overlap-c'], // Part of both circles
        },
        {
          id: 'overlap-c',
          name: 'Overlap C',
          category: 'test',
          description: 'Part of second circle',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['overlap-b'],
        },
      ];

      const context: CircularReferenceContext = {
        plot_blocks: overlappingBlocks,
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(
        result.affected_elements.some(
          e => e.id === 'overlap-b' && e.circular_chains_involved > 1
        )
      ).toBe(true);
    });
  });

  describe('Mixed Type Circular References', () => {
    it('should detect circles across plot blocks and tags', () => {
      // Create cross-type circular reference
      const mixedCirclePlotBlock = {
        ...samplePlotBlocks[0],
        id: 'mixed-pb',
        requires: ['mixed-tag'], // Plot block requires tag
      };

      const mixedCircleTag = {
        ...sampleTags[0],
        id: 'mixed-tag',
        enhances: ['mixed-pb'], // Tag enhances plot block (creates circle)
      };

      const context: CircularReferenceContext = {
        plot_blocks: [mixedCirclePlotBlock],
        conditions: [],
        tags: [mixedCircleTag],
      };

      const result = CircularReferenceDetector.detectMixedCircles(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains[0].type).toBe('mixed');
      expect(
        result.circular_chains[0].chain.some(c => c.type === 'plot_block')
      ).toBe(true);
      expect(result.circular_chains[0].chain.some(c => c.type === 'tag')).toBe(
        true
      );
    });

    it('should detect complex mixed relationship circles', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [],
        conditions: [],
        tags: [sampleTags[4], sampleTags[5], sampleTags[6]], // Complex mixed circle
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains[0].relationship_type).toBe('mixed');
    });

    it('should handle cross-condition and plot block references', () => {
      // Create condition that requires plot block that enables the condition's plot block
      const crossRefPlotBlock = {
        ...samplePlotBlocks[0],
        id: 'cross-pb',
        enables: ['pb-1'], // Enables the plot block that contains cross-condition
      };

      const crossRefCondition = {
        ...sampleConditions[0],
        id: 'cross-cond',
        plot_block_id: 'pb-1',
        requires: ['cross-pb'], // Condition requires plot block that enables its parent
      };

      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[0], crossRefPlotBlock],
        conditions: [crossRefCondition],
        tags: [],
      };

      const result = CircularReferenceDetector.detectMixedCircles(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains[0].type).toBe('mixed');
    });
  });

  describe('Hierarchical Circular References', () => {
    it('should detect parent-child circular hierarchies in plot blocks', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[8], samplePlotBlocks[9]], // Parent and child with circular dependency
        conditions: [],
        tags: [],
      };

      const result = CircularReferenceDetector.detectHierarchyCircles(
        context.plot_blocks.map(pb => ({
          id: pb.id,
          parent_id: pb.parent_id,
          children: pb.children,
        }))
      );

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains[0].relationship_type).toBe('parent_child');
    });

    it('should detect parent-child circular hierarchies in conditions', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [],
        conditions: [sampleConditions[4], sampleConditions[5]], // Parent condition requires child
        tags: [],
      };

      const result = CircularReferenceDetector.detectHierarchyCircles(
        context.conditions.map(c => ({
          id: c.id,
          parent_id: c.parent_id,
          children: c.children,
        }))
      );

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains[0].relationship_type).toBe('parent_child');
    });

    it('should detect deep hierarchical cycles', () => {
      // Create deep hierarchy: A -> B -> C -> D -> A (parent-child + requirements)
      const deepHierarchy = Array(4)
        .fill(null)
        .map((_, i) => ({
          id: `deep-${i}`,
          name: `Deep Hierarchy ${i}`,
          category: 'test',
          description: 'Part of deep hierarchy',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          parent_id: i === 0 ? `deep-${3}` : `deep-${i - 1}`, // Creates circular parent chain
          requires: i === 3 ? [`deep-0`] : [`deep-${i + 1}`], // Creates circular requirement chain
        }));

      const context: CircularReferenceContext = {
        plot_blocks: deepHierarchy,
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Circular Reference Resolution', () => {
    it('should suggest resolution for simple circular references', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[2], samplePlotBlocks[3]], // Simple circle
        conditions: [],
        tags: [],
      };

      const result = CircularReferenceDetector.suggestCircleResolution(context);

      expect(result.suggested_resolutions).toBeDefined();
      expect(result.suggested_resolutions!.length).toBeGreaterThan(0);
      expect(result.suggested_resolutions![0]).toMatchObject({
        action: expect.stringMatching(
          /^(remove_dependency|restructure_hierarchy|remove_element)$/
        ),
        target_ids: expect.any(Array),
        impact: expect.stringMatching(/^(minimal|moderate|major)$/),
        reason: expect.any(String),
      });
    });

    it('should identify elements that can break cycles', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [
          samplePlotBlocks[4],
          samplePlotBlocks[5],
          samplePlotBlocks[6],
        ], // Complex circle
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.affected_elements).toBeDefined();
      expect(result.affected_elements.length).toBe(3);
      expect(
        result.affected_elements.every(e => e.can_break_cycle !== undefined)
      ).toBe(true);
      expect(
        result.affected_elements.some(e => e.can_break_cycle === true)
      ).toBe(true);
    });

    it('should suggest minimal impact resolutions', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[2], samplePlotBlocks[3]], // Simple circle
        conditions: [],
        tags: [],
      };

      const result = CircularReferenceDetector.suggestCircleResolution(context);

      expect(result.suggested_resolutions).toBeDefined();
      expect(
        result.suggested_resolutions!.some(r => r.impact === 'minimal')
      ).toBe(true);
    });

    it('should provide alternative structures for complex cases', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[8], samplePlotBlocks[9]], // Hierarchical circle
        conditions: [],
        tags: [],
      };

      const result = CircularReferenceDetector.suggestCircleResolution(context);

      expect(result.suggested_resolutions).toBeDefined();
      expect(
        result.suggested_resolutions!.some(
          r =>
            r.action === 'restructure_hierarchy' &&
            r.alternative_structure !== undefined
        )
      ).toBe(true);
    });
  });

  describe('Shortest Circle Detection', () => {
    it('should find shortest circular path in complex graphs', () => {
      // Create graph with multiple paths: short A->B->A and long A->C->D->E->A
      const multiPathBlocks = [
        {
          id: 'multi-a',
          name: 'Multi A',
          category: 'test',
          description: 'Central element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['multi-b'], // Short path
        },
        {
          id: 'multi-b',
          name: 'Multi B',
          category: 'test',
          description: 'Short path element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['multi-a'], // Completes short circle
        },
        {
          id: 'multi-c',
          name: 'Multi C',
          category: 'test',
          description: 'Long path start',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['multi-a'], // Also points to A, creating longer circle
        },
        {
          id: 'multi-d',
          name: 'Multi D',
          category: 'test',
          description: 'Long path middle',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['multi-c'],
        },
      ];

      // Add connection from A to longer path
      multiPathBlocks[0].requires = ['multi-b', 'multi-d']; // A requires both B and D

      const context: CircularReferenceContext = {
        plot_blocks: multiPathBlocks,
        conditions: [],
        tags: [],
      };

      const result = CircularReferenceDetector.findShortestCircle(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains[0].chain.length).toBe(2); // Should find A->B->A (shortest)
    });

    it('should handle equal-length circles by priority', () => {
      // Create two equal-length circles
      const equalLengthBlocks = [
        {
          id: 'equal-a1',
          name: 'Equal A1',
          category: 'test',
          description: 'First circle first element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['equal-b1'],
        },
        {
          id: 'equal-b1',
          name: 'Equal B1',
          category: 'test',
          description: 'First circle second element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['equal-a1'],
        },
        {
          id: 'equal-a2',
          name: 'Equal A2',
          category: 'test',
          description: 'Second circle first element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['equal-b2'],
        },
        {
          id: 'equal-b2',
          name: 'Equal B2',
          category: 'test',
          description: 'Second circle second element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: ['equal-a2'],
        },
      ];

      const context: CircularReferenceContext = {
        plot_blocks: equalLengthBlocks,
        conditions: [],
        tags: [],
      };

      const result = CircularReferenceDetector.findShortestCircle(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains).toHaveLength(1); // Should return one circle by priority
      expect(result.circular_chains[0].chain.length).toBe(2);
    });
  });

  describe('Performance Requirements', () => {
    it('should detect circular references efficiently in large graphs', () => {
      const startTime = performance.now();

      // Create large graph with potential circles
      const largeGraph = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `large-${i}`,
          name: `Large Element ${i}`,
          category: 'test',
          description: 'Large graph element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: [
            `large-${(i + 1) % 100}`, // Creates one large circle
            `large-${(i + 50) % 100}`, // Creates crossing references
          ],
        }));

      const context: CircularReferenceContext = {
        plot_blocks: largeGraph,
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(result).toBeDefined();
    });

    it('should handle deep circular chains efficiently', () => {
      const startTime = performance.now();

      // Create very deep circular chain
      const deepChain = Array(200)
        .fill(null)
        .map((_, i) => ({
          id: `deep-chain-${i}`,
          name: `Deep Chain ${i}`,
          category: 'test',
          description: 'Deep chain element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: [`deep-chain-${(i + 1) % 200}`], // Creates one very long circle
        }));

      const context: CircularReferenceContext = {
        plot_blocks: deepChain,
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
      expect(result.has_circular_references).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty datasets gracefully', () => {
      const context: CircularReferenceContext = {
        plot_blocks: [],
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(false);
      expect(result.circular_chains).toHaveLength(0);
      expect(result.affected_elements).toHaveLength(0);
    });

    it('should handle malformed references gracefully', () => {
      const malformedBlock = {
        id: 'malformed',
        name: 'Malformed Block',
        category: 'test',
        description: 'Has nonexistent references',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        requires: ['nonexistent-1', 'nonexistent-2'],
      };

      const context: CircularReferenceContext = {
        plot_blocks: [malformedBlock],
        conditions: [],
        tags: [],
      };

      expect(() => {
        CircularReferenceDetector.detectCircularReferences(context);
      }).not.toThrow();
    });

    it('should handle mixed valid and invalid references', () => {
      const mixedBlock = {
        id: 'mixed',
        name: 'Mixed References',
        category: 'test',
        description: 'Has both valid and invalid references',
        fandom_id: 'test-fandom',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        requires: ['pb-1', 'nonexistent'], // Valid + invalid
      };

      const context: CircularReferenceContext = {
        plot_blocks: [samplePlotBlocks[0], mixedBlock],
        conditions: [],
        tags: [],
      };

      expect(() => {
        CircularReferenceDetector.detectCircularReferences(context);
      }).not.toThrow();
    });

    it('should handle extremely complex circular scenarios', () => {
      // Create interconnected web with multiple circles
      const webElements = Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `web-${i}`,
          name: `Web Element ${i}`,
          category: 'test',
          description: 'Interconnected web element',
          fandom_id: 'test-fandom',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          requires: [
            `web-${(i + 1) % 20}`, // Main circle
            `web-${(i + 5) % 20}`, // Secondary connections
            `web-${(i + 10) % 20}`, // Tertiary connections
            `web-${(i + 15) % 20}`, // Quaternary connections
          ],
        }));

      const context: CircularReferenceContext = {
        plot_blocks: webElements,
        conditions: [],
        tags: [],
      };

      const result =
        CircularReferenceDetector.detectCircularReferences(context);

      expect(result.has_circular_references).toBe(true);
      expect(result.circular_chains.length).toBeGreaterThan(0);
      expect(
        result.affected_elements.every(e => e.circular_chains_involved > 0)
      ).toBe(true);
    });
  });
});
