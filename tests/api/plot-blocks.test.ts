/**
 * PlotBlock API Contract Tests
 *
 * Tests the complete PlotBlock API interface including:
 * - CRUD operations with fandom scoping
 * - Hierarchical tree structure management
 * - Tag association and validation
 * - Category and complexity filtering
 * - Tree operations (move, reorder, etc.)
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

describe('PlotBlock API Contract Tests', () => {
  let testFandomId: number;
  let testTagIds: string[];

  beforeAll(async () => {
    // Create test fandom
    const fandomResponse = await fetch('/api/v1/fandoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'PlotBlock Test Fandom',
        slug: 'plotblock-test-fandom',
        description: 'Fandom for plot block testing',
      }),
    });
    const fandom = await fandomResponse.json();
    testFandomId = fandom.id;

    // Create test tags
    testTagIds = [];
    const tags = ['character-development', 'romance', 'action'];
    for (const tagName of tags) {
      const tagResponse = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tagName,
          slug: tagName,
          fandom_id: testFandomId,
        }),
      });
      const tag = await tagResponse.json();
      testTagIds.push(tag.id);
    }
  });

  afterAll(() => {
    console.log('Cleaning up PlotBlock API tests');
  });

  beforeEach(() => {
    console.log('Resetting plot block test state');
  });

  describe('POST /api/v1/plot-blocks', () => {
    it('should create a new plot block with valid data', async () => {
      const plotBlockData = {
        name: "Hero's Journey Beginning",
        slug: 'heros-journey-beginning',
        description: 'The initial call to adventure and departure',
        fandom_id: testFandomId,
        category: 'character-development',
        complexity: 'simple',
        tags: [testTagIds[0], testTagIds[1]],
        metadata: {
          typical_length: '1-2 chapters',
          prerequisites: [],
          emotional_tone: 'hopeful',
        },
      };

      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plotBlockData),
      });

      expect(response.status).toBe(201);

      const plotBlock = await response.json();
      expect(plotBlock).toMatchObject({
        id: expect.any(String),
        name: "Hero's Journey Beginning",
        slug: 'heros-journey-beginning',
        description: 'The initial call to adventure and departure',
        fandom_id: testFandomId,
        category: 'character-development',
        complexity: 'simple',
        tags: expect.arrayContaining(testTagIds.slice(0, 2)),
        parent_id: null,
        metadata: expect.objectContaining({
          typical_length: '1-2 chapters',
        }),
        is_active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should create hierarchical plot block with parent', async () => {
      // Create parent plot block first
      const parentResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Main Story Arc',
          slug: 'main-story-arc',
          description: 'The overarching narrative structure',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'complex',
        }),
      });
      const parent = await parentResponse.json();

      // Create child plot block
      const childData = {
        name: 'Act 1: Setup',
        slug: 'act-1-setup',
        description: 'First act of the three-act structure',
        fandom_id: testFandomId,
        category: 'structure',
        complexity: 'moderate',
        parent_id: parent.id,
      };

      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(childData),
      });

      expect(response.status).toBe(201);

      const child = await response.json();
      expect(child.parent_id).toBe(parent.id);
    });

    it('should reject plot block with non-existent fandom', async () => {
      const plotBlockData = {
        name: 'Invalid Fandom Block',
        slug: 'invalid-fandom-block',
        fandom_id: 99999,
        category: 'character-development',
        complexity: 'simple',
      };

      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plotBlockData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('fandom'),
        field: 'fandom_id',
      });
    });

    it('should reject plot block with non-existent parent', async () => {
      const plotBlockData = {
        name: 'Invalid Parent Block',
        slug: 'invalid-parent-block',
        fandom_id: testFandomId,
        category: 'character-development',
        complexity: 'simple',
        parent_id: 'non-existent-parent',
      };

      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plotBlockData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('parent'),
        field: 'parent_id',
      });
    });

    it('should reject plot block with invalid tags', async () => {
      const plotBlockData = {
        name: 'Invalid Tags Block',
        slug: 'invalid-tags-block',
        fandom_id: testFandomId,
        category: 'character-development',
        complexity: 'simple',
        tags: ['non-existent-tag-1', 'non-existent-tag-2'],
      };

      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plotBlockData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('tags'),
        field: 'tags',
      });
    });

    it('should validate plot block data', async () => {
      const invalidData = {
        name: '', // Empty name
        slug: 'invalid slug!', // Invalid characters
        description: 'x'.repeat(1001), // Too long
        fandom_id: 'not-a-number', // Invalid type
        category: 'invalid-category', // Invalid category
        complexity: 'invalid-complexity', // Invalid complexity
        tags: 'not-an-array', // Invalid type
      };

      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('Validation Error');
      expect(error.details).toBeInstanceOf(Array);
    });

    it('should prevent circular hierarchy references', async () => {
      // Create parent
      const parentResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Circular Parent',
          slug: 'circular-parent',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'simple',
        }),
      });
      const parent = await parentResponse.json();

      // Create child
      const childResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Circular Child',
          slug: 'circular-child',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'simple',
          parent_id: parent.id,
        }),
      });
      const child = await childResponse.json();

      // Try to make parent a child of child (circular reference)
      const response = await fetch(`/api/v1/plot-blocks/${parent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: child.id,
        }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('circular'),
      });
    });
  });

  describe('GET /api/v1/plot-blocks', () => {
    beforeEach(async () => {
      // Create test plot blocks
      const plotBlocks = [
        {
          name: 'Romance Beginning',
          slug: 'romance-beginning',
          fandom_id: testFandomId,
          category: 'relationship',
          complexity: 'simple',
          tags: [testTagIds[1]],
        },
        {
          name: 'Action Sequence',
          slug: 'action-sequence',
          fandom_id: testFandomId,
          category: 'action',
          complexity: 'moderate',
          tags: [testTagIds[2]],
        },
        {
          name: 'Character Growth',
          slug: 'character-growth',
          fandom_id: testFandomId,
          category: 'character-development',
          complexity: 'complex',
          tags: [testTagIds[0]],
        },
        {
          name: 'Inactive Block',
          slug: 'inactive-block',
          fandom_id: testFandomId,
          category: 'misc',
          complexity: 'simple',
          is_active: false,
        },
      ];

      for (const plotBlock of plotBlocks) {
        await fetch('/api/v1/plot-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plotBlock),
        });
      }
    });

    it('should retrieve all active plot blocks', async () => {
      const response = await fetch('/api/v1/plot-blocks');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        plot_blocks: expect.arrayContaining([
          expect.objectContaining({
            name: 'Romance Beginning',
            is_active: true,
          }),
          expect.objectContaining({ name: 'Action Sequence', is_active: true }),
          expect.objectContaining({
            name: 'Character Growth',
            is_active: true,
          }),
        ]),
        total: expect.any(Number),
        page: 1,
        limit: 50,
      });

      // Should not include inactive plot blocks
      expect(
        data.plot_blocks.find((pb: any) => pb.name === 'Inactive Block')
      ).toBeUndefined();
    });

    it('should filter plot blocks by fandom', async () => {
      const response = await fetch(
        `/api/v1/plot-blocks?fandom_id=${testFandomId}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.plot_blocks.every((pb: any) => pb.fandom_id === testFandomId)
      ).toBe(true);
    });

    it('should filter plot blocks by category', async () => {
      const response = await fetch('/api/v1/plot-blocks?category=relationship');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.plot_blocks.every((pb: any) => pb.category === 'relationship')
      ).toBe(true);
      expect(
        data.plot_blocks.find((pb: any) => pb.name === 'Romance Beginning')
      ).toBeDefined();
    });

    it('should filter plot blocks by complexity', async () => {
      const response = await fetch('/api/v1/plot-blocks?complexity=complex');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.plot_blocks.every((pb: any) => pb.complexity === 'complex')
      ).toBe(true);
      expect(
        data.plot_blocks.find((pb: any) => pb.name === 'Character Growth')
      ).toBeDefined();
    });

    it('should filter plot blocks by tags', async () => {
      const response = await fetch(`/api/v1/plot-blocks?tags=${testTagIds[1]}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.plot_blocks.every((pb: any) => pb.tags.includes(testTagIds[1]))
      ).toBe(true);
    });

    it('should support text search', async () => {
      const response = await fetch('/api/v1/plot-blocks?search=romance');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.plot_blocks).toHaveLength(1);
      expect(data.plot_blocks[0].name).toBe('Romance Beginning');
    });

    it('should support pagination and sorting', async () => {
      const response = await fetch(
        '/api/v1/plot-blocks?page=1&limit=2&sort=name&order=asc'
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.plot_blocks).toHaveLength(2);
      expect(data).toMatchObject({
        page: 1,
        limit: 2,
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });

      const names = data.plot_blocks.map((pb: any) => pb.name);
      expect(names).toEqual(names.slice().sort());
    });

    it('should include hierarchy information when requested', async () => {
      const response = await fetch(
        '/api/v1/plot-blocks?include_hierarchy=true'
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.plot_blocks[0]).toMatchObject({
        children: expect.any(Array),
        parent: expect.any(Object), // or null
        depth: expect.any(Number),
      });
    });
  });

  describe('GET /api/v1/plot-blocks/:id', () => {
    let testPlotBlockId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Single Test Block',
          slug: 'single-test-block',
          description: 'Plot block for single retrieval test',
          fandom_id: testFandomId,
          category: 'character-development',
          complexity: 'moderate',
          tags: [testTagIds[0]],
        }),
      });

      const plotBlock = await response.json();
      testPlotBlockId = plotBlock.id;
    });

    it('should retrieve a specific plot block by ID', async () => {
      const response = await fetch(`/api/v1/plot-blocks/${testPlotBlockId}`);

      expect(response.status).toBe(200);

      const plotBlock = await response.json();
      expect(plotBlock).toMatchObject({
        id: testPlotBlockId,
        name: 'Single Test Block',
        slug: 'single-test-block',
        description: 'Plot block for single retrieval test',
        fandom_id: testFandomId,
        category: 'character-development',
        complexity: 'moderate',
        tags: expect.arrayContaining([testTagIds[0]]),
        is_active: true,
      });
    });

    it('should include full hierarchy when requested', async () => {
      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}?include_hierarchy=true`
      );

      expect(response.status).toBe(200);

      const plotBlock = await response.json();
      expect(plotBlock).toMatchObject({
        parent: expect.any(Object), // or null
        children: expect.any(Array),
        ancestors: expect.any(Array),
        descendants: expect.any(Array),
        depth: expect.any(Number),
        is_leaf: expect.any(Boolean),
        is_root: expect.any(Boolean),
      });
    });

    it('should include conditions when requested', async () => {
      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}?include_conditions=true`
      );

      expect(response.status).toBe(200);

      const plotBlock = await response.json();
      expect(plotBlock).toMatchObject({
        conditions: expect.any(Array),
        prerequisites: expect.any(Array),
        dependents: expect.any(Array),
      });
    });

    it('should return 404 for non-existent plot block', async () => {
      const response = await fetch('/api/v1/plot-blocks/non-existent-block');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/plot-blocks/:id', () => {
    let testPlotBlockId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updateable Block',
          slug: 'updateable-block',
          description: 'Original description',
          fandom_id: testFandomId,
          category: 'character-development',
          complexity: 'simple',
          tags: [testTagIds[0]],
        }),
      });

      const plotBlock = await response.json();
      testPlotBlockId = plotBlock.id;
    });

    it('should update plot block with valid data', async () => {
      const updateData = {
        description: 'Updated description',
        category: 'relationship',
        complexity: 'moderate',
        tags: [testTagIds[0], testTagIds[1]],
        metadata: { updated: true },
      };

      const response = await fetch(`/api/v1/plot-blocks/${testPlotBlockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const plotBlock = await response.json();
      expect(plotBlock).toMatchObject({
        id: testPlotBlockId,
        description: 'Updated description',
        category: 'relationship',
        complexity: 'moderate',
        tags: expect.arrayContaining([testTagIds[0], testTagIds[1]]),
        metadata: expect.objectContaining({ updated: true }),
      });
    });

    it('should prevent updating core identifying fields', async () => {
      const response = await fetch(`/api/v1/plot-blocks/${testPlotBlockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'new-name',
          slug: 'new-slug',
          fandom_id: 99999, // Attempt to change fandom
        }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('cannot be modified'),
      });
    });

    it('should validate circular references when updating parent', async () => {
      // Create child block
      const childResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Child Block',
          slug: 'child-block',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'simple',
          parent_id: testPlotBlockId,
        }),
      });
      const child = await childResponse.json();

      // Try to make parent a child of its own child
      const response = await fetch(`/api/v1/plot-blocks/${testPlotBlockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: child.id,
        }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('circular'),
      });
    });
  });

  describe('DELETE /api/v1/plot-blocks/:id', () => {
    let testPlotBlockId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Deletable Block',
          slug: 'deletable-block',
          description: 'Plot block to be deleted',
          fandom_id: testFandomId,
          category: 'misc',
          complexity: 'simple',
        }),
      });

      const plotBlock = await response.json();
      testPlotBlockId = plotBlock.id;
    });

    it('should soft delete a plot block', async () => {
      const response = await fetch(`/api/v1/plot-blocks/${testPlotBlockId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Plot block deleted successfully',
        deleted: true,
        soft_delete: true,
      });
    });

    it('should handle plot block with children', async () => {
      // Create child plot block
      await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Child Block',
          slug: 'child-block',
          fandom_id: testFandomId,
          category: 'misc',
          complexity: 'simple',
          parent_id: testPlotBlockId,
        }),
      });

      const response = await fetch(`/api/v1/plot-blocks/${testPlotBlockId}`, {
        method: 'DELETE',
      });

      // Should either cascade delete children or orphan them
      expect([200, 409]).toContain(response.status);

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toMatchObject({
          orphaned_children: expect.any(Number),
        });
      }
    });
  });

  describe('POST /api/v1/plot-blocks/:id/move', () => {
    let parentId: string;
    let childId: string;
    let targetParentId: string;

    beforeEach(async () => {
      // Create parent
      const parentResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Original Parent',
          slug: 'original-parent',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'complex',
        }),
      });
      const parent = await parentResponse.json();
      parentId = parent.id;

      // Create child
      const childResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Movable Child',
          slug: 'movable-child',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'simple',
          parent_id: parentId,
        }),
      });
      const child = await childResponse.json();
      childId = child.id;

      // Create target parent
      const targetResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Target Parent',
          slug: 'target-parent',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'moderate',
        }),
      });
      const target = await targetResponse.json();
      targetParentId = target.id;
    });

    it('should move plot block to new parent', async () => {
      const moveData = {
        new_parent_id: targetParentId,
        position: 0,
      };

      const response = await fetch(`/api/v1/plot-blocks/${childId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Plot block moved successfully',
        moved: true,
        old_parent_id: parentId,
        new_parent_id: targetParentId,
      });

      // Verify the move
      const verifyResponse = await fetch(`/api/v1/plot-blocks/${childId}`);
      const moved = await verifyResponse.json();
      expect(moved.parent_id).toBe(targetParentId);
    });

    it('should move plot block to root level', async () => {
      const moveData = {
        new_parent_id: null,
        position: 0,
      };

      const response = await fetch(`/api/v1/plot-blocks/${childId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.new_parent_id).toBeNull();
    });

    it('should prevent moving to descendant (circular reference)', async () => {
      // Create grandchild
      const grandchildResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Grandchild',
          slug: 'grandchild',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'simple',
          parent_id: childId,
        }),
      });
      const grandchild = await grandchildResponse.json();

      // Try to move parent under its grandchild
      const response = await fetch(`/api/v1/plot-blocks/${parentId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_parent_id: grandchild.id,
          position: 0,
        }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('circular'),
      });
    });
  });

  describe('GET /api/v1/fandoms/:fandomId/plot-blocks/tree', () => {
    beforeEach(async () => {
      // Create a tree structure
      const rootResponse = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Story Structure',
          slug: 'story-structure',
          fandom_id: testFandomId,
          category: 'structure',
          complexity: 'complex',
        }),
      });
      const root = await rootResponse.json();

      // Create children
      const children = ['Act 1', 'Act 2', 'Act 3'];
      for (const childName of children) {
        await fetch('/api/v1/plot-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: childName,
            slug: childName.toLowerCase().replace(' ', '-'),
            fandom_id: testFandomId,
            category: 'structure',
            complexity: 'moderate',
            parent_id: root.id,
          }),
        });
      }
    });

    it('should return complete tree structure for fandom', async () => {
      const response = await fetch(
        `/api/v1/fandoms/${testFandomId}/plot-blocks/tree`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(tree).toMatchObject({
        fandom_id: testFandomId,
        root_blocks: expect.any(Array),
        total_blocks: expect.any(Number),
        max_depth: expect.any(Number),
        orphaned_blocks: expect.any(Array),
      });

      // Each root block should have full tree structure
      if (tree.root_blocks.length > 0) {
        expect(tree.root_blocks[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          children: expect.any(Array),
          depth: 0,
        });
      }
    });

    it('should support filtering tree by category', async () => {
      const response = await fetch(
        `/api/v1/fandoms/${testFandomId}/plot-blocks/tree?category=structure`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      expect(
        tree.root_blocks.every((block: any) => block.category === 'structure')
      ).toBe(true);
    });

    it('should support depth limiting', async () => {
      const response = await fetch(
        `/api/v1/fandoms/${testFandomId}/plot-blocks/tree?max_depth=1`
      );

      expect(response.status).toBe(200);

      const tree = await response.json();
      // Should only include root level and immediate children
      expect(tree.max_depth).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/v1/plot-blocks/categories', () => {
    it('should return available plot block categories', async () => {
      const response = await fetch('/api/v1/plot-blocks/categories');

      expect(response.status).toBe(200);

      const categories = await response.json();
      expect(categories).toMatchObject({
        categories: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            label: expect.any(String),
            description: expect.any(String),
            examples: expect.any(Array),
          }),
        ]),
      });

      // Should include standard categories
      const categoryNames = categories.categories.map((c: any) => c.name);
      expect(categoryNames).toEqual(
        expect.arrayContaining([
          'character-development',
          'relationship',
          'action',
          'structure',
          'worldbuilding',
        ])
      );
    });
  });

  describe('GET /api/v1/plot-blocks/complexity-levels', () => {
    it('should return available complexity levels', async () => {
      const response = await fetch('/api/v1/plot-blocks/complexity-levels');

      expect(response.status).toBe(200);

      const levels = await response.json();
      expect(levels).toMatchObject({
        complexity_levels: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            label: expect.any(String),
            description: expect.any(String),
            typical_length: expect.any(String),
          }),
        ]),
      });

      // Should include standard levels
      const levelNames = levels.complexity_levels.map((l: any) => l.name);
      expect(levelNames).toEqual(
        expect.arrayContaining(['simple', 'moderate', 'complex', 'epic'])
      );
    });
  });
});
