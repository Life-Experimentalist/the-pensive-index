/**
 * Approval Workflow Database Queries
 *
 * Database operations for managing content approval workflows,
 * review processes, and approval state management.
 *
 * @package the-pensive-index
 */

import {
  eq,
  and,
  desc,
  asc,
  like,
  sql,
  inArray,
  isNull,
  or,
} from 'drizzle-orm';
import { getDatabase } from './config';
import { fandomContentApprovals } from './schemas/fandom-content';
import { fandomContentItems } from './schemas/fandom-content';
import type { ContentApproval, BulkOperation } from '@/types';

export class ApprovalQueries {
  private db = getDatabase();

  /**
   * Create new approval request
   */
  async createApprovalRequest(
    data: Omit<any, 'id' | 'submitted_at' | 'reviewed_at' | 'completed_at'>
  ): Promise<any> {
    const [newApproval] = await this.db
      .insert(fandomContentApprovals)
      .values({
        ...data,
        approval_status: data.approval_status || 'pending',
        approval_level: data.approval_level || 1,
        priority: data.priority || 'normal',
        submitted_at: sql`datetime('now')`,
      })
      .returning();

    return newApproval;
  }

  /**
   * Get approval request by ID
   */
  async getApprovalById(id: number): Promise<any | null> {
    const result = await this.db
      .select({
        // Approval fields
        id: fandomContentApprovals.id,
        content_item_id: fandomContentApprovals.content_item_id,
        approval_status: fandomContentApprovals.approval_status,
        reviewer_id: fandomContentApprovals.reviewer_id,
        reviewer_notes: fandomContentApprovals.reviewer_notes,
        approval_level: fandomContentApprovals.approval_level,
        approved_changes: fandomContentApprovals.approved_changes,
        rejection_reasons: fandomContentApprovals.rejection_reasons,
        requested_changes: fandomContentApprovals.requested_changes,
        priority: fandomContentApprovals.priority,
        due_date: fandomContentApprovals.due_date,
        escalated_to: fandomContentApprovals.escalated_to,
        submitted_at: fandomContentApprovals.submitted_at,
        reviewed_at: fandomContentApprovals.reviewed_at,
        completed_at: fandomContentApprovals.completed_at,

        // Content item fields
        content_name: fandomContentItems.content_name,
        content_type: fandomContentItems.content_type,
        fandom_id: fandomContentItems.fandom_id,
        status: fandomContentItems.status,
      })
      .from(fandomContentApprovals)
      .leftJoin(
        fandomContentItems,
        eq(fandomContentApprovals.content_item_id, fandomContentItems.id)
      )
      .where(eq(fandomContentApprovals.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * List approval requests with filters
   */
  async listApprovalRequests(
    options: {
      approval_status?: string;
      reviewer_id?: string;
      content_type?: string;
      fandom_id?: number;
      priority?: string;
      due_before?: string;
      escalated_only?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ approvals: any[]; total: number }> {
    const {
      approval_status,
      reviewer_id,
      content_type,
      fandom_id,
      priority,
      due_before,
      escalated_only = false,
      limit = 50,
      offset = 0,
    } = options;

    // Build where conditions
    const conditions = [];

    if (approval_status) {
      conditions.push(
        eq(fandomContentApprovals.approval_status, approval_status)
      );
    }
    if (reviewer_id) {
      conditions.push(eq(fandomContentApprovals.reviewer_id, reviewer_id));
    }
    if (priority) {
      conditions.push(eq(fandomContentApprovals.priority, priority));
    }
    if (due_before) {
      conditions.push(sql`${fandomContentApprovals.due_date} <= ${due_before}`);
    }
    if (escalated_only) {
      conditions.push(sql`${fandomContentApprovals.escalated_to} IS NOT NULL`);
    }
    if (content_type) {
      conditions.push(eq(fandomContentItems.content_type, content_type));
    }
    if (fandom_id) {
      conditions.push(eq(fandomContentItems.fandom_id, fandom_id));
    }

    // Get approvals with pagination
    const approvalsQuery = this.db
      .select({
        // Approval fields
        id: fandomContentApprovals.id,
        content_item_id: fandomContentApprovals.content_item_id,
        approval_status: fandomContentApprovals.approval_status,
        reviewer_id: fandomContentApprovals.reviewer_id,
        approval_level: fandomContentApprovals.approval_level,
        priority: fandomContentApprovals.priority,
        due_date: fandomContentApprovals.due_date,
        escalated_to: fandomContentApprovals.escalated_to,
        submitted_at: fandomContentApprovals.submitted_at,
        reviewed_at: fandomContentApprovals.reviewed_at,

        // Content item fields
        content_name: fandomContentItems.content_name,
        content_type: fandomContentItems.content_type,
        fandom_id: fandomContentItems.fandom_id,
      })
      .from(fandomContentApprovals)
      .leftJoin(
        fandomContentItems,
        eq(fandomContentApprovals.content_item_id, fandomContentItems.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(fandomContentApprovals.submitted_at))
      .limit(limit)
      .offset(offset);

    // Get approvals result and count manually
    const approvalsResult = await approvalsQuery;

    // Get total count by running the same query without pagination
    const allApprovals = await this.db
      .select()
      .from(fandomContentApprovals)
      .leftJoin(
        fandomContentItems,
        eq(fandomContentApprovals.content_item_id, fandomContentItems.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      approvals: approvalsResult,
      total: allApprovals.length,
    };
  }

  /**
   * Update approval request
   */
  async updateApproval(id: number, updates: Partial<any>): Promise<any | null> {
    const [updatedApproval] = await this.db
      .update(fandomContentApprovals)
      .set({
        ...updates,
        reviewed_at:
          updates.approval_status && updates.approval_status !== 'pending'
            ? sql`datetime('now')`
            : undefined,
      })
      .where(eq(fandomContentApprovals.id, id))
      .returning();

    return updatedApproval || null;
  }

  /**
   * Approve content item
   */
  async approveContent(
    approvalId: number,
    reviewerId: string,
    notes?: string,
    approvedChanges?: any
  ): Promise<any | null> {
    return await this.db.transaction(async (tx: any) => {
      // Update approval status
      const [updatedApproval] = await tx
        .update(fandomContentApprovals)
        .set({
          approval_status: 'approved',
          reviewer_id: reviewerId,
          reviewer_notes: notes,
          approved_changes: approvedChanges
            ? JSON.stringify(approvedChanges)
            : null,
          reviewed_at: sql`datetime('now')`,
          completed_at: sql`datetime('now')`,
        })
        .where(eq(fandomContentApprovals.id, approvalId))
        .returning();

      if (updatedApproval) {
        // Update the content item status to approved
        await tx
          .update(fandomContentItems)
          .set({
            status: 'approved',
            reviewed_by: reviewerId,
            reviewed_at: sql`datetime('now')`,
            updated_at: sql`datetime('now')`,
          })
          .where(eq(fandomContentItems.id, updatedApproval.content_item_id));
      }

      return updatedApproval;
    });
  }

  /**
   * Reject content item
   */
  async rejectContent(
    approvalId: number,
    reviewerId: string,
    rejectionReasons: string[],
    notes?: string
  ): Promise<any | null> {
    return await this.db.transaction(async (tx: any) => {
      // Update approval status
      const [updatedApproval] = await tx
        .update(fandomContentApprovals)
        .set({
          approval_status: 'rejected',
          reviewer_id: reviewerId,
          reviewer_notes: notes,
          rejection_reasons: JSON.stringify(rejectionReasons),
          reviewed_at: sql`datetime('now')`,
          completed_at: sql`datetime('now')`,
        })
        .where(eq(fandomContentApprovals.id, approvalId))
        .returning();

      if (updatedApproval) {
        // Update the content item status to rejected
        await tx
          .update(fandomContentItems)
          .set({
            status: 'rejected',
            reviewed_by: reviewerId,
            reviewed_at: sql`datetime('now')`,
            review_notes: notes,
            updated_at: sql`datetime('now')`,
          })
          .where(eq(fandomContentItems.id, updatedApproval.content_item_id));
      }

      return updatedApproval;
    });
  }

  /**
   * Request changes for content item
   */
  async requestChanges(
    approvalId: number,
    reviewerId: string,
    requestedChanges: any,
    notes?: string
  ): Promise<any | null> {
    return await this.db.transaction(async (tx: any) => {
      // Update approval status
      const [updatedApproval] = await tx
        .update(fandomContentApprovals)
        .set({
          approval_status: 'changes_requested',
          reviewer_id: reviewerId,
          reviewer_notes: notes,
          requested_changes: JSON.stringify(requestedChanges),
          reviewed_at: sql`datetime('now')`,
          // Note: not setting completed_at as this is not final
        })
        .where(eq(fandomContentApprovals.id, approvalId))
        .returning();

      if (updatedApproval) {
        // Update the content item status to pending with reviewer notes
        await tx
          .update(fandomContentItems)
          .set({
            status: 'pending',
            reviewed_by: reviewerId,
            reviewed_at: sql`datetime('now')`,
            review_notes: notes,
            updated_at: sql`datetime('now')`,
          })
          .where(eq(fandomContentItems.id, updatedApproval.content_item_id));
      }

      return updatedApproval;
    });
  }

  /**
   * Escalate approval to higher level or different reviewer
   */
  async escalateApproval(
    approvalId: number,
    escalatedTo: string,
    reason: string
  ): Promise<any | null> {
    const [updatedApproval] = await this.db
      .update(fandomContentApprovals)
      .set({
        escalated_to: escalatedTo,
        priority: 'high', // Escalated items get high priority
        reviewer_notes: sql`COALESCE(${fandomContentApprovals.reviewer_notes}, '') || '\n[ESCALATED] ' || ${reason}`,
      })
      .where(eq(fandomContentApprovals.id, approvalId))
      .returning();

    return updatedApproval || null;
  }

  /**
   * Get approval dashboard statistics
   */
  async getApprovalStats(): Promise<{
    total_pending: number;
    total_overdue: number;
    total_escalated: number;
    by_priority: Record<string, number>;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    avg_approval_time: number; // in hours
  }> {
    // Get all approvals for statistics
    const allApprovals = await this.db
      .select({
        approval_status: fandomContentApprovals.approval_status,
        priority: fandomContentApprovals.priority,
        due_date: fandomContentApprovals.due_date,
        escalated_to: fandomContentApprovals.escalated_to,
        submitted_at: fandomContentApprovals.submitted_at,
        reviewed_at: fandomContentApprovals.reviewed_at,
        content_type: fandomContentItems.content_type,
      })
      .from(fandomContentApprovals)
      .leftJoin(
        fandomContentItems,
        eq(fandomContentApprovals.content_item_id, fandomContentItems.id)
      );

    const stats = {
      total_pending: 0,
      total_overdue: 0,
      total_escalated: 0,
      by_priority: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
      avg_approval_time: 0,
    };

    const now = new Date();
    let totalApprovalTime = 0;
    let completedApprovalsCount = 0;

    for (const approval of allApprovals) {
      // Count by status
      const status = approval.approval_status || 'unknown';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;

      // Count pending
      if (status === 'pending') {
        stats.total_pending++;

        // Check if overdue
        if (approval.due_date && new Date(approval.due_date) < now) {
          stats.total_overdue++;
        }
      }

      // Count escalated
      if (approval.escalated_to) {
        stats.total_escalated++;
      }

      // Count by priority
      const priority = approval.priority || 'normal';
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;

      // Count by content type
      const contentType = approval.content_type || 'unknown';
      stats.by_type[contentType] = (stats.by_type[contentType] || 0) + 1;

      // Calculate approval time for completed items
      if (approval.submitted_at && approval.reviewed_at) {
        const submittedTime = new Date(approval.submitted_at).getTime();
        const reviewedTime = new Date(approval.reviewed_at).getTime();
        totalApprovalTime += reviewedTime - submittedTime;
        completedApprovalsCount++;
      }
    }

    // Calculate average approval time in hours
    if (completedApprovalsCount > 0) {
      stats.avg_approval_time =
        Math.round(
          (totalApprovalTime / completedApprovalsCount / (1000 * 60 * 60)) * 100
        ) / 100;
    }

    return stats;
  }

  /**
   * Get reviewer workload
   */
  async getReviewerWorkload(reviewerId?: string): Promise<
    {
      reviewer_id: string;
      pending_count: number;
      overdue_count: number;
      avg_review_time: number;
    }[]
  > {
    const conditions = [];
    if (reviewerId) {
      conditions.push(eq(fandomContentApprovals.reviewer_id, reviewerId));
    }

    const reviewerApprovals = await this.db
      .select()
      .from(fandomContentApprovals)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Group by reviewer
    const reviewerStats = new Map<
      string,
      {
        pending_count: number;
        overdue_count: number;
        review_times: number[];
      }
    >();

    const now = new Date();

    for (const approval of reviewerApprovals) {
      if (!approval.reviewer_id) continue;

      if (!reviewerStats.has(approval.reviewer_id)) {
        reviewerStats.set(approval.reviewer_id, {
          pending_count: 0,
          overdue_count: 0,
          review_times: [],
        });
      }

      const stats = reviewerStats.get(approval.reviewer_id)!;

      // Count pending items
      if (approval.approval_status === 'pending') {
        stats.pending_count++;

        // Check if overdue
        if (approval.due_date && new Date(approval.due_date) < now) {
          stats.overdue_count++;
        }
      }

      // Track review times for completed items
      if (approval.submitted_at && approval.reviewed_at) {
        const submittedTime = new Date(approval.submitted_at).getTime();
        const reviewedTime = new Date(approval.reviewed_at).getTime();
        stats.review_times.push(reviewedTime - submittedTime);
      }
    }

    // Convert to final format
    return Array.from(reviewerStats.entries()).map(([reviewerId, stats]) => ({
      reviewer_id: reviewerId,
      pending_count: stats.pending_count,
      overdue_count: stats.overdue_count,
      avg_review_time:
        stats.review_times.length > 0
          ? Math.round(
              (stats.review_times.reduce((a, b) => a + b, 0) /
                stats.review_times.length /
                (1000 * 60 * 60)) *
                100
            ) / 100
          : 0,
    }));
  }

  /**
   * Get overdue approvals
   */
  async getOverdueApprovals(): Promise<any[]> {
    const now = new Date().toISOString();

    return await this.db
      .select({
        id: fandomContentApprovals.id,
        content_item_id: fandomContentApprovals.content_item_id,
        approval_status: fandomContentApprovals.approval_status,
        reviewer_id: fandomContentApprovals.reviewer_id,
        priority: fandomContentApprovals.priority,
        due_date: fandomContentApprovals.due_date,
        submitted_at: fandomContentApprovals.submitted_at,
        content_name: fandomContentItems.content_name,
        content_type: fandomContentItems.content_type,
      })
      .from(fandomContentApprovals)
      .leftJoin(
        fandomContentItems,
        eq(fandomContentApprovals.content_item_id, fandomContentItems.id)
      )
      .where(
        and(
          eq(fandomContentApprovals.approval_status, 'pending'),
          sql`${fandomContentApprovals.due_date} < ${now}`
        )
      )
      .orderBy(asc(fandomContentApprovals.due_date));
  }

  /**
   * Bulk approve multiple items
   */
  async bulkApprove(
    approvalIds: number[],
    reviewerId: string,
    notes?: string
  ): Promise<{ approved: number; failed: number; errors: string[] }> {
    const results = { approved: 0, failed: 0, errors: [] as string[] };

    for (const approvalId of approvalIds) {
      try {
        await this.approveContent(approvalId, reviewerId, notes);
        results.approved++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to approve ${approvalId}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Bulk reject multiple items
   */
  async bulkReject(
    approvalIds: number[],
    reviewerId: string,
    rejectionReasons: string[],
    notes?: string
  ): Promise<{ rejected: number; failed: number; errors: string[] }> {
    const results = { rejected: 0, failed: 0, errors: [] as string[] };

    for (const approvalId of approvalIds) {
      try {
        await this.rejectContent(
          approvalId,
          reviewerId,
          rejectionReasons,
          notes
        );
        results.rejected++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to reject ${approvalId}: ${error}`);
      }
    }

    return results;
  }
}
