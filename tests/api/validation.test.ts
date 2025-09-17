/**
 * Validation Endpoint API Contract Tests
 *
 * Tests the validation service endpoints including:
 * - Schema validation for all entity types
 * - Business rule validation
 * - Cross-entity relationship validation
 * - Tag rule enforcement
 * - Plot conflict detection
 * - Error handling and validation reporting
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

describe('Validation Endpoint API Contract Tests', () => {
  let testFandomId: number;
  let testTagClassId: string;
  let testTagIds: string[];
  let testPlotBlockIds: string[];

  beforeAll(async () => {
    // Create test fandom
    const fandomResponse = await fetch('/api/v1/fandoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Validation Test Fandom',
        slug: 'validation-test-fandom',
        description: 'Fandom for validation testing',
      }),
    });
    const fandom = await fandomResponse.json();
    testFandomId = fandom.id;

    // Create test tag class with validation rules
    const tagClassResponse = await fetch('/api/v1/tag-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Character Relationship',
        slug: 'character-relationship',
        description: 'Tags for character relationships',
        validation_rules: {
          mutual_exclusion: ['single', 'married', 'divorced'],
          required_context: ['character-name'],
          max_instances: 2,
        },
      }),
    });
    const tagClass = await tagClassResponse.json();
    testTagClassId = tagClass.id;

    // Create test tags and plot blocks for testing
    testTagIds = [];
    testPlotBlockIds = [];
  });

  afterAll(() => {
    console.log('Cleaning up Validation API tests');
  });

  beforeEach(() => {
    console.log('Resetting validation test state');
  });

  describe('POST /api/v1/validate/schema', () => {
    it('should validate valid fandom data', async () => {
      const validFandomData = {
        entity_type: 'fandom',
        data: {
          name: 'Valid Test Fandom',
          slug: 'valid-test-fandom',
          description: 'A properly formatted fandom for testing',
          metadata: {
            genre: 'fantasy',
            status: 'active',
          },
        },
      };

      const response = await fetch('/api/v1/validate/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validFandomData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        entity_type: 'fandom',
        errors: [],
        warnings: [],
        normalized_data: expect.objectContaining({
          name: 'Valid Test Fandom',
          slug: 'valid-test-fandom',
        }),
      });
    });

    it('should validate valid tag data', async () => {
      const validTagData = {
        entity_type: 'tag',
        data: {
          name: 'Romance',
          slug: 'romance',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
          metadata: {
            color: '#ff6b9d',
            icon: 'heart',
          },
        },
      };

      const response = await fetch('/api/v1/validate/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTagData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        entity_type: 'tag',
        errors: [],
        normalized_data: expect.objectContaining({
          name: 'Romance',
          fandom_id: testFandomId,
        }),
      });
    });

    it('should validate valid plot block data', async () => {
      const validPlotBlockData = {
        entity_type: 'plot_block',
        data: {
          name: 'Character Development Arc',
          slug: 'character-development-arc',
          description: 'A complete character growth storyline',
          fandom_id: testFandomId,
          category: 'character-development',
          complexity: 'moderate',
          metadata: {
            typical_length: '3-5 chapters',
            emotional_tone: 'hopeful',
          },
        },
      };

      const response = await fetch('/api/v1/validate/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPlotBlockData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        entity_type: 'plot_block',
        errors: [],
        normalized_data: expect.objectContaining({
          name: 'Character Development Arc',
          category: 'character-development',
        }),
      });
    });

    it('should reject invalid fandom data', async () => {
      const invalidFandomData = {
        entity_type: 'fandom',
        data: {
          name: '', // Empty name
          slug: 'invalid slug!', // Invalid characters
          description: 'x'.repeat(1001), // Too long
          metadata: 'not-an-object', // Invalid type
        },
      };

      const response = await fetch('/api/v1/validate/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidFandomData),
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        entity_type: 'fandom',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.any(String),
            code: expect.any(String),
          }),
          expect.objectContaining({
            field: 'slug',
            message: expect.any(String),
            code: expect.any(String),
          }),
        ]),
      });
    });

    it('should reject unknown entity type', async () => {
      const unknownTypeData = {
        entity_type: 'unknown_entity',
        data: { some: 'data' },
      };

      const response = await fetch('/api/v1/validate/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unknownTypeData),
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('unknown entity type'),
      });
    });

    it('should provide warnings for deprecated fields', async () => {
      const dataWithDeprecatedFields = {
        entity_type: 'fandom',
        data: {
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test description',
          legacy_field: 'deprecated value', // Deprecated field
          old_metadata_format: { key: 'value' }, // Old format
        },
      };

      const response = await fetch('/api/v1/validate/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithDeprecatedFields),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        warnings: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.stringContaining('deprecated'),
            code: 'DEPRECATED_FIELD',
          }),
        ]),
      });
    });
  });

  describe('POST /api/v1/validate/business-rules', () => {
    beforeEach(async () => {
      // Create test tags for business rule validation
      const tagResponse1 = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Single',
          slug: 'single',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        }),
      });
      const tag1 = await tagResponse1.json();
      testTagIds.push(tag1.id);

      const tagResponse2 = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Married',
          slug: 'married',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        }),
      });
      const tag2 = await tagResponse2.json();
      testTagIds.push(tag2.id);
    });

    it('should validate tag class mutual exclusion rules', async () => {
      const ruleValidationData = {
        rule_type: 'tag_class_mutual_exclusion',
        context: {
          tag_class_id: testTagClassId,
          applied_tags: [testTagIds[0], testTagIds[1]], // Single AND Married (conflict)
          entity_type: 'plot_block',
          entity_id: 'test-plot-block',
        },
      };

      const response = await fetch('/api/v1/validate/business-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleValidationData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        rule_type: 'tag_class_mutual_exclusion',
        violations: expect.arrayContaining([
          expect.objectContaining({
            rule: 'mutual_exclusion',
            message: expect.stringContaining('mutually exclusive'),
            conflicting_tags: expect.arrayContaining([
              testTagIds[0],
              testTagIds[1],
            ]),
            severity: 'error',
          }),
        ]),
      });
    });

    it('should validate tag class required context rules', async () => {
      const ruleValidationData = {
        rule_type: 'tag_class_required_context',
        context: {
          tag_class_id: testTagClassId,
          applied_tags: [testTagIds[0]],
          entity_metadata: {}, // Missing required character-name context
          entity_type: 'plot_block',
        },
      };

      const response = await fetch('/api/v1/validate/business-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleValidationData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        rule_type: 'tag_class_required_context',
        violations: expect.arrayContaining([
          expect.objectContaining({
            rule: 'required_context',
            message: expect.stringContaining('character-name'),
            missing_context: expect.arrayContaining(['character-name']),
            severity: 'error',
          }),
        ]),
      });
    });

    it('should validate tag instance count limits', async () => {
      const ruleValidationData = {
        rule_type: 'tag_class_instance_limit',
        context: {
          tag_class_id: testTagClassId,
          applied_tags: [testTagIds[0], testTagIds[1], 'extra-tag'], // Exceeds max_instances: 2
          entity_type: 'plot_block',
          entity_id: 'test-plot-block',
        },
      };

      const response = await fetch('/api/v1/validate/business-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleValidationData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        rule_type: 'tag_class_instance_limit',
        violations: expect.arrayContaining([
          expect.objectContaining({
            rule: 'max_instances',
            message: expect.stringContaining('maximum of 2'),
            current_count: 3,
            max_allowed: 2,
            severity: 'error',
          }),
        ]),
      });
    });

    it('should validate plot block hierarchy rules', async () => {
      const ruleValidationData = {
        rule_type: 'plot_block_hierarchy',
        context: {
          source_block_id: 'child-block',
          target_parent_id: 'parent-block',
          existing_hierarchy: {
            'parent-block': { children: ['child-block'] },
            'child-block': {
              parent: 'parent-block',
              children: ['grandchild-block'],
            },
          },
        },
      };

      const response = await fetch('/api/v1/validate/business-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleValidationData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.valid).toBe(true); // Valid hierarchy move
    });

    it('should detect circular hierarchy violations', async () => {
      const ruleValidationData = {
        rule_type: 'plot_block_hierarchy',
        context: {
          source_block_id: 'parent-block',
          target_parent_id: 'child-block', // Would create circular reference
          existing_hierarchy: {
            'parent-block': { children: ['child-block'] },
            'child-block': { parent: 'parent-block' },
          },
        },
      };

      const response = await fetch('/api/v1/validate/business-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleValidationData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        rule_type: 'plot_block_hierarchy',
        violations: expect.arrayContaining([
          expect.objectContaining({
            rule: 'no_circular_references',
            message: expect.stringContaining('circular'),
            circular_path: expect.any(Array),
            severity: 'error',
          }),
        ]),
      });
    });

    it('should validate unknown rule type gracefully', async () => {
      const ruleValidationData = {
        rule_type: 'unknown_rule_type',
        context: { some: 'data' },
      };

      const response = await fetch('/api/v1/validate/business-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleValidationData),
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('unknown rule type'),
      });
    });
  });

  describe('POST /api/v1/validate/relationships', () => {
    beforeEach(async () => {
      // Create test plot blocks for relationship validation
      const block1Response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Character Introduction',
          slug: 'character-introduction',
          fandom_id: testFandomId,
          category: 'character-development',
          complexity: 'simple',
        }),
      });
      const block1 = await block1Response.json();
      testPlotBlockIds.push(block1.id);

      const block2Response = await fetch('/api/v1/plot-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Relationship Development',
          slug: 'relationship-development',
          fandom_id: testFandomId,
          category: 'relationship',
          complexity: 'moderate',
        }),
      });
      const block2 = await block2Response.json();
      testPlotBlockIds.push(block2.id);
    });

    it('should validate fandom-scoped relationships', async () => {
      const relationshipData = {
        relationship_type: 'fandom_scoped',
        context: {
          entities: [
            { type: 'tag', id: testTagIds[0], fandom_id: testFandomId },
            {
              type: 'plot_block',
              id: testPlotBlockIds[0],
              fandom_id: testFandomId,
            },
          ],
        },
      };

      const response = await fetch('/api/v1/validate/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationshipData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        relationship_type: 'fandom_scoped',
        validated_relationships: expect.any(Array),
      });
    });

    it('should detect cross-fandom relationship violations', async () => {
      // Create another fandom
      const fandom2Response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Other Fandom',
          slug: 'other-fandom',
          description: 'Different fandom for testing',
        }),
      });
      const fandom2 = await fandom2Response.json();

      const relationshipData = {
        relationship_type: 'fandom_scoped',
        context: {
          entities: [
            { type: 'tag', id: testTagIds[0], fandom_id: testFandomId },
            {
              type: 'plot_block',
              id: testPlotBlockIds[0],
              fandom_id: fandom2.id,
            }, // Different fandom
          ],
        },
      };

      const response = await fetch('/api/v1/validate/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationshipData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        relationship_type: 'fandom_scoped',
        violations: expect.arrayContaining([
          expect.objectContaining({
            rule: 'same_fandom_required',
            message: expect.stringContaining('same fandom'),
            conflicting_entities: expect.any(Array),
            severity: 'error',
          }),
        ]),
      });
    });

    it('should validate tag-plot block associations', async () => {
      const relationshipData = {
        relationship_type: 'tag_plot_block_association',
        context: {
          tag_id: testTagIds[0],
          plot_block_id: testPlotBlockIds[0],
          tag_class_rules: {
            applicable_categories: ['character-development', 'relationship'],
            excluded_categories: ['action'],
          },
        },
      };

      const response = await fetch('/api/v1/validate/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationshipData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        relationship_type: 'tag_plot_block_association',
      });
    });

    it('should detect invalid tag-plot block category mismatches', async () => {
      const relationshipData = {
        relationship_type: 'tag_plot_block_association',
        context: {
          tag_id: testTagIds[0],
          plot_block_id: testPlotBlockIds[0],
          tag_class_rules: {
            applicable_categories: ['relationship'],
            excluded_categories: ['character-development'], // Plot block is character-development
          },
        },
      };

      const response = await fetch('/api/v1/validate/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationshipData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        relationship_type: 'tag_plot_block_association',
        violations: expect.arrayContaining([
          expect.objectContaining({
            rule: 'category_compatibility',
            message: expect.stringContaining('not applicable'),
            severity: 'error',
          }),
        ]),
      });
    });

    it('should validate plot block condition relationships', async () => {
      const relationshipData = {
        relationship_type: 'plot_block_condition',
        context: {
          source_block_id: testPlotBlockIds[1],
          target_block_id: testPlotBlockIds[0],
          condition_type: 'prerequisite',
          existing_conditions: [], // No existing conditions
        },
      };

      const response = await fetch('/api/v1/validate/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationshipData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        relationship_type: 'plot_block_condition',
      });
    });
  });

  describe('POST /api/v1/validate/conflicts', () => {
    it('should detect plot conflicts', async () => {
      const conflictData = {
        conflict_type: 'plot_conflicts',
        context: {
          plot_blocks: [
            {
              id: testPlotBlockIds[0],
              category: 'character-development',
              tags: [testTagIds[0]], // Single
              metadata: { character_name: 'Alice' },
            },
            {
              id: testPlotBlockIds[1],
              category: 'relationship',
              tags: [testTagIds[1]], // Married
              metadata: { character_name: 'Alice' }, // Same character
            },
          ],
        },
      };

      const response = await fetch('/api/v1/validate/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflictData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        has_conflicts: true,
        conflict_type: 'plot_conflicts',
        conflicts: expect.arrayContaining([
          expect.objectContaining({
            type: 'tag_mutual_exclusion',
            message: expect.stringContaining('conflicting'),
            involved_blocks: expect.arrayContaining([
              testPlotBlockIds[0],
              testPlotBlockIds[1],
            ]),
            severity: 'error',
          }),
        ]),
      });
    });

    it('should detect timeline conflicts', async () => {
      const conflictData = {
        conflict_type: 'timeline_conflicts',
        context: {
          plot_blocks: [
            {
              id: testPlotBlockIds[0],
              metadata: { timeline_position: 100, duration: 50 },
            },
            {
              id: testPlotBlockIds[1],
              metadata: { timeline_position: 120, duration: 40 }, // Overlapping
            },
          ],
        },
      };

      const response = await fetch('/api/v1/validate/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflictData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        has_conflicts: true,
        conflict_type: 'timeline_conflicts',
        conflicts: expect.arrayContaining([
          expect.objectContaining({
            type: 'timeline_overlap',
            message: expect.stringContaining('overlap'),
            severity: 'warning', // Timeline overlaps might be warnings, not errors
          }),
        ]),
      });
    });

    it('should report no conflicts when none exist', async () => {
      const conflictData = {
        conflict_type: 'plot_conflicts',
        context: {
          plot_blocks: [
            {
              id: testPlotBlockIds[0],
              category: 'character-development',
              tags: [testTagIds[0]],
              metadata: { character_name: 'Alice' },
            },
            {
              id: testPlotBlockIds[1],
              category: 'character-development',
              tags: [testTagIds[0]], // Same tag, different character - no conflict
              metadata: { character_name: 'Bob' },
            },
          ],
        },
      };

      const response = await fetch('/api/v1/validate/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflictData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        has_conflicts: false,
        conflict_type: 'plot_conflicts',
        conflicts: [],
      });
    });
  });

  describe('POST /api/v1/validate/batch', () => {
    it('should perform batch validation of multiple entities', async () => {
      const batchData = {
        validations: [
          {
            type: 'schema',
            entity_type: 'fandom',
            data: {
              name: 'Batch Test Fandom',
              slug: 'batch-test-fandom',
              description: 'Fandom for batch testing',
            },
          },
          {
            type: 'business-rules',
            rule_type: 'tag_class_mutual_exclusion',
            context: {
              tag_class_id: testTagClassId,
              applied_tags: [testTagIds[0]], // Valid single tag
              entity_type: 'plot_block',
            },
          },
          {
            type: 'relationships',
            relationship_type: 'fandom_scoped',
            context: {
              entities: [
                { type: 'tag', id: testTagIds[0], fandom_id: testFandomId },
                {
                  type: 'plot_block',
                  id: testPlotBlockIds[0],
                  fandom_id: testFandomId,
                },
              ],
            },
          },
        ],
      };

      const response = await fetch('/api/v1/validate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        overall_valid: true,
        results: expect.arrayContaining([
          expect.objectContaining({
            type: 'schema',
            valid: true,
          }),
          expect.objectContaining({
            type: 'business-rules',
            valid: true,
          }),
          expect.objectContaining({
            type: 'relationships',
            valid: true,
          }),
        ]),
        summary: expect.objectContaining({
          total_validations: 3,
          passed: 3,
          failed: 0,
          warnings: expect.any(Number),
        }),
      });
    });

    it('should report batch validation failures', async () => {
      const batchData = {
        validations: [
          {
            type: 'schema',
            entity_type: 'fandom',
            data: {
              name: '', // Invalid
              slug: 'invalid slug!', // Invalid
              description: 'Valid description',
            },
          },
          {
            type: 'business-rules',
            rule_type: 'tag_class_mutual_exclusion',
            context: {
              tag_class_id: testTagClassId,
              applied_tags: [testTagIds[0], testTagIds[1]], // Conflicting tags
              entity_type: 'plot_block',
            },
          },
        ],
      };

      const response = await fetch('/api/v1/validate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        overall_valid: false,
        results: expect.arrayContaining([
          expect.objectContaining({
            type: 'schema',
            valid: false,
            errors: expect.any(Array),
          }),
          expect.objectContaining({
            type: 'business-rules',
            valid: false,
            violations: expect.any(Array),
          }),
        ]),
        summary: expect.objectContaining({
          total_validations: 2,
          passed: 0,
          failed: 2,
        }),
      });
    });

    it('should handle partial batch validation failures', async () => {
      const batchData = {
        validations: [
          {
            type: 'schema',
            entity_type: 'fandom',
            data: {
              name: 'Valid Fandom',
              slug: 'valid-fandom',
              description: 'Valid description',
            },
          },
          {
            type: 'business-rules',
            rule_type: 'tag_class_mutual_exclusion',
            context: {
              tag_class_id: testTagClassId,
              applied_tags: [testTagIds[0], testTagIds[1]], // Invalid
              entity_type: 'plot_block',
            },
          },
        ],
      };

      const response = await fetch('/api/v1/validate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        overall_valid: false, // False because not all validations passed
        results: expect.arrayContaining([
          expect.objectContaining({
            type: 'schema',
            valid: true,
          }),
          expect.objectContaining({
            type: 'business-rules',
            valid: false,
          }),
        ]),
        summary: expect.objectContaining({
          total_validations: 2,
          passed: 1,
          failed: 1,
        }),
      });
    });
  });

  describe('GET /api/v1/validate/rules', () => {
    it('should return available validation rules', async () => {
      const response = await fetch('/api/v1/validate/rules');

      expect(response.status).toBe(200);

      const rules = await response.json();
      expect(rules).toMatchObject({
        schema_rules: expect.arrayContaining([
          expect.objectContaining({
            entity_type: expect.any(String),
            rules: expect.any(Array),
          }),
        ]),
        business_rules: expect.arrayContaining([
          expect.objectContaining({
            rule_type: expect.any(String),
            description: expect.any(String),
            severity: expect.any(String),
          }),
        ]),
        relationship_rules: expect.arrayContaining([
          expect.objectContaining({
            relationship_type: expect.any(String),
            description: expect.any(String),
          }),
        ]),
      });
    });

    it('should filter rules by entity type', async () => {
      const response = await fetch('/api/v1/validate/rules?entity_type=fandom');

      expect(response.status).toBe(200);

      const rules = await response.json();
      expect(
        rules.schema_rules.every((rule: any) => rule.entity_type === 'fandom')
      ).toBe(true);
    });

    it('should filter rules by rule type', async () => {
      const response = await fetch(
        '/api/v1/validate/rules?rule_type=tag_class_mutual_exclusion'
      );

      expect(response.status).toBe(200);

      const rules = await response.json();
      expect(
        rules.business_rules.every(
          (rule: any) => rule.rule_type === 'tag_class_mutual_exclusion'
        )
      ).toBe(true);
    });
  });
});
