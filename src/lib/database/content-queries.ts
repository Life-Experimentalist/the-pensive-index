/**
 * Content Management Database Queries
 *
 * Database operations for managing fandom content including versioning,
 * approval workflows, and content lifecycle management.
 *
 * @package the-pensive-index
 */

import { eq, and, desc, asc, like, sql, inArray, isNull } from 'drizzle-orm';
import { getDatabase } from './config';
import {
  fandomContentItems,
  fandomContentVersions,
  fandomContentApprovals,
} from './schemas/fandom-content';
import type { ContentVersion, ContentApproval, BulkOperation } from '@/types';

export class ContentQueries {
  private db = getDatabase();

  /**
   * Create new content item
   */
  async createContentItem(
    data: Omit<any, 'id' | 'created_at' | 'updated_at'>
  ): Promise<any> {
    const [newContent] = await this.db
      .insert(fandomContentItems)
      .values({
        ...data,
        created_at: sql`datetime('now')`,
        updated_at: sql`datetime('now')`,
      })
      .returning();

    return newContent;
  }

  /**
   * Get content item by ID
   */
  async getContentItemById(id: number): Promise<any | null> {
    const result = await this.db
      .select()
      .from(fandomContentItems)
      .where(eq(fandomContentItems.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * List content items by fandom
   */
  async getContentByFandom(
    fandomId: number,
    options: {
      content_type?: string;
      category?: string;
      active_only?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ content: any[]; total: number }> {
    const {
      content_type,
      category,
      active_only = true,
      search,
      limit = 50,
      offset = 0,
    } = options;

    // Build where conditions
    const conditions = [eq(fandomContentItems.fandom_id, fandomId)];

    if (content_type) {
      conditions.push(eq(fandomContentItems.content_type, content_type));
    }
    if (category) {
      conditions.push(eq(fandomContentItems.category, category));
    }
    if (active_only) {
      conditions.push(eq(fandomContentItems.is_active, true));
    }
    if (search) {
      conditions.push(
        sql`${fandomContentItems.content_name} LIKE ${`%${search}%`} OR
            json_extract(${
              fandomContentItems.content_data
            }, '$.description') LIKE ${`%${search}%`}`
      );
    }

    // Get content with pagination
    const contentQuery = this.db
      .select()
      .from(fandomContentItems)
      .where(and(...conditions))
      .orderBy(asc(fandomContentItems.content_name))
      .limit(limit)
      .offset(offset);

    // Get content result and count manually
    const contentResult = await contentQuery;

    // Get total count by running the same query without pagination
    const allContent = await this.db
      .select()
      .from(fandomContentItems)
      .where(and(...conditions));

    return {
      content: contentResult,
      total: allContent.length,
    };
  }

  /**
   * Update content item
   */
  async updateContentItem(
    id: number,
    updates: Partial<any>,
    createVersion: boolean = true
  ): Promise<any | null> {
    return await this.db.transaction(async (tx: any) => {
      // Get current content for versioning
      const [currentContent] = await tx
        .select()
        .from(fandomContentItems)
        .where(eq(fandomContentItems.id, id));

      if (!currentContent) return null;

      // Create version if requested
      if (createVersion) {
        await this.createContentVersion({
          content_item_id: id,
          content_snapshot: currentContent,
          changed_by: updates.reviewed_by || 'system',
          change_type: 'update',
          change_summary: JSON.stringify(
            this.generateChangesSummary(currentContent, updates)
          ),
        });
      }

      // Update content
      const [updatedContent] = await tx
        .update(fandomContentItems)
        .set({
          ...updates,
          updated_at: sql`datetime('now')`,
        })
        .where(eq(fandomContentItems.id, id))
        .returning();

      return updatedContent || null;
    });
  }

  /**
   * Delete content item (soft delete)
   */
  async deactivateContentItem(id: number): Promise<boolean> {
    const result = await this.db
      .update(fandomContentItems)
      .set({
        is_active: false,
        updated_at: sql`datetime('now')`,
      })
      .where(eq(fandomContentItems.id, id));

    return result.changes > 0;
  }

  /**
   * Create content version
   */
  async createContentVersion(data: any): Promise<any> {
    return await this.db.transaction(async (tx: any) => {
      // Create new version entry
      const [newVersion] = await tx
        .insert(fandomContentVersions)
        .values({
          ...data,
          created_at: sql`datetime('now')`,
        })
        .returning();

      return newVersion;
    });
  }

  /**
   * Get content version history
   */
  async getContentVersionHistory(contentId: number): Promise<any[]> {
    return await this.db
      .select()
      .from(fandomContentVersions)
      .where(eq(fandomContentVersions.content_item_id, contentId))
      .orderBy(desc(fandomContentVersions.version));
  }

  /**
   * Get latest content version
   */
  async getLatestContentVersion(contentId: number): Promise<any | null> {
    const result = await this.db
      .select()
      .from(fandomContentVersions)
      .where(eq(fandomContentVersions.content_item_id, contentId))
      .orderBy(desc(fandomContentVersions.created_at))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Revert content to previous version
   */
  async revertContentToVersion(
    contentId: number,
    versionId: number,
    revertedBy: string
  ): Promise<{ content: any; version: any } | null> {
    return await this.db.transaction(async (tx: any) => {
      // Get the target version
      const [targetVersion] = await tx
        .select()
        .from(fandomContentVersions)
        .where(eq(fandomContentVersions.id, versionId));

      if (!targetVersion || targetVersion.content_item_id !== contentId) {
        return null;
      }

      // Create new version from target version snapshot
      const [newVersion] = await tx
        .insert(fandomContentVersions)
        .values({
          content_item_id: contentId,
          version: `${Date.now()}`,
          content_snapshot: targetVersion.content_snapshot,
          changed_by: revertedBy,
          change_type: 'revert',
          change_summary: `Reverted to version ${targetVersion.version}`,
          created_at: sql`datetime('now')`,
        })
        .returning();

      // Update content item with snapshot data
      const snapshotData = targetVersion.content_snapshot as any;
      const [updatedContent] = await tx
        .update(fandomContentItems)
        .set({
          content_name: snapshotData.content_name,
          content_slug: snapshotData.content_slug,
          content_data: snapshotData.content_data,
          category: snapshotData.category,
          subcategory: snapshotData.subcategory,
          reviewed_by: revertedBy,
          updated_at: sql`datetime('now')`,
        })
        .where(eq(fandomContentItems.id, contentId))
        .returning();

      return {
        content: updatedContent,
        version: newVersion,
      };
    });
  }

  /**
   * Submit content for approval
   */
  async submitForApproval(data: any): Promise<any> {
    const [newApproval] = await this.db
      .insert(fandomContentApprovals)
      .values({
        ...data,
        approval_status: 'pending',
        approval_level: 1,
        submitted_at: sql`datetime('now')`,
      })
      .returning();

    return newApproval;
  }

  /**
   * Get pending approvals for user/fandom
   */
  async getPendingApprovals(
    options: {
      content_item_id?: number;
      reviewer_id?: string;
      approval_status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ approvals: any[]; total: number }> {
    const {
      content_item_id,
      reviewer_id,
      approval_status = 'pending',
      limit = 50,
      offset = 0,
    } = options;

    // Build where conditions
    const conditions = [
      eq(fandomContentApprovals.approval_status, approval_status),
    ];

    if (content_item_id) {
      conditions.push(
        eq(fandomContentApprovals.content_item_id, content_item_id)
      );
    }
    if (reviewer_id) {
      conditions.push(eq(fandomContentApprovals.reviewer_id, reviewer_id));
    }

    // Get approvals with pagination
    const approvalsQuery = this.db
      .select()
      .from(fandomContentApprovals)
      .where(and(...conditions))
      .orderBy(asc(fandomContentApprovals.submitted_at))
      .limit(limit)
      .offset(offset);

    // Get approvals result and count manually
    const approvalsResult = await approvalsQuery;

    // Get total count by running the same query without pagination
    const allApprovals = await this.db
      .select()
      .from(fandomContentApprovals)
      .where(and(...conditions));

    return {
      approvals: approvalsResult,
      total: allApprovals.length,
    };
  }

  /**
   * Approve content
   */
  async approveContent(
    approvalId: number,
    approvedBy: string,
    notes?: string
  ): Promise<any | null> {
    const [updatedApproval] = await this.db
      .update(fandomContentApprovals)
      .set({
        approval_status: 'approved',
        reviewer_id: approvedBy,
        reviewed_at: sql`datetime('now')`,
        completed_at: sql`datetime('now')`,
        reviewer_notes: notes || null,
      })
      .where(eq(fandomContentApprovals.id, approvalId))
      .returning();

    return updatedApproval || null;
  }

  /**
   * Reject content
   */
  async rejectContent(
    approvalId: number,
    rejectedBy: string,
    reason: string
  ): Promise<any | null> {
    const [updatedApproval] = await this.db
      .update(fandomContentApprovals)
      .set({
        approval_status: 'rejected',
        reviewer_id: rejectedBy,
        reviewed_at: sql`datetime('now')`,
        completed_at: sql`datetime('now')`,
        rejection_reasons: JSON.stringify([reason]),
      })
      .where(eq(fandomContentApprovals.id, approvalId))
      .returning();

    return updatedApproval || null;
  }

  /**
   * Get content statistics by fandom
   */
  async getContentStatsByFandom(fandomId: number): Promise<{
    total_content: number;
    by_type: Record<string, number>;
    by_category: Record<string, number>;
    pending_approvals: number;
    active_content: number;
  }> {
    // Get total content count
    const totalResult = await this.db
      .select()
      .from(fandomContentItems)
      .where(eq(fandomContentItems.fandom_id, fandomId));

    // Get active content count
    const activeResult = await this.db
      .select()
      .from(fandomContentItems)
      .where(
        and(
          eq(fandomContentItems.fandom_id, fandomId),
          eq(fandomContentItems.is_active, true)
        )
      );

    // Get pending approvals count
    const pendingResult = await this.db
      .select()
      .from(fandomContentApprovals)
      .where(eq(fandomContentApprovals.approval_status, 'pending'));

    // Process type and category statistics manually
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    totalResult.forEach(item => {
      // Count by type
      byType[item.content_type] = (byType[item.content_type] || 0) + 1;

      // Count by category
      const category = item.category || 'uncategorized';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return {
      total_content: totalResult.length,
      by_type: byType,
      by_category: byCategory,
      pending_approvals: pendingResult.length,
      active_content: activeResult.length,
    };
  }

  /**
   * Private helper: Generate changes summary
   */
  private generateChangesSummary(
    original: any,
    updates: Partial<any>
  ): string[] {
    const changes: string[] = [];

    if (
      updates.content_name &&
      updates.content_name !== original.content_name
    ) {
      changes.push(
        `Changed name from "${original.content_name}" to "${updates.content_name}"`
      );
    }
    if (updates.category && updates.category !== original.category) {
      changes.push(
        `Changed category from "${original.category}" to "${updates.category}"`
      );
    }
    if (updates.subcategory && updates.subcategory !== original.subcategory) {
      changes.push(
        `Changed subcategory from "${original.subcategory}" to "${updates.subcategory}"`
      );
    }
    if (updates.content_data) {
      changes.push('Updated content data');
    }

    return changes.length > 0 ? changes : ['Content updated'];
  }
}
