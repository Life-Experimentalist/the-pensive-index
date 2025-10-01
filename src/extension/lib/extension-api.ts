/**
 * Extension API Library
 * Handles communication between extension components and backend API
 */

import { StorySubmission, StoryMetadata } from '../../types/submissions';
import { FandomData } from '../../types/fandoms';

interface UserPreferences {
  email?: string;
  defaultFandom?: string;
  autoFillFromPage?: boolean;
}

interface SubmissionResult {
  submissionId: string;
  githubIssueNumber?: number;
  estimatedReviewTime: string;
}

interface SiteParser {
  domain: string;
  isSupported: (url: string) => boolean;
  parseStoryData: (tabId: number) => Promise<Partial<StoryMetadata>>;
}

export class ExtensionAPI {
  private baseURL: string;
  private apiKey: string | null = null;

  constructor() {
    this.baseURL =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://the-pensive-index.vercel.app';
  }

  // Site parsers for different fanfiction platforms
  private siteParsers: SiteParser[] = [
    {
      domain: 'archiveofourown.org',
      isSupported: (url: string) => url.includes('archiveofourown.org/works/'),
      parseStoryData: async (tabId: number) => {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // AO3 parsing logic
            const title = document
              .querySelector('h2.title')
              ?.textContent?.trim();
            const author = document
              .querySelector('a[rel="author"]')
              ?.textContent?.trim();
            const description = document
              .querySelector('div.summary .userstuff')
              ?.textContent?.trim();
            const fandom = document
              .querySelector('.fandom .tag')
              ?.textContent?.trim();
            const tags = Array.from(
              document.querySelectorAll('.additional .tag')
            )
              .map(tag => tag.textContent?.trim())
              .filter(Boolean);

            return {
              title,
              author,
              description,
              url: window.location.href,
              fandom,
              tags,
              site: 'ao3',
              wordCount: document
                .querySelector('dd.words')
                ?.textContent?.trim(),
              chapters: document
                .querySelector('dd.chapters')
                ?.textContent?.trim(),
              rating: document
                .querySelector('.rating .tag')
                ?.textContent?.trim(),
              warnings: Array.from(document.querySelectorAll('.warnings .tag'))
                .map(tag => tag.textContent?.trim())
                .filter(Boolean),
            };
          },
        });

        return results[0]?.result || {};
      },
    },
    {
      domain: 'fanfiction.net',
      isSupported: (url: string) => url.includes('fanfiction.net/s/'),
      parseStoryData: async (tabId: number) => {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // FFNet parsing logic
            const titleElement = document.querySelector(
              '#profile_top .xcontrast_txt'
            );
            const authorElement = document.querySelector(
              '#profile_top a.xcontrast_txt'
            );
            const descriptionElement = document.querySelector(
              '#profile_top .xcontrast_txt'
            );

            const title = titleElement?.textContent?.trim();
            const author = authorElement?.textContent?.trim();
            const description =
              descriptionElement?.nextSibling?.textContent?.trim();

            // Parse metadata from the gray text
            const metaText =
              document.querySelector('#profile_top .xgray')?.textContent || '';
            const fandom = metaText.split(' - ')[0]?.trim();

            return {
              title,
              author,
              description,
              url: window.location.href,
              fandom,
              site: 'ffnet',
              metadata: {
                originalMetaText: metaText,
              },
            };
          },
        });

        return results[0]?.result || {};
      },
    },
  ];

  // Check if current URL is from a supported site
  isSupportedSite(url: string): boolean {
    return this.siteParsers.some(parser => parser.isSupported(url));
  }

  // Parse story data from current page
  async parseCurrentPage(tabId: number): Promise<Partial<StoryMetadata>> {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.url) {
      throw new Error('No active tab found');
    }

    const parser = this.siteParsers.find(p => p.isSupported(tab.url!));
    if (!parser) {
      throw new Error('Unsupported site');
    }

    try {
      const storyData = await parser.parseStoryData(tabId);

      // Add common metadata
      return {
        ...storyData,
        submissionSource: 'browser_extension',
        parsedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error('Failed to parse story data from page');
    }
  }

  // Get available fandoms from API
  async getFandoms(): Promise<FandomData[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/fandoms`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.fandoms || [];
    } catch (error) {
      console.error('Failed to load fandoms:', error);
      return [];
    }
  }

  // Get tags for specific fandom
  async getFandomTags(fandomSlug: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/fandoms/${fandomSlug}/tags`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Failed to load fandom tags:', error);
      return [];
    }
  }

  // Submit story to API
  async submitStory(
    submissionData: Omit<StorySubmission, 'id' | 'submissionDate'>
  ): Promise<SubmissionResult> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Version': chrome.runtime.getManifest().version,
        },
        body: JSON.stringify({
          ...submissionData,
          submissionDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      return {
        submissionId: result.submissionId,
        githubIssueNumber: result.githubIssueNumber,
        estimatedReviewTime: result.estimatedReviewTime || '3-5 days',
      };
    } catch (error) {
      console.error('Submission failed:', error);
      throw error;
    }
  }

  // Get user preferences from storage
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const result = await chrome.storage.sync.get(['userPreferences']);
      return result.userPreferences || {};
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      return {};
    }
  }

  // Save user preferences to storage
  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await chrome.storage.sync.set({ userPreferences: preferences });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  // Get submission status by ID
  async getSubmissionStatus(submissionId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/v1/submissions/${submissionId}/status`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get submission status:', error);
      throw error;
    }
  }

  // Check if API is available
  async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  // Get extension statistics
  async getExtensionStats(): Promise<any> {
    try {
      const result = await chrome.storage.local.get(['extensionStats']);
      return (
        result.extensionStats || {
          totalSubmissions: 0,
          successfulSubmissions: 0,
          lastSubmissionDate: null,
        }
      );
    } catch (error) {
      console.error('Failed to load extension stats:', error);
      return {};
    }
  }

  // Update extension statistics
  async updateExtensionStats(update: Partial<any>): Promise<void> {
    try {
      const currentStats = await this.getExtensionStats();
      const updatedStats = { ...currentStats, ...update };
      await chrome.storage.local.set({ extensionStats: updatedStats });
    } catch (error) {
      console.error('Failed to update extension stats:', error);
    }
  }
}
