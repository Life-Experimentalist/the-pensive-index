import { NextRequest, NextResponse } from 'next/server';
import { ApprovalWorkflowService } from '@/lib/admin/services/ApprovalWorkflowService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Request validation schemas
const ApprovalActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  content_ids: z.array(z.number()).min(1),
  approval_notes: z.string().optional(),
  reviewer_comments: z.string().optional(),
  approval_level: z.number().min(1).max(5).optional(),
  delegate_to: z.string().optional(), // User ID to delegate approval to
});

const BulkApprovalSchema = z.object({
  approvals: z
    .array(
      z.object({
        content_id: z.number(),
        action: z.enum(['approve', 'reject', 'request_changes']),
        notes: z.string().optional(),
      })
    )
    .min(1),
  approval_level: z.number().min(1).max(5).optional(),
});

type ApprovalActionRequest = z.infer<typeof ApprovalActionSchema>;
type BulkApprovalRequest = z.infer<typeof BulkApprovalSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const fandomId = parseInt(params.id);
    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID format',
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Determine if this is a bulk operation or single action
    const isBulkOperation = 'approvals' in body;

    if (isBulkOperation) {
      // Handle bulk approval
      const validatedData = BulkApprovalSchema.parse(body);

      // Initialize service
      const approvalService = new ApprovalWorkflowService();

      // Process bulk approvals
      const results = await approvalService.processBulkApprovals({
        fandom_id: fandomId,
        approvals: validatedData.approvals.map(approval => ({
          content_id: approval.content_id,
          action: approval.action,
          notes: approval.notes,
          approval_level: validatedData.approval_level || 1,
          approved_by: userId,
        })),
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            processed_count: results.processed,
            successful_count: results.successful,
            failed_count: results.failed,
            results: results.approval_results.map((result: any) => ({
              content_id: result.content_id,
              action: result.action,
              status: result.status,
              approval_id: result.approval_id,
              error: result.error,
            })),
            errors: results.errors,
          },
          message: `Bulk approval completed: ${results.successful} successful, ${results.failed} failed`,
        },
        { status: 200 }
      );
    } else {
      // Handle single approval action
      const validatedData = ApprovalActionSchema.parse(body);

      // Initialize service
      const approvalService = new ApprovalWorkflowService();

      // Process single approval for multiple content items
      const results = [];
      const errors = [];

      for (const contentId of validatedData.content_ids) {
        try {
          const result = await approvalService.processApproval({
            content_id: contentId,
            fandom_id: fandomId,
            action: validatedData.action,
            approval_level: validatedData.approval_level || 1,
            notes: validatedData.approval_notes,
            reviewer_comments: validatedData.reviewer_comments,
            approved_by: userId,
            delegate_to: validatedData.delegate_to,
          });

          results.push({
            content_id: contentId,
            action: validatedData.action,
            status: 'success',
            approval_id: result.approval_id,
            next_approval_level: result.next_approval_level,
            requires_additional_approval: result.requires_additional_approval,
          });
        } catch (error) {
          errors.push({
            content_id: contentId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            processed_count: validatedData.content_ids.length,
            successful_count: results.length,
            failed_count: errors.length,
            action: validatedData.action,
            results,
            errors,
          },
          message: `Approval ${validatedData.action} completed: ${results.length} successful, ${errors.length} failed`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Approval workflow error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle business logic errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const fandomId = parseInt(params.id);
    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID format',
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'pending'
      | 'approved'
      | 'rejected'
      | 'changes_requested'
      | null;
    const approval_level = searchParams.get('approval_level')
      ? parseInt(searchParams.get('approval_level')!)
      : null;
    const content_type = searchParams.get('content_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Initialize service
    const approvalService = new ApprovalWorkflowService();

    // Get pending approvals for fandom
    const result = await approvalService.getPendingApprovals({
      fandom_id: fandomId,
      status: status || undefined,
      approval_level: approval_level || undefined,
      content_type: content_type || undefined,
      page,
      limit,
      assigned_to: userId, // Filter to user's assigned approvals if not admin
    });

    return NextResponse.json({
      success: true,
      data: {
        pending_approvals: result.approvals.map((approval: any) => ({
          approval_id: approval.id,
          content_id: approval.content_id,
          content_name: approval.content_name,
          content_type: approval.content_type,
          fandom_id: approval.fandom_id,
          current_status: approval.status,
          approval_level: approval.approval_level,
          required_approval_level: approval.required_approval_level,
          submitted_by: approval.submitted_by,
          submitted_at: approval.submitted_at,
          assigned_to: approval.assigned_to,
          reviewer_notes: approval.reviewer_notes,
          deadline: approval.deadline,
          priority: approval.priority,
        })),
        pagination: {
          page,
          limit,
          total: result.total,
          total_pages: Math.ceil(result.total / limit),
        },
        summary: {
          total_pending: result.summary?.total_pending || 0,
          by_level: result.summary?.by_level || {},
          by_type: result.summary?.by_type || {},
          overdue: result.summary?.overdue || 0,
        },
      },
    });
  } catch (error) {
    console.error('Approval list error:', error);

    // Handle business logic errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
