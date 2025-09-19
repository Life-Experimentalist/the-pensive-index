/**
 * Admin Invitation API
 * 
 * API endpoints for managing admin invitations and onboarding workflow.
 * Handles invitation creation, acceptance, rejection, and management.
 * 
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { InvitationService } from '@/lib/admin/services/InvitationService';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';
import type { AdminRole } from '@/types/admin';

// Request validation schemas
const CreateInvitationSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['ProjectAdmin', 'FandomAdmin'] as const),
  fandomId: z.string().optional(),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
  message: z.string().max(500).optional()
});

const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required')
});

const RejectInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  reason: z.string().max(200).optional()
});

const CancelInvitationSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required')
});

const ResendInvitationSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required')
});

// Initialize services
const invitationService = new InvitationService();
const permissionValidator = PermissionValidator.getInstance();

/**
 * POST /api/admin/invitations
 * Create a new admin invitation
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateInvitationSchema.parse(body);
    const { email, role, fandomId, expiresInDays, message } = validatedData;

    // Permission check - can current user invite admins?
    const canInvite = await permissionValidator.canInviteAdmins(
      currentUserId,
      role,
      fandomId
    );

    if (!canInvite) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to invite admins',
          required_permission: 'admin:invite',
          target_role: role,
          fandom_context: fandomId
        },
        { status: 403 }
      );
    }

    // Role-specific validations
    if (role === 'FandomAdmin' && !fandomId) {
      return NextResponse.json(
        { error: 'Fandom ID required for Fandom Admin invitations' },
        { status: 400 }
      );
    }

    if (role === 'ProjectAdmin' && fandomId) {
      return NextResponse.json(
        { error: 'Project Admin invitations should not specify fandom' },
        { status: 400 }
      );
    }

    // Create the invitation
    const invitation = await invitationService.createInvitation(
      email,
      role,
      currentUserId,
      fandomId,
      expiresInDays
    );

    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role_id: invitation.role_id,
        role_name: invitation.role_name,
        fandom_id: invitation.fandom_id,
        fandom_name: invitation.fandom_name,
        invited_by: invitation.invited_by,
        status: invitation.status,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating invitation:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle known business logic errors
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/invitations
 * Get invitations with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Permission check - can view invitations
    const canView = await permissionValidator.canViewAuditLogs(currentUserId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view invitations' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'list' | 'stats'
    
    const filters = {
      status: searchParams.get('status') as 'pending' | 'accepted' | 'expired' | 'revoked' || undefined,
      fandom_id: searchParams.get('fandom_id') || undefined,
      invited_by: searchParams.get('invited_by') || undefined,
      role: searchParams.get('role') as AdminRole || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    if (action === 'stats') {
      // Get invitation statistics
      const stats = await invitationService.getInvitationStats();
      return NextResponse.json({
        success: true,
        statistics: stats
      });
    } else {
      // Get invitation list
      const result = await invitationService.getInvitations(filters);
      
      return NextResponse.json({
        success: true,
        invitations: result.invitations.map(invitation => ({
          id: invitation.id,
          email: invitation.email,
          role_id: invitation.role_id,
          role_name: invitation.role_name,
          fandom_id: invitation.fandom_id,
          fandom_name: invitation.fandom_name,
          invited_by: invitation.invited_by,
          invited_by_name: invitation.invited_by_name,
          status: invitation.status,
          expires_at: invitation.expires_at,
          accepted_at: invitation.accepted_at,
          accepted_by: invitation.accepted_by,
          created_at: invitation.created_at,
          updated_at: invitation.updated_at
        })),
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          has_more: result.total > (filters.offset + filters.limit)
        },
        filters: filters
      });
    }

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/invitations
 * Accept an invitation
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AcceptInvitationSchema.parse(body);
    const { token } = validatedData;

    // Accept the invitation
    const result = await invitationService.acceptInvitation(token, currentUserId);

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      invitation: {
        id: result.invitation.id,
        email: result.invitation.email,
        role_name: result.invitation.role_name,
        fandom_id: result.invitation.fandom_id,
        status: result.invitation.status,
        accepted_at: result.invitation.accepted_at,
        accepted_by: result.invitation.accepted_by
      },
      role_assignment: {
        id: result.assignment.id,
        user_id: result.assignment.user_id,
        role: result.assignment.role,
        fandom_id: result.assignment.fandom_id,
        is_active: result.assignment.is_active
      }
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle known business logic errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/invitations
 * Reject or cancel an invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const action = body.action; // 'reject' | 'cancel'

    if (action === 'reject') {
      // Reject invitation (can be done without authentication)
      const validatedData = RejectInvitationSchema.parse(body);
      const { token, reason } = validatedData;

      const invitation = await invitationService.rejectInvitation(token, reason);

      return NextResponse.json({
        success: true,
        message: 'Invitation rejected successfully',
        invitation_id: invitation.id,
        status: invitation.status,
        rejection_reason: reason
      });

    } else if (action === 'cancel') {
      // Cancel invitation (requires authentication)
      const { userId: currentUserId } = await auth();
      if (!currentUserId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const validatedData = CancelInvitationSchema.parse(body);
      const { invitationId } = validatedData;

      const invitation = await invitationService.cancelInvitation(invitationId, currentUserId);

      return NextResponse.json({
        success: true,
        message: 'Invitation cancelled successfully',
        invitation_id: invitation.id,
        status: invitation.status,
        cancelled_by: currentUserId
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "reject" or "cancel"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error processing invitation cancellation/rejection:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle known business logic errors
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/invitations
 * Resend an invitation
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ResendInvitationSchema.parse(body);
    const { invitationId } = validatedData;

    // Resend the invitation
    const invitation = await invitationService.resendInvitation(invitationId, currentUserId);

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role_name: invitation.role_name,
        fandom_id: invitation.fandom_id,
        status: invitation.status,
        expires_at: invitation.expires_at,
        resent_by: currentUserId
      }
    });

  } catch (error) {
    console.error('Error resending invitation:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle known business logic errors
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}