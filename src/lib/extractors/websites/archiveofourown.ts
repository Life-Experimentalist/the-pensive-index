/**
 * Archive of Our Own (AO3) Website Extractor
 *
 * This extractor handles story metadata extraction from AO3 work pages,
 * including comprehensive tag parsing, series information, and proper
 * handling of restricted works.
 */

import { BaseExtractor, ExtractionError } from '../base-extractor';
import {
  StoryMetadata,
  ValidationResult,
  CompletionStatus,
  ConfigUIDefinition,
} from '../../../types/submission';

/**
 * Archive of Our Own extractor implementation
 */
export class AO3Extractor extends BaseExtractor {
  readonly id = 'ao3';
  readonly name = 'Archive of Our Own';
  readonly urlPatterns = [
    /^https?:\/\/archiveofourown\.org\/works\/\d+/,
    /^https?:\/\/ao3\.org\/works\/\d+/,
  ];

  /**
   * Check if current page is an AO3 work page
   */
  canExtract(): boolean {
    return (
      this.urlPatterns.some(pattern => pattern.test(window.location.href)) &&
      document.querySelector('.work.meta') !== null
    );
  }

  /**
   * Extract story metadata from AO3 work page
   */
  async extract(): Promise<StoryMetadata> {
    if (!this.canExtract()) {
      throw new ExtractionError(
        'Cannot extract from current page',
        'EXTRACTION_NOT_SUPPORTED'
      );
    }

    // Check for restricted access
    if (this.isRestrictedWork()) {
      throw new ExtractionError(
        'This work is restricted and cannot be accessed',
        'RESTRICTED_ACCESS'
      );
    }

    try {
      const metadata: StoryMetadata = {
        title: this.extractTitle(),
        author: this.extractAuthor(),
        summary: this.extractSummary(),
        url: this.normalizeAO3Url(window.location.href),
        wordCount: this.extractWordCount(),
        chapterCount: this.extractChapterCount(),
        completionStatus: this.extractCompletionStatus(),
        publishDate: this.extractPublishDate(),
        lastUpdateDate: this.extractLastUpdateDate(),
        language: this.extractLanguage(),
        rating: this.extractRating(),
        warnings: this.extractWarnings(),
        relationships: this.extractRelationships(),
        characters: this.extractCharacters(),
        additionalTags: this.extractAdditionalTags(),
        series: this.extractSeries(),
      };

      return metadata;
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract AO3 metadata: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Check if work is restricted (requires login)
   */
  private isRestrictedWork(): boolean {
    return (
      document.querySelector('.restricted') !== null ||
      document.querySelector('#restricted-warning') !== null ||
      document.querySelector('.error-503') !== null
    );
  }

  /**
   * Extract work title
   */
  private extractTitle(): string {
    const title =
      this.safeTextContent('.work .title') ||
      this.safeTextContent('h2.title') ||
      this.safeTextContent('.work-header .title');

    if (!title) {
      throw new ExtractionError(
        'Could not extract story title',
        'MISSING_TITLE'
      );
    }

    return title;
  }

  /**
   * Extract author name(s)
   */
  private extractAuthor(): string {
    const authors = Array.from(
      document.querySelectorAll('.work .byline a[rel="author"]')
    ).map(el => el.textContent?.trim());

    const validAuthors = authors.filter((author): author is string =>
      Boolean(author)
    );

    if (validAuthors.length === 0) {
      throw new ExtractionError(
        'Could not extract story author',
        'MISSING_AUTHOR'
      );
    }

    return validAuthors.join(', ');
  }

  /**
   * Extract work summary
   */
  private extractSummary(): string {
    const summaryElement = document.querySelector('.work .summary blockquote');
    const summary = summaryElement?.textContent?.trim();

    if (!summary) {
      return 'No summary provided';
    }

    // Clean up summary text
    return summary.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
  }

  /**
   * Extract word count
   */
  private extractWordCount(): number | undefined {
    const wordCountText = this.safeTextContent('.work .stats dd.words');
    if (!wordCountText) {
      return undefined;
    }

    const wordCount = parseInt(wordCountText.replace(/,/g, ''), 10);
    return isNaN(wordCount) ? undefined : wordCount;
  }

  /**
   * Extract chapter count and total chapters
   */
  private extractChapterCount(): number | undefined {
    const chapterText = this.safeTextContent('.work .stats dd.chapters');
    if (!chapterText) {
      return undefined;
    }

    // Format is typically "5/10" or "5/?" or just "1"
    const match = chapterText.match(/^(\d+)/);
    if (match) {
      const chapterCount = parseInt(match[1], 10);
      return isNaN(chapterCount) ? undefined : chapterCount;
    }

    return undefined;
  }

  /**
   * Determine completion status
   */
  private extractCompletionStatus(): CompletionStatus {
    const chapterText = this.safeTextContent('.work .stats dd.chapters');
    if (!chapterText) {
      return CompletionStatus.UNKNOWN;
    }

    // Check for completion patterns
    if (chapterText.includes('?')) {
      return CompletionStatus.IN_PROGRESS;
    }

    const match = chapterText.match(/^(\d+)\/(\d+)$/);
    if (match) {
      const current = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      return current >= total
        ? CompletionStatus.COMPLETE
        : CompletionStatus.IN_PROGRESS;
    }

    // Single chapter works are typically complete
    return CompletionStatus.COMPLETE;
  }

  /**
   * Extract publish date
   */
  private extractPublishDate(): Date | undefined {
    const dateText = this.safeTextContent('.work .stats dd.published');
    if (!dateText) {
      return undefined;
    }

    const date = new Date(dateText);
    return isNaN(date.getTime()) ? undefined : date;
  }

  /**
   * Extract last update date
   */
  private extractLastUpdateDate(): Date | undefined {
    const dateText = this.safeTextContent('.work .stats dd.status');
    if (!dateText) {
      return this.extractPublishDate();
    }

    const date = new Date(dateText);
    return isNaN(date.getTime()) ? this.extractPublishDate() : date;
  }

  /**
   * Extract work language
   */
  private extractLanguage(): string | undefined {
    return this.safeTextContent('.work .stats dd.language');
  }

  /**
   * Extract content rating
   */
  private extractRating(): string | undefined {
    const ratingElement = document.querySelector('.work .rating .tag');
    return ratingElement?.textContent?.trim();
  }

  /**
   * Extract archive warnings
   */
  private extractWarnings(): string[] {
    const warnings = Array.from(
      document.querySelectorAll('.work .warnings .tag')
    ).map(el => el.textContent?.trim());

    return warnings.filter((warning): warning is string => Boolean(warning));
  }

  /**
   * Extract relationships
   */
  private extractRelationships(): string[] {
    const relationships = Array.from(
      document.querySelectorAll('.work .relationships .tag')
    ).map(el => el.textContent?.trim());

    return relationships.filter((rel): rel is string => Boolean(rel));
  }

  /**
   * Extract characters
   */
  private extractCharacters(): string[] {
    const characters = Array.from(
      document.querySelectorAll('.work .characters .tag')
    ).map(el => el.textContent?.trim());

    return characters.filter((char): char is string => Boolean(char));
  }

  /**
   * Extract additional tags
   */
  private extractAdditionalTags(): string[] {
    const tags = Array.from(
      document.querySelectorAll('.work .freeforms .tag')
    ).map(el => el.textContent?.trim());

    return tags.filter((tag): tag is string => Boolean(tag));
  }

  /**
   * Extract series information
   */
  private extractSeries(): { name: string; part: number } | undefined {
    const seriesElement = document.querySelector('.work .series .position');
    const seriesText = seriesElement?.textContent?.trim();

    if (!seriesText) {
      return undefined;
    }

    // Parse series text like "Part 3 of Series Name"
    const match = seriesText.match(/Part (\d+) of (.+)/);
    if (match) {
      const part = parseInt(match[1], 10);
      const name = match[2].trim();

      if (!isNaN(part) && name) {
        return { name, part };
      }
    }

    // Fallback: try to get series name from link
    const seriesLink = document.querySelector('.work .series a');
    if (seriesLink) {
      const name = seriesLink.textContent?.trim();
      if (name) {
        return { name, part: 1 };
      }
    }

    return undefined;
  }

  /**
   * Normalize AO3 URL to canonical form
   */
  protected normalizeAO3Url(url: string): string {
    try {
      const urlObj = new URL(url);

      // Extract work ID from URL
      const workIdMatch = urlObj.pathname.match(/\/works\/(\d+)/);
      if (!workIdMatch) {
        throw new ExtractionError('Invalid AO3 work URL format', 'INVALID_URL');
      }

      const workId = workIdMatch[1];

      // Return canonical URL
      return `https://archiveofourown.org/works/${workId}`;
    } catch (error) {
      throw new ExtractionError(`Invalid URL format: ${url}`, 'INVALID_URL');
    }
  }

  /**
   * Validate extracted AO3 metadata
   */
  validate(metadata: StoryMetadata): ValidationResult {
    const result = super.validate(metadata);

    // AO3-specific validation
    if (!metadata.url.includes('archiveofourown.org/works/')) {
      result.errors.push('Invalid AO3 work URL');
    }

    // Check for minimum AO3 metadata requirements
    if (!metadata.rating) {
      result.warnings.push('Content rating not found');
    }

    if (!metadata.warnings || metadata.warnings.length === 0) {
      result.warnings.push('Archive warnings not found');
    }

    if (metadata.wordCount && metadata.wordCount > 1000000) {
      result.warnings.push('Unusually high word count detected');
    }

    return result;
  }

  /**
   * Get configuration UI for AO3 extractor
   */
  getConfigUI(): ConfigUIDefinition {
    return {
      fields: [
        {
          name: 'includeSeriesInfo',
          type: 'boolean',
          label: 'Include series information',
          description: 'Extract series name and part number when available',
          required: false,
        },
        {
          name: 'includeStats',
          type: 'boolean',
          label: 'Include work statistics',
          description: 'Extract kudos, bookmarks, and hit counts',
          required: false,
        },
        {
          name: 'validateTags',
          type: 'boolean',
          label: 'Validate tag formats',
          description: 'Check that tags conform to AO3 standards',
          required: false,
        },
      ],
    };
  }
}

// Export singleton instance for browser extension usage
export const ao3Extractor = new AO3Extractor();
