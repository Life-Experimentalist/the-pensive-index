# API Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with The Pensive Index Community Submission System API. It covers authentication, API usage patterns, SDK information, and best practices for third-party integrations.

## Getting Started

### API Access

To integrate with The Pensive Index API, you'll need:

1. **Account Registration**: Create an account at https://the-pensive-index.vercel.app
2. **API Key**: Generate API key in your user profile settings
3. **Fandom Access**: Request access to specific fandoms (if required)
4. **Rate Limits**: Understand and respect API rate limits

### Base URLs

```
Production: https://the-pensive-index.vercel.app/api
Development: http://localhost:3000/api (for local testing)
```

### API Versioning

The API uses URL-based versioning:
- Current version: `/api/v1/`
- Future versions: `/api/v2/`, etc.

## Authentication

### API Key Authentication

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Session-based Authentication (Web)

For web applications, use session-based authentication through Clerk:

```javascript
import { useAuth } from '@clerk/nextjs';

function APIClient() {
  const { getToken } = useAuth();

  const callAPI = async (endpoint, options = {}) => {
    const token = await getToken();

    return fetch(`https://the-pensive-index.vercel.app/api/v1/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };
}
```

## SDK and Libraries

### Official TypeScript SDK

```bash
npm install @the-pensive-index/api-sdk
```

```typescript
import { PensiveIndexAPI } from '@the-pensive-index/api-sdk';

const api = new PensiveIndexAPI({
  apiKey: process.env.PENSIVE_INDEX_API_KEY,
  baseURL: 'https://the-pensive-index.vercel.app/api',
  timeout: 10000,
});

// Submit a story
const submission = await api.submissions.create({
  storyTitle: 'My Amazing Fanfiction',
  storyAuthor: 'Talented Writer',
  storyUrl: 'https://archiveofourown.org/works/123456',
  fandomSlug: 'harry-potter',
  submitterEmail: 'user@example.com',
  tags: ['time-travel', 'romance'],
});

console.log(`Submission created: ${submission.submissionId}`);
```

### Python SDK

```bash
pip install pensive-index-api
```

```python
from pensive_index_api import PensiveIndexClient

client = PensiveIndexClient(
    api_key=os.environ['PENSIVE_INDEX_API_KEY'],
    base_url='https://the-pensive-index.vercel.app/api'
)

# Submit a story
submission = client.submissions.create({
    'story_title': 'My Amazing Fanfiction',
    'story_author': 'Talented Writer',
    'story_url': 'https://archiveofourown.org/works/123456',
    'fandom_slug': 'harry-potter',
    'submitter_email': 'user@example.com',
    'tags': ['time-travel', 'romance']
})

print(f"Submission created: {submission['submission_id']}")
```

## Common Integration Patterns

### Story Submission Workflow

```typescript
class StorySubmissionService {
  constructor(private api: PensiveIndexAPI) {}

  async submitStory(storyData: StorySubmissionData): Promise<SubmissionResult> {
    try {
      // 1. Extract metadata if URL provided
      let metadata = null;
      if (storyData.storyUrl) {
        metadata = await this.api.extract.metadata({
          url: storyData.storyUrl
        });
      }

      // 2. Get tag suggestions
      const tagSuggestions = await this.api.suggest.tags({
        storyTitle: storyData.storyTitle,
        storyDescription: storyData.storyDescription,
        fandomSlug: storyData.fandomSlug,
        extractedMetadata: metadata?.metadata
      });

      // 3. Combine suggested tags with user tags
      const finalTags = [
        ...(storyData.tags || []),
        ...tagSuggestions.suggestions
          .filter(s => s.confidence > 0.8)
          .map(s => s.tag)
      ];

      // 4. Submit story
      const submission = await this.api.submissions.create({
        ...storyData,
        tags: finalTags,
        extractedMetadata: metadata?.metadata
      });

      return {
        success: true,
        submissionId: submission.submissionId,
        githubIssueNumber: submission.githubIssueNumber,
        queuePosition: submission.queuePosition
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Batch Processing

```typescript
class BatchProcessor {
  constructor(private api: PensiveIndexAPI) {}

  async processBatch(submissions: StoryData[], batchSize = 10): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);

      // Process batch with rate limiting
      const batchPromises = batch.map(async (story, index) => {
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, index * 200));

        try {
          return await this.api.submissions.create(story);
        } catch (error) {
          return { error: error.message, story };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r =>
        r.status === 'fulfilled' ? r.value : r.reason
      ));
    }

    return results;
  }
}
```

### Real-time Updates

```typescript
class SubmissionMonitor {
  private ws: WebSocket;

  constructor(private apiKey: string) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(
      `wss://the-pensive-index.vercel.app/api/ws?token=${this.apiKey}`
    );

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'submission_updated':
          this.handleSubmissionUpdate(data.data);
          break;
        case 'queue_changed':
          this.handleQueueChange(data.data);
          break;
        case 'moderation_completed':
          this.handleModerationComplete(data.data);
          break;
      }
    };

    this.ws.onclose = () => {
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  private handleSubmissionUpdate(data: SubmissionUpdateEvent) {
    console.log(`Submission ${data.submissionId} status changed: ${data.previousStatus} → ${data.newStatus}`);

    // Notify your application
    this.emit('submissionStatusChanged', data);
  }
}
```

## Browser Extension Integration

### Content Script Communication

```typescript
// content-script.ts
class PensiveIndexExtractor {
  async extractCurrentPage(): Promise<StoryMetadata> {
    // Site-specific extraction logic
    const extractor = this.getExtractorForSite(window.location.hostname);
    return await extractor.extract();
  }

  async submitToAPI(storyData: StoryData): Promise<SubmissionResult> {
    // Send message to background script
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'submitStory',
        data: storyData
      }, resolve);
    });
  }
}

// Initialize extractor
const extractor = new PensiveIndexExtractor();

// Listen for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractStory') {
    extractor.extractCurrentPage()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Async response
  }
});
```

### Background Script API Integration

```typescript
// background.ts
class BackgroundAPIClient {
  private apiKey: string;
  private baseURL = 'https://the-pensive-index.vercel.app/api';

  constructor() {
    // Get API key from storage
    chrome.storage.sync.get(['apiKey'], (result) => {
      this.apiKey = result.apiKey;
    });
  }

  async submitStory(storyData: StoryData): Promise<SubmissionResult> {
    const response = await fetch(`${this.baseURL}/v1/submissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Extension-Version': chrome.runtime.getManifest().version
      },
      body: JSON.stringify({
        ...storyData,
        submissionSource: 'extension'
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  }
}

const apiClient = new BackgroundAPIClient();

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'submitStory') {
    apiClient.submitStory(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});
```

## Mobile App Integration

### React Native

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileAPIClient {
  private apiKey: string;
  private baseURL = 'https://the-pensive-index.vercel.app/api';

  async initialize() {
    this.apiKey = await AsyncStorage.getItem('pensive_index_api_key');
  }

  async submitStory(storyData: StoryData): Promise<SubmissionResult> {
    const response = await fetch(`${this.baseURL}/v1/submissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PensiveIndex-Mobile/1.0'
      },
      body: JSON.stringify(storyData)
    });

    return await response.json();
  }

  async getSubmissionHistory(filters?: SubmissionFilters): Promise<SubmissionHistory> {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${this.baseURL}/v1/submissions?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      }
    });

    return await response.json();
  }
}
```

### Flutter/Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class PensiveIndexAPI {
  final String apiKey;
  final String baseURL = 'https://the-pensive-index.vercel.app/api';

  PensiveIndexAPI({required this.apiKey});

  Future<SubmissionResult> submitStory(Map<String, dynamic> storyData) async {
    final response = await http.post(
      Uri.parse('$baseURL/v1/submissions'),
      headers: {
        'Authorization': 'Bearer $apiKey',
        'Content-Type': 'application/json',
      },
      body: json.encode(storyData),
    );

    if (response.statusCode == 200) {
      return SubmissionResult.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to submit story: ${response.statusCode}');
    }
  }
}
```

## Webhook Integration

### Setting Up Webhooks

```typescript
// webhook-handler.ts
import express from 'express';
import crypto from 'crypto';

const app = express();

// Webhook endpoint
app.post('/webhooks/pensive-index', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-pensive-signature'];
  const payload = req.body;

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).send('Unauthorized');
  }

  const event = JSON.parse(payload.toString());

  // Handle different event types
  switch (event.type) {
    case 'submission.created':
      handleSubmissionCreated(event.data);
      break;
    case 'submission.approved':
      handleSubmissionApproved(event.data);
      break;
    case 'submission.rejected':
      handleSubmissionRejected(event.data);
      break;
  }

  res.status(200).send('OK');
});

function handleSubmissionCreated(data) {
  console.log('New submission:', data.submissionId);
  // Update your system
}
```

### Configuring Webhooks

```bash
curl -X POST https://the-pensive-index.vercel.app/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/pensive-index",
    "events": ["submission.created", "submission.approved", "submission.rejected"],
    "secret": "your-webhook-secret"
  }'
```

## Error Handling Best Practices

### Retry Logic

```typescript
class APIClientWithRetry {
  private async requestWithRetry<T>(
    request: () => Promise<T>,
    maxRetries = 3,
    backoff = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await request();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = backoff * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
```

### Rate Limit Handling

```typescript
class RateLimitedClient {
  private lastRequestTime = 0;
  private requestsInCurrentWindow = 0;
  private rateLimitReset = 0;

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    // Check if we need to wait for rate limit reset
    const now = Date.now();
    if (this.requestsInCurrentWindow >= 100 && now < this.rateLimitReset) {
      const waitTime = this.rateLimitReset - now;
      console.log(`Rate limit hit, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const response = await fetch(url, options);

    // Update rate limit tracking from response headers
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
    const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');

    this.requestsInCurrentWindow = 100 - remaining;
    this.rateLimitReset = reset * 1000; // Convert to milliseconds

    if (response.status === 429) {
      throw new RateLimitError('Rate limit exceeded', reset);
    }

    return response;
  }
}
```

## Testing Your Integration

### Unit Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PensiveIndexAPI } from '@the-pensive-index/api-sdk';

describe('PensiveIndexAPI Integration', () => {
  let api: PensiveIndexAPI;

  beforeEach(() => {
    api = new PensiveIndexAPI({
      apiKey: 'test-api-key',
      baseURL: 'http://localhost:3000/api'
    });
  });

  it('should submit a story successfully', async () => {
    const storyData = {
      storyTitle: 'Test Story',
      storyAuthor: 'Test Author',
      storyUrl: 'https://example.com/story',
      fandomSlug: 'test-fandom',
      submitterEmail: 'test@example.com'
    };

    const result = await api.submissions.create(storyData);

    expect(result.success).toBe(true);
    expect(result.submissionId).toMatch(/^sub_\d{4}_\d{6}$/);
  });

  it('should handle validation errors', async () => {
    const invalidData = {
      storyTitle: '', // Invalid: empty title
      storyAuthor: 'Test Author',
      storyUrl: 'invalid-url', // Invalid: malformed URL
      fandomSlug: 'nonexistent', // Invalid: fandom doesn't exist
      submitterEmail: 'invalid-email' // Invalid: malformed email
    };

    await expect(api.submissions.create(invalidData))
      .rejects.toThrow('Validation failed');
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Integration', () => {
  it('should complete full submission workflow', async () => {
    // 1. Extract metadata
    const metadata = await api.extract.metadata({
      url: 'https://archiveofourown.org/works/123456'
    });

    expect(metadata.success).toBe(true);
    expect(metadata.metadata.title).toBeDefined();

    // 2. Get tag suggestions
    const tagSuggestions = await api.suggest.tags({
      storyTitle: metadata.metadata.title,
      fandomSlug: 'harry-potter'
    });

    expect(tagSuggestions.suggestions.length).toBeGreaterThan(0);

    // 3. Submit story
    const submission = await api.submissions.create({
      storyTitle: metadata.metadata.title,
      storyAuthor: metadata.metadata.author,
      storyUrl: metadata.metadata.url,
      fandomSlug: 'harry-potter',
      submitterEmail: 'test@example.com',
      tags: tagSuggestions.suggestions.slice(0, 5).map(s => s.tag),
      extractedMetadata: metadata.metadata
    });

    expect(submission.success).toBe(true);

    // 4. Verify submission exists
    const details = await api.submissions.get(submission.submissionId);
    expect(details.submission.status).toBe('pending');
  });
});
```

## Performance Optimization

### Caching Strategies

```typescript
class CachedAPIClient {
  private cache = new Map();
  private cacheExpiry = new Map();

  async getWithCache<T>(key: string, fetcher: () => Promise<T>, ttlMs = 300000): Promise<T> {
    const now = Date.now();

    if (this.cache.has(key) && this.cacheExpiry.get(key) > now) {
      return this.cache.get(key);
    }

    const result = await fetcher();
    this.cache.set(key, result);
    this.cacheExpiry.set(key, now + ttlMs);

    return result;
  }

  async getFandomData(slug: string) {
    return this.getWithCache(
      `fandom:${slug}`,
      () => this.api.fandoms.get(slug),
      3600000 // Cache for 1 hour
    );
  }
}
```

### Connection Pooling

```typescript
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 10,
  timeout: 60000,
});

const api = new PensiveIndexAPI({
  apiKey: process.env.API_KEY,
  httpAgent: httpsAgent
});
```

## Security Best Practices

### API Key Management

```typescript
// ❌ Don't do this
const api = new PensiveIndexAPI({
  apiKey: 'pk_live_abc123...' // Hardcoded key
});

// ✅ Do this
const api = new PensiveIndexAPI({
  apiKey: process.env.PENSIVE_INDEX_API_KEY // Environment variable
});

// ✅ For client-side (use temporary tokens)
const api = new PensiveIndexAPI({
  tokenProvider: async () => {
    const response = await fetch('/api/auth/token');
    const { token } = await response.json();
    return token;
  }
});
```

### Input Validation

```typescript
import { z } from 'zod';

const StorySubmissionSchema = z.object({
  storyTitle: z.string().min(1).max(200),
  storyAuthor: z.string().min(1).max(100),
  storyUrl: z.string().url(),
  fandomSlug: z.string().regex(/^[a-z0-9-]+$/),
  submitterEmail: z.string().email(),
  tags: z.array(z.string()).optional(),
});

function validateSubmission(data: unknown) {
  return StorySubmissionSchema.parse(data);
}
```

This integration guide provides comprehensive coverage of API integration patterns, best practices, and examples for various platforms and use cases. For additional support or questions about API integration, refer to the [API Documentation](../api/community-submission-endpoints.md) or contact the development team.