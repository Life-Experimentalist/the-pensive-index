/**
 * Wattpad Website Extractor
 *
 * This extractor handles story metadata extraction from Wattpad story pages,
 * including comprehensive metadata parsing, reading lists, and proper handling
 * of premium content and different page layouts.
 */

import { BaseExtractor, ExtractionError } from '../base-extractor';
import {
  StoryMetadata,
  ValidationResult,
  CompletionStatus,
  ConfigUIDefinition,
} from '../../../types/submission';

/**
 * Wattpad extractor implementation
 */
export class WattpadExtractor extends BaseExtractor {
  readonly id = 'wattpad';
  readonly name = 'Wattpad';
  readonly urlPatterns = [
    /^https?:\/\/(www\.)?wattpad\.com\/story\/\d+/,
    /^https?:\/\/(www\.)?wattpad\.com\/\d+-/,
  ];

  /**
   * Check if current page is a Wattpad story page
   */
  canExtract(): boolean {
    return (
      this.urlPatterns.some(pattern => pattern.test(window.location.href)) &&
      (document.querySelector('.story-info') !== null ||
        document.querySelector('.story-header') !== null ||
        document.querySelector('[data-testid="story-info"]') !== null)
    );
  }

  /**
   * Extract story metadata from Wattpad story page
   */
  async extract(): Promise<StoryMetadata> {
    if (!this.canExtract()) {
      throw new ExtractionError(
        'Cannot extract from current page',
        'EXTRACTION_NOT_SUPPORTED'
      );
    }

    // Check if story is accessible
    if (this.isStoryNotFound()) {
      throw new ExtractionError(
        'Story not found or has been removed',
        'STORY_NOT_FOUND'
      );
    }

    try {
      const metadata: StoryMetadata = {
        title: this.extractTitle(),
        author: this.extractAuthor(),
        summary: this.extractSummary(),
        url: this.normalizeWattpadUrl(window.location.href),
        wordCount: this.extractWordCount(),
        chapterCount: this.extractChapterCount(),
        completionStatus: this.extractCompletionStatus(),
        publishDate: this.extractPublishDate(),
        lastUpdateDate: this.extractLastUpdateDate(),
        language: this.extractLanguage(),
        rating: this.extractRating(),
        warnings: this.extractWarnings(),
        relationships: [], // Wattpad doesn't have explicit relationships like AO3
        characters: [], // Characters are typically in tags
        additionalTags: this.extractTags(),
        series: undefined, // Wattpad stories are standalone but can be in reading lists
      };

      return metadata;
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract Wattpad metadata: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Check if story is not found or removed
   */
  private isStoryNotFound(): boolean {
    return (
      document.querySelector('.error-page') !== null ||
      document.querySelector('.not-found') !== null ||
      document.body.textContent?.includes('Story not found') === true ||
      document.body.textContent?.includes('This story has been removed') ===
        true
    );
  }

  /**
   * Extract story title
   */
  private extractTitle(): string {
    // Try multiple selectors for different page layouts
    let title = this.safeTextContent('[data-testid="story-title"]');

    if (!title) {
      title = this.safeTextContent('.story-info h1');
    }

    if (!title) {
      title = this.safeTextContent('.story-header h1');
    }

    if (!title) {
      title = this.safeTextContent('h1.story-title');
    }

    if (!title) {
      title = this.safeTextContent('h1');
    }

    if (!title) {
      throw new ExtractionError(
        'Could not extract story title',
        'MISSING_TITLE'
      );
    }

    return title;
  }

  /**
   * Extract author name
   */
  private extractAuthor(): string {
    // Try multiple selectors for author information
    let author = this.safeTextContent('[data-testid="story-author"] a');

    if (!author) {
      author = this.safeTextContent('.story-info .author a');
    }

    if (!author) {
      author = this.safeTextContent('.story-byline a');
    }

    if (!author) {
      author = this.safeTextContent('.username');
    }

    if (!author) {
      author = this.safeTextContent('a[href^="/user/"]');
    }

    if (!author) {
      throw new ExtractionError(
        'Could not extract story author',
        'MISSING_AUTHOR'
      );
    }

    return author;
  }

  /**
   * Extract story summary/description
   */
  private extractSummary(): string {
    let summary = this.safeTextContent('[data-testid="story-description"]');

    if (!summary) {
      summary = this.safeTextContent('.story-info .description');
    }

    if (!summary) {
      summary = this.safeTextContent('.story-description');
    }

    if (!summary) {
      summary = this.safeTextContent('.description');
    }

    if (!summary || summary.trim().length === 0) {
      return 'No description provided';
    }

    // Clean up summary text
    return summary.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
  }

  /**
   * Extract story statistics from the stats section
   */
  private extractStatsInfo(): {
    reads?: number;
    votes?: number;
    comments?: number;
    chapters?: number;
  } {
    const stats: {
      reads?: number;
      votes?: number;
      comments?: number;
      chapters?: number;
    } = {};

    // Try to find stats container
    const statsContainer =
      document.querySelector('.story-stats') ||
      document.querySelector('[data-testid="story-stats"]') ||
      document.querySelector('.stats');

    if (statsContainer) {
      // Extract reads
      const readsText =
        this.safeTextContent('.reads', statsContainer) ||
        this.safeTextContent('[data-testid="reads"]', statsContainer);
      if (readsText) {
        const readsMatch = readsText.match(/([0-9,.]+)/);
        if (readsMatch) {
          stats.reads = parseInt(readsMatch[1].replace(/[,.]/g, ''), 10);
        }
      }

      // Extract votes
      const votesText =
        this.safeTextContent('.votes', statsContainer) ||
        this.safeTextContent('[data-testid="votes"]', statsContainer);
      if (votesText) {
        const votesMatch = votesText.match(/([0-9,.]+)/);
        if (votesMatch) {
          stats.votes = parseInt(votesMatch[1].replace(/[,.]/g, ''), 10);
        }
      }

      // Extract comments
      const commentsText =
        this.safeTextContent('.comments', statsContainer) ||
        this.safeTextContent('[data-testid="comments"]', statsContainer);
      if (commentsText) {
        const commentsMatch = commentsText.match(/([0-9,.]+)/);
        if (commentsMatch) {
          stats.comments = parseInt(commentsMatch[1].replace(/[,.]/g, ''), 10);
        }
      }

      // Extract chapters
      const chaptersText =
        this.safeTextContent('.chapters', statsContainer) ||
        this.safeTextContent('[data-testid="chapters"]', statsContainer);
      if (chaptersText) {
        const chaptersMatch = chaptersText.match(/([0-9,.]+)/);
        if (chaptersMatch) {
          stats.chapters = parseInt(chaptersMatch[1].replace(/[,.]/g, ''), 10);
        }
      }
    }

    return stats;
  }

  /**
   * Extract word count (Wattpad doesn't always show this prominently)
   */
  private extractWordCount(): number | undefined {
    // Check for word count in various possible locations
    let wordCountText = this.safeTextContent('[data-testid="word-count"]');

    if (!wordCountText) {
      wordCountText = this.safeTextContent('.word-count');
    }

    if (!wordCountText) {
      // Sometimes word count is in story info
      const infoText = this.safeTextContent('.story-info') || '';
      const wordMatch = infoText.match(/([0-9,.]+)\s*words/i);
      if (wordMatch) {
        wordCountText = wordMatch[1];
      }
    }

    if (wordCountText) {
      const wordCount = parseInt(wordCountText.replace(/[,.]/g, ''), 10);
      return isNaN(wordCount) ? undefined : wordCount;
    }

    return undefined;
  }

  /**
   * Extract chapter count
   */
  private extractChapterCount(): number | undefined {
    const stats = this.extractStatsInfo();
    if (stats.chapters) {
      return stats.chapters;
    }

    // Try alternative methods
    const chapterList = document.querySelectorAll(
      '.chapter-item, .table-of-contents li'
    );
    if (chapterList.length > 0) {
      return chapterList.length;
    }

    // Check for chapter indicator in text
    const pageText = document.body.textContent || '';
    const chapterMatch = pageText.match(/(\d+)\s+chapters?/i);
    if (chapterMatch) {
      const chapterCount = parseInt(chapterMatch[1], 10);
      return isNaN(chapterCount) ? 1 : chapterCount;
    }

    return 1; // Default to 1 chapter
  }

  /**
   * Extract completion status
   */
  private extractCompletionStatus(): CompletionStatus {
    // Look for completion indicators
    const statusText = document.body.textContent?.toLowerCase() || '';

    if (statusText.includes('completed') || statusText.includes('complete')) {
      return CompletionStatus.COMPLETE;
    }

    if (statusText.includes('ongoing') || statusText.includes('in progress')) {
      return CompletionStatus.IN_PROGRESS;
    }

    // Check if there are multiple chapters - likely ongoing if so
    const chapterCount = this.extractChapterCount();
    if (chapterCount && chapterCount > 1) {
      return CompletionStatus.IN_PROGRESS;
    }

    return CompletionStatus.UNKNOWN;
  }

  /**
   * Extract publish date (Wattpad shows relative dates mostly)
   */
  private extractPublishDate(): Date | undefined {
    // Look for publish date indicators
    let dateText = this.safeTextContent('[data-testid="publish-date"]');

    if (!dateText) {
      dateText = this.safeTextContent('.publish-date');
    }

    if (!dateText) {
      dateText = this.safeTextContent('.story-date');
    }

    if (dateText) {
      // Handle relative dates like "2 years ago"
      if (dateText.includes('ago')) {
        return this.parseRelativeDate(dateText);
      }

      // Try parsing absolute date
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  /**
   * Parse relative dates like "2 years ago", "3 months ago"
   */
  private parseRelativeDate(dateText: string): Date | undefined {
    const now = new Date();
    const match = dateText.match(/(\d+)\s+(year|month|week|day)s?\s+ago/i);

    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'year':
          now.setFullYear(now.getFullYear() - amount);
          break;
        case 'month':
          now.setMonth(now.getMonth() - amount);
          break;
        case 'week':
          now.setDate(now.getDate() - amount * 7);
          break;
        case 'day':
          now.setDate(now.getDate() - amount);
          break;
      }

      return now;
    }

    return undefined;
  }

  /**
   * Extract last update date
   */
  private extractLastUpdateDate(): Date | undefined {
    let dateText = this.safeTextContent('[data-testid="last-updated"]');

    if (!dateText) {
      dateText = this.safeTextContent('.last-updated');
    }

    if (!dateText) {
      dateText = this.safeTextContent('.updated');
    }

    if (dateText) {
      if (dateText.includes('ago')) {
        return this.parseRelativeDate(dateText);
      }

      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return this.extractPublishDate();
  }

  /**
   * Extract language (Wattpad is primarily English but supports multiple languages)
   */
  private extractLanguage(): string | undefined {
    let language = this.safeTextContent('[data-testid="story-language"]');

    if (!language) {
      language = this.safeTextContent('.language');
    }

    // Wattpad defaults to English for most content
    return language || 'English';
  }

  /**
   * Extract content rating (Wattpad uses mature content warnings)
   */
  private extractRating(): string | undefined {
    // Check for mature content indicators
    if (
      document.querySelector('.mature-content') ||
      document.querySelector('[data-mature="true"]') ||
      document.body.textContent?.includes('Mature content')
    ) {
      return 'Mature';
    }

    // Default to General if no mature indicators
    return 'General';
  }

  /**
   * Extract content warnings
   */
  private extractWarnings(): string[] {
    const warnings: string[] = [];

    // Check for common warning indicators
    if (
      document.querySelector('.mature-content') ||
      document.body.textContent?.includes('mature content')
    ) {
      warnings.push('Mature Content');
    }

    if (document.body.textContent?.includes('graphic content')) {
      warnings.push('Graphic Content');
    }

    if (document.body.textContent?.includes('strong language')) {
      warnings.push('Strong Language');
    }

    return warnings;
  }

  /**
   * Extract tags from the story
   */
  private extractTags(): string[] {
    const tags: string[] = [];

    // Look for tag containers
    const tagElements = document.querySelectorAll(
      '.tag, .story-tag, [data-testid="tag"]'
    );

    tagElements.forEach(element => {
      const tagText = element.textContent?.trim();
      if (tagText && tagText.length > 0) {
        tags.push(tagText);
      }
    });

    // Look for hashtags in description or title
    const description = this.extractSummary();
    const hashtagMatches = description.match(/#\w+/g);
    if (hashtagMatches) {
      hashtagMatches.forEach(hashtag => {
        tags.push(hashtag.slice(1)); // Remove the # symbol
      });
    }

    return tags.filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  }

  /**
   * Check if story has premium content
   */
  private isPremiumContent(): boolean {
    return (
      document.querySelector('.premium-content') !== null ||
      document.querySelector('[data-premium="true"]') !== null ||
      document.body.textContent?.includes('Wattpad Premium') === true ||
      document.body.textContent?.includes('paid story') === true
    );
  }

  /**
   * Normalize Wattpad URL to canonical form
   */
  private normalizeWattpadUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Extract story ID from URL
      let storyIdMatch = urlObj.pathname.match(/\/story\/(\d+)/);

      if (!storyIdMatch) {
        // Alternative format: /123456-story-title
        storyIdMatch = urlObj.pathname.match(/\/(\d+)-/);
      }

      if (!storyIdMatch) {
        throw new ExtractionError(
          'Invalid Wattpad story URL format',
          'INVALID_URL'
        );
      }

      const storyId = storyIdMatch[1];

      // Return canonical URL
      return `https://www.wattpad.com/story/${storyId}`;
    } catch (error) {
      throw new ExtractionError(`Invalid URL format: ${url}`, 'INVALID_URL');
    }
  }

  /**
   * Validate extracted Wattpad metadata
   */
  validate(metadata: StoryMetadata): ValidationResult {
    const result = super.validate(metadata);

    // Wattpad-specific validation
    if (
      !metadata.url.includes('wattpad.com/story/') &&
      !metadata.url.match(/wattpad\.com\/\d+-/)
    ) {
      result.errors.push('Invalid Wattpad story URL');
    }

    // Check for premium content warning
    if (this.isPremiumContent()) {
      result.warnings.push(
        'This story contains premium content that may not be fully accessible'
      );
    }

    // Wattpad stories tend to have high engagement
    if (metadata.wordCount && metadata.wordCount > 500000) {
      result.warnings.push(
        'This appears to be a very long story - verify chapter count and completion status'
      );
    }

    return result;
  }

  /**
   * Get configuration UI for Wattpad extractor
   */
  getConfigUI(): ConfigUIDefinition {
    return {
      fields: [
        {
          name: 'includeTags',
          type: 'boolean',
          label: 'Include story tags',
          description: 'Extract hashtags and story tags as additional tags',
          required: false,
        },
        {
          name: 'includeStats',
          type: 'boolean',
          label: 'Include engagement statistics',
          description: 'Extract reads, votes, and comments count',
          required: false,
        },
        {
          name: 'detectPremium',
          type: 'boolean',
          label: 'Detect premium content',
          description: 'Identify stories with paid/premium chapters',
          required: false,
        },
        {
          name: 'parseRelativeDates',
          type: 'boolean',
          label: 'Parse relative dates',
          description: 'Convert "X days ago" format to actual dates',
          required: false,
        },
      ],
    };
  }
}

// Export singleton instance for browser extension usage
export const wattpadExtractor = new WattpadExtractor();
