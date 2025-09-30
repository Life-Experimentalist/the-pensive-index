/**
 * Base Website Extractor Interface and Utilities
 *
 * This module defines the base interface and abstract class for website extractors,
 * providing common functionality for story metadata extraction across different
 * fanfiction platforms.
 */

import {
  StoryMetadata,
  ValidationResult,
  ConfigUIDefinition,
  ExtractorConfig,
  CompletionStatus,
} from '../../types/submission';

/**
 * Website Extractor Interface
 *
 * Each website support module must implement this interface to provide
 * story metadata extraction capabilities.
 */
export interface WebsiteExtractor {
  /** Unique identifier for the extractor */
  readonly id: string;

  /** Human-readable website name */
  readonly name: string;

  /** URL patterns this extractor supports */
  readonly urlPatterns: RegExp[];

  /** Test if current page is supported */
  canExtract(): boolean;

  /** Extract story metadata from current page */
  extract(): Promise<StoryMetadata>;

  /** Optional: Validate extracted data */
  validate?(metadata: StoryMetadata): ValidationResult;

  /** Optional: Get additional configuration UI */
  getConfigUI?(): ConfigUIDefinition;
}

/**
 * Base Extraction Error Class
 */
export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/**
 * Abstract Base Extractor Class
 *
 * Provides common functionality and utilities for all website extractors.
 */
export abstract class BaseExtractor implements WebsiteExtractor {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly urlPatterns: RegExp[];

  /**
   * Check if the current page can be extracted
   */
  canExtract(): boolean {
    const currentUrl = window.location.href;
    return this.urlPatterns.some(pattern => pattern.test(currentUrl));
  }

  /**
   * Abstract method to extract story metadata
   */
  abstract extract(): Promise<StoryMetadata>;

  /**
   * Default validation implementation
   */
  validate(metadata: StoryMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!metadata.title || metadata.title.trim().length === 0) {
      errors.push('Story title is required');
    }

    if (!metadata.author || metadata.author.trim().length === 0) {
      errors.push('Author name is required');
    }

    if (!metadata.url || !this.isValidUrl(metadata.url)) {
      errors.push('Valid story URL is required');
    }

    if (!metadata.summary || metadata.summary.trim().length < 10) {
      warnings.push('Story summary is very short or missing');
    }

    // Data quality warnings
    if (!metadata.wordCount || metadata.wordCount <= 0) {
      warnings.push('Word count is missing or invalid');
    }

    if (!metadata.chapterCount || metadata.chapterCount <= 0) {
      warnings.push('Chapter count is missing or invalid');
    }

    if (metadata.title && metadata.title.length > 500) {
      warnings.push('Story title is unusually long');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Utility method to safely extract text content
   */
  protected safeTextContent(
    selector: string,
    context: Document | Element = document
  ): string | undefined {
    try {
      const element = context.querySelector(selector);
      return element?.textContent?.trim() || undefined;
    } catch (error) {
      console.warn(
        `Failed to extract text from selector "${selector}":`,
        error
      );
      return undefined;
    }
  }

  /**
   * Utility method to safely extract attribute values
   */
  protected safeAttribute(
    selector: string,
    attribute: string,
    context: Document | Element = document
  ): string | undefined {
    try {
      const element = context.querySelector(selector);
      return element?.getAttribute(attribute)?.trim() || undefined;
    } catch (error) {
      console.warn(
        `Failed to extract attribute "${attribute}" from selector "${selector}":`,
        error
      );
      return undefined;
    }
  }

  /**
   * Utility method to extract and parse numbers
   */
  protected safeNumber(
    selector: string,
    context: Document | Element = document
  ): number | undefined {
    const text = this.safeTextContent(selector, context);
    if (!text) {
      return undefined;
    }

    // Extract numeric value from text (handles formats like "1,234 words", "25 chapters")
    const numericMatch = text.match(/[\d,]+/);
    if (!numericMatch) {
      return undefined;
    }

    const number = parseInt(numericMatch[0].replace(/,/g, ''), 10);
    return isNaN(number) ? undefined : number;
  }

  /**
   * Utility method to parse dates
   */
  protected safeDate(
    selector: string,
    context: Document | Element = document
  ): Date | undefined {
    const text = this.safeTextContent(selector, context);
    if (!text) {
      return undefined;
    }

    try {
      const date = new Date(text);
      return isNaN(date.getTime()) ? undefined : date;
    } catch (error) {
      console.warn(`Failed to parse date "${text}":`, error);
      return undefined;
    }
  }

  /**
   * Utility method to extract multiple elements as array
   */
  protected safeTextArray(
    selector: string,
    context: Document | Element = document
  ): string[] {
    try {
      const elements = context.querySelectorAll(selector);
      return Array.from(elements)
        .map(el => el.textContent?.trim())
        .filter((text): text is string => Boolean(text));
    } catch (error) {
      console.warn(
        `Failed to extract text array from selector "${selector}":`,
        error
      );
      return [];
    }
  }

  /**
   * Utility method to normalize URLs
   */
  protected normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      // Remove common query parameters that don't affect story identity
      const paramsToRemove = [
        'ref',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'fbclid',
      ];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch (error) {
      console.warn(`Failed to normalize URL "${url}":`, error);
      return url;
    }
  }

  /**
   * Utility method to validate URLs
   */
  protected isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility method to parse completion status from text
   */
  protected parseCompletionStatus(text: string): CompletionStatus {
    const lower = text.toLowerCase();

    if (lower.includes('complete') || lower.includes('finished')) {
      return CompletionStatus.COMPLETE;
    }

    if (
      lower.includes('progress') ||
      lower.includes('ongoing') ||
      lower.includes('updating')
    ) {
      return CompletionStatus.IN_PROGRESS;
    }

    if (
      lower.includes('abandon') ||
      lower.includes('discontinued') ||
      lower.includes('hiatus')
    ) {
      return CompletionStatus.ABANDONED;
    }

    return CompletionStatus.UNKNOWN;
  }

  /**
   * Utility method to clean and format text
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
      .trim();
  }

  /**
   * Utility method to create extraction result with metadata
   */
  protected createStoryMetadata(data: Partial<StoryMetadata>): StoryMetadata {
    const currentUrl = this.normalizeUrl(window.location.href);

    return {
      title: data.title || '',
      author: data.author || '',
      summary: data.summary || '',
      url: currentUrl,
      wordCount: data.wordCount,
      chapterCount: data.chapterCount,
      completionStatus: data.completionStatus || CompletionStatus.UNKNOWN,
      publishDate: data.publishDate,
      lastUpdateDate: data.lastUpdateDate,
      language: data.language,
      rating: data.rating,
      warnings: data.warnings || [],
      relationships: data.relationships || [],
      characters: data.characters || [],
      additionalTags: data.additionalTags || [],
      series: data.series,
    };
  }

  /**
   * Utility method for retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw new ExtractionError(
      `Operation failed after ${maxRetries} attempts: ${
        lastError?.message || 'Unknown error'
      }`,
      'RETRY_EXHAUSTED',
      false,
      false
    );
  }

  /**
   * Utility method to wait for elements to load
   */
  protected async waitForElement(
    selector: string,
    timeout: number = 5000
  ): Promise<Element | null> {
    return new Promise(resolve => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
}

/**
 * Extractor Configuration Utilities
 */
export class ExtractorUtils {
  /**
   * Create a default configuration UI definition
   */
  static createConfigUI(
    fields: ConfigUIDefinition['fields']
  ): ConfigUIDefinition {
    return { fields };
  }

  /**
   * Validate extractor configuration
   */
  static validateConfig(
    config: ExtractorConfig,
    definition: ConfigUIDefinition
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of definition.fields) {
      if (
        field.required &&
        (config[field.name] === undefined || config[field.name] === '')
      ) {
        errors.push(`Required field "${field.label}" is missing`);
      }

      if (field.type === 'number' && config[field.name] !== undefined) {
        if (isNaN(Number(config[field.name]))) {
          errors.push(`Field "${field.label}" must be a valid number`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Common extraction patterns and constants
 */
export const COMMON_SELECTORS = {
  // Common metadata selectors across platforms
  TITLE: ['h1', '.title', '[data-title]', '.work-title', '.story-title'],
  AUTHOR: ['a[rel="author"]', '.author', '[data-author]', '.username'],
  SUMMARY: ['.summary', '.description', '[data-summary]', '.work-summary'],
  WORD_COUNT: ['[data-wordcount]', '.wordcount', '.stats .words'],
  CHAPTER_COUNT: ['[data-chapters]', '.chapters', '.stats .chapters'],
  COMPLETION_STATUS: ['.status', '[data-status]', '.completion'],
  TAGS: ['.tags a', '.tag', '[data-tag]', '.freeform a'],
  CHARACTERS: ['.characters a', '.character', '[data-character]'],
  RELATIONSHIPS: [
    '.relationships a',
    '.relationship',
    '[data-relationship]',
    '.pairing',
  ],
  PUBLISH_DATE: ['.published', '[data-published]', '.date'],
  UPDATE_DATE: ['.updated', '[data-updated]', '.last-updated'],
} as const;

/**
 * URL pattern helpers
 */
export const URL_PATTERNS = {
  AO3: /^https:\/\/archiveofourown\.org\/works\/\d+/,
  FFN: /^https:\/\/www\.fanfiction\.net\/s\/\d+/,
  WATTPAD: /^https:\/\/www\.wattpad\.com\/story\/\d+/,
  YOUTUBE: /^https:\/\/www\.youtube\.com\/watch\?v=/,
} as const;
