# Hierarchical Admin System API Documentation

## Overview

The Hierarchical Admin System provides role-based access control with four distinct privilege levels: **Super Admin**, **Project Admin**, **Fandom Admin**, and **Moderator**. Each role has specific permissions and capabilities within the system hierarchy.

## Role Hierarchy

```
Super Admin (Highest Privilege)
├── Project Admin
    ├── Fandom Admin
        └── Moderator (Lowest Privilege)
```

### Role Capabilities

| Capability           | Super Admin | Project Admin | Fandom Admin | Moderator |
| -------------------- | ----------- | ------------- | ------------ | --------- |
| Manage System Config | ✅           | ❌             | ❌            | ❌         |
| Manage All Users     | ✅           | ✅             | ❌            | ❌         |
| Manage Fandom Users  | ✅           | ✅             | ✅            | ❌         |
| Assign Roles         | ✅           | ✅             | ✅*           | ❌         |
| View Audit Logs      | ✅           | ✅             | ✅*           | ✅*        |
| Manage Invitations   | ✅           | ✅             | ✅            | ❌         |
| Moderate Content     | ✅           | ✅             | ✅            | ✅         |

*Limited to own scope/hierarchy level

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Authentication Flow

1. **Login**: `POST /api/auth/sign-in`
2. **Token Refresh**: `POST /api/auth/refresh`
3. **Logout**: `POST /api/auth/sign-out`

## Core API Endpoints

### User Management

#### Get All Users
```http
GET /api/admin/users
```

**Authorization**: Project Admin+
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `search` (optional): Search term for name/email
- `role` (optional): Filter by role
- `status` (optional): Filter by status (active/inactive)

**Response**:
```json
{
  "users": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "moderator",
      "status": "active",
      "createdAt": "2024-01-15T10:00:00Z",
      "lastLoginAt": "2024-01-20T14:30:00Z",
      "permissions": ["user.read", "content.moderate"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Create User
```http
POST /api/admin/users
```

**Authorization**: Project Admin+
**Request Body**:
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "moderator",
  "permissions": ["user.read", "content.moderate"]
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user_124",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "moderator",
    "status": "active",
    "createdAt": "2024-01-21T09:15:00Z"
  }
}
```

#### Update User
```http
PUT /api/admin/users/{userId}
```

**Authorization**: Project Admin+ (or Fandom Admin for fandom-scoped users)
**Request Body**:
```json
{
  "name": "Updated Name",
  "status": "inactive",
  "permissions": ["user.read"]
}
```

#### Delete User
```http
DELETE /api/admin/users/{userId}
```

**Authorization**: Project Admin+
**Query Parameters**:
- `reason` (required): Reason for deletion
- `confirmDeletion` (required): Must be "true"

### Role Management

#### Assign Role
```http
POST /api/admin/roles/assign
```

**Authorization**: Varies by target role
- Super Admin: Only Super Admin can assign
- Project Admin: Super Admin only
- Fandom Admin: Project Admin+
- Moderator: Fandom Admin+

**Request Body**:
```json
{
  "userEmail": "user@example.com",
  "role": "fandom-admin",
  "fandomId": "fandom_123"
}
```

#### Bulk Role Assignment
```http
POST /api/admin/roles/bulk-assign
```

**Authorization**: Project Admin+
**Request Body**:
```json
{
  "userEmails": ["user1@example.com", "user2@example.com"],
  "role": "moderator",
  "fandomId": "fandom_123"
}
```

**Response**:
```json
{
  "success": true,
  "assigned": 2,
  "failed": 0,
  "results": [
    {
      "email": "user1@example.com",
      "success": true
    },
    {
      "email": "user2@example.com",
      "success": true
    }
  ]
}
```

### Permission Management

#### Get User Permissions
```http
GET /api/admin/permissions/user/{userId}
```

**Authorization**: Fandom Admin+ (for users in scope)

**Response**:
```json
{
  "userId": "user_123",
  "directPermissions": ["user.read", "content.moderate"],
  "inheritedPermissions": ["audit.read"],
  "effectivePermissions": ["user.read", "content.moderate", "audit.read"],
  "rolePermissions": {
    "moderator": ["user.read", "content.moderate", "audit.read"]
  }
}
```

#### Update User Permissions
```http
PATCH /api/admin/permissions/user/{userId}
```

**Authorization**: Project Admin+ (or Fandom Admin for fandom-scoped permissions)
**Request Body**:
```json
{
  "permissions": ["user.read", "user.write", "content.moderate"],
  "action": "replace"
}
```

**Action Types**:
- `replace`: Replace all permissions
- `add`: Add permissions to existing
- `remove`: Remove specific permissions

#### Get Effective Permissions
```http
GET /api/admin/permissions/effective
```

**Authorization**: Any authenticated admin
**Query Parameters**:
- `userEmail` (optional): Get effective permissions for specific user

### Invitation Management

#### Send Invitation
```http
POST /api/admin/invitations
```

**Authorization**: Fandom Admin+
**Request Body**:
```json
{
  "email": "invite@example.com",
  "role": "moderator",
  "fandomId": "fandom_123",
  "message": "Welcome to our team!",
  "expiresInDays": 7
}
```

#### Get Invitations
```http
GET /api/admin/invitations
```

**Authorization**: Fandom Admin+
**Query Parameters**:
- `status` (optional): pending, accepted, expired, cancelled
- `page` (optional): Page number
- `limit` (optional): Results per page

**Response**:
```json
{
  "invitations": [
    {
      "id": "inv_123",
      "email": "invite@example.com",
      "role": "moderator",
      "status": "pending",
      "createdAt": "2024-01-20T10:00:00Z",
      "expiresAt": "2024-01-27T10:00:00Z",
      "invitedBy": "admin@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

#### Resend Invitation
```http
POST /api/admin/invitations/{invitationId}/resend
```

**Authorization**: Fandom Admin+

#### Cancel Invitation
```http
DELETE /api/admin/invitations/{invitationId}
```

**Authorization**: Fandom Admin+

### Audit Log Management

#### Get Audit Logs
```http
GET /api/admin/audit
```

**Authorization**: Moderator+ (scoped to accessible events)
**Query Parameters**:
- `action` (optional): Filter by action type
- `actor` (optional): Filter by acting user
- `target` (optional): Filter by target user/resource
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `page` (optional): Page number
- `limit` (optional): Results per page (max 100)

**Response**:
```json
{
  "events": [
    {
      "id": "audit_123",
      "action": "ROLE_ASSIGNED",
      "actor": "admin@example.com",
      "target": "user@example.com",
      "details": {
        "role": "moderator",
        "previousRole": "user"
      },
      "timestamp": "2024-01-20T15:30:00Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1247
  }
}
```

#### Export Audit Logs
```http
GET /api/admin/audit/export
```

**Authorization**: Project Admin+
**Query Parameters**:
- `format`: csv, json, xlsx
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `anonymize` (optional): true/false (GDPR compliance)

**Response**: File download with appropriate content-type

### System Administration

#### Get System Health
```http
GET /api/admin/system/health
```

**Authorization**: Project Admin+

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-21T10:00:00Z",
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "email": "healthy"
  },
  "metrics": {
    "activeUsers": 1250,
    "totalUsers": 5000,
    "systemLoad": 0.45
  }
}
```

#### Get System Configuration
```http
GET /api/admin/system/config
```

**Authorization**: Super Admin only

#### Update System Configuration
```http
PUT /api/admin/system/config
```

**Authorization**: Super Admin only
**Request Body**:
```json
{
  "maxUsers": 10000,
  "invitationExpiryDays": 7,
  "auditRetentionDays": 365
}
```

## Permission System

### Permission Categories

#### User Permissions
- `user.read`: View user information
- `user.write`: Create/update users
- `user.delete`: Delete users
- `user.invite`: Send invitations

#### Role Permissions
- `role.read`: View role information
- `role.assign`: Assign roles to users
- `role.create`: Create new roles
- `role.delete`: Delete roles

#### Content Permissions
- `content.read`: View content
- `content.write`: Create/edit content
- `content.moderate`: Moderate content
- `content.delete`: Delete content

#### Admin Permissions
- `admin.audit.read`: View audit logs
- `admin.audit.export`: Export audit logs
- `admin.system.read`: View system information
- `admin.system.write`: Modify system settings

#### Fandom Permissions
- `fandom.read`: View fandom information
- `fandom.write`: Create/edit fandoms
- `fandom.admin`: Administer fandom
- `fandom.moderate`: Moderate fandom content

### Permission Validation Rules

1. **Hierarchy Enforcement**: Users can only assign roles/permissions at or below their level
2. **Scope Limitation**: Fandom Admins can only manage users within their fandom scope
3. **Permission Inheritance**: Lower roles inherit appropriate permissions from higher roles
4. **Explicit Denial**: Explicit permission denial overrides inheritance

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to perform this action",
    "details": {
      "required": ["admin.users.write"],
      "current": ["admin.users.read"]
    }
  }
}
```

### Common Error Codes

| Code                       | HTTP Status | Description                        |
| -------------------------- | ----------- | ---------------------------------- |
| `INSUFFICIENT_PERMISSIONS` | 403         | User lacks required permissions    |
| `INVALID_ROLE_ASSIGNMENT`  | 400         | Role assignment violates hierarchy |
| `USER_NOT_FOUND`           | 404         | Specified user does not exist      |
| `INVITATION_EXPIRED`       | 400         | Invitation has expired             |
| `RATE_LIMIT_EXCEEDED`      | 429         | Too many requests                  |
| `VALIDATION_ERROR`         | 400         | Input validation failed            |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests/minute
- **User management**: 100 requests/minute
- **Audit log queries**: 50 requests/minute
- **Bulk operations**: 10 requests/minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Window reset timestamp

## Security Considerations

### CSRF Protection
All state-changing operations require CSRF tokens in headers:
```
X-CSRF-Token: <csrf_token>
```

### Content Security Policy
The API enforces strict CSP headers to prevent XSS attacks.

### Input Validation
- Email addresses validated against RFC 5322
- User inputs sanitized to prevent injection attacks
- File uploads scanned for malicious content

### Audit Trail
All administrative actions are logged with:
- Actor identity
- Target resource
- Action performed
- Timestamp and IP address
- Request metadata

## GDPR Compliance

### Data Export
Users can request data export via:
```http
GET /api/admin/users/{userId}/export
```

### Data Deletion
GDPR-compliant deletion with audit trail:
```http
DELETE /api/admin/users/{userId}?reason=gdpr_request
```

### Data Anonymization
Audit logs can be anonymized for export:
```http
GET /api/admin/audit/export?anonymize=true
```