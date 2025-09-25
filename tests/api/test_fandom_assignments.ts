/**
 * Test Suite: Fandom Assignment API
 *
 * Tests the REST API endpoints for managing fandom assignments
 * and fandom-specific admin operations.
 *
 * @package the-pensive-index
 * @group api
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock API route handlers that will be implemented later
import { POST as assignFandom } from '@/app/api/admin/fandoms/assign/route';
import { GET as getFandomAssignments } from '@/app/api/admin/fandoms/assignments/route';
import { PUT as reassignFandom } from '@/app/api/admin/fandoms/reassign/route';

describe('Fandom Assignment API', () => {
  let projectAdminHeaders: HeadersInit;
  let fandomAdminHeaders: HeadersInit;
  let regularUserHeaders: HeadersInit;
  let testFandomId: string;
  let otherFandomId: string;

  beforeEach(async () => {
    testFandomId = 'fandom-harry-potter';
    otherFandomId = 'fandom-percy-jackson';

    // Mock authentication headers
    projectAdminHeaders = {
      Authorization: 'Bearer project-admin-token',
      'Content-Type': 'application/json',
    };

    fandomAdminHeaders = {
      Authorization: 'Bearer fandom-admin-token',
      'Content-Type': 'application/json',
    };

    regularUserHeaders = {
      Authorization: 'Bearer regular-user-token',
      'Content-Type': 'application/json',
    };
  });

  afterEach(async () => {
    // Cleanup test assignments
  });

  describe('POST /api/admin/fandoms/assign', () => {
    it('should allow Project Admin to assign user to fandom', async () => {
      const requestBody = {
        user_id: 'new-fandom-admin',
        fandom_id: testFandomId,
        assigned_by: 'project-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.assignment).toBeDefined();
      expect(data.assignment.user_id).toBe('new-fandom-admin');
      expect(data.assignment.fandom_id).toBe(testFandomId);
      expect(data.assignment.role.name).toBe('FandomAdmin');
    });

    it('should reject Fandom Admin attempting to assign users', async () => {
      const requestBody = {
        user_id: 'unauthorized-assignment',
        fandom_id: testFandomId,
        assigned_by: 'fandom-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: fandomAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Insufficient permissions');
    });

    it('should validate required fields', async () => {
      const requestBody = {
        fandom_id: testFandomId,
        // Missing user_id and assigned_by
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate fandom existence', async () => {
      const requestBody = {
        user_id: 'test-user',
        fandom_id: 'non-existent-fandom',
        assigned_by: 'project-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Fandom not found');
    });

    it('should prevent duplicate fandom assignments', async () => {
      const requestBody = {
        user_id: 'existing-fandom-admin',
        fandom_id: testFandomId,
        assigned_by: 'project-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      // First assignment should succeed
      await assignFandom(request);

      // Second assignment should fail
      const duplicateRequest = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(duplicateRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('User already assigned to this fandom');
    });

    it('should handle multi-fandom assignments', async () => {
      const user_id = 'multi-fandom-admin';

      // Assign to first fandom
      const firstAssignment = await assignFandom(
        new NextRequest('http://localhost/api/admin/fandoms/assign', {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify({
            user_id,
            fandom_id: testFandomId,
            assigned_by: 'project-admin-user',
          }),
        })
      );

      expect(firstAssignment.status).toBe(201);

      // Assign same user to second fandom
      const secondAssignment = await assignFandom(
        new NextRequest('http://localhost/api/admin/fandoms/assign', {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify({
            user_id,
            fandom_id: otherFandomId,
            assigned_by: 'project-admin-user',
          }),
        })
      );

      expect(secondAssignment.status).toBe(201);

      const secondData = await secondAssignment.json();
      expect(secondData.assignment.fandom_id).toBe(otherFandomId);
    });
  });

  describe('GET /api/admin/fandoms/assignments', () => {
    beforeEach(async () => {
      // Create test fandom assignments
      await assignFandom(
        new NextRequest('http://localhost/api/admin/fandoms/assign', {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify({
            user_id: 'hp-admin-1',
            fandom_id: testFandomId,
            assigned_by: 'project-admin',
          }),
        })
      );

      await assignFandom(
        new NextRequest('http://localhost/api/admin/fandoms/assign', {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify({
            user_id: 'pj-admin-1',
            fandom_id: otherFandomId,
            assigned_by: 'project-admin',
          }),
        })
      );
    });

    it('should allow Project Admin to view all fandom assignments', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assignments',
        {
          method: 'GET',
          headers: projectAdminHeaders,
        }
      );

      const response = await getFandomAssignments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignments).toBeDefined();
      expect(data.assignments.length).toBeGreaterThanOrEqual(2);

      // Should see assignments from multiple fandoms
      const fandomIds = [
        ...new Set(data.assignments.map((a: any) => a.fandom_id)),
      ];
      expect(fandomIds.length).toBeGreaterThan(1);
    });

    it('should filter assignments by fandom', async () => {
      const request = new NextRequest(
        `http://localhost/api/admin/fandoms/assignments?fandom_id=${testFandomId}`,
        {
          method: 'GET',
          headers: projectAdminHeaders,
        }
      );

      const response = await getFandomAssignments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.assignments.every((a: any) => a.fandom_id === testFandomId)
      ).toBe(true);
    });

    it('should restrict Fandom Admin to their assigned fandoms only', async () => {
      const request = new NextRequest(
        `http://localhost/api/admin/fandoms/assignments?fandom_id=${testFandomId}`,
        {
          method: 'GET',
          headers: fandomAdminHeaders,
        }
      );

      const response = await getFandomAssignments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.assignments.every((a: any) => a.fandom_id === testFandomId)
      ).toBe(true);
    });

    it('should reject access to non-assigned fandom for Fandom Admin', async () => {
      const request = new NextRequest(
        `http://localhost/api/admin/fandoms/assignments?fandom_id=${otherFandomId}`,
        {
          method: 'GET',
          headers: fandomAdminHeaders,
        }
      );

      const response = await getFandomAssignments(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied to fandom');
    });

    it('should support pagination', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assignments?page=1&limit=1',
        {
          method: 'GET',
          headers: projectAdminHeaders,
        }
      );

      const response = await getFandomAssignments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assignments.length).toBeLessThanOrEqual(1);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(1);
    });

    it('should include fandom details in response', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assignments',
        {
          method: 'GET',
          headers: projectAdminHeaders,
        }
      );

      const response = await getFandomAssignments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assignments[0]).toHaveProperty('fandom_name');
      expect(data.assignments[0]).toHaveProperty('fandom_id');
      expect(data.assignments[0]).toHaveProperty('user_id');
      expect(data.assignments[0]).toHaveProperty('assigned_at');
    });
  });

  describe('PUT /api/admin/fandoms/reassign', () => {
    let existingAssignmentId: string;

    beforeEach(async () => {
      // Create an existing assignment to reassign
      const response = await assignFandom(
        new NextRequest('http://localhost/api/admin/fandoms/assign', {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify({
            user_id: 'reassign-test-user',
            fandom_id: testFandomId,
            assigned_by: 'project-admin',
          }),
        })
      );

      const data = await response.json();
      existingAssignmentId = data.assignment.id;
    });

    it('should allow Project Admin to reassign fandom to new user', async () => {
      const requestBody = {
        fandom_id: testFandomId,
        new_user_id: 'new-fandom-admin',
        previous_assignment_id: existingAssignmentId,
        assigned_by: 'project-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/reassign',
        {
          method: 'PUT',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await reassignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.new_assignment).toBeDefined();
      expect(data.new_assignment.user_id).toBe('new-fandom-admin');
      expect(data.new_assignment.fandom_id).toBe(testFandomId);
      expect(data.revoked_assignment_id).toBe(existingAssignmentId);
    });

    it('should reject Fandom Admin attempting to reassign fandoms', async () => {
      const requestBody = {
        fandom_id: testFandomId,
        new_user_id: 'unauthorized-reassign',
        previous_assignment_id: existingAssignmentId,
        assigned_by: 'fandom-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/reassign',
        {
          method: 'PUT',
          headers: fandomAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await reassignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Insufficient permissions');
    });

    it('should validate required fields for reassignment', async () => {
      const requestBody = {
        fandom_id: testFandomId,
        // Missing new_user_id and assigned_by
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/reassign',
        {
          method: 'PUT',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await reassignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle orphaned fandom reassignment', async () => {
      // First, remove the current assignment without replacement
      // Then reassign to a new user
      const requestBody = {
        fandom_id: testFandomId,
        new_user_id: 'orphan-rescue-admin',
        assigned_by: 'project-admin-user',
        reason: 'Rescuing orphaned fandom',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/reassign',
        {
          method: 'PUT',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await reassignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.new_assignment.user_id).toBe('orphan-rescue-admin');
    });
  });

  describe('Fandom Assignment Validation', () => {
    it('should validate user exists before assignment', async () => {
      const requestBody = {
        user_id: 'non-existent-user',
        fandom_id: testFandomId,
        assigned_by: 'project-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('User not found');
    });

    it('should validate assigning user has proper permissions', async () => {
      const requestBody = {
        user_id: 'valid-user',
        fandom_id: testFandomId,
        assigned_by: 'unauthorized-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: { Authorization: 'Bearer unauthorized-token' },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Insufficient permissions');
    });
  });

  describe('Audit Logging Integration', () => {
    it('should log fandom assignment actions', async () => {
      const requestBody = {
        user_id: 'audit-test-user',
        fandom_id: testFandomId,
        assigned_by: 'project-admin-user',
      };

      const request = new NextRequest(
        'http://localhost/api/admin/fandoms/assign',
        {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify(requestBody),
        }
      );

      const response = await assignFandom(request);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Check if audit log was created (would be tested via audit service)
      expect(data.audit_log_id).toBeDefined();
    });

    it('should log fandom reassignment actions', async () => {
      // Create initial assignment
      const initialResponse = await assignFandom(
        new NextRequest('http://localhost/api/admin/fandoms/assign', {
          method: 'POST',
          headers: projectAdminHeaders,
          body: JSON.stringify({
            user_id: 'initial-admin',
            fandom_id: testFandomId,
            assigned_by: 'project-admin',
          }),
        })
      );

      const initialData = await initialResponse.json();

      // Reassign
      const reassignResponse = await reassignFandom(
        new NextRequest('http://localhost/api/admin/fandoms/reassign', {
          method: 'PUT',
          headers: projectAdminHeaders,
          body: JSON.stringify({
            fandom_id: testFandomId,
            new_user_id: 'reassign-admin',
            previous_assignment_id: initialData.assignment.id,
            assigned_by: 'project-admin',
          }),
        })
      );

      const reassignData = await reassignResponse.json();

      expect(reassignResponse.status).toBe(200);
      expect(reassignData.audit_log_ids).toHaveLength(2); // One for revoke, one for assign
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent assignment requests', async () => {
      const userIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

      const requests = userIds.map(userId =>
        assignFandom(
          new NextRequest('http://localhost/api/admin/fandoms/assign', {
            method: 'POST',
            headers: projectAdminHeaders,
            body: JSON.stringify({
              user_id: userId,
              fandom_id: testFandomId,
              assigned_by: 'project-admin',
            }),
          })
        )
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(async response => {
        expect(response.status).toBe(201);
      });
    });

    it('should rate limit assignment requests', async () => {
      // Generate many rapid requests
      const requests = Array(15)
        .fill(null)
        .map((_, index) =>
          assignFandom(
            new NextRequest('http://localhost/api/admin/fandoms/assign', {
              method: 'POST',
              headers: projectAdminHeaders,
              body: JSON.stringify({
                user_id: `rate-limit-${index}`,
                fandom_id: testFandomId,
                assigned_by: 'project-admin',
              }),
            })
          )
        );

      const responses = await Promise.all(requests);

      // Some should be rate limited
      const rateLimited = responses.filter(async res => res.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
