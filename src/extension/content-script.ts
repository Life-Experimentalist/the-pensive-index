/**
 * T038: Extension Content Script
 *
 * Content script for story detection and parsing on supported fanfiction sites
 * Communicates with service worker for submission coordination
 */

/**
 * Content script configuration
 */
const CONTENT_CONFIG = {
  version: '1.0.0',
  detectionDelay: 2000, // Wait 2 seconds after page load for dynamic content
  maxRetries: 3,
  debugMode: false,
} as const;

/**
 * Site-specific parsers for different fanfiction platforms
 */
interface SiteParser {
  name: string;
  domain: string;
  patterns: string[];
  canParse(url: string): boolean;
  parseStory(document: Document): ParsedStoryData | null;
  getStoryId(url: string): string | null;
  isStoryPage(document: Document): boolean;
}

interface ParsedStoryData {
  title: string;
  author: string;
  authorUrl?: string;
  fandom: string;
  description: string;
  tags: string[];
  characters?: string[];
  relationships?: string[];
  chapters: number;
  wordCount: number;
  language: string;
  rating: string;
  warnings?: string[];
  categories?: string[];
  status: 'complete' | 'in-progress' | 'abandoned';
  publishedDate?: Date;
  updatedDate?: Date;
  additionalMetadata?: Record<string, any>;
}

/**
 * Archive of Our Own (AO3) Parser
 */
class AO3Parser implements SiteParser {
  name = 'Archive of Our Own';
  domain = 'archiveofourown.org';
  patterns = ['/works/', '/series/'];

  canParse(url: string): boolean {
    return url.includes('archiveofourown.org') && url.includes('/works/');
  }

  getStoryId(url: string): string | null {
    const match = url.match(/\/works\/(\d+)/);
    return match ? match[1] : null;
  }

  isStoryPage(document: Document): boolean {
    return document.querySelector('.work.meta.group') !== null;
  }

  parseStory(document: Document): ParsedStoryData | null {
    try {
      const workMeta = document.querySelector('.work.meta.group');
      if (!workMeta) return null;

      // Title
      const titleElement = document.querySelector('h2.title.heading');
      const title = titleElement?.textContent?.trim() || '';

      // Author
      const authorElement = document.querySelector(
        'h3.byline.heading a[rel="author"]'
      );
      const author = authorElement?.textContent?.trim() || '';
      const authorUrl = authorElement?.getAttribute('href') || '';

      // Fandom
      const fandomElements = document.querySelectorAll('.fandom.tags .tag');
      const fandoms = Array.from(fandomElements).map(
        el => el.textContent?.trim() || ''
      );
      const fandom = fandoms[0] || ''; // Use first fandom as primary

      // Description
      const summaryElement = document.querySelector('.summary .userstuff');
      const description = summaryElement?.textContent?.trim() || '';

      // Tags
      const freeformTags = Array.from(
        document.querySelectorAll('.freeform.tags .tag')
      )
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean);
      const additionalTags = Array.from(
        document.querySelectorAll('.additional.tags .tag')
      )
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean);
      const tags = [...freeformTags, ...additionalTags];

      // Characters
      const characters = Array.from(
        document.querySelectorAll('.character.tags .tag')
      )
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean);

      // Relationships
      const relationships = Array.from(
        document.querySelectorAll('.relationship.tags .tag')
      )
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean);

      // Stats
      const statsElement = document.querySelector('.stats');
      const chaptersText =
        statsElement?.querySelector('dd.chapters')?.textContent || '1/1';
      const chapters = parseInt(chaptersText.split('/')[0]) || 1;
      const totalChapters = chaptersText.split('/')[1];

      const wordsText =
        statsElement?.querySelector('dd.words')?.textContent || '0';
      const wordCount = parseInt(wordsText.replace(/,/g, '')) || 0;

      // Language
      const language =
        statsElement?.querySelector('dd.language')?.textContent?.trim() ||
        'English';

      // Rating
      const ratingElement = document.querySelector('.rating.tags .tag');
      const rating = ratingElement?.textContent?.trim() || 'Not Rated';

      // Warnings
      const warnings = Array.from(
        document.querySelectorAll('.warning.tags .tag')
      )
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean);

      // Categories
      const categories = Array.from(
        document.querySelectorAll('.category.tags .tag')
      )
        .map(el => el.textContent?.trim() || '')
        .filter(Boolean);

      // Status
      let status: 'complete' | 'in-progress' | 'abandoned' = 'complete';
      if (totalChapters === '?' || chapters < parseInt(totalChapters || '1')) {
        status = 'in-progress';
      }

      // Dates
      const publishedElement = document.querySelector('dd.published');
      const publishedDate = publishedElement?.textContent
        ? new Date(publishedElement.textContent)
        : undefined;

      const updatedElement = document.querySelector('dd.status');
      const updatedDate = updatedElement?.textContent
        ? new Date(updatedElement.textContent)
        : publishedDate;

      return {
        title,
        author,
        authorUrl: authorUrl
          ? `https://archiveofourown.org${authorUrl}`
          : undefined,
        fandom,
        description,
        tags,
        characters,
        relationships,
        chapters,
        wordCount,
        language,
        rating,
        warnings,
        categories,
        status,
        publishedDate,
        updatedDate,
        additionalMetadata: {
          fandoms: fandoms.slice(1), // Additional fandoms
          kudos: this.extractStat(statsElement, 'kudos'),
          bookmarks: this.extractStat(statsElement, 'bookmarks'),
          hits: this.extractStat(statsElement, 'hits'),
          comments: this.extractStat(statsElement, 'comments'),
        },
      };
    } catch (error) {
      console.error('[AO3 Parser] Error parsing story:', error);
      return null;
    }
  }

  private extractStat(statsElement: Element | null, statName: string): number {
    const element = statsElement?.querySelector(`dd.${statName}`);
    return parseInt(element?.textContent?.replace(/,/g, '') || '0') || 0;
  }
}

/**
 * FanFiction.Net Parser
 */
class FFNetParser implements SiteParser {
  name = 'FanFiction.Net';
  domain = 'fanfiction.net';
  patterns = ['/s/'];

  canParse(url: string): boolean {
    return url.includes('fanfiction.net') && url.includes('/s/');
  }

  getStoryId(url: string): string | null {
    const match = url.match(/\/s\/(\d+)/);
    return match ? match[1] : null;
  }

  isStoryPage(document: Document): boolean {
    return document.querySelector('#profile_top') !== null;
  }

  parseStory(document: Document): ParsedStoryData | null {
    try {
      // Title
      const titleElement = document.querySelector(
        '#profile_top b.xcontrast_txt'
      );
      const title = titleElement?.textContent?.trim() || '';

      // Author
      const authorElement = document.querySelector(
        '#profile_top a.xcontrast_txt'
      );
      const author = authorElement?.textContent?.trim() || '';
      const authorUrl = authorElement?.getAttribute('href') || '';

      // Description
      const descElement = document.querySelector('#profile_top + div');
      const description = descElement?.textContent?.trim() || '';

      // Metadata from the gray text line
      const grayText =
        document.querySelector('#profile_top .xgray.xcontrast_txt')
          ?.textContent || '';
      const metadata = this.parseFFNetMetadata(grayText);

      // Extract story content for additional analysis
      const contentElement = document.querySelector('#storytext');
      const wordCount = this.estimateWordCount(
        contentElement?.textContent || ''
      );

      return {
        title,
        author,
        authorUrl: authorUrl
          ? `https://www.fanfiction.net${authorUrl}`
          : undefined,
        fandom: metadata.fandom || '',
        description,
        tags: metadata.genres || [],
        characters: metadata.characters || [],
        relationships: [],
        chapters: metadata.chapters || 1,
        wordCount: metadata.wordCount || wordCount,
        language: metadata.language || 'English',
        rating: metadata.rating || 'K',
        warnings: [],
        categories: [],
        status: metadata.status || 'complete',
        publishedDate: metadata.publishedDate,
        updatedDate: metadata.updatedDate,
        additionalMetadata: {
          reviews: metadata.reviews,
          favs: metadata.favs,
          follows: metadata.follows,
        },
      };
    } catch (error) {
      console.error('[FFNet Parser] Error parsing story:', error);
      return null;
    }
  }

  private parseFFNetMetadata(grayText: string): any {
    const metadata: any = {};

    // Parse the complex metadata string
    // Example: "Rated: K+ - English - Romance/Drama - Characters: Harry P., Hermione G. - Chapters: 15 - Words: 45,123 - Reviews: 234 - Favs: 567 - Follows: 123 - Updated: 1/15 - Published: 12/1/2023 - Status: Complete"

    const parts = grayText.split(' - ');

    for (const part of parts) {
      const trimmed = part.trim();

      if (trimmed.startsWith('Rated:')) {
        metadata.rating = trimmed.replace('Rated:', '').trim();
      } else if (trimmed.match(/^[A-Za-z]+$/)) {
        metadata.language = trimmed;
      } else if (trimmed.includes('/')) {
        if (
          trimmed.includes('Romance') ||
          trimmed.includes('Drama') ||
          trimmed.includes('Adventure')
        ) {
          metadata.genres = trimmed.split('/').map(g => g.trim());
        }
      } else if (trimmed.startsWith('Characters:')) {
        const chars = trimmed
          .replace('Characters:', '')
          .split(',')
          .map(c => c.trim());
        metadata.characters = chars;
      } else if (trimmed.startsWith('Chapters:')) {
        metadata.chapters =
          parseInt(trimmed.replace('Chapters:', '').trim()) || 1;
      } else if (trimmed.startsWith('Words:')) {
        metadata.wordCount =
          parseInt(trimmed.replace('Words:', '').replace(/,/g, '').trim()) || 0;
      } else if (trimmed.startsWith('Reviews:')) {
        metadata.reviews =
          parseInt(trimmed.replace('Reviews:', '').replace(/,/g, '').trim()) ||
          0;
      } else if (trimmed.startsWith('Favs:')) {
        metadata.favs =
          parseInt(trimmed.replace('Favs:', '').replace(/,/g, '').trim()) || 0;
      } else if (trimmed.startsWith('Follows:')) {
        metadata.follows =
          parseInt(trimmed.replace('Follows:', '').replace(/,/g, '').trim()) ||
          0;
      } else if (trimmed.startsWith('Updated:')) {
        const dateStr = trimmed.replace('Updated:', '').trim();
        metadata.updatedDate = this.parseFFNetDate(dateStr);
      } else if (trimmed.startsWith('Published:')) {
        const dateStr = trimmed.replace('Published:', '').trim();
        metadata.publishedDate = this.parseFFNetDate(dateStr);
      } else if (trimmed.startsWith('Status:')) {
        const status = trimmed.replace('Status:', '').trim().toLowerCase();
        metadata.status = status.includes('complete')
          ? 'complete'
          : 'in-progress';
      }
    }

    // Get fandom from breadcrumb or page title
    const breadcrumb = document.querySelector('.lc-left a');
    if (breadcrumb) {
      metadata.fandom = breadcrumb.textContent?.trim() || '';
    }

    return metadata;
  }

  private parseFFNetDate(dateStr: string): Date | undefined {
    try {
      // FFNet uses various date formats like "1/15", "12/1/2023", etc.
      const currentYear = new Date().getFullYear();

      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 2) {
          // Assume current year
          return new Date(`${parts[0]}/${parts[1]}/${currentYear}`);
        } else if (parts.length === 3) {
          return new Date(dateStr);
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

/**
 * Content Script Main Class
 */
class ContentScript {
  private parsers: SiteParser[] = [];
  private detectionTimer: number | null = null;
  private isReady = false;

  constructor() {
    this.initializeParsers();
    this.setupMessageHandlers();
    this.initialize();
  }

  /**
   * Initialize parsers for supported sites
   */
  private initializeParsers(): void {
    this.parsers = [
      new AO3Parser(),
      new FFNetParser(),
      // Additional parsers would be added here
    ];
  }

  /**
   * Set up message handlers for communication with service worker
   */
  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  /**
   * Initialize content script
   */
  private async initialize(): Promise<void> {
    try {
      console.log('[Content Script] Initializing on:', window.location.href);

      // Wait for page to be fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.delayedInitialization();
        });
      } else {
        this.delayedInitialization();
      }
    } catch (error) {
      console.error('[Content Script] Initialization failed:', error);
    }
  }

  /**
   * Delayed initialization to wait for dynamic content
   */
  private delayedInitialization(): void {
    this.detectionTimer = window.setTimeout(() => {
      this.performStoryDetection();
    }, CONTENT_CONFIG.detectionDelay);
  }

  /**
   * Perform story detection on the current page
   */
  private async performStoryDetection(): Promise<void> {
    try {
      console.log('[Content Script] Starting story detection');

      // Find appropriate parser for current site
      const parser = this.findParser(window.location.href);
      if (!parser) {
        console.log('[Content Script] No parser found for current site');
        return;
      }

      // Check if this is a story page
      if (!parser.isStoryPage(document)) {
        console.log('[Content Script] Current page is not a story page');
        return;
      }

      // Parse story data
      const parsedData = parser.parseStory(document);
      if (!parsedData) {
        console.log('[Content Script] Failed to parse story data');
        return;
      }

      // Create detected story object
      const detectedStory = {
        id: parser.getStoryId(window.location.href) || this.generateStoryId(),
        url: window.location.href,
        site: parser.domain,
        metadata: {
          detectionConfidence: this.calculateConfidence(parsedData),
          autoTagged: true,
          needsReview: this.needsReview(parsedData),
          parsingVersion: CONTENT_CONFIG.version,
        },
        ...parsedData,
      };

      // Send to service worker
      await this.sendToServiceWorker('STORY_DETECTED', detectedStory);

      console.log(
        '[Content Script] Story detection completed:',
        detectedStory.title
      );
    } catch (error) {
      console.error('[Content Script] Story detection failed:', error);
    }
  }

  /**
   * Handle messages from service worker
   */
  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log(`[Content Script] Received message: ${message.type}`);

      switch (message.type) {
        case 'DETECT_STORY':
          await this.performStoryDetection();
          sendResponse({ success: true });
          break;

        case 'GET_STORY_DATA':
          const storyData = await this.getCurrentStoryData();
          sendResponse({ success: true, data: storyData });
          break;

        case 'PARSE_ADDITIONAL_DATA':
          const additionalData = await this.parseAdditionalData(
            message.payload
          );
          sendResponse({ success: true, data: additionalData });
          break;

        default:
          console.warn(
            `[Content Script] Unhandled message type: ${message.type}`
          );
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Content Script] Message handling failed:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Send message to service worker
   */
  private async sendToServiceWorker(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type, payload, timestamp: Date.now() },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Find appropriate parser for URL
   */
  private findParser(url: string): SiteParser | null {
    return this.parsers.find(parser => parser.canParse(url)) || null;
  }

  /**
   * Calculate detection confidence score
   */
  private calculateConfidence(parsedData: ParsedStoryData): number {
    let confidence = 0;

    if (parsedData.title) confidence += 20;
    if (parsedData.author) confidence += 20;
    if (parsedData.fandom) confidence += 15;
    if (parsedData.description) confidence += 10;
    if (parsedData.wordCount > 0) confidence += 10;
    if (parsedData.tags.length > 0) confidence += 10;
    if (parsedData.chapters > 0) confidence += 5;
    if (parsedData.rating) confidence += 5;
    if (parsedData.publishedDate) confidence += 5;

    return Math.min(confidence, 100);
  }

  /**
   * Determine if story needs manual review
   */
  private needsReview(parsedData: ParsedStoryData): boolean {
    // Stories need review if missing critical data or have potential issues
    return (
      !parsedData.fandom ||
      !parsedData.description ||
      parsedData.tags.length === 0 ||
      parsedData.wordCount === 0
    );
  }

  /**
   * Generate unique story ID
   */
  private generateStoryId(): string {
    return `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current story data (for popup requests)
   */
  private async getCurrentStoryData(): Promise<any> {
    const parser = this.findParser(window.location.href);
    if (!parser || !parser.isStoryPage(document)) {
      return null;
    }

    return parser.parseStory(document);
  }

  /**
   * Parse additional data if requested
   */
  private async parseAdditionalData(request: any): Promise<any> {
    // This could include things like chapter lists, series information, etc.
    const parser = this.findParser(window.location.href);
    if (!parser) return null;

    // Implement additional parsing based on request type
    switch (request.type) {
      case 'chapters':
        return this.parseChapterList();
      case 'series':
        return this.parseSeriesInfo();
      default:
        return null;
    }
  }

  /**
   * Parse chapter list (if available)
   */
  private parseChapterList(): any[] {
    // Implementation would vary by site
    // This is a placeholder
    return [];
  }

  /**
   * Parse series information (if available)
   */
  private parseSeriesInfo(): any {
    // Implementation would vary by site
    // This is a placeholder
    return null;
  }
}

/**
 * Initialize content script when loaded
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScript();
  });
} else {
  new ContentScript();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContentScript, AO3Parser, FFNetParser };
}
