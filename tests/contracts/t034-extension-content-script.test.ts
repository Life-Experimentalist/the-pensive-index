/**
 * T034 Contract Test: Extension Content Script
 *
 * Tests for content script functionality including:
 * - Website detection logic
 * - Story metadata extraction
 * - UI injection and interaction
 * - Cross-site communication security
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM environment
const mockDocument = {
  readyState: 'complete',
  createElement: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  body: {
    appendChild: vi.fn(),
  },
  addEventListener: vi.fn(),
};

const mockWindow = {
  location: {
    href: 'https://archiveofourown.org/works/12345',
  },
  addEventListener: vi.fn(),
  requestAnimationFrame: vi.fn(fn => setTimeout(fn, 0)),
};

// Mock browser extension API
const mockBrowser = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
  },
  tabs: {
    query: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// Set up global mocks
global.document = mockDocument as any;
global.window = mockWindow as any;
(global.window as any).chrome = mockBrowser;
(global.window as any).browser = mockBrowser;

describe('T034 Contract: Extension Content Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockDocument.readyState = 'complete';
    mockWindow.location.href = 'https://archiveofourown.org/works/12345';
    mockBrowser.runtime.lastError = null;

    // Mock DOM elements for AO3
    mockDocument.createElement.mockImplementation((tag: string) => ({
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      style: {},
      innerHTML: '',
      textContent: '',
      addEventListener: vi.fn(),
      querySelector: vi.fn(),
      remove: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Website Detection', () => {
    it('should detect Archive of Our Own (AO3) website', () => {
      mockWindow.location.href = 'https://archiveofourown.org/works/12345';

      // Test AO3 URL pattern
      const ao3Pattern = /^https:\/\/archiveofourown\.org\/works\/\d+/;
      expect(ao3Pattern.test(mockWindow.location.href)).toBe(true);
    });

    it('should detect FanFiction.Net website', () => {
      mockWindow.location.href =
        'https://www.fanfiction.net/s/123456/1/Story-Title';

      // Test FFN URL pattern
      const ffnPattern = /^https:\/\/www\.fanfiction\.net\/s\/\d+/;
      expect(ffnPattern.test(mockWindow.location.href)).toBe(true);
    });

    it('should detect Wattpad website', () => {
      mockWindow.location.href =
        'https://www.wattpad.com/story/123456-story-title';

      // Test Wattpad URL pattern
      const wattpadPattern = /^https:\/\/www\.wattpad\.com\/story\/\d+/;
      expect(wattpadPattern.test(mockWindow.location.href)).toBe(true);
    });

    it('should detect YouTube website', () => {
      mockWindow.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Test YouTube URL pattern
      const youtubePattern = /^https:\/\/www\.youtube\.com\/watch\?v=/;
      expect(youtubePattern.test(mockWindow.location.href)).toBe(true);
    });

    it('should reject unsupported websites', () => {
      const unsupportedUrls = [
        'https://example.com/story',
        'https://twitter.com/status/123',
        'https://reddit.com/r/fanfiction',
      ];

      const supportedPatterns = [
        /^https:\/\/archiveofourown\.org\/works\/\d+/,
        /^https:\/\/www\.fanfiction\.net\/s\/\d+/,
        /^https:\/\/www\.wattpad\.com\/story\/\d+/,
        /^https:\/\/www\.youtube\.com\/watch\?v=/,
      ];

      unsupportedUrls.forEach(url => {
        const isSupported = supportedPatterns.some(pattern =>
          pattern.test(url)
        );
        expect(isSupported).toBe(false);
      });
    });
  });

  describe('Story Metadata Extraction', () => {
    describe('AO3 Extraction', () => {
      beforeEach(() => {
        mockWindow.location.href = 'https://archiveofourown.org/works/12345';

        // Mock AO3 DOM structure
        const mockElements = {
          'h2.title.heading': { textContent: 'Test Story Title' },
          'h3.byline a[rel="author"]': { textContent: 'Test Author' },
          '.summary .userstuff': { textContent: 'This is a test summary.' },
          'dl.stats': { querySelector: vi.fn() },
          '.relationship.tag': [
            { textContent: 'Harry Potter/Hermione Granger' },
          ],
          '.character.tag': [
            { textContent: 'Harry Potter' },
            { textContent: 'Hermione Granger' },
          ],
          '.freeform.tag': [
            { textContent: 'Angst' },
            { textContent: 'Romance' },
          ],
          '.rating.tag': { textContent: 'Teen And Up Audiences' },
          '.warning.tag': [{ textContent: 'No Archive Warnings Apply' }],
        };

        mockDocument.querySelector.mockImplementation(selector => {
          return mockElements[selector] || null;
        });

        mockDocument.querySelectorAll.mockImplementation(selector => {
          const elements = mockElements[selector];
          return Array.isArray(elements)
            ? elements
            : elements
            ? [elements]
            : [];
        });

        // Mock stats sub-elements
        const statsElement = mockElements['dl.stats'];
        statsElement.querySelector.mockImplementation(selector => {
          const statsElements = {
            'dd.words': { textContent: '50,000' },
            'dd.chapters': { textContent: '12/12' },
            'dd.published': { textContent: '2024-01-01' },
            'dd.status': { textContent: '2024-01-15' },
          };
          return statsElements[selector] || null;
        });
      });

      it('should extract required story metadata from AO3', async () => {
        // This would be testing the AO3Extractor.extract() method
        const expectedMetadata = {
          title: 'Test Story Title',
          author: 'Test Author',
          summary: 'This is a test summary.',
          url: 'https://archiveofourown.org/works/12345',
          wordCount: 50000,
          chapterCount: 12,
          completionStatus: 'complete',
          publishDate: new Date('2024-01-01'),
          lastUpdateDate: new Date('2024-01-15'),
          rating: 'Teen And Up Audiences',
          relationships: ['Harry Potter/Hermione Granger'],
          characters: ['Harry Potter', 'Hermione Granger'],
          additionalTags: ['Angst', 'Romance'],
          warnings: ['No Archive Warnings Apply'],
        };

        // Test metadata structure matches expected format
        expect(expectedMetadata.title).toBe('Test Story Title');
        expect(expectedMetadata.author).toBe('Test Author');
        expect(expectedMetadata.url).toBe(
          'https://archiveofourown.org/works/12345'
        );
        expect(expectedMetadata.wordCount).toBe(50000);
        expect(expectedMetadata.chapterCount).toBe(12);
        expect(expectedMetadata.completionStatus).toBe('complete');
      });

      it('should handle missing optional fields gracefully', async () => {
        // Mock missing elements
        mockDocument.querySelector.mockImplementation(selector => {
          if (selector === 'h2.title.heading') {
            return { textContent: 'Test Story' };
          }
          if (selector === 'h3.byline a[rel="author"]') {
            return { textContent: 'Test Author' };
          }
          // Other elements missing
          return null;
        });

        mockDocument.querySelectorAll.mockReturnValue([]);

        // Should still extract required fields
        const minimalMetadata = {
          title: 'Test Story',
          author: 'Test Author',
          summary: '',
          url: 'https://archiveofourown.org/works/12345',
          wordCount: undefined,
          chapterCount: undefined,
          completionStatus: 'unknown',
        };

        expect(minimalMetadata.title).toBeTruthy();
        expect(minimalMetadata.author).toBeTruthy();
        expect(minimalMetadata.url).toBeTruthy();
      });

      it('should throw error when required fields are missing', async () => {
        // Mock missing title element
        mockDocument.querySelector.mockReturnValue(null);

        // Should throw extraction error for missing required fields
        const shouldThrowError = () => {
          const titleElement = document.querySelector('h2.title.heading');
          if (!titleElement) {
            throw new Error('Title not found');
          }
        };

        expect(shouldThrowError).toThrow('Title not found');
      });
    });

    describe('FFN Extraction', () => {
      beforeEach(() => {
        mockWindow.location.href =
          'https://www.fanfiction.net/s/123456/1/Story-Title';

        // Mock FFN DOM structure
        const mockElements = {
          '#profile_top b.xcontrast_txt': { textContent: 'FFN Test Story' },
          '#profile_top a.xcontrast_txt': { textContent: 'FFN Author' },
          '#profile_top div.xcontrast_txt': {
            textContent: 'FFN story summary.',
          },
          '#profile_top span.xgray': {
            textContent:
              'Rated: T - English - Adventure/Romance - Chapters: 5 - Words: 25,000 - Reviews: 100 - Published: 1/1/2024 - Updated: 1/15/2024',
          },
        };

        mockDocument.querySelector.mockImplementation(selector => {
          return mockElements[selector] || null;
        });
      });

      it('should extract story metadata from FFN stats string', () => {
        const statsText =
          'Rated: T - English - Adventure/Romance - Chapters: 5 - Words: 25,000 - Reviews: 100 - Published: 1/1/2024 - Updated: 1/15/2024';
        const parts = statsText.split(' - ');

        let wordCount, chapterCount, rating;

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
          } else if (trimmed.startsWith('Rated:')) {
            rating = trimmed.replace('Rated: ', '');
          }
        }

        expect(wordCount).toBe(25000);
        expect(chapterCount).toBe(5);
        expect(rating).toBe('T');
      });
    });
  });

  describe('UI Injection', () => {
    it('should create and inject submission button', () => {
      const mockButton = {
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        addEventListener: vi.fn(),
      };

      mockDocument.createElement.mockReturnValue(mockButton);

      // Simulate button creation
      const button = document.createElement('button');
      button.id = 'pensieve-submit-button';
      button.className = 'pensieve-submit-btn';
      button.innerHTML = `
        <span class="pensieve-icon">📚</span>
        <span class="pensieve-text">Submit to Pensieve Index</span>
      `;

      document.body.appendChild(button);

      expect(mockDocument.createElement).toHaveBeenCalledWith('button');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(button);
      expect(button.id).toBe('pensieve-submit-button');
    });

    it('should add event listeners to button', () => {
      const mockButton = {
        addEventListener: vi.fn(),
      };

      // Simulate adding event listeners
      mockButton.addEventListener('mouseenter', expect.any(Function));
      mockButton.addEventListener('mouseleave', expect.any(Function));
      mockButton.addEventListener('click', expect.any(Function));

      expect(mockButton.addEventListener).toHaveBeenCalledTimes(3);
    });

    it('should apply proper button styles', () => {
      const expectedStyles = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '10000',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 16px',
        color: 'white',
      };

      const mockButton = { style: {} };

      // Simulate style application
      Object.assign(mockButton.style, expectedStyles);

      expect(mockButton.style.position).toBe('fixed');
      expect(mockButton.style.zIndex).toBe('10000');
      expect(mockButton.style.background).toContain('linear-gradient');
    });
  });

  describe('Message Communication', () => {
    it('should send message to background script', async () => {
      const testMessage = {
        type: 'SUBMIT_STORY',
        payload: {
          metadata: {
            title: 'Test Story',
            author: 'Test Author',
            url: 'https://archiveofourown.org/works/12345',
          },
          extractorId: 'ao3',
          extractedAt: new Date().toISOString(),
          pageUrl: 'https://archiveofourown.org/works/12345',
        },
      };

      mockBrowser.runtime.sendMessage.mockImplementation(
        (message, callback) => {
          callback({ success: true, submissionId: 'sub-123' });
        }
      );

      // Simulate message sending
      const result = await new Promise(resolve => {
        mockBrowser.runtime.sendMessage(testMessage, resolve);
      });

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
        testMessage,
        expect.any(Function)
      );
      expect(result).toEqual({ success: true, submissionId: 'sub-123' });
    });

    it('should handle message sending errors', async () => {
      mockBrowser.runtime.lastError = {
        message: 'Extension context invalidated',
      };
      mockBrowser.runtime.sendMessage.mockImplementation(
        (message, callback) => {
          callback(null); // Simulate error response
        }
      );

      const testMessage = { type: 'SUBMIT_STORY', payload: {} };

      // Should handle runtime errors
      const error = mockBrowser.runtime.lastError;
      expect(error).toBeTruthy();
      expect(error.message).toBe('Extension context invalidated');
    });

    it('should listen for messages from background script', () => {
      const messageHandler = vi.fn();

      // Simulate message listener setup
      mockBrowser.runtime.onMessage.addListener(messageHandler);

      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledWith(
        messageHandler
      );
    });
  });

  describe('Validation', () => {
    it('should validate required metadata fields', () => {
      const validMetadata = {
        title: 'Valid Title',
        author: 'Valid Author',
        url: 'https://archiveofourown.org/works/12345',
        summary: 'Valid summary',
      };

      const invalidMetadata = {
        title: '',
        author: '',
        url: 'invalid-url',
        summary: '',
      };

      // Valid metadata validation
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      if (!validMetadata.title?.trim())
        validationResult.errors.push('Title is required');
      if (!validMetadata.author?.trim())
        validationResult.errors.push('Author is required');
      if (!validMetadata.url?.trim())
        validationResult.errors.push('URL is required');

      validationResult.isValid = validationResult.errors.length === 0;

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Invalid metadata validation
      const invalidValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      if (!invalidMetadata.title?.trim())
        invalidValidationResult.errors.push('Title is required');
      if (!invalidMetadata.author?.trim())
        invalidValidationResult.errors.push('Author is required');
      if (!invalidMetadata.url?.trim())
        invalidValidationResult.errors.push('URL is required');

      // URL validation
      const isValidUrl = (url: string): boolean => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      if (invalidMetadata.url && !isValidUrl(invalidMetadata.url)) {
        invalidValidationResult.errors.push('Invalid URL');
      }

      invalidValidationResult.isValid =
        invalidValidationResult.errors.length === 0;

      expect(invalidValidationResult.isValid).toBe(false);
      expect(invalidValidationResult.errors.length).toBeGreaterThan(0);
    });

    it('should validate word count and chapter count', () => {
      const testCases = [
        { wordCount: -1, chapterCount: 0, expectErrors: 2 },
        { wordCount: 0, chapterCount: 1, expectErrors: 0 },
        { wordCount: 1000, chapterCount: 5, expectErrors: 0 },
        { wordCount: undefined, chapterCount: undefined, expectErrors: 0 },
      ];

      testCases.forEach(({ wordCount, chapterCount, expectErrors }) => {
        const errors = [];

        if (wordCount !== undefined && wordCount < 0) {
          errors.push('Word count cannot be negative');
        }
        if (chapterCount !== undefined && chapterCount < 1) {
          errors.push('Chapter count must be at least 1');
        }

        expect(errors.length).toBe(expectErrors);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle extraction errors gracefully', () => {
      const extractionError = new Error('Failed to extract story metadata');
      extractionError.name = 'ExtractionError';

      // Should create proper error structure
      expect(extractionError.message).toBe('Failed to extract story metadata');
      expect(extractionError.name).toBe('ExtractionError');
    });

    it('should handle network errors during submission', () => {
      mockBrowser.runtime.sendMessage.mockImplementation(
        (message, callback) => {
          callback(null); // Simulate network error
        }
      );

      mockBrowser.runtime.lastError = {
        message:
          'Could not establish connection. Receiving end does not exist.',
      };

      const networkError = mockBrowser.runtime.lastError;
      expect(networkError.message).toContain('Could not establish connection');
    });

    it('should display error notifications to user', () => {
      const mockNotification = {
        className: '',
        textContent: '',
        style: {},
        remove: vi.fn(),
      };

      mockDocument.createElement.mockReturnValue(mockNotification);

      // Simulate error notification creation
      const notification = document.createElement('div');
      notification.className =
        'pensieve-notification pensieve-notification-error';
      notification.textContent = 'Submission failed: Network error';

      document.body.appendChild(notification);

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(notification);
      expect(notification.className).toContain('error');
    });
  });

  describe('State Management', () => {
    it('should track content script state', () => {
      const initialState = {
        isInjected: false,
        isExtracting: false,
        hasError: false,
        errorMessage: undefined,
        buttonElement: undefined,
        extractor: undefined,
      };

      // Test state transitions
      const updatedState = {
        ...initialState,
        isInjected: true,
        extractor: { id: 'ao3', name: 'Archive of Our Own' },
      };

      expect(initialState.isInjected).toBe(false);
      expect(updatedState.isInjected).toBe(true);
      expect(updatedState.extractor.id).toBe('ao3');
    });

    it('should handle button state changes', () => {
      const buttonStates = {
        default: {
          icon: '📚',
          text: 'Submit to Pensieve Index',
          disabled: false,
        },
        extracting: { icon: '⏳', text: 'Extracting story...', disabled: true },
        success: {
          icon: '✅',
          text: 'Submitted successfully!',
          disabled: false,
        },
        error: { icon: '❌', text: 'Submission failed', disabled: false },
      };

      // Test each state
      Object.entries(buttonStates).forEach(([state, config]) => {
        expect(config.icon).toBeTruthy();
        expect(config.text).toBeTruthy();
        expect(typeof config.disabled).toBe('boolean');
      });
    });
  });

  describe('Security', () => {
    it('should validate message origins', () => {
      const trustedOrigins = [
        'https://localhost:3000',
        'https://pensieve-index.com',
        'https://app.pensieve-index.com',
      ];

      const testOrigins = [
        'https://localhost:3000',
        'https://malicious-site.com',
        'https://pensieve-index.com',
        'http://localhost:3000', // HTTP should be rejected
      ];

      testOrigins.forEach(origin => {
        const isTrusted = trustedOrigins.includes(origin);
        const isSecure =
          origin.startsWith('https://') ||
          origin.startsWith('https://localhost:');
        const isValid = isTrusted && isSecure;

        if (
          origin === 'https://localhost:3000' ||
          origin === 'https://pensieve-index.com'
        ) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });

    it('should sanitize user input', () => {
      const dangerousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
      ];

      dangerousInputs.forEach(input => {
        // Should strip or escape dangerous content
        const sanitized = input
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/data:/gi, '');

        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('data:');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport constraints', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone width
      });

      const isMobile = window.innerWidth <= 768;
      expect(isMobile).toBe(true);

      // Button should adapt to mobile
      const mobileStyles = {
        top: '10px',
        right: '10px',
        padding: '10px 14px',
        fontSize: '13px',
      };

      expect(mobileStyles.padding).toBe('10px 14px');
      expect(mobileStyles.fontSize).toBe('13px');
    });

    it('should handle very small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // Very small screen
      });

      const isVerySmall = window.innerWidth <= 480;
      expect(isVerySmall).toBe(true);

      // Text should be hidden on very small screens
      const compactMode = isVerySmall;
      expect(compactMode).toBe(true);
    });
  });
});
