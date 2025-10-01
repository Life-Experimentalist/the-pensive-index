/**
 * T035 Contract Test: GitHub Issue Templates
 *
 * Tests for comprehensive GitHub issue template generation system
 * including YAML frontmatter, Markdown formatting, and label management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GitHubIssueTemplates,
  LabelManager,
  TemplateVersionManager,
} from '../../../src/lib/github/issue-templates';
import type {
  StorySubmission,
  StoryMetadata,
  TemplateOptions,
} from '../../../src/types/submission';

describe('T035 Contract: GitHub Issue Templates', () => {
  let mockSubmission: StorySubmission;
  let mockMetadata: StoryMetadata;
  let mockOptions: TemplateOptions;

  beforeEach(() => {
    mockSubmission = {
      id: 'sub-123',
      submitterUserId: 'user-456',
      storyUrl: 'https://archiveofourown.org/works/12345',
      storyTitle: 'The Adventures of Harry Potter',
      authorName: 'J.K. Rowling',
      fandomId: 'harry-potter',
      summary: 'A magical adventure story about a young wizard.',
      wordCount: 50000,
      chapterCount: 12,
      completionStatus: 'complete',
      publishDate: new Date('2024-01-01'),
      lastUpdateDate: new Date('2024-01-15'),
      tags: ['adventure', 'magic', 'friendship'],
      submittedAt: new Date('2024-01-20'),
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      approvalNotes: null,
      rejectionReason: null,
      qualityScore: null,
      extractedMetadata: {},
      duplicateCheckResults: {},
    } as StorySubmission;

    mockMetadata = {
      title: 'The Adventures of Harry Potter',
      author: 'J.K. Rowling',
      summary: 'A magical adventure story about a young wizard.',
      url: 'https://archiveofourown.org/works/12345',
      wordCount: 50000,
      chapterCount: 12,
      completionStatus: 'complete',
      publishDate: new Date('2024-01-01'),
      lastUpdateDate: new Date('2024-01-15'),
      language: 'English',
      rating: 'Teen And Up Audiences',
      warnings: ['No Archive Warnings Apply'],
      relationships: ['Harry Potter/Hermione Granger'],
      characters: ['Harry Potter', 'Hermione Granger', 'Ron Weasley'],
      additionalTags: ['Angst', 'Romance', 'Adventure'],
    };

    mockOptions = {
      includeModeratorChecklist: true,
      includeTagSuggestions: true,
      includeQualityMetrics: true,
      includeDuplicateCheck: true,
      includeContentWarnings: true,
      fandomSpecificGuidelines:
        'Harry Potter stories should respect canon timeline',
      priority: 'normal',
      complexity: 'simple',
      customInstructions: 'Pay special attention to character development',
    };
  });

  describe('Story Submission Template', () => {
    it('should generate complete submission issue template', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata,
        mockOptions
      );

      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('body');
      expect(template).toHaveProperty('labels');
      expect(template).toHaveProperty('templateConfig');

      // Validate title format
      expect(template.title).toContain('[NEW]');
      expect(template.title).toContain('[HARRY-POTTER]');
      expect(template.title).toContain('The Adventures of Harry Potter');

      // Validate body structure
      expect(template.body).toContain('---'); // YAML frontmatter
      expect(template.body).toContain('# 📚 Story Submission Review');
      expect(template.body).toContain('## 📋 Basic Information');
      expect(template.body).toContain('## 📖 Story Metadata');
    });

    it('should include YAML frontmatter with correct structure', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata,
        mockOptions
      );

      const yamlSection = template.body.split('---')[1];

      expect(yamlSection).toContain('submission_id: "sub-123"');
      expect(yamlSection).toContain('title: "The Adventures of Harry Potter"');
      expect(yamlSection).toContain('author: "J.K. Rowling"');
      expect(yamlSection).toContain('fandom: "harry-potter"');
      expect(yamlSection).toContain(
        'url: "https://archiveofourown.org/works/12345"'
      );
      expect(yamlSection).toContain('status: "pending"');
      expect(yamlSection).toContain('priority: "normal"');
      expect(yamlSection).toContain('complexity: "simple"');
      expect(yamlSection).toContain('word_count: 50000');
      expect(yamlSection).toContain('chapter_count: 12');
      expect(yamlSection).toContain('completion_status: "complete"');
      expect(yamlSection).toContain('rating: "Teen And Up Audiences"');
      expect(yamlSection).toContain('language: "English"');
      expect(yamlSection).toContain('template_version: "2.1.0"');

      // Validate tags array format
      expect(yamlSection).toContain('tags:');
      expect(yamlSection).toContain('- "adventure"');
      expect(yamlSection).toContain('- "magic"');
      expect(yamlSection).toContain('- "friendship"');
    });

    it('should include metadata table with all story information', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata,
        mockOptions
      );

      // Check for basic information table
      expect(template.body).toContain(
        '| **Title** | The Adventures of Harry Potter |'
      );
      expect(template.body).toContain('| **Author** | J.K. Rowling |');
      expect(template.body).toContain('| **Fandom** | harry-potter |');
      expect(template.body).toContain(
        '| **Story URL** | [View Story](https://archiveofourown.org/works/12345) |'
      );

      // Check for story metadata table
      expect(template.body).toContain('| **Word Count** | 50,000 |');
      expect(template.body).toContain('| **Chapters** | 12 |');
      expect(template.body).toContain('| **Completion Status** | complete |');
      expect(template.body).toContain('| **Rating** | Teen And Up Audiences |');
      expect(template.body).toContain('| **Language** | English |');
    });

    it('should include moderation checklist when requested', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata,
        { includeModeratorChecklist: true }
      );

      expect(template.body).toContain('## ✅ Moderation Checklist');
      expect(template.body).toContain('### Content Review');
      expect(template.body).toContain(
        '- [ ] Story URL is accessible and valid'
      );
      expect(template.body).toContain(
        '- [ ] Content matches provided metadata'
      );
      expect(template.body).toContain(
        '- [ ] Fandom classification is accurate'
      );
      expect(template.body).toContain('### Quality Assessment');
      expect(template.body).toContain('### Community Standards');
      expect(template.body).toContain('### Technical Validation');
      expect(template.body).toContain('### Final Decision');
      expect(template.body).toContain(
        '- [ ] **APPROVE** - Story meets all criteria'
      );
      expect(template.body).toContain(
        '- [ ] **REQUEST CHANGES** - Minor issues to address'
      );
      expect(template.body).toContain(
        '- [ ] **REJECT** - Does not meet standards'
      );
    });

    it('should include content warnings section when applicable', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata,
        { includeContentWarnings: true }
      );

      expect(template.body).toContain('## ⚠️ Content Warnings');
      expect(template.body).toContain('- ⚠️ No Archive Warnings Apply');
    });

    it('should include characters and relationships section', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata
      );

      expect(template.body).toContain('## 👥 Characters & Relationships');
      expect(template.body).toContain('### Relationships');
      expect(template.body).toContain('- 💕 Harry Potter/Hermione Granger');
      expect(template.body).toContain('### Characters');
      expect(template.body).toContain('- 👤 Harry Potter');
      expect(template.body).toContain('- 👤 Hermione Granger');
      expect(template.body).toContain('- 👤 Ron Weasley');
    });

    it('should include fandom-specific guidelines when provided', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata,
        {
          fandomSpecificGuidelines:
            'Harry Potter stories should respect canon timeline',
        }
      );

      expect(template.body).toContain('## 📋 Fandom-Specific Guidelines');
      expect(template.body).toContain(
        'Harry Potter stories should respect canon timeline'
      );
    });

    it('should generate appropriate labels for submission', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata,
        mockOptions
      );

      expect(template.labels).toContain('submission');
      expect(template.labels).toContain('needs-review');
      expect(template.labels).toContain('fandom:harry-potter');
      expect(template.labels).toContain('status:pending');
      expect(template.labels).toContain('priority:normal');
      expect(template.labels).toContain('complexity:simple');
      expect(template.labels).toContain('rating:teen and up audiences');
      expect(template.labels).toContain('completion:complete');
      expect(template.labels).toContain('length:medium');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalSubmission = {
        ...mockSubmission,
        summary: null,
        wordCount: null,
        chapterCount: null,
        tags: null,
      };

      const minimalMetadata = {
        ...mockMetadata,
        summary: '',
        wordCount: undefined,
        chapterCount: undefined,
        relationships: [],
        characters: [],
        additionalTags: [],
        warnings: [],
      };

      const template = GitHubIssueTemplates.createSubmissionIssue(
        minimalSubmission,
        minimalMetadata
      );

      expect(template.title).toBeTruthy();
      expect(template.body).toBeTruthy();
      expect(template.body).toContain('| **Word Count** | Unknown |');
      expect(template.body).toContain('| **Chapters** | Unknown |');
    });
  });

  describe('Moderation Review Template', () => {
    it('should generate moderation review template for assigned moderator', () => {
      const template = GitHubIssueTemplates.createModerationReviewTemplate(
        mockSubmission,
        'moderator-123',
        mockOptions
      );

      expect(template.title).toContain('[REVIEW]');
      expect(template.title).toContain('The Adventures of Harry Potter');
      expect(template.title).toContain('Assigned to Moderator');

      expect(template.body).toContain('# 🛡️ Moderation Review Assignment');
      expect(template.body).toContain('**Moderator:** @moderator-123');
      expect(template.body).toContain(
        '**Submission:** The Adventures of Harry Potter'
      );
      expect(template.body).toContain('**Priority:** normal');
      expect(template.body).toContain('**Complexity:** simple');

      expect(template.assignees).toContain('moderator-123');
      expect(template.labels).toContain('moderation');
      expect(template.labels).toContain('assigned');
    });

    it('should include review notes sections', () => {
      const template = GitHubIssueTemplates.createModerationReviewTemplate(
        mockSubmission,
        'moderator-123'
      );

      expect(template.body).toContain('## 📝 Review Notes');
      expect(template.body).toContain('### Decision Rationale');
      expect(template.body).toContain('### Feedback for Submitter');
      expect(template.body).toContain('### Internal Notes');
    });
  });

  describe('Duplicate Detection Template', () => {
    it('should generate duplicate detection template with potential matches', () => {
      const potentialDuplicates = [
        {
          id: 'dup-1',
          title: 'Harry Potter Adventure Story',
          similarity: 0.85,
          url: 'https://example.com/story1',
        },
        {
          id: 'dup-2',
          title: 'Adventures of Harry',
          similarity: 0.73,
          url: 'https://example.com/story2',
        },
      ];

      const template = GitHubIssueTemplates.createDuplicateDetectionTemplate(
        mockSubmission,
        potentialDuplicates,
        mockOptions
      );

      expect(template.title).toContain('[DUPLICATE CHECK]');
      expect(template.title).toContain('Manual Review Required');

      expect(template.body).toContain('# 🔍 Duplicate Detection Alert');
      expect(template.body).toContain('## ⚠️ Potential Duplicates Found');
      expect(template.body).toContain(
        '| 85% | Harry Potter Adventure Story | [View](https://example.com/story1) |'
      );
      expect(template.body).toContain(
        '| 73% | Adventures of Harry | [View](https://example.com/story2) |'
      );

      expect(template.body).toContain('## 🔍 Manual Review Required');
      expect(template.body).toContain('- [ ] Compare story content manually');
      expect(template.body).toContain('- [ ] Verify author identity');

      expect(template.body).toContain('## 🎯 Resolution');
      expect(template.body).toContain(
        '- [ ] **NOT A DUPLICATE** - Continue with normal review'
      );
      expect(template.body).toContain(
        '- [ ] **CONFIRMED DUPLICATE** - Reject submission'
      );

      expect(template.labels).toContain('duplicate-check');
      expect(template.labels).toContain('needs-manual-review');
    });
  });

  describe('Quality Review Template', () => {
    it('should generate quality review template with metrics breakdown', () => {
      const qualityMetrics = {
        'Metadata Completeness': 85,
        'Content Analysis': 92,
        'Tag Accuracy': 78,
        'Community Standards': 95,
      };

      const template = GitHubIssueTemplates.createQualityReviewTemplate(
        mockSubmission,
        87,
        qualityMetrics,
        mockOptions
      );

      expect(template.title).toContain('[QUALITY]');
      expect(template.title).toContain('Score: 87/100');

      expect(template.body).toContain('# 📊 Quality Assessment Report');
      expect(template.body).toContain('**Overall Score:** 87/100');
      expect(template.body).toContain('## 📈 Quality Metrics Breakdown');

      // Check metrics table
      expect(template.body).toContain(
        '| Metadata Completeness | 85/100 | Standard |'
      );
      expect(template.body).toContain(
        '| Content Analysis | 92/100 | Standard |'
      );
      expect(template.body).toContain('| Tag Accuracy | 78/100 | Standard |');
      expect(template.body).toContain(
        '| Community Standards | 95/100 | Standard |'
      );
    });

    it('should provide appropriate recommendations based on score', () => {
      // Test high quality score (>= 80)
      const highQualityTemplate =
        GitHubIssueTemplates.createQualityReviewTemplate(
          mockSubmission,
          92,
          {},
          mockOptions
        );

      expect(highQualityTemplate.body).toContain(
        '### 🟢 High Quality Submission'
      );
      expect(highQualityTemplate.body).toContain(
        '- [ ] Consider for featured content'
      );
      expect(highQualityTemplate.body).toContain(
        '- [ ] Fast-track approval recommended'
      );

      // Test medium quality score (60-79)
      const mediumQualityTemplate =
        GitHubIssueTemplates.createQualityReviewTemplate(
          mockSubmission,
          70,
          {},
          mockOptions
        );

      expect(mediumQualityTemplate.body).toContain(
        '### 🟡 Minor Issues Identified'
      );
      expect(mediumQualityTemplate.body).toContain(
        '- [ ] Request improvements to metadata'
      );
      expect(mediumQualityTemplate.body).toContain(
        '- [ ] Suggest additional tags'
      );

      // Test low quality score (< 60)
      const lowQualityTemplate =
        GitHubIssueTemplates.createQualityReviewTemplate(
          mockSubmission,
          45,
          {},
          mockOptions
        );

      expect(lowQualityTemplate.body).toContain(
        '### 🔴 Major Issues Identified'
      );
      expect(lowQualityTemplate.body).toContain(
        '- [ ] Review content quality and completeness'
      );
      expect(lowQualityTemplate.body).toContain(
        '- [ ] Consider rejection if standards not met'
      );
    });
  });

  describe('Template Version Management', () => {
    it('should include template configuration in all templates', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata
      );

      expect(template.templateConfig).toHaveProperty('version');
      expect(template.templateConfig).toHaveProperty('lastUpdated');
      expect(template.templateConfig).toHaveProperty('author');
      expect(template.templateConfig).toHaveProperty('description');

      expect(template.templateConfig.version).toBe('2.1.0');
      expect(template.templateConfig.author).toBe(
        'Pensieve Index Community System'
      );
    });

    it('should validate template version compatibility', () => {
      expect(TemplateVersionManager.isCompatible('2.1.0', '2.1.0')).toBe(true);
      expect(TemplateVersionManager.isCompatible('2.0.0', '2.1.0')).toBe(true);
      expect(TemplateVersionManager.isCompatible('2.2.0', '2.1.0')).toBe(false);
      expect(TemplateVersionManager.isCompatible('3.0.0', '2.1.0')).toBe(false);
      expect(TemplateVersionManager.isCompatible('1.9.0', '2.1.0')).toBe(false);
    });

    it('should handle template upgrades', () => {
      const oldTemplate = 'old template content';
      const upgradedTemplate = TemplateVersionManager.upgradeTemplate(
        oldTemplate,
        '2.0.0',
        '2.1.0'
      );

      // For now, should return template as-is
      expect(upgradedTemplate).toBe(oldTemplate);
    });
  });

  describe('Label Management', () => {
    it('should validate standard labels correctly', () => {
      const testLabels = [
        'submission',
        'needs-review',
        'priority:high',
        'complexity:moderate',
        'fandom:harry-potter',
        'status:pending',
        'invalid-label',
        'custom:label',
      ];

      const { valid, invalid } = LabelManager.validateLabels(testLabels);

      expect(valid).toContain('submission');
      expect(valid).toContain('needs-review');
      expect(valid).toContain('priority:high');
      expect(valid).toContain('complexity:moderate');
      expect(valid).toContain('fandom:harry-potter');
      expect(valid).toContain('status:pending');

      expect(invalid).toContain('invalid-label');
      expect(invalid).toContain('custom:label');
    });

    it('should provide standard label categories', () => {
      expect(LabelManager.STANDARD_LABELS).toHaveProperty('STATUS');
      expect(LabelManager.STANDARD_LABELS).toHaveProperty('PRIORITY');
      expect(LabelManager.STANDARD_LABELS).toHaveProperty('COMPLEXITY');
      expect(LabelManager.STANDARD_LABELS).toHaveProperty('QUALITY');
      expect(LabelManager.STANDARD_LABELS).toHaveProperty('CONTENT');
      expect(LabelManager.STANDARD_LABELS).toHaveProperty('LENGTH');

      expect(LabelManager.STANDARD_LABELS.STATUS).toContain('submission');
      expect(LabelManager.STANDARD_LABELS.PRIORITY).toContain('priority:high');
      expect(LabelManager.STANDARD_LABELS.COMPLEXITY).toContain(
        'complexity:moderate'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values gracefully', () => {
      const minimalSubmission = {
        ...mockSubmission,
        summary: null,
        wordCount: null,
        chapterCount: null,
        status: null,
        submittedAt: null,
      };

      const template = GitHubIssueTemplates.createSubmissionIssue(
        minimalSubmission,
        mockMetadata
      );

      expect(template.title).toBeTruthy();
      expect(template.body).toBeTruthy();
      expect(template.labels).toBeInstanceOf(Array);
      expect(template.templateConfig).toBeTruthy();
    });

    it('should truncate long titles appropriately', () => {
      const longTitleSubmission = {
        ...mockSubmission,
        storyTitle:
          'This is a very long story title that exceeds the normal length limit and should be truncated properly to avoid issues with GitHub issue titles that have character limits',
      };

      const template = GitHubIssueTemplates.createSubmissionIssue(
        longTitleSubmission,
        mockMetadata
      );

      expect(template.title.length).toBeLessThan(120);
      expect(template.title).toContain('...');
    });

    it('should handle empty arrays gracefully', () => {
      const emptyMetadata = {
        ...mockMetadata,
        relationships: [],
        characters: [],
        additionalTags: [],
        warnings: [],
      };

      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        emptyMetadata
      );

      expect(template.body).toBeTruthy();
      expect(template.body).not.toContain('### Relationships');
      expect(template.body).not.toContain('### Characters');
    });

    it('should include template footer with version information', () => {
      const template = GitHubIssueTemplates.createSubmissionIssue(
        mockSubmission,
        mockMetadata
      );

      expect(template.body).toContain(
        '*This issue was auto-generated by the Pensieve Index Community System v2.1.0*'
      );
      expect(template.body).toContain('*Template last updated: 2024-01-01*');
    });
  });
});
