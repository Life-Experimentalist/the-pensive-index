/**
 * Content Management Service
 *
 * Orchestrates content lifecycle management including creation, updates,
 * versioning, approval workflows, and bulk operations.
 *
 * @package the-pensive-index
 */

import { ContentQueries } from '@/lib/database/content-queries';
import { ApprovalQueries } from '@/lib/database/approval-queries';
import { FandomQueries } from '@/lib/database/fandom-queries';
import type { ContentVersion, ContentApproval, BulkOperation } from '@/types';

export interface ContentManagementOptions {
  // Content identification
  fandom_id: number;
  content_type: string;
  content_name: string;
  content_slug?: string;

  // Content data
  content_data: any;
  category?: string;
  subcategory?: string;

  // Workflow options
  require_approval?: boolean;
  auto_version?: boolean;

  // User information
  created_by: string;
}

export interface ContentUpdateOptions {
  content_name?: string;
  content_data?: any;
  category?: string;
  subcategory?: string;

  // Versioning
  create_version?: boolean;
  version_notes?: string;

  // User information
  updated_by: string;
}

export interface BulkContentOperation {
  operation: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  items: any[];
  options?: Record<string, any>;
  performed_by: string;
}

export class ContentManagementService {
  private contentQueries: ContentQueries;
  private approvalQueries: ApprovalQueries;
  private fandomQueries: FandomQueries;

  constructor() {
    this.contentQueries = new ContentQueries();
    this.approvalQueries = new ApprovalQueries();
    this.fandomQueries = new FandomQueries();
  }

  /**
   * Create new content item
   */
  async createContent(options: ContentManagementOptions): Promise<{
    content: any;
    version?: any;
    approval?: any;
    validation_results: {
      is_valid: boolean;
      errors: string[];
      warnings: string[];
    };
  }> {
    // Validate content creation options
    const validation = await this.validateContentOptions(options);
    if (!validation.is_valid) {
      return {
        content: null,
        validation_results: validation,
      };
    }

    try {
      // Generate slug if not provided
      const contentSlug =
        options.content_slug || this.generateSlug(options.content_name);

      // Create content item
      const content = await this.contentQueries.createContentItem({
        fandom_id: options.fandom_id,
        content_type: options.content_type,
        content_name: options.content_name,
        content_slug: contentSlug,
        content_data: options.content_data,
        category: options.category,
        subcategory: options.subcategory,
        submitted_by: options.created_by,
        status: options.require_approval ? 'pending' : 'approved',
      });

      // Create initial version if auto-versioning is enabled
      let version = null;
      if (options.auto_version) {
        version = await this.contentQueries.createContentVersion({
          content_item_id: content.id,
          version: '1.0.0',
          content_snapshot: content,
          changed_by: options.created_by,
          change_type: 'create',
          change_summary: 'Initial content creation',
        });
      }

      // Submit for approval if required
      let approval = null;
      if (options.require_approval) {
        approval = await this.approvalQueries.createApprovalRequest({
          content_item_id: content.id,
          approval_status: 'pending',
          priority: 'normal',
        });
      }

      return {
        content,
        version,
        approval,
        validation_results: {
          is_valid: true,
          errors: [],
          warnings: validation.warnings,
        },
      };
    } catch (error) {
      return {
        content: null,
        validation_results: {
          is_valid: false,
          errors: [`Content creation failed: ${error}`],
          warnings: [],
        },
      };
    }
  }

  /**
   * Update existing content item
   */
  async updateContent(
    contentId: number,
    options: ContentUpdateOptions
  ): Promise<{
    content: any;
    version?: any;
    validation_results: {
      is_valid: boolean;
      errors: string[];
      warnings: string[];
    };
  }> {
    try {
      // Get existing content
      const existingContent = await this.contentQueries.getContentItemById(
        contentId
      );
      if (!existingContent) {
        return {
          content: null,
          validation_results: {
            is_valid: false,
            errors: ['Content not found'],
            warnings: [],
          },
        };
      }

      // Prepare updates
      const updates: any = {};
      if (options.content_name) updates.content_name = options.content_name;
      if (options.content_data) updates.content_data = options.content_data;
      if (options.category) updates.category = options.category;
      if (options.subcategory) updates.subcategory = options.subcategory;
      updates.reviewed_by = options.updated_by;

      // Update content with optional versioning
      const content = await this.contentQueries.updateContentItem(
        contentId,
        updates,
        options.create_version || false
      );

      // Create explicit version if requested with notes
      let version = null;
      if (options.create_version && options.version_notes) {
        version = await this.contentQueries.createContentVersion({
          content_item_id: contentId,
          version: `${Date.now()}`,
          content_snapshot: content,
          changed_by: options.updated_by,
          change_type: 'update',
          change_summary: options.version_notes,
        });
      }

      return {
        content,
        version,
        validation_results: {
          is_valid: true,
          errors: [],
          warnings: [],
        },
      };
    } catch (error) {
      return {
        content: null,
        validation_results: {
          is_valid: false,
          errors: [`Content update failed: ${error}`],
          warnings: [],
        },
      };
    }
  }

  /**
   * Delete content item (soft delete)
   */
  async deleteContent(
    contentId: number,
    deletedBy: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if content exists
      const content = await this.contentQueries.getContentItemById(contentId);
      if (!content) {
        return {
          success: false,
          message: 'Content not found',
        };
      }

      // Soft delete (deactivate)
      const success = await this.contentQueries.deactivateContentItem(
        contentId
      );

      if (success) {
        // Create version record for deletion
        await this.contentQueries.createContentVersion({
          content_item_id: contentId,
          version: `deleted-${Date.now()}`,
          content_snapshot: content,
          changed_by: deletedBy,
          change_type: 'delete',
          change_summary: 'Content deleted',
        });

        return {
          success: true,
          message: 'Content successfully deleted',
        };
      } else {
        return {
          success: false,
          message: 'Failed to delete content',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Deletion failed: ${error}`,
      };
    }
  }

  /**
   * Get content with version history
   */
  async getContentWithHistory(contentId: number): Promise<{
    content: any;
    versions: any[];
    current_approval?: any;
  }> {
    // Get content
    const content = await this.contentQueries.getContentItemById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    // Get version history
    const versions = await this.contentQueries.getContentVersionHistory(
      contentId
    );

    // Get current approval if pending
    const approvals = await this.approvalQueries.getPendingApprovals({
      content_item_id: contentId,
      approval_status: 'pending',
      limit: 1,
    });

    return {
      content,
      versions,
      current_approval: approvals.approvals[0] || null,
    };
  }

  /**
   * Revert content to previous version
   */
  async revertContent(
    contentId: number,
    versionId: number,
    revertedBy: string
  ): Promise<{
    success: boolean;
    content?: any;
    version?: any;
    message: string;
  }> {
    try {
      const result = await this.contentQueries.revertContentToVersion(
        contentId,
        versionId,
        revertedBy
      );

      if (result) {
        return {
          success: true,
          content: result.content,
          version: result.version,
          message: 'Content successfully reverted',
        };
      } else {
        return {
          success: false,
          message: 'Failed to revert content',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Revert failed: ${error}`,
      };
    }
  }

  /**
   * Bulk content operations
   */
  async performBulkOperation(operation: BulkContentOperation): Promise<{
    success: number;
    failed: number;
    errors: string[];
    results: any[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      results: [] as any[],
    };

    for (const item of operation.items) {
      try {
        let result;

        switch (operation.operation) {
          case 'create':
            result = await this.createContent({
              ...item,
              created_by: operation.performed_by,
              ...operation.options,
            });
            if (result.validation_results.is_valid) {
              results.success++;
              results.results.push(result.content);
            } else {
              results.failed++;
              results.errors.push(
                `Create failed for ${
                  item.content_name
                }: ${result.validation_results.errors.join(', ')}`
              );
            }
            break;

          case 'update':
            result = await this.updateContent(item.id, {
              ...item,
              updated_by: operation.performed_by,
              ...operation.options,
            });
            if (result.validation_results.is_valid) {
              results.success++;
              results.results.push(result.content);
            } else {
              results.failed++;
              results.errors.push(
                `Update failed for ${
                  item.id
                }: ${result.validation_results.errors.join(', ')}`
              );
            }
            break;

          case 'delete':
            result = await this.deleteContent(item.id, operation.performed_by);
            if (result.success) {
              results.success++;
              results.results.push({ id: item.id, deleted: true });
            } else {
              results.failed++;
              results.errors.push(
                `Delete failed for ${item.id}: ${result.message}`
              );
            }
            break;

          case 'approve':
            // This would require approval ID, simplified for now
            results.failed++;
            results.errors.push('Bulk approve not implemented in this context');
            break;

          case 'reject':
            // This would require approval ID, simplified for now
            results.failed++;
            results.errors.push('Bulk reject not implemented in this context');
            break;

          default:
            results.failed++;
            results.errors.push(`Unknown operation: ${operation.operation}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Operation failed for item ${item.id || item.content_name}: ${error}`
        );
      }
    }

    return results;
  }

  /**
   * Search content within fandom
   */
  async searchContent(
    fandomId: number,
    searchQuery: string,
    filters: {
      content_type?: string;
      category?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    content: any[];
    total: number;
    search_query: string;
  }> {
    const result = await this.contentQueries.getContentByFandom(fandomId, {
      content_type: filters.content_type,
      category: filters.category,
      search: searchQuery,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return {
      content: result.content,
      total: result.total,
      search_query: searchQuery,
    };
  }

  /**
   * Get content statistics for fandom
   */
  async getContentStatistics(fandomId: number): Promise<{
    total_content: number;
    by_type: Record<string, number>;
    by_category: Record<string, number>;
    by_status: Record<string, number>;
    pending_approvals: number;
    recent_activity: any[];
  }> {
    // Get basic stats
    const stats = await this.contentQueries.getContentStatsByFandom(fandomId);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentContent = await this.contentQueries.getContentByFandom(
      fandomId,
      {
        limit: 50,
      }
    );

    const recentActivity = recentContent.content
      .filter(item => new Date(item.created_at) > sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);

    // Process status statistics
    const byStatus: Record<string, number> = {};
    recentContent.content.forEach(item => {
      const status = item.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
      total_content: stats.total_content,
      by_type: stats.by_type,
      by_category: stats.by_category,
      by_status: byStatus,
      pending_approvals: stats.pending_approvals,
      recent_activity: recentActivity,
    };
  }

  /**
   * Validate content creation options
   */
  private async validateContentOptions(
    options: ContentManagementOptions
  ): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!options.content_name || options.content_name.trim() === '') {
      errors.push('Content name is required');
    }

    if (!options.content_type || options.content_type.trim() === '') {
      errors.push('Content type is required');
    }

    if (!options.fandom_id || options.fandom_id <= 0) {
      errors.push('Valid fandom ID is required');
    }

    if (!options.created_by || options.created_by.trim() === '') {
      errors.push('Creator ID is required');
    }

    // Validate fandom exists
    if (options.fandom_id) {
      const fandom = await this.fandomQueries.getFandomById(
        options.fandom_id.toString()
      );
      if (!fandom) {
        errors.push('Specified fandom does not exist');
      }
    }

    // Validate content type
    const validContentTypes = [
      'tag',
      'plot_block',
      'character',
      'validation_rule',
    ];
    if (
      options.content_type &&
      !validContentTypes.includes(options.content_type)
    ) {
      warnings.push(
        `Content type '${
          options.content_type
        }' is not standard. Valid types: ${validContentTypes.join(', ')}`
      );
    }

    // Validate content_data structure
    if (!options.content_data || typeof options.content_data !== 'object') {
      errors.push('Content data must be a valid object');
    }

    // Check for duplicate slug within fandom
    if (options.content_slug) {
      // This would require a more complex query to check slug uniqueness within fandom
      // For now, we'll just validate the slug format
      if (!/^[a-z0-9-]+$/.test(options.content_slug)) {
        errors.push(
          'Content slug must contain only lowercase letters, numbers, and hyphens'
        );
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Get content approval workflow status
   */
  async getContentApprovalStatus(contentId: number): Promise<{
    current_status: string;
    approval_history: any[];
    pending_approvals: any[];
    can_approve: boolean;
  }> {
    const content = await this.contentQueries.getContentItemById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    // Get all approvals for this content
    const allApprovals = await this.approvalQueries.listApprovalRequests({
      content_item_id: contentId,
      limit: 100,
    });

    // Separate pending from completed
    const pending = allApprovals.approvals.filter(
      a => a.approval_status === 'pending'
    );
    const history = allApprovals.approvals.filter(
      a => a.approval_status !== 'pending'
    );

    return {
      current_status: content.status || 'unknown',
      approval_history: history,
      pending_approvals: pending,
      can_approve: pending.length > 0,
    };
  }
}
