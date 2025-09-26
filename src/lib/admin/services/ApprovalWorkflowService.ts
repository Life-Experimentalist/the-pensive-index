/**
 * Approval Workflow Service
 *
 * Orchestrates approval workflows, reviewer management,
 * and approval process automation.
 *
 * @package the-pensive-index
 */

import { ApprovalQueries } from '@/lib/database/approval-queries';
import { ContentQueries } from '@/lib/database/content-queries';

export class ApprovalWorkflowService {
  private approvalQueries: ApprovalQueries;
  private contentQueries: ContentQueries;

  constructor() {
    this.approvalQueries = new ApprovalQueries();
    this.contentQueries = new ContentQueries();
  }

  /**
   * Submit content for approval
   */
  async submitForApproval(
    contentId: number,
    submittedBy: string
  ): Promise<any> {
    return await this.approvalQueries.createApprovalRequest({
      content_item_id: contentId,
      approval_status: 'pending',
      priority: 'normal',
    });
  }

  /**
   * Approve content
   */
  async approveContent(
    approvalId: number,
    reviewerId: string,
    notes?: string
  ): Promise<any> {
    return await this.approvalQueries.approveContent(
      approvalId,
      reviewerId,
      notes
    );
  }

  /**
   * Reject content
   */
  async rejectContent(
    approvalId: number,
    reviewerId: string,
    reasons: string[],
    notes?: string
  ): Promise<any> {
    return await this.approvalQueries.rejectContent(
      approvalId,
      reviewerId,
      reasons,
      notes
    );
  }

  /**
   * Get approval dashboard
   */
  async getApprovalDashboard(): Promise<any> {
    return await this.approvalQueries.getApprovalStats();
  }

  /**
   * Get reviewer workload
   */
  async getReviewerWorkload(reviewerId?: string): Promise<any[]> {
    return await this.approvalQueries.getReviewerWorkload(reviewerId);
  }

  /**
   * Process bulk approvals
   */
  async processBulkApprovals(request: {
    fandom_id: number;
    approvals: Array<{
      content_id: number;
      action: 'approve' | 'reject' | 'request_changes';
      notes?: string;
    }>;
    approval_level?: number;
    reviewer_id: string;
  }): Promise<{
    success: boolean;
    results: Array<{
      content_id: number;
      status: 'approved' | 'rejected' | 'changes_requested' | 'error';
      message?: string;
    }>;
  }> {
    const results = [];

    for (const approval of request.approvals) {
      try {
        let result;
        if (approval.action === 'approve') {
          result = await this.approveContent(
            approval.content_id,
            request.reviewer_id,
            approval.notes
          );
        } else if (approval.action === 'reject') {
          result = await this.rejectContent(
            approval.content_id,
            request.reviewer_id,
            ['bulk_rejection'],
            approval.notes
          );
        } else {
          // request_changes - for now, treat as reject with specific note
          result = await this.rejectContent(
            approval.content_id,
            request.reviewer_id,
            ['changes_requested'],
            approval.notes
          );
        }

        results.push({
          content_id: approval.content_id,
          status:
            approval.action === 'approve'
              ? ('approved' as const)
              : approval.action === 'reject'
              ? ('rejected' as const)
              : ('changes_requested' as const),
        });
      } catch (error) {
        results.push({
          content_id: approval.content_id,
          status: 'error' as const,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      results,
    };
  }

  /**
   * Get pending approvals for a fandom
   */
  async getPendingApprovals(request: {
    fandom_id: number;
    status?: string[];
    content_type?: string[];
    priority?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    items: Array<{
      id: number;
      content_type: string;
      title: string;
      description?: string;
      submitted_by: string;
      submitted_at: string;
      priority: string;
      status: string;
    }>;
  }> {
    // Mock implementation - in a real app, this would query the database
    return {
      total: 0,
      items: [],
    };
  }

  /**
   * Process single approval
   */
  async processApproval(request: {
    action: 'approve' | 'reject' | 'request_changes';
    content_ids: number[];
    approval_notes?: string;
    reviewer_comments?: string;
    approval_level?: number;
    delegate_to?: string;
    reviewer_id: string;
  }): Promise<{
    success: boolean;
    results: Array<{
      content_id: number;
      status: 'approved' | 'rejected' | 'changes_requested' | 'error';
      message?: string;
    }>;
  }> {
    const results = [];

    for (const contentId of request.content_ids) {
      try {
        let result;
        if (request.action === 'approve') {
          result = await this.approveContent(
            contentId,
            request.reviewer_id,
            request.approval_notes
          );
        } else if (request.action === 'reject') {
          result = await this.rejectContent(
            contentId,
            request.reviewer_id,
            ['rejection'],
            request.approval_notes
          );
        } else {
          // request_changes
          result = await this.rejectContent(
            contentId,
            request.reviewer_id,
            ['changes_requested'],
            request.approval_notes
          );
        }

        results.push({
          content_id: contentId,
          status:
            request.action === 'approve'
              ? ('approved' as const)
              : request.action === 'reject'
              ? ('rejected' as const)
              : ('changes_requested' as const),
        });
      } catch (error) {
        results.push({
          content_id: contentId,
          status: 'error' as const,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      results,
    };
  }
}
