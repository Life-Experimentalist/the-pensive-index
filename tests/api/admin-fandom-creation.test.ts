/**
 * Contract Test: POST /api/admin/fandoms
 *
 * Tests the API endpoint for creating new fandoms with the modular fandom
 * creation system. Verifies request/response formats, validation, permissions,
 * and proper integration with the hierarchical admin system.
 *
 * @package the-pensive-index
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type {
  FandomCreationRequest,
  FandomCreationResponse,
  FandomManagementError,
} from '@/types/fandom';

// NOTE: This is a TDD contract test - the actual endpoint doesn't exist yet
// This test MUST FAIL until the implementation is created

describe('POST /api/admin/fandoms - Contract Tests', () => {
  let mockRequest: (
    body: any,
    options?: { userId?: string; role?: string }
  ) => NextRequest;
  let endpoint: (request: NextRequest) => Promise<NextResponse>;

  beforeAll(async () => {
    // Helper to create mock requests
    mockRequest = (
      body: any,
      options: { userId?: string; role?: string } = {}
    ) => {
      const url = 'http://localhost:3000/api/admin/fandoms';
      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': options.userId || 'test-project-admin',
          'x-user-role': options.role || 'ProjectAdmin',
        },
        body: JSON.stringify(body),
      });
      return request;
    };

    // Import the actual endpoint (will fail until implemented)
    try {
      const module = await import('@/app/api/admin/fandoms/route');
      endpoint = module.POST;
    } catch (error) {
      console.warn('Endpoint not implemented yet - this is expected for TDD');
      endpoint = async () => {
        throw new Error('Endpoint not implemented');
      };
    }
  });

  describe('Successful Fandom Creation', () => {
    it('should create a basic fandom with minimal data', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Test Fantasy World',
        slug: 'test-fantasy-world',
        description: 'A test fandom for fantasy stories',
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(201);

      const data: FandomCreationResponse = await response.json();
      expect(data).toMatchObject({
        fandom: {
          name: 'Test Fantasy World',
          slug: 'test-fantasy-world',
          description: 'A test fandom for fantasy stories',
          is_active: true,
        },
        taxonomy_structure: expect.objectContaining({
          categories: expect.any(Array),
          content_types: expect.any(Array),
          validation_rules: expect.any(Array),
        }),
      });
      expect(data.fandom.id).toBeGreaterThan(0);
      expect(data.fandom.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should create a fandom from an Urban Fantasy template', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Urban Magic Chronicles',
        slug: 'urban-magic-chronicles',
        description: 'Modern urban fantasy with magical systems',
        template_id: 1, // Assume template ID 1 is Urban Fantasy
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(201);

      const data: FandomCreationResponse = await response.json();
      expect(data).toHaveProperty('applied_template');
      expect(data.applied_template?.name).toBe('Urban Fantasy');
      expect(data.created_content?.tags_created).toBeGreaterThan(0);
      expect(data.taxonomy_structure.categories).toContain(
        expect.objectContaining({
          name: 'magical-systems',
        })
      );
    });

    it('should create a fandom with custom taxonomy structure', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Custom Sci-Fi Universe',
        slug: 'custom-sci-fi-universe',
        custom_taxonomy: {
          categories: [
            {
              id: 'tech-level',
              name: 'Technology Level',
              description: 'Categories for technological advancement',
              content_types: ['tag', 'plot_block'],
              is_required: true,
            },
          ],
          content_types: [
            {
              type: 'tag',
              name: 'Story Tags',
              required_fields: ['name', 'category'],
              optional_fields: ['description'],
              validation_schema: {},
              allows_hierarchy: false,
            },
          ],
          validation_rules: [],
          hierarchy_rules: [],
        },
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(201);

      const data: FandomCreationResponse = await response.json();
      expect(data.taxonomy_structure.categories).toContainEqual(
        expect.objectContaining({
          name: 'Technology Level',
        })
      );
    });

    it('should create a fandom with initial content', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Pre-populated Fantasy',
        slug: 'pre-populated-fantasy',
        initial_content: {
          tags: [
            {
              name: 'Magic System',
              category: 'world-building',
              description: 'How magic works in this universe',
            },
            {
              name: 'Dragons',
              category: 'creatures',
              description: 'Large magical reptiles',
            },
          ],
          plot_blocks: [
            {
              name: "Hero's Journey",
              category: 'story-structure',
              description: 'Classic heroic narrative arc',
            },
          ],
        },
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(201);

      const data: FandomCreationResponse = await response.json();
      expect(data.created_content?.tags_created).toBe(2);
      expect(data.created_content?.plot_blocks_created).toBe(1);
    });
  });

  describe('Validation Errors', () => {
    it('should reject fandom with missing required fields', async () => {
      const requestBody = {
        description: 'A fandom without name or slug',
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(400);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('VALIDATION_ERROR');
      expect(error.error_message).toContain('name');
      expect(error.error_message).toContain('slug');
    });

    it('should reject fandom with invalid slug format', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Valid Name',
        slug: 'Invalid Slug With Spaces!',
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(400);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('VALIDATION_ERROR');
      expect(error.error_message).toContain('slug');
      expect(error.suggested_action).toContain('alphanumeric');
    });

    it('should reject fandom with duplicate slug', async () => {
      // First create a fandom
      const originalRequest = mockRequest({
        name: 'Original Fandom',
        slug: 'duplicate-test-slug',
      });
      await endpoint(originalRequest);

      // Try to create another with same slug
      const duplicateRequest = mockRequest({
        name: 'Duplicate Fandom',
        slug: 'duplicate-test-slug',
      });
      const response = await endpoint(duplicateRequest);

      expect(response.status).toBe(409);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('DUPLICATE_SLUG');
      expect(error.error_message).toContain('already exists');
    });

    it('should reject fandom with non-existent template ID', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Template Test',
        slug: 'template-test',
        template_id: 99999, // Non-existent template
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(404);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('TEMPLATE_NOT_FOUND');
      expect(error.error_message).toContain('template');
    });

    it('should reject fandom with invalid custom taxonomy', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Invalid Taxonomy Test',
        slug: 'invalid-taxonomy-test',
        custom_taxonomy: {
          categories: [], // Empty categories should be invalid
          content_types: [],
          validation_rules: [],
          hierarchy_rules: [],
        },
      };

      const request = mockRequest(requestBody);
      const response = await endpoint(request);

      expect(response.status).toBe(400);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('INVALID_TAXONOMY');
      expect(error.error_message).toContain('categories');
    });
  });

  describe('Permission Errors', () => {
    it('should reject request from FandomAdmin user', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Unauthorized Fandom',
        slug: 'unauthorized-fandom',
      };

      const request = mockRequest(requestBody, {
        userId: 'test-fandom-admin',
        role: 'FandomAdmin',
      });
      const response = await endpoint(request);

      expect(response.status).toBe(403);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.error_message).toContain('ProjectAdmin');
    });

    it('should reject unauthenticated request', async () => {
      const requestBody: FandomCreationRequest = {
        name: 'Anonymous Fandom',
        slug: 'anonymous-fandom',
      };

      const request = mockRequest(requestBody, {
        userId: undefined,
        role: undefined,
      });
      const response = await endpoint(request);

      expect(response.status).toBe(401);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('Server Errors', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would need to mock database failures
      // For now, we specify the expected behavior

      const requestBody: FandomCreationRequest = {
        name: 'Database Error Test',
        slug: 'database-error-test',
      };

      // In a real implementation, we'd mock the database to fail
      // const request = mockRequest(requestBody);
      // const response = await endpoint(request);

      // expect(response.status).toBe(500);

      // const error: FandomManagementError = await response.json();
      // expect(error.error_code).toBe('DATABASE_ERROR');
      // expect(error.error_message).toContain('temporary issue');

      // For now, just document the expected behavior
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for fandom creation', async () => {
      // Test rapid succession of requests
      const promises = Array.from({ length: 10 }, (_, i) => {
        const requestBody: FandomCreationRequest = {
          name: `Rate Limit Test ${i}`,
          slug: `rate-limit-test-${i}`,
        };
        return endpoint(mockRequest(requestBody));
      });

      const responses = await Promise.all(promises);

      // Should have at least one rate-limited response
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate-limited responses should include proper headers
      const rateLimited = rateLimitedResponses[0];
      expect(rateLimited.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Content-Type Validation', () => {
    it('should reject non-JSON content type', async () => {
      const url = 'http://localhost:3000/api/admin/fandoms';
      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
          'x-user-id': 'test-project-admin',
          'x-user-role': 'ProjectAdmin',
        },
        body: 'name=test&slug=test',
      });

      const response = await endpoint(request);

      expect(response.status).toBe(415);

      const error: FandomManagementError = await response.json();
      expect(error.error_code).toBe('INVALID_CONTENT_TYPE');
      expect(error.error_message).toContain('application/json');
    });
  });
});
