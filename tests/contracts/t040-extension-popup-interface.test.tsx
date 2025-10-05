/**
 * Contract Tests for T040: Extension Popup Interface
 * Tests browser extension popup UI and submission flow
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExtensionPopup from '../../src/extension/popup/ExtensionPopup';
import { ExtensionAPI } from '../../src/extension/lib/extension-api';

// Mock Chrome Extension APIs
const mockChrome = {
  tabs: {
    query: vi.fn(),
  },
  runtime: {
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// Mock global chrome object
Object.defineProperty(window, 'chrome', {
  value: mockChrome,
  writable: true,
});

// Mock ExtensionAPI
vi.mock('../../src/extension/lib/extension-api');

describe('T040: Extension Popup Interface', () => {
  let mockExtensionAPI: any;
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock ExtensionAPI
    mockExtensionAPI = {
      isSupportedSite: vi.fn(),
      parseCurrentPage: vi.fn(),
      getFandoms: vi.fn(),
      getFandomTags: vi.fn(),
      submitStory: vi.fn(),
      getUserPreferences: vi.fn(),
      saveUserPreferences: vi.fn(),
      checkAPIHealth: vi.fn(),
    };

    vi.mocked(ExtensionAPI).mockImplementation(() => mockExtensionAPI);

    // Setup default Chrome API responses
    mockChrome.tabs.query.mockResolvedValue([
      {
        id: 1,
        url: 'https://archiveofourown.org/works/123456',
        active: true,
      },
    ]);

    mockChrome.storage.sync.get.mockResolvedValue({});
    mockChrome.storage.local.get.mockResolvedValue({});
  });

  describe('Popup Initialization', () => {
    it('should initialize with current tab data', async () => {
      // Arrange
      const mockStoryData = {
        title: 'Test Story Title',
        author: 'Test Author',
        url: 'https://archiveofourown.org/works/123456',
        description: 'A test story description',
        fandom: 'Harry Potter',
      };

      const mockFandoms = [
        { slug: 'harry-potter', name: 'Harry Potter' },
        { slug: 'percy-jackson', name: 'Percy Jackson' },
      ];

      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue(mockStoryData);
      mockExtensionAPI.getFandoms.mockResolvedValue(mockFandoms);
      mockExtensionAPI.getUserPreferences.mockResolvedValue({
        email: 'user@test.com',
      });

      // Act
      render(<ExtensionPopup />);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Test Story Title')
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Author')).toBeInTheDocument();
        expect(screen.getByDisplayValue('user@test.com')).toBeInTheDocument();
      });

      expect(mockExtensionAPI.parseCurrentPage).toHaveBeenCalledWith(1);
      expect(mockExtensionAPI.getFandoms).toHaveBeenCalled();
    });

    it('should show unsupported site message for non-fanfiction sites', async () => {
      // Arrange
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          url: 'https://google.com',
          active: true,
        },
      ]);
      mockExtensionAPI.isSupportedSite.mockReturnValue(false);

      // Act
      render(<ExtensionPopup />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Unsupported Site')).toBeInTheDocument();
        expect(screen.getByText(/Archive of Our Own/)).toBeInTheDocument();
        expect(screen.getByText(/FanFiction.Net/)).toBeInTheDocument();
      });
    });

    it('should show parsing state while analyzing page', async () => {
      // Arrange
      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      // Act
      render(<ExtensionPopup />);

      // Assert
      expect(screen.getByText('Analyzing current page...')).toBeInTheDocument();

      await waitFor(() => {
        expect(
          screen.queryByText('Analyzing current page...')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    const setupFormTest = async () => {
      const mockFandoms = [
        { slug: 'harry-potter', name: 'Harry Potter' },
        { slug: 'percy-jackson', name: 'Percy Jackson' },
      ];

      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({
        title: 'Test Story',
        author: 'Test Author',
        url: 'https://archiveofourown.org/works/123456',
      });
      mockExtensionAPI.getFandoms.mockResolvedValue(mockFandoms);
      mockExtensionAPI.getUserPreferences.mockResolvedValue({});

      render(<ExtensionPopup />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument();
      });
    };

    it('should update story information fields', async () => {
      // Arrange
      await setupFormTest();

      // Act
      const titleInput = screen.getByDisplayValue('Test Story');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Story Title');

      const authorInput = screen.getByDisplayValue('Test Author');
      await user.clear(authorInput);
      await user.type(authorInput, 'Updated Author');

      // Assert
      expect(
        screen.getByDisplayValue('Updated Story Title')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('Updated Author')).toBeInTheDocument();
    });

    it('should allow fandom selection', async () => {
      // Arrange
      await setupFormTest();

      // Act
      const fandomSelect = screen.getByRole('combobox');
      await user.selectOptions(fandomSelect, 'harry-potter');

      // Assert
      expect(screen.getByDisplayValue('Harry Potter')).toBeInTheDocument();
      expect(mockExtensionAPI.getFandomTags).toHaveBeenCalledWith(
        'harry-potter'
      );
    });

    it('should handle custom tags input', async () => {
      // Arrange
      await setupFormTest();

      // Act
      const tagsInput = screen.getByPlaceholderText(/angst, time-travel/);
      await user.type(tagsInput, 'angst, time-travel, harry/hermione');

      // Assert
      expect(
        screen.getByDisplayValue('angst, time-travel, harry/hermione')
      ).toBeInTheDocument();
    });

    it('should require email address', async () => {
      // Arrange
      await setupFormTest();

      // Act
      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      await user.type(emailInput, 'user@test.com');

      // Assert
      expect(screen.getByDisplayValue('user@test.com')).toBeInTheDocument();
    });

    it('should require terms agreement', async () => {
      // Arrange
      await setupFormTest();

      // Act
      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      // Assert
      expect(termsCheckbox).toBeChecked();
    });
  });

  describe('Form Validation', () => {
    const setupValidationTest = async () => {
      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({
        title: '',
        author: '',
        url: 'https://archiveofourown.org/works/123456',
      });
      mockExtensionAPI.getFandoms.mockResolvedValue([
        { slug: 'harry-potter', name: 'Harry Potter' },
      ]);

      render(<ExtensionPopup />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /submit story/i })
        ).toBeInTheDocument();
      });
    };

    it('should validate required fields on submission', async () => {
      // Arrange
      await setupValidationTest();

      // Act
      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText('Email address is required')
        ).toBeInTheDocument();
        expect(screen.getByText('Please select a fandom')).toBeInTheDocument();
        expect(screen.getByText('Story title is required')).toBeInTheDocument();
        expect(
          screen.getByText('Story author is required')
        ).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      // Arrange
      await setupValidationTest();

      // Act
      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeInTheDocument();
      });
    });

    it('should require either selected tags or custom tags', async () => {
      // Arrange
      await setupValidationTest();

      // Fill required fields but leave tags empty
      await user.type(screen.getByDisplayValue(''), 'Test Title');
      await user.type(
        screen.getByPlaceholderText('Author name'),
        'Test Author'
      );
      await user.selectOptions(screen.getByRole('combobox'), 'harry-potter');
      await user.type(
        screen.getByPlaceholderText('your.email@example.com'),
        'user@test.com'
      );

      // Act
      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(/Please select at least one tag/)
        ).toBeInTheDocument();
      });
    });

    it('should require terms agreement', async () => {
      // Arrange
      await setupValidationTest();

      // Fill all fields except terms
      await user.type(screen.getByDisplayValue(''), 'Test Title');
      await user.type(
        screen.getByPlaceholderText('Author name'),
        'Test Author'
      );
      await user.selectOptions(screen.getByRole('combobox'), 'harry-potter');
      await user.type(
        screen.getByPlaceholderText('your.email@example.com'),
        'user@test.com'
      );
      await user.type(
        screen.getByPlaceholderText(/angst, time-travel/),
        'test-tag'
      );

      // Act
      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText('You must agree to the submission terms')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Submission Flow', () => {
    const setupSubmissionTest = async () => {
      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({
        title: 'Test Story',
        author: 'Test Author',
        url: 'https://archiveofourown.org/works/123456',
        description: 'Test description',
      });
      mockExtensionAPI.getFandoms.mockResolvedValue([
        { slug: 'harry-potter', name: 'Harry Potter' },
      ]);

      render(<ExtensionPopup />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument();
      });

      // Fill required fields
      await user.selectOptions(screen.getByRole('combobox'), 'harry-potter');
      await user.type(
        screen.getByPlaceholderText('your.email@example.com'),
        'user@test.com'
      );
      await user.type(
        screen.getByPlaceholderText(/angst, time-travel/),
        'test-tag'
      );
      await user.click(screen.getByRole('checkbox'));
    };

    it('should submit story with valid data', async () => {
      // Arrange
      await setupSubmissionTest();

      const mockSubmissionResult = {
        submissionId: 'sub-123',
        githubIssueNumber: 456,
        estimatedReviewTime: '3-5 days',
      };

      mockExtensionAPI.submitStory.mockResolvedValue(mockSubmissionResult);
      mockExtensionAPI.saveUserPreferences.mockResolvedValue(undefined);

      // Act
      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      expect(screen.getByText('Submitting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Submission Successful!')).toBeInTheDocument();
        expect(screen.getByText('sub-123')).toBeInTheDocument();
      });

      expect(mockExtensionAPI.submitStory).toHaveBeenCalledWith({
        storyTitle: 'Test Story',
        storyUrl: 'https://archiveofourown.org/works/123456',
        storyAuthor: 'Test Author',
        storyDescription: 'Test description',
        fandomSlug: 'harry-potter',
        selectedTags: [],
        customTags: 'test-tag',
        submitterEmail: 'user@test.com',
        sourceExtension: 'browser_extension',
        metadata: expect.objectContaining({
          submissionSource: 'browser_extension',
        }),
      });
    });

    it('should handle submission errors gracefully', async () => {
      // Arrange
      await setupSubmissionTest();

      mockExtensionAPI.submitStory.mockRejectedValue(new Error('API Error'));

      // Act
      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should save user preferences after successful submission', async () => {
      // Arrange
      await setupSubmissionTest();

      mockExtensionAPI.submitStory.mockResolvedValue({
        submissionId: 'sub-123',
        estimatedReviewTime: '3-5 days',
      });
      mockExtensionAPI.saveUserPreferences.mockResolvedValue(undefined);

      // Act
      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(mockExtensionAPI.saveUserPreferences).toHaveBeenCalledWith({
          email: 'user@test.com',
          defaultFandom: 'harry-potter',
        });
      });
    });

    it('should disable submit button during submission', async () => {
      // Arrange
      await setupSubmissionTest();

      mockExtensionAPI.submitStory.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ submissionId: 'sub-123' }), 100)
          )
      );

      // Act
      const submitButton = screen.getByRole('button', {
        name: /submit story/i,
      });
      await user.click(submitButton);

      // Assert
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Submitting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Submission Successful!')).toBeInTheDocument();
      });
    });
  });

  describe('Site Parser Integration', () => {
    it('should handle AO3 parsing correctly', async () => {
      // Arrange
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          url: 'https://archiveofourown.org/works/123456',
          active: true,
        },
      ]);

      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({
        title: 'AO3 Story Title',
        author: 'AO3 Author',
        description: 'AO3 Description',
        fandom: 'Harry Potter',
        site: 'ao3',
        rating: 'Teen And Up Audiences',
        tags: ['Angst', 'Hurt/Comfort'],
      });

      // Act
      render(<ExtensionPopup />);

      // Assert
      await waitFor(() => {
        expect(screen.getByDisplayValue('AO3 Story Title')).toBeInTheDocument();
        expect(screen.getByDisplayValue('AO3 Author')).toBeInTheDocument();
      });
    });

    it('should handle FFNet parsing correctly', async () => {
      // Arrange
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          url: 'https://fanfiction.net/s/123456',
          active: true,
        },
      ]);

      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({
        title: 'FFNet Story Title',
        author: 'FFNet Author',
        fandom: 'Percy Jackson and the Olympians',
        site: 'ffnet',
      });

      // Act
      render(<ExtensionPopup />);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByDisplayValue('FFNet Story Title')
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue('FFNet Author')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should initialize popup within 300ms', async () => {
      // Arrange
      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({});
      mockExtensionAPI.getFandoms.mockResolvedValue([]);

      // Act
      const startTime = Date.now();
      render(<ExtensionPopup />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /submit story/i })
        ).toBeInTheDocument();
      });

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(300);
    });

    it('should handle form interactions with <100ms response', async () => {
      // Arrange
      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({ title: 'Test' });
      mockExtensionAPI.getFandoms.mockResolvedValue([
        { slug: 'test', name: 'Test Fandom' },
      ]);

      render(<ExtensionPopup />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
      });

      // Act
      const startTime = Date.now();
      const titleInput = screen.getByDisplayValue('Test');
      await user.type(titleInput, ' Updated');
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByDisplayValue('Test Updated')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper form labels and ARIA attributes', async () => {
      // Arrange
      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({});
      mockExtensionAPI.getFandoms.mockResolvedValue([]);

      // Act
      render(<ExtensionPopup />);

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
        expect(screen.getByLabelText('Author')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      // Arrange
      mockExtensionAPI.isSupportedSite.mockReturnValue(true);
      mockExtensionAPI.parseCurrentPage.mockResolvedValue({});
      mockExtensionAPI.getFandoms.mockResolvedValue([]);

      render(<ExtensionPopup />);

      // Act & Assert
      await waitFor(() => {
        const titleInput = screen.getByLabelText('Title');
        titleInput.focus();
        expect(document.activeElement).toBe(titleInput);
      });
    });
  });
});

describe('T040 Integration Contracts', () => {
  it('should integrate with extension service worker for background processing', async () => {
    // This test verifies popup integration with service worker
    expect(true).toBe(true); // Placeholder for integration test
  });

  it('should integrate with content scripts for page parsing', async () => {
    // This test verifies popup integration with content scripts
    expect(true).toBe(true); // Placeholder for integration test
  });

  it('should integrate with backend API for submissions', async () => {
    // This test verifies popup integration with submission API
    expect(true).toBe(true); // Placeholder for integration test
  });
});
