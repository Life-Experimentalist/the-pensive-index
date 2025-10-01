# Admin Dashboard Guide

## Overview

The Pensive Index Admin Dashboard provides comprehensive tools for managing the community submission system, including submission queue management, moderation actions, user administration, and system monitoring.

## Getting Started

### Admin Access

1. **Sign In**: Navigate to `/sign-in` and authenticate with your admin account
2. **Dashboard**: Access the admin dashboard at `/admin`
3. **Permissions**: Ensure you have appropriate admin or moderator permissions

### Dashboard Sections

- **Submissions** (`/admin/submissions`): Manage submission queue and moderation
- **Users** (`/admin/users`): User management and role assignment
- **Analytics** (`/admin/analytics`): System performance and usage metrics
- **Settings** (`/admin/settings`): System configuration and preferences

## Submission Queue Management

### Queue Overview

The submission queue displays all pending story submissions with filtering and search capabilities:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Queue Statistics                                         │
│ Pending: 15 | Under Review: 8 | Changes Requested: 3       │
│ Average Review Time: 2.3 days | Oldest Submission: 5 days  │
└─────────────────────────────────────────────────────────────┘
```

### Filtering Options

#### Status Filters
- **Pending**: New submissions awaiting assignment
- **Under Review**: Submissions assigned to moderators
- **Changes Requested**: Submissions requiring submitter updates
- **All**: View submissions across all states

#### Priority Filters
- **Urgent**: High-priority submissions requiring immediate attention
- **High**: Important submissions with elevated priority
- **Normal**: Standard priority submissions
- **Low**: Lower priority submissions

#### Additional Filters
- **Assigned Moderator**: Filter by specific moderator
- **Fandom**: Filter by story fandom
- **Date Range**: Filter by submission date
- **Search**: Text search across title, author, and description

### Queue Actions

#### Individual Actions
```
For each submission in the queue:

┌─────────────────────────────────────────────────────────────┐
│ 📖 "The Time Turner's Dilemma"                             │
│ 👤 Author: J.K.Rowling2024 | 🏷️ Fandom: Harry Potter      │
│ 📅 Submitted: 2024-01-15 | ⏰ Queue Position: #3          │
│ 🎯 Priority: Normal | 👨‍💼 Assigned: unassigned            │
│                                                             │
│ [View Details] [Assign] [Change Priority] [Add Flag]       │
└─────────────────────────────────────────────────────────────┘
```

#### Batch Operations
- **Bulk Assignment**: Assign multiple submissions to moderators
- **Priority Updates**: Change priority for multiple submissions
- **Batch Actions**: Perform actions on selected submissions

## Moderation Workflow

### Submission Review Process

1. **Open Submission**: Click on submission card to view details
2. **Review Content**: Examine story information, tags, and metadata
3. **Check Guidelines**: Verify compliance with submission guidelines
4. **Make Decision**: Approve, reject, or request changes
5. **Add Notes**: Provide feedback for decision rationale

### Moderation Actions

#### Approval Process
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ APPROVE SUBMISSION                                       │
│                                                             │
│ Approval Note (Optional):                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ High-quality submission with excellent tagging.         │ │
│ │ Story metadata is accurate and complete.                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Actions:                                                    │
│ ✓ Close GitHub issue                                        │
│ ✓ Send approval email to submitter                         │
│ ✓ Add to story database                                     │
│                                                             │
│ [Confirm Approval] [Cancel]                                │
└─────────────────────────────────────────────────────────────┘
```

#### Rejection Process
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ REJECT SUBMISSION                                        │
│                                                             │
│ Rejection Reason:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▼ Insufficient Tags                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Additional Notes:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Please add more specific character and relationship     │ │
│ │ tags. Current tags are too general for discovery.      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Options:                                                    │
│ ☑ Allow resubmission                                       │
│ ☑ Send feedback email                                      │
│ ☐ Block future submissions from this user                  │
│                                                             │
│ [Confirm Rejection] [Cancel]                               │
└─────────────────────────────────────────────────────────────┘
```

#### Changes Request Process
```
┌─────────────────────────────────────────────────────────────┐
│ 🔄 REQUEST CHANGES                                          │
│                                                             │
│ Requested Changes:                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Add content warnings for violence                     │ │
│ │ ☑ Include character age tags                            │ │
│ │ ☑ Verify story completion status                        │ │
│ │ ☑ Add more specific genre tags                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Additional Instructions:                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Please review the tagging guidelines and update your    │ │
│ │ submission accordingly. Feel free to reach out if you  │ │
│ │ have questions about appropriate tags.                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Request Changes] [Cancel]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Moderator Assignment

#### Assignment Process
1. **Select Submission**: Choose unassigned submission
2. **Choose Moderator**: Select from available moderators
3. **Set Priority**: Adjust priority if needed
4. **Add Notes**: Include assignment rationale
5. **Confirm Assignment**: Notify moderator via email

#### Workload Management
```
┌─────────────────────────────────────────────────────────────┐
│ 👥 MODERATOR WORKLOAD OVERVIEW                             │
│                                                             │
│ Alice Johnson    │ Assigned: 5  │ Completed Today: 3      │
│ Bob Smith        │ Assigned: 3  │ Completed Today: 5      │
│ Carol Davis      │ Assigned: 7  │ Completed Today: 2      │
│ David Wilson     │ Assigned: 2  │ Completed Today: 4      │
│                                                             │
│ Recommended Assignment: Bob Smith (lowest current load)     │
└─────────────────────────────────────────────────────────────┘
```

## User Management

### Admin Users

#### User Roles
- **Super Admin**: Full system access and configuration
- **Admin**: User management and system administration
- **Moderator**: Submission review and moderation
- **User**: Basic access (community members)

#### Permission Management
```
┌─────────────────────────────────────────────────────────────┐
│ 👤 USER PERMISSIONS: Alice Johnson                         │
│                                                             │
│ Role: Admin                                                 │
│                                                             │
│ Permissions:                                                │
│ ☑ moderate_submissions    │ ☑ assign_moderators            │
│ ☑ manage_users           │ ☑ view_analytics               │
│ ☑ system_configuration   │ ☐ delete_submissions           │
│                                                             │
│ Active Since: 2024-01-15                                   │
│ Last Login: 2 hours ago                                    │
│                                                             │
│ [Save Changes] [Deactivate User] [Reset Password]          │
└─────────────────────────────────────────────────────────────┘
```

#### User Creation Process
1. **Invite User**: Send invitation email
2. **Set Role**: Assign appropriate role and permissions
3. **Configure Access**: Set fandom assignments if applicable
4. **Account Activation**: User completes setup via email

### Moderator Management

#### Fandom Assignments
- Assign moderators to specific fandoms for specialization
- Balance workload across available moderators
- Track expertise and performance metrics

#### Performance Tracking
```
Moderator Performance Metrics:
┌─────────────────────────────────────────────────────────────┐
│ Alice Johnson (Harry Potter Specialist)                    │
│                                                             │
│ This Month:                                                 │
│ • Submissions Reviewed: 45                                  │
│ • Average Review Time: 1.2 days                           │
│ • Approval Rate: 78%                                       │
│ • User Satisfaction: 4.8/5                                │
│                                                             │
│ Strengths: Thorough reviews, excellent feedback            │
│ Areas for Improvement: Could improve review speed          │
└─────────────────────────────────────────────────────────────┘
```

## Analytics and Reporting

### Dashboard Metrics

#### System Overview
- **Total Submissions**: Historical and current counts
- **Processing Times**: Average review and approval times
- **Moderator Performance**: Individual and team metrics
- **User Engagement**: Submission trends and patterns

#### Performance Monitoring
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 SYSTEM PERFORMANCE (Last 24 Hours)                      │
│                                                             │
│ API Response Times:                                         │
│ • Average: 245ms                                           │
│ • 95th Percentile: 890ms                                   │
│ • Slowest Endpoint: /api/admin/queue (1.2s)               │
│                                                             │
│ Database Performance:                                       │
│ • Query Count: 15,420                                      │
│ • Cache Hit Rate: 87%                                      │
│ • Slow Queries: 3 (>5s)                                   │
│                                                             │
│ Extension Usage:                                            │
│ • Active Users: 234                                        │
│ • Submissions: 18                                          │
│ • Parse Success Rate: 94%                                  │
└─────────────────────────────────────────────────────────────┘
```

### Custom Reports

#### Submission Reports
- **Weekly Summary**: Submission volumes and outcomes
- **Moderator Performance**: Individual performance metrics
- **Fandom Analysis**: Popular fandoms and trends
- **Quality Metrics**: Approval rates and feedback analysis

#### Export Options
- **CSV Export**: Raw data for external analysis
- **PDF Reports**: Formatted reports for stakeholders
- **API Access**: Programmatic access to metrics
- **Dashboard Widgets**: Embeddable metrics displays

## System Administration

### Configuration Management

#### Global Settings
```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ SYSTEM CONFIGURATION                                     │
│                                                             │
│ Submission Settings:                                        │
│ • Max Queue Size: 100 submissions                          │
│ • Auto-assignment: Enabled                                 │
│ • Priority Boost Days: 7                                   │
│                                                             │
│ Email Notifications:                                        │
│ • Admin Alerts: Enabled                                    │
│ • User Confirmations: Enabled                              │
│ • Daily Digest: Enabled                                    │
│                                                             │
│ Performance:                                                │
│ • Cache TTL: 15 minutes                                    │
│ • Rate Limiting: 100 req/min                              │
│ • Background Processing: Enabled                           │
│                                                             │
│ [Save Configuration]                                        │
└─────────────────────────────────────────────────────────────┘
```

#### Integration Settings
- **GitHub Configuration**: Repository and webhook settings
- **Email Service**: SMTP configuration and templates
- **Extension Settings**: Supported sites and parsing rules
- **Cache Configuration**: Redis settings and TTL values

### Maintenance Tasks

#### Regular Maintenance
- **Database Optimization**: Index rebuilding and cleanup
- **Cache Management**: Memory usage and eviction policies
- **Log Rotation**: System and audit log management
- **Backup Procedures**: Data backup and recovery processes

#### Troubleshooting
- **Service Health**: Monitor service status and connectivity
- **Error Logs**: Review application and system errors
- **Performance Issues**: Identify and resolve bottlenecks
- **User Issues**: Handle user-reported problems

## Best Practices

### Moderation Guidelines

#### Review Standards
1. **Completeness**: Verify all required fields are present
2. **Accuracy**: Confirm story information matches source
3. **Tagging**: Ensure appropriate and comprehensive tags
4. **Guidelines**: Check compliance with community standards
5. **Quality**: Assess overall submission quality

#### Communication Standards
- **Professional Tone**: Maintain respectful communication
- **Clear Feedback**: Provide specific, actionable feedback
- **Timely Response**: Review submissions within SLA timeframes
- **Constructive Criticism**: Focus on improvement opportunities

### Performance Optimization

#### Queue Management
- **Regular Review**: Monitor queue size and age
- **Load Balancing**: Distribute work evenly among moderators
- **Priority Management**: Ensure urgent items receive attention
- **Process Improvement**: Continuously optimize workflows

#### System Monitoring
- **Proactive Monitoring**: Watch for performance degradation
- **Alert Management**: Respond promptly to system alerts
- **Capacity Planning**: Monitor growth and scale accordingly
- **User Feedback**: Incorporate user suggestions for improvement

## Troubleshooting

### Common Issues

#### Queue Problems
- **Slow Loading**: Check database performance and indexing
- **Filter Issues**: Verify filter logic and caching
- **Assignment Problems**: Check moderator availability
- **Notification Failures**: Verify email service configuration

#### Performance Issues
- **Slow API Responses**: Monitor database queries and caching
- **High Memory Usage**: Check cache size and cleanup processes
- **Extension Problems**: Verify site parser functionality
- **GitHub Integration**: Check webhook configuration and rate limits

### Support Resources

#### Documentation
- **API Documentation**: Complete API reference and examples
- **User Guides**: Step-by-step instructions for common tasks
- **Troubleshooting Guides**: Solutions for common problems
- **FAQ**: Frequently asked questions and answers

#### Contact Information
- **Technical Support**: support@pensiveindex.com
- **Emergency Contact**: For critical system issues
- **Community Forums**: User discussion and peer support
- **GitHub Issues**: Bug reports and feature requests