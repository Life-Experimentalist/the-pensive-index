/**
 * FanFiction.Net Website Extractor
 *
 * This extractor handles story metadata extraction from FanFiction.Net story pages,
 * including comprehensive metadata parsing, story statistics, and proper handling
 * of both mobile and desktop page formats.
 */

import { BaseExtractor, ExtractionError } from '../base-extractor';
import {
  StoryMetadata,
  ValidationResult,
  CompletionStatus,
  ConfigUIDefinition,
} from '../../../types/submission';

/**
 * FanFiction.Net extractor implementation
 */
export class FanFictionNetExtractor extends BaseExtractor {
  readonly id = 'fanfiction-net';
  readonly name = 'FanFiction.Net';
  readonly urlPatterns = [
    /^https?:\/\/(www\.)?fanfiction\.net\/s\/\d+/,
    /^https?:\/\/m\.fanfiction\.net\/s\/\d+/,
  ];

  /**
   * Check if current page is a FanFiction.Net story page
   */
  canExtract(): boolean {
    return (
      this.urlPatterns.some(pattern => pattern.test(window.location.href)) &&
      (document.querySelector('#profile_top') !== null ||
        document.querySelector('.xcontrast_txt') !== null ||
        document.querySelector('#gui_table1i') !== null)
    );
  }

  /**
   * Extract story metadata from FanFiction.Net story page
   */
  async extract(): Promise<StoryMetadata> {
    if (!this.canExtract()) {
      throw new ExtractionError(
        'Cannot extract from current page',
        'EXTRACTION_NOT_SUPPORTED'
      );
    }

    // Check if story exists and is accessible
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
        url: this.normalizeFFNUrl(window.location.href),
        wordCount: this.extractWordCount(),
        chapterCount: this.extractChapterCount(),
        completionStatus: this.extractCompletionStatus(),
        publishDate: this.extractPublishDate(),
        lastUpdateDate: this.extractLastUpdateDate(),
        language: this.extractLanguage(),
        rating: this.extractRating(),
        warnings: [], // FFN doesn't have explicit warnings like AO3
        relationships: this.extractRelationships(),
        characters: this.extractCharacters(),
        additionalTags: this.extractGenres(),
        series: undefined, // FFN doesn't have native series support
      };

      return metadata;
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract FFN metadata: ${
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
      document.querySelector('.error') !== null ||
      document.querySelector('#no_item') !== null ||
      document.body.textContent?.includes('Story Not Found') === true
    );
  }

  /**
   * Extract story title
   */
  private extractTitle(): string {
    // Desktop version
    let title = this.safeTextContent('#profile_top b.xcontrast_txt');

    // Mobile version
    if (!title) {
      title = this.safeTextContent('.xcontrast_txt');
    }

    // Alternative selectors
    if (!title) {
      title = this.safeTextContent('b.xcontrast_txt');
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
    // Desktop version - author link
    let author = this.safeTextContent('#profile_top a[href^="/u/"]');

    // Mobile version
    if (!author) {
      author = this.safeTextContent('a[href^="/u/"]');
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
   * Extract story summary
   */
  private extractSummary(): string {
    // Desktop version
    let summary = this.safeTextContent('#profile_top .xcontrast_txt:not(b)');

    // Mobile version - summary is usually after the title
    if (!summary) {
      const summaryElement = document.querySelector(
        '.xcontrast_txt:not(b):not(a)'
      );
      summary = summaryElement?.textContent?.trim();
    }

    // Alternative approach - look for div with story description
    if (!summary) {
      const profileDiv = document.querySelector('#profile_top');
      if (profileDiv) {
        const textNodes = Array.from(profileDiv.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent?.trim())
          .filter(text => text && text.length > 20);

        if (textNodes.length > 0) {
          summary = textNodes[0];
        }
      }
    }

    return summary || 'No summary provided';
  }

  /**
   * Extract metadata from the story info line (contains ratings, words, etc.)
   */
  private extractStoryInfoLine(): string {
    // Look for the gray text line with story metadata
    const infoSelectors = [
      '#profile_top .xgray',
      '.xgray',
      '#profile_top span[style*="color: gray"]',
      '#profile_top span[style*="color:gray"]',
    ];

    for (const selector of infoSelectors) {
      const info = this.safeTextContent(selector);
      if (info && info.includes('Rated:')) {
        return info;
      }
    }

    return '';
  }

  /**
   * Extract word count from story info
   */
  private extractWordCount(): number | undefined {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return undefined;
    }

    // Pattern: "Words: 123,456"
    const wordMatch = infoLine.match(/Words?:\s*([\d,]+)/i);
    if (wordMatch) {
      const wordCount = parseInt(wordMatch[1].replace(/,/g, ''), 10);
      return isNaN(wordCount) ? undefined : wordCount;
    }

    return undefined;
  }

  /**
   * Extract chapter count
   */
  private extractChapterCount(): number | undefined {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return 1; // Default to 1 if no info found
    }

    // Pattern: "Chapters: 12"
    const chapterMatch = infoLine.match(/Chapters?:\s*(\d+)/i);
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
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return CompletionStatus.UNKNOWN;
    }

    // Check for "Complete" keyword
    if (infoLine.toLowerCase().includes('complete')) {
      return CompletionStatus.COMPLETE;
    }

    // If it has multiple chapters and no "complete" marker, assume in progress
    const chapterCount = this.extractChapterCount();
    if (chapterCount && chapterCount > 1) {
      return CompletionStatus.IN_PROGRESS;
    }

    // Single chapter without "complete" marker is often complete
    return CompletionStatus.COMPLETE;
  }

  /**
   * Extract publish date
   */
  private extractPublishDate(): Date | undefined {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return undefined;
    }

    // Pattern: "Published: Jan 1, 2020" or "Published: 1/1/2020"
    const publishMatch = infoLine.match(/Published:\s*([^-]+?)(?:\s*-|$)/i);
    if (publishMatch) {
      const dateStr = publishMatch[1].trim();
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    }

    return undefined;
  }

  /**
   * Extract last update date
   */
  private extractLastUpdateDate(): Date | undefined {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return this.extractPublishDate();
    }

    // Pattern: "Updated: Jan 1, 2021"
    const updateMatch = infoLine.match(/Updated:\s*([^-]+?)(?:\s*-|$)/i);
    if (updateMatch) {
      const dateStr = updateMatch[1].trim();
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? this.extractPublishDate() : date;
    }

    return this.extractPublishDate();
  }

  /**
   * Extract story language
   */
  private extractLanguage(): string | undefined {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return 'English'; // Default assumption
    }

    // FFN usually shows language after other metadata
    const langMatch = infoLine.match(/(?:^|\s|-)([A-Z][a-z]+)(?:\s*$|\s*-)/);
    if (langMatch && langMatch[1] !== 'Complete') {
      return langMatch[1];
    }

    return 'English';
  }

  /**
   * Extract content rating
   */
  private extractRating(): string | undefined {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return undefined;
    }

    // Pattern: "Rated: T" or "Rated: Fiction T"
    const ratingMatch = infoLine.match(/Rated:\s*(?:Fiction\s+)?([KMTM]+)/i);
    if (ratingMatch) {
      return ratingMatch[1].toUpperCase();
    }

    return undefined;
  }

  /**
   * Extract relationships/pairings
   */
  private extractRelationships(): string[] {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return [];
    }

    const relationships: string[] = [];

    // Look for character pairings in brackets like [Harry P., Hermione G.]
    const pairingMatches = infoLine.match(/\[([^\]]+)\]/g);
    if (pairingMatches) {
      for (const match of pairingMatches) {
        const pairing = match.slice(1, -1).trim(); // Remove brackets
        if (pairing.includes(',')) {
          // Multi-character pairing
          relationships.push(pairing);
        }
      }
    }

    return relationships;
  }

  /**
   * Extract character list
   */
  private extractCharacters(): string[] {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return [];
    }

    const characters: string[] = [];

    // Look for character names in brackets
    const characterMatches = infoLine.match(/\[([^\]]+)\]/g);
    if (characterMatches) {
      for (const match of characterMatches) {
        const characterList = match.slice(1, -1); // Remove brackets
        const charNames = characterList.split(',').map(name => name.trim());
        characters.push(...charNames);
      }
    }

    // Remove duplicates
    const uniqueCharacters: string[] = [];
    const seen = new Set<string>();
    characters.forEach(char => {
      if (!seen.has(char)) {
        seen.add(char);
        uniqueCharacters.push(char);
      }
    });
    return uniqueCharacters;
  }

  /**
   * Extract genres as additional tags
   */
  private extractGenres(): string[] {
    const infoLine = this.extractStoryInfoLine();
    if (!infoLine) {
      return [];
    }

    // Genres are typically listed after rating and before other metadata
    // Pattern: after "Rated: X" and before "Chapters:" or "Words:"
    const genreMatch = infoLine.match(/Rated:\s*[^-]+-\s*([^-]+?)\s*-/);
    if (genreMatch) {
      const genreStr = genreMatch[1].trim();
      // Split on common delimiters and clean up
      const genres = genreStr
        .split(/[/&,]/)
        .map(genre => genre.trim())
        .filter(
          genre =>
            genre.length > 0 &&
            !genre.match(
              /^(Chapters?|Words?|Published|Updated|Complete|English|\d+)$/i
            )
        );

      return genres;
    }

    return [];
  }

  /**
   * Normalize FFN URL to canonical form
   */
  private normalizeFFNUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Extract story ID from URL
      const storyIdMatch = urlObj.pathname.match(/\/s\/(\d+)/);
      if (!storyIdMatch) {
        throw new ExtractionError(
          'Invalid FFN story URL format',
          'INVALID_URL'
        );
      }

      const storyId = storyIdMatch[1];

      // Return canonical URL (desktop version)
      return `https://www.fanfiction.net/s/${storyId}`;
    } catch (error) {
      throw new ExtractionError(`Invalid URL format: ${url}`, 'INVALID_URL');
    }
  }

  /**
   * Validate extracted FFN metadata
   */
  validate(metadata: StoryMetadata): ValidationResult {
    const result = super.validate(metadata);

    // FFN-specific validation
    if (!metadata.url.includes('fanfiction.net/s/')) {
      result.errors.push('Invalid FanFiction.Net story URL');
    }

    // Check for minimum FFN metadata requirements
    if (!metadata.rating) {
      result.warnings.push('Content rating not found');
    }

    if (metadata.wordCount && metadata.wordCount > 2000000) {
      result.warnings.push('Unusually high word count detected');
    }

    // Validate rating format
    if (metadata.rating && !['K', 'K+', 'T', 'M'].includes(metadata.rating)) {
      result.warnings.push('Unusual rating format detected');
    }

    return result;
  }

  /**
   * Get configuration UI for FFN extractor
   */
  getConfigUI(): ConfigUIDefinition {
    return {
      fields: [
        {
          name: 'includeGenres',
          type: 'boolean',
          label: 'Include genres as tags',
          description: 'Extract story genres and add them as additional tags',
          required: false,
        },
        {
          name: 'includeStats',
          type: 'boolean',
          label: 'Include story statistics',
          description: 'Extract review count, favorites, and follows',
          required: false,
        },
        {
          name: 'preferMobileFormat',
          type: 'boolean',
          label: 'Prefer mobile format parsing',
          description: 'Use mobile page selectors when available',
          required: false,
        },
      ],
    };
  }
}

// Export singleton instance for browser extension usage
export const fanfictionNetExtractor = new FanFictionNetExtractor();
