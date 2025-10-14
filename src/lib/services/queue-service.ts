/**
 * Moderation Queue Service
 *
 * This service manages the moderation queue workflow for story submissions.
 * It handles queue entry creation, assignment logic, priority calculation,
 * moderator workload balancing, and SLA deadline tracking.
 */

import { getDatabase } from '../database';
import { getResultChanges } from '../database/db-compatibility';
import {
  submissionQueue,
  storySubmissions,
} from '../database/schemas/submissions';
import {
  QueuePriority,
  QueueComplexity,
  SubmissionStatus,
} from '../../types/submission';
import { eq, and, isNull, desc, asc, sql, count, avg } from 'drizzle-orm';

interface QueueEntry {
  id: string;
  submissionId: string;
  assignedModeratorId: string | null;
  priority: QueuePriority;
  complexity: QueueComplexity;
  estimatedReviewTime: number | null;
  queuedAt: Date;
  assignedAt: Date | null;
  deadline: Date | null;
}

interface CreateQueueEntryParams {
  submissionId: string;
  priority?: QueuePriority;
  complexity?: QueueComplexity;
}

interface ModeratorWorkload {
  moderatorId: string;
  assignedCount: number;
  averageReviewTime: number;
  overdueCount: number;
  totalEstimatedTime: number;
}

interface QueueFilters {
  assignedModeratorId?: string;
  priority?: QueuePriority;
  complexity?: QueueComplexity;
  unassignedOnly?: boolean;
  overdueOnly?: boolean;
  fandomId?: string;
}

interface QueueAssignmentResult {
  success: boolean;
  queueEntryId?: string;
  assignedModeratorId?: string;
  estimatedReviewTime?: number;
  deadline?: Date;
  error?: string;
}

export class QueueService {
  // Configuration constants
  private static readonly COMPLEXITY_REVIEW_TIMES = {
    [QueueComplexity.SIMPLE]: 15, // 15 minutes
    [QueueComplexity.MEDIUM]: 30, // 30 minutes
    [QueueComplexity.COMPLEX]: 60, // 60 minutes
  };

  private static readonly PRIORITY_SLA_HOURS = {
    [QueuePriority.URGENT]: 4, // 4 hours
    [QueuePriority.HIGH]: 24, // 24 hours
    [QueuePriority.NORMAL]: 72, // 72 hours
    [QueuePriority.LOW]: 168, // 1 week
  };

  private static readonly MAX_CONCURRENT_ASSIGNMENTS = 10;
  private static readonly WORKLOAD_BALANCE_THRESHOLD = 3;

  /**
   * Create a new queue entry for a submission
   */
  async createQueueEntry(params: CreateQueueEntryParams): Promise<QueueEntry> {
    const db = await getDatabase();
    const {
      submissionId,
      priority = QueuePriority.NORMAL,
      complexity = QueueComplexity.MEDIUM,
    } = params;

    // Verify submission exists and is pending
    const submission = await db
      .select()
      .from(storySubmissions)
      .where(eq(storySubmissions.id, submissionId))
      .limit(1);

    if (!submission.length) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    if (submission[0].status !== SubmissionStatus.PENDING) {
      throw new Error(`Submission ${submissionId} is not in pending status`);
    }

    // Check if already in queue
    const existingEntry = await db
      .select()
      .from(submissionQueue)
      .where(eq(submissionQueue.submissionId, submissionId))
      .limit(1);

    if (existingEntry.length > 0) {
      throw new Error(
        `Submission ${submissionId} is already in moderation queue`
      );
    }

    // Calculate complexity based on tags if not provided
    const calculatedComplexity = this.calculateComplexity(
      submission[0].tags || []
    );
    const finalComplexity =
      complexity !== QueueComplexity.MEDIUM ? complexity : calculatedComplexity;

    // Calculate estimated review time and deadline
    const estimatedReviewTime =
      QueueService.COMPLEXITY_REVIEW_TIMES[finalComplexity];
    const slaHours = QueueService.PRIORITY_SLA_HOURS[priority];
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + slaHours);

    // Create queue entry
    const [queueEntry] = await db
      .insert(submissionQueue)
      .values({
        submissionId,
        priority,
        complexity: finalComplexity,
        estimatedReviewTime,
        deadline,
        queuedAt: new Date(),
      })
      .returning();

    return this.mapToQueueEntry(queueEntry);
  }

  /**
   * Get queue entry by ID
   */
  async getQueueEntry(id: string): Promise<QueueEntry | null> {
    const db = await getDatabase();
    const [entry] = await db
      .select()
      .from(submissionQueue)
      .where(eq(submissionQueue.id, id))
      .limit(1);

    return entry ? this.mapToQueueEntry(entry) : null;
  }

  /**
   * Get queue entries with filtering and pagination
   */
  async getQueueEntries(
    filters: QueueFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ entries: QueueEntry[]; total: number }> {
    const db = await getDatabase();
    const {
      assignedModeratorId,
      priority,
      complexity,
      unassignedOnly,
      overdueOnly,
    } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (assignedModeratorId) {
      conditions.push(
        eq(submissionQueue.assignedModeratorId, assignedModeratorId)
      );
    }

    if (priority) {
      conditions.push(eq(submissionQueue.priority, priority));
    }

    if (complexity) {
      conditions.push(eq(submissionQueue.complexity, complexity));
    }

    if (unassignedOnly) {
      conditions.push(isNull(submissionQueue.assignedModeratorId));
    }

    if (overdueOnly) {
      conditions.push(sql`${submissionQueue.deadline} < ${new Date()}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countQuery = await db
      .select()
      .from(submissionQueue)
      .where(whereClause);
    const total = countQuery.length;

    // Get paginated results
    const entries = await db
      .select()
      .from(submissionQueue)
      .where(whereClause)
      .orderBy(desc(submissionQueue.priority), asc(submissionQueue.queuedAt))
      .limit(limit)
      .offset(offset);

    return {
      entries: entries.map((entry: any) => this.mapToQueueEntry(entry)),
      total,
    };
  }

  /**
   * Assign a queue entry to a moderator
   */
  async assignToModerator(
    queueEntryId: string,
    moderatorId: string
  ): Promise<QueueAssignmentResult> {
    try {
      const db = await getDatabase();

      // Check if entry exists and is unassigned
      const [entry] = await db
        .select()
        .from(submissionQueue)
        .where(eq(submissionQueue.id, queueEntryId))
        .limit(1);

      if (!entry) {
        return { success: false, error: 'Queue entry not found' };
      }

      if (entry.assignedModeratorId) {
        return { success: false, error: 'Queue entry is already assigned' };
      }

      // Check moderator workload
      const workload = await this.getModeratorWorkload(moderatorId);
      if (workload.assignedCount >= QueueService.MAX_CONCURRENT_ASSIGNMENTS) {
        return {
          success: false,
          error: 'Moderator has reached maximum concurrent assignments',
        };
      }

      // Assign to moderator
      const [updatedEntry] = await db
        .update(submissionQueue)
        .set({
          assignedModeratorId: moderatorId,
          assignedAt: new Date(),
        })
        .where(eq(submissionQueue.id, queueEntryId))
        .returning();

      return {
        success: true,
        queueEntryId,
        assignedModeratorId: moderatorId,
        estimatedReviewTime: updatedEntry.estimatedReviewTime ?? undefined,
        deadline: updatedEntry.deadline ?? undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Assignment failed',
      };
    }
  }

  /**
   * Auto-assign queue entries using workload balancing
   */
  async autoAssignQueueEntries(
    moderatorIds: string[],
    maxAssignments = 5
  ): Promise<QueueAssignmentResult[]> {
    const db = await getDatabase();

    // Get unassigned entries ordered by priority and age
    const unassignedEntries = await db
      .select()
      .from(submissionQueue)
      .where(isNull(submissionQueue.assignedModeratorId))
      .orderBy(desc(submissionQueue.priority), asc(submissionQueue.queuedAt))
      .limit(maxAssignments);

    if (unassignedEntries.length === 0) {
      return [];
    }

    // Get current workloads for all moderators
    const workloads = await Promise.all(
      moderatorIds.map(id => this.getModeratorWorkload(id))
    );

    const results: QueueAssignmentResult[] = [];

    for (const entry of unassignedEntries) {
      // Find moderator with lowest workload that can take assignment
      const availableModerator = workloads
        .filter(w => w.assignedCount < QueueService.MAX_CONCURRENT_ASSIGNMENTS)
        .sort((a, b) => a.totalEstimatedTime - b.totalEstimatedTime)[0];

      if (!availableModerator) {
        results.push({ success: false, error: 'No available moderators' });
        continue;
      }

      // Assign to this moderator
      const result = await this.assignToModerator(
        entry.id,
        availableModerator.moderatorId
      );
      results.push(result);

      // Update workload tracking
      if (result.success) {
        availableModerator.assignedCount++;
        availableModerator.totalEstimatedTime += entry.estimatedReviewTime || 0;
      }
    }

    return results;
  }

  /**
   * Get moderator workload statistics
   */
  async getModeratorWorkload(moderatorId: string): Promise<ModeratorWorkload> {
    const db = await getDatabase();

    const assignments = await db
      .select()
      .from(submissionQueue)
      .where(eq(submissionQueue.assignedModeratorId, moderatorId));

    const overdue = await db
      .select()
      .from(submissionQueue)
      .where(
        and(
          eq(submissionQueue.assignedModeratorId, moderatorId),
          sql`${submissionQueue.deadline} < ${new Date()}`
        )
      );

    // Calculate aggregates manually
    const assignedCount = assignments.length;
    const totalEstimatedTime = assignments.reduce(
      (sum, a) => sum + (a.estimatedReviewTime || 0),
      0
    );
    const averageReviewTime =
      assignedCount > 0 ? totalEstimatedTime / assignedCount : 0;
    const overdueCount = overdue.length;

    return {
      moderatorId,
      assignedCount,
      averageReviewTime,
      overdueCount,
      totalEstimatedTime,
    };
  }

  /**
   * Get all moderator workloads for load balancing
   */
  async getAllModeratorWorkloads(
    moderatorIds: string[]
  ): Promise<ModeratorWorkload[]> {
    return Promise.all(moderatorIds.map(id => this.getModeratorWorkload(id)));
  }

  /**
   * Remove entry from queue (when submission is processed)
   */
  async removeFromQueue(queueEntryId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const result = await db
        .delete(submissionQueue)
        .where(eq(submissionQueue.id, queueEntryId));

      return getResultChanges(result) > 0;
    } catch (error) {
      console.error('Failed to remove queue entry:', error);
      return false;
    }
  }

  /**
   * Update queue entry priority
   */
  async updatePriority(
    queueEntryId: string,
    priority: QueuePriority
  ): Promise<boolean> {
    try {
      const db = await getDatabase();

      // Recalculate deadline based on new priority
      const slaHours = QueueService.PRIORITY_SLA_HOURS[priority];
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + slaHours);

      const result = await db
        .update(submissionQueue)
        .set({ priority, deadline })
        .where(eq(submissionQueue.id, queueEntryId));

      return getResultChanges(result) > 0;
    } catch (error) {
      console.error('Failed to update queue priority:', error);
      return false;
    }
  }

  /**
   * Get overdue queue entries for SLA monitoring
   */
  async getOverdueEntries(): Promise<QueueEntry[]> {
    const db = await getDatabase();

    const entries = await db
      .select()
      .from(submissionQueue)
      .where(sql`${submissionQueue.deadline} < ${new Date()}`)
      .orderBy(asc(submissionQueue.deadline));

    return entries.map((entry: any) => this.mapToQueueEntry(entry));
  }

  /**
   * Calculate complexity based on submission tags and content
   */
  private calculateComplexity(tags: string[]): QueueComplexity {
    const tagCount = tags.length;

    // Simple heuristic - can be enhanced with more sophisticated analysis
    if (tagCount <= 5) {
      return QueueComplexity.SIMPLE;
    } else if (tagCount <= 15) {
      return QueueComplexity.MEDIUM;
    } else {
      return QueueComplexity.COMPLEX;
    }
  }

  /**
   * Map database record to QueueEntry interface
   */
  private mapToQueueEntry(record: any): QueueEntry {
    return {
      id: record.id,
      submissionId: record.submissionId,
      assignedModeratorId: record.assignedModeratorId,
      priority: record.priority as QueuePriority,
      complexity: record.complexity as QueueComplexity,
      estimatedReviewTime: record.estimatedReviewTime,
      queuedAt: new Date(record.queuedAt),
      assignedAt: record.assignedAt ? new Date(record.assignedAt) : null,
      deadline: record.deadline ? new Date(record.deadline) : null,
    };
  }

  /**
   * Batch operation support for admin interface
   */
  async batchUpdatePriority(
    queueEntryIds: string[],
    priority: QueuePriority
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of queueEntryIds) {
      const updated = await this.updatePriority(id, priority);
      if (updated) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Batch assignment for multiple entries
   */
  async batchAssignToModerator(
    queueEntryIds: string[],
    moderatorId: string
  ): Promise<QueueAssignmentResult[]> {
    const results: QueueAssignmentResult[] = [];

    for (const id of queueEntryIds) {
      const result = await this.assignToModerator(id, moderatorId);
      results.push(result);
    }

    return results;
  }
}

export const queueService = new QueueService();
