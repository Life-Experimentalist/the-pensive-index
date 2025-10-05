# Community Submission System API Endpoints

## Overview

This document provides comprehensive API documentation for The Pensive Index Community Submission System. All endpoints follow RESTful conventions and use JSON for request and response bodies.

## Base URL

```
Production: https://the-pensive-index.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via Clerk. Include the session token in the Authorization header:

```http
Authorization: Bearer <session_token>
```

Admin endpoints require additional permissions verification.

## Rate Limiting

- **Unauthenticated requests**: 100 requests per hour per IP
- **Authenticated requests**: 1000 requests per hour per user
- **Admin requests**: 5000 requests per hour per admin
- **Extension requests**: 200 requests per hour per user

## Error Responses

All endpoints return consistent error responses:

```typescript
interface APIError {
  error: string;           // Human-readable error message
  code?: string;          // Machine-readable error code
  details?: unknown;      // Additional error context
  timestamp: string;      // ISO 8601 timestamp
  requestId: string;      // Unique request identifier
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate submission)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Submission Endpoints

### Create Story Submission

Submit a new story for community review.

```http
POST /api/v1/submissions
```

**Request Body:**

```typescript
interface CreateSubmissionRequest {
  storyTitle: string;              // 1-200 characters
  storyAuthor: string;             // 1-100 characters
  storyUrl: string;                // Valid URL to story
  storyDescription?: string;       // Optional, max 2000 characters
  fandomSlug: string;             // Must exist in system
  tags?: string[];                // Optional story tags
  submitterEmail: string;         // Valid email address
  submitterName?: string;         // Optional submitter name
  extractedMetadata?: {           // Optional pre-extracted data
    wordCount?: number;
    chapterCount?: number;
    completionStatus?: 'complete' | 'in-progress' | 'hiatus';
    language?: string;
    publishedDate?: string;       // ISO 8601 date
    lastUpdated?: string;         // ISO 8601 date
    contentRating?: 'general' | 'teen' | 'mature' | 'explicit';
  };
  submissionSource?: 'extension' | 'web' | 'api';
}
```

**Response:**

```typescript
interface CreateSubmissionResponse {
  success: true;
  submissionId: string;           // Unique submission identifier
  githubIssueNumber: number;      // Associated GitHub issue number
  queuePosition?: number;         // Position in moderation queue
  estimatedReviewTime?: string;   // Estimated review completion time
  duplicateCheckResult?: {
    isDuplicate: boolean;
    confidence: number;           // 0-1 confidence score
    similarSubmissions?: string[]; // IDs of similar submissions
  };
}
```

**Example Request:**

```json
{
  "storyTitle": "The Power He Knows Not",
  "storyAuthor": "Steelbadger",
  "storyUrl": "https://archiveofourown.org/works/394693",
  "storyDescription": "A story about Harry Potter discovering his true power through friendship and sacrifice.",
  "fandomSlug": "harry-potter",
  "tags": ["time-travel", "mentor-hermione", "powerful-harry"],
  "submitterEmail": "reader@example.com",
  "submitterName": "John Smith",
  "extractedMetadata": {
    "wordCount": 150000,
    "chapterCount": 15,
    "completionStatus": "complete",
    "language": "English",
    "contentRating": "teen"
  },
  "submissionSource": "extension"
}
```

**Example Response:**

```json
{
  "success": true,
  "submissionId": "sub_2024_001234",
  "githubIssueNumber": 1234,
  "queuePosition": 5,
  "estimatedReviewTime": "2024-01-15T10:00:00Z",
  "duplicateCheckResult": {
    "isDuplicate": false,
    "confidence": 0.85,
    "similarSubmissions": []
  }
}
```

### Get Submissions History

Retrieve user's submission history.

```http
GET /api/v1/submissions
```

**Query Parameters:**

```typescript
interface SubmissionQueryParams {
  status?: 'pending' | 'approved' | 'rejected' | 'duplicate';
  fandom?: string;              // Fandom slug filter
  limit?: number;               // Max 100, default 25
  offset?: number;              // Pagination offset
  sortBy?: 'created' | 'updated' | 'status';
  sortOrder?: 'asc' | 'desc';   // Default 'desc'
}
```

**Response:**

```typescript
interface SubmissionHistoryResponse {
  submissions: SubmissionSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

interface SubmissionSummary {
  id: string;
  storyTitle: string;
  storyAuthor: string;
  storyUrl: string;
  fandomSlug: string;
  status: SubmissionStatus;
  submissionDate: string;       // ISO 8601 timestamp
  lastUpdated: string;          // ISO 8601 timestamp
  githubIssueNumber?: number;
  queuePosition?: number;
  reviewCompletedDate?: string; // ISO 8601 timestamp
}
```

### Get Submission Details

Retrieve detailed information about a specific submission.

```http
GET /api/v1/submissions/{id}
```

**Response:**

```typescript
interface SubmissionDetailsResponse {
  submission: {
    id: string;
    storyTitle: string;
    storyAuthor: string;
    storyUrl: string;
    storyDescription?: string;
    fandomSlug: string;
    tags: string[];
    status: SubmissionStatus;
    submitterEmail: string;
    submitterName?: string;
    submissionDate: string;
    lastUpdated: string;
    githubIssueNumber?: number;
    extractedMetadata?: ExtractedMetadata;
    moderationHistory: ModerationAction[];
    duplicateCheckResult?: DuplicateCheckResult;
    qualityScore?: QualityScore;
  };
  relatedSubmissions?: SubmissionSummary[];
}

interface ModerationAction {
  id: string;
  action: 'assigned' | 'approved' | 'rejected' | 'flagged' | 'commented';
  moderatorId: string;
  moderatorName: string;
  timestamp: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}
```

### Update Submission

Update submission details (limited fields for submitters).

```http
PATCH /api/v1/submissions/{id}
```

**Request Body:**

```typescript
interface UpdateSubmissionRequest {
  storyDescription?: string;     // Update description
  tags?: string[];              // Update tags
  extractedMetadata?: Partial<ExtractedMetadata>;
}
```

**Response:**

```typescript
interface UpdateSubmissionResponse {
  success: true;
  submission: SubmissionSummary;
  githubIssueUpdated: boolean;
}
```

---

## Admin Moderation Endpoints

### Get Moderation Queue

Retrieve submissions awaiting moderation (Admin only).

```http
GET /api/v1/admin/submissions/queue
```

**Query Parameters:**

```typescript
interface QueueQueryParams {
  status?: 'pending' | 'assigned' | 'escalated';
  fandom?: string;              // Filter by fandom
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  complexity?: 'simple' | 'moderate' | 'complex';
  assignedModerator?: string;   // Filter by moderator ID
  submissionDateFrom?: string;  // ISO 8601 date
  submissionDateTo?: string;    // ISO 8601 date
  limit?: number;               // Max 100, default 25
  offset?: number;              // Pagination offset
  sortBy?: 'priority' | 'complexity' | 'submissionDate' | 'queuePosition';
  sortOrder?: 'asc' | 'desc';
}
```

**Response:**

```typescript
interface ModerationQueueResponse {
  submissions: QueueSubmission[];
  statistics: {
    totalPending: number;
    totalAssigned: number;
    averageReviewTime: number;   // Hours
    oldestSubmission: string;    // ISO 8601 timestamp
  };
  moderatorWorkload: {
    [moderatorId: string]: {
      assigned: number;
      completed24h: number;
      averageReviewTime: number;
    };
  };
  pagination: PaginationInfo;
}

interface QueueSubmission extends SubmissionSummary {
  priority: QueuePriority;
  complexity: QueueComplexity;
  queuePosition: number;
  assignedModerator?: {
    id: string;
    name: string;
    email: string;
  };
  slaDeadline?: string;         // ISO 8601 timestamp
  qualityScore?: number;        // 0-100 score
  duplicateRisk?: number;       // 0-1 risk score
}
```

### Assign Submission

Assign submission to moderator (Admin only).

```http
POST /api/v1/admin/submissions/{id}/assign
```

**Request Body:**

```typescript
interface AssignSubmissionRequest {
  moderatorId: string;          // Target moderator ID
  priority?: QueuePriority;     // Optionally update priority
  complexity?: QueueComplexity; // Optionally update complexity
  comment?: string;             // Assignment note
}
```

**Response:**

```typescript
interface AssignSubmissionResponse {
  success: true;
  assignment: {
    submissionId: string;
    moderatorId: string;
    moderatorName: string;
    assignedAt: string;         // ISO 8601 timestamp
    slaDeadline: string;        // ISO 8601 timestamp
    queuePosition: number;
  };
  githubIssueUpdated: boolean;
  emailNotificationSent: boolean;
}
```

### Review Submission

Approve or reject submission (Moderator only).

```http
POST /api/v1/admin/submissions/{id}/review
```

**Request Body:**

```typescript
interface ReviewSubmissionRequest {
  action: 'approve' | 'reject' | 'flag';
  comment?: string;             // Review feedback
  tags?: string[];             // Final tags (for approval)
  qualityOverride?: number;    // Override quality score (0-100)
  adminNotes?: string;         // Internal admin notes
  notifySubmitter?: boolean;   // Send email notification (default true)
}
```

**Response:**

```typescript
interface ReviewSubmissionResponse {
  success: true;
  review: {
    submissionId: string;
    action: string;
    reviewerId: string;
    reviewerName: string;
    reviewedAt: string;         // ISO 8601 timestamp
    comment?: string;
    finalTags?: string[];
  };
  githubIssueUpdated: boolean;
  emailNotificationSent: boolean;
  storyAddedToIndex?: boolean;  // True if approved and added
}
```

### Bulk Operations

Perform bulk actions on multiple submissions (Admin only).

```http
POST /api/v1/admin/submissions/bulk
```

**Request Body:**

```typescript
interface BulkOperationRequest {
  action: 'assign' | 'approve' | 'reject' | 'flag' | 'update_priority';
  submissionIds: string[];     // Max 50 submissions
  parameters: {
    moderatorId?: string;      // For assign action
    comment?: string;          // For review actions
    priority?: QueuePriority;  // For priority updates
    notifySubmitters?: boolean; // Send notifications
  };
}
```

**Response:**

```typescript
interface BulkOperationResponse {
  success: true;
  results: {
    successful: string[];       // Successfully processed submission IDs
    failed: {
      submissionId: string;
      error: string;
    }[];
  };
  statistics: {
    processed: number;
    successful: number;
    failed: number;
  };
}
```

---

## Metadata Extraction Endpoints

### Extract Story Metadata

Extract metadata from story URL (Extension/Web use).

```http
POST /api/v1/extract/metadata
```

**Request Body:**

```typescript
interface ExtractMetadataRequest {
  url: string;                 // Story URL to extract from
  websiteHint?: string;        // Optional website identifier
  includeContent?: boolean;    // Extract story content (default false)
  cacheDuration?: number;      // Cache result duration in seconds
}
```

**Response:**

```typescript
interface ExtractMetadataResponse {
  success: true;
  metadata: {
    title: string;
    author: string;
    description?: string;
    url: string;
    canonicalUrl?: string;     // Normalized URL
    website: string;           // Detected website
    tags?: string[];
    statistics?: {
      wordCount?: number;
      chapterCount?: number;
      reviewCount?: number;
      favoriteCount?: number;
      followCount?: number;
    };
    dates?: {
      published?: string;      // ISO 8601 date
      updated?: string;        // ISO 8601 date
      completed?: string;      // ISO 8601 date
    };
    contentRating?: string;
    language?: string;
    completionStatus?: 'complete' | 'in-progress' | 'hiatus' | 'abandoned';
    characters?: string[];
    relationships?: string[];
    warnings?: string[];
  };
  extractionInfo: {
    extractorVersion: string;
    extractedAt: string;       // ISO 8601 timestamp
    confidence: number;        // 0-1 extraction confidence
    cached: boolean;           // Whether result was cached
  };
}
```

### Suggest Tags

Get AI-powered tag suggestions for story.

```http
POST /api/v1/suggest/tags
```

**Request Body:**

```typescript
interface TagSuggestionRequest {
  storyTitle: string;
  storyDescription?: string;
  fandomSlug: string;
  existingTags?: string[];
  extractedMetadata?: ExtractedMetadata;
  maxSuggestions?: number;     // Default 10, max 25
}
```

**Response:**

```typescript
interface TagSuggestionResponse {
  success: true;
  suggestions: {
    tag: string;
    confidence: number;        // 0-1 confidence score
    category: 'character' | 'relationship' | 'trope' | 'genre' | 'warning' | 'other';
    source: 'ml' | 'taxonomy' | 'pattern' | 'manual';
    explanation?: string;      // Why this tag was suggested
  }[];
  fandomSpecific: string[];    // Fandom-specific available tags
  taxonomyMatches: string[];   // Exact taxonomy matches
}
```

---

## GitHub Integration Endpoints

### Webhook Handler

Handle GitHub webhook events (Internal use only).

```http
POST /api/webhooks/github
```

**Headers:**

```http
X-GitHub-Event: issues | issue_comment | pull_request
X-GitHub-Delivery: <unique-delivery-id>
X-Hub-Signature-256: sha256=<signature>
```

This endpoint processes GitHub webhook events and updates submission status accordingly.

### Sync with GitHub

Manual sync with GitHub issues (Admin only).

```http
POST /api/v1/admin/github/sync
```

**Request Body:**

```typescript
interface GitHubSyncRequest {
  submissionId?: string;       // Sync specific submission
  fullSync?: boolean;          // Perform full repository sync
  dryRun?: boolean;           // Preview changes without applying
}
```

**Response:**

```typescript
interface GitHubSyncResponse {
  success: true;
  syncResults: {
    submissionsUpdated: number;
    issuesCreated: number;
    issuesUpdated: number;
    conflicts: {
      submissionId: string;
      issue: string;
      resolution?: string;
    }[];
  };
  syncTimestamp: string;       // ISO 8601 timestamp
}
```

---

## Health and Status Endpoints

### API Health Check

Check API service health.

```http
GET /api/health
```

**Response:**

```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;           // ISO 8601 timestamp
  version: string;             // API version
  services: {
    database: 'up' | 'down' | 'degraded';
    github: 'up' | 'down' | 'degraded';
    email: 'up' | 'down' | 'degraded';
    cache: 'up' | 'down' | 'degraded';
  };
  performance: {
    avgResponseTime: number;   // Milliseconds
    requestsPerMinute: number;
    errorRate: number;         // Percentage
  };
}
```

### System Statistics

Get system usage statistics (Admin only).

```http
GET /api/v1/admin/statistics
```

**Query Parameters:**

```typescript
interface StatisticsQueryParams {
  period?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;          // ISO 8601 date
  endDate?: string;            // ISO 8601 date
  groupBy?: 'day' | 'week' | 'month';
}
```

**Response:**

```typescript
interface SystemStatisticsResponse {
  submissions: {
    total: number;
    byStatus: Record<SubmissionStatus, number>;
    byFandom: Record<string, number>;
    bySource: Record<string, number>;
  };
  moderation: {
    averageReviewTime: number;   // Hours
    moderatorPerformance: {
      [moderatorId: string]: {
        reviewed: number;
        averageTime: number;
        qualityScore: number;
      };
    };
    queueHealth: {
      currentSize: number;
      oldestSubmission: string;
      averageWaitTime: number;
    };
  };
  quality: {
    averageQualityScore: number;
    duplicateDetectionRate: number;
    falsePositiveRate: number;
  };
  performance: {
    apiResponseTimes: {
      p50: number;
      p95: number;
      p99: number;
    };
    extractionPerformance: {
      averageTime: number;
      successRate: number;
    };
  };
}
```

---

## WebSocket Events

For real-time updates, the system supports WebSocket connections:

```typescript
// Connection
const ws = new WebSocket('wss://the-pensive-index.vercel.app/api/ws');

// Events
interface WebSocketEvent {
  type: 'submission_updated' | 'queue_changed' | 'moderation_completed';
  data: unknown;
  timestamp: string;
}

// Submission Update Event
interface SubmissionUpdatedEvent {
  type: 'submission_updated';
  data: {
    submissionId: string;
    previousStatus: SubmissionStatus;
    newStatus: SubmissionStatus;
    moderatorId?: string;
    comment?: string;
  };
}

// Queue Change Event
interface QueueChangedEvent {
  type: 'queue_changed';
  data: {
    queueSize: number;
    positionChanges: {
      submissionId: string;
      oldPosition: number;
      newPosition: number;
    }[];
  };
}
```

---

## Error Handling Examples

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "storyUrl": "Invalid URL format",
    "fandomSlug": "Fandom not found"
  },
  "timestamp": "2024-01-10T14:30:00Z",
  "requestId": "req_abc123"
}
```

### Duplicate Submission (409)

```json
{
  "error": "Duplicate submission detected",
  "code": "DUPLICATE_SUBMISSION",
  "details": {
    "existingSubmissionId": "sub_2024_001200",
    "confidence": 0.95,
    "similarityFactors": ["url", "title", "author"]
  },
  "timestamp": "2024-01-10T14:30:00Z",
  "requestId": "req_abc124"
}
```

### Rate Limit Exceeded (429)

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": 3600,
    "resetAt": "2024-01-10T15:00:00Z"
  },
  "timestamp": "2024-01-10T14:30:00Z",
  "requestId": "req_abc125"
}
```

---

## SDK and Integration Examples

### JavaScript/TypeScript SDK

```typescript
import { PensiveIndexAPI } from '@the-pensive-index/api-sdk';

const api = new PensiveIndexAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://the-pensive-index.vercel.app/api'
});

// Submit a story
const submission = await api.submissions.create({
  storyTitle: 'My Favorite Story',
  storyAuthor: 'Amazing Author',
  storyUrl: 'https://archiveofourown.org/works/123456',
  fandomSlug: 'harry-potter',
  submitterEmail: 'user@example.com'
});

// Get submission status
const details = await api.submissions.get(submission.submissionId);

// Admin: Get moderation queue
const queue = await api.admin.queue.list({
  status: 'pending',
  limit: 50
});

// Admin: Review submission
await api.admin.submissions.review(submissionId, {
  action: 'approve',
  comment: 'Great story, well-tagged!'
});
```

### Browser Extension Integration

```typescript
// Extension content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractMetadata') {
    extractStoryMetadata()
      .then(metadata => {
        // Submit to API
        return fetch('https://the-pensive-index.vercel.app/api/v1/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            ...metadata,
            submissionSource: 'extension'
          })
        });
      })
      .then(response => response.json())
      .then(sendResponse);
    return true; // Async response
  }
});
```

### curl Examples

```bash
# Create submission
curl -X POST https://the-pensive-index.vercel.app/api/v1/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "storyTitle": "Test Story",
    "storyAuthor": "Test Author",
    "storyUrl": "https://example.com/story",
    "fandomSlug": "harry-potter",
    "submitterEmail": "test@example.com"
  }'

# Get submission details
curl -X GET https://the-pensive-index.vercel.app/api/v1/submissions/sub_123 \
  -H "Authorization: Bearer your-token"

# Admin: Get queue
curl -X GET "https://the-pensive-index.vercel.app/api/v1/admin/submissions/queue?status=pending&limit=10" \
  -H "Authorization: Bearer admin-token"

# Extract metadata
curl -X POST https://the-pensive-index.vercel.app/api/v1/extract/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://archiveofourown.org/works/123456"
  }'
```

---

This API documentation provides comprehensive coverage of all endpoints in the Community Submission System. For additional support or questions about API usage, please refer to the [Development Guide](../development/community-submission-system.md) or contact the development team.