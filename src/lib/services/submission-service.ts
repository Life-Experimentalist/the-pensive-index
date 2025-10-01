/**
 * Story Submission Service
 *
 * Handles all submission-related operations including creation, validation,
 * status transitions, and integration with duplicate detection.
 */

import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { getDatabase } from '@/lib/database';
import {
  storySubmissions,
  submissionQueue,
} from '@/lib/database/schemas/submissions';
import {
  SubmissionStatus,
  CompletionStatus,
  type StorySubmission,
  type NewStorySubmission,
} from '@/types/submission';

export interface CreateSubmissionRequest {
  submitterUserId: string;
  storyUrl: string;
  storyTitle: string;
  authorName: string;
  fandomId: string;
  summary?: string;
  wordCount?: number;
  chapterCount?: number;
  completionStatus?: CompletionStatus;
  publishDate?: Date;
  lastUpdateDate?: Date;
  tags: string[];
  submissionNotes?: string;
}

export interface UpdateSubmissionRequest {
  id: string;
  status?: SubmissionStatus;
  qualityScore?: number;
  duplicateCheckResult?: any;
  reviewedBy?: string;
  rejectionReason?: string;
  githubIssueNumber?: number;
  suggestedTags?: string[];
}

export interface UserUpdateSubmissionRequest {
  id: string;
  summary?: string;
  wordCount?: number;
  chapterCount?: number;
  completionStatus?: CompletionStatus;
  publishDate?: Date;
  lastUpdateDate?: Date;
  tags?: string[];
  submissionNotes?: string;
}

export interface SubmissionQueryFilters {
  submitterUserId?: string;
  fandomId?: string;
  status?: SubmissionStatus[];
  minQualityScore?: number;
  maxQualityScore?: number;
  submittedAfter?: Date;
  submittedBefore?: Date;
  reviewedBy?: string;
}

export interface SubmissionValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SubmissionServiceConfig {
  maxSubmissionsPerUser?: number;
  maxSubmissionsPerDay?: number;
  minTagsRequired?: number;
  maxTagsAllowed?: number;
  enableDuplicateDetection?: boolean;
  enableQualityScoring?: boolean;
}

export class SubmissionService {
  private config: SubmissionServiceConfig;

  constructor(config: SubmissionServiceConfig = {}) {
    this.config = {
      maxSubmissionsPerUser: 10,
      maxSubmissionsPerDay: 50,
      minTagsRequired: 3,
      maxTagsAllowed: 20,
      enableDuplicateDetection: true,
      enableQualityScoring: true,
      ...config,
    };
  }

  /**
   * Create a new story submission
   */
  async createSubmission(
    request: CreateSubmissionRequest
  ): Promise<StorySubmission> {
    const db = await getDatabase();

    // Validate the request
    const validation = await this.validateSubmissionRequest(request);
    if (!validation.isValid) {
      throw new Error(
        `Submission validation failed: ${validation.errors.join(', ')}`
      );
    }

    // Check rate limits
    await this.enforceRateLimits(request.submitterUserId);

    // Normalize and validate URL
    const normalizedUrl = this.normalizeUrl(request.storyUrl);

    // Check for duplicates if enabled
    if (this.config.enableDuplicateDetection) {
      const duplicateCheck = await this.checkForDuplicates(
        normalizedUrl,
        request.storyTitle
      );
      if (duplicateCheck.isDuplicate) {
        throw new Error(`Duplicate story detected: ${duplicateCheck.reason}`);
      }
    }

    // Create the submission record
    const submissionData = {
      submitterUserId: request.submitterUserId,
      storyUrl: normalizedUrl,
      storyTitle: request.storyTitle,
      authorName: request.authorName,
      fandomId: request.fandomId,
      summary: request.summary,
      wordCount: request.wordCount,
      chapterCount: request.chapterCount,
      completionStatus: request.completionStatus ?? CompletionStatus.UNKNOWN,
      publishDate: request.publishDate,
      lastUpdateDate: request.lastUpdateDate,
      tags: request.tags,
      submissionNotes: request.submissionNotes,
      status: SubmissionStatus.PENDING,
      submittedAt: new Date(),
    };

    const [newSubmission] = await db
      .insert(storySubmissions)
      .values(submissionData)
      .returning();

    // Add to moderation queue
    await this.addToModerationQueue(newSubmission.id);

    return newSubmission;
  }

  /**
   * Retrieve submission by ID
   */
  async getSubmission(id: string): Promise<StorySubmission | null> {
    const db = await getDatabase();

    const [submission] = await db
      .select()
      .from(storySubmissions)
      .where(eq(storySubmissions.id, id))
      .limit(1);

    return submission || null;
  }

  /**
   * Update submission status and metadata
   */
  async updateSubmission(
    request: UpdateSubmissionRequest
  ): Promise<StorySubmission> {
    const db = await getDatabase();

    // Validate status transition if status is being updated
    if (request.status) {
      const currentSubmission = await this.getSubmission(request.id);
      if (!currentSubmission) {
        throw new Error('Submission not found');
      }

      const isValidTransition = this.isValidStatusTransition(
        currentSubmission.status,
        request.status
      );

      if (!isValidTransition) {
        throw new Error(
          `Invalid status transition from ${currentSubmission.status} to ${request.status}`
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (request.status !== undefined) {
      updateData.status = request.status;
      if (
        request.status === SubmissionStatus.APPROVED ||
        request.status === SubmissionStatus.REJECTED
      ) {
        updateData.reviewedAt = new Date();
        updateData.reviewedBy = request.reviewedBy;
      }
    }

    if (request.qualityScore !== undefined) {
      updateData.qualityScore = request.qualityScore;
    }
    if (request.duplicateCheckResult !== undefined) {
      updateData.duplicateCheckResult = request.duplicateCheckResult;
    }
    if (request.rejectionReason !== undefined) {
      updateData.rejectionReason = request.rejectionReason;
    }
    if (request.githubIssueNumber !== undefined) {
      updateData.githubIssueNumber = request.githubIssueNumber;
    }
    if (request.suggestedTags !== undefined) {
      updateData.suggestedTags = request.suggestedTags;
    }

    const [updatedSubmission] = await db
      .update(storySubmissions)
      .set(updateData)
      .where(eq(storySubmissions.id, request.id))
      .returning();

    if (!updatedSubmission) {
      throw new Error('Failed to update submission');
    }

    return updatedSubmission;
  }

  /**
   * Update user-editable fields of a submission (only for pending submissions)
   */
  async updateUserSubmission(
    request: UserUpdateSubmissionRequest
  ): Promise<StorySubmission> {
    const db = await getDatabase();

    // Get current submission to validate
    const currentSubmission = await this.getSubmission(request.id);
    if (!currentSubmission) {
      throw new Error('Submission not found');
    }

    // Only allow updates to pending submissions
    if (currentSubmission.status !== SubmissionStatus.PENDING) {
      throw new Error('Can only update pending submissions');
    }

    // Build update data with user-editable fields
    const updateData: Partial<NewStorySubmission> = {};

    if (request.summary !== undefined) {
      updateData.summary = request.summary;
    }
    if (request.wordCount !== undefined) {
      updateData.wordCount = request.wordCount;
    }
    if (request.chapterCount !== undefined) {
      updateData.chapterCount = request.chapterCount;
    }
    if (request.completionStatus !== undefined) {
      updateData.completionStatus = request.completionStatus;
    }
    if (request.publishDate !== undefined) {
      updateData.publishDate = request.publishDate;
    }
    if (request.lastUpdateDate !== undefined) {
      updateData.lastUpdateDate = request.lastUpdateDate;
    }
    if (request.tags !== undefined) {
      updateData.tags = request.tags;
    }
    if (request.submissionNotes !== undefined) {
      updateData.submissionNotes = request.submissionNotes;
    }

    // Update updatedAt timestamp
    updateData.updatedAt = new Date();

    const [updatedSubmission] = await db
      .update(storySubmissions)
      .set(updateData)
      .where(eq(storySubmissions.id, request.id))
      .returning();

    if (!updatedSubmission) {
      throw new Error('Failed to update submission');
    }

    return updatedSubmission;
  }

  /**
   * Get submissions with filtering and pagination
   */
  async getSubmissions(
    filters: SubmissionQueryFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ submissions: StorySubmission[]; total: number }> {
    const db = await getDatabase();
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [];

    if (filters.submitterUserId) {
      conditions.push(
        eq(storySubmissions.submitterUserId, filters.submitterUserId)
      );
    }

    if (filters.fandomId) {
      conditions.push(eq(storySubmissions.fandomId, filters.fandomId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(sql`${storySubmissions.status} IN ${filters.status}`);
    }

    if (filters.minQualityScore !== undefined) {
      conditions.push(
        sql`${storySubmissions.qualityScore} >= ${filters.minQualityScore}`
      );
    }

    if (filters.maxQualityScore !== undefined) {
      conditions.push(
        sql`${storySubmissions.qualityScore} <= ${filters.maxQualityScore}`
      );
    }

    if (filters.submittedAfter) {
      conditions.push(
        sql`${storySubmissions.submittedAt} >= ${filters.submittedAfter}`
      );
    }

    if (filters.submittedBefore) {
      conditions.push(
        sql`${storySubmissions.submittedAt} <= ${filters.submittedBefore}`
      );
    }

    if (filters.reviewedBy) {
      conditions.push(eq(storySubmissions.reviewedBy, filters.reviewedBy));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(storySubmissions)
      .where(whereClause);

    // Get paginated results
    const submissions = await db
      .select()
      .from(storySubmissions)
      .where(whereClause)
      .orderBy(desc(storySubmissions.submittedAt))
      .limit(pageSize)
      .offset(offset);

    return { submissions, total };
  }

  /**
   * Delete a submission (admin only)
   */
  async deleteSubmission(id: string): Promise<void> {
    const db = await getDatabase();

    await db.delete(storySubmissions).where(eq(storySubmissions.id, id));
  }

  // Private helper methods

  /**
   * Validate submission request
   */
  private async validateSubmissionRequest(
    request: CreateSubmissionRequest
  ): Promise<SubmissionValidationResult> {
    const errors: string[] = [];

    // URL validation
    if (!this.isValidUrl(request.storyUrl)) {
      errors.push('Invalid story URL');
    }

    // Required fields
    if (!request.storyTitle?.trim()) {
      errors.push('Story title is required');
    }

    if (!request.authorName?.trim()) {
      errors.push('Author name is required');
    }

    if (!request.fandomId?.trim()) {
      errors.push('Fandom ID is required');
    }

    // Tag validation
    const minTags = this.config.minTagsRequired ?? 3;
    const maxTags = this.config.maxTagsAllowed ?? 20;

    if (!request.tags || request.tags.length < minTags) {
      errors.push(`At least ${minTags} tags are required`);
    }

    if (request.tags && request.tags.length > maxTags) {
      errors.push(`Maximum ${maxTags} tags allowed`);
    }

    // Validate fandom exists
    const db = await getDatabase();
    const [fandom] = await db
      .select()
      .from(sql`fandoms`)
      .where(sql`id = ${request.fandomId}`)
      .limit(1);

    if (!fandom) {
      errors.push('Invalid fandom ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Enforce rate limits for submissions
   */
  private async enforceRateLimits(userId: string): Promise<void> {
    const db = await getDatabase();

    // Check daily submission limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ count: todayCount }] = await db
      .select({ count: count() })
      .from(storySubmissions)
      .where(
        and(
          eq(storySubmissions.submitterUserId, userId),
          sql`${storySubmissions.submittedAt} >= ${today}`
        )
      );

    const dailyLimit = this.config.maxSubmissionsPerDay ?? 50;
    if (todayCount >= dailyLimit) {
      throw new Error(`Daily submission limit of ${dailyLimit} reached`);
    }

    // Check total submission limit per user
    const totalCountResult = await db
      .select()
      .from(storySubmissions)
      .where(eq(storySubmissions.submitterUserId, userId));

    const totalCount = totalCountResult.length;

    const userLimit = this.config.maxSubmissionsPerUser ?? 10;
    if (totalCount >= userLimit) {
      throw new Error(`User submission limit of ${userLimit} reached`);
    }
  }

  /**
   * Normalize URL for consistent storage and comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove common tracking parameters
      const paramsToRemove = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'ref',
        'fbclid',
      ];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));

      // Normalize common fanfiction sites
      if (urlObj.hostname.includes('archiveofourown.org')) {
        // Remove chapter parameters for AO3
        urlObj.searchParams.delete('chapter');
        urlObj.searchParams.delete('view_adult');
      } else if (urlObj.hostname.includes('fanfiction.net')) {
        // Normalize FFN URLs
        urlObj.searchParams.delete('chapter');
      }

      return urlObj.toString();
    } catch (e) {
      return url; // Return original if parsing fails
    }
  }

  /**
   * Check for duplicate submissions
   */
  private async checkForDuplicates(
    url: string,
    title: string
  ): Promise<{ isDuplicate: boolean; reason?: string }> {
    const db = await getDatabase();

    // Check for exact URL match
    const [urlMatch] = await db
      .select()
      .from(storySubmissions)
      .where(eq(storySubmissions.storyUrl, url))
      .limit(1);

    if (urlMatch) {
      return { isDuplicate: true, reason: 'URL already exists' };
    }

    // Check for similar titles (basic implementation)
    // In a real implementation, this would use fuzzy matching
    const similarTitles = await db
      .select()
      .from(storySubmissions)
      .where(sql`LOWER(${storySubmissions.storyTitle}) = LOWER(${title})`);

    if (similarTitles.length > 0) {
      return { isDuplicate: true, reason: 'Similar title found' };
    }

    return { isDuplicate: false };
  }

  /**
   * Add submission to moderation queue
   */
  private async addToModerationQueue(submissionId: string): Promise<void> {
    const db = await getDatabase();

    await db.insert(submissionQueue).values({
      submissionId,
      priority: 'normal',
      complexity: 'medium',
      estimatedReviewTime: 30, // 30 minutes default
      queuedAt: new Date(),
    });
  }

  /**
   * Validate status transitions
   */
  private isValidStatusTransition(
    currentStatus: SubmissionStatus,
    newStatus: SubmissionStatus
  ): boolean {
    const validTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      [SubmissionStatus.PENDING]: [
        SubmissionStatus.UNDER_REVIEW,
        SubmissionStatus.REJECTED,
      ],
      [SubmissionStatus.UNDER_REVIEW]: [
        SubmissionStatus.APPROVED,
        SubmissionStatus.REJECTED,
        SubmissionStatus.PENDING,
      ],
      [SubmissionStatus.APPROVED]: [SubmissionStatus.REJECTED], // Can be reverted
      [SubmissionStatus.REJECTED]: [SubmissionStatus.UNDER_REVIEW], // Can be reconsidered
      [SubmissionStatus.DUPLICATE]: [], // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const submissionService = new SubmissionService();
