/**
 * Tag API Contract Tests
 *
 * Tests the complete Tag API interface including:
 * - CRUD operations scoped to fandoms
 * - Tag class association and validation
 * - Hierarchical tag relationships
 * - Bulk operations and filtering
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

describe('Tag API Contract Tests', () => {
  let testFandomId: number;
  let testTagClassId: string;

  beforeAll(async () => {
    // Create test fandom and tag class
    const fandomResponse = await fetch('/api/v1/fandoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Fandom',
        slug: 'test-fandom',
        description: 'Fandom for tag testing',
      }),
    });
    const fandom = await fandomResponse.json();
    testFandomId = fandom.id;

    const tagClassResponse = await fetch('/api/v1/tag-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Character Tags',
        slug: 'character-tags',
        description: 'Tags for characters',
        fandom_id: testFandomId,
        validation_rules: {
          mutually_exclusive: false,
          required: false,
        },
      }),
    });
    const tagClass = await tagClassResponse.json();
    testTagClassId = tagClass.id;
  });

  afterAll(() => {
    console.log('Cleaning up Tag API tests');
  });

  beforeEach(() => {
    console.log('Resetting tag test state');
  });

  describe('POST /api/v1/tags', () => {
    it('should create a new tag with valid data', async () => {
      const tagData = {
        name: 'harry-potter',
        slug: 'harry-potter',
        description: 'The Boy Who Lived',
        fandom_id: testFandomId,
        tag_class_id: testTagClassId,
        metadata: {
          house: 'Gryffindor',
          bloodStatus: 'Half-blood',
        },
      };

      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      expect(response.status).toBe(201);

      const tag = await response.json();
      expect(tag).toMatchObject({
        id: expect.any(String),
        name: 'harry-potter',
        slug: 'harry-potter',
        description: 'The Boy Who Lived',
        fandom_id: testFandomId,
        tag_class_id: testTagClassId,
        parent_id: null,
        metadata: expect.objectContaining({
          house: 'Gryffindor',
        }),
        is_active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should create tag without tag class (optional)', async () => {
      const tagData = {
        name: 'unclassified-tag',
        slug: 'unclassified-tag',
        description: 'Tag without class',
        fandom_id: testFandomId,
      };

      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      expect(response.status).toBe(201);

      const tag = await response.json();
      expect(tag.tag_class_id).toBeNull();
    });

    it('should create hierarchical tag with parent', async () => {
      // Create parent tag first
      const parentResponse = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'weasley-family',
          slug: 'weasley-family',
          description: 'The Weasley Family',
          fandom_id: testFandomId,
        }),
      });
      const parent = await parentResponse.json();

      // Create child tag
      const childData = {
        name: 'ron-weasley',
        slug: 'ron-weasley',
        description: 'Ronald Weasley',
        fandom_id: testFandomId,
        parent_id: parent.id,
      };

      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(childData),
      });

      expect(response.status).toBe(201);

      const child = await response.json();
      expect(child.parent_id).toBe(parent.id);
    });

    it('should reject tag with non-existent fandom', async () => {
      const tagData = {
        name: 'invalid-tag',
        slug: 'invalid-tag',
        fandom_id: 99999,
      };

      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('fandom'),
        field: 'fandom_id',
      });
    });

    it('should reject tag with non-existent tag class', async () => {
      const tagData = {
        name: 'invalid-class-tag',
        slug: 'invalid-class-tag',
        fandom_id: testFandomId,
        tag_class_id: 'non-existent-class',
      };

      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('tag class'),
        field: 'tag_class_id',
      });
    });

    it('should reject tag with duplicate name in same fandom', async () => {
      const tagData = {
        name: 'duplicate-tag',
        slug: 'duplicate-tag-1',
        fandom_id: testFandomId,
      };

      // Create first tag
      await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      // Attempt duplicate
      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tagData,
          slug: 'duplicate-tag-2',
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

    it('should allow same tag name in different fandoms', async () => {
      // Create another fandom
      const fandom2Response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Second Fandom',
          slug: 'second-fandom',
          description: 'Second test fandom',
        }),
      });
      const fandom2 = await fandom2Response.json();

      const tagData = {
        name: 'cross-fandom-tag',
        slug: 'cross-fandom-tag',
        fandom_id: fandom2.id,
      };

      // Create in first fandom
      await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tagData,
          fandom_id: testFandomId,
        }),
      });

      // Create in second fandom (should succeed)
      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });

      expect(response.status).toBe(201);
    });

    it('should validate tag data', async () => {
      const invalidData = {
        name: '', // Empty name
        slug: 'invalid slug!', // Invalid characters
        description: 'x'.repeat(1001), // Too long
        fandom_id: 'not-a-number', // Invalid type
      };

      const response = await fetch('/api/v1/tags', {
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

  describe('GET /api/v1/tags', () => {
    beforeEach(async () => {
      // Create test tags
      const tags = [
        {
          name: 'hermione-granger',
          slug: 'hermione-granger',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        },
        {
          name: 'draco-malfoy',
          slug: 'draco-malfoy',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
        },
        {
          name: 'inactive-tag',
          slug: 'inactive-tag',
          fandom_id: testFandomId,
          is_active: false,
        },
      ];

      for (const tag of tags) {
        await fetch('/api/v1/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tag),
        });
      }
    });

    it('should retrieve all active tags', async () => {
      const response = await fetch('/api/v1/tags');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        tags: expect.arrayContaining([
          expect.objectContaining({
            name: 'hermione-granger',
            is_active: true,
          }),
          expect.objectContaining({ name: 'draco-malfoy', is_active: true }),
        ]),
        total: expect.any(Number),
        page: 1,
        limit: 50,
      });

      // Should not include inactive tags
      expect(
        data.tags.find((t: any) => t.name === 'inactive-tag')
      ).toBeUndefined();
    });

    it('should filter tags by fandom', async () => {
      const response = await fetch(`/api/v1/tags?fandom_id=${testFandomId}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tags.every((t: any) => t.fandom_id === testFandomId)).toBe(
        true
      );
    });

    it('should filter tags by tag class', async () => {
      const response = await fetch(
        `/api/v1/tags?tag_class_id=${testTagClassId}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.tags.every((t: any) => t.tag_class_id === testTagClassId)
      ).toBe(true);
    });

    it('should support text search', async () => {
      const response = await fetch('/api/v1/tags?search=hermione');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tags).toHaveLength(1);
      expect(data.tags[0].name).toBe('hermione-granger');
    });

    it('should support pagination', async () => {
      const response = await fetch('/api/v1/tags?page=1&limit=1');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tags).toHaveLength(1);
      expect(data).toMatchObject({
        page: 1,
        limit: 1,
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });
    });

    it('should support sorting', async () => {
      const response = await fetch('/api/v1/tags?sort=name&order=desc');

      expect(response.status).toBe(200);

      const data = await response.json();
      const names = data.tags.map((t: any) => t.name);
      expect(names).toEqual(names.slice().sort().reverse());
    });

    it('should include tag hierarchy information', async () => {
      const response = await fetch('/api/v1/tags?include_hierarchy=true');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tags[0]).toMatchObject({
        children: expect.any(Array),
        parent: expect.any(Object), // or null
      });
    });
  });

  describe('GET /api/v1/tags/:id', () => {
    let testTagId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'single-test-tag',
          slug: 'single-test-tag',
          description: 'Tag for single retrieval test',
          fandom_id: testFandomId,
        }),
      });

      const tag = await response.json();
      testTagId = tag.id;
    });

    it('should retrieve a specific tag by ID', async () => {
      const response = await fetch(`/api/v1/tags/${testTagId}`);

      expect(response.status).toBe(200);

      const tag = await response.json();
      expect(tag).toMatchObject({
        id: testTagId,
        name: 'single-test-tag',
        slug: 'single-test-tag',
        description: 'Tag for single retrieval test',
        fandom_id: testFandomId,
        is_active: true,
      });
    });

    it('should include full hierarchy when requested', async () => {
      const response = await fetch(
        `/api/v1/tags/${testTagId}?include_hierarchy=true`
      );

      expect(response.status).toBe(200);

      const tag = await response.json();
      expect(tag).toMatchObject({
        parent: expect.any(Object), // or null
        children: expect.any(Array),
        ancestors: expect.any(Array),
        descendants: expect.any(Array),
      });
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await fetch('/api/v1/tags/non-existent-tag');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/tags/:id', () => {
    let testTagId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'updateable-tag',
          slug: 'updateable-tag',
          description: 'Original description',
          fandom_id: testFandomId,
        }),
      });

      const tag = await response.json();
      testTagId = tag.id;
    });

    it('should update tag with valid data', async () => {
      const updateData = {
        description: 'Updated description',
        tag_class_id: testTagClassId,
        metadata: { updated: true },
      };

      const response = await fetch(`/api/v1/tags/${testTagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const tag = await response.json();
      expect(tag).toMatchObject({
        id: testTagId,
        description: 'Updated description',
        tag_class_id: testTagClassId,
        metadata: { updated: true },
      });
    });

    it('should prevent updating core identifying fields', async () => {
      const response = await fetch(`/api/v1/tags/${testTagId}`, {
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

    it('should validate update data', async () => {
      const response = await fetch(`/api/v1/tags/${testTagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'x'.repeat(1001), // Too long
          tag_class_id: 'non-existent',
        }),
      });

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe('Validation Error');
    });
  });

  describe('DELETE /api/v1/tags/:id', () => {
    let testTagId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'deletable-tag',
          slug: 'deletable-tag',
          description: 'Tag to be deleted',
          fandom_id: testFandomId,
        }),
      });

      const tag = await response.json();
      testTagId = tag.id;
    });

    it('should soft delete a tag', async () => {
      const response = await fetch(`/api/v1/tags/${testTagId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Tag deleted successfully',
        deleted: true,
        soft_delete: true,
      });
    });

    it('should handle tag with children (cascade or prevent)', async () => {
      // Create child tag
      const childResponse = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'child-tag',
          slug: 'child-tag',
          parent_id: testTagId,
          fandom_id: testFandomId,
        }),
      });

      const response = await fetch(`/api/v1/tags/${testTagId}`, {
        method: 'DELETE',
      });

      // Should either cascade delete children or prevent deletion
      expect([200, 409]).toContain(response.status);
    });
  });

  describe('POST /api/v1/tags/bulk', () => {
    it('should create multiple tags in bulk', async () => {
      const bulkData = {
        tags: [
          { name: 'bulk-tag-1', slug: 'bulk-tag-1', fandom_id: testFandomId },
          { name: 'bulk-tag-2', slug: 'bulk-tag-2', fandom_id: testFandomId },
          { name: 'bulk-tag-3', slug: 'bulk-tag-3', fandom_id: testFandomId },
        ],
      };

      const response = await fetch('/api/v1/tags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData),
      });

      expect(response.status).toBe(201);

      const result = await response.json();
      expect(result).toMatchObject({
        created: 3,
        failed: 0,
        tags: expect.arrayContaining([
          expect.objectContaining({ name: 'bulk-tag-1' }),
          expect.objectContaining({ name: 'bulk-tag-2' }),
          expect.objectContaining({ name: 'bulk-tag-3' }),
        ]),
      });
    });

    it('should handle partial failures in bulk creation', async () => {
      // Create a conflicting tag first
      await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'existing-tag',
          slug: 'existing-tag',
          fandom_id: testFandomId,
        }),
      });

      const bulkData = {
        tags: [
          {
            name: 'bulk-success',
            slug: 'bulk-success',
            fandom_id: testFandomId,
          },
          {
            name: 'existing-tag',
            slug: 'existing-tag-2',
            fandom_id: testFandomId,
          }, // Duplicate name
          {
            name: 'bulk-success-2',
            slug: 'bulk-success-2',
            fandom_id: testFandomId,
          },
        ],
      };

      const response = await fetch('/api/v1/tags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData),
      });

      expect(response.status).toBe(207); // Multi-status

      const result = await response.json();
      expect(result).toMatchObject({
        created: 2,
        failed: 1,
        errors: expect.arrayContaining([
          expect.objectContaining({
            index: 1,
            error: expect.stringContaining('duplicate'),
          }),
        ]),
      });
    });
  });

  describe('GET /api/v1/tags/:id/usage', () => {
    let testTagId: string;

    beforeEach(async () => {
      const response = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'usage-test-tag',
          slug: 'usage-test-tag',
          fandom_id: testFandomId,
        }),
      });

      const tag = await response.json();
      testTagId = tag.id;
    });

    it('should return tag usage statistics', async () => {
      const response = await fetch(`/api/v1/tags/${testTagId}/usage`);

      expect(response.status).toBe(200);

      const usage = await response.json();
      expect(usage).toMatchObject({
        tag_id: testTagId,
        plot_blocks: {
          total: expect.any(Number),
          recent: expect.any(Array),
        },
        tag_combinations: {
          frequent: expect.any(Array),
          recommended: expect.any(Array),
        },
        popularity: {
          score: expect.any(Number),
          trend: expect.any(String),
        },
        first_used: expect.any(String), // or null
        last_used: expect.any(String), // or null
      });
    });
  });

  describe('GET /api/v1/fandoms/:fandomId/tags/hierarchy', () => {
    it('should return tag hierarchy for a fandom', async () => {
      const response = await fetch(
        `/api/v1/fandoms/${testFandomId}/tags/hierarchy`
      );

      expect(response.status).toBe(200);

      const hierarchy = await response.json();
      expect(hierarchy).toMatchObject({
        fandom_id: testFandomId,
        root_tags: expect.any(Array),
        total_tags: expect.any(Number),
        max_depth: expect.any(Number),
        orphaned_tags: expect.any(Array),
      });

      // Each root tag should have children structure
      if (hierarchy.root_tags.length > 0) {
        expect(hierarchy.root_tags[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          children: expect.any(Array),
        });
      }
    });

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/fandoms/99999/tags/hierarchy');
      expect(response.status).toBe(404);
    });
  });
});
