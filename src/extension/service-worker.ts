/**
 * T038: Extension Service Worker
 *
 * Browser extension service worker for background processing, API communication,
 * content script coordination, and submission detection across fanfiction sites
 */

// Service Worker API types
declare const self: ServiceWorkerGlobalScope & typeof globalThis;

/**
 * Extension configuration and constants
 */
const EXTENSION_CONFIG = {
  name: 'The Pensieve Index - Story Submission Helper',
  version: '1.0.0',
  apiBaseUrl:
    process.env.NODE_ENV === 'production'
      ? 'https://pensieve-index.com/api'
      : 'http://localhost:3000/api',
  supportedSites: [
    'archiveofourown.org',
    'fanfiction.net',
    'wattpad.com',
    'quotev.com',
    'fictionpress.com',
    'adult-fanfiction.org',
    'mediaminer.org',
    'ficwad.com',
  ],
  syncInterval: 5 * 60 * 1000, // 5 minutes
  requestTimeout: 30000, // 30 seconds
  maxRetries: 3,
} as const;

/**
 * Message types for communication with content scripts and popup
 */
type ExtensionMessageType =
  | 'STORY_DETECTED'
  | 'STORY_PARSED'
  | 'SUBMISSION_START'
  | 'SUBMISSION_PROGRESS'
  | 'SUBMISSION_COMPLETE'
  | 'SUBMISSION_ERROR'
  | 'API_REQUEST'
  | 'API_RESPONSE'
  | 'SYNC_REQUEST'
  | 'STATUS_UPDATE'
  | 'SETTINGS_UPDATE'
  | 'BACKGROUND_TASK'
  | 'CONTENT_SCRIPT_READY'
  | 'POPUP_OPENED'
  | 'POPUP_CLOSED';

interface ExtensionMessage {
  type: ExtensionMessageType;
  payload?: any;
  requestId?: string;
  tabId?: number;
  timestamp?: number;
  origin?: string;
}

/**
 * Story data structure for detection and submission
 */
interface DetectedStory {
  id: string;
  title: string;
  url: string;
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
  site: string;
  metadata: {
    detectionConfidence: number;
    autoTagged: boolean;
    needsReview: boolean;
    parsingVersion: string;
    additionalData?: Record<string, any>;
  };
}

/**
 * Submission tracking and state management
 */
interface SubmissionState {
  id: string;
  storyId: string;
  status:
    | 'pending'
    | 'uploading'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  progress: number; // 0-100
  currentStep: string;
  startTime: Date;
  lastUpdate: Date;
  error?: string;
  retryCount: number;
  submissionData?: any;
  apiResponses?: any[];
}

/**
 * Service Worker State Management
 */
class ExtensionServiceWorker {
  private submissions: Map<string, SubmissionState> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();
  private syncTimer: number | null = null;
  private apiToken: string | null = null;
  private userSettings: any = {};

  constructor() {
    this.initializeServiceWorker();
    this.setupMessageHandlers();
    this.setupSyncScheduler();
    this.loadStoredState();
  }

  /**
   * Initialize service worker and set up event listeners
   */
  private initializeServiceWorker(): void {
    console.log(
      `[Extension SW] Initializing ${EXTENSION_CONFIG.name} v${EXTENSION_CONFIG.version}`
    );

    // Service worker installation
    self.addEventListener('install', event => {
      console.log('[Extension SW] Installing service worker');
      event.waitUntil(this.handleInstall());
    });

    // Service worker activation
    self.addEventListener('activate', event => {
      console.log('[Extension SW] Activating service worker');
      event.waitUntil(this.handleActivation());
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('[Extension SW] Extension startup');
      this.handleStartup();
    });

    // Handle extension installation/updates
    chrome.runtime.onInstalled.addListener(details => {
      console.log(
        '[Extension SW] Extension installed/updated:',
        details.reason
      );
      this.handleInstallation(details);
    });

    // Handle tab updates for story detection
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Handle tab removal for cleanup
    chrome.tabs.onRemoved.addListener(tabId => {
      this.handleTabRemoved(tabId);
    });
  }

  /**
   * Set up message handlers for communication with content scripts and popup
   */
  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async responses
      }
    );

    // Handle external messages (from web pages)
    chrome.runtime.onMessageExternal.addListener(
      (message, sender, sendResponse) => {
        this.handleExternalMessage(message, sender, sendResponse);
        return true;
      }
    );

    // Handle connection-based communication
    chrome.runtime.onConnect.addListener(port => {
      this.handleConnection(port);
    });
  }

  /**
   * Handle installation process
   */
  private async handleInstall(): Promise<void> {
    try {
      // Set up default storage
      await chrome.storage.local.set({
        extensionVersion: EXTENSION_CONFIG.version,
        installDate: new Date().toISOString(),
        settings: {
          autoDetection: true,
          autoSubmission: false,
          notifications: true,
          syncEnabled: true,
          debugMode: false,
        },
      });

      console.log('[Extension SW] Installation completed');
    } catch (error) {
      console.error('[Extension SW] Installation failed:', error);
    }
  }

  /**
   * Handle service worker activation
   */
  private async handleActivation(): Promise<void> {
    try {
      // Clean up old caches or data if needed
      await this.cleanupOldData();

      // Claim all clients
      await self.clients.claim();

      console.log('[Extension SW] Activation completed');
    } catch (error) {
      console.error('[Extension SW] Activation failed:', error);
    }
  }

  /**
   * Handle extension startup
   */
  private async handleStartup(): Promise<void> {
    try {
      await this.loadStoredState();
      await this.syncPendingSubmissions();

      console.log('[Extension SW] Startup completed');
    } catch (error) {
      console.error('[Extension SW] Startup failed:', error);
    }
  }

  /**
   * Handle extension installation/update
   */
  private async handleInstallation(
    details: chrome.runtime.InstalledDetails
  ): Promise<void> {
    try {
      switch (details.reason) {
        case 'install':
          await this.handleFirstInstall();
          break;
        case 'update':
          await this.handleUpdate(details.previousVersion);
          break;
        case 'chrome_update':
        case 'shared_module_update':
          console.log('[Extension SW] Browser/module updated');
          break;
      }
    } catch (error) {
      console.error('[Extension SW] Installation handling failed:', error);
    }
  }

  /**
   * Handle first-time installation
   */
  private async handleFirstInstall(): Promise<void> {
    console.log('[Extension SW] First installation - setting up welcome flow');

    // Open welcome page
    await chrome.tabs.create({
      url: `${EXTENSION_CONFIG.apiBaseUrl}/welcome?ext=true`,
      active: true,
    });

    // Set up default permissions and settings
    await this.requestPermissions();
  }

  /**
   * Handle extension update
   */
  private async handleUpdate(previousVersion?: string): Promise<void> {
    console.log(
      `[Extension SW] Updated from version ${previousVersion} to ${EXTENSION_CONFIG.version}`
    );

    // Migrate data if needed
    if (previousVersion && this.needsDataMigration(previousVersion)) {
      await this.migrateData(previousVersion);
    }

    // Show update notifications if significant changes
    if (this.isSignificantUpdate(previousVersion)) {
      await this.showUpdateNotification();
    }
  }

  /**
   * Handle tab updates for story detection
   */
  private async handleTabUpdate(tabId: number, tab: chrome.tabs.Tab): void {
    try {
      if (!tab.url || !this.isSupportedSite(tab.url)) {
        return;
      }

      console.log(`[Extension SW] Tab updated on supported site: ${tab.url}`);

      // Check if auto-detection is enabled
      const settings = await this.getUserSettings();
      if (!settings.autoDetection) {
        return;
      }

      // Inject content script if not already present
      await this.injectContentScript(tabId);

      // Request story detection
      await this.requestStoryDetection(tabId, tab.url);
    } catch (error) {
      console.error('[Extension SW] Tab update handling failed:', error);
    }
  }

  /**
   * Handle tab removal for cleanup
   */
  private handleTabRemoved(tabId: number): void {
    // Clean up any tab-specific data
    this.cleanupTabData(tabId);
  }

  /**
   * Handle messages from content scripts and popup
   */
  private async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log(`[Extension SW] Received message: ${message.type}`, message);

      switch (message.type) {
        case 'CONTENT_SCRIPT_READY':
          await this.handleContentScriptReady(sender.tab?.id, sendResponse);
          break;

        case 'STORY_DETECTED':
          await this.handleStoryDetected(message.payload, sender, sendResponse);
          break;

        case 'STORY_PARSED':
          await this.handleStoryParsed(message.payload, sender, sendResponse);
          break;

        case 'SUBMISSION_START':
          await this.handleSubmissionStart(
            message.payload,
            sender,
            sendResponse
          );
          break;

        case 'API_REQUEST':
          await this.handleApiRequest(
            message.payload,
            message.requestId,
            sendResponse
          );
          break;

        case 'SYNC_REQUEST':
          await this.handleSyncRequest(sendResponse);
          break;

        case 'STATUS_UPDATE':
          await this.handleStatusUpdate(message.payload, sendResponse);
          break;

        case 'SETTINGS_UPDATE':
          await this.handleSettingsUpdate(message.payload, sendResponse);
          break;

        case 'POPUP_OPENED':
          await this.handlePopupOpened(sendResponse);
          break;

        case 'POPUP_CLOSED':
          await this.handlePopupClosed();
          break;

        default:
          console.warn(
            `[Extension SW] Unhandled message type: ${message.type}`
          );
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Extension SW] Message handling failed:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle external messages from web pages
   */
  private async handleExternalMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    // Verify sender origin for security
    if (!this.isAllowedOrigin(sender.origin)) {
      sendResponse({ error: 'Unauthorized origin' });
      return;
    }

    console.log('[Extension SW] External message from:', sender.origin);
    sendResponse({ success: true, extensionVersion: EXTENSION_CONFIG.version });
  }

  /**
   * Handle long-lived connections
   */
  private handleConnection(port: chrome.runtime.Port): void {
    console.log(`[Extension SW] Connection established: ${port.name}`);

    port.onMessage.addListener((message: ExtensionMessage) => {
      this.handlePortMessage(port, message);
    });

    port.onDisconnect.addListener(() => {
      console.log(`[Extension SW] Connection disconnected: ${port.name}`);
      this.handlePortDisconnect(port);
    });
  }

  /**
   * Handle story detection from content script
   */
  private async handleStoryDetected(
    storyData: DetectedStory,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log(
        `[Extension SW] Story detected: ${storyData.title} on ${storyData.site}`
      );

      // Validate story data
      if (!this.validateStoryData(storyData)) {
        sendResponse({ error: 'Invalid story data' });
        return;
      }

      // Store detected story
      await this.storeDetectedStory(storyData, sender.tab?.id);

      // Check if story already exists in database
      const existingStory = await this.checkExistingStory(storyData);

      if (existingStory) {
        console.log('[Extension SW] Story already exists in database');
        sendResponse({
          success: true,
          storyExists: true,
          existingStory,
        });

        // Update popup with existing story info
        await this.notifyPopup('STORY_EXISTS', { storyData, existingStory });
        return;
      }

      // Enhance story data with additional metadata
      const enhancedStory = await this.enhanceStoryData(storyData);

      // Update popup with detected story
      await this.notifyPopup('STORY_READY_FOR_SUBMISSION', {
        storyData: enhancedStory,
      });

      sendResponse({
        success: true,
        storyExists: false,
        storyData: enhancedStory,
      });
    } catch (error) {
      console.error('[Extension SW] Story detection handling failed:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle story parsing completion
   */
  private async handleStoryParsed(
    parsedData: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log('[Extension SW] Story parsing completed');

      // Update stored story with parsed data
      await this.updateStoredStory(parsedData, sender.tab?.id);

      // Notify popup of parsing completion
      await this.notifyPopup('STORY_PARSING_COMPLETE', { parsedData });

      sendResponse({ success: true });
    } catch (error) {
      console.error('[Extension SW] Story parsing handling failed:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle submission start request
   */
  private async handleSubmissionStart(
    submissionData: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log('[Extension SW] Starting story submission');

      // Create submission state
      const submissionId = this.generateSubmissionId();
      const submission: SubmissionState = {
        id: submissionId,
        storyId: submissionData.storyId,
        status: 'pending',
        progress: 0,
        currentStep: 'Initializing submission',
        startTime: new Date(),
        lastUpdate: new Date(),
        retryCount: 0,
        submissionData,
      };

      this.submissions.set(submissionId, submission);

      // Start submission process
      await this.processSubmission(submissionId);

      sendResponse({ success: true, submissionId });
    } catch (error) {
      console.error('[Extension SW] Submission start failed:', error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle API requests from content script or popup
   */
  private async handleApiRequest(
    requestData: any,
    requestId?: string,
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    try {
      console.log(`[Extension SW] API request: ${requestData.endpoint}`);

      const controller = new AbortController();
      if (requestId) {
        this.activeRequests.set(requestId, controller);
      }

      const response = await this.makeApiRequest(
        requestData,
        controller.signal
      );

      if (requestId) {
        this.activeRequests.delete(requestId);
      }

      if (sendResponse) {
        sendResponse({ success: true, data: response });
      }
    } catch (error) {
      console.error('[Extension SW] API request failed:', error);
      if (sendResponse) {
        sendResponse({ error: error.message });
      }
    }
  }

  /**
   * Make API request with authentication and retry logic
   */
  private async makeApiRequest(
    requestData: {
      endpoint: string;
      method: string;
      data?: any;
      headers?: Record<string, string>;
    },
    signal?: AbortSignal
  ): Promise<any> {
    const { endpoint, method, data, headers = {} } = requestData;

    // Add authentication if available
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    // Add common headers
    headers['Content-Type'] = 'application/json';
    headers[
      'User-Agent'
    ] = `${EXTENSION_CONFIG.name}/${EXTENSION_CONFIG.version}`;

    const url = `${EXTENSION_CONFIG.apiBaseUrl}${endpoint}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= EXTENSION_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API request failed: ${response.status} ${errorText}`
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        if (attempt < EXTENSION_CONFIG.maxRetries && !signal?.aborted) {
          console.warn(
            `[Extension SW] API request attempt ${attempt} failed, retrying...`
          );
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('API request failed after all retries');
  }

  /**
   * Process story submission
   */
  private async processSubmission(submissionId: string): Promise<void> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    try {
      // Update status
      submission.status = 'uploading';
      submission.currentStep = 'Preparing submission data';
      submission.progress = 10;
      await this.updateSubmissionStatus(submission);

      // Validate submission data
      await this.validateSubmissionData(submission.submissionData);

      submission.currentStep = 'Uploading to server';
      submission.progress = 30;
      await this.updateSubmissionStatus(submission);

      // Submit to API
      const apiResponse = await this.makeApiRequest({
        endpoint: '/v1/submissions',
        method: 'POST',
        data: submission.submissionData,
      });

      submission.currentStep = 'Processing submission';
      submission.progress = 70;
      submission.apiResponses = [apiResponse];
      await this.updateSubmissionStatus(submission);

      // Check processing status
      await this.waitForProcessingComplete(
        submissionId,
        apiResponse.submissionId
      );

      submission.status = 'completed';
      submission.currentStep = 'Submission completed successfully';
      submission.progress = 100;
      await this.updateSubmissionStatus(submission);

      // Show success notification
      await this.showNotification(
        'Submission Complete',
        `Story "${submission.submissionData.title}" has been submitted successfully.`
      );
    } catch (error) {
      console.error(`[Extension SW] Submission ${submissionId} failed:`, error);

      submission.status = 'failed';
      submission.error = error.message;
      submission.currentStep = `Failed: ${error.message}`;
      await this.updateSubmissionStatus(submission);

      // Show error notification
      await this.showNotification(
        'Submission Failed',
        `Failed to submit story: ${error.message}`
      );
    }
  }

  /**
   * Update submission status and notify connected clients
   */
  private async updateSubmissionStatus(
    submission: SubmissionState
  ): Promise<void> {
    submission.lastUpdate = new Date();

    // Store updated state
    await this.storeSubmissionState(submission);

    // Notify popup
    await this.notifyPopup('SUBMISSION_PROGRESS', {
      submissionId: submission.id,
      status: submission.status,
      progress: submission.progress,
      currentStep: submission.currentStep,
      error: submission.error,
    });
  }

  /**
   * Set up sync scheduler for background synchronization
   */
  private setupSyncScheduler(): void {
    // Clear existing timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    // Set up periodic sync
    this.syncTimer = setInterval(() => {
      this.performBackgroundSync();
    }, EXTENSION_CONFIG.syncInterval);
  }

  /**
   * Perform background synchronization
   */
  private async performBackgroundSync(): Promise<void> {
    try {
      console.log('[Extension SW] Performing background sync');

      // Sync pending submissions
      await this.syncPendingSubmissions();

      // Update user settings if changed
      await this.syncUserSettings();

      // Clean up old data
      await this.cleanupOldData();
    } catch (error) {
      console.error('[Extension SW] Background sync failed:', error);
    }
  }

  /**
   * Utility methods
   */

  private isSupportedSite(url: string): boolean {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return EXTENSION_CONFIG.supportedSites.some(
        site => domain === site || domain.endsWith(`.${site}`)
      );
    } catch {
      return false;
    }
  }

  private isAllowedOrigin(origin?: string): boolean {
    if (!origin) return false;

    try {
      const url = new URL(origin);
      return (
        this.isSupportedSite(url.href) ||
        url.hostname === 'pensieve-index.com' ||
        url.hostname === 'localhost'
      );
    } catch {
      return false;
    }
  }

  private generateSubmissionId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateStoryData(storyData: DetectedStory): boolean {
    return !!(
      storyData.title &&
      storyData.url &&
      storyData.author &&
      storyData.fandom &&
      storyData.site
    );
  }

  private needsDataMigration(previousVersion?: string): boolean {
    // Check if data migration is needed based on version
    return false; // Implement version comparison logic
  }

  private isSignificantUpdate(previousVersion?: string): boolean {
    // Check if this is a significant update warranting user notification
    return false; // Implement significance check logic
  }

  // Additional implementation methods would be added here...
  private async injectContentScript(tabId: number): Promise<void> {
    /* Implementation */
  }
  private async requestStoryDetection(
    tabId: number,
    url: string
  ): Promise<void> {
    /* Implementation */
  }
  private async loadStoredState(): Promise<void> {
    /* Implementation */
  }
  private async getUserSettings(): Promise<any> {
    /* Implementation */
  }
  private async cleanupTabData(tabId: number): Promise<void> {
    /* Implementation */
  }
  private async handleContentScriptReady(
    tabId?: number,
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    /* Implementation */
  }
  private async storeDetectedStory(
    storyData: DetectedStory,
    tabId?: number
  ): Promise<void> {
    /* Implementation */
  }
  private async checkExistingStory(storyData: DetectedStory): Promise<any> {
    /* Implementation */
  }
  private async enhanceStoryData(
    storyData: DetectedStory
  ): Promise<DetectedStory> {
    return storyData;
  }
  private async notifyPopup(type: string, data?: any): Promise<void> {
    /* Implementation */
  }
  private async updateStoredStory(
    parsedData: any,
    tabId?: number
  ): Promise<void> {
    /* Implementation */
  }
  private async validateSubmissionData(data: any): Promise<void> {
    /* Implementation */
  }
  private async waitForProcessingComplete(
    submissionId: string,
    apiSubmissionId: string
  ): Promise<void> {
    /* Implementation */
  }
  private async storeSubmissionState(
    submission: SubmissionState
  ): Promise<void> {
    /* Implementation */
  }
  private async showNotification(
    title: string,
    message: string
  ): Promise<void> {
    /* Implementation */
  }
  private async syncPendingSubmissions(): Promise<void> {
    /* Implementation */
  }
  private async syncUserSettings(): Promise<void> {
    /* Implementation */
  }
  private async cleanupOldData(): Promise<void> {
    /* Implementation */
  }
  private async requestPermissions(): Promise<void> {
    /* Implementation */
  }
  private async migrateData(previousVersion: string): Promise<void> {
    /* Implementation */
  }
  private async showUpdateNotification(): Promise<void> {
    /* Implementation */
  }
  private async handleSyncRequest(
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    /* Implementation */
  }
  private async handleStatusUpdate(
    payload: any,
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    /* Implementation */
  }
  private async handleSettingsUpdate(
    payload: any,
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    /* Implementation */
  }
  private async handlePopupOpened(
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    /* Implementation */
  }
  private async handlePopupClosed(): Promise<void> {
    /* Implementation */
  }
  private async handlePortMessage(
    port: chrome.runtime.Port,
    message: ExtensionMessage
  ): Promise<void> {
    /* Implementation */
  }
  private async handlePortDisconnect(port: chrome.runtime.Port): Promise<void> {
    /* Implementation */
  }
}

/**
 * Initialize the service worker
 */
const extensionServiceWorker = new ExtensionServiceWorker();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExtensionServiceWorker, EXTENSION_CONFIG };
}
