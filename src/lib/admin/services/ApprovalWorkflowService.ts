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
}
