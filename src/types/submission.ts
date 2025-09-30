/**
 * TypeScript Type Definitions for Community Submission System
 *
 * This module provides comprehensive TypeScript types for the community-driven
 * story submission system, including API request/response types, browser extension
 * message types, and shared interfaces.
 */

// Re-export database types for convenience
export type {
  StorySubmission,
  NewStorySubmission,
  SubmissionQueue,
  NewSubmissionQueue,
  BrowserExtensionState,
  NewBrowserExtensionState,
  WebsiteExtractor as WebsiteExtractorDB,
  NewWebsiteExtractor as NewWebsiteExtractorDB,
  ModerationAction,
  NewModerationAction,
  DuplicateDetectionResult,
  NewDuplicateDetectionResult,
} from '../lib/database/schemas/submissions';

// Enums for submission system
export enum SubmissionStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under-review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
}

export enum QueuePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum QueueComplexity {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
}

export enum CompletionStatus {
  COMPLETE = 'complete',
  IN_PROGRESS = 'in-progress',
  ABANDONED = 'abandoned',
  UNKNOWN = 'unknown',
}

export enum ModerationActionType {
  ASSIGN = 'assign',
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request-changes',
  DUPLICATE_FLAG = 'duplicate-flag',
}

export enum RejectionReason {
  DUPLICATE = 'duplicate',
  LOW_QUALITY = 'low-quality',
  INAPPROPRIATE_CONTENT = 'inappropriate-content',
  INVALID_URL = 'invalid-url',
  WRONG_FANDOM = 'wrong-fandom',
}

// API Request/Response Types (from story-submission-api.yaml)

export interface CreateSubmissionRequest {
  storyUrl: string;
  storyTitle: string;
  authorName: string;
  fandomId: string;
  summary?: string;
  wordCount?: number;
  chapterCount?: number;
  completionStatus?: CompletionStatus;
  publishDate?: string; // ISO date string
  lastUpdateDate?: string; // ISO date string
  tags: string[]; // minimum 3, maximum 20
  submissionNotes?: string;
}

export interface UpdateSubmissionRequest {
  storyTitle?: string;
  authorName?: string;
  fandomId?: string;
  summary?: string;
  wordCount?: number;
  chapterCount?: number;
  completionStatus?: CompletionStatus;
  publishDate?: string;
  lastUpdateDate?: string;
  tags?: string[];
  submissionNotes?: string;
}

export interface SubmissionResponse {
  id: string;
  status: SubmissionStatus;
  githubIssueNumber?: number;
  qualityScore?: number;
  submittedAt: string; // ISO date-time string
  reviewedAt?: string; // ISO date-time string
  moderatorComments?: string;
  storyData: CreateSubmissionRequest;
}

export interface SubmissionHistoryResponse {
  submissions: SubmissionResponse[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ExtractedMetadata {
  title: string;
  author: string;
  summary: string;
  wordCount?: number;
  chapterCount?: number;
  completionStatus?: CompletionStatus;
  publishDate?: string;
  lastUpdateDate?: string;
  suggestedFandom?: string;
  suggestedTags?: string[];
  extractorUsed: string;
  confidence: number; // 0-1
}

export interface TagSuggestionsResponse {
  suggestions: Array<{
    tag: string;
    confidence: number; // 0-1
    category: string;
    reasoning: string;
  }>;
  fandomTaxonomy: Array<{
    category: string;
    tags: string[];
  }>;
}

export interface ModerationReviewRequest {
  decision: 'approve' | 'reject' | 'request-changes';
  comments?: string;
  suggestedChanges?: {
    tags?: string[];
    fandom?: string;
    metadata?: Record<string, any>;
  };
  rejectionReason?: RejectionReason;
}

export interface ModerationQueueResponse {
  queueEntries: Array<{
    id: string;
    submission: SubmissionResponse;
    priority: QueuePriority;
    complexity: QueueComplexity;
    estimatedReviewTime?: number; // minutes
    queuedAt: string;
    assignedTo?: string;
  }>;
  statistics: {
    total: number;
    assigned: number;
    unassigned: number;
    avgWaitTime?: number; // minutes
  };
}

// API Error Types

export interface APIError {
  error: string;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

export interface ValidationError extends APIError {
  details: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface DuplicateError extends APIError {
  existingSubmissions: Array<{
    id: string;
    title: string;
    url: string;
    similarity: number;
    status: SubmissionStatus;
  }>;
}

export interface RateLimitError extends APIError {
  retryAfter: number; // seconds
  limit: number; // daily limit
}

// Browser Extension Types (from browser-extension-api.md)

export interface ExtractMetadataMessage {
  type: 'EXTRACT_METADATA';
  extractorId: string;
  config?: ExtractorConfig;
}

export interface MetadataExtractedMessage {
  type: 'METADATA_EXTRACTED';
  success: boolean;
  data?: StoryMetadata;
  error?: string;
}

export interface StoryMetadata {
  title: string;
  author: string;
  summary: string;
  url: string;
  wordCount?: number;
  chapterCount?: number;
  completionStatus?: CompletionStatus;
  publishDate?: Date;
  lastUpdateDate?: Date;
  language?: string;
  rating?: string;
  warnings?: string[];
  relationships?: string[];
  characters?: string[];
  additionalTags?: string[];
  series?: {
    name: string;
    part: number;
  };
}

export interface WebsiteExtractor {
  readonly id: string;
  readonly name: string;
  readonly urlPatterns: RegExp[];
  canExtract(): boolean;
  extract(): Promise<StoryMetadata>;
  validate?(metadata: StoryMetadata): ValidationResult;
  getConfigUI?(): ConfigUIDefinition;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigUIDefinition {
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    label: string;
    description?: string;
    required?: boolean;
    options?: string[]; // for select type
  }>;
}

export interface ExtractorConfig {
  [key: string]: any;
}

// Offline Submission Queue Types

export interface OfflineSubmission {
  tempId: string;
  submissionData: CreateSubmissionRequest;
  timestamp: Date;
  retryCount: number;
}

export interface SyncRequest {
  submissions: OfflineSubmission[];
  lastSyncTimestamp: Date;
}

export interface SyncResponse {
  processed: Array<{
    tempId: string;
    success: boolean;
    submissionId?: string;
    error?: string;
  }>;
  serverTimestamp: Date;
}

// GitHub Integration Types

export interface GitHubIssueData {
  issueNumber: number;
  issueUrl: string;
  issueId: number;
  state: 'open' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  labels: string[];
}

export interface GitHubWebhookPayload {
  action: 'opened' | 'closed' | 'labeled' | 'unlabeled' | 'assigned' | 'edited';
  issueNumber: number;
  issueState: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  sender: string;
  repository: string;
  timestamp: Date;
}

// Email Notification Types

export interface SubmissionConfirmationEmail {
  to: string;
  subject: string;
  template: 'submission-confirmation';
  data: {
    submitterName: string;
    storyTitle: string;
    submissionId: string;
    githubIssueUrl: string;
    estimatedReviewTime: string;
  };
}

export interface ReviewCompletedEmail {
  to: string;
  subject: string;
  template: 'review-completed';
  data: {
    submitterName: string;
    storyTitle: string;
    decision: 'approved' | 'rejected' | 'changes-requested';
    moderatorComments?: string;
    suggestedChanges?: Record<string, any>;
    resubmissionAllowed: boolean;
  };
}

// Extension Error Handling

export interface ExtensionError extends Error {
  code: string;
  recoverable: boolean;
  retryable: boolean;
  userMessage: string;
}

export enum ErrorCodes {
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  SERVER_ERROR = 'SERVER_ERROR',
}

// Quality Scoring Types

export interface QualityMetrics {
  wordCount: number;
  chapterCount: number;
  completionStatus: CompletionStatus;
  lastUpdateRecency: number; // days since last update
  summaryQuality: number; // 0-1 score
  tagAccuracy: number; // 0-1 score
}

export interface QualityScoringConfig {
  wordCountWeight: number;
  chapterCountWeight: number;
  completionWeight: number;
  recencyWeight: number;
  summaryWeight: number;
  tagWeight: number;
  minimumThreshold: number; // 0-100
}

export interface QualityScore {
  overall: number; // 0-100
  breakdown: {
    wordCount: number;
    chapterCount: number;
    completion: number;
    recency: number;
    summary: number;
    tags: number;
  };
  passesThreshold: boolean;
  recommendations: string[];
}

// Duplicate Detection Types

export interface DuplicateCheckConfig {
  urlSimilarityThreshold: number; // 0-1
  titleSimilarityThreshold: number; // 0-1
  overallSimilarityThreshold: number; // 0-1
  enableFuzzyMatching: boolean;
  enableContentAnalysis: boolean;
}

export interface DuplicateCandidate {
  submissionId: string;
  title: string;
  url: string;
  urlSimilarity: number;
  titleSimilarity: number;
  overallSimilarity: number;
  status: SubmissionStatus;
  submittedAt: Date;
}

export interface DuplicateCheckResult {
  hasPotentialDuplicates: boolean;
  candidates: DuplicateCandidate[];
  confidence: number; // 0-1
  algorithmsUsed: string[];
  checkPerformedAt: Date;
}

// Utility Types

export type WithId<T> = T & { id: string };
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type APIResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: APIError;
    };

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};
