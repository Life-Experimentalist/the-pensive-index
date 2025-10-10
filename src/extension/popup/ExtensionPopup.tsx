/**
 * Extension Popup Interface
 * React-based UI for story submission from browser extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ExtensionAPI } from '../lib/extension-api';
import { CreateSubmissionRequest, StoryMetadata } from '../../types/submission';
import type { Fandom } from '../../types';

// Type alias for backward compatibility
type FandomData = Fandom;

interface PopupState {
  currentTab: chrome.tabs.Tab | null;
  storyData: Partial<StoryMetadata> | null;
  fandoms: FandomData[];
  selectedFandom: string;
  selectedTags: string[];
  customTags: string;
  submissionStatus: 'idle' | 'parsing' | 'submitting' | 'success' | 'error';
  errorMessage: string;
  submissionId: string | null;
  userEmail: string | undefined; // Email may not be set
  agreedToTerms: boolean;
  validationErrors: Record<string, string>;
}

const ExtensionPopup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    currentTab: null,
    storyData: null,
    fandoms: [],
    selectedFandom: '',
    selectedTags: [],
    customTags: '',
    submissionStatus: 'idle',
    errorMessage: '',
    submissionId: null,
    userEmail: '',
    agreedToTerms: false,
    validationErrors: {},
  });

  const extensionAPI = new ExtensionAPI();

  // Initialize popup with current tab data
  useEffect(() => {
    const initializePopup = async () => {
      try {
        // Get current tab
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        setState(prev => ({ ...prev, currentTab: tab }));

        // Check if current site is supported
        if (tab?.url && tab?.id && extensionAPI.isSupportedSite(tab.url)) {
          setState(prev => ({ ...prev, submissionStatus: 'parsing' }));

          // Parse story data from current page
          const storyData = await extensionAPI.parseCurrentPage(tab.id);
          setState(prev => ({
            ...prev,
            storyData,
            submissionStatus: 'idle',
            // Fandom must be selected manually by user
          }));
        }

        // Load available fandoms
        const fandoms = await extensionAPI.getFandoms();
        setState(prev => ({ ...prev, fandoms }));

        // Load user preferences if available
        const userPrefs = await extensionAPI.getUserPreferences();
        if (userPrefs?.email) {
          setState(prev => ({ ...prev, userEmail: userPrefs.email }));
        }
      } catch (error) {
        console.error('Popup initialization error:', error);
        setState(prev => ({
          ...prev,
          submissionStatus: 'error',
          errorMessage: 'Failed to initialize popup',
        }));
      }
    };

    initializePopup();
  }, []);

  // Handle fandom selection
  const handleFandomChange = useCallback(
    (fandomSlug: string) => {
      setState(prev => ({ ...prev, selectedFandom: fandomSlug }));

      // Auto-update available tags for selected fandom
      if (fandomSlug) {
        extensionAPI.getFandomTags(fandomSlug).then(tags => {
          // Update available tags (implementation would depend on your tag system)
          console.log('Available tags for fandom:', tags);
        });
      }
    },
    [extensionAPI]
  );

  // Handle tag selection
  const handleTagToggle = useCallback((tagId: string) => {
    setState(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId],
    }));
  }, []);

  // Validate form data
  const validateSubmission = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!state.userEmail?.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(state.userEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!state.selectedFandom) {
      errors.fandom = 'Please select a fandom';
    }

    if (!state.storyData?.title?.trim()) {
      errors.title = 'Story title is required';
    }

    if (!state.storyData?.url?.trim()) {
      errors.url = 'Story URL is required';
    }

    if (!state.storyData?.author?.trim()) {
      errors.author = 'Story author is required';
    }

    if (state.selectedTags.length === 0 && !state.customTags.trim()) {
      errors.tags = 'Please select at least one tag or provide custom tags';
    }

    if (!state.agreedToTerms) {
      errors.terms = 'You must agree to the submission terms';
    }

    return errors;
  }, [state]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        submissionStatus: 'submitting',
        validationErrors: {},
      }));

      // Validate form
      const errors = validateSubmission();
      if (Object.keys(errors).length > 0) {
        setState(prev => ({
          ...prev,
          submissionStatus: 'error',
          validationErrors: errors,
        }));
        return;
      }

      // Prepare submission data (all required fields must exist at this point due to validation)
      const storyData = state.storyData!;
      const submissionData: CreateSubmissionRequest = {
        storyTitle: storyData.title || '',
        storyUrl: storyData.url || '',
        authorName: storyData.author || '',
        fandomId: state.selectedFandom, // This should be fandom ID or slug
        summary: storyData.summary,
        wordCount: storyData.wordCount,
        chapterCount: storyData.chapterCount,
        completionStatus: storyData.completionStatus,
        publishDate: storyData.publishDate?.toISOString(),
        lastUpdateDate: storyData.lastUpdateDate?.toISOString(),
        tags: [
          ...state.selectedTags,
          ...state.customTags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
        ],
        submissionNotes: `Submitted via browser extension v${
          chrome.runtime.getManifest().version
        }`,
      };

      // Submit to API
      const result = await extensionAPI.submitStory(submissionData);

      setState(prev => ({
        ...prev,
        submissionStatus: 'success',
        submissionId: result.submissionId,
      }));

      // Save user preferences
      await extensionAPI.saveUserPreferences({
        email: state.userEmail,
        defaultFandom: state.selectedFandom,
      });

      // Close popup after successful submission
      setTimeout(() => {
        window.close();
      }, 3000);
    } catch (error) {
      console.error('Submission error:', error);
      setState(prev => ({
        ...prev,
        submissionStatus: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Submission failed',
      }));
    }
  }, [state, extensionAPI, validateSubmission]);

  // Render different states
  if (state.submissionStatus === 'parsing') {
    return (
      <div className="extension-popup parsing">
        <div className="loading-spinner"></div>
        <p>Analyzing current page...</p>
      </div>
    );
  }

  if (state.submissionStatus === 'success') {
    return (
      <div className="extension-popup success">
        <div className="success-icon">✓</div>
        <h2>Submission Successful!</h2>
        <p>Your story has been submitted for review.</p>
        <p>
          Submission ID: <strong>{state.submissionId}</strong>
        </p>
        <p>You'll receive an email notification when it's reviewed.</p>
        <button onClick={() => window.close()} className="btn-primary">
          Close
        </button>
      </div>
    );
  }

  // Check if current site is supported
  const isSupportedSite =
    state.currentTab?.url && extensionAPI.isSupportedSite(state.currentTab.url);

  if (!isSupportedSite) {
    return (
      <div className="extension-popup unsupported">
        <h2>Unsupported Site</h2>
        <p>This extension only works on supported fanfiction sites:</p>
        <ul>
          <li>Archive of Our Own (archiveofourown.org)</li>
          <li>FanFiction.Net (fanfiction.net)</li>
        </ul>
        <p>Navigate to a story page on one of these sites to submit it.</p>
        <button onClick={() => window.close()} className="btn-secondary">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="extension-popup">
      <header className="popup-header">
        <h1>Submit Story</h1>
        <button onClick={() => window.close()} className="close-btn">
          ×
        </button>
      </header>

      <form
        className="submission-form"
        onSubmit={e => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* Story Information Section */}
        <section className="story-info">
          <h3>Story Information</h3>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={state.storyData?.title || ''}
              onChange={e =>
                setState(prev => ({
                  ...prev,
                  storyData: { ...prev.storyData, title: e.target.value },
                }))
              }
              className={state.validationErrors.title ? 'error' : ''}
              placeholder="Story title"
            />
            {state.validationErrors.title && (
              <div className="error-message">
                {state.validationErrors.title}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Author</label>
            <input
              type="text"
              value={state.storyData?.author || ''}
              onChange={e =>
                setState(prev => ({
                  ...prev,
                  storyData: { ...prev.storyData, author: e.target.value },
                }))
              }
              className={state.validationErrors.author ? 'error' : ''}
              placeholder="Author name"
            />
            {state.validationErrors.author && (
              <div className="error-message">
                {state.validationErrors.author}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>URL</label>
            <input
              type="url"
              value={state.storyData?.url || state.currentTab?.url || ''}
              onChange={e =>
                setState(prev => ({
                  ...prev,
                  storyData: { ...prev.storyData, url: e.target.value },
                }))
              }
              className={state.validationErrors.url ? 'error' : ''}
              placeholder="Story URL"
            />
            {state.validationErrors.url && (
              <div className="error-message">{state.validationErrors.url}</div>
            )}
          </div>

          <div className="form-group">
            <label>Summary (Optional)</label>
            <textarea
              value={state.storyData?.summary || ''}
              onChange={e =>
                setState(prev => ({
                  ...prev,
                  storyData: { ...prev.storyData, summary: e.target.value },
                }))
              }
              placeholder="Brief summary of the story"
              rows={3}
            />
          </div>
        </section>

        {/* Fandom Selection */}
        <section className="fandom-selection">
          <h3>Fandom</h3>
          <div className="form-group">
            <select
              value={state.selectedFandom}
              onChange={e => handleFandomChange(e.target.value)}
              className={state.validationErrors.fandom ? 'error' : ''}
            >
              <option value="">Select a fandom...</option>
              {state.fandoms.map(fandom => (
                <option key={fandom.slug} value={fandom.slug}>
                  {fandom.name}
                </option>
              ))}
            </select>
            {state.validationErrors.fandom && (
              <div className="error-message">
                {state.validationErrors.fandom}
              </div>
            )}
          </div>
        </section>

        {/* Tag Selection */}
        <section className="tag-selection">
          <h3>Tags</h3>
          <div className="form-group">
            <label>Custom Tags (comma-separated)</label>
            <input
              type="text"
              value={state.customTags}
              onChange={e =>
                setState(prev => ({ ...prev, customTags: e.target.value }))
              }
              placeholder="angst, time-travel, harry/hermione"
            />
            {state.validationErrors.tags && (
              <div className="error-message">{state.validationErrors.tags}</div>
            )}
          </div>
        </section>

        {/* Submitter Information */}
        <section className="submitter-info">
          <h3>Your Information</h3>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={state.userEmail}
              onChange={e =>
                setState(prev => ({ ...prev, userEmail: e.target.value }))
              }
              className={state.validationErrors.email ? 'error' : ''}
              placeholder="your.email@example.com"
            />
            <small>Used for submission notifications only</small>
            {state.validationErrors.email && (
              <div className="error-message">
                {state.validationErrors.email}
              </div>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={state.agreedToTerms}
                onChange={e =>
                  setState(prev => ({
                    ...prev,
                    agreedToTerms: e.target.checked,
                  }))
                }
              />
              I agree to the submission terms and confirm this story information
              is accurate
            </label>
            {state.validationErrors.terms && (
              <div className="error-message">
                {state.validationErrors.terms}
              </div>
            )}
          </div>
        </section>

        {/* Error Message */}
        {state.submissionStatus === 'error' && state.errorMessage && (
          <div className="error-banner">{state.errorMessage}</div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={state.submissionStatus === 'submitting'}
          >
            {state.submissionStatus === 'submitting'
              ? 'Submitting...'
              : 'Submit Story'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.close()}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExtensionPopup;
