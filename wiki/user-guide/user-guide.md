# Hierarchical Admin System User Guide

## Getting Started

Welcome to the Hierarchical Admin System! This guide will walk you through the features and capabilities available based on your administrative role.

## Understanding Your Role

### Role Hierarchy Overview

```
🔥 Super Admin
├── 🎯 Project Admin
    ├── 🏛️ Fandom Admin
        └── ⚡ Moderator
```

**Your dashboard will display different options based on your role level.**

### What Each Role Can Do

#### 🔥 Super Admin (Full System Access)
- **System Management**: Configure global settings, view system health
- **User Management**: Create, edit, delete any user across all fandoms
- **Role Assignment**: Assign any role to any user
- **Audit Access**: Full access to all audit logs and system metrics
- **Data Management**: Export data, manage retention policies

#### 🎯 Project Admin (Multi-Fandom Management)
- **Cross-Fandom Users**: Manage users across multiple fandoms
- **Role Assignment**: Assign Project Admin, Fandom Admin, and Moderator roles
- **Invitation Management**: Send invitations for any fandom
- **Audit Access**: View audit logs for managed fandoms
- **Bulk Operations**: Perform bulk user operations

#### 🏛️ Fandom Admin (Single Fandom Focus)
- **Fandom Users**: Manage users within your assigned fandom(s)
- **Role Assignment**: Assign Fandom Admin and Moderator roles within scope
- **Content Moderation**: Full moderation capabilities for fandom content
- **Invitation Management**: Invite users to your fandom
- **Audit Access**: View audit logs for your fandom

#### ⚡ Moderator (Content Focus)
- **Content Moderation**: Review and moderate user-generated content
- **User Reports**: Handle user reports and complaints
- **Basic User Info**: View basic user information (limited editing)
- **Audit Access**: View audit logs related to your actions

## Navigation Guide

### Dashboard Layout

```
┌─────────────────────────────────────────┐
│ 📊 Dashboard Header                     │
│ Welcome back, [Your Name] ([Role])     │
├─────────────────────────────────────────┤
│ 🧭 Navigation Menu                     │
│ • User Management                       │
│ • Role Assignment                       │
│ • Invitations                          │
│ • Audit Logs                          │
│ • [Role-specific options]              │
├─────────────────────────────────────────┤
│ 📋 Main Content Area                   │
│ [Selected page content]                │
└─────────────────────────────────────────┘
```

### Quick Actions Bar
Located at the top of most pages:
- **🔍 Search**: Find users, content, or audit events
- **➕ Quick Add**: Rapid user creation or invitation
- **📤 Export**: Download data in various formats
- **🔄 Refresh**: Update current data view

## User Management

### Viewing Users

1. **Navigate to User Management** from the main menu
2. **Use filters** to narrow down the user list:
   - **Role**: Filter by Super Admin, Project Admin, etc.
   - **Status**: Active, Inactive, Pending
   - **Fandom**: (If applicable) Filter by specific fandom
   - **Date Range**: Users created within specific dates

3. **Search functionality**:
   - Search by name, email, or user ID
   - Use quotes for exact matches: `"john doe"`
   - Use wildcards: `john*` for names starting with "john"

### Creating New Users

#### Manual User Creation

1. **Click "Add User"** button
2. **Fill required information**:
   ```
   📧 Email: user@example.com
   👤 Full Name: John Doe
   🎭 Role: [Select appropriate role]
   🏛️ Fandom: [Select if Fandom Admin/Moderator]
   ```
3. **Set permissions** (optional):
   - Use role defaults or customize
   - Add specific permissions as needed
4. **Click "Create User"**

#### Bulk User Import

1. **Click "Bulk Import"** button
2. **Download CSV template**
3. **Fill template** with user data:
   ```csv
   email,name,role,fandom,permissions
   user1@example.com,User One,moderator,harry-potter,"content.moderate,user.read"
   user2@example.com,User Two,moderator,percy-jackson,"content.moderate,user.read"
   ```
4. **Upload filled CSV**
5. **Review import preview**
6. **Confirm import**

### Editing Users

1. **Click on user row** or use the edit button
2. **Available edit options** (based on your role):
   - 📝 Basic Info: Name, email, status
   - 🎭 Role Changes: Assign new roles
   - 🔐 Permissions: Add/remove specific permissions
   - 🏛️ Fandom Assignment: Change fandom association
   - 📅 Account Status: Activate/deactivate account

3. **Save changes** and review audit log entry

### User Status Management

#### Account States
- ✅ **Active**: Full access to assigned areas
- ⏸️ **Inactive**: Temporarily disabled, can be reactivated
- 🔒 **Suspended**: Disciplinary action, requires admin review
- ❌ **Deleted**: Permanently removed (GDPR compliant)

#### Status Change Process
1. **Select user(s)** for status change
2. **Choose new status** from dropdown
3. **Provide reason** (required for suspensions/deletions)
4. **Confirm action** - this creates an audit trail

## Role Assignment

### Understanding Role Hierarchy

**Important**: You can only assign roles at or below your current level.

#### Assignment Rules
- 🔥 **Super Admin**: Can assign any role
- 🎯 **Project Admin**: Can assign Project Admin, Fandom Admin, Moderator
- 🏛️ **Fandom Admin**: Can assign Fandom Admin, Moderator (within fandom)
- ⚡ **Moderator**: Cannot assign roles

### Single Role Assignment

1. **Navigate to Role Assignment** page
2. **Search for user** by name or email
3. **Select new role** from dropdown
4. **Choose scope** (if applicable):
   - For Fandom Admin/Moderator: Select target fandom
   - For Project Admin: Select fandom access permissions
5. **Add justification** (optional but recommended)
6. **Click "Assign Role"**

### Bulk Role Assignment

1. **Navigate to Bulk Operations**
2. **Select users** using:
   - Individual checkboxes
   - "Select All" for current page
   - Filter-based selection
3. **Choose new role** for all selected users
4. **Set common parameters**:
   - Fandom assignment (if applicable)
   - Effective date (optional)
5. **Review selection** and **confirm**

### Role Change Notifications

When roles change, the system automatically:
- 📧 **Emails the user** about their new permissions
- 📝 **Creates audit log entry** with details
- 🔄 **Updates access controls** immediately
- 📊 **Updates dashboard** to reflect new capabilities

## Invitation Management

### Sending Invitations

#### Individual Invitations

1. **Click "Send Invitation"**
2. **Fill invitation details**:
   ```
   📧 Email: newuser@example.com
   🎭 Role: Select appropriate role
   🏛️ Fandom: Choose target fandom (if applicable)
   📝 Message: Personalized welcome message
   📅 Expires: Set expiration (default: 7 days)
   ```
3. **Preview invitation** email
4. **Send invitation**

#### Bulk Invitations

1. **Upload CSV** with invitation data:
   ```csv
   email,role,fandom,message
   user1@example.com,moderator,harry-potter,"Welcome to HP moderation team!"
   user2@example.com,moderator,percy-jackson,"Welcome to PJ moderation team!"
   ```
2. **Review invitation preview**
3. **Set common parameters**:
   - Expiration date
   - Default message template
4. **Send all invitations**

### Managing Invitations

#### Invitation Status Tracking

- ⏳ **Pending**: Sent but not yet responded
- ✅ **Accepted**: User created account successfully
- ❌ **Declined**: User explicitly declined
- ⏰ **Expired**: Invitation time limit exceeded
- 🚫 **Cancelled**: Manually cancelled by admin

#### Invitation Actions

1. **View All Invitations**:
   - Filter by status, date, or invitee
   - Search by email or inviter name

2. **Resend Invitations**:
   - Select expired or pending invitations
   - Update message if needed
   - Extend expiration date

3. **Cancel Invitations**:
   - Select unwanted pending invitations
   - Provide cancellation reason
   - Optional: Block future invitations to same email

## Audit Logs

### Understanding Audit Events

#### Event Categories
- 👤 **User Actions**: Login, logout, profile changes
- 🎭 **Role Changes**: Role assignments, permission updates
- 📝 **Content Actions**: Content creation, editing, deletion
- 🔧 **Admin Actions**: System configuration, user management
- 🚨 **Security Events**: Failed logins, permission violations

#### Event Information
Each audit entry includes:
- **Timestamp**: When the action occurred
- **Actor**: Who performed the action
- **Target**: What/who was affected
- **Action**: Specific action taken
- **Details**: Additional context and data
- **IP Address**: Source of the action
- **User Agent**: Browser/app information

### Viewing Audit Logs

#### Basic Filtering

1. **Select date range**:
   - Quick options: Today, Last Week, Last Month
   - Custom range picker
   - Real-time vs historical data

2. **Filter by event type**:
   - User management events
   - Role assignment events
   - Content moderation events
   - System administration events

3. **Filter by actor**:
   - Your actions only
   - Specific user's actions
   - All admin actions

#### Advanced Search

Use the search bar with operators:
- `action:USER_CREATED` - Find specific action types
- `actor:admin@example.com` - Find actions by specific user
- `target:user@example.com` - Find actions affecting specific user
- `ip:192.168.1.*` - Find actions from IP range

#### Combining Filters
```
action:ROLE_ASSIGNED AND actor:admin@example.com AND date:last-week
```

### Exporting Audit Data

#### Export Options

1. **CSV Format**: Spreadsheet-compatible
   - Good for analysis in Excel
   - Includes all visible columns

2. **JSON Format**: Machine-readable
   - Preserves data structure
   - Good for integrations

3. **PDF Report**: Human-readable
   - Formatted for printing
   - Includes summary statistics

#### Export Process

1. **Apply desired filters** to show only relevant events
2. **Click "Export"** button
3. **Choose format** and options:
   - Include/exclude sensitive data
   - Anonymize user information (GDPR)
   - Add executive summary
4. **Download file** when ready

## Content Moderation

### Moderation Queue

#### Content Types
- 📚 **Stories**: User-submitted fanfiction
- 💬 **Comments**: User comments and reviews
- 🏷️ **Tags**: User-created content tags
- 👤 **Profiles**: User profile information
- 📝 **Forum Posts**: Community discussion posts

#### Review Process

1. **Access Moderation Queue**:
   - Navigate to Content Moderation
   - View items awaiting review
   - Sort by priority, date, or type

2. **Review Content**:
   - Read full content in context
   - Check against community guidelines
   - Review user's history if needed

3. **Take Action**:
   - ✅ **Approve**: Content goes live
   - ❌ **Reject**: Content blocked with reason
   - ✏️ **Edit**: Make minor corrections
   - 🔄 **Request Changes**: Ask user to revise

### Moderation Actions

#### Bulk Moderation

1. **Select multiple items** using checkboxes
2. **Choose bulk action**:
   - Approve all selected
   - Reject all selected
   - Assign to another moderator
3. **Add bulk comment** explaining action
4. **Execute action**

#### User Actions

For problematic users:
- **⚠️ Warning**: Send formal warning
- **⏸️ Timeout**: Temporary posting restriction
- **🔇 Mute**: Prevent commenting
- **🔒 Suspend**: Temporary account suspension
- **❌ Ban**: Permanent account termination

### Moderation Guidelines

#### Content Standards
- **Appropriate Content**: Age-appropriate for target audience
- **Respectful Language**: No harassment, hate speech, or bullying
- **Accurate Tagging**: Content properly tagged and categorized
- **Copyright Compliance**: Respects intellectual property rights

#### Decision Making
1. **Review community guidelines**
2. **Consider context** and user intent
3. **Check precedent** for similar cases
4. **Document reasoning** in moderation notes
5. **Be consistent** with team decisions

## System Administration

*Available for Super Admins and Project Admins*

### System Health Monitoring

#### Dashboard Metrics
- 👥 **Active Users**: Currently online users
- 📊 **System Load**: Server performance metrics
- 💾 **Database Status**: Connection and performance
- 📧 **Email Service**: Delivery status and queue
- 🔄 **Background Jobs**: Task processing status

#### Alerts and Notifications
- **Performance Issues**: High load, slow response times
- **Security Events**: Multiple failed logins, suspicious activity
- **System Errors**: Application errors, service failures
- **Capacity Warnings**: Storage space, user limits

### Configuration Management

#### Global Settings
- **User Limits**: Maximum users per fandom
- **Content Limits**: File sizes, post lengths
- **Security Settings**: Password policies, session timeouts
- **Email Templates**: Customize system emails
- **Feature Flags**: Enable/disable features

#### Fandom Configuration
- **Fandom Creation**: Set up new fandoms
- **Admin Assignment**: Assign fandom administrators
- **Custom Rules**: Fandom-specific guidelines
- **Content Categories**: Available tags and classifications

## Troubleshooting

### Common Issues

#### "Access Denied" Errors
**Problem**: User sees "Insufficient permissions" message
**Solutions**:
1. Verify user's current role and permissions
2. Check if user is assigned to correct fandom
3. Confirm action is within role capabilities
4. Review recent role changes in audit log

#### User Can't Login
**Problem**: Valid user cannot access admin panel
**Solutions**:
1. Check account status (active/inactive)
2. Verify user has admin role assigned
3. Check for recent security events
4. Reset password if needed

#### Missing Users in Lists
**Problem**: Users don't appear in management interface
**Solutions**:
1. Check applied filters and search terms
2. Verify you have permission to view those users
3. Confirm users are in your fandom scope
4. Check if users are in different status category

#### Invitation Not Received
**Problem**: User didn't receive invitation email
**Solutions**:
1. Check spam/junk folder
2. Verify email address spelling
3. Check invitation status (cancelled/expired)
4. Resend invitation with corrected details

### Getting Help

#### Support Channels
- 📧 **Email Support**: admin-support@pensieve-index.com
- 💬 **Live Chat**: Available during business hours
- 📚 **Knowledge Base**: Searchable help articles
- 🎫 **Ticket System**: For complex issues

#### Escalation Process
1. **Document the issue**: Screenshot error messages
2. **Gather context**: What were you trying to do?
3. **Check recent changes**: Any recent role/permission changes?
4. **Contact support**: Provide all gathered information

## Best Practices

### Security Best Practices

#### Account Security
- **Strong Passwords**: Use unique, complex passwords
- **Regular Updates**: Change passwords periodically
- **Secure Devices**: Use admin panel only on trusted devices
- **Safe Networks**: Avoid public Wi-Fi for admin tasks

#### Permission Management
- **Principle of Least Privilege**: Give minimum necessary permissions
- **Regular Reviews**: Audit user permissions quarterly
- **Document Changes**: Always explain role assignments
- **Monitor Activity**: Review audit logs regularly

### Operational Best Practices

#### User Management
- **Consistent Naming**: Use standard format for user names
- **Regular Cleanup**: Remove inactive users periodically
- **Welcome Process**: Standardize new user onboarding
- **Exit Process**: Proper offboarding when users leave

#### Communication
- **Clear Messages**: Write clear invitation messages
- **Timely Responses**: Respond to user requests promptly
- **Documentation**: Keep records of important decisions
- **Team Coordination**: Communicate with other admins

## FAQ

### Role and Permission Questions

**Q: Can I change my own role?**
A: No, role changes must be made by an admin with higher privileges.

**Q: How do I know what permissions a role includes?**
A: Check the role details page or API documentation for complete permission lists.

**Q: Can users have multiple roles?**
A: No, each user has one primary role, but can have additional granular permissions.

### User Management Questions

**Q: How do I permanently delete a user?**
A: Use the delete function with "GDPR request" reason. This removes all personal data permanently.

**Q: Can deleted users be restored?**
A: No, deleted users cannot be restored. Use "inactive" status for temporary restrictions.

**Q: How long do invitations remain valid?**
A: Default is 7 days, but this can be customized per invitation.

### Technical Questions

**Q: Why are my changes not appearing immediately?**
A: Some changes require cache refresh. Wait 1-2 minutes or contact support.

**Q: Can I export all user data?**
A: Yes, but export size is limited. Use filters to export specific subsets.

**Q: How long are audit logs kept?**
A: Default retention is 365 days. Super Admins can configure retention policies.

### Need More Help?

If you can't find the answer to your question:
1. Search the knowledge base
2. Check with other team admins
3. Contact support with specific details
4. Submit a feature request if needed

Remember: When in doubt, it's better to ask than to make assumptions that could affect other users!