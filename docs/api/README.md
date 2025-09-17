# API Documentation

The Pensieve Index provides REST API endpoints for story discovery, pathway management, and content submission.

## Base URL

```
# Development
http://localhost:3000/api

# Production
https://pensieve-index.pages.dev/api
```

## Authentication

Most endpoints require authentication using NextAuth.js sessions:

```typescript
// Headers for authenticated requests
{
  "Cookie": "next-auth.session-token=...",
  "Content-Type": "application/json"
}
```

## Core Endpoints

### Fandoms

#### GET /api/fandoms

List all available fandoms with basic metadata.

**Response:**
```json
{
  "fandoms": [
    {
      "id": "harry-potter",
      "name": "Harry Potter",
      "description": "J.K. Rowling's wizarding world",
      "storyCount": 15432,
      "tagCount": 1247,
      "plotBlockCount": 89
    }
  ]
}
```

#### GET /api/fandoms/[fandomId]

Get detailed fandom information including available tags and plot blocks.

**Parameters:**
- `fandomId`: String - Fandom identifier

**Response:**
```json
{
  "fandom": {
    "id": "harry-potter",
    "name": "Harry Potter",
    "description": "J.K. Rowling's wizarding world",
    "tags": [
      {
        "id": "angst",
        "name": "Angst",
        "description": "Heavy emotional content",
        "category": "tone"
      }
    ],
    "plotBlocks": [
      {
        "id": "goblin-inheritance",
        "name": "Goblin Inheritance",
        "description": "Harry discovers magical inheritance through Gringotts",
        "children": ["black-lordship", "slytherin-lordship"]
      }
    ]
  }
}
```

### Story Search

#### POST /api/stories/search

Search for stories matching a pathway configuration.

**Request Body:**
```json
{
  "fandomId": "harry-potter",
  "pathway": {
    "tags": ["angst", "time-travel"],
    "plotBlocks": ["goblin-inheritance"],
    "characters": ["harry-potter", "hermione-granger"]
  },
  "filters": {
    "wordCount": { "min": 50000, "max": 200000 },
    "status": "complete",
    "rating": "T"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**Response:**
```json
{
  "stories": [
    {
      "id": "story-123",
      "title": "The Inheritance Chronicles",
      "author": "AuthorName",
      "summary": "Harry discovers his true heritage...",
      "url": "https://example.com/story/123",
      "wordCount": 145000,
      "status": "complete",
      "rating": "T",
      "matchScore": 0.95,
      "matchingElements": {
        "tags": ["angst", "time-travel"],
        "plotBlocks": ["goblin-inheritance"],
        "characters": ["harry-potter"]
      }
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "hasNext": true
  },
  "searchMetadata": {
    "query": "Complex pathway search",
    "resultsCount": 156,
    "searchTime": "145ms"
  }
}
```

### Pathway Validation

#### POST /api/pathways/validate

Validate a pathway configuration against fandom rules.

**Request Body:**
```json
{
  "fandomId": "harry-potter",
  "pathway": {
    "tags": ["harry/hermione", "harry/ginny"],
    "plotBlocks": ["goblin-inheritance"],
    "characters": ["harry-potter", "hermione-granger"]
  }
}
```

**Response:**
```json
{
  "isValid": false,
  "errors": [
    {
      "type": "exclusivity_conflict",
      "message": "Harry can only be paired with one character",
      "conflictingElements": ["harry/hermione", "harry/ginny"],
      "suggestions": [
        {
          "action": "remove",
          "element": "harry/ginny",
          "reason": "Keep primary pairing"
        }
      ]
    }
  ],
  "warnings": [
    {
      "type": "rare_combination",
      "message": "This combination appears in fewer than 5 stories",
      "elements": ["goblin-inheritance", "harry/hermione"]
    }
  ]
}
```

### Story Submission

#### POST /api/stories/submit

Submit a new story for community review.

**Request Body:**
```json
{
  "story": {
    "title": "New Story Title",
    "author": "Author Name",
    "url": "https://archiveofourown.org/works/12345",
    "summary": "Story summary...",
    "fandomId": "harry-potter",
    "wordCount": 50000,
    "status": "complete",
    "rating": "T"
  },
  "tags": ["angst", "time-travel", "harry/hermione"],
  "plotBlocks": ["goblin-inheritance"],
  "characters": ["harry-potter", "hermione-granger"],
  "submissionNotes": "Found this amazing story that fits the inheritance trope perfectly!"
}
```

**Response:**
```json
{
  "submissionId": "sub-789",
  "status": "pending_review",
  "estimatedReviewTime": "3-5 days",
  "githubIssue": {
    "number": 456,
    "url": "https://github.com/Life-Experimentalists/the-pensive-index/issues/456"
  }
}
```

## Admin Endpoints

### Story Management

#### GET /api/admin/stories/pending

List stories pending admin review.

**Auth Required:** Admin role

**Response:**
```json
{
  "pendingStories": [
    {
      "submissionId": "sub-789",
      "story": { /* story object */ },
      "submittedAt": "2024-01-15T10:30:00Z",
      "submittedBy": "user123",
      "githubIssue": 456
    }
  ]
}
```

#### POST /api/admin/stories/approve

Approve a pending story submission.

**Auth Required:** Admin role

**Request Body:**
```json
{
  "submissionId": "sub-789",
  "approvedTags": ["angst", "time-travel"],
  "approvedPlotBlocks": ["goblin-inheritance"],
  "adminNotes": "Approved with tag corrections"
}
```

### Tag Management

#### POST /api/admin/tags

Create a new tag.

**Auth Required:** Admin role

**Request Body:**
```json
{
  "fandomId": "harry-potter",
  "tag": {
    "id": "new-tag",
    "name": "New Tag",
    "description": "Description of the new tag",
    "category": "character",
    "aliases": ["alt-name-1", "alt-name-2"]
  }
}
```

## Plot Block Tree API

### GET /api/plot-blocks/[blockId]/tree

Get the complete tree structure for a plot block.

**Parameters:**
- `blockId`: String - Plot block identifier

**Response:**
```json
{
  "plotBlock": {
    "id": "goblin-inheritance",
    "name": "Goblin Inheritance",
    "description": "Harry discovers magical inheritance",
    "tree": {
      "children": [
        {
          "id": "black-lordship",
          "name": "Black Lordship",
          "conditions": ["after-sirius-death"],
          "children": [
            {
              "id": "black-head-of-family",
              "name": "Black Head of Family",
              "exclusiveWith": ["gryffindor-head-of-family"]
            }
          ]
        }
      ]
    }
  }
}
```

## WebSocket Events

Real-time updates for live pathway building:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/api/ws');

// Listen for validation updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'validation_update':
      // Handle real-time validation
      break;
    case 'story_count_update':
      // Handle updated story counts
      break;
  }
};

// Send pathway updates
ws.send(JSON.stringify({
  type: 'pathway_update',
  pathway: { /* current pathway */ }
}));
```

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Pathway validation failed",
    "details": {
      "field": "tags",
      "violations": ["exclusivity_conflict"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-123"
}
```

### Error Codes

- `FANDOM_NOT_FOUND`: Requested fandom doesn't exist
- `VALIDATION_FAILED`: Pathway validation errors
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Admin privileges required
- `RATE_LIMITED`: Too many requests
- `SEARCH_TIMEOUT`: Search query took too long

## Rate Limits

- **Story Search**: 30 requests/minute per user
- **Pathway Validation**: 60 requests/minute per user
- **Story Submission**: 5 requests/hour per user
- **Admin Operations**: 100 requests/minute per admin

## Development

### API Testing

```powershell
# Test story search endpoint
curl -X POST http://localhost:3000/api/stories/search \
  -H "Content-Type: application/json" \
  -d '{"fandomId": "harry-potter", "pathway": {"tags": ["angst"]}}'

# Test with authentication
curl -X GET http://localhost:3000/api/admin/stories/pending \
  -H "Cookie: next-auth.session-token=your-token-here"
```

### Mock Data

Development environment includes mock data for testing:

```powershell
# Seed database with test stories
npm run db:seed

# Reset to clean state
npm run db:reset
```

---

*For more detailed API examples, see the [Integration Examples](../integration/examples.md) documentation.*
