import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { chromium, firefox, Browser, BrowserContext, Page } from 'playwright'

// Mock browser extension APIs for testing
// Note: These imports will fail initially - that's expected in TDD
import { ExtensionMessageHandler } from '@/extension/src/background/message-handler'
import { ContentScriptExtractor } from '@/extension/src/content/content-script'
import { PopupController } from '@/extension/src/popup/popup-controller'

// Mock extension message passing
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn()
    }
  },
  action: {
    setIcon: vi.fn(),
    setBadgeText: vi.fn()
  }
}

// Mock browser APIs
vi.mock('webextension-polyfill', () => ({
  default: mockChrome
}))

describe('Browser Extension Integration Tests', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  let extensionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Setup browser with extension for testing
    browser = await chromium.launch({ headless: false })
    context = await browser.newContext()
    
    // Load extension in test mode
    const extensionPath = 'V:\\Code\\ProjectCode\\the-pensive-index\\extension'
    // Note: This will fail until extension is built
    try {
      context = await browser.newContext({
        // Load unpacked extension for testing
        args: [`--load-extension=${extensionPath}`]
      })
    } catch (error) {
      // Extension not built yet - expected in TDD phase
    }
    
    page = await context.newPage()
  })

  afterEach(async () => {
    await page?.close()
    await context?.close()
    await browser?.close()
    vi.restoreAllMocks()
  })

  describe('Extension Popup UI Interaction', () => {
    it('should display popup with submission form when clicked', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/12345')
      
      // Act - Click extension icon to open popup
      // Note: This will fail until extension popup is implemented
      const popup = await page.waitForSelector('[data-testid="extension-popup"]', { timeout: 5000 })
      
      // Assert
      expect(popup).toBeTruthy()
      
      // Check form elements are present
      const storyUrlField = await page.waitForSelector('[data-testid="story-url-field"]')
      const fandomSelect = await page.waitForSelector('[data-testid="fandom-select"]')
      const extractButton = await page.waitForSelector('[data-testid="extract-metadata-button"]')
      const submitButton = await page.waitForSelector('[data-testid="submit-story-button"]')
      
      expect(storyUrlField).toBeTruthy()
      expect(fandomSelect).toBeTruthy()
      expect(extractButton).toBeTruthy()
      expect(submitButton).toBeTruthy()
      
      // Verify initial state
      await expect(page.locator('[data-testid="story-url-field"]')).toHaveValue('https://archiveofourown.org/works/12345')
      await expect(page.locator('[data-testid="submit-story-button"]')).toBeDisabled()
    })

    it('should populate form fields after metadata extraction', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/12345')
      const popup = await page.waitForSelector('[data-testid="extension-popup"]')
      
      // Act - Click extract metadata button
      await page.click('[data-testid="extract-metadata-button"]')
      await page.waitForSelector('[data-testid="extraction-complete"]', { timeout: 10000 })
      
      // Assert - Form should be populated with extracted data
      await expect(page.locator('[data-testid="story-title-field"]')).toHaveValue(/^.+$/) // Any non-empty title
      await expect(page.locator('[data-testid="author-field"]')).toHaveValue(/^.+$/) // Any non-empty author
      await expect(page.locator('[data-testid="summary-field"]')).toHaveValue(/^.{10,}$/) // At least 10 characters
      await expect(page.locator('[data-testid="word-count-field"]')).toHaveValue(/^\d+$/) // Numeric word count
      await expect(page.locator('[data-testid="chapter-count-field"]')).toHaveValue(/^\d+$/) // Numeric chapter count
      
      // Check suggested tags are populated
      const tagElements = await page.locator('[data-testid="suggested-tag"]').all()
      expect(tagElements.length).toBeGreaterThan(0)
      
      // Submit button should now be enabled
      await expect(page.locator('[data-testid="submit-story-button"]')).toBeEnabled()
    })

    it('should handle extraction errors gracefully', async () => {
      // Arrange
      await page.goto('https://example.com/invalid-story-page')
      const popup = await page.waitForSelector('[data-testid="extension-popup"]')
      
      // Act - Try to extract from unsupported site
      await page.click('[data-testid="extract-metadata-button"]')
      await page.waitForSelector('[data-testid="extraction-error"]', { timeout: 5000 })
      
      // Assert - Error message should be displayed
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent()
      expect(errorMessage).toContain('No suitable extractor found')
      
      // Manual form entry should still be available
      await expect(page.locator('[data-testid="story-title-field"]')).toBeVisible()
      await expect(page.locator('[data-testid="manual-entry-section"]')).toBeVisible()
    })

    it('should validate form data before submission', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/12345')
      const popup = await page.waitForSelector('[data-testid="extension-popup"]')
      
      // Act - Try to submit with incomplete data
      await page.fill('[data-testid="story-title-field"]', '') // Empty title
      await page.click('[data-testid="submit-story-button"]')
      
      // Assert - Validation errors should be displayed
      await expect(page.locator('[data-testid="validation-error-title"]')).toBeVisible()
      await expect(page.locator('[data-testid="validation-error-title"]')).toHaveText('Story title is required')
      
      // Form should not submit
      await expect(page.locator('[data-testid="submission-success"]')).not.toBeVisible()
    })

    it('should show submission progress and success states', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/12345')
      const popup = await page.waitForSelector('[data-testid="extension-popup"]')
      
      // Fill valid form data
      await page.fill('[data-testid="story-title-field"]', 'Test Story Title')
      await page.fill('[data-testid="author-field"]', 'Test Author')
      await page.fill('[data-testid="summary-field"]', 'A comprehensive test story summary with sufficient length')
      await page.selectOption('[data-testid="fandom-select"]', 'harry-potter')
      await page.check('[data-testid="tag-romance"]')
      await page.check('[data-testid="tag-angst"]')
      await page.check('[data-testid="tag-time-travel"]')
      
      // Act - Submit the form
      await page.click('[data-testid="submit-story-button"]')
      
      // Assert - Progress indicators should be shown
      await expect(page.locator('[data-testid="submission-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="progress-text"]')).toHaveText('Submitting story...')
      
      // Wait for completion
      await page.waitForSelector('[data-testid="submission-success"]', { timeout: 10000 })
      
      // Success state should be displayed
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="github-issue-link"]')).toBeVisible()
      await expect(page.locator('[data-testid="submission-id"]')).toBeVisible()
    })
  })

  describe('Content Script Story Extraction', () => {
    it('should extract metadata from AO3 story page', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/12345')
      
      // Act - Inject content script and extract metadata
      const extractionResult = await page.evaluate(() => {
        // Note: This will fail until content script is implemented
        return window.extractStoryMetadata?.()
      })
      
      // Assert
      expect(extractionResult).toBeTruthy()
      expect(extractionResult).toMatchObject({
        title: expect.any(String),
        author: expect.any(String),
        summary: expect.any(String),
        wordCount: expect.any(Number),
        chapterCount: expect.any(Number),
        publishDate: expect.any(String),
        lastUpdateDate: expect.any(String),
        tags: expect.any(Array),
        completionStatus: expect.stringMatching(/^(complete|in-progress|abandoned|unknown)$/)
      })
      
      // Verify extracted data quality
      expect(extractionResult.title.length).toBeGreaterThan(0)
      expect(extractionResult.author.length).toBeGreaterThan(0)
      expect(extractionResult.summary.length).toBeGreaterThan(10)
      expect(extractionResult.wordCount).toBeGreaterThan(0)
      expect(extractionResult.tags.length).toBeGreaterThan(0)
    })

    it('should extract metadata from FFN story page', async () => {
      // Arrange
      await page.goto('https://www.fanfiction.net/s/12345/1/')
      
      // Act - Extract metadata using FFN extractor
      const extractionResult = await page.evaluate(() => {
        return window.extractStoryMetadata?.()
      })
      
      // Assert
      expect(extractionResult).toBeTruthy()
      expect(extractionResult).toMatchObject({
        title: expect.any(String),
        author: expect.any(String),
        summary: expect.any(String),
        extractorUsed: 'fanfiction-net'
      })
    })

    it('should handle extraction failures and provide fallbacks', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/private-locked-work')
      
      // Act - Try to extract from locked/private work
      const extractionResult = await page.evaluate(() => {
        return window.extractStoryMetadata?.()
      })
      
      // Assert - Should return partial data or error
      expect(extractionResult).toBeTruthy()
      expect(extractionResult.error).toBeTruthy()
      expect(extractionResult.error).toContain('access restricted')
      
      // Should still provide basic URL and site information
      expect(extractionResult.url).toBe('https://archiveofourown.org/works/private-locked-work')
      expect(extractionResult.extractorUsed).toBe('archiveofourown')
    })

    it('should validate extracted metadata quality', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/12345')
      
      // Act - Extract and validate
      const extractionResult = await page.evaluate(() => {
        const metadata = window.extractStoryMetadata?.()
        return {
          metadata,
          validation: window.validateExtractedMetadata?.(metadata)
        }
      })
      
      // Assert - Validation should pass for good extraction
      expect(extractionResult.validation).toBeTruthy()
      expect(extractionResult.validation).toMatchObject({
        isValid: true,
        confidence: expect.any(Number),
        warnings: expect.any(Array),
        errors: expect.any(Array)
      })
      
      expect(extractionResult.validation.confidence).toBeGreaterThan(0.7) // 70% confidence minimum
      expect(extractionResult.validation.errors.length).toBe(0) // No critical errors
    })

    it('should respect website-specific extraction rules', async () => {
      // Arrange
      await page.goto('https://www.wattpad.com/story/12345-test-story')
      
      // Act - Extract with Wattpad-specific rules
      const extractionResult = await page.evaluate(() => {
        return window.extractStoryMetadata?.({
          respectRateLimits: true,
          includePremiumCheck: true,
          extractReadingLists: true
        })
      })
      
      // Assert - Wattpad-specific fields should be present
      expect(extractionResult).toMatchObject({
        extractorUsed: 'wattpad',
        isPremiumContent: expect.any(Boolean),
        readingLists: expect.any(Array),
        rateLimitRespected: true
      })
    })
  })

  describe('Background Service Worker API Communication', () => {
    it('should handle message passing between content script and popup', async () => {
      // Arrange
      const messageData = {
        type: 'EXTRACTION_COMPLETE',
        payload: {
          title: 'Test Story',
          author: 'Test Author',
          summary: 'Test summary'
        }
      }
      
      // Act - Simulate message from content script
      await page.evaluate((data) => {
        // Note: This will fail until background script is implemented
        chrome.runtime.sendMessage(data)
      }, messageData)
      
      // Assert - Background script should receive and process message
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(messageData)
      
      // Message should be forwarded to popup if open
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalled()
    })

    it('should manage API authentication tokens', async () => {
      // Arrange
      const authToken = 'test-jwt-token'
      
      // Act - Store authentication token
      await page.evaluate((token) => {
        chrome.storage.local.set({ authToken: token })
      }, authToken)
      
      // Assert
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ authToken })
      
      // Token should be retrievable for API calls
      mockChrome.storage.local.get.mockResolvedValue({ authToken })
      const retrievedToken = await page.evaluate(() => {
        return chrome.storage.local.get(['authToken'])
      })
      
      expect(retrievedToken.authToken).toBe(authToken)
    })

    it('should handle API rate limiting gracefully', async () => {
      // Arrange - Simulate multiple rapid API calls
      const requests = Array.from({ length: 10 }, (_, i) => ({
        type: 'SUBMIT_STORY',
        payload: { storyId: `story-${i}` }
      }))
      
      // Act - Send multiple requests
      for (const request of requests) {
        await page.evaluate((req) => {
          chrome.runtime.sendMessage(req)
        }, request)
      }
      
      // Assert - Background script should implement rate limiting
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(10)
      
      // Should queue excess requests or show rate limit message
      const rateLimitResponse = await page.evaluate(() => {
        return chrome.runtime.sendMessage({ type: 'GET_RATE_LIMIT_STATUS' })
      })
      
      expect(rateLimitResponse).toMatchObject({
        isRateLimited: expect.any(Boolean),
        queuedRequests: expect.any(Number),
        nextAllowedTime: expect.any(Number)
      })
    })

    it('should sync data with server when online', async () => {
      // Arrange
      const offlineSubmissions = [
        { tempId: 'temp-1', storyData: { title: 'Story 1' } },
        { tempId: 'temp-2', storyData: { title: 'Story 2' } }
      ]
      
      // Store offline submissions
      await page.evaluate((submissions) => {
        chrome.storage.local.set({ offlineSubmissions: submissions })
      }, offlineSubmissions)
      
      // Act - Trigger sync when online
      await page.evaluate(() => {
        // Simulate network coming online
        window.dispatchEvent(new Event('online'))
      })
      
      // Assert - Background script should sync offline data
      expect(mockChrome.storage.local.get).toHaveBeenCalled()
      
      // Verify sync completion
      const syncStatus = await page.evaluate(() => {
        return chrome.runtime.sendMessage({ type: 'GET_SYNC_STATUS' })
      })
      
      expect(syncStatus).toMatchObject({
        syncInProgress: expect.any(Boolean),
        lastSyncTime: expect.any(Number),
        pendingCount: expect.any(Number)
      })
    })
  })

  describe('Offline Submission Queue Functionality', () => {
    it('should queue submissions when offline', async () => {
      // Arrange - Simulate offline state
      await page.setOfflineMode(true)
      await page.goto('https://archiveofourown.org/works/12345')
      
      const submissionData = {
        storyUrl: 'https://archiveofourown.org/works/12345',
        storyTitle: 'Offline Test Story',
        author: 'Test Author',
        fandomId: 'harry-potter',
        tags: ['test', 'offline', 'queue']
      }
      
      // Act - Submit story while offline
      await page.evaluate((data) => {
        chrome.runtime.sendMessage({
          type: 'SUBMIT_STORY',
          payload: data
        })
      }, submissionData)
      
      // Assert - Submission should be queued locally
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          offlineSubmissions: expect.arrayContaining([
            expect.objectContaining({
              tempId: expect.any(String),
              submissionData,
              timestamp: expect.any(Number),
              retryCount: 0
            })
          ])
        })
      )
    })

    it('should retry failed submissions with exponential backoff', async () => {
      // Arrange - Submission that will fail
      const failedSubmission = {
        tempId: 'temp-failed-1',
        submissionData: { title: 'Failed Story' },
        timestamp: Date.now() - 60000, // 1 minute ago
        retryCount: 2
      }
      
      await page.evaluate((submission) => {
        chrome.storage.local.set({ 
          failedSubmissions: [submission] 
        })
      }, failedSubmission)
      
      // Act - Trigger retry mechanism
      await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'RETRY_FAILED_SUBMISSIONS' })
      })
      
      // Assert - Should implement exponential backoff
      const retryStatus = await page.evaluate(() => {
        return chrome.runtime.sendMessage({ type: 'GET_RETRY_STATUS' })
      })
      
      expect(retryStatus).toMatchObject({
        nextRetryTime: expect.any(Number),
        backoffDelay: expect.any(Number), // Should be exponentially increased
        maxRetries: expect.any(Number)
      })
      
      // Backoff delay should increase with retry count
      expect(retryStatus.backoffDelay).toBeGreaterThan(4000) // > 4 seconds for retry count 2
    })

    it('should handle queue size limits and cleanup', async () => {
      // Arrange - Fill queue to capacity
      const maxQueueSize = 100
      const queuedSubmissions = Array.from({ length: maxQueueSize + 10 }, (_, i) => ({
        tempId: `temp-${i}`,
        submissionData: { title: `Story ${i}` },
        timestamp: Date.now() - (i * 1000)
      }))
      
      // Act - Add submissions exceeding queue limit
      await page.evaluate((submissions) => {
        chrome.storage.local.set({ offlineSubmissions: submissions })
        chrome.runtime.sendMessage({ type: 'CLEANUP_QUEUE' })
      }, queuedSubmissions)
      
      // Assert - Queue should be cleaned up
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          offlineSubmissions: expect.arrayContaining([])
        })
      )
      
      // Should keep only recent submissions
      const cleanedQueue = await page.evaluate(() => {
        return chrome.storage.local.get(['offlineSubmissions'])
      })
      
      expect(cleanedQueue.offlineSubmissions.length).toBeLessThanOrEqual(maxQueueSize)
    })
  })

  describe('Cross-Browser Compatibility', () => {
    it('should work correctly in Firefox', async () => {
      // Arrange - Switch to Firefox browser
      await browser.close()
      browser = await firefox.launch({ headless: false })
      context = await browser.newContext()
      page = await context.newPage()
      
      // Act - Test basic extension functionality
      await page.goto('https://archiveofourown.org/works/12345')
      
      // Note: This will fail until Firefox extension is built
      const extensionWorks = await page.evaluate(() => {
        return typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined'
      })
      
      // Assert
      expect(extensionWorks).toBe(true)
    })

    it('should handle browser-specific API differences', async () => {
      // Arrange - Test Chrome vs Firefox API differences
      const apiCompatibility = await page.evaluate(() => {
        // Check for Chrome vs Firefox extension APIs
        const hasChrome = typeof chrome !== 'undefined'
        const hasBrowser = typeof browser !== 'undefined'
        
        return {
          hasChrome,
          hasBrowser,
          hasWebextPolyfill: typeof window.browser !== 'undefined'
        }
      })
      
      // Assert - Should work with polyfill
      expect(apiCompatibility.hasWebextPolyfill || apiCompatibility.hasChrome || apiCompatibility.hasBrowser).toBe(true)
    })

    it('should maintain consistent UI across browsers', async () => {
      // Arrange
      await page.goto('https://archiveofourown.org/works/12345')
      
      // Act - Open extension popup
      // Note: This will fail until popup is implemented
      const popupStyles = await page.evaluate(() => {
        const popup = document.querySelector('[data-testid="extension-popup"]')
        if (!popup) return null
        
        const styles = window.getComputedStyle(popup)
        return {
          width: styles.width,
          height: styles.height,
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize
        }
      })
      
      // Assert - UI should be consistent
      if (popupStyles) {
        expect(popupStyles.width).toBe('400px') // Fixed width
        expect(popupStyles.height).toMatch(/^\d+px$/) // Valid height
        expect(popupStyles.fontSize).toMatch(/^\d+px$/) // Readable font size
      }
    })
  })
})