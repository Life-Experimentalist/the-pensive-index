/**
 * Website Extractor Registry System
 *
 * This module provides centralized management for all website extractors,
 * including dynamic loading, URL pattern matching, versioning, and
 * performance monitoring.
 */

import {
  WebsiteExtractor,
  ValidationResult,
  ExtractorConfig,
} from '../../types/submission';
import { ExtractionError } from './base-extractor';

// Import all available extractors
import { ao3Extractor } from './websites/archiveofourown';
import { fanfictionNetExtractor } from './websites/fanfiction-net';
import { wattpadExtractor } from './websites/wattpad';
import { youtubeExtractor } from './websites/youtube';

/**
 * Extractor metadata for registry management
 */
export interface ExtractorMetadata {
  extractor: WebsiteExtractor;
  version: string;
  lastUpdated: Date;
  isEnabled: boolean;
  performanceStats: ExtractorPerformanceStats;
  config: ExtractorConfig;
}

/**
 * Performance statistics for each extractor
 */
export interface ExtractorPerformanceStats {
  totalExtractions: number;
  successfulExtractions: number;
  failedExtractions: number;
  averageExtractionTime: number;
  lastExtractionTime?: number;
  errorRate: number;
}

/**
 * Registry configuration options
 */
export interface RegistryConfig {
  enablePerformanceMonitoring: boolean;
  maxRetries: number;
  defaultTimeout: number;
  enableLogging: boolean;
}

/**
 * Extraction result with metadata
 */
export interface ExtractorResult {
  metadata: any;
  extractorId: string;
  extractionTime: number;
  success: boolean;
  error?: string;
}

/**
 * Main extractor registry class
 */
export class ExtractorRegistry {
  private extractors: Map<string, ExtractorMetadata> = new Map();
  private urlPatternCache: Map<RegExp, string> = new Map();
  private config: RegistryConfig;
  private initialized = false;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      enablePerformanceMonitoring: true,
      maxRetries: 3,
      defaultTimeout: 30000, // 30 seconds
      enableLogging: true,
      ...config,
    };
  }

  /**
   * Initialize the registry with all available extractors
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register all built-in extractors
    await this.registerExtractor(ao3Extractor, '1.0.0');
    await this.registerExtractor(fanfictionNetExtractor, '1.0.0');
    await this.registerExtractor(wattpadExtractor, '1.0.0');
    await this.registerExtractor(youtubeExtractor, '1.0.0');

    this.buildUrlPatternCache();
    this.initialized = true;

    if (this.config.enableLogging) {
      console.log(
        `ExtractorRegistry initialized with ${this.extractors.size} extractors`
      );
    }
  }

  /**
   * Register a new extractor with the registry
   */
  async registerExtractor(
    extractor: WebsiteExtractor,
    version: string,
    config: ExtractorConfig = {}
  ): Promise<void> {
    if (this.extractors.has(extractor.id)) {
      if (this.config.enableLogging) {
        console.warn(
          `Extractor ${extractor.id} already registered, updating...`
        );
      }
    }

    const metadata: ExtractorMetadata = {
      extractor,
      version,
      lastUpdated: new Date(),
      isEnabled: true,
      performanceStats: {
        totalExtractions: 0,
        successfulExtractions: 0,
        failedExtractions: 0,
        averageExtractionTime: 0,
        errorRate: 0,
      },
      config,
    };

    this.extractors.set(extractor.id, metadata);

    // Update URL pattern cache
    this.buildUrlPatternCache();

    if (this.config.enableLogging) {
      console.log(`Registered extractor: ${extractor.id} v${version}`);
    }
  }

  /**
   * Unregister an extractor from the registry
   */
  unregisterExtractor(extractorId: string): boolean {
    const removed = this.extractors.delete(extractorId);

    if (removed) {
      this.buildUrlPatternCache();
      if (this.config.enableLogging) {
        console.log(`Unregistered extractor: ${extractorId}`);
      }
    }

    return removed;
  }

  /**
   * Get extractor for a given URL
   */
  getExtractorForUrl(url: string): WebsiteExtractor | null {
    if (!this.initialized) {
      throw new Error('Registry not initialized. Call initialize() first.');
    }

    const patterns = Array.from(this.urlPatternCache.keys());
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        const extractorId = this.urlPatternCache.get(pattern);
        if (extractorId) {
          const metadata = this.extractors.get(extractorId);
          if (metadata && metadata.isEnabled) {
            return metadata.extractor;
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if URL is supported by any extractor
   */
  isUrlSupported(url: string): boolean {
    return this.getExtractorForUrl(url) !== null;
  }

  /**
   * Get all registered extractors
   */
  getExtractors(): ExtractorMetadata[] {
    return Array.from(this.extractors.values());
  }

  /**
   * Get specific extractor by ID
   */
  getExtractor(extractorId: string): ExtractorMetadata | null {
    return this.extractors.get(extractorId) || null;
  }

  /**
   * Enable/disable an extractor
   */
  setExtractorEnabled(extractorId: string, enabled: boolean): boolean {
    const metadata = this.extractors.get(extractorId);
    if (!metadata) {
      return false;
    }

    metadata.isEnabled = enabled;

    if (this.config.enableLogging) {
      console.log(
        `Extractor ${extractorId} ${enabled ? 'enabled' : 'disabled'}`
      );
    }

    return true;
  }

  /**
   * Update extractor configuration
   */
  updateExtractorConfig(
    extractorId: string,
    config: Partial<ExtractorConfig>
  ): boolean {
    const metadata = this.extractors.get(extractorId);
    if (!metadata) {
      return false;
    }

    metadata.config = { ...metadata.config, ...config };
    metadata.lastUpdated = new Date();

    if (this.config.enableLogging) {
      console.log(`Updated configuration for extractor: ${extractorId}`);
    }

    return true;
  }

  /**
   * Extract metadata from URL with performance monitoring
   */
  async extractFromUrl(url: string): Promise<ExtractorResult> {
    const startTime = performance.now();
    let extractorId = 'unknown';

    try {
      const extractor = this.getExtractorForUrl(url);
      if (!extractor) {
        throw new ExtractionError(
          'No extractor found for URL',
          'UNSUPPORTED_URL'
        );
      }

      extractorId = extractor.id;

      // Validate extractor can handle current page
      if (
        typeof extractor.canExtract === 'function' &&
        !extractor.canExtract()
      ) {
        throw new ExtractionError(
          'Extractor cannot handle current page',
          'EXTRACTION_NOT_SUPPORTED'
        );
      }

      // Perform extraction with timeout
      const metadata = await Promise.race([
        extractor.extract(),
        this.createTimeoutPromise(this.config.defaultTimeout),
      ]);

      const extractionTime = performance.now() - startTime;

      // Update performance statistics
      if (this.config.enablePerformanceMonitoring) {
        this.updatePerformanceStats(extractorId, true, extractionTime);
      }

      return {
        metadata,
        extractorId,
        extractionTime,
        success: true,
      };
    } catch (error) {
      const extractionTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Update performance statistics for failure
      if (this.config.enablePerformanceMonitoring) {
        this.updatePerformanceStats(extractorId, false, extractionTime);
      }

      return {
        metadata: null,
        extractorId,
        extractionTime,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Extract with retry logic
   */
  async extractFromUrlWithRetry(
    url: string,
    maxRetries?: number
  ): Promise<ExtractorResult> {
    const retries = maxRetries || this.config.maxRetries;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const result = await this.extractFromUrl(url);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));

        if (this.config.enableLogging) {
          console.log(
            `Extraction attempt ${attempt} failed, retrying in ${delay}ms...`
          );
        }
      }
    }

    // All retries failed
    return {
      metadata: null,
      extractorId: 'unknown',
      extractionTime: 0,
      success: false,
      error: `All ${retries} attempts failed. Last error: ${lastError}`,
    };
  }

  /**
   * Validate extracted metadata using the extractor's validation
   */
  validateMetadata(extractorId: string, metadata: any): ValidationResult {
    const extractorMetadata = this.extractors.get(extractorId);
    if (!extractorMetadata) {
      return {
        isValid: false,
        errors: ['Unknown extractor'],
        warnings: [],
      };
    }

    const extractor = extractorMetadata.extractor;
    if (typeof extractor.validate === 'function') {
      return extractor.validate(metadata);
    }

    return {
      isValid: true,
      errors: [],
      warnings: ['No validation available for this extractor'],
    };
  }

  /**
   * Get performance statistics for an extractor
   */
  getPerformanceStats(extractorId: string): ExtractorPerformanceStats | null {
    const metadata = this.extractors.get(extractorId);
    return metadata ? metadata.performanceStats : null;
  }

  /**
   * Get performance statistics for all extractors
   */
  getAllPerformanceStats(): Record<string, ExtractorPerformanceStats> {
    const stats: Record<string, ExtractorPerformanceStats> = {};

    const extractorIds = Array.from(this.extractors.keys());
    for (const id of extractorIds) {
      const metadata = this.extractors.get(id);
      if (metadata) {
        stats[id] = metadata.performanceStats;
      }
    }

    return stats;
  }

  /**
   * Reset performance statistics for an extractor
   */
  resetPerformanceStats(extractorId: string): boolean {
    const metadata = this.extractors.get(extractorId);
    if (!metadata) {
      return false;
    }

    metadata.performanceStats = {
      totalExtractions: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      averageExtractionTime: 0,
      errorRate: 0,
    };

    return true;
  }

  /**
   * Build URL pattern cache for faster lookup
   */
  private buildUrlPatternCache(): void {
    this.urlPatternCache.clear();

    const extractorIds = Array.from(this.extractors.keys());
    for (const id of extractorIds) {
      const metadata = this.extractors.get(id);
      if (metadata && metadata.isEnabled) {
        for (const pattern of metadata.extractor.urlPatterns) {
          this.urlPatternCache.set(pattern, id);
        }
      }
    }
  }

  /**
   * Update performance statistics for an extractor
   */
  private updatePerformanceStats(
    extractorId: string,
    success: boolean,
    extractionTime: number
  ): void {
    const metadata = this.extractors.get(extractorId);
    if (!metadata) {
      return;
    }

    const stats = metadata.performanceStats;

    stats.totalExtractions++;
    stats.lastExtractionTime = extractionTime;

    if (success) {
      stats.successfulExtractions++;
    } else {
      stats.failedExtractions++;
    }

    // Update running average extraction time
    const totalTime =
      stats.averageExtractionTime * (stats.totalExtractions - 1) +
      extractionTime;
    stats.averageExtractionTime = totalTime / stats.totalExtractions;

    // Update error rate
    stats.errorRate = stats.failedExtractions / stats.totalExtractions;
  }

  /**
   * Create a timeout promise for extraction operations
   */
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ExtractionError('Extraction timeout', 'TIMEOUT'));
      }, timeout);
    });
  }

  /**
   * Get registry health status
   */
  getHealthStatus(): {
    initialized: boolean;
    totalExtractors: number;
    enabledExtractors: number;
    averageErrorRate: number;
    averageExtractionTime: number;
  } {
    const extractors = Array.from(this.extractors.values());
    const enabledExtractors = extractors.filter(e => e.isEnabled);

    const totalErrorRate = enabledExtractors.reduce(
      (sum, e) => sum + e.performanceStats.errorRate,
      0
    );
    const totalExtractionTime = enabledExtractors.reduce(
      (sum, e) => sum + e.performanceStats.averageExtractionTime,
      0
    );

    return {
      initialized: this.initialized,
      totalExtractors: extractors.length,
      enabledExtractors: enabledExtractors.length,
      averageErrorRate:
        enabledExtractors.length > 0
          ? totalErrorRate / enabledExtractors.length
          : 0,
      averageExtractionTime:
        enabledExtractors.length > 0
          ? totalExtractionTime / enabledExtractors.length
          : 0,
    };
  }
}

// Export singleton instance
export const extractorRegistry = new ExtractorRegistry();

// Export utility functions
export const initializeExtractors = () => extractorRegistry.initialize();
export const getExtractorForUrl = (url: string) =>
  extractorRegistry.getExtractorForUrl(url);
export const isUrlSupported = (url: string) =>
  extractorRegistry.isUrlSupported(url);
export const extractFromUrl = (url: string) =>
  extractorRegistry.extractFromUrl(url);
