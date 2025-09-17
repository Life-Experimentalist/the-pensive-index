/**
 * Content Tree Endpoint API Contract Tests
 *
 * Tests the content tree service endpoints including:
 * - Hierarchical content structure retrieval
 * - Tree operations (move, reorder, restructure)
 * - Multi-type content aggregation
 * - Tree filtering and search
 * - Performance and caching considerations
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

describe('Content Tree Endpoint API Contract Tests', () => {
  let testFandomId: number;
  let testTagIds: string[];
  let testPlotBlockIds: string[];
  let treeStructure: any;

  beforeAll(async () => {
    // Create test fandom
    const fandomResponse = await fetch('/api/v1/fandoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Content Tree Test Fandom',
        slug: 'content-tree-test-fandom',
        description: 'Fandom for content tree testing',
      }),
    });
    const fandom = await fandomResponse.json();
    testFandomId = fandom.id;

    // Create test content hierarchy
    await createTestContentHierarchy();
  });

  afterAll(() => {
    console.log('Cleaning up Content Tree API tests');
  });

  beforeEach(() => {
    console.log('Resetting content tree test state');
  });

  async function createTestContentHierarchy() {
    // Create tags
    testTagIds = [];
    const tags = [
      { name: 'Main Character', slug: 'main-character' },
      { name: 'Romance', slug: 'romance' },
      { name: 'Adventure', slug: 'adventure' },
      { name: 'Drama', slug: 'drama' },
    ];

    for (const tag of tags) {
      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tag,
          fandom_id: testFandomId,
        }),
      });
      const created = await response.json();
      testTagIds.push(created.id);
    }

    // Create plot block hierarchy
    testPlotBlockIds = [];

    // Root level plot blocks
    const rootBlocks = [
      {
        name: 'Story Structure',
        slug: 'story-structure',
        category: 'structure',
        complexity: 'complex',
      },
      {
        name: 'Character Development',
        slug: 'character-development',
        category: 'character-development',
        complexity: 'moderate',
      },
    ];

    for (const block of rootBlocks) {
      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...block,
          fandom_id: testFandomId,
          tags: [testTagIds[0]],
        }),
      });
      const created = await response.json();
      testPlotBlockIds.push(created.id);
    }

    // Child plot blocks for Story Structure
    const structureChildren = [
      { name: 'Act 1: Setup', slug: 'act-1-setup' },
      { name: 'Act 2: Confrontation', slug: 'act-2-confrontation' },
      { name: 'Act 3: Resolution', slug: 'act-3-resolution' },
    ];

    for (const child of structureChildren) {
      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...child,
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'moderate',
          parent_id: testPlotBlockIds[0], // Story Structure
          tags: [testTagIds[1]],
        }),
      });
      const created = await response.json();
      testPlotBlockIds.push(created.id);
    }

    // Grandchild plot blocks for Act 1
    const act1Children = [
      { name: 'Character Introduction', slug: 'character-introduction' },
      { name: 'Inciting Incident', slug: 'inciting-incident' },
    ];

    for (const grandchild of act1Children) {
      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...grandchild,
          fandom_id: testFandomId,
          category: 'character-development',
          complexity: 'simple',
          parent_id: testPlotBlockIds[2], // Act 1: Setup
          tags: [testTagIds[0], testTagIds[2]],
        }),
      });
      const created = await response.json();
      testPlotBlockIds.push(created.id);
    }
  }

  describe('GET /api/v1/content-tree/fandom/:fandomId', () => {
    it('should retrieve complete content tree for fandom', async () => {
      const response = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree).toMatchObject({
        fandom_id: testFandomId,
        fandom: expect.objectContaining({
          id: testFandomId,
          name: 'Content Tree Test Fandom',
        }),
        structure: expect.objectContaining({
          plot_blocks: expect.objectContaining({
            root_blocks: expect.any(Array),
            total_blocks: expect.any(Number),
            max_depth: expect.any(Number),
          }),
          tags: expect.objectContaining({
            total_tags: expect.any(Number),
            tag_classes: expect.any(Array),
            orphaned_tags: expect.any(Array),
          }),
        }),
        metadata: expect.objectContaining({
          generated_at: expect.any(String),
          cache_key: expect.any(String),
          version: expect.any(String),
        }),
      });

      // Verify tree structure includes hierarchy
      expect(tree.structure.plot_blocks.root_blocks.length).toBeGreaterThan(0);
      expect(tree.structure.plot_blocks.root_blocks[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        children: expect.any(Array),
        depth: 0,
        tags: expect.any(Array),
      });
    });

    it('should support depth limiting', async () => {
      const response = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}?max_depth=2`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree.structure.plot_blocks.max_depth).toBeLessThanOrEqual(2);

      // Verify no blocks beyond depth 2
      function checkDepth(blocks: any[], maxDepth: number) {
        for (const block of blocks) {
          expect(block.depth).toBeLessThanOrEqual(maxDepth);
          if (block.children && block.children.length > 0) {
            checkDepth(block.children, maxDepth);
          }
        }
      }
      checkDepth(tree.structure.plot_blocks.root_blocks, 2);
    });

    it('should filter tree by content type', async () => {
      const response = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}?content_types=plot_blocks`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree.structure).toHaveProperty('plot_blocks');
      expect(tree.structure).not.toHaveProperty('tags');
    });

    it('should filter tree by category', async () => {
      const response = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}?categories=structure`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();

      // All plot blocks should be structure category or have structure ancestors
      function checkCategory(blocks: any[]) {
        for (const block of blocks) {
          expect(['structure', 'character-development']).toContain(
            block.category
          );
          if (block.children) {
            checkCategory(block.children);
          }
        }
      }
      checkCategory(tree.structure.plot_blocks.root_blocks);
    });

    it('should filter tree by tags', async () => {
      const response = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}?tags=${testTagIds[0]}`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();

      // Should only include blocks that have the specified tag
      function checkTags(blocks: any[]) {
        for (const block of blocks) {
          expect(block.tags).toContain(testTagIds[0]);
          if (block.children) {
            checkTags(block.children);
          }
        }
      }
      if (tree.structure.plot_blocks.root_blocks.length > 0) {
        checkTags(tree.structure.plot_blocks.root_blocks);
      }
    });

    it('should support search within tree', async () => {
      const response = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}?search=character`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();

      // Results should contain 'character' in name or description
      function checkSearch(blocks: any[]) {
        for (const block of blocks) {
          expect(block.name.toLowerCase()).toMatch(/character/);
          if (block.children) {
            checkSearch(block.children);
          }
        }
      }
      if (tree.structure.plot_blocks.root_blocks.length > 0) {
        checkSearch(tree.structure.plot_blocks.root_blocks);
      }
    });

    it('should include relationship data when requested', async () => {
      const response = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}?include_relationships=true`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree).toMatchObject({
        relationships: expect.objectContaining({
          plot_block_conditions: expect.any(Array),
          tag_associations: expect.any(Array),
          cross_references: expect.any(Array),
        }),
      });
    });

    it('should return cached tree when available', async () => {
      // First request
      const response1 = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}`
      );
      expect(response1.status).toBe(200);
      const tree1 = await response1.json();

      // Second request should be cached
      const response2 = await fetch(
        `/api/v1/content-tree/fandom/${testFandomId}`
      );
      expect(response2.status).toBe(200);
      expect(response2.headers.get('X-Cache')).toBe('HIT');

      const tree2 = await response2.json();
      expect(tree1.metadata.cache_key).toBe(tree2.metadata.cache_key);
    });

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/content-tree/fandom/99999');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/content-tree/plot-block/:blockId', () => {
    it('should retrieve tree starting from specific plot block', async () => {
      const rootBlockId = testPlotBlockIds[0]; // Story Structure
      const response = await fetch(
        `/api/v1/content-tree/plot-block/${rootBlockId}`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree).toMatchObject({
        root_block: expect.objectContaining({
          id: rootBlockId,
          name: 'Story Structure',
          children: expect.any(Array),
          depth: 0,
        }),
        total_descendants: expect.any(Number),
        max_depth: expect.any(Number),
        fandom_id: testFandomId,
      });

      expect(tree.root_block.children.length).toBeGreaterThan(0);
    });

    it('should include ancestors when requested', async () => {
      const childBlockId = testPlotBlockIds[5]; // Character Introduction (grandchild)
      const response = await fetch(
        `/api/v1/content-tree/plot-block/${childBlockId}?include_ancestors=true`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree).toMatchObject({
        root_block: expect.objectContaining({
          id: childBlockId,
        }),
        ancestors: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            depth: expect.any(Number),
          }),
        ]),
        path_to_root: expect.any(Array),
      });

      expect(tree.ancestors.length).toBeGreaterThan(0);
    });

    it('should include siblings when requested', async () => {
      const blockId = testPlotBlockIds[2]; // Act 1: Setup
      const response = await fetch(
        `/api/v1/content-tree/plot-block/${blockId}?include_siblings=true`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree).toMatchObject({
        siblings: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
          }),
        ]),
        sibling_position: expect.any(Number),
        total_siblings: expect.any(Number),
      });
    });

    it('should return 404 for non-existent plot block', async () => {
      const response = await fetch(
        '/api/v1/content-tree/plot-block/non-existent-block'
      );
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/content-tree/move', () => {
    it('should move plot block in tree structure', async () => {
      const sourceBlockId = testPlotBlockIds[5]; // Character Introduction
      const targetParentId = testPlotBlockIds[3]; // Act 2: Confrontation

      const moveData = {
        source_id: sourceBlockId,
        target_parent_id: targetParentId,
        position: 0,
        content_type: 'plot_block',
      };

      const response = await fetch('/api/v1/content-tree/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        success: true,
        moved: true,
        source_id: sourceBlockId,
        old_parent_id: expect.any(String),
        new_parent_id: targetParentId,
        new_position: 0,
        affected_tree: expect.objectContaining({
          cache_invalidated: true,
          updated_paths: expect.any(Array),
        }),
      });
    });

    it('should reorder siblings without changing parent', async () => {
      const sourceBlockId = testPlotBlockIds[2]; // Act 1: Setup
      const targetParentId = testPlotBlockIds[0]; // Story Structure (same parent)

      const moveData = {
        source_id: sourceBlockId,
        target_parent_id: targetParentId,
        position: 2, // Move to end
        content_type: 'plot_block',
      };

      const response = await fetch('/api/v1/content-tree/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        success: true,
        moved: true,
        reordered: true,
        new_position: 2,
      });
    });

    it('should move to root level', async () => {
      const sourceBlockId = testPlotBlockIds[5]; // Character Introduction

      const moveData = {
        source_id: sourceBlockId,
        target_parent_id: null, // Move to root
        position: 0,
        content_type: 'plot_block',
      };

      const response = await fetch('/api/v1/content-tree/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        success: true,
        moved: true,
        new_parent_id: null,
        new_depth: 0,
      });
    });

    it('should prevent circular moves', async () => {
      const sourceBlockId = testPlotBlockIds[0]; // Story Structure (parent)
      const targetParentId = testPlotBlockIds[2]; // Act 1: Setup (descendant)

      const moveData = {
        source_id: sourceBlockId,
        target_parent_id: targetParentId,
        position: 0,
        content_type: 'plot_block',
      };

      const response = await fetch('/api/v1/content-tree/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('circular'),
        circular_path: expect.any(Array),
      });
    });

    it('should validate cross-fandom moves', async () => {
      // Create another fandom and plot block
      const fandom2Response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Other Fandom',
          slug: 'other-fandom',
          description: 'Different fandom',
        }),
      });
      const fandom2 = await fandom2Response.json();

      const block2Response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Other Block',
          slug: 'other-block',
          fandom_id: fandom2.id,
          category: 'misc',
          complexity: 'simple',
        }),
      });
      const block2 = await block2Response.json();

      // Try to move cross-fandom
      const moveData = {
        source_id: testPlotBlockIds[5],
        target_parent_id: block2.id,
        position: 0,
        content_type: 'plot_block',
      };

      const response = await fetch('/api/v1/content-tree/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('same fandom'),
      });
    });
  });

  describe('POST /api/v1/content-tree/bulk-move', () => {
    it('should move multiple items in single operation', async () => {
      const bulkMoveData = {
        operations: [
          {
            source_id: testPlotBlockIds[5], // Character Introduction
            target_parent_id: testPlotBlockIds[3], // Act 2: Confrontation
            position: 0,
            content_type: 'plot_block',
          },
          {
            source_id: testPlotBlockIds[6], // Inciting Incident
            target_parent_id: testPlotBlockIds[4], // Act 3: Resolution
            position: 0,
            content_type: 'plot_block',
          },
        ],
      };

      const response = await fetch('/api/v1/content-tree/bulk-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkMoveData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        success: true,
        total_operations: 2,
        successful_moves: 2,
        failed_moves: 0,
        results: expect.arrayContaining([
          expect.objectContaining({
            source_id: testPlotBlockIds[5],
            success: true,
          }),
          expect.objectContaining({
            source_id: testPlotBlockIds[6],
            success: true,
          }),
        ]),
      });
    });

    it('should handle partial failures in bulk move', async () => {
      const bulkMoveData = {
        operations: [
          {
            source_id: testPlotBlockIds[5], // Valid move
            target_parent_id: testPlotBlockIds[3],
            position: 0,
            content_type: 'plot_block',
          },
          {
            source_id: testPlotBlockIds[0], // Invalid: circular move
            target_parent_id: testPlotBlockIds[2],
            position: 0,
            content_type: 'plot_block',
          },
        ],
      };

      const response = await fetch('/api/v1/content-tree/bulk-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkMoveData),
      });

      expect(response.status).toBe(207); // Multi-status

      const result = await response.json();
      expect(result).toMatchObject({
        success: false, // Overall success false due to failures
        total_operations: 2,
        successful_moves: 1,
        failed_moves: 1,
        results: expect.arrayContaining([
          expect.objectContaining({
            success: true,
          }),
          expect.objectContaining({
            success: false,
            error: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('POST /api/v1/content-tree/restructure', () => {
    it('should restructure tree based on template', async () => {
      const restructureData = {
        fandom_id: testFandomId,
        template: 'three_act_structure',
        options: {
          preserve_existing_content: true,
          create_missing_structure: true,
          mapping_strategy: 'category_based',
        },
      };

      const response = await fetch('/api/v1/content-tree/restructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restructureData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        success: true,
        template_applied: 'three_act_structure',
        changes: expect.objectContaining({
          blocks_moved: expect.any(Number),
          blocks_created: expect.any(Number),
          structure_modified: true,
        }),
        new_structure: expect.objectContaining({
          root_blocks: expect.any(Array),
          total_blocks: expect.any(Number),
        }),
      });
    });

    it('should validate restructure template', async () => {
      const restructureData = {
        fandom_id: testFandomId,
        template: 'invalid_template',
        options: {},
      };

      const response = await fetch('/api/v1/content-tree/restructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restructureData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('invalid template'),
      });
    });
  });

  describe('GET /api/v1/content-tree/search', () => {
    it('should search across all content types', async () => {
      const response = await fetch(
        `/api/v1/content-tree/search?q=character&fandom_id=${testFandomId}`
      );

      expect(response.status).toBe(200);

      const results = await response.json();
      expect(results).toMatchObject({
        query: 'character',
        fandom_id: testFandomId,
        total_results: expect.any(Number),
        results: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String), // 'plot_block', 'tag', etc.
            name: expect.any(String),
            path: expect.any(Array), // Hierarchical path
            relevance_score: expect.any(Number),
            match_context: expect.any(String),
          }),
        ]),
        facets: expect.objectContaining({
          content_types: expect.any(Object),
          categories: expect.any(Object),
          depths: expect.any(Object),
        }),
      });
    });

    it('should support advanced search filters', async () => {
      const searchParams = new URLSearchParams({
        q: 'character',
        fandom_id: testFandomId.toString(),
        content_types: 'plot_block',
        categories: 'character-development',
        tags: testTagIds[0],
        min_depth: '1',
        max_depth: '3',
      });

      const response = await fetch(
        `/api/v1/content-tree/search?${searchParams}`
      );

      expect(response.status).toBe(200);

      const results = await response.json();
      expect(results.results.every((r: any) => r.type === 'plot_block')).toBe(
        true
      );
    });

    it('should support pagination and sorting', async () => {
      const response = await fetch(
        `/api/v1/content-tree/search?q=act&fandom_id=${testFandomId}&page=1&limit=2&sort=relevance&order=desc`
      );

      expect(response.status).toBe(200);

      const results = await response.json();
      expect(results).toMatchObject({
        page: 1,
        limit: 2,
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });

      // Results should be sorted by relevance (descending)
      if (results.results.length > 1) {
        expect(results.results[0].relevance_score).toBeGreaterThanOrEqual(
          results.results[1].relevance_score
        );
      }
    });
  });

  describe('GET /api/v1/content-tree/templates', () => {
    it('should return available restructure templates', async () => {
      const response = await fetch('/api/v1/content-tree/templates');

      expect(response.status).toBe(200);

      const templates = await response.json();
      expect(templates).toMatchObject({
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            structure: expect.any(Object),
            applicable_genres: expect.any(Array),
            complexity: expect.any(String),
          }),
        ]),
      });

      // Should include standard templates
      const templateIds = templates.templates.map((t: any) => t.id);
      expect(templateIds).toEqual(
        expect.arrayContaining([
          'three_act_structure',
          'hero_journey',
          'character_arc_template',
        ])
      );
    });

    it('should filter templates by genre', async () => {
      const response = await fetch(
        '/api/v1/content-tree/templates?genre=fantasy'
      );

      expect(response.status).toBe(200);

      const templates = await response.json();
      expect(
        templates.templates.every(
          (t: any) =>
            t.applicable_genres.includes('fantasy') ||
            t.applicable_genres.includes('all')
        )
      ).toBe(true);
    });
  });

  describe('GET /api/v1/content-tree/analytics/:fandomId', () => {
    it('should return tree analytics and metrics', async () => {
      const response = await fetch(
        `/api/v1/content-tree/analytics/${testFandomId}`
      );

      expect(response.status).toBe(200);

      const analytics = await response.json();
      expect(analytics).toMatchObject({
        fandom_id: testFandomId,
        structure_metrics: expect.objectContaining({
          total_plot_blocks: expect.any(Number),
          total_tags: expect.any(Number),
          avg_depth: expect.any(Number),
          max_depth: expect.any(Number),
          branching_factor: expect.any(Number),
          orphaned_content: expect.any(Number),
        }),
        content_distribution: expect.objectContaining({
          by_category: expect.any(Object),
          by_complexity: expect.any(Object),
          by_depth: expect.any(Object),
        }),
        health_indicators: expect.objectContaining({
          structure_balance: expect.any(Number),
          content_coverage: expect.any(Number),
          tag_utilization: expect.any(Number),
          circular_references: expect.any(Number),
        }),
        recommendations: expect.any(Array),
      });
    });

    it('should include performance metrics when requested', async () => {
      const response = await fetch(
        `/api/v1/content-tree/analytics/${testFandomId}?include_performance=true`
      );

      expect(response.status).toBe(200);

      const analytics = await response.json();
      expect(analytics).toMatchObject({
        performance_metrics: expect.objectContaining({
          tree_generation_time: expect.any(Number),
          cache_hit_rate: expect.any(Number),
          query_complexity: expect.any(Number),
          optimization_suggestions: expect.any(Array),
        }),
      });
    });
  });

  describe('POST /api/v1/content-tree/validate', () => {
    it('should validate tree structure integrity', async () => {
      const validationData = {
        fandom_id: testFandomId,
        checks: [
          'hierarchy_integrity',
          'circular_references',
          'orphaned_content',
          'tag_consistency',
        ],
      };

      const response = await fetch('/api/v1/content-tree/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData),
      });

      expect(response.status).toBe(200);

      const validation = await response.json();
      expect(validation).toMatchObject({
        valid: expect.any(Boolean),
        fandom_id: testFandomId,
        checks_performed: expect.arrayContaining([
          'hierarchy_integrity',
          'circular_references',
          'orphaned_content',
          'tag_consistency',
        ]),
        results: expect.objectContaining({
          hierarchy_integrity: expect.objectContaining({
            valid: expect.any(Boolean),
            issues: expect.any(Array),
          }),
          circular_references: expect.objectContaining({
            valid: expect.any(Boolean),
            circular_paths: expect.any(Array),
          }),
        }),
        summary: expect.objectContaining({
          total_issues: expect.any(Number),
          critical_issues: expect.any(Number),
          warnings: expect.any(Number),
        }),
      });
    });

    it('should provide detailed issue reporting', async () => {
      const validationData = {
        fandom_id: testFandomId,
        checks: ['all'],
        include_details: true,
      };

      const response = await fetch('/api/v1/content-tree/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData),
      });

      expect(response.status).toBe(200);

      const validation = await response.json();
      if (validation.summary.total_issues > 0) {
        expect(validation.detailed_issues).toBeInstanceOf(Array);
        expect(validation.detailed_issues[0]).toMatchObject({
          issue_type: expect.any(String),
          severity: expect.any(String),
          message: expect.any(String),
          affected_entities: expect.any(Array),
          suggested_fix: expect.any(String),
        });
      }
    });
  });
});
