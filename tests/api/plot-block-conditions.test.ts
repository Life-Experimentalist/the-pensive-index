/**
 * PlotBlockCondition API Contract Tests
 *
 * Tests the complete PlotBlockCondition API interface including:
 * - CRUD operations for condition management
 * - Condition validation and evaluation
 * - Relationship between plot blocks through conditions
 * - Complex condition logic (AND/OR, nested conditions)
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

describe('PlotBlockCondition API Contract Tests', () => {
  let testFandomId: number;
  let testPlotBlockIds: string[];
  let testTagIds: string[];

  beforeAll(async () => {
    // Create test fandom
    const fandomResponse = await fetch('/api/v1/fandoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Condition Test Fandom',
        slug: 'condition-test-fandom',
        description: 'Fandom for condition testing',
      }),
    });
    const fandom = await fandomResponse.json();
    testFandomId = fandom.id;

    // Create test tags
    testTagIds = [];
    const tags = ['completed', 'in-progress', 'romance-established'];
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

    // Create test plot blocks
    testPlotBlockIds = [];
    const plotBlocks = [
      { name: 'Character Introduction', slug: 'character-introduction' },
      { name: 'First Date', slug: 'first-date' },
      { name: 'Relationship Development', slug: 'relationship-development' },
      { name: 'Conflict Resolution', slug: 'conflict-resolution' },
    ];

    for (const block of plotBlocks) {
      const response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...block,
          fandom_id: testFandomId,
          category: 'character-development',
          complexity: 'moderate',
        }),
      });
      const plotBlock = await response.json();
      testPlotBlockIds.push(plotBlock.id);
    }
  });

  afterAll(() => {
    console.log('Cleaning up PlotBlockCondition API tests');
  });

  beforeEach(() => {
    console.log('Resetting condition test state');
  });

  describe('POST /api/v1/plot-block-conditions', () => {
    it('should create plot block prerequisite condition', async () => {
      const conditionData = {
        source_block_id: testPlotBlockIds[1], // First Date
        target_block_id: testPlotBlockIds[0], // Character Introduction
        condition_type: 'prerequisite',
        operator: 'exists',
        metadata: {
          description: 'Characters must be introduced before first date',
          required: true,
        },
      };

      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conditionData),
      });

      expect(response.status).toBe(201);

      const condition = await response.json();
      expect(condition).toMatchObject({
        id: expect.any(String),
        source_block_id: testPlotBlockIds[1],
        target_block_id: testPlotBlockIds[0],
        condition_type: 'prerequisite',
        operator: 'exists',
        value: null,
        metadata: expect.objectContaining({
          description: 'Characters must be introduced before first date',
        }),
        is_active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should create tag-based condition', async () => {
      const conditionData = {
        source_block_id: testPlotBlockIds[2], // Relationship Development
        target_block_id: testPlotBlockIds[1], // First Date
        condition_type: 'tag_presence',
        operator: 'has_tag',
        value: testTagIds[0], // completed tag
        metadata: {
          description:
            'First date must be completed before relationship can develop',
        },
      };

      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conditionData),
      });

      expect(response.status).toBe(201);

      const condition = await response.json();
      expect(condition).toMatchObject({
        condition_type: 'tag_presence',
        operator: 'has_tag',
        value: testTagIds[0],
      });
    });

    it('should create attribute-based condition', async () => {
      const conditionData = {
        source_block_id: testPlotBlockIds[3], // Conflict Resolution
        target_block_id: testPlotBlockIds[2], // Relationship Development
        condition_type: 'attribute',
        operator: 'greater_than',
        value: '{"progress": 75}',
        metadata: {
          description:
            'Relationship must be 75% developed before conflict resolution',
        },
      };

      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conditionData),
      });

      expect(response.status).toBe(201);

      const condition = await response.json();
      expect(condition).toMatchObject({
        condition_type: 'attribute',
        operator: 'greater_than',
        value: '{"progress": 75}',
      });
    });

    it('should create custom logic condition', async () => {
      const conditionData = {
        source_block_id: testPlotBlockIds[3], // Conflict Resolution
        target_block_id: null, // Global condition
        condition_type: 'custom',
        operator: 'and',
        value: JSON.stringify({
          conditions: [
            {
              type: 'prerequisite',
              target: testPlotBlockIds[0],
              operator: 'completed',
            },
            {
              type: 'tag_presence',
              target: testPlotBlockIds[1],
              tag: testTagIds[2],
            },
          ],
        }),
        metadata: {
          description:
            'Complex condition: Character intro completed AND romance established',
        },
      };

      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conditionData),
      });

      expect(response.status).toBe(201);

      const condition = await response.json();
      expect(condition).toMatchObject({
        condition_type: 'custom',
        operator: 'and',
      });
    });

    it('should reject condition with non-existent plot blocks', async () => {
      const conditionData = {
        source_block_id: 'non-existent-source',
        target_block_id: 'non-existent-target',
        condition_type: 'prerequisite',
        operator: 'exists',
      };

      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conditionData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('plot block'),
      });
    });

    it('should reject circular condition dependencies', async () => {
      // Create A depends on B
      await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_block_id: testPlotBlockIds[0],
          target_block_id: testPlotBlockIds[1],
          condition_type: 'prerequisite',
          operator: 'exists',
        }),
      });

      // Try to create B depends on A (circular)
      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_block_id: testPlotBlockIds[1],
          target_block_id: testPlotBlockIds[0],
          condition_type: 'prerequisite',
          operator: 'exists',
        }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('circular'),
      });
    });

    it('should validate condition data', async () => {
      const invalidData = {
        source_block_id: '', // Empty
        target_block_id: null,
        condition_type: 'invalid-type', // Invalid type
        operator: 'invalid-operator', // Invalid operator
        value: 'x'.repeat(1001), // Too long
        metadata: 'not-an-object', // Invalid type
      };

      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('Validation Error');
      expect(error.details).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/plot-block-conditions', () => {
    beforeEach(async () => {
      // Create test conditions
      const conditions = [
        {
          source_block_id: testPlotBlockIds[1],
          target_block_id: testPlotBlockIds[0],
          condition_type: 'prerequisite',
          operator: 'exists',
          metadata: { priority: 'high' },
        },
        {
          source_block_id: testPlotBlockIds[2],
          target_block_id: testPlotBlockIds[1],
          condition_type: 'tag_presence',
          operator: 'has_tag',
          value: testTagIds[0],
          metadata: { priority: 'medium' },
        },
        {
          source_block_id: testPlotBlockIds[3],
          target_block_id: testPlotBlockIds[2],
          condition_type: 'attribute',
          operator: 'greater_than',
          value: '50',
          is_active: false,
        },
      ];

      for (const condition of conditions) {
        await fetch('/api/v1/plot-block-conditions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(condition),
        });
      }
    });

    it('should retrieve all active conditions', async () => {
      const response = await fetch('/api/v1/plot-block-conditions');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        conditions: expect.arrayContaining([
          expect.objectContaining({
            condition_type: 'prerequisite',
            is_active: true,
          }),
          expect.objectContaining({
            condition_type: 'tag_presence',
            is_active: true,
          }),
        ]),
        total: expect.any(Number),
        page: 1,
        limit: 50,
      });

      // Should not include inactive conditions
      expect(
        data.conditions.find((c: any) => c.is_active === false)
      ).toBeUndefined();
    });

    it('should filter conditions by source block', async () => {
      const response = await fetch(
        `/api/v1/plot-block-conditions?source_block_id=${testPlotBlockIds[1]}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.conditions.every(
          (c: any) => c.source_block_id === testPlotBlockIds[1]
        )
      ).toBe(true);
    });

    it('should filter conditions by target block', async () => {
      const response = await fetch(
        `/api/v1/plot-block-conditions?target_block_id=${testPlotBlockIds[0]}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.conditions.every(
          (c: any) => c.target_block_id === testPlotBlockIds[0]
        )
      ).toBe(true);
    });

    it('should filter conditions by type', async () => {
      const response = await fetch(
        '/api/v1/plot-block-conditions?condition_type=prerequisite'
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.conditions.every((c: any) => c.condition_type === 'prerequisite')
      ).toBe(true);
    });

    it('should support pagination and sorting', async () => {
      const response = await fetch(
        '/api/v1/plot-block-conditions?page=1&limit=2&sort=created_at&order=desc'
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.conditions.length).toBeLessThanOrEqual(2);
      expect(data).toMatchObject({
        page: 1,
        limit: 2,
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });
    });

    it('should include related plot block data when requested', async () => {
      const response = await fetch(
        '/api/v1/plot-block-conditions?include_blocks=true'
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.conditions[0]).toMatchObject({
        source_block: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        }),
        target_block: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        }),
      });
    });
  });

  describe('GET /api/v1/plot-block-conditions/:id', () => {
    let testConditionId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_block_id: testPlotBlockIds[1],
          target_block_id: testPlotBlockIds[0],
          condition_type: 'prerequisite',
          operator: 'exists',
          metadata: { test: true },
        }),
      });

      const condition = await response.json();
      testConditionId = condition.id;
    });

    it('should retrieve a specific condition by ID', async () => {
      const response = await fetch(
        `/api/v1/plot-block-conditions/${testConditionId}`
      );

      expect(response.status).toBe(200);

      const condition = await response.json();
      expect(condition).toMatchObject({
        id: testConditionId,
        source_block_id: testPlotBlockIds[1],
        target_block_id: testPlotBlockIds[0],
        condition_type: 'prerequisite',
        operator: 'exists',
        metadata: expect.objectContaining({ test: true }),
        is_active: true,
      });
    });

    it('should include related blocks when requested', async () => {
      const response = await fetch(
        `/api/v1/plot-block-conditions/${testConditionId}?include_blocks=true`
      );

      expect(response.status).toBe(200);

      const condition = await response.json();
      expect(condition).toMatchObject({
        source_block: expect.objectContaining({
          id: testPlotBlockIds[1],
          name: expect.any(String),
        }),
        target_block: expect.objectContaining({
          id: testPlotBlockIds[0],
          name: expect.any(String),
        }),
      });
    });

    it('should return 404 for non-existent condition', async () => {
      const response = await fetch(
        '/api/v1/plot-block-conditions/non-existent-condition'
      );
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/plot-block-conditions/:id', () => {
    let testConditionId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_block_id: testPlotBlockIds[1],
          target_block_id: testPlotBlockIds[0],
          condition_type: 'prerequisite',
          operator: 'exists',
          metadata: { original: true },
        }),
      });

      const condition = await response.json();
      testConditionId = condition.id;
    });

    it('should update condition with valid data', async () => {
      const updateData = {
        operator: 'completed',
        value: '100',
        metadata: { updated: true },
      };

      const response = await fetch(
        `/api/v1/plot-block-conditions/${testConditionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      expect(response.status).toBe(200);

      const condition = await response.json();
      expect(condition).toMatchObject({
        id: testConditionId,
        operator: 'completed',
        value: '100',
        metadata: expect.objectContaining({ updated: true }),
      });
    });

    it('should prevent updating core relationship fields', async () => {
      const response = await fetch(
        `/api/v1/plot-block-conditions/${testConditionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_block_id: testPlotBlockIds[2], // Attempt to change source
            target_block_id: testPlotBlockIds[3], // Attempt to change target
            condition_type: 'tag_presence', // Attempt to change type
          }),
        }
      );

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('cannot be modified'),
      });
    });

    it('should validate circular dependencies on update', async () => {
      // Create reverse condition first
      const reverseResponse = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_block_id: testPlotBlockIds[0],
          target_block_id: testPlotBlockIds[2],
          condition_type: 'prerequisite',
          operator: 'exists',
        }),
      });
      const reverse = await reverseResponse.json();

      // Try to update to create circular dependency
      const response = await fetch(
        `/api/v1/plot-block-conditions/${reverse.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_block_id: testPlotBlockIds[1], // This would create A->B->A
          }),
        }
      );

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('circular'),
      });
    });
  });

  describe('DELETE /api/v1/plot-block-conditions/:id', () => {
    let testConditionId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_block_id: testPlotBlockIds[1],
          target_block_id: testPlotBlockIds[0],
          condition_type: 'prerequisite',
          operator: 'exists',
        }),
      });

      const condition = await response.json();
      testConditionId = condition.id;
    });

    it('should soft delete a condition', async () => {
      const response = await fetch(
        `/api/v1/plot-block-conditions/${testConditionId}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Condition deleted successfully',
        deleted: true,
        soft_delete: true,
      });
    });

    it('should return 404 for non-existent condition', async () => {
      const response = await fetch(
        '/api/v1/plot-block-conditions/non-existent',
        {
          method: 'DELETE',
        }
      );
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/plot-blocks/:id/validate-conditions', () => {
    let testPlotBlockId: string;
    let conditionIds: string[];

    beforeEach(async () => {
      testPlotBlockId = testPlotBlockIds[2]; // Relationship Development
      conditionIds = [];

      // Create multiple conditions for the plot block
      const conditions = [
        {
          source_block_id: testPlotBlockId,
          target_block_id: testPlotBlockIds[0], // Character Introduction
          condition_type: 'prerequisite',
          operator: 'completed',
        },
        {
          source_block_id: testPlotBlockId,
          target_block_id: testPlotBlockIds[1], // First Date
          condition_type: 'tag_presence',
          operator: 'has_tag',
          value: testTagIds[0], // completed tag
        },
      ];

      for (const condition of conditions) {
        const response = await fetch('/api/v1/plot-block-conditions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(condition),
        });
        const created = await response.json();
        conditionIds.push(created.id);
      }
    });

    it('should validate all conditions for a plot block', async () => {
      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}/validate-conditions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: {
              completed_blocks: [testPlotBlockIds[0]], // Character Introduction completed
              block_tags: {
                [testPlotBlockIds[1]]: [testTagIds[0]], // First Date has completed tag
              },
            },
          }),
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: expect.any(Boolean),
        conditions: expect.arrayContaining([
          expect.objectContaining({
            condition_id: expect.any(String),
            valid: expect.any(Boolean),
            message: expect.any(String),
          }),
        ]),
        summary: expect.objectContaining({
          total_conditions: expect.any(Number),
          passed: expect.any(Number),
          failed: expect.any(Number),
        }),
      });
    });

    it('should return validation failures with details', async () => {
      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}/validate-conditions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: {
              completed_blocks: [], // No blocks completed
              block_tags: {},
            },
          }),
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.valid).toBe(false);
      expect(result.conditions.some((c: any) => c.valid === false)).toBe(true);
    });

    it('should handle complex condition logic', async () => {
      // Create complex condition
      const complexCondition = {
        source_block_id: testPlotBlockId,
        target_block_id: null,
        condition_type: 'custom',
        operator: 'or',
        value: JSON.stringify({
          conditions: [
            {
              type: 'prerequisite',
              target: testPlotBlockIds[0],
              operator: 'completed',
            },
            {
              type: 'tag_presence',
              target: testPlotBlockIds[1],
              tag: testTagIds[2],
            },
          ],
        }),
      };

      await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexCondition),
      });

      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}/validate-conditions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: {
              completed_blocks: [testPlotBlockIds[0]], // Only first condition met
              block_tags: {},
            },
          }),
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      // Should pass because it's OR logic and first condition is met
      expect(
        result.conditions.some(
          (c: any) => c.condition_type === 'custom' && c.valid === true
        )
      ).toBe(true);
    });
  });

  describe('GET /api/v1/plot-blocks/:id/dependencies', () => {
    let testPlotBlockId: string;

    beforeEach(async () => {
      testPlotBlockId = testPlotBlockIds[2]; // Relationship Development

      // Create dependency chain: 0 -> 1 -> 2 -> 3
      const dependencies = [
        { source: testPlotBlockIds[1], target: testPlotBlockIds[0] },
        { source: testPlotBlockIds[2], target: testPlotBlockIds[1] },
        { source: testPlotBlockIds[3], target: testPlotBlockIds[2] },
      ];

      for (const dep of dependencies) {
        await fetch('/api/v1/plot-block-conditions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_block_id: dep.source,
            target_block_id: dep.target,
            condition_type: 'prerequisite',
            operator: 'exists',
          }),
        });
      }
    });

    it('should return dependency graph for plot block', async () => {
      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}/dependencies`
      );

      expect(response.status).toBe(200);

      const deps = await response.json();
      expect(deps).toMatchObject({
        block_id: testPlotBlockId,
        direct_dependencies: expect.any(Array),
        all_dependencies: expect.any(Array),
        dependents: expect.any(Array),
        dependency_chain: expect.any(Array),
        has_circular_dependencies: false,
      });

      expect(deps.direct_dependencies).toHaveLength(1);
      expect(deps.all_dependencies.length).toBeGreaterThan(1);
    });

    it('should include detailed dependency information when requested', async () => {
      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}/dependencies?include_details=true`
      );

      expect(response.status).toBe(200);

      const deps = await response.json();
      if (deps.direct_dependencies.length > 0) {
        expect(deps.direct_dependencies[0]).toMatchObject({
          block: expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
          }),
          condition: expect.objectContaining({
            id: expect.any(String),
            condition_type: expect.any(String),
          }),
        });
      }
    });

    it('should detect circular dependencies', async () => {
      // Create circular dependency: 2 -> 0 (completing the circle)
      await fetch('/api/v1/plot-block-conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_block_id: testPlotBlockIds[0],
          target_block_id: testPlotBlockIds[3],
          condition_type: 'prerequisite',
          operator: 'exists',
        }),
      });

      const response = await fetch(
        `/api/v1/plot-blocks/${testPlotBlockId}/dependencies`
      );

      expect(response.status).toBe(200);

      const deps = await response.json();
      expect(deps.has_circular_dependencies).toBe(true);
      expect(deps.circular_paths).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/plot-block-conditions/types', () => {
    it('should return available condition types', async () => {
      const response = await fetch('/api/v1/plot-block-conditions/types');

      expect(response.status).toBe(200);

      const types = await response.json();
      expect(types).toMatchObject({
        condition_types: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            label: expect.any(String),
            description: expect.any(String),
            operators: expect.any(Array),
            value_type: expect.any(String),
          }),
        ]),
      });

      // Should include standard types
      const typeNames = types.condition_types.map((t: any) => t.name);
      expect(typeNames).toEqual(
        expect.arrayContaining([
          'prerequisite',
          'tag_presence',
          'attribute',
          'custom',
        ])
      );
    });
  });

  describe('GET /api/v1/plot-block-conditions/operators', () => {
    it('should return available operators by condition type', async () => {
      const response = await fetch(
        '/api/v1/plot-block-conditions/operators?condition_type=attribute'
      );

      expect(response.status).toBe(200);

      const operators = await response.json();
      expect(operators).toMatchObject({
        condition_type: 'attribute',
        operators: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            label: expect.any(String),
            description: expect.any(String),
            value_required: expect.any(Boolean),
          }),
        ]),
      });

      // Should include standard operators for attributes
      const operatorNames = operators.operators.map((o: any) => o.name);
      expect(operatorNames).toEqual(
        expect.arrayContaining([
          'equals',
          'greater_than',
          'less_than',
          'contains',
        ])
      );
    });

    it('should return all operators when no type specified', async () => {
      const response = await fetch('/api/v1/plot-block-conditions/operators');

      expect(response.status).toBe(200);

      const operators = await response.json();
      expect(operators).toMatchObject({
        operators_by_type: expect.any(Object),
      });
    });
  });
});
