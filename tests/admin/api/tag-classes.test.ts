import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, closeDatabase } from '@/lib/database';
import type { DatabaseConnection } from '@/lib/database';

/**
 * T009: Tag Classes Management API Contract Tests
 *
 * These tests MUST FAIL initially as the API endpoints don't exist yet.
 * Following TDD methodology - tests first, then implementation.
 *
 * Tests the following endpoints:
 * - GET /api/admin/tag-classes (list tag classes by fandom)
 * - POST /api/admin/tag-classes (create tag class)
 * - PUT /api/admin/tag-classes/{id} (update tag class)
 * - DELETE /api/admin/tag-classes/{id} (delete tag class)
 * - POST /api/admin/tag-classes/{id}/tags (add tags to class)
 * - DELETE /api/admin/tag-classes/{id}/tags/{tagId} (remove tag from class)
 */

// Mock types for tag classes
interface TagClass {
  id: string;
  name: string;
  description: string;
  fandomId: string;
  validationRules: Array<{
    type:
      | 'mutually_exclusive'
      | 'minimum_required'
      | 'maximum_allowed'
      | 'conditional_required';
    parameters: Record<string, any>;
    errorMessage: string;
    warningMessage?: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    metadata?: Record<string, any>;
  }>;
  isSystemClass: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

interface TagClassRule {
  type:
    | 'mutually_exclusive'
    | 'minimum_required'
    | 'maximum_allowed'
    | 'conditional_required';
  parameters: Record<string, any>;
  errorMessage: string;
  warningMessage?: string;
}

describe('Tag Classes Management API Contract Tests', () => {
  let db: DatabaseConnection;
  let projectAdminHeaders: HeadersInit;
  let fandomAdminHeaders: HeadersInit;
  let regularUserHeaders: HeadersInit;
  let mockTagClassId: string;
  let mockFandomId: string;
  let mockTagId: string;

  beforeAll(async () => {
    db = await getDatabase();

    projectAdminHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer project-admin-token',
    };

    fandomAdminHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fandom-admin-harrypotter-token',
    };

    regularUserHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer regular-user-token',
    };

    mockTagClassId = 'tagclass-123';
    mockFandomId = 'harrypotter';
    mockTagId = 'tag-456';
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /api/admin/tag-classes', () => {
    it('should list all tag classes for ProjectAdmin across all fandoms', async () => {
      // This test MUST FAIL initially - endpoint doesn't exist
      const response = await fetch('/api/admin/tag-classes', {
        method: 'GET',
        headers: projectAdminHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tagClasses).toBeDefined();
      expect(Array.isArray(data.tagClasses)).toBe(true);

      // Check tag class structure
      if (data.tagClasses.length > 0) {
        const tagClass = data.tagClasses[0];
        expect(tagClass).toHaveProperty('id');
        expect(tagClass).toHaveProperty('name');
        expect(tagClass).toHaveProperty('fandomId');
        expect(tagClass).toHaveProperty('validationRules');
        expect(tagClass).toHaveProperty('tags');
        expect(tagClass).toHaveProperty('isSystemClass');
        expect(tagClass).toHaveProperty('isActive');
        expect(Array.isArray(tagClass.validationRules)).toBe(true);
        expect(Array.isArray(tagClass.tags)).toBe(true);
      }
    });

    it('should filter tag classes by fandom for FandomAdmin', async () => {
      // This test MUST FAIL initially
      const response = await fetch(
        `/api/admin/tag-classes?fandom=${mockFandomId}`,
        {
          method: 'GET',
          headers: fandomAdminHeaders,
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // All returned tag classes should be for the specified fandom
      data.tagClasses.forEach((tagClass: TagClass) => {
        expect(tagClass.fandomId).toBe(mockFandomId);
      });
    });

    it('should include tag count and validation rule count', async () => {
      // This test MUST FAIL initially
      const response = await fetch(
        '/api/admin/tag-classes?include_counts=true',
        {
          method: 'GET',
          headers: projectAdminHeaders,
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      if (data.tagClasses.length > 0) {
        const tagClass = data.tagClasses[0];
        expect(tagClass).toHaveProperty('tagCount');
        expect(tagClass).toHaveProperty('ruleCount');
        expect(typeof tagClass.tagCount).toBe('number');
        expect(typeof tagClass.ruleCount).toBe('number');
      }
    });

    it('should support filtering by system vs custom classes', async () => {
      // This test MUST FAIL initially
      const response = await fetch('/api/admin/tag-classes?system_only=true', {
        method: 'GET',
        headers: projectAdminHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      data.tagClasses.forEach((tagClass: TagClass) => {
        expect(tagClass.isSystemClass).toBe(true);
      });
    });

    it('should deny cross-fandom access to FandomAdmin', async () => {
      // This test MUST FAIL initially
      const response = await fetch(
        '/api/admin/tag-classes?fandom=percyjackson',
        {
          method: 'GET',
          headers: fandomAdminHeaders, // HP admin trying to access PJ classes
        }
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('access denied');
    });
  });

  describe('POST /api/admin/tag-classes', () => {
    it('should create new tag class with validation rules', async () => {
      // This test MUST FAIL initially
      const tagClassData = {
        name: 'Harry Potter Shipping',
        description: 'Romantic relationships involving Harry Potter',
        fandomId: mockFandomId,
        validationRules: [
          {
            type: 'mutually_exclusive',
            parameters: {
              conflictType: 'character_shipping',
              mainCharacter: 'harry-potter',
            },
            errorMessage: 'Harry cannot be in multiple romantic relationships',
            warningMessage:
              'Consider if multiple Harry ships make sense for your story',
          },
          {
            type: 'minimum_required',
            parameters: {
              minCount: 1,
              scope: 'class',
            },
            errorMessage:
              'At least one Harry ship must be selected if using this category',
          },
        ],
        metadata: {
          category: 'shipping',
          mainCharacter: 'harry-potter',
          conflictResolution: 'mutual_exclusion',
        },
      };

      const response = await fetch('/api/admin/tag-classes', {
        method: 'POST',
        headers: projectAdminHeaders,
        body: JSON.stringify(tagClassData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tagClass).toBeDefined();
      expect(data.tagClass.id).toBeDefined();
      expect(data.tagClass.name).toBe(tagClassData.name);
      expect(data.tagClass.fandomId).toBe(tagClassData.fandomId);
      expect(data.tagClass.validationRules).toHaveLength(2);
      expect(data.tagClass.isSystemClass).toBe(false);
      expect(data.tagClass.isActive).toBe(true);
      expect(data.tagClass.tags).toHaveLength(0); // No tags initially
    });

    it('should validate rule parameters for specific rule types', async () => {
      // This test MUST FAIL initially
      const invalidTagClassData = {
        name: 'Invalid Tag Class',
        description: 'Class with invalid validation rules',
        fandomId: mockFandomId,
        validationRules: [
          {
            type: 'maximum_allowed',
            parameters: {
              maxCount: -1, // Invalid negative count
            },
            errorMessage: 'Invalid rule',
          },
          {
            type: 'conditional_required',
            parameters: {
              // Missing required condition parameter
              requiredTags: ['some-tag'],
            },
            errorMessage: 'Missing condition',
          },
        ],
        metadata: {},
      };

      const response = await fetch('/api/admin/tag-classes', {
        method: 'POST',
        headers: projectAdminHeaders,
        body: JSON.stringify(invalidTagClassData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.validationErrors).toBeDefined();
      expect(data.validationErrors.validationRules).toBeDefined();
      expect(data.validationErrors.validationRules[0]).toContain(
        'maxCount must be positive'
      );
      expect(data.validationErrors.validationRules[1]).toContain(
        'condition is required'
      );
    });

    it('should prevent duplicate tag class names within fandom', async () => {
      // This test MUST FAIL initially
      const duplicateData = {
        name: 'Existing Tag Class Name',
        description: 'Should be rejected due to duplicate name',
        fandomId: mockFandomId,
        validationRules: [],
        metadata: {},
      };

      const response = await fetch('/api/admin/tag-classes', {
        method: 'POST',
        headers: projectAdminHeaders,
        body: JSON.stringify(duplicateData),
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Tag class name already exists');
      expect(data.existingTagClass).toBeDefined();
    });

    it('should enforce fandom scope for FandomAdmin', async () => {
      // This test MUST FAIL initially
      const crossFandomData = {
        name: 'Cross Fandom Class',
        description: 'Should be rejected',
        fandomId: 'percyjackson', // Different fandom
        validationRules: [],
        metadata: {},
      };

      const response = await fetch('/api/admin/tag-classes', {
        method: 'POST',
        headers: fandomAdminHeaders, // HP admin trying to create PJ class
        body: JSON.stringify(crossFandomData),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain(
        'Cannot create tag classes for other fandoms'
      );
    });
  });

  describe('PUT /api/admin/tag-classes/{id}', () => {
    it('should update tag class properties', async () => {
      // This test MUST FAIL initially
      const updateData = {
        name: 'Updated Tag Class Name',
        description: 'Updated description',
        validationRules: [
          {
            type: 'maximum_allowed',
            parameters: {
              maxCount: 2,
            },
            errorMessage: 'Maximum 2 tags allowed',
          },
        ],
        metadata: {
          category: 'updated-category',
        },
      };

      const response = await fetch(`/api/admin/tag-classes/${mockTagClassId}`, {
        method: 'PUT',
        headers: projectAdminHeaders,
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tagClass.name).toBe(updateData.name);
      expect(data.tagClass.description).toBe(updateData.description);
      expect(data.tagClass.validationRules).toHaveLength(1);
      expect(data.tagClass.updatedAt).toBeDefined();
    });

    it('should prevent updates to system tag classes', async () => {
      // This test MUST FAIL initially
      const updateData = {
        name: 'Updated System Class',
        description: 'Should not be allowed',
      };

      const response = await fetch('/api/admin/tag-classes/system-class-id', {
        method: 'PUT',
        headers: projectAdminHeaders,
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cannot modify system tag classes');
    });

    it('should validate rule consistency when updating', async () => {
      // This test MUST FAIL initially
      const updateData = {
        validationRules: [
          {
            type: 'minimum_required',
            parameters: {
              minCount: 5,
            },
            errorMessage: 'Minimum 5 tags required',
          },
          {
            type: 'maximum_allowed',
            parameters: {
              maxCount: 2, // Conflicts with minimum of 5
            },
            errorMessage: 'Maximum 2 tags allowed',
          },
        ],
      };

      const response = await fetch(`/api/admin/tag-classes/${mockTagClassId}`, {
        method: 'PUT',
        headers: projectAdminHeaders,
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.validationErrors.ruleConflict).toBeDefined();
      expect(data.validationErrors.ruleConflict).toContain(
        'minimum exceeds maximum'
      );
    });
  });

  describe('DELETE /api/admin/tag-classes/{id}', () => {
    it('should delete tag class and handle tag reassignment', async () => {
      // This test MUST FAIL initially
      const response = await fetch(`/api/admin/tag-classes/${mockTagClassId}`, {
        method: 'DELETE',
        headers: projectAdminHeaders,
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted');

      // Check that orphaned tags are handled
      if (data.orphanedTags) {
        expect(Array.isArray(data.orphanedTags)).toBe(true);
        expect(data.reassignmentSuggestions).toBeDefined();
      }
    });

    it('should prevent deletion of system tag classes', async () => {
      // This test MUST FAIL initially
      const response = await fetch('/api/admin/tag-classes/system-class-id', {
        method: 'DELETE',
        headers: projectAdminHeaders,
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cannot delete system tag classes');
    });

    it('should prevent deletion of tag classes with active validation rules', async () => {
      // This test MUST FAIL initially
      const response = await fetch(
        '/api/admin/tag-classes/class-with-active-rules',
        {
          method: 'DELETE',
          headers: projectAdminHeaders,
        }
      );

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('has active validation rules');
      expect(data.activeRules).toBeDefined();
      expect(data.activeRules.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/admin/tag-classes/{id}/tags', () => {
    it('should add tags to tag class', async () => {
      // This test MUST FAIL initially
      const tagData = {
        tagIds: ['tag-1', 'tag-2', 'tag-3'],
        validateRules: true,
      };

      const response = await fetch(
        `/api/admin/tag-classes/${mockTagClassId}/tags`,
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(tagData),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.addedTags).toBe(3);
      expect(data.tagClass.tags).toHaveLength(3);

      // Check that validation rules are applied
      if (data.validationWarnings) {
        expect(Array.isArray(data.validationWarnings)).toBe(true);
      }
    });

    it('should validate tag compatibility with class rules', async () => {
      // This test MUST FAIL initially
      const incompatibleTagData = {
        tagIds: ['incompatible-tag-1', 'incompatible-tag-2'],
        validateRules: true,
      };

      const response = await fetch(
        `/api/admin/tag-classes/${mockTagClassId}/tags`,
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(incompatibleTagData),
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.validationErrors).toBeDefined();
      expect(data.incompatibleTags).toBeDefined();
      expect(data.incompatibleTags.length).toBeGreaterThan(0);
    });

    it('should handle bulk tag addition with partial failures', async () => {
      // This test MUST FAIL initially
      const mixedTagData = {
        tagIds: ['valid-tag', 'nonexistent-tag', 'already-assigned-tag'],
        validateRules: false,
        continueOnError: true,
      };

      const response = await fetch(
        `/api/admin/tag-classes/${mockTagClassId}/tags`,
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(mixedTagData),
        }
      );

      expect(response.status).toBe(207); // Multi-status

      const data = await response.json();
      expect(data.success).toBe(false); // Partial failure
      expect(data.results).toBeDefined();
      expect(data.results.successful).toHaveLength(1);
      expect(data.results.failed).toHaveLength(2);
      expect(data.addedTags).toBe(1);
    });
  });

  describe('DELETE /api/admin/tag-classes/{id}/tags/{tagId}', () => {
    it('should remove tag from tag class', async () => {
      // This test MUST FAIL initially
      const response = await fetch(
        `/api/admin/tag-classes/${mockTagClassId}/tags/${mockTagId}`,
        {
          method: 'DELETE',
          headers: projectAdminHeaders,
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('removed');
      expect(data.tagClass.tags).toBeDefined();

      // Verify tag is no longer in the class
      const tagStillInClass = data.tagClass.tags.some(
        (tag: any) => tag.id === mockTagId
      );
      expect(tagStillInClass).toBe(false);
    });

    it('should validate minimum tag requirements before removal', async () => {
      // This test MUST FAIL initially
      const response = await fetch(
        '/api/admin/tag-classes/class-with-min-req/tags/last-required-tag',
        {
          method: 'DELETE',
          headers: projectAdminHeaders,
        }
      );

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('would violate minimum tag requirement');
      expect(data.currentTagCount).toBeDefined();
      expect(data.minimumRequired).toBeDefined();
    });

    it('should handle non-existent tag removal gracefully', async () => {
      // This test MUST FAIL initially
      const response = await fetch(
        `/api/admin/tag-classes/${mockTagClassId}/tags/nonexistent-tag`,
        {
          method: 'DELETE',
          headers: projectAdminHeaders,
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Tag not found in class');
    });
  });

  describe('Access Control', () => {
    it('should deny all tag class operations to regular users', async () => {
      // This test MUST FAIL initially
      const endpoints = [
        { method: 'GET', path: '/api/admin/tag-classes' },
        { method: 'POST', path: '/api/admin/tag-classes' },
        { method: 'PUT', path: `/api/admin/tag-classes/${mockTagClassId}` },
        { method: 'DELETE', path: `/api/admin/tag-classes/${mockTagClassId}` },
        {
          method: 'POST',
          path: `/api/admin/tag-classes/${mockTagClassId}/tags`,
        },
        {
          method: 'DELETE',
          path: `/api/admin/tag-classes/${mockTagClassId}/tags/${mockTagId}`,
        },
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint.path, {
          method: endpoint.method,
          headers: regularUserHeaders,
          body:
            endpoint.method !== 'GET' && endpoint.method !== 'DELETE'
              ? JSON.stringify({})
              : undefined,
        });

        expect(response.status).toBe(403);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Admin access required');
      }
    });

    it('should enforce fandom scope for FandomAdmin operations', async () => {
      // This test MUST FAIL initially
      const updateData = { name: 'Unauthorized Update' };

      const response = await fetch(
        '/api/admin/tag-classes/percyjackson-class-id',
        {
          method: 'PUT',
          headers: fandomAdminHeaders, // HP admin trying to update PJ class
          body: JSON.stringify(updateData),
        }
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('access denied');
    });
  });
});
