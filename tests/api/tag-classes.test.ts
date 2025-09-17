/**
 * TagClass API Contract Tests
 *
 * Tests the complete TagClass API interface including:
 * - CRUD operations with fandom scoping
 * - Validation rule management
 * - Tag association and validation
 * - Rule enforcement testing
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

describe('TagClass API Contract Tests', () => {
  let testFandomId: number;

  beforeAll(async () => {
    // Create test fandom
    const fandomResponse = await fetch('/api/v1/fandoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TagClass Test Fandom',
        slug: 'tagclass-test-fandom',
        description: 'Fandom for tag class testing',
      }),
    });
    const fandom = await fandomResponse.json();
    testFandomId = fandom.id;
  });

  afterAll(() => {
    console.log('Cleaning up TagClass API tests');
  });

  beforeEach(() => {
    console.log('Resetting tag class test state');
  });

  describe('POST /api/v1/tag-classes', () => {
    it('should create a new tag class with basic validation rules', async () => {
      const tagClassData = {
        name: 'Character Types',
        slug: 'character-types',
        description: 'Classification for character tags',
        fandom_id: testFandomId,
        validation_rules: {
          mutually_exclusive: true,
          required: false,
          max_selections: 1,
          allowed_values: ['protagonist', 'antagonist', 'supporting', 'minor'],
        },
      };

      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagClassData),
      });

      expect(response.status).toBe(201);

      const tagClass = await response.json();
      expect(tagClass).toMatchObject({
        id: expect.any(String),
        name: 'Character Types',
        slug: 'character-types',
        description: 'Classification for character tags',
        fandom_id: testFandomId,
        validation_rules: expect.objectContaining({
          mutually_exclusive: true,
          required: false,
          max_selections: 1,
          allowed_values: expect.arrayContaining(['protagonist', 'antagonist']),
        }),
        is_active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should create tag class with complex validation rules', async () => {
      const tagClassData = {
        name: 'Shipping Categories',
        slug: 'shipping-categories',
        description: 'Romantic relationship classifications',
        fandom_id: testFandomId,
        validation_rules: {
          mutually_exclusive: false,
          required: true,
          min_selections: 1,
          max_selections: 3,
          conditional_rules: {
            if_contains: ['het'],
            then_exclude: ['gen'],
          },
          custom_validation: {
            type: 'pattern',
            pattern: '^[a-z]+(/[a-z]+)*$',
            message: 'Ship tags must be lowercase with / separators',
          },
        },
      };

      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagClassData),
      });

      expect(response.status).toBe(201);

      const tagClass = await response.json();
      expect(tagClass.validation_rules).toMatchObject({
        mutually_exclusive: false,
        required: true,
        min_selections: 1,
        max_selections: 3,
        conditional_rules: expect.any(Object),
        custom_validation: expect.any(Object),
      });
    });

    it('should create tag class with minimal required data', async () => {
      const tagClassData = {
        name: 'Simple Class',
        slug: 'simple-class',
        fandom_id: testFandomId,
      };

      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagClassData),
      });

      expect(response.status).toBe(201);

      const tagClass = await response.json();
      expect(tagClass.validation_rules).toEqual({});
    });

    it('should reject tag class with non-existent fandom', async () => {
      const tagClassData = {
        name: 'Invalid Fandom Class',
        slug: 'invalid-fandom-class',
        fandom_id: 99999,
      };

      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagClassData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('fandom'),
        field: 'fandom_id',
      });
    });

    it('should reject tag class with duplicate name in same fandom', async () => {
      const tagClassData = {
        name: 'Duplicate Class',
        slug: 'duplicate-class-1',
        fandom_id: testFandomId,
      };

      // Create first tag class
      await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagClassData),
      });

      // Attempt duplicate
      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tagClassData,
          slug: 'duplicate-class-2',
        }),
      });

      expect(response.status).toBe(409);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Conflict',
        message: expect.stringContaining('already exists'),
        field: 'name',
      });
    });

    it('should validate tag class data', async () => {
      const invalidData = {
        name: '', // Empty name
        slug: 'invalid slug!', // Invalid characters
        description: 'x'.repeat(1001), // Too long
        fandom_id: 'not-a-number', // Invalid type
        validation_rules: 'not-an-object', // Invalid type
      };

      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('Validation Error');
      expect(error.details).toBeInstanceOf(Array);
    });

    it('should validate validation rules structure', async () => {
      const invalidRulesData = {
        name: 'Invalid Rules Class',
        slug: 'invalid-rules-class',
        fandom_id: testFandomId,
        validation_rules: {
          mutually_exclusive: 'not-boolean',
          max_selections: -1,
          allowed_values: 'not-array',
          conditional_rules: {
            malformed: true,
          },
        },
      };

      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRulesData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Validation Error',
        message: expect.stringContaining('validation_rules'),
      });
    });
  });

  describe('GET /api/v1/tag-classes', () => {
    beforeEach(async () => {
      // Create test tag classes
      const tagClasses = [
        {
          name: 'Active Class 1',
          slug: 'active-class-1',
          fandom_id: testFandomId,
          validation_rules: { required: true },
        },
        {
          name: 'Active Class 2',
          slug: 'active-class-2',
          fandom_id: testFandomId,
          validation_rules: { mutually_exclusive: true },
        },
        {
          name: 'Inactive Class',
          slug: 'inactive-class',
          fandom_id: testFandomId,
          is_active: false,
        },
      ];

      for (const tagClass of tagClasses) {
        await fetch('/api/v1/tag-classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tagClass),
        });
      }
    });

    it('should retrieve all active tag classes', async () => {
      const response = await fetch('/api/v1/tag-classes');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        tag_classes: expect.arrayContaining([
          expect.objectContaining({ name: 'Active Class 1', is_active: true }),
          expect.objectContaining({ name: 'Active Class 2', is_active: true }),
        ]),
        total: expect.any(Number),
        page: 1,
        limit: 50,
      });

      // Should not include inactive tag classes
      expect(
        data.tag_classes.find((tc: any) => tc.name === 'Inactive Class')
      ).toBeUndefined();
    });

    it('should filter tag classes by fandom', async () => {
      const response = await fetch(
        `/api/v1/tag-classes?fandom_id=${testFandomId}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.tag_classes.every((tc: any) => tc.fandom_id === testFandomId)
      ).toBe(true);
    });

    it('should support text search', async () => {
      const response = await fetch('/api/v1/tag-classes?search=Active Class 1');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tag_classes).toHaveLength(1);
      expect(data.tag_classes[0].name).toBe('Active Class 1');
    });

    it('should include validation rule summaries', async () => {
      const response = await fetch('/api/v1/tag-classes?include_rules=true');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tag_classes[0]).toMatchObject({
        validation_rules: expect.any(Object),
        rule_summary: expect.objectContaining({
          has_restrictions: expect.any(Boolean),
          is_required: expect.any(Boolean),
          is_exclusive: expect.any(Boolean),
        }),
      });
    });

    it('should support pagination and sorting', async () => {
      const response = await fetch(
        '/api/v1/tag-classes?page=1&limit=1&sort=name&order=asc'
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tag_classes).toHaveLength(1);
      expect(data).toMatchObject({
        page: 1,
        limit: 1,
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });
    });
  });

  describe('GET /api/v1/tag-classes/:id', () => {
    let testTagClassId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Single Test Class',
          slug: 'single-test-class',
          description: 'Tag class for single retrieval test',
          fandom_id: testFandomId,
          validation_rules: {
            required: true,
            max_selections: 2,
          },
        }),
      });

      const tagClass = await response.json();
      testTagClassId = tagClass.id;
    });

    it('should retrieve a specific tag class by ID', async () => {
      const response = await fetch(`/api/v1/tag-classes/${testTagClassId}`);

      expect(response.status).toBe(200);

      const tagClass = await response.json();
      expect(tagClass).toMatchObject({
        id: testTagClassId,
        name: 'Single Test Class',
        slug: 'single-test-class',
        description: 'Tag class for single retrieval test',
        fandom_id: testFandomId,
        validation_rules: expect.objectContaining({
          required: true,
          max_selections: 2,
        }),
        is_active: true,
      });
    });

    it('should include associated tags when requested', async () => {
      // Create a tag associated with this class first
      await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'associated-tag',
          slug: 'associated-tag',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        }),
      });

      const response = await fetch(
        `/api/v1/tag-classes/${testTagClassId}?include_tags=true`
      );

      expect(response.status).toBe(200);

      const tagClass = await response.json();
      expect(tagClass).toMatchObject({
        associated_tags: expect.arrayContaining([
          expect.objectContaining({ name: 'associated-tag' }),
        ]),
        tag_count: expect.any(Number),
      });
    });

    it('should return 404 for non-existent tag class', async () => {
      const response = await fetch('/api/v1/tag-classes/non-existent-class');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/tag-classes/:id', () => {
    let testTagClassId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updateable Class',
          slug: 'updateable-class',
          description: 'Original description',
          fandom_id: testFandomId,
          validation_rules: {
            required: false,
            max_selections: 1,
          },
        }),
      });

      const tagClass = await response.json();
      testTagClassId = tagClass.id;
    });

    it('should update tag class with valid data', async () => {
      const updateData = {
        description: 'Updated description',
        validation_rules: {
          required: true,
          max_selections: 3,
          mutually_exclusive: false,
          allowed_values: ['option1', 'option2', 'option3'],
        },
      };

      const response = await fetch(`/api/v1/tag-classes/${testTagClassId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const tagClass = await response.json();
      expect(tagClass).toMatchObject({
        id: testTagClassId,
        description: 'Updated description',
        validation_rules: expect.objectContaining({
          required: true,
          max_selections: 3,
          mutually_exclusive: false,
          allowed_values: expect.arrayContaining(['option1', 'option2']),
        }),
      });
    });

    it('should prevent updating core identifying fields', async () => {
      const response = await fetch(`/api/v1/tag-classes/${testTagClassId}`, {
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

    it('should validate updated validation rules', async () => {
      const response = await fetch(`/api/v1/tag-classes/${testTagClassId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validation_rules: {
            max_selections: -1, // Invalid negative value
            conditional_rules: {
              malformed: true,
            },
          },
        }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('Validation Error');
    });

    it('should warn about breaking changes to existing tags', async () => {
      // Create tags associated with this class
      await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'existing-tag-1',
          slug: 'existing-tag-1',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        }),
      });

      await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'existing-tag-2',
          slug: 'existing-tag-2',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        }),
      });

      // Try to update rules that would conflict with existing tags
      const response = await fetch(`/api/v1/tag-classes/${testTagClassId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validation_rules: {
            mutually_exclusive: true, // This conflicts with having 2 existing tags
            max_selections: 1,
          },
        }),
      });

      expect(response.status).toBe(409);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Conflict',
        message: expect.stringContaining('existing tags'),
        affected_tags: expect.any(Array),
      });
    });
  });

  describe('DELETE /api/v1/tag-classes/:id', () => {
    let testTagClassId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Deletable Class',
          slug: 'deletable-class',
          description: 'Tag class to be deleted',
          fandom_id: testFandomId,
        }),
      });

      const tagClass = await response.json();
      testTagClassId = tagClass.id;
    });

    it('should soft delete a tag class', async () => {
      const response = await fetch(`/api/v1/tag-classes/${testTagClassId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Tag class deleted successfully',
        deleted: true,
        soft_delete: true,
      });
    });

    it('should handle tag class with associated tags', async () => {
      // Create tag associated with this class
      await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'dependent-tag',
          slug: 'dependent-tag',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        }),
      });

      const response = await fetch(`/api/v1/tag-classes/${testTagClassId}`, {
        method: 'DELETE',
      });

      // Should either cascade delete or set tag_class_id to null
      expect([200, 409]).toContain(response.status);

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toMatchObject({
          orphaned_tags: expect.any(Number),
        });
      }
    });

    it('should support force deletion', async () => {
      const response = await fetch(
        `/api/v1/tag-classes/${testTagClassId}?force=true`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.soft_delete).toBe(false);
    });
  });

  describe('POST /api/v1/tag-classes/:id/validate', () => {
    let testTagClassId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tag-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Validation Test Class',
          slug: 'validation-test-class',
          fandom_id: testFandomId,
          validation_rules: {
            required: true,
            mutually_exclusive: true,
            max_selections: 1,
            allowed_values: ['option1', 'option2', 'option3'],
          },
        }),
      });

      const tagClass = await response.json();
      testTagClassId = tagClass.id;
    });

    it('should validate tag selection against rules', async () => {
      const validationData = {
        selected_tags: ['option1'],
      };

      const response = await fetch(
        `/api/v1/tag-classes/${testTagClassId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validationData),
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: true,
        tag_class_id: testTagClassId,
        selected_tags: ['option1'],
        validation_summary: {
          required_satisfied: true,
          exclusivity_satisfied: true,
          count_satisfied: true,
          allowed_values_satisfied: true,
        },
      });
    });

    it('should reject invalid tag selections', async () => {
      const invalidData = {
        selected_tags: ['option1', 'option2'], // Violates mutually_exclusive
      };

      const response = await fetch(
        `/api/v1/tag-classes/${testTagClassId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData),
        }
      );

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            rule: 'mutually_exclusive',
            message: expect.stringContaining('only one'),
          }),
        ]),
      });
    });

    it('should validate empty selection against required rules', async () => {
      const emptyData = {
        selected_tags: [],
      };

      const response = await fetch(
        `/api/v1/tag-classes/${testTagClassId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emptyData),
        }
      );

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            rule: 'required',
            message: expect.stringContaining('required'),
          }),
        ]),
      });
    });

    it('should validate against allowed values', async () => {
      const invalidValueData = {
        selected_tags: ['invalid-option'],
      };

      const response = await fetch(
        `/api/v1/tag-classes/${testTagClassId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidValueData),
        }
      );

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            rule: 'allowed_values',
            message: expect.stringContaining('not allowed'),
          }),
        ]),
      });
    });
  });

  describe('GET /api/v1/fandoms/:fandomId/tag-classes/summary', () => {
    beforeEach(async () => {
      // Create various tag classes with different rules
      const tagClasses = [
        {
          name: 'Required Class',
          slug: 'required-class',
          fandom_id: testFandomId,
          validation_rules: { required: true },
        },
        {
          name: 'Optional Class',
          slug: 'optional-class',
          fandom_id: testFandomId,
          validation_rules: { required: false },
        },
        {
          name: 'Exclusive Class',
          slug: 'exclusive-class',
          fandom_id: testFandomId,
          validation_rules: { mutually_exclusive: true },
        },
      ];

      for (const tagClass of tagClasses) {
        await fetch('/api/v1/tag-classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tagClass),
        });
      }
    });

    it('should return tag class summary for a fandom', async () => {
      const response = await fetch(
        `/api/v1/fandoms/${testFandomId}/tag-classes/summary`
      );

      expect(response.status).toBe(200);

      const summary = await response.json();
      expect(summary).toMatchObject({
        fandom_id: testFandomId,
        total_classes: expect.any(Number),
        required_classes: expect.any(Number),
        optional_classes: expect.any(Number),
        exclusive_classes: expect.any(Number),
        classes_with_restrictions: expect.any(Number),
        validation_complexity: expect.any(String), // 'simple', 'moderate', 'complex'
        classes: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            is_required: expect.any(Boolean),
            is_exclusive: expect.any(Boolean),
            has_restrictions: expect.any(Boolean),
          }),
        ]),
      });
    });

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/fandoms/99999/tag-classes/summary');
      expect(response.status).toBe(404);
    });
  });
});
