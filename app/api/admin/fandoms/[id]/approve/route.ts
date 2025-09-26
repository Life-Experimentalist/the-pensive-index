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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Await params in Next.js 15
    const resolvedParams = await params;

    // Validate fandom ID
    const fandomId = parseInt(resolvedParams.id);
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
        })),
        approval_level: validatedData.approval_level || 1,
        reviewer_id: userId,
      });

      const successful_count = results.results.filter(
        r => r.status !== 'error'
      ).length;
      const failed_count = results.results.filter(
        r => r.status === 'error'
      ).length;

      return NextResponse.json(
        {
          success: true,
          data: {
            processed_count: results.results.length,
            successful_count,
            failed_count,
            results: results.results,
          },
          message: `Bulk approval completed: ${successful_count} successful, ${failed_count} failed`,
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
            content_ids: [contentId],
            action: validatedData.action,
            approval_level: validatedData.approval_level || 1,
            approval_notes: validatedData.approval_notes,
            reviewer_comments: validatedData.reviewer_comments,
            reviewer_id: userId,
            delegate_to: validatedData.delegate_to,
          });

          // processApproval returns results for all content_ids
          results.push(
            ...result.results.map(r => ({
              content_id: r.content_id,
              action: validatedData.action,
              status: r.status === 'error' ? 'error' : 'success',
              message: r.message,
            }))
          );
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const resolvedParams = await params;
    const fandomId = parseInt(resolvedParams.id);
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
    const approvalLevelStr = searchParams.get('approval_level');
    const approval_level = approvalLevelStr
      ? parseInt(approvalLevelStr)
      : null;
    const content_type = searchParams.get('content_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Initialize service
    const approvalService = new ApprovalWorkflowService();

    // Get pending approvals for fandom
    const result = await approvalService.getPendingApprovals({
      fandom_id: fandomId,
      status: status ? [status] : undefined,
      content_type: content_type ? [content_type] : undefined,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        pending_approvals: result.items.map((approval: any) => ({
          approval_id: approval.id,
          content_id: approval.id,
          content_name: approval.title,
          content_type: approval.content_type,
          fandom_id: fandomId,
          current_status: approval.status,
          submitted_by: approval.submitted_by,
          submitted_at: approval.submitted_at,
          priority: approval.priority,
        })),
        pagination: {
          page,
          limit,
          total: result.total,
          total_pages: Math.ceil(result.total / limit),
        },
        summary: {
          total_pending: result.total,
          by_level: {},
          by_type: {},
          overdue: 0,
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
