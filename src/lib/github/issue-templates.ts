/**
 * T035: GitHub Issue Templates System
 *
 * Comprehensive issue template generation system for community submission workflow
 * with YAML frontmatter, Markdown formatting, moderation checklists, and versioning
 */

import {
  StorySubmission,
  SubmissionStatus,
  QueuePriority,
  QueueComplexity,
} from '../../types/submission';
import { StoryMetadata } from '../../types/submission';

// Template configuration and versioning
export interface TemplateConfig {
  version: string;
  lastUpdated: string;
  author: string;
  description: string;
}

export interface IssueTemplateData {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
  milestone?: string;
  templateConfig: TemplateConfig;
}

// Enhanced template options
export interface TemplateOptions {
  includeModeratorChecklist?: boolean;
  includeTagSuggestions?: boolean;
  includeQualityMetrics?: boolean;
  includeDuplicateCheck?: boolean;
  includeContentWarnings?: boolean;
  fandomSpecificGuidelines?: string;
  priority?: QueuePriority;
  complexity?: QueueComplexity;
  customInstructions?: string;
}

/**
 * Main Issue Template Generator
 */
export class GitHubIssueTemplates {
  private static readonly TEMPLATE_VERSION = '2.1.0';
  private static readonly LAST_UPDATED = '2024-01-01';

  /**
   * Generate story submission issue template with YAML frontmatter
   */
  static createSubmissionIssue(
    submission: StorySubmission,
    metadata: StoryMetadata,
    options: TemplateOptions = {}
  ): IssueTemplateData {
    const templateConfig: TemplateConfig = {
      version: this.TEMPLATE_VERSION,
      lastUpdated: this.LAST_UPDATED,
      author: 'Pensieve Index Community System',
      description: 'Story submission for community moderation review',
    };

    const title = this.generateSubmissionTitle(submission, metadata);
    const yamlFrontmatter = this.generateYAMLFrontmatter(
      submission,
      metadata,
      options
    );
    const body = this.generateSubmissionBody(submission, metadata, options);
    const labels = this.generateSubmissionLabels(submission, metadata, options);

    return {
      title,
      body: yamlFrontmatter + '\n---\n\n' + body,
      labels,
      templateConfig,
    };
  }

  /**
   * Generate moderation review template for admin use
   */
  static createModerationReviewTemplate(
    submission: StorySubmission,
    moderatorId: string,
    options: TemplateOptions = {}
  ): IssueTemplateData {
    const templateConfig: TemplateConfig = {
      version: this.TEMPLATE_VERSION,
      lastUpdated: this.LAST_UPDATED,
      author: 'Pensieve Index Moderation System',
      description: 'Moderation review checklist and decision template',
    };

    const title = `[REVIEW] ${submission.storyTitle} - Assigned to Moderator`;
    const body = this.generateModerationReviewBody(
      submission,
      moderatorId,
      options
    );
    const labels = this.generateModerationLabels(submission, options);

    return {
      title,
      body,
      labels,
      assignees: [moderatorId],
      templateConfig,
    };
  }

  /**
   * Generate duplicate detection template
   */
  static createDuplicateDetectionTemplate(
    submission: StorySubmission,
    potentialDuplicates: Array<{
      id: string;
      title: string;
      similarity: number;
      url: string;
    }>,
    options: TemplateOptions = {}
  ): IssueTemplateData {
    const templateConfig: TemplateConfig = {
      version: this.TEMPLATE_VERSION,
      lastUpdated: this.LAST_UPDATED,
      author: 'Pensieve Index Duplicate Detection System',
      description: 'Potential duplicate story detection for manual review',
    };

    const title = `[DUPLICATE CHECK] ${submission.storyTitle} - Manual Review Required`;
    const body = this.generateDuplicateDetectionBody(
      submission,
      potentialDuplicates,
      options
    );
    const labels = [
      'duplicate-check',
      'needs-manual-review',
      `fandom:${submission.fandomId}`,
    ];

    return {
      title,
      body,
      labels,
      templateConfig,
    };
  }

  /**
   * Generate quality review template for complex submissions
   */
  static createQualityReviewTemplate(
    submission: StorySubmission,
    qualityScore: number,
    qualityMetrics: Record<string, number>,
    options: TemplateOptions = {}
  ): IssueTemplateData {
    const templateConfig: TemplateConfig = {
      version: this.TEMPLATE_VERSION,
      lastUpdated: this.LAST_UPDATED,
      author: 'Pensieve Index Quality System',
      description: 'Quality assessment and improvement recommendations',
    };

    const title = `[QUALITY] ${submission.storyTitle} - Score: ${qualityScore}/100`;
    const body = this.generateQualityReviewBody(
      submission,
      qualityScore,
      qualityMetrics,
      options
    );
    const labels = this.generateQualityLabels(
      submission,
      qualityScore,
      options
    );

    return {
      title,
      body,
      labels,
      templateConfig,
    };
  }

  // Private helper methods

  private static generateSubmissionTitle(
    submission: StorySubmission,
    metadata: StoryMetadata
  ): string {
    const fandomPrefix = submission.fandomId
      ? `[${submission.fandomId.toUpperCase()}]`
      : '[UNKNOWN]';
    const statusPrefix =
      submission.status === 'pending'
        ? '[NEW]'
        : `[${(submission.status || 'UNKNOWN').toUpperCase()}]`;
    const truncatedTitle =
      submission.storyTitle.length > 80
        ? submission.storyTitle.substring(0, 77) + '...'
        : submission.storyTitle;

    return `${statusPrefix} ${fandomPrefix} ${truncatedTitle}`;
  }

  private static generateYAMLFrontmatter(
    submission: StorySubmission,
    metadata: StoryMetadata,
    options: TemplateOptions
  ): string {
    const yamlData = {
      submission_id: submission.id,
      title: submission.storyTitle,
      author: submission.authorName,
      fandom: submission.fandomId,
      url: submission.storyUrl,
      status: submission.status,
      submitted_at: submission.submittedAt,
      priority: options.priority || 'normal',
      complexity: options.complexity || 'simple',
      word_count: metadata.wordCount || 0,
      chapter_count: metadata.chapterCount || 1,
      completion_status: metadata.completionStatus || 'unknown',
      rating: metadata.rating || 'not-rated',
      language: metadata.language || 'English',
      tags: submission.tags || [],
      moderator_assigned: null,
      review_deadline: null,
      template_version: this.TEMPLATE_VERSION,
    };

    const yamlLines = Object.entries(yamlData).map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return `${key}: []`;
        }
        return `${key}:\n${value.map(item => `  - "${item}"`).join('\n')}`;
      }
      if (value === null) {
        return `${key}: null`;
      }
      if (typeof value === 'string') {
        return `${key}: "${value}"`;
      }
      if (value instanceof Date) {
        return `${key}: "${value.toISOString()}"`;
      }
      return `${key}: ${String(value)}`;
    });

    return '---\n' + yamlLines.join('\n') + '\n---';
  }

  private static generateSubmissionBody(
    submission: StorySubmission,
    metadata: StoryMetadata,
    options: TemplateOptions
  ): string {
    let body = `# 📚 Story Submission Review\n\n`;

    // Basic Information Section
    body += `## 📋 Basic Information\n\n`;
    body += `| Field | Value |\n`;
    body += `|-------|-------|\n`;
    body += `| **Title** | ${submission.storyTitle} |\n`;
    body += `| **Author** | ${submission.authorName} |\n`;
    body += `| **Fandom** | ${submission.fandomId || 'Unknown'} |\n`;
    body += `| **Story URL** | [View Story](${submission.storyUrl}) |\n`;
    body += `| **Submitted At** | ${
      submission.submittedAt
        ? new Date(submission.submittedAt).toLocaleString()
        : 'Unknown'
    } |\n`;
    body += `| **Submitter** | ${
      submission.submitterUserId || 'Anonymous'
    } |\n\n`;

    // Story Metadata Section
    body += `## 📖 Story Metadata\n\n`;
    body += `| Metric | Value |\n`;
    body += `|--------|-------|\n`;
    body += `| **Word Count** | ${
      metadata.wordCount?.toLocaleString() || 'Unknown'
    } |\n`;
    body += `| **Chapters** | ${metadata.chapterCount || 'Unknown'} |\n`;
    body += `| **Completion Status** | ${
      metadata.completionStatus || 'Unknown'
    } |\n`;
    body += `| **Rating** | ${metadata.rating || 'Not Specified'} |\n`;
    body += `| **Language** | ${metadata.language || 'English'} |\n`;
    body += `| **Last Updated** | ${
      metadata.lastUpdateDate?.toLocaleDateString() || 'Unknown'
    } |\n\n`;

    // Summary Section
    if (submission.summary || metadata.summary) {
      body += `## 📝 Summary\n\n`;
      body += `> ${submission.summary || metadata.summary}\n\n`;
    }

    // Tags Section
    if (submission.tags && submission.tags.length > 0) {
      body += `## 🏷️ Tags\n\n`;
      submission.tags.forEach(tag => {
        body += `- \`${tag}\`\n`;
      });
      body += `\n`;
    }

    // Content Warnings Section
    if (
      options.includeContentWarnings &&
      metadata.warnings &&
      metadata.warnings.length > 0
    ) {
      body += `## ⚠️ Content Warnings\n\n`;
      metadata.warnings.forEach(warning => {
        body += `- ⚠️ ${warning}\n`;
      });
      body += `\n`;
    }

    // Relationships and Characters
    if (metadata.relationships || metadata.characters) {
      body += `## 👥 Characters & Relationships\n\n`;

      if (metadata.relationships && metadata.relationships.length > 0) {
        body += `### Relationships\n`;
        metadata.relationships.forEach(rel => {
          body += `- 💕 ${rel}\n`;
        });
        body += `\n`;
      }

      if (metadata.characters && metadata.characters.length > 0) {
        body += `### Characters\n`;
        metadata.characters.forEach(char => {
          body += `- 👤 ${char}\n`;
        });
        body += `\n`;
      }
    }

    // Additional Tags
    if (metadata.additionalTags && metadata.additionalTags.length > 0) {
      body += `## 🔖 Additional Tags\n\n`;
      metadata.additionalTags.forEach(tag => {
        body += `- \`${tag}\`\n`;
      });
      body += `\n`;
    }

    // Moderation Checklist
    if (options.includeModeratorChecklist) {
      body += this.generateModerationChecklist(submission, options);
    }

    // Tag Suggestions
    if (options.includeTagSuggestions) {
      body += this.generateTagSuggestionsSection(submission, options);
    }

    // Quality Metrics
    if (options.includeQualityMetrics) {
      body += this.generateQualityMetricsSection(submission, options);
    }

    // Duplicate Check
    if (options.includeDuplicateCheck) {
      body += this.generateDuplicateCheckSection(submission, options);
    }

    // Fandom-specific Guidelines
    if (options.fandomSpecificGuidelines) {
      body += `## 📋 Fandom-Specific Guidelines\n\n`;
      body += `${options.fandomSpecificGuidelines}\n\n`;
    }

    // Custom Instructions
    if (options.customInstructions) {
      body += `## 📄 Custom Instructions\n\n`;
      body += `${options.customInstructions}\n\n`;
    }

    // Footer
    body += `---\n\n`;
    body += `*This issue was auto-generated by the Pensieve Index Community System v${this.TEMPLATE_VERSION}*\n`;
    body += `*Template last updated: ${this.LAST_UPDATED}*`;

    return body;
  }

  private static generateModerationChecklist(
    submission: StorySubmission,
    options: TemplateOptions
  ): string {
    let checklist = `## ✅ Moderation Checklist\n\n`;
    checklist += `### Content Review\n`;
    checklist += `- [ ] Story URL is accessible and valid\n`;
    checklist += `- [ ] Content matches provided metadata\n`;
    checklist += `- [ ] Fandom classification is accurate\n`;
    checklist += `- [ ] Tags are appropriate and complete\n`;
    checklist += `- [ ] Content warnings are adequate\n`;
    checklist += `- [ ] Rating is appropriate for content\n\n`;

    checklist += `### Quality Assessment\n`;
    checklist += `- [ ] Story meets minimum quality standards\n`;
    checklist += `- [ ] Summary is informative and accurate\n`;
    checklist += `- [ ] Metadata is complete and correct\n`;
    checklist += `- [ ] Story is not abandoned or discontinued\n\n`;

    checklist += `### Community Standards\n`;
    checklist += `- [ ] Content follows community guidelines\n`;
    checklist += `- [ ] No copyright violations detected\n`;
    checklist += `- [ ] Appropriate for intended audience\n`;
    checklist += `- [ ] Respectful of source material\n\n`;

    checklist += `### Technical Validation\n`;
    checklist += `- [ ] No duplicate submissions detected\n`;
    checklist += `- [ ] Extraction completed successfully\n`;
    checklist += `- [ ] All required fields populated\n`;
    checklist += `- [ ] No technical issues identified\n\n`;

    checklist += `### Final Decision\n`;
    checklist += `- [ ] **APPROVE** - Story meets all criteria\n`;
    checklist += `- [ ] **REQUEST CHANGES** - Minor issues to address\n`;
    checklist += `- [ ] **REJECT** - Does not meet standards\n\n`;

    return checklist;
  }

  private static generateTagSuggestionsSection(
    submission: StorySubmission,
    options: TemplateOptions
  ): string {
    let section = `## 🤖 AI Tag Suggestions\n\n`;
    section += `*These tags were automatically suggested based on story content analysis:*\n\n`;
    section += `### Recommended Tags\n`;
    section += `- [ ] Add suggested character tags\n`;
    section += `- [ ] Add suggested relationship tags\n`;
    section += `- [ ] Add suggested genre tags\n`;
    section += `- [ ] Add suggested trope tags\n\n`;
    section += `### Tag Review Notes\n`;
    section += `*Moderator notes about tag accuracy and completeness:*\n\n`;
    section += `[Add notes here]\n\n`;
    return section;
  }

  private static generateQualityMetricsSection(
    submission: StorySubmission,
    options: TemplateOptions
  ): string {
    let section = `## 📊 Quality Metrics\n\n`;
    section += `### Automated Quality Assessment\n`;
    section += `| Metric | Score | Status |\n`;
    section += `|--------|-------|--------|\n`;
    section += `| **Overall Quality** | TBD/100 | 🔄 Pending |\n`;
    section += `| **Metadata Completeness** | TBD/100 | 🔄 Pending |\n`;
    section += `| **Tag Accuracy** | TBD/100 | 🔄 Pending |\n`;
    section += `| **Content Analysis** | TBD/100 | 🔄 Pending |\n\n`;
    section += `### Quality Review Notes\n`;
    section += `*Manual quality assessment notes:*\n\n`;
    section += `[Add notes here]\n\n`;
    return section;
  }

  private static generateDuplicateCheckSection(
    submission: StorySubmission,
    options: TemplateOptions
  ): string {
    let section = `## 🔍 Duplicate Detection\n\n`;
    section += `### Automated Duplicate Check\n`;
    section += `- [ ] URL similarity check completed\n`;
    section += `- [ ] Title similarity check completed\n`;
    section += `- [ ] Content fingerprint check completed\n`;
    section += `- [ ] Author cross-reference check completed\n\n`;
    section += `### Duplicate Check Results\n`;
    section += `*Results will be populated automatically:*\n\n`;
    section += `[Results pending]\n\n`;
    return section;
  }

  private static generateModerationReviewBody(
    submission: StorySubmission,
    moderatorId: string,
    options: TemplateOptions
  ): string {
    let body = `# 🛡️ Moderation Review Assignment\n\n`;
    body += `**Moderator:** @${moderatorId}\n`;
    body += `**Submission:** ${submission.storyTitle}\n`;
    body += `**Priority:** ${options.priority || 'normal'}\n`;
    body += `**Complexity:** ${options.complexity || 'simple'}\n\n`;

    body += this.generateModerationChecklist(submission, options);

    body += `## 📝 Review Notes\n\n`;
    body += `*Please provide detailed notes about your review process and decision:*\n\n`;
    body += `### Decision Rationale\n`;
    body += `[Explain your decision here]\n\n`;
    body += `### Feedback for Submitter\n`;
    body += `[Feedback to be sent to submitter]\n\n`;
    body += `### Internal Notes\n`;
    body += `[Internal notes for other moderators]\n\n`;

    return body;
  }

  private static generateDuplicateDetectionBody(
    submission: StorySubmission,
    potentialDuplicates: Array<{
      id: string;
      title: string;
      similarity: number;
      url: string;
    }>,
    options: TemplateOptions
  ): string {
    let body = `# 🔍 Duplicate Detection Alert\n\n`;
    body += `**Story:** ${submission.storyTitle}\n`;
    body += `**URL:** ${submission.storyUrl}\n\n`;

    if (potentialDuplicates.length > 0) {
      body += `## ⚠️ Potential Duplicates Found\n\n`;
      body += `| Similarity | Title | URL |\n`;
      body += `|------------|-------|-----|\n`;
      potentialDuplicates.forEach(dup => {
        body += `| ${Math.round(dup.similarity * 100)}% | ${
          dup.title
        } | [View](${dup.url}) |\n`;
      });
      body += `\n`;
    }

    body += `## 🔍 Manual Review Required\n\n`;
    body += `- [ ] Compare story content manually\n`;
    body += `- [ ] Verify author identity\n`;
    body += `- [ ] Check publication dates\n`;
    body += `- [ ] Confirm URL differences\n\n`;

    body += `## 🎯 Resolution\n\n`;
    body += `- [ ] **NOT A DUPLICATE** - Continue with normal review\n`;
    body += `- [ ] **CONFIRMED DUPLICATE** - Reject submission\n`;
    body += `- [ ] **UNCLEAR** - Escalate to senior moderator\n\n`;

    return body;
  }

  private static generateQualityReviewBody(
    submission: StorySubmission,
    qualityScore: number,
    qualityMetrics: Record<string, number>,
    options: TemplateOptions
  ): string {
    let body = `# 📊 Quality Assessment Report\n\n`;
    body += `**Story:** ${submission.storyTitle}\n`;
    body += `**Overall Score:** ${qualityScore}/100\n\n`;

    body += `## 📈 Quality Metrics Breakdown\n\n`;
    body += `| Metric | Score | Weight |\n`;
    body += `|--------|-------|--------|\n`;
    Object.entries(qualityMetrics).forEach(([metric, score]) => {
      body += `| ${metric} | ${score}/100 | Standard |\n`;
    });
    body += `\n`;

    body += `## 💡 Improvement Recommendations\n\n`;
    if (qualityScore < 60) {
      body += `### 🔴 Major Issues Identified\n`;
      body += `- [ ] Review content quality and completeness\n`;
      body += `- [ ] Verify metadata accuracy\n`;
      body += `- [ ] Consider rejection if standards not met\n\n`;
    } else if (qualityScore < 80) {
      body += `### 🟡 Minor Issues Identified\n`;
      body += `- [ ] Request improvements to metadata\n`;
      body += `- [ ] Suggest additional tags\n`;
      body += `- [ ] Provide feedback to submitter\n\n`;
    } else {
      body += `### 🟢 High Quality Submission\n`;
      body += `- [ ] Consider for featured content\n`;
      body += `- [ ] Fast-track approval recommended\n`;
      body += `- [ ] Use as quality example\n\n`;
    }

    return body;
  }

  private static generateSubmissionLabels(
    submission: StorySubmission,
    metadata: StoryMetadata,
    options: TemplateOptions
  ): string[] {
    const labels: string[] = ['submission', 'needs-review'];

    // Fandom label
    if (submission.fandomId) {
      labels.push(`fandom:${submission.fandomId}`);
    }

    // Status labels
    labels.push(`status:${submission.status}`);

    // Priority labels
    if (options.priority) {
      labels.push(`priority:${options.priority}`);
    }

    // Complexity labels
    if (options.complexity) {
      labels.push(`complexity:${options.complexity}`);
    }

    // Content labels
    if (metadata.rating) {
      labels.push(`rating:${metadata.rating.toLowerCase()}`);
    }

    if (metadata.completionStatus) {
      labels.push(`completion:${metadata.completionStatus}`);
    }

    // Quality indicator labels
    if (metadata.wordCount) {
      if (metadata.wordCount > 100000) {
        labels.push('length:long');
      } else if (metadata.wordCount > 50000) {
        labels.push('length:medium');
      } else {
        labels.push('length:short');
      }
    }

    return labels;
  }

  private static generateModerationLabels(
    submission: StorySubmission,
    options: TemplateOptions
  ): string[] {
    const labels: string[] = ['moderation', 'assigned'];

    if (submission.fandomId) {
      labels.push(`fandom:${submission.fandomId}`);
    }

    if (options.priority) {
      labels.push(`priority:${options.priority}`);
    }

    if (options.complexity) {
      labels.push(`complexity:${options.complexity}`);
    }

    return labels;
  }

  private static generateQualityLabels(
    submission: StorySubmission,
    qualityScore: number,
    options: TemplateOptions
  ): string[] {
    const labels: string[] = ['quality-review'];

    if (submission.fandomId) {
      labels.push(`fandom:${submission.fandomId}`);
    }

    if (qualityScore < 60) {
      labels.push('quality:low');
    } else if (qualityScore < 80) {
      labels.push('quality:medium');
    } else {
      labels.push('quality:high');
    }

    return labels;
  }
}

// Utility functions for template management

/**
 * Template versioning and compatibility
 */
export class TemplateVersionManager {
  static isCompatible(templateVersion: string, systemVersion: string): boolean {
    const [tMajor, tMinor] = templateVersion.split('.').map(Number);
    const [sMajor, sMinor] = systemVersion.split('.').map(Number);

    // Compatible if major version matches and minor version is <= system version
    return tMajor === sMajor && tMinor <= sMinor;
  }

  static upgradeTemplate(
    oldTemplate: string,
    fromVersion: string,
    toVersion: string
  ): string {
    // Template migration logic would go here
    // For now, return the template as-is
    return oldTemplate;
  }
}

/**
 * Label management utilities
 */
export class LabelManager {
  static readonly STANDARD_LABELS = {
    STATUS: [
      'submission',
      'needs-review',
      'under-review',
      'approved',
      'rejected',
    ],
    PRIORITY: [
      'priority:low',
      'priority:normal',
      'priority:high',
      'priority:urgent',
    ],
    COMPLEXITY: [
      'complexity:simple',
      'complexity:moderate',
      'complexity:complex',
    ],
    QUALITY: ['quality:low', 'quality:medium', 'quality:high'],
    CONTENT: ['content:sfw', 'content:nsfw', 'content:warning'],
    LENGTH: ['length:short', 'length:medium', 'length:long'],
  };

  static validateLabels(labels: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    const allValidLabels = Object.values(this.STANDARD_LABELS).flat();

    labels.forEach(label => {
      // Check for fandom labels (pattern: fandom:*)
      if (label.startsWith('fandom:')) {
        valid.push(label);
      }
      // Check for status labels (pattern: status:*)
      else if (label.startsWith('status:')) {
        valid.push(label);
      }
      // Check standard labels
      else if (allValidLabels.includes(label)) {
        valid.push(label);
      } else {
        invalid.push(label);
      }
    });

    return { valid, invalid };
  }
}
