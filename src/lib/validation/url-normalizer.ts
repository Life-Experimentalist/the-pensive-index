/**
 * URL Normalization Module
 *
 * Normalizes story URLs for duplicate detection and comparison
 */

export interface NormalizedUrl {
  original: string;
  normalized: string;
  domain: string;
  path: string;
  storyId?: string;
  platform?: 'fanfiction.net' | 'archiveofourown.org' | 'wattpad' | 'other';
}

export class UrlNormalizer {
  /**
   * Normalize a URL for comparison
   */
  normalize(url: string): NormalizedUrl {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase().replace('www.', '');
      const path = urlObj.pathname.toLowerCase();

      // Detect platform
      let platform: NormalizedUrl['platform'] = 'other';
      if (domain.includes('fanfiction.net')) {
        platform = 'fanfiction.net';
      } else if (domain.includes('archiveofourown.org')) {
        platform = 'archiveofourown.org';
      } else if (domain.includes('wattpad')) {
        platform = 'wattpad';
      }

      // Extract story ID based on platform
      const storyId = this.extractStoryId(path, platform);

      // Normalize URL
      const normalized = `${domain}${path}`.replace(/\/$/, '');

      return {
        original: url,
        normalized,
        domain,
        path,
        storyId,
        platform,
      };
    } catch (error) {
      // If URL parsing fails, return a basic normalized form
      return {
        original: url,
        normalized: url.toLowerCase().trim(),
        domain: '',
        path: '',
        platform: 'other',
      };
    }
  }

  /**
   * Extract story ID from URL path based on platform
   */
  private extractStoryId(
    path: string,
    platform: NormalizedUrl['platform']
  ): string | undefined {
    if (platform === 'fanfiction.net') {
      const match = path.match(/\/s\/(\d+)/);
      return match?.[1];
    } else if (platform === 'archiveofourown.org') {
      const match = path.match(/\/works\/(\d+)/);
      return match?.[1];
    } else if (platform === 'wattpad') {
      const match = path.match(/\/story\/(\d+)/);
      return match?.[1];
    }
    return undefined;
  }

  /**
   * Check if two URLs are similar (same story)
   */
  areSimilar(url1: string, url2: string): boolean {
    const norm1 = this.normalize(url1);
    const norm2 = this.normalize(url2);

    // If both have story IDs on the same platform, compare those
    if (norm1.storyId && norm2.storyId && norm1.platform === norm2.platform) {
      return norm1.storyId === norm2.storyId;
    }

    // Otherwise, compare normalized URLs
    return norm1.normalized === norm2.normalized;
  }

  /**
   * Get similarity score between two URLs (0-1)
   */
  getSimilarityScore(url1: string, url2: string): number {
    const norm1 = this.normalize(url1);
    const norm2 = this.normalize(url2);

    if (this.areSimilar(url1, url2)) {
      return 1.0;
    }

    // Check domain similarity
    if (norm1.domain === norm2.domain) {
      return 0.5;
    }

    return 0.0;
  }
}
