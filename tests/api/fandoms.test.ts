/**
 * Fandom API Contract Tests
 *
 * Tests the complete CRUD interface for Fandom entities including:
 * - Creating fandoms with validation
 * - Retrieving fandoms with filtering
 * - Updating fandom details
 * - Soft deletion and restoration
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';

describe('Fandom API Contract Tests', () => {
  beforeAll(() => {
    // Initialize test database and API setup
    console.log('Setting up Fandom API tests');
  });

  afterAll(() => {
    // Clean up test resources
    console.log('Cleaning up Fandom API tests');
  });

  beforeEach(() => {
    // Reset database state before each test
    console.log('Resetting test state');
  });

  describe('POST /api/v1/fandoms', () => {
    it('should create a new fandom with valid data', async () => {
      const fandomData = {
        name: 'Harry Potter',
        slug: 'harry-potter',
        description: 'The magical world of Harry Potter',
        metadata: {
          author: 'J.K. Rowling',
          genre: 'Fantasy',
          setting: 'Modern Magic',
        },
      };

      // This will fail until API is implemented
      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fandomData),
      });

      expect(response.status).toBe(201);

      const fandom = await response.json();
      expect(fandom).toMatchObject({
        id: expect.any(Number),
        name: 'Harry Potter',
        slug: 'harry-potter',
        description: 'The magical world of Harry Potter',
        metadata: expect.objectContaining({
          author: 'J.K. Rowling',
        }),
        is_active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should reject fandom with duplicate name', async () => {
      const fandomData = {
        name: 'Duplicate Fandom',
        slug: 'duplicate-fandom',
        description: 'First fandom',
      };

      // Create first fandom
      await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fandomData),
      });

      // Attempt to create duplicate
      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fandomData,
          slug: 'duplicate-fandom-2',
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

    it('should reject fandom with duplicate slug', async () => {
      const fandomData = {
        name: 'First Fandom',
        slug: 'duplicate-slug',
        description: 'First fandom',
      };

      // Create first fandom
      await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fandomData),
      });

      // Attempt to create duplicate slug
      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Second Fandom',
          slug: 'duplicate-slug',
          description: 'Second fandom',
        }),
      });

      expect(response.status).toBe(409);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Conflict',
        message: expect.stringContaining('already exists'),
        field: 'slug',
      });
    });

    it('should reject fandom with invalid data', async () => {
      const invalidData = {
        name: '', // Empty name
        slug: 'invalid slug!', // Invalid characters
        description: 'x'.repeat(1001), // Too long
      };

      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('required'),
          }),
          expect.objectContaining({
            field: 'slug',
            message: expect.stringContaining('format'),
          }),
          expect.objectContaining({
            field: 'description',
            message: expect.stringContaining('too long'),
          }),
        ]),
      });
    });

    it('should auto-generate slug if not provided', async () => {
      const fandomData = {
        name: 'Auto Slug Test',
        description: 'Testing automatic slug generation',
      };

      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fandomData),
      });

      expect(response.status).toBe(201);

      const fandom = await response.json();
      expect(fandom.slug).toBe('auto-slug-test');
    });
  });

  describe('GET /api/v1/fandoms', () => {
    beforeEach(async () => {
      // Create test fandoms
      const fandoms = [
        {
          name: 'Active Fandom 1',
          slug: 'active-1',
          description: 'First active fandom',
        },
        {
          name: 'Active Fandom 2',
          slug: 'active-2',
          description: 'Second active fandom',
        },
        {
          name: 'Inactive Fandom',
          slug: 'inactive-1',
          description: 'Inactive fandom',
          is_active: false,
        },
      ];

      for (const fandom of fandoms) {
        await fetch('/api/v1/fandoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fandom),
        });
      }
    });

    it('should retrieve all active fandoms by default', async () => {
      const response = await fetch('/api/v1/fandoms');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        fandoms: expect.arrayContaining([
          expect.objectContaining({ name: 'Active Fandom 1', is_active: true }),
          expect.objectContaining({ name: 'Active Fandom 2', is_active: true }),
        ]),
        total: 2,
        page: 1,
        limit: 50,
      });

      // Should not include inactive fandoms
      expect(
        data.fandoms.find((f: any) => f.name === 'Inactive Fandom')
      ).toBeUndefined();
    });

    it('should support pagination', async () => {
      const response = await fetch('/api/v1/fandoms?page=1&limit=1');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        fandoms: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 1,
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });

      expect(data.fandoms).toHaveLength(1);
    });

    it('should support filtering by name', async () => {
      const response = await fetch('/api/v1/fandoms?search=Active Fandom 1');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.fandoms).toHaveLength(1);
      expect(data.fandoms[0].name).toBe('Active Fandom 1');
    });

    it('should support including inactive fandoms', async () => {
      const response = await fetch('/api/v1/fandoms?include_inactive=true');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total).toBe(3);
      expect(
        data.fandoms.find((f: any) => f.name === 'Inactive Fandom')
      ).toBeDefined();
    });

    it('should support sorting by different fields', async () => {
      const response = await fetch('/api/v1/fandoms?sort=name&order=desc');

      expect(response.status).toBe(200);

      const data = await response.json();
      const names = data.fandoms.map((f: any) => f.name);
      expect(names).toEqual(['Active Fandom 2', 'Active Fandom 1']);
    });
  });

  describe('GET /api/v1/fandoms/:id', () => {
    let testFandomId: number;

    beforeEach(async () => {
      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom for single retrieval',
        }),
      });

      const fandom = await response.json();
      testFandomId = fandom.id;
    });

    it('should retrieve a specific fandom by ID', async () => {
      const response = await fetch(`/api/v1/fandoms/${testFandomId}`);

      expect(response.status).toBe(200);

      const fandom = await response.json();
      expect(fandom).toMatchObject({
        id: testFandomId,
        name: 'Test Fandom',
        slug: 'test-fandom',
        description: 'Test fandom for single retrieval',
        is_active: true,
      });
    });

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/fandoms/99999');

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Not Found',
        message: 'Fandom not found',
      });
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await fetch('/api/v1/fandoms/invalid-id');

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid ID'),
      });
    });
  });

  describe('PUT /api/v1/fandoms/:id', () => {
    let testFandomId: number;

    beforeEach(async () => {
      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Original Fandom',
          slug: 'original-fandom',
          description: 'Original description',
        }),
      });

      const fandom = await response.json();
      testFandomId = fandom.id;
    });

    it('should update a fandom with valid data', async () => {
      const updateData = {
        name: 'Updated Fandom',
        description: 'Updated description',
        metadata: { updated: true },
      };

      const response = await fetch(`/api/v1/fandoms/${testFandomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const fandom = await response.json();
      expect(fandom).toMatchObject({
        id: testFandomId,
        name: 'Updated Fandom',
        slug: 'original-fandom', // Slug should remain unchanged
        description: 'Updated description',
        metadata: { updated: true },
        updated_at: expect.not.stringMatching(fandom.created_at),
      });
    });

    it('should reject update with duplicate name', async () => {
      // Create another fandom
      await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Another Fandom',
          slug: 'another-fandom',
          description: 'Another description',
        }),
      });

      // Try to update to duplicate name
      const response = await fetch(`/api/v1/fandoms/${testFandomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Another Fandom',
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

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/fandoms/99999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });

      expect(response.status).toBe(404);
    });

    it('should validate update data', async () => {
      const response = await fetch(`/api/v1/fandoms/${testFandomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '', // Invalid empty name
          description: 'x'.repeat(1001), // Too long
        }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('Validation Error');
    });
  });

  describe('DELETE /api/v1/fandoms/:id', () => {
    let testFandomId: number;

    beforeEach(async () => {
      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Deletable Fandom',
          slug: 'deletable-fandom',
          description: 'Fandom to be deleted',
        }),
      });

      const fandom = await response.json();
      testFandomId = fandom.id;
    });

    it('should soft delete a fandom (default behavior)', async () => {
      const response = await fetch(`/api/v1/fandoms/${testFandomId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Fandom deleted successfully',
        deleted: true,
        soft_delete: true,
      });

      // Verify fandom is marked as inactive
      const getResponse = await fetch(`/api/v1/fandoms/${testFandomId}`);
      expect(getResponse.status).toBe(404); // Should not be found in regular queries

      // But should be found when including inactive
      const getInactiveResponse = await fetch(
        `/api/v1/fandoms/${testFandomId}?include_inactive=true`
      );
      expect(getInactiveResponse.status).toBe(200);

      const fandom = await getInactiveResponse.json();
      expect(fandom.is_active).toBe(false);
    });

    it('should support hard delete with force parameter', async () => {
      const response = await fetch(
        `/api/v1/fandoms/${testFandomId}?force=true`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Fandom permanently deleted',
        deleted: true,
        soft_delete: false,
      });

      // Verify fandom is completely removed
      const getResponse = await fetch(
        `/api/v1/fandoms/${testFandomId}?include_inactive=true`
      );
      expect(getResponse.status).toBe(404);
    });

    it('should prevent deletion when fandom has associated content', async () => {
      // This test assumes there will be dependent content
      // Implementation should check for tags, plot blocks, etc.

      const response = await fetch(
        `/api/v1/fandoms/${testFandomId}?force=true`,
        {
          method: 'DELETE',
        }
      );

      // This might be 409 Conflict if there are dependencies
      // Or 200 if force delete removes everything
      expect([200, 409]).toContain(response.status);
    });

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/fandoms/99999', {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/fandoms/:id/restore', () => {
    let testFandomId: number;

    beforeEach(async () => {
      // Create and soft delete a fandom
      const createResponse = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Restorable Fandom',
          slug: 'restorable-fandom',
          description: 'Fandom to be restored',
        }),
      });

      const fandom = await createResponse.json();
      testFandomId = fandom.id;

      // Soft delete it
      await fetch(`/api/v1/fandoms/${testFandomId}`, {
        method: 'DELETE',
      });
    });

    it('should restore a soft-deleted fandom', async () => {
      const response = await fetch(`/api/v1/fandoms/${testFandomId}/restore`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toMatchObject({
        message: 'Fandom restored successfully',
        restored: true,
      });

      // Verify fandom is active again
      const getResponse = await fetch(`/api/v1/fandoms/${testFandomId}`);
      expect(getResponse.status).toBe(200);

      const fandom = await getResponse.json();
      expect(fandom.is_active).toBe(true);
    });

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/fandoms/99999/restore', {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });

    it('should return 400 for already active fandom', async () => {
      // First restore the fandom
      await fetch(`/api/v1/fandoms/${testFandomId}/restore`, {
        method: 'POST',
      });

      // Try to restore again
      const response = await fetch(`/api/v1/fandoms/${testFandomId}/restore`, {
        method: 'POST',
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Bad Request',
        message: 'Fandom is already active',
      });
    });
  });

  describe('GET /api/v1/fandoms/:id/stats', () => {
    let testFandomId: number;

    beforeEach(async () => {
      const response = await fetch('/api/v1/fandoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Stats Fandom',
          slug: 'stats-fandom',
          description: 'Fandom for stats testing',
        }),
      });

      const fandom = await response.json();
      testFandomId = fandom.id;
    });

    it('should return fandom statistics', async () => {
      const response = await fetch(`/api/v1/fandoms/${testFandomId}/stats`);

      expect(response.status).toBe(200);

      const stats = await response.json();
      expect(stats).toMatchObject({
        fandom_id: testFandomId,
        tags: {
          total: expect.any(Number),
          by_type: expect.any(Object),
        },
        tag_classes: {
          total: expect.any(Number),
          active: expect.any(Number),
        },
        plot_blocks: {
          total: expect.any(Number),
          by_category: expect.any(Object),
          by_complexity: expect.any(Object),
        },
        plot_block_conditions: {
          total: expect.any(Number),
          by_type: expect.any(Object),
        },
        created_at: expect.any(String),
        last_updated: expect.any(String),
      });
    });

    it('should return 404 for non-existent fandom', async () => {
      const response = await fetch('/api/v1/fandoms/99999/stats');
      expect(response.status).toBe(404);
    });
  });
});
