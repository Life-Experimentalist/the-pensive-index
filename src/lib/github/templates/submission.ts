/**
 * GitHub Issue Templates for Story Submissions
 *
 * Standardized templates for different types of GitHub issues
 * in the community submission workflow.
 */

// Using any for Phase 3.1 - will be replaced with proper types in Phase 3.2
type SubmissionData = any;
export interface IssueTemplate {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
}

/**
 * Generate story submission issue template
 */
export function createSubmissionTemplate(
  submission: SubmissionData
): IssueTemplate {
  const title = `Story Submission: ${submission.title}`;

  const body = `## 📚 Story Submission

### Basic Information
**Title:** ${submission.title}
**URL:** ${submission.url}
**Source:** ${submission.source}
**Fandom:** ${submission.fandom}

### Content Classification
**Rating:** ${submission.rating || 'Not specified'}
**Word Count:** ${submission.wordCount || 'Unknown'}
**Status:** ${submission.status || 'Unknown'}
**Language:** ${submission.language || 'English'}

### Tags
${
  submission.tags?.length > 0
    ? submission.tags.map((tag: string) => `- \`${tag}\``).join('\n')
    : 'No tags provided'
}

### Plot Blocks
${
  submission.plotBlocks?.length > 0
    ? submission.plotBlocks.map((block: string) => `- **${block}**`).join('\n')
    : 'No plot blocks identified'
}

### Summary
${submission.summary || '*No summary provided*'}

### Characters & Relationships
${
  submission.characters?.length > 0
    ? submission.characters.map((char: string) => `- ${char}`).join('\n')
    : 'Not specified'
}

### Additional Notes
${submission.additionalNotes || '*No additional notes*'}

---

### 📋 Submission Details
**Submitted by:** ${submission.submitterEmail || 'Anonymous'}
**Submission ID:** \`${submission.submissionId}\`
**Submitted:** ${new Date().toISOString()}
**Browser Extension Version:** ${submission.extractorVersion || 'Unknown'}

### ✅ Moderation Checklist
- [ ] Story URL is valid and accessible
- [ ] Title and metadata are accurate
- [ ] Tags follow community guidelines
- [ ] Plot blocks are correctly identified
- [ ] Rating is appropriate
- [ ] No duplicate submission exists
- [ ] Content follows community standards
- [ ] Fandom categorization is correct

### 🔧 Admin Actions
Use the following commands in comments:

**Approval Commands:**
- \`/approve\` - Approve and add to database
- \`/approve-with-changes\` - Approve with minor tag corrections

**Review Commands:**
- \`/request-changes <details>\` - Request changes from submitter
- \`/needs-clarification <question>\` - Ask for clarification
- \`/assign @username\` - Assign to specific moderator

**Rejection Commands:**
- \`/reject duplicate\` - Reject as duplicate
- \`/reject guidelines\` - Reject for guideline violations
- \`/reject invalid\` - Reject as invalid submission
- \`/reject <custom-reason>\` - Reject with custom reason

**Utility Commands:**
- \`/add-label <label>\` - Add additional label
- \`/remove-label <label>\` - Remove label
- \`/priority high\` - Mark as high priority
- \`/cc @username\` - Request review from additional moderator

### 🎯 Quality Score Indicators
- **URL Accessibility:** ⏳ Pending
- **Metadata Completeness:** ⏳ Pending
- **Tag Accuracy:** ⏳ Pending
- **Community Guidelines:** ⏳ Pending
- **Duplicate Check:** ⏳ Pending`;

  const labels = [
    'story-submission',
    'needs-review',
    `source:${submission.source.toLowerCase()}`,
    `fandom:${submission.fandom.toLowerCase().replace(/\s+/g, '-')}`,
  ];

  // Add rating label if provided
  if (submission.rating) {
    labels.push(`rating:${submission.rating.toLowerCase()}`);
  }

  // Add status label if provided
  if (submission.status) {
    labels.push(
      `status:${submission.status.toLowerCase().replace(/\s+/g, '-')}`
    );
  }

  return { title, body, labels };
}

/**
 * Generate template for update notifications
 */
export function createUpdateTemplate(
  originalSubmission: SubmissionData,
  updates: Partial<SubmissionData>,
  moderatorNote?: string
): IssueTemplate {
  const title = `Updated Submission: ${
    updates.title || originalSubmission.title
  }`;

  const changedFields = Object.keys(updates).filter(
    (key: string) => (updates as any)[key] !== (originalSubmission as any)[key]
  );

  const body = `## 🔄 Submission Update

This submission has been updated with the following changes:

### Changed Fields
${changedFields
  .map((field: string) => {
    const oldValue = (originalSubmission as any)[field];
    const newValue = (updates as any)[field];
    return `**${field}:**\n- Old: \`${oldValue}\`\n- New: \`${newValue}\``;
  })
  .join('\n\n')}

${moderatorNote ? `### Moderator Note\n${moderatorNote}` : ''}

### Updated Submission Data
${createSubmissionTemplate({ ...originalSubmission, ...updates }).body}`;

  const labels = ['story-submission', 'updated', 'needs-re-review'];

  return { title, body, labels };
}

/**
 * Generate template for approval notifications
 */
export function createApprovalTemplate(
  submission: SubmissionData,
  approvedBy: string,
  approvalNotes?: string
): string {
  return `## ✅ Submission Approved

This story submission has been approved and added to the database.

**Approved by:** @${approvedBy}
**Approval Date:** ${new Date().toISOString()}
**Database Entry:** Created successfully

${approvalNotes ? `### Approval Notes\n${approvalNotes}` : ''}

### Next Steps
- Story is now available in search results
- Community can discover this story through the pathway builder
- Submitter will be notified of approval

Thank you for contributing to the Pensieve Index! 🎉`;
}

/**
 * Generate template for rejection notifications
 */
export function createRejectionTemplate(
  submission: SubmissionData,
  rejectedBy: string,
  reason: string,
  details?: string
): string {
  return `## ❌ Submission Rejected

This story submission has been rejected.

**Rejected by:** @${rejectedBy}
**Rejection Date:** ${new Date().toISOString()}
**Reason:** ${reason}

${details ? `### Details\n${details}` : ''}

### How to Resubmit
If you believe this rejection was made in error or you've addressed the concerns:

1. Review our [submission guidelines](${
    process.env.NEXT_PUBLIC_SITE_URL
  }/guidelines)
2. Make necessary corrections
3. Submit a new submission through the browser extension
4. Reference this issue number (${
    submission.submissionId
  }) in your new submission

### Appeal Process
If you disagree with this decision, you can appeal by:
- Commenting on this issue with your reasoning
- Contacting moderators through our [Discord server](${
    process.env.DISCORD_INVITE_URL
  })
- Emailing us at moderation@pensieve-index.com`;
}

/**
 * Generate template for change requests
 */
export function createChangeRequestTemplate(
  submission: SubmissionData,
  requestedBy: string,
  changes: string[],
  deadline?: Date
): string {
  return `## 📝 Changes Requested

Moderator @${requestedBy} has requested changes to this submission before it can be approved.

### Required Changes
${changes.map((change, index) => `${index + 1}. ${change}`).join('\n')}

${
  deadline
    ? `### Deadline\nPlease address these changes by **${deadline.toLocaleDateString()}** or the submission may be automatically closed.`
    : ''
}

### How to Update Your Submission
1. Make the necessary changes to your story/metadata on the original platform
2. Use the browser extension to resubmit with the updated information
3. Reference this issue number (${submission.submissionId}) in your resubmission

### Need Help?
If you're unsure about any of these changes:
- Reply to this issue with questions
- Check our [tagging guidelines](${
    process.env.NEXT_PUBLIC_SITE_URL
  }/guidelines/tagging)
- Visit our [Discord community](${process.env.DISCORD_INVITE_URL}) for help

We're here to help you get your story approved! 🙂`;
}

/**
 * Get template based on action type
 */
export function getTemplateForAction(
  action: 'create' | 'update' | 'approve' | 'reject' | 'request-changes',
  submission: SubmissionData,
  metadata?: {
    moderator?: string;
    reason?: string;
    details?: string;
    changes?: string[];
    updates?: Partial<SubmissionData>;
    deadline?: Date;
  }
): IssueTemplate | string {
  switch (action) {
    case 'create':
      return createSubmissionTemplate(submission);

    case 'update':
      return createUpdateTemplate(
        submission,
        metadata?.updates || {},
        metadata?.details
      );

    case 'approve':
      return createApprovalTemplate(
        submission,
        metadata?.moderator || 'system',
        metadata?.details
      );

    case 'reject':
      return createRejectionTemplate(
        submission,
        metadata?.moderator || 'system',
        metadata?.reason || 'Not specified',
        metadata?.details
      );

    case 'request-changes':
      return createChangeRequestTemplate(
        submission,
        metadata?.moderator || 'system',
        metadata?.changes || [],
        metadata?.deadline
      );

    default:
      throw new Error(`Unknown template action: ${action as string}`);
  }
}

// Export commonly used label sets
export const SUBMISSION_LABELS = {
  NEW: ['story-submission', 'needs-review'],
  APPROVED: ['story-submission', 'approved'],
  REJECTED: ['story-submission', 'rejected'],
  CHANGES_REQUESTED: ['story-submission', 'changes-requested'],
  HIGH_PRIORITY: ['story-submission', 'priority-high'],
  DUPLICATE: ['story-submission', 'duplicate'],
  INVALID: ['story-submission', 'invalid'],
} as const;
