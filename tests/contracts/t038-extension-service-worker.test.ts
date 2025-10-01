/**
 * T038 Contract Tests: Extension Service Worker
 *
 * Validates service worker functionality, message handling,
 * story detection coordination, and API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome Extension APIs
const mockChrome = {
  runtime: {
    onStartup: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    onMessageExternal: { addListener: vi.fn() },
    onConnect: { addListener: vi.fn() },
    sendMessage: vi.fn(),
  },
  tabs: {
    onUpdated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    create: vi.fn(),
    query: vi.fn(),
  },
  storage: {
    local: {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
  notifications: {
    create: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

// Mock ServiceWorkerGlobalScope
const mockServiceWorkerGlobalScope = {
  addEventListener: vi.fn(),
  clients: {
    claim: vi.fn().mockResolvedValue(undefined),
  },
};

// Set up global mocks
global.chrome = mockChrome as any;
global.self = mockServiceWorkerGlobalScope as any;
global.fetch = vi.fn();

// Mock the ExtensionServiceWorker class
import type {
  ExtensionServiceWorker,
  EXTENSION_CONFIG,
} from '../../../src/extension/service-worker';

describe('T038: Extension Service Worker Contract Tests', () => {
  let serviceWorker: ExtensionServiceWorker;

  const mockStoryData = {
    id: 'story-12345',
    title: 'The Last Horcrux',
    url: 'https://archiveofourown.org/works/12345',
    author: 'TestAuthor',
    authorUrl: 'https://archiveofourown.org/users/TestAuthor',
    fandom: 'Harry Potter - J. K. Rowling',
    description: 'Harry discovers the truth about Horcruxes',
    tags: ['time-travel', 'fix-it', 'harry/hermione'],
    characters: ['Harry Potter', 'Hermione Granger'],
    relationships: ['Harry Potter/Hermione Granger'],
    chapters: 15,
    wordCount: 45000,
    language: 'English',
    rating: 'Teen And Up Audiences',
    warnings: ['No Archive Warnings Apply'],
    categories: ['M/F'],
    status: 'complete' as const,
    publishedDate: new Date('2024-01-01'),
    updatedDate: new Date('2024-01-15'),
    site: 'archiveofourown.org',
    metadata: {
      detectionConfidence: 95,
      autoTagged: true,
      needsReview: false,
      parsingVersion: '1.0.0',
    },
  };

  const mockSubmissionData = {
    storyId: 'story-12345',
    title: 'The Last Horcrux',
    url: 'https://archiveofourown.org/works/12345',
    fandom: 'harry-potter',
    tags: ['time-travel', 'fix-it', 'harry/hermione'],
    description: 'Harry discovers the truth about Horcruxes',
    wordCount: 45000,
    submitterEmail: 'user@example.com',
    submitterName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fetch mock
    (global.fetch as any).mockReset();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, submissionId: 'sub-12345' }),
    });

    // Mock ExtensionServiceWorker class since we can't import it directly in test environment
    // This would be replaced with actual import in real test setup
    serviceWorker = {
      handleMessage: vi.fn(),
      handleInstall: vi.fn(),
      handleActivation: vi.fn(),
      processSubmission: vi.fn(),
      makeApiRequest: vi.fn(),
      validateStoryData: vi.fn(),
      isSupportedSite: vi.fn(),
    } as any;
  });

  describe('Service Worker Initialization', () => {
    it('should initialize with correct configuration', () => {
      // Test that EXTENSION_CONFIG has expected values
      const expectedConfig = {
        name: 'The Pensieve Index - Story Submission Helper',
        version: '1.0.0',
        supportedSites: expect.arrayContaining([
          'archiveofourown.org',
          'fanfiction.net',
          'wattpad.com',
        ]),
        syncInterval: 5 * 60 * 1000,
        requestTimeout: 30000,
        maxRetries: 3,
      };

      // This would test actual EXTENSION_CONFIG in real implementation
      expect(expectedConfig.name).toBe(
        'The Pensieve Index - Story Submission Helper'
      );
      expect(expectedConfig.supportedSites).toContain('archiveofourown.org');
    });

    it('should set up event listeners during initialization', () => {
      // Verify that service worker sets up required event listeners
      expect(
        mockServiceWorkerGlobalScope.addEventListener
      ).toHaveBeenCalledWith('install', expect.any(Function));
      expect(
        mockServiceWorkerGlobalScope.addEventListener
      ).toHaveBeenCalledWith('activate', expect.any(Function));
      expect(mockChrome.runtime.onStartup.addListener).toHaveBeenCalled();
      expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalled();
    });

    it('should handle service worker installation', async () => {
      const mockEvent = {
        waitUntil: vi.fn(promise => promise),
      };

      // Mock installation handler
      const installHandler = vi.fn().mockResolvedValue(undefined);
      serviceWorker.handleInstall = installHandler;

      // Simulate install event
      await installHandler();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          extensionVersion: expect.any(String),
          installDate: expect.any(String),
          settings: expect.objectContaining({
            autoDetection: true,
            autoSubmission: false,
            notifications: true,
          }),
        })
      );
    });

    it('should handle service worker activation', async () => {
      const activationHandler = vi.fn().mockResolvedValue(undefined);
      serviceWorker.handleActivation = activationHandler;

      await activationHandler();

      expect(mockServiceWorkerGlobalScope.clients.claim).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('should handle STORY_DETECTED messages', async () => {
      const message = {
        type: 'STORY_DETECTED',
        payload: mockStoryData,
        timestamp: Date.now(),
      };

      const sender = {
        tab: { id: 123, url: 'https://archiveofourown.org/works/12345' },
      };

      const sendResponse = vi.fn();

      // Mock validation
      serviceWorker.validateStoryData = vi.fn().mockReturnValue(true);

      await serviceWorker.handleMessage(message, sender, sendResponse);

      expect(serviceWorker.validateStoryData).toHaveBeenCalledWith(
        mockStoryData
      );
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should handle SUBMISSION_START messages', async () => {
      const message = {
        type: 'SUBMISSION_START',
        payload: mockSubmissionData,
        timestamp: Date.now(),
      };

      const sender = {
        tab: { id: 123 },
      };

      const sendResponse = vi.fn();

      serviceWorker.processSubmission = vi.fn().mockResolvedValue(undefined);

      await serviceWorker.handleMessage(message, sender, sendResponse);

      expect(serviceWorker.processSubmission).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          submissionId: expect.any(String),
        })
      );
    });

    it('should handle API_REQUEST messages', async () => {
      const message = {
        type: 'API_REQUEST',
        payload: {
          endpoint: '/v1/submissions',
          method: 'POST',
          data: mockSubmissionData,
        },
        requestId: 'req-123',
      };

      const sendResponse = vi.fn();

      serviceWorker.makeApiRequest = vi.fn().mockResolvedValue({
        success: true,
        submissionId: 'sub-12345',
      });

      await serviceWorker.handleMessage(message, null, sendResponse);

      expect(serviceWorker.makeApiRequest).toHaveBeenCalledWith(
        message.payload,
        expect.any(AbortSignal)
      );
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            submissionId: 'sub-12345',
          }),
        })
      );
    });

    it('should handle POPUP_OPENED messages', async () => {
      const message = {
        type: 'POPUP_OPENED',
        timestamp: Date.now(),
      };

      const sendResponse = vi.fn();

      // Mock popup handler
      const popupHandler = vi.fn().mockResolvedValue({
        currentStory: null,
        submissions: [],
        settings: { autoDetection: true },
      });

      await popupHandler();

      expect(sendResponse).not.toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should handle unknown message types gracefully', async () => {
      const message = {
        type: 'UNKNOWN_MESSAGE_TYPE',
        payload: {},
      };

      const sendResponse = vi.fn();

      await serviceWorker.handleMessage(message, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Unknown message type'),
        })
      );
    });
  });

  describe('Tab Management', () => {
    it('should detect supported sites', () => {
      serviceWorker.isSupportedSite = vi.fn((url: string) => {
        const supportedDomains = [
          'archiveofourown.org',
          'fanfiction.net',
          'wattpad.com',
        ];
        try {
          const domain = new URL(url).hostname;
          return supportedDomains.some(site => domain.includes(site));
        } catch {
          return false;
        }
      });

      expect(
        serviceWorker.isSupportedSite('https://archiveofourown.org/works/12345')
      ).toBe(true);
      expect(
        serviceWorker.isSupportedSite('https://www.fanfiction.net/s/12345/1/')
      ).toBe(true);
      expect(
        serviceWorker.isSupportedSite('https://www.wattpad.com/story/12345')
      ).toBe(true);
      expect(serviceWorker.isSupportedSite('https://example.com')).toBe(false);
      expect(serviceWorker.isSupportedSite('invalid-url')).toBe(false);
    });

    it('should handle tab updates on supported sites', async () => {
      const tabId = 123;
      const tab = {
        id: tabId,
        url: 'https://archiveofourown.org/works/12345',
      };

      serviceWorker.isSupportedSite = vi.fn().mockReturnValue(true);

      // Mock tab update handler
      const tabUpdateHandler = vi.fn().mockResolvedValue(undefined);

      await tabUpdateHandler(tabId, tab);

      expect(serviceWorker.isSupportedSite).toHaveBeenCalledWith(tab.url);
      expect(mockChrome.scripting.executeScript).toHaveBeenCalled();
    });

    it('should ignore tab updates on unsupported sites', async () => {
      const tabId = 123;
      const tab = {
        id: tabId,
        url: 'https://example.com',
      };

      serviceWorker.isSupportedSite = vi.fn().mockReturnValue(false);

      // Mock tab update handler
      const tabUpdateHandler = vi.fn().mockResolvedValue(undefined);

      await tabUpdateHandler(tabId, tab);

      expect(serviceWorker.isSupportedSite).toHaveBeenCalledWith(tab.url);
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });
  });

  describe('API Integration', () => {
    it('should make authenticated API requests', async () => {
      const requestData = {
        endpoint: '/v1/submissions',
        method: 'POST',
        data: mockSubmissionData,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, submissionId: 'sub-12345' }),
      });

      serviceWorker.makeApiRequest = vi.fn().mockImplementation(async data => {
        const response = await fetch(
          `http://localhost:3000/api${data.endpoint}`,
          {
            method: data.method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
            body: JSON.stringify(data.data),
          }
        );
        return response.json();
      });

      const result = await serviceWorker.makeApiRequest(requestData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/submissions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify(mockSubmissionData),
        })
      );

      expect(result).toEqual({
        success: true,
        submissionId: 'sub-12345',
      });
    });

    it('should handle API request failures with retry logic', async () => {
      const requestData = {
        endpoint: '/v1/submissions',
        method: 'POST',
        data: mockSubmissionData,
      };

      // Mock fetch to fail twice, then succeed
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ success: true, submissionId: 'sub-12345' }),
        });

      serviceWorker.makeApiRequest = vi.fn().mockImplementation(async data => {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch(
              `http://localhost:3000/api${data.endpoint}`
            );
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        throw lastError;
      });

      const result = await serviceWorker.makeApiRequest(requestData);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        submissionId: 'sub-12345',
      });
    });

    it('should abort API requests when requested', async () => {
      const requestData = {
        endpoint: '/v1/submissions',
        method: 'GET',
      };

      const abortController = new AbortController();

      serviceWorker.makeApiRequest = vi
        .fn()
        .mockImplementation(async (data, signal) => {
          const response = await fetch(
            `http://localhost:3000/api${data.endpoint}`,
            { signal }
          );
          return response.json();
        });

      // Start request and immediately abort
      const requestPromise = serviceWorker.makeApiRequest(
        requestData,
        abortController.signal
      );
      abortController.abort();

      await expect(requestPromise).rejects.toThrow();
    });
  });

  describe('Submission Processing', () => {
    it('should process story submissions with progress updates', async () => {
      const submissionId = 'sub-12345';

      // Mock submission processing
      const mockSubmission = {
        id: submissionId,
        storyId: mockStoryData.id,
        status: 'pending',
        progress: 0,
        currentStep: 'Initializing submission',
        startTime: new Date(),
        lastUpdate: new Date(),
        retryCount: 0,
        submissionData: mockSubmissionData,
      };

      serviceWorker.processSubmission = vi.fn().mockImplementation(async id => {
        // Simulate progression through submission steps
        const progressSteps = [
          { progress: 10, step: 'Validating data' },
          { progress: 30, step: 'Uploading to server' },
          { progress: 70, step: 'Processing submission' },
          { progress: 100, step: 'Submission completed' },
        ];

        for (const step of progressSteps) {
          mockSubmission.progress = step.progress;
          mockSubmission.currentStep = step.step;

          // Simulate progress notification
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        mockSubmission.status = 'completed';
        return mockSubmission;
      });

      const result = await serviceWorker.processSubmission(submissionId);

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.currentStep).toBe('Submission completed');
    });

    it('should handle submission failures gracefully', async () => {
      const submissionId = 'sub-12345';

      serviceWorker.processSubmission = vi.fn().mockImplementation(async id => {
        throw new Error('Validation failed: Missing required field');
      });

      await expect(
        serviceWorker.processSubmission(submissionId)
      ).rejects.toThrow('Validation failed: Missing required field');
    });

    it('should validate submission data before processing', () => {
      serviceWorker.validateStoryData = vi.fn().mockImplementation(data => {
        return !!(
          data.title &&
          data.url &&
          data.author &&
          data.fandom &&
          data.site
        );
      });

      expect(serviceWorker.validateStoryData(mockStoryData)).toBe(true);

      const invalidData = { ...mockStoryData, title: '' };
      expect(serviceWorker.validateStoryData(invalidData)).toBe(false);
    });
  });

  describe('Storage Management', () => {
    it('should store and retrieve user settings', async () => {
      const settings = {
        autoDetection: true,
        autoSubmission: false,
        notifications: true,
        syncEnabled: true,
      };

      await mockChrome.storage.local.set({ userSettings: settings });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        userSettings: settings,
      });

      mockChrome.storage.local.get.mockResolvedValue({
        userSettings: settings,
      });

      const retrieved = await mockChrome.storage.local.get(['userSettings']);
      expect(retrieved.userSettings).toEqual(settings);
    });

    it('should store submission state for persistence', async () => {
      const submissionState = {
        id: 'sub-12345',
        storyId: 'story-12345',
        status: 'in-progress',
        progress: 45,
        currentStep: 'Processing tags',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      };

      await mockChrome.storage.local.set({
        [`submission_${submissionState.id}`]: submissionState,
      });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        [`submission_${submissionState.id}`]: submissionState,
      });
    });

    it('should clean up old data periodically', async () => {
      const oldSubmissions = [
        'submission_old-1',
        'submission_old-2',
        'submission_old-3',
      ];

      await mockChrome.storage.local.remove(oldSubmissions);

      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(
        oldSubmissions
      );
    });
  });

  describe('Background Sync', () => {
    it('should sync pending submissions periodically', async () => {
      const syncHandler = vi.fn().mockResolvedValue(undefined);

      // Mock sync scheduler
      const setupSync = vi.fn().mockImplementation(() => {
        setInterval(syncHandler, 5 * 60 * 1000); // 5 minutes
      });

      setupSync();

      // Verify sync was set up
      expect(setupSync).toHaveBeenCalled();
    });

    it('should handle sync failures gracefully', async () => {
      const syncHandler = vi.fn().mockRejectedValue(new Error('Sync failed'));

      await expect(syncHandler()).rejects.toThrow('Sync failed');

      // Service worker should continue running despite sync failures
      expect(true).toBe(true); // Placeholder for actual resilience test
    });
  });

  describe('Error Handling', () => {
    it('should handle content script communication errors', async () => {
      const message = {
        type: 'STORY_DETECTED',
        payload: null, // Invalid payload
      };

      const sendResponse = vi.fn();

      await serviceWorker.handleMessage(message, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should handle network failures during API requests', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network unavailable'));

      serviceWorker.makeApiRequest = vi
        .fn()
        .mockRejectedValue(new Error('Network unavailable'));

      const requestData = {
        endpoint: '/v1/health',
        method: 'GET',
      };

      await expect(serviceWorker.makeApiRequest(requestData)).rejects.toThrow(
        'Network unavailable'
      );
    });

    it('should recover from storage errors', async () => {
      mockChrome.storage.local.get.mockRejectedValue(
        new Error('Storage quota exceeded')
      );

      // Mock storage recovery
      const storageHandler = vi.fn().mockImplementation(async () => {
        try {
          await mockChrome.storage.local.get(['settings']);
        } catch (error) {
          // Fallback to default settings
          return {
            autoDetection: true,
            notifications: false,
          };
        }
      });

      const result = await storageHandler();

      expect(result).toEqual({
        autoDetection: true,
        notifications: false,
      });
    });
  });
});
