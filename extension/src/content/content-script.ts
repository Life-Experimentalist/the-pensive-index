/**
 * T034: Extension Content Script
 *
 * Content script for browser extension that handles:
 * - Fanfiction website detection logic
 * - "Submit to Pensieve" button injection
 * - Story metadata extraction coordination
 * - UI state management and error handling
 * - Cross-site communication security
 */

// Import website extractors and types
import {
  BaseExtractor,
  WebsiteExtractor,
  ExtractionError,
} from '../../../src/lib/extractors/base-extractor';
import {
  StoryMetadata,
  ExtensionMessage,
  ValidationResult,
} from '../../../src/types/submission';

// Website extractor registry for supported sites
class ExtractorRegistry {
  private extractors: Map<string, WebsiteExtractor> = new Map();

  register(extractor: WebsiteExtractor): void {
    this.extractors.set(extractor.id, extractor);
  }

  getExtractorForUrl(url: string): WebsiteExtractor | null {
    for (const extractor of this.extractors.values()) {
      if (extractor.urlPatterns.some(pattern => pattern.test(url))) {
        return extractor;
      }
    }
    return null;
  }

  getSupportedSites(): string[] {
    return Array.from(this.extractors.keys());
  }
}

// Initialize extractor registry
const extractorRegistry = new ExtractorRegistry();

// Archive of Our Own (AO3) Extractor
class AO3Extractor extends BaseExtractor {
  readonly id = 'ao3';
  readonly name = 'Archive of Our Own';
  readonly urlPatterns = [/^https:\/\/archiveofourown\.org\/works\/\d+/];

  async extract(): Promise<StoryMetadata> {
    try {
      const titleElement = document.querySelector('h2.title.heading');
      const authorElement = document.querySelector('h3.byline a[rel="author"]');
      const summaryElement = document.querySelector('.summary .userstuff');
      const statsElement = document.querySelector('dl.stats');

      if (!titleElement) {
        throw new ExtractionError(
          'Title not found',
          'MISSING_TITLE',
          false,
          false
        );
      }

      const title = titleElement.textContent?.trim() || '';
      const author = authorElement?.textContent?.trim() || 'Unknown Author';
      const summary = summaryElement?.textContent?.trim() || '';

      // Extract word count
      const wordsElement = statsElement?.querySelector('dd.words');
      const wordCount = wordsElement?.textContent
        ? parseInt(wordsElement.textContent.replace(/,/g, ''), 10)
        : undefined;

      // Extract chapter count
      const chaptersElement = statsElement?.querySelector('dd.chapters');
      let chapterCount = undefined;
      if (chaptersElement?.textContent) {
        const chapterText = chaptersElement.textContent.trim();
        const chapterMatch = chapterText.match(/^(\d+)/);
        chapterCount = chapterMatch ? parseInt(chapterMatch[1], 10) : undefined;
      }

      // Extract completion status
      let completionStatus:
        | 'complete'
        | 'incomplete'
        | 'abandoned'
        | 'unknown' = 'unknown';
      if (chaptersElement?.textContent) {
        const isComplete = !chaptersElement.textContent.includes('/');
        completionStatus = isComplete ? 'complete' : 'incomplete';
      }

      // Extract dates
      const publishElement = statsElement?.querySelector('dd.published');
      const updateElement = statsElement?.querySelector('dd.status');

      const publishDate = publishElement?.textContent
        ? new Date(publishElement.textContent.trim())
        : undefined;
      const lastUpdateDate = updateElement?.textContent
        ? new Date(updateElement.textContent.trim())
        : publishDate;

      // Extract tags
      const relationships = Array.from(
        document.querySelectorAll('.relationship.tag')
      ).map(el => el.textContent?.trim() || '');
      const characters = Array.from(
        document.querySelectorAll('.character.tag')
      ).map(el => el.textContent?.trim() || '');
      const additionalTags = Array.from(
        document.querySelectorAll('.freeform.tag')
      ).map(el => el.textContent?.trim() || '');

      // Extract rating and warnings
      const ratingElement = document.querySelector('.rating.tag');
      const rating = ratingElement?.textContent?.trim() || '';

      const warnings = Array.from(
        document.querySelectorAll('.warning.tag')
      ).map(el => el.textContent?.trim() || '');

      return {
        title,
        author,
        summary,
        url: window.location.href,
        wordCount,
        chapterCount,
        completionStatus,
        publishDate,
        lastUpdateDate,
        rating,
        relationships,
        characters,
        additionalTags,
        warnings,
      };
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }
      throw new ExtractionError(
        `Failed to extract AO3 metadata: ${error.message}`,
        'EXTRACTION_ERROR',
        true,
        true
      );
    }
  }
}

// FanFiction.Net (FFN) Extractor
class FFNExtractor extends BaseExtractor {
  readonly id = 'ffn';
  readonly name = 'FanFiction.Net';
  readonly urlPatterns = [/^https:\/\/www\.fanfiction\.net\/s\/\d+/];

  async extract(): Promise<StoryMetadata> {
    try {
      const titleElement = document.querySelector(
        '#profile_top b.xcontrast_txt'
      );
      const authorElement = document.querySelector(
        '#profile_top a.xcontrast_txt'
      );
      const summaryElement = document.querySelector(
        '#profile_top div.xcontrast_txt'
      );
      const statsElement = document.querySelector('#profile_top span.xgray');

      if (!titleElement) {
        throw new ExtractionError(
          'Title not found',
          'MISSING_TITLE',
          false,
          false
        );
      }

      const title = titleElement.textContent?.trim() || '';
      const author = authorElement?.textContent?.trim() || 'Unknown Author';
      const summary = summaryElement?.textContent?.trim() || '';

      // Parse stats (Rating - Language - Genre - Chapters: X - Words: Y - Reviews: Z - Updated: Date - Published: Date)
      const statsText = statsElement?.textContent || '';
      const parts = statsText.split(' - ');

      let wordCount = undefined;
      let chapterCount = undefined;
      let publishDate = undefined;
      let lastUpdateDate = undefined;
      let rating = '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith('Words:')) {
          const wordMatch = trimmed.match(/Words: ([\d,]+)/);
          wordCount = wordMatch
            ? parseInt(wordMatch[1].replace(/,/g, ''), 10)
            : undefined;
        } else if (trimmed.startsWith('Chapters:')) {
          const chapterMatch = trimmed.match(/Chapters: (\d+)/);
          chapterCount = chapterMatch
            ? parseInt(chapterMatch[1], 10)
            : undefined;
        } else if (trimmed.startsWith('Published:')) {
          const dateText = trimmed.replace('Published: ', '');
          publishDate = new Date(dateText);
        } else if (trimmed.startsWith('Updated:')) {
          const dateText = trimmed.replace('Updated: ', '');
          lastUpdateDate = new Date(dateText);
        } else if (trimmed.match(/^(K|K\+|T|M)$/)) {
          rating = trimmed;
        }
      }

      // Completion status - FFN doesn't mark completion clearly, assume incomplete if multiple chapters
      const completionStatus =
        chapterCount && chapterCount > 1 ? 'incomplete' : 'unknown';

      return {
        title,
        author,
        summary,
        url: window.location.href,
        wordCount,
        chapterCount,
        completionStatus,
        publishDate,
        lastUpdateDate: lastUpdateDate || publishDate,
        rating,
        relationships: [],
        characters: [],
        additionalTags: [],
        warnings: [],
      };
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }
      throw new ExtractionError(
        `Failed to extract FFN metadata: ${error.message}`,
        'EXTRACTION_ERROR',
        true,
        true
      );
    }
  }
}

// Wattpad Extractor
class WattpadExtractor extends BaseExtractor {
  readonly id = 'wattpad';
  readonly name = 'Wattpad';
  readonly urlPatterns = [/^https:\/\/www\.wattpad\.com\/story\/\d+/];

  async extract(): Promise<StoryMetadata> {
    try {
      const titleElement = document.querySelector(
        'h1[data-test-id="story-title"]'
      );
      const authorElement = document.querySelector(
        'a[data-test-id="story-author"]'
      );
      const summaryElement = document.querySelector(
        'div[data-test-id="story-description"]'
      );
      const statsElements = document.querySelectorAll(
        'div[data-test-id="story-stats"] span'
      );

      if (!titleElement) {
        throw new ExtractionError(
          'Title not found',
          'MISSING_TITLE',
          false,
          false
        );
      }

      const title = titleElement.textContent?.trim() || '';
      const author = authorElement?.textContent?.trim() || 'Unknown Author';
      const summary = summaryElement?.textContent?.trim() || '';

      // Extract stats from stats elements
      let wordCount = undefined;
      let chapterCount = undefined;

      statsElements.forEach(element => {
        const text = element.textContent?.trim() || '';
        if (text.includes('Parts')) {
          const match = text.match(/(\d+)/);
          chapterCount = match ? parseInt(match[1], 10) : undefined;
        }
        if (text.includes('words')) {
          const match = text.match(/([\d,]+)/);
          wordCount = match
            ? parseInt(match[1].replace(/,/g, ''), 10)
            : undefined;
        }
      });

      // Wattpad stories are typically ongoing unless specifically marked
      const completionStatus = 'unknown';

      return {
        title,
        author,
        summary,
        url: window.location.href,
        wordCount,
        chapterCount,
        completionStatus,
        publishDate: undefined, // Wattpad doesn't clearly show publish dates
        lastUpdateDate: undefined,
        rating: '',
        relationships: [],
        characters: [],
        additionalTags: [],
        warnings: [],
      };
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }
      throw new ExtractionError(
        `Failed to extract Wattpad metadata: ${error.message}`,
        'EXTRACTION_ERROR',
        true,
        true
      );
    }
  }
}

// YouTube Extractor (for fanfiction audiobooks/readings)
class YouTubeExtractor extends BaseExtractor {
  readonly id = 'youtube';
  readonly name = 'YouTube';
  readonly urlPatterns = [/^https:\/\/www\.youtube\.com\/watch\?v=/];

  async extract(): Promise<StoryMetadata> {
    try {
      const titleElement = document.querySelector(
        'h1.ytd-watch-metadata yt-formatted-string'
      );
      const authorElement = document.querySelector('#owner #text a');
      const descriptionElement = document.querySelector(
        '#meta #description yt-formatted-string'
      );

      if (!titleElement) {
        throw new ExtractionError(
          'Title not found',
          'MISSING_TITLE',
          false,
          false
        );
      }

      const title = titleElement.textContent?.trim() || '';
      const author = authorElement?.textContent?.trim() || 'Unknown Creator';
      const summary = descriptionElement?.textContent?.trim() || '';

      return {
        title,
        author,
        summary,
        url: window.location.href,
        wordCount: undefined,
        chapterCount: 1, // YouTube videos are single "chapters"
        completionStatus: 'complete',
        publishDate: undefined,
        lastUpdateDate: undefined,
        rating: '',
        relationships: [],
        characters: [],
        additionalTags: [],
        warnings: [],
      };
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }
      throw new ExtractionError(
        `Failed to extract YouTube metadata: ${error.message}`,
        'EXTRACTION_ERROR',
        true,
        true
      );
    }
  }
}

// Register all extractors
extractorRegistry.register(new AO3Extractor());
extractorRegistry.register(new FFNExtractor());
extractorRegistry.register(new WattpadExtractor());
extractorRegistry.register(new YouTubeExtractor());

// Content Script State Management
interface ContentScriptState {
  isInjected: boolean;
  isExtracting: boolean;
  hasError: boolean;
  errorMessage?: string;
  buttonElement?: HTMLElement;
  extractor?: WebsiteExtractor;
}

class ContentScriptManager {
  private state: ContentScriptState = {
    isInjected: false,
    isExtracting: false,
    hasError: false,
  };

  async initialize(): Promise<void> {
    try {
      console.log('[Pensieve Extension] Initializing content script...');

      // Check if current site is supported
      const currentUrl = window.location.href;
      const extractor = extractorRegistry.getExtractorForUrl(currentUrl);

      if (!extractor) {
        console.log('[Pensieve Extension] Site not supported:', currentUrl);
        return;
      }

      this.state.extractor = extractor;
      console.log(`[Pensieve Extension] Detected ${extractor.name} site`);

      // Wait for page to be ready
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          window.addEventListener('load', resolve, { once: true });
        });
      }

      // Inject submission button
      await this.injectSubmissionButton();

      console.log(
        '[Pensieve Extension] Content script initialized successfully'
      );
    } catch (error) {
      console.error('[Pensieve Extension] Failed to initialize:', error);
      this.setState({ hasError: true, errorMessage: error.message });
    }
  }

  private async injectSubmissionButton(): Promise<void> {
    if (this.state.isInjected || !this.state.extractor) {
      return;
    }

    try {
      // Create submission button
      const button = document.createElement('button');
      button.id = 'pensieve-submit-button';
      button.className = 'pensieve-submit-btn';
      button.innerHTML = `
        <span class="pensieve-icon">📚</span>
        <span class="pensieve-text">Submit to Pensieve Index</span>
      `;

      // Add button styles
      button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 8px;
        padding: 12px 16px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      // Add hover effects
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });

      // Add click handler
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        this.handleSubmissionRequest();
      });

      // Insert button into page
      document.body.appendChild(button);
      this.state.buttonElement = button;
      this.state.isInjected = true;

      console.log('[Pensieve Extension] Submission button injected');
    } catch (error) {
      console.error('[Pensieve Extension] Failed to inject button:', error);
      throw new Error(`Button injection failed: ${error.message}`);
    }
  }

  private async handleSubmissionRequest(): Promise<void> {
    if (
      this.state.isExtracting ||
      !this.state.extractor ||
      !this.state.buttonElement
    ) {
      return;
    }

    try {
      this.setState({ isExtracting: true });
      this.updateButtonState('extracting');

      console.log('[Pensieve Extension] Starting story extraction...');

      // Extract story metadata
      const metadata = await this.state.extractor.extract();

      console.log('[Pensieve Extension] Extracted metadata:', metadata);

      // Validate extracted metadata
      const validation = this.validateMetadata(metadata);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Send to background script for submission
      const message: ExtensionMessage = {
        type: 'SUBMIT_STORY',
        payload: {
          metadata,
          extractorId: this.state.extractor.id,
          extractedAt: new Date().toISOString(),
          pageUrl: window.location.href,
        },
      };

      // Send message to background script
      const response = await this.sendMessage(message);

      if (response.success) {
        this.updateButtonState('success');
        this.showNotification('Story submitted successfully!', 'success');
      } else {
        throw new Error(response.error || 'Submission failed');
      }
    } catch (error) {
      console.error('[Pensieve Extension] Submission failed:', error);
      this.updateButtonState('error');
      this.showNotification(`Submission failed: ${error.message}`, 'error');
      this.setState({ hasError: true, errorMessage: error.message });
    } finally {
      this.setState({ isExtracting: false });

      // Reset button state after delay
      setTimeout(() => {
        this.updateButtonState('default');
      }, 3000);
    }
  }

  private validateMetadata(metadata: StoryMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!metadata.title?.trim()) {
      errors.push('Title is required');
    }
    if (!metadata.author?.trim()) {
      errors.push('Author is required');
    }
    if (!metadata.url?.trim()) {
      errors.push('Story URL is required');
    }

    // URL validation
    if (metadata.url && !this.isValidUrl(metadata.url)) {
      errors.push('Invalid story URL');
    }

    // Word count validation
    if (metadata.wordCount !== undefined && metadata.wordCount < 0) {
      errors.push('Word count cannot be negative');
    }

    // Chapter count validation
    if (metadata.chapterCount !== undefined && metadata.chapterCount < 1) {
      errors.push('Chapter count must be at least 1');
    }

    // Warnings for missing optional fields
    if (!metadata.summary?.trim()) {
      warnings.push('Summary is missing');
    }
    if (metadata.wordCount === undefined) {
      warnings.push('Word count is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private updateButtonState(
    state: 'default' | 'extracting' | 'success' | 'error'
  ): void {
    if (!this.state.buttonElement) return;

    const button = this.state.buttonElement;
    const icon = button.querySelector('.pensieve-icon');
    const text = button.querySelector('.pensieve-text');

    if (!icon || !text) return;

    switch (state) {
      case 'extracting':
        icon.textContent = '⏳';
        text.textContent = 'Extracting story...';
        button.style.background =
          'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)';
        button.disabled = true;
        break;
      case 'success':
        icon.textContent = '✅';
        text.textContent = 'Submitted successfully!';
        button.style.background =
          'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
        button.disabled = false;
        break;
      case 'error':
        icon.textContent = '❌';
        text.textContent = 'Submission failed';
        button.style.background =
          'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';
        button.disabled = false;
        break;
      default:
        icon.textContent = '📚';
        text.textContent = 'Submit to Pensieve Index';
        button.style.background =
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        button.disabled = false;
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `pensieve-notification pensieve-notification-${type}`;
    notification.textContent = message;

    // Add notification styles
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    // Insert and animate
    document.body.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 4000);
  }

  private async sendMessage(message: ExtensionMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use Chrome extension API or polyfill
      const browser = (window as any).browser || (window as any).chrome;

      if (!browser?.runtime?.sendMessage) {
        reject(new Error('Browser extension API not available'));
        return;
      }

      browser.runtime.sendMessage(message, (response: any) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  private setState(updates: Partial<ContentScriptState>): void {
    this.state = { ...this.state, ...updates };
  }

  // Public method to get current state for debugging
  getState(): ContentScriptState {
    return { ...this.state };
  }

  // Clean up resources
  destroy(): void {
    if (this.state.buttonElement) {
      this.state.buttonElement.remove();
    }
    this.state = {
      isInjected: false,
      isExtracting: false,
      hasError: false,
    };
  }
}

// Extension message types for communication with background script
interface ExtensionMessage {
  type: 'SUBMIT_STORY' | 'GET_STATE' | 'ERROR';
  payload?: any;
}

// Initialize content script when DOM is ready
const contentScript = new ContentScriptManager();

// Handle different ready states
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript.initialize();
  });
} else {
  // Already loaded
  contentScript.initialize();
}

// Listen for messages from background script
const browser = (window as any).browser || (window as any).chrome;
if (browser?.runtime?.onMessage) {
  browser.runtime.onMessage.addListener(
    (message: any, sender: any, sendResponse: any) => {
      try {
        if (message.type === 'GET_CONTENT_STATE') {
          sendResponse({
            success: true,
            data: {
              state: contentScript.getState(),
              supportedSites: extractorRegistry.getSupportedSites(),
              currentUrl: window.location.href,
            },
          });
        }
      } catch (error) {
        sendResponse({
          success: false,
          error: error.message,
        });
      }
    }
  );
}

// Export for testing
if (typeof window !== 'undefined') {
  (window as any).PensieveContentScript = {
    manager: contentScript,
    registry: extractorRegistry,
  };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
});

console.log('[Pensieve Extension] Content script loaded');
