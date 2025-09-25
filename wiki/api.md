# API Documentation

## Overview

The Pensieve Index API provides endpoints for managing fanfiction story discovery through a tag-based pathway system. The API is built with Next.js 13+ App Router and follows RESTful conventions with comprehensive validation and error handling.

## Base URL

```
Production: https://pensieve-index.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

The API uses NextAuth.js for authentication. Admin endpoints require proper authentication and role verification.

### Headers

```
Authorization: Bearer <session-token>
Content-Type: application/json
```

## API Endpoints

### Fandoms

#### GET /api/fandoms

Retrieve all fandoms with optional filtering.

**Query Parameters:**
- `active` (boolean): Filter by active status (default: true)
- `search` (string): Search fandom names and descriptions
- `limit` (number): Limit results (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Harry Potter",
      "description": "The wizarding world of Harry Potter",
      "slug": "harry-potter",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "metadata": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

#### GET /api/fandoms/[slug]

Retrieve a specific fandom by slug.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Harry Potter",
    "description": "The wizarding world of Harry Potter",
    "slug": "harry-potter",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/fandoms (Admin Only)

Create a new fandom.

**Request Body:**
```json
{
  "name": "Percy Jackson",
  "description": "The world of Percy Jackson and the Olympians",
  "slug": "percy-jackson"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Percy Jackson",
    "description": "The world of Percy Jackson and the Olympians",
    "slug": "percy-jackson",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/fandoms/[id] (Admin Only)

Update an existing fandom.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "is_active": false
}
```

### Tags

#### GET /api/fandoms/[fandomSlug]/tags

Retrieve tags for a specific fandom.

**Query Parameters:**
- `class` (string): Filter by tag class name
- `search` (string): Search tag names and descriptions
- `active` (boolean): Filter by active status (default: true)
- `limit` (number): Limit results (default: 100, max: 500)
- `offset` (number): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "angst",
      "description": "Stories with emotional intensity",
      "fandom_id": "uuid",
      "tag_class_id": "uuid",
      "tag_class_name": "mood",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "metadata": {
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

#### POST /api/fandoms/[fandomSlug]/tags (Admin Only)

Create a new tag in a fandom.

**Request Body:**
```json
{
  "name": "time-travel",
  "description": "Stories involving time travel",
  "tag_class_id": "uuid"
}
```

### Tag Classes

#### GET /api/fandoms/[fandomSlug]/tag-classes

Retrieve tag classes for a specific fandom.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "character-shipping",
      "description": "Romantic relationship tags",
      "fandom_id": "uuid",
      "validation_rules": {
        "mutual_exclusion": {
          "within_class": true,
          "conflicting_tags": []
        },
        "instance_limits": {
          "max_instances": 1,
          "min_instances": 0
        }
      },
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/fandoms/[fandomSlug]/tag-classes (Admin Only)

Create a new tag class in a fandom.

**Request Body:**
```json
{
  "name": "genre",
  "description": "Story genre classification",
  "validation_rules": {
    "instance_limits": {
      "max_instances": 3,
      "min_instances": 1
    }
  }
}
```

### Plot Blocks

#### GET /api/fandoms/[fandomSlug]/plot-blocks

Retrieve plot blocks for a specific fandom with hierarchy information.

**Query Parameters:**
- `parent_id` (string): Filter by parent block ID (null for root blocks)
- `active` (boolean): Filter by active status (default: true)
- `depth` (number): Maximum depth to retrieve (default: unlimited)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Goblin Inheritance",
      "description": "Harry discovers his true heritage",
      "fandom_id": "uuid",
      "parent_id": null,
      "is_active": true,
      "children": [
        {
          "id": "uuid",
          "name": "Black Lordship",
          "description": "Harry inherits the Black family line",
          "parent_id": "parent-uuid",
          "is_active": true,
          "children": []
        }
      ],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/fandoms/[fandomSlug]/plot-blocks (Admin Only)

Create a new plot block in a fandom.

**Request Body:**
```json
{
  "name": "Time Turner Use",
  "description": "Harry uses a time turner",
  "parent_id": "uuid"
}
```

### Validation

#### POST /api/validate/pathway

Validate a story pathway for conflicts and requirements.

**Request Body:**
```json
{
  "fandom_id": "uuid",
  "tags": ["tag-name-1", "tag-name-2"],
  "plot_blocks": ["plot-block-name-1"],
  "pathway": [
    { "id": "tag-name-1", "type": "tag" },
    { "id": "plot-block-name-1", "type": "plot_block" },
    { "id": "tag-name-2", "type": "tag" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_valid": false,
    "conflicts": [
      {
        "type": "mutual_exclusion",
        "message": "Tags 'harry/hermione' and 'harry/ginny' are mutually exclusive",
        "affected_items": ["harry/hermione", "harry/ginny"],
        "rule_source": "character-shipping tag class"
      }
    ],
    "warnings": [
      {
        "type": "missing_dependency",
        "message": "Tag 'advanced-magic' typically requires 'post-hogwarts'",
        "affected_items": ["advanced-magic"],
        "suggestions": ["post-hogwarts"]
      }
    ],
    "suggestions": [
      {
        "type": "add_tag",
        "message": "Consider adding 'post-hogwarts' for story context",
        "suggested_items": ["post-hogwarts"]
      }
    ]
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Request data validation failed
- `NOT_FOUND`: Requested resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Resource conflict (e.g., duplicate slug)
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited:
- Public endpoints: 100 requests per minute per IP
- Authenticated endpoints: 1000 requests per minute per user
- Admin endpoints: 500 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Validation Rules

### Fandom Validation
- Name: 1-100 characters, unique
- Slug: 1-50 characters, lowercase, hyphens only, unique
- Description: Optional, max 1000 characters

### Tag Validation
- Name: 1-50 characters, unique within fandom
- Description: Optional, max 500 characters
- Must belong to valid fandom
- Tag class must exist if specified

### Tag Class Validation
- Name: 1-50 characters, unique within fandom
- Description: Optional, max 500 characters
- Validation rules must be valid JSON

### Plot Block Validation
- Name: 1-100 characters, unique within fandom
- Description: Optional, max 1000 characters
- Parent must exist if specified
- Cannot be parent of itself (circular reference)

## Performance Considerations

- CRUD operations complete in <50ms
- Validation operations complete in <200ms
- Complex queries complete in <100ms
- Bulk operations complete in <500ms

## Caching

The API implements caching for optimal performance:
- Fandom data: 1 hour cache
- Tag/TagClass data: 30 minutes cache
- Plot block hierarchy: 30 minutes cache
- Validation rules: 15 minutes cache

Cache headers indicate caching status:
```
Cache-Control: public, max-age=3600
ETag: "abc123"
Last-Modified: Mon, 01 Jan 2024 00:00:00 GMT
```

## Pagination

Large result sets use cursor-based pagination:

**Request:**
```
GET /api/fandoms/harry-potter/tags?limit=50&offset=100
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "total": 500,
    "limit": 50,
    "offset": 100,
    "has_more": true,
    "next_url": "/api/fandoms/harry-potter/tags?limit=50&offset=150"
  }
}
```

## Webhooks (Future)

The API will support webhooks for real-time updates:
- Story pathway validations
- New tag/plot block additions
- Admin content updates

## SDK and Libraries

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- Browser extension integration

## Support

For API support:
- Documentation: [Link to docs]
- Issues: GitHub repository
- Community: Discord server
