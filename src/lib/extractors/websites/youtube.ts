/**
 * YouTube Audiobook Extractor
 *
 * This extractor handles story metadata extraction from YouTube videos containing
 * fanfiction audiobooks or narrated stories, including comprehensive metadata parsing,
 * playlist detection, and chapter information extraction.
 */

import { BaseExtractor, ExtractionError } from '../base-extractor';
import {
  StoryMetadata,
  ValidationResult,
  CompletionStatus,
  ConfigUIDefinition,
} from '../../../types/submission';

/**
 * YouTube extractor implementation for audiobook content
 */
export class YouTubeExtractor extends BaseExtractor {
  readonly id = 'youtube';
  readonly name = 'YouTube';
  readonly urlPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
    /^https?:\/\/youtu\.be\//,
    /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=/,
  ];

  /**
   * Check if current page is a YouTube video that might contain fanfiction content
   */
  canExtract(): boolean {
    if (!this.urlPatterns.some(pattern => pattern.test(window.location.href))) {
      return false;
    }

    // Check if this appears to be fanfiction-related content
    const title = document.title.toLowerCase();
    const description = (
      document.querySelector('#description-text')?.textContent || ''
    ).toLowerCase();

    const fanfictionIndicators = [
      'fanfiction',
      'fanfic',
      'fan fiction',
      'audiobook',
      'narrated',
      'reading',
      'harry potter',
      'hermione',
      'draco',
      'naruto',
      'sasuke',
      'percy jackson',
      'fanfiction.net',
      'archive of our own',
      'ao3',
      'wattpad',
      'chapter',
      'story',
      'novel',
      'book reading',
    ];

    return fanfictionIndicators.some(
      indicator => title.includes(indicator) || description.includes(indicator)
    );
  }

  /**
   * Extract story metadata from YouTube video page
   */
  async extract(): Promise<StoryMetadata> {
    if (!this.canExtract()) {
      throw new ExtractionError(
        'Cannot extract from current page - not fanfiction content',
        'EXTRACTION_NOT_SUPPORTED'
      );
    }

    // Check if video is accessible
    if (this.isVideoNotFound()) {
      throw new ExtractionError(
        'Video not found or has been removed',
        'VIDEO_NOT_FOUND'
      );
    }

    try {
      const metadata: StoryMetadata = {
        title: this.extractTitle(),
        author: this.extractAuthor(),
        summary: this.extractSummary(),
        url: this.normalizeYouTubeUrl(window.location.href),
        wordCount: this.estimateWordCount(),
        chapterCount: this.extractChapterCount(),
        completionStatus: this.extractCompletionStatus(),
        publishDate: this.extractPublishDate(),
        lastUpdateDate: this.extractLastUpdateDate(),
        language: this.extractLanguage(),
        rating: this.extractRating(),
        warnings: this.extractWarnings(),
        relationships: this.extractRelationships(),
        characters: this.extractCharacters(),
        additionalTags: this.extractTags(),
        series: this.extractSeries(),
      };

      return metadata;
    } catch (error) {
      throw new ExtractionError(
        `Failed to extract YouTube metadata: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Check if video is not found or removed
   */
  private isVideoNotFound(): boolean {
    return (
      document.querySelector('.ytp-error') !== null ||
      document.querySelector('.player-unavailable') !== null ||
      document.body.textContent?.includes('Video unavailable') === true ||
      document.body.textContent?.includes('This video has been removed') ===
        true
    );
  }

  /**
   * Extract video title and clean it for story title
   */
  private extractTitle(): string {
    let title = document.title;

    // Remove " - YouTube" suffix
    title = title.replace(/\s*-\s*YouTube\s*$/, '');

    // Try to clean up common patterns in fanfiction audiobook titles
    title = this.cleanFanfictionTitle(title);

    if (!title || title.trim().length === 0) {
      throw new ExtractionError(
        'Could not extract story title',
        'MISSING_TITLE'
      );
    }

    return title.trim();
  }

  /**
   * Clean common fanfiction audiobook title patterns
   */
  private cleanFanfictionTitle(title: string): string {
    // Remove common prefixes/suffixes
    const patterns = [
      /^(fanfiction|fanfic|audiobook|reading)\s*:?\s*/i,
      /\s*-?\s*(audiobook|fanfiction|fanfic|reading)$/i,
      /^(hp|harry potter|naruto|percy jackson)\s*-?\s*/i,
      /\s*\|\s*(chapter \d+|part \d+)$/i,
      /^\[.*?\]\s*/, // Remove brackets at start
      /\s*\(.*audiobook.*\)$/i,
    ];

    let cleaned = title;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '').trim();
    });

    return cleaned || title; // Return original if we cleaned everything
  }

  /**
   * Extract channel name as author
   */
  private extractAuthor(): string {
    // Try multiple selectors for channel name
    let author =
      this.safeTextContent('#owner-name a') ||
      this.safeTextContent('#upload-info #owner-name a') ||
      this.safeTextContent('.ytd-channel-name a') ||
      this.safeTextContent('#channel-name a');

    // If we can't find the channel name, try alternative methods
    if (!author) {
      const channelLinks = document.querySelectorAll(
        'a[href*="/channel/"], a[href*="/@"]'
      );
      if (channelLinks.length > 0) {
        author = channelLinks[0].textContent?.trim();
      }
    }

    if (!author) {
      throw new ExtractionError(
        'Could not extract channel name',
        'MISSING_AUTHOR'
      );
    }

    return author;
  }

  /**
   * Extract video description and parse for story information
   */
  private extractSummary(): string {
    let description =
      this.safeTextContent('#description-text') ||
      this.safeTextContent('.content-description') ||
      this.safeTextContent('#description');

    if (!description) {
      return 'No description provided';
    }

    // Clean up description and extract relevant parts
    const lines = description.split('\n');
    const relevantLines: string[] = [];

    for (const line of lines) {
      const cleanLine = line.trim();

      // Skip lines that are just URLs or social media links
      if (
        cleanLine.match(/^https?:\/\//) ||
        cleanLine.match(/^(twitter|instagram|facebook|discord):/i)
      ) {
        continue;
      }

      // Skip lines that are just chapter timecodes
      if (cleanLine.match(/^\d{1,2}:\d{2}.*chapter/i)) {
        continue;
      }

      if (cleanLine.length > 10) {
        relevantLines.push(cleanLine);
      }

      // Stop if we have enough content
      if (relevantLines.length >= 5) {
        break;
      }
    }

    return relevantLines.join('\n') || 'Audio narration of fanfiction story';
  }

  /**
   * Estimate word count based on video duration (rough approximation)
   */
  private estimateWordCount(): number | undefined {
    const duration = this.extractVideoDuration();
    if (!duration) {
      return undefined;
    }

    // Rough estimation: average reading speed is ~150-200 words per minute
    // Audiobooks tend to be slower, so use ~130 words per minute
    const wordsPerMinute = 130;
    const estimatedWords = Math.round(duration * wordsPerMinute);

    return estimatedWords > 0 ? estimatedWords : undefined;
  }

  /**
   * Extract video duration in minutes
   */
  private extractVideoDuration(): number | undefined {
    // Try to get duration from various sources
    let durationText =
      this.safeTextContent('.ytp-time-duration') ||
      this.safeTextContent('#movie_player .ytp-time-duration');

    if (!durationText) {
      // Try to get from video element
      const videoElement = document.querySelector('video');
      if (videoElement && videoElement.duration) {
        return Math.round(videoElement.duration / 60); // Convert seconds to minutes
      }
    }

    if (durationText) {
      const timeParts = durationText.split(':').map(part => parseInt(part, 10));
      if (timeParts.length === 2) {
        // MM:SS format
        return timeParts[0] + timeParts[1] / 60;
      } else if (timeParts.length === 3) {
        // HH:MM:SS format
        return timeParts[0] * 60 + timeParts[1] + timeParts[2] / 60;
      }
    }

    return undefined;
  }

  /**
   * Extract chapter count from description or title
   */
  private extractChapterCount(): number | undefined {
    const description = this.safeTextContent('#description-text') || '';
    const title = document.title;
    const combinedText = `${title} ${description}`;

    // Look for chapter indicators
    const chapterPatterns = [
      /chapter\s*(\d+)(?:\s*[-\/]\s*(\d+))?/i,
      /part\s*(\d+)(?:\s*[-\/]\s*(\d+))?/i,
      /(\d+)\s*chapters?/i,
      /(\d+)\s*parts?/i,
    ];

    for (const pattern of chapterPatterns) {
      const match = combinedText.match(pattern);
      if (match) {
        // If it's "chapter X of Y" format, return Y
        if (match[2]) {
          const totalChapters = parseInt(match[2], 10);
          return isNaN(totalChapters) ? undefined : totalChapters;
        }
        // If it's "X chapters" format, return X
        const chapterCount = parseInt(match[1], 10);
        return isNaN(chapterCount) ? 1 : chapterCount;
      }
    }

    // Check if this is part of a playlist (might indicate multiple chapters)
    if (this.isPartOfPlaylist()) {
      const playlistSize = this.getPlaylistSize();
      if (playlistSize) {
        return playlistSize;
      }
    }

    return 1; // Default to 1 chapter
  }

  /**
   * Check if video is part of a playlist
   */
  private isPartOfPlaylist(): boolean {
    return (
      window.location.href.includes('list=') ||
      document.querySelector('.playlist-header') !== null
    );
  }

  /**
   * Get playlist size if available
   */
  private getPlaylistSize(): number | undefined {
    const playlistInfo =
      this.safeTextContent('.playlist-header .index-message') ||
      this.safeTextContent('.playlist-current-index');

    if (playlistInfo) {
      const match = playlistInfo.match(/\d+\s*\/\s*(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Extract completion status based on title and description
   */
  private extractCompletionStatus(): CompletionStatus {
    const text = `${document.title} ${
      this.safeTextContent('#description-text') || ''
    }`.toLowerCase();

    if (
      text.includes('complete') ||
      text.includes('finished') ||
      text.includes('full story')
    ) {
      return CompletionStatus.COMPLETE;
    }

    if (
      text.includes('ongoing') ||
      text.includes('in progress') ||
      text.includes('part ')
    ) {
      return CompletionStatus.IN_PROGRESS;
    }

    // If it's part of a playlist, likely in progress unless marked complete
    if (this.isPartOfPlaylist() && !text.includes('complete')) {
      return CompletionStatus.IN_PROGRESS;
    }

    return CompletionStatus.UNKNOWN;
  }

  /**
   * Extract publish date from video metadata
   */
  private extractPublishDate(): Date | undefined {
    const dateText =
      this.safeTextContent('#info-strings yt-formatted-string') ||
      this.safeTextContent('#date yt-formatted-string');

    if (dateText) {
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  /**
   * Extract last update date (same as publish for individual videos)
   */
  private extractLastUpdateDate(): Date | undefined {
    return this.extractPublishDate();
  }

  /**
   * Extract language (usually English for most fanfiction audiobooks)
   */
  private extractLanguage(): string | undefined {
    // YouTube doesn't always show language clearly, default to English
    return 'English';
  }

  /**
   * Extract content rating from description
   */
  private extractRating(): string | undefined {
    const description = (
      this.safeTextContent('#description-text') || ''
    ).toLowerCase();

    if (
      description.includes('mature') ||
      description.includes('18+') ||
      description.includes('adult')
    ) {
      return 'Mature';
    }

    if (description.includes('teen') || description.includes('13+')) {
      return 'Teen';
    }

    return 'General'; // Default assumption
  }

  /**
   * Extract content warnings from description
   */
  private extractWarnings(): string[] {
    const description = (
      this.safeTextContent('#description-text') || ''
    ).toLowerCase();
    const warnings: string[] = [];

    const warningIndicators = [
      { pattern: /violence|graphic|gore/, warning: 'Violence' },
      { pattern: /mature content|adult themes/, warning: 'Mature Content' },
      { pattern: /strong language|profanity/, warning: 'Strong Language' },
      { pattern: /sexual content|nsfw/, warning: 'Sexual Content' },
    ];

    warningIndicators.forEach(({ pattern, warning }) => {
      if (pattern.test(description)) {
        warnings.push(warning);
      }
    });

    return warnings;
  }

  /**
   * Extract relationships from title and description
   */
  private extractRelationships(): string[] {
    const text = `${document.title} ${
      this.safeTextContent('#description-text') || ''
    }`;
    const relationships: string[] = [];

    // Common fanfiction relationship patterns
    const relationshipPatterns = [
      /(\w+)\s*[\/x]\s*(\w+)/g, // Harry/Hermione or Harry x Hermione
      /(\w+)\s*and\s*(\w+)\s*romance/gi,
    ];

    relationshipPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[2]) {
          relationships.push(`${match[1]}/${match[2]}`);
        }
      }
    });

    return relationships;
  }

  /**
   * Extract characters from title and description
   */
  private extractCharacters(): string[] {
    const text = `${document.title} ${
      this.safeTextContent('#description-text') || ''
    }`;
    const characters: string[] = [];

    // Common character name patterns (this is very basic)
    const characterPatterns = [
      /\b(Harry Potter|Hermione Granger|Ron Weasley|Draco Malfoy)\b/gi,
      /\b(Naruto|Sasuke|Sakura|Kakashi)\b/gi,
      /\b(Percy Jackson|Annabeth|Grover)\b/gi,
    ];

    characterPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[0] && !characters.includes(match[0])) {
          characters.push(match[0]);
        }
      }
    });

    return characters;
  }

  /**
   * Extract tags from title and description
   */
  private extractTags(): string[] {
    const text = `${document.title} ${
      this.safeTextContent('#description-text') || ''
    }`.toLowerCase();
    const tags: string[] = [];

    // Common fanfiction tags
    const tagPatterns = [
      'audiobook',
      'fanfiction',
      'fanfic',
      'romance',
      'adventure',
      'hurt/comfort',
      'angst',
      'fluff',
      'alternate universe',
      'au',
      'time travel',
      'crossover',
      'fix-it',
      'slow burn',
    ];

    tagPatterns.forEach(tag => {
      if (text.includes(tag)) {
        tags.push(tag.replace(/\b\w/g, l => l.toUpperCase())); // Title case
      }
    });

    // Add medium-specific tags
    tags.push('Audiobook', 'YouTube');

    return tags;
  }

  /**
   * Extract series information from playlist or title
   */
  private extractSeries(): { name: string; part: number } | undefined {
    if (this.isPartOfPlaylist()) {
      const playlistTitle = this.safeTextContent('.playlist-header .title');
      const currentIndex = this.safeTextContent('.playlist-current-index');

      if (playlistTitle) {
        let part = 1;
        if (currentIndex) {
          const match = currentIndex.match(/(\d+)/);
          if (match) {
            part = parseInt(match[1], 10) || 1;
          }
        }

        return {
          name: playlistTitle,
          part: part,
        };
      }
    }

    // Check title for series indicators
    const title = document.title;
    const seriesMatch = title.match(
      /(.+?)\s*[-–]\s*(?:chapter|part|book)\s*(\d+)/i
    );
    if (seriesMatch) {
      return {
        name: seriesMatch[1].trim(),
        part: parseInt(seriesMatch[2], 10) || 1,
      };
    }

    return undefined;
  }

  /**
   * Normalize YouTube URL to canonical form
   */
  private normalizeYouTubeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Handle youtu.be short URLs
      if (urlObj.hostname === 'youtu.be') {
        const videoId = urlObj.pathname.slice(1); // Remove leading slash
        return `https://www.youtube.com/watch?v=${videoId}`;
      }

      // Handle regular YouTube URLs
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }

        // Handle playlist URLs
        const playlistId = urlObj.searchParams.get('list');
        if (playlistId) {
          return `https://www.youtube.com/playlist?list=${playlistId}`;
        }
      }

      throw new ExtractionError('Invalid YouTube URL format', 'INVALID_URL');
    } catch (error) {
      throw new ExtractionError(`Invalid URL format: ${url}`, 'INVALID_URL');
    }
  }

  /**
   * Validate extracted YouTube metadata
   */
  validate(metadata: StoryMetadata): ValidationResult {
    const result = super.validate(metadata);

    // YouTube-specific validation
    if (
      !metadata.url.includes('youtube.com/watch?v=') &&
      !metadata.url.includes('youtube.com/playlist?list=')
    ) {
      result.errors.push('Invalid YouTube URL');
    }

    // Warn about estimated word count
    if (metadata.wordCount) {
      result.warnings.push(
        'Word count is estimated based on video duration and may not be accurate'
      );
    }

    // Check if this really seems like fanfiction content
    const title = metadata.title.toLowerCase();
    if (
      !title.includes('fanfic') &&
      !title.includes('story') &&
      !title.includes('chapter')
    ) {
      result.warnings.push('This video may not contain fanfiction content');
    }

    return result;
  }

  /**
   * Get configuration UI for YouTube extractor
   */
  getConfigUI(): ConfigUIDefinition {
    return {
      fields: [
        {
          name: 'estimateWordCount',
          type: 'boolean',
          label: 'Estimate word count from duration',
          description: 'Calculate approximate word count based on video length',
          required: false,
        },
        {
          name: 'includePlaylistInfo',
          type: 'boolean',
          label: 'Include playlist information',
          description: 'Extract series information from playlists',
          required: false,
        },
        {
          name: 'strictFanfictionFilter',
          type: 'boolean',
          label: 'Strict fanfiction filtering',
          description:
            'Only extract from videos with clear fanfiction indicators',
          required: false,
        },
        {
          name: 'wordsPerMinute',
          type: 'number',
          label: 'Words per minute (for estimation)',
          description: 'Average reading speed for word count estimation',
          required: false,
        },
      ],
    };
  }
}

// Export singleton instance for browser extension usage
export const youtubeExtractor = new YouTubeExtractor();
