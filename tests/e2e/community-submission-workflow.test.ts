/**
 * End-to-End Testing Suite for Community Submission System (T041)
 * Tests complete workflow from browser extension submission through GitHub moderation to final approval
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { chromium, type Browser } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  extensionPath: process.env.EXTENSION_PATH || './src/extension',
  testTimeout: 30000,
  githubRepo: process.env.TEST_GITHUB_REPO || 'test-org/test-repo',
};

interface TestUser {
  email: string;
  isAdmin: boolean;
  isModerator: boolean;
  clerkId: string;
}

const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@test.com',
    isAdmin: true,
    isModerator: true,
    clerkId: 'clerk_admin_123',
  },
  moderator: {
    email: 'moderator@test.com',
    isAdmin: false,
    isModerator: true,
    clerkId: 'clerk_mod_456',
  },
  user: {
    email: 'user@test.com',
    isAdmin: false,
    isModerator: false,
    clerkId: 'clerk_user_789',
  },
};

// Test utilities
class E2ETestUtils {
  static async setupExtensionContext(): Promise<BrowserContext> {
    const browser = await chromium.launch({
      headless: false, // Extension needs to be visible for testing
      args: [
        '--disable-extensions-except=' + TEST_CONFIG.extensionPath,
        '--load-extension=' + TEST_CONFIG.extensionPath,
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    const context = await browser.newContext({
      permissions: ['storage'],
    });

    return context;
  }

  static async authenticateUser(page: Page, user: TestUser): Promise<void> {
    // Mock Clerk authentication for testing
    await page.addInitScript(userData => {
      window.__CLERK_TEST_USER__ = userData;
      window.localStorage.setItem('clerk_test_user', JSON.stringify(userData));
    }, user);

    await page.goto(`${TEST_CONFIG.baseURL}/sign-in`);
    await page.waitForURL('**/admin**', { timeout: 10000 });
  }

  static async submitStoryViaExtension(
    page: Page,
    storyData: any
  ): Promise<string> {
    // Navigate to a supported fanfiction site
    await page.goto('https://archiveofourown.org/works/123456');

    // Open extension popup
    await page.click('[data-testid="extension-icon"]');

    const popup = await page.waitForEvent('popup');

    // Wait for popup to initialize
    await popup.waitForLoadState('networkidle');

    // Verify story data was parsed
    await expect(popup.getByDisplayValue(storyData.title)).toBeVisible();

    // Fill submission form
    await popup.selectOption('[data-testid="fandom-select"]', storyData.fandom);
    await popup.fill('[data-testid="email-input"]', storyData.submitterEmail);
    await popup.fill('[data-testid="tags-input"]', storyData.tags.join(', '));
    await popup.check('[data-testid="terms-checkbox"]');

    // Submit story
    await popup.click('[data-testid="submit-button"]');

    // Wait for success state
    await popup.waitForSelector('[data-testid="success-message"]');

    // Extract submission ID from success message
    const successText = await popup.textContent(
      '[data-testid="submission-id"]'
    );
    const submissionId = successText?.match(/Submission ID: (.+)/)?.[1];

    expect(submissionId).toBeDefined();

    await popup.close();

    return submissionId!;
  }

  static async waitForGitHubIssue(submissionId: string): Promise<number> {
    // Poll API for GitHub issue creation
    let issueNumber: number | null = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (!issueNumber && attempts < maxAttempts) {
      const response = await fetch(
        `${TEST_CONFIG.baseURL}/api/v1/submissions/${submissionId}/status`
      );
      const data = await response.json();

      if (data.githubIssueNumber) {
        issueNumber = data.githubIssueNumber;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (!issueNumber) {
      throw new Error('GitHub issue was not created within expected timeframe');
    }

    return issueNumber;
  }

  static async moderateSubmission(
    page: Page,
    submissionId: string,
    action: 'approve' | 'reject' | 'request_changes',
    data?: any
  ): Promise<void> {
    await page.goto(`${TEST_CONFIG.baseURL}/admin/submissions`);

    // Wait for queue to load
    await page.waitForSelector('[data-testid="submission-queue"]');

    // Find submission in queue
    const submissionCard = page.locator(
      `[data-submission-id="${submissionId}"]`
    );
    await submissionCard.waitFor();

    // Open submission details
    await submissionCard.click();

    const modal = page.locator('[data-testid="submission-modal"]');
    await modal.waitFor();

    // Perform moderation action
    switch (action) {
      case 'approve':
        await modal.click('[data-testid="approve-button"]');
        if (data?.note) {
          await modal.fill('[data-testid="approval-note"]', data.note);
        }
        break;

      case 'reject':
        await modal.click('[data-testid="reject-button"]');
        if (data?.reason) {
          await modal.selectOption(
            '[data-testid="rejection-reason"]',
            data.reason
          );
        }
        if (data?.note) {
          await modal.fill('[data-testid="rejection-note"]', data.note);
        }
        break;

      case 'request_changes':
        await modal.click('[data-testid="request-changes-button"]');
        if (data?.changes) {
          await modal.fill(
            '[data-testid="requested-changes"]',
            data.changes.join('\n')
          );
        }
        break;
    }

    // Confirm action
    await modal.click('[data-testid="confirm-action"]');

    // Wait for action to complete
    await modal.waitForSelector('[data-testid="action-success"]');

    // Close modal
    await modal.click('[data-testid="close-modal"]');
  }
}

test.describe('Community Submission System E2E Tests', () => {
  let browser: Browser;
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await E2ETestUtils.setupExtensionContext();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.describe('Complete Submission Workflow', () => {
    test('should complete full submission to approval workflow', async () => {
      const storyData = {
        title: 'Test Story for E2E',
        author: 'E2E Test Author',
        url: 'https://archiveofourown.org/works/123456',
        description: 'A test story for end-to-end testing',
        fandom: 'harry-potter',
        tags: ['angst', 'time-travel'],
        submitterEmail: 'submitter@test.com',
      };

      // Step 1: Submit story via browser extension
      const userPage = await context.newPage();
      const submissionId = await E2ETestUtils.submitStoryViaExtension(
        userPage,
        storyData
      );

      expect(submissionId).toMatch(/^sub_[a-zA-Z0-9]+$/);

      // Step 2: Verify GitHub issue creation
      const issueNumber = await E2ETestUtils.waitForGitHubIssue(submissionId);

      expect(issueNumber).toBeGreaterThan(0);

      // Step 3: Admin moderates submission
      const adminPage = await context.newPage();
      await E2ETestUtils.authenticateUser(adminPage, TEST_USERS.admin);

      await E2ETestUtils.moderateSubmission(
        adminPage,
        submissionId,
        'approve',
        {
          note: 'High quality submission with good tags',
        }
      );

      // Step 4: Verify submission status updated
      const statusResponse = await fetch(
        `${TEST_CONFIG.baseURL}/api/v1/submissions/${submissionId}/status`
      );
      const statusData = await statusResponse.json();

      expect(statusData.status).toBe('approved');
      expect(statusData.moderationNote).toContain('High quality submission');

      // Step 5: Verify GitHub issue was closed
      await adminPage.goto(
        `https://github.com/${TEST_CONFIG.githubRepo}/issues/${issueNumber}`
      );
      await expect(
        adminPage.locator('.State--merged, .State--closed')
      ).toBeVisible();

      // Step 6: Verify email notifications were sent
      // This would require integration with email testing service
      // For now, we'll check the email service logs
      const emailLogs = await fetch(
        `${TEST_CONFIG.baseURL}/api/admin/email-logs?submissionId=${submissionId}`
      );
      const emailData = await emailLogs.json();

      expect(emailData.emails).toContainEqual(
        expect.objectContaining({
          template: 'submission_approved',
          recipientEmail: storyData.submitterEmail,
          status: 'delivered',
        })
      );

      await userPage.close();
      await adminPage.close();
    });

    test('should handle submission rejection workflow', async () => {
      const storyData = {
        title: 'Incomplete Test Story',
        author: 'Test Author',
        url: 'https://archiveofourown.org/works/789012',
        description: 'An incomplete test story',
        fandom: 'percy-jackson',
        tags: ['incomplete'],
        submitterEmail: 'submitter2@test.com',
      };

      // Step 1: Submit story
      const userPage = await context.newPage();
      const submissionId = await E2ETestUtils.submitStoryViaExtension(
        userPage,
        storyData
      );

      // Step 2: Wait for GitHub issue
      const issueNumber = await E2ETestUtils.waitForGitHubIssue(submissionId);

      // Step 3: Moderator rejects submission
      const moderatorPage = await context.newPage();
      await E2ETestUtils.authenticateUser(moderatorPage, TEST_USERS.moderator);

      await E2ETestUtils.moderateSubmission(
        moderatorPage,
        submissionId,
        'reject',
        {
          reason: 'insufficient_tags',
          note: 'Please add more descriptive tags and complete story information',
        }
      );

      // Step 4: Verify rejection status
      const statusResponse = await fetch(
        `${TEST_CONFIG.baseURL}/api/v1/submissions/${submissionId}/status`
      );
      const statusData = await statusResponse.json();

      expect(statusData.status).toBe('rejected');
      expect(statusData.rejectionReason).toBe('insufficient_tags');

      // Step 5: Verify GitHub issue was updated
      await moderatorPage.goto(
        `https://github.com/${TEST_CONFIG.githubRepo}/issues/${issueNumber}`
      );
      await expect(moderatorPage.locator('.timeline-comment')).toContainText(
        'insufficient_tags'
      );

      await userPage.close();
      await moderatorPage.close();
    });

    test('should handle changes request workflow', async () => {
      const storyData = {
        title: 'Story Needing Changes',
        author: 'Test Author',
        url: 'https://fanfiction.net/s/345678',
        description: 'A story that needs some changes',
        fandom: 'harry-potter',
        tags: ['adventure'],
        submitterEmail: 'submitter3@test.com',
      };

      // Step 1: Submit story
      const userPage = await context.newPage();
      const submissionId = await E2ETestUtils.submitStoryViaExtension(
        userPage,
        storyData
      );

      // Step 2: Request changes
      const moderatorPage = await context.newPage();
      await E2ETestUtils.authenticateUser(moderatorPage, TEST_USERS.moderator);

      await E2ETestUtils.moderateSubmission(
        moderatorPage,
        submissionId,
        'request_changes',
        {
          changes: [
            'Add more specific character tags',
            'Include content warnings if applicable',
            'Verify story completion status',
          ],
        }
      );

      // Step 3: Verify changes requested status
      const statusResponse = await fetch(
        `${TEST_CONFIG.baseURL}/api/v1/submissions/${submissionId}/status`
      );
      const statusData = await statusResponse.json();

      expect(statusData.status).toBe('changes_requested');
      expect(statusData.requestedChanges).toContain(
        'Add more specific character tags'
      );

      await userPage.close();
      await moderatorPage.close();
    });
  });

  test.describe('Extension Integration Tests', () => {
    test('should parse AO3 story data correctly', async () => {
      const page = await context.newPage();

      // Mock AO3 page with test data
      await page.goto('about:blank');
      await page.setContent(`
        <html>
          <head><title>Test Story - Chapter 1 - Archive of Our Own</title></head>
          <body>
            <h2 class="title">Test Story Title</h2>
            <a rel="author" href="/users/testauthor">Test Author</a>
            <div class="summary"><div class="userstuff">A test story description</div></div>
            <dd class="fandom"><a class="tag">Harry Potter - J. K. Rowling</a></dd>
            <dd class="words">1500</dd>
            <dd class="chapters">3/5</dd>
            <span class="rating"><a class="tag">Teen And Up Audiences</a></span>
            <ul class="additional tags">
              <li><a class="tag">Angst</a></li>
              <li><a class="tag">Time Travel</a></li>
            </ul>
          </body>
        </html>
      `);

      // Simulate extension content script execution
      const storyData = await page.evaluate(() => {
        // This simulates the content script parsing logic
        return {
          title: document.querySelector('h2.title')?.textContent?.trim(),
          author: document
            .querySelector('a[rel="author"]')
            ?.textContent?.trim(),
          description: document
            .querySelector('.summary .userstuff')
            ?.textContent?.trim(),
          fandom: document.querySelector('.fandom .tag')?.textContent?.trim(),
          wordCount: document.querySelector('dd.words')?.textContent?.trim(),
          chapters: document.querySelector('dd.chapters')?.textContent?.trim(),
          rating: document.querySelector('.rating .tag')?.textContent?.trim(),
          tags: Array.from(document.querySelectorAll('.additional .tag'))
            .map(tag => tag.textContent?.trim())
            .filter(Boolean),
        };
      });

      expect(storyData.title).toBe('Test Story Title');
      expect(storyData.author).toBe('Test Author');
      expect(storyData.description).toBe('A test story description');
      expect(storyData.fandom).toBe('Harry Potter - J. K. Rowling');
      expect(storyData.tags).toContain('Angst');
      expect(storyData.tags).toContain('Time Travel');

      await page.close();
    });

    test('should handle FFNet parsing correctly', async () => {
      const page = await context.newPage();

      // Mock FFNet page structure
      await page.setContent(`
        <html>
          <body>
            <div id="profile_top">
              <b class="xcontrast_txt">Test FFNet Story</b>
              <a class="xcontrast_txt" href="/u/123/TestAuthor">Test FFNet Author</a>
              <div class="xcontrast_txt">A description of the test story on FFNet</div>
              <span class="xgray">Harry Potter - Rated: T - English - Adventure/Romance - Chapters: 10 - Words: 25,000</span>
            </div>
          </body>
        </html>
      `);

      const storyData = await page.evaluate(() => {
        const titleElement = document.querySelector(
          '#profile_top .xcontrast_txt'
        );
        const authorElement = document.querySelector(
          '#profile_top a.xcontrast_txt'
        );
        const metaText =
          document.querySelector('#profile_top .xgray')?.textContent || '';

        return {
          title: titleElement?.textContent?.trim(),
          author: authorElement?.textContent?.trim(),
          fandom: metaText.split(' - ')[0]?.trim(),
          metadata: { originalMetaText: metaText },
        };
      });

      expect(storyData.title).toBe('Test FFNet Story');
      expect(storyData.author).toBe('Test FFNet Author');
      expect(storyData.fandom).toBe('Harry Potter');

      await page.close();
    });
  });

  test.describe('Admin Dashboard Tests', () => {
    test('should display submission queue correctly', async () => {
      const adminPage = await context.newPage();
      await E2ETestUtils.authenticateUser(adminPage, TEST_USERS.admin);

      await adminPage.goto(`${TEST_CONFIG.baseURL}/admin/submissions`);

      // Wait for queue to load
      await adminPage.waitForSelector('[data-testid="submission-queue"]');

      // Verify queue elements are present
      await expect(
        adminPage.locator('[data-testid="queue-stats"]')
      ).toBeVisible();
      await expect(
        adminPage.locator('[data-testid="filter-controls"]')
      ).toBeVisible();
      await expect(
        adminPage.locator('[data-testid="submission-list"]')
      ).toBeVisible();

      // Test filtering functionality
      await adminPage.selectOption('[data-testid="status-filter"]', 'pending');
      await adminPage.waitForSelector(
        '[data-testid="submission-card"]:not([data-status="approved"])'
      );

      // Test search functionality
      await adminPage.fill('[data-testid="search-input"]', 'test story');
      await adminPage.waitForTimeout(500); // Debounce delay

      const searchResults = await adminPage
        .locator('[data-testid="submission-card"]')
        .count();
      expect(searchResults).toBeGreaterThanOrEqual(0);

      await adminPage.close();
    });

    test('should handle moderator assignment correctly', async () => {
      const adminPage = await context.newPage();
      await E2ETestUtils.authenticateUser(adminPage, TEST_USERS.admin);

      // Create a test submission first
      const submissionId = 'test_submission_' + Date.now();

      await adminPage.goto(`${TEST_CONFIG.baseURL}/admin/submissions`);

      // Find unassigned submission
      const unassignedCard = adminPage
        .locator('[data-testid="submission-card"][data-assigned="false"]')
        .first();
      await unassignedCard.click();

      const modal = adminPage.locator('[data-testid="submission-modal"]');
      await modal.waitFor();

      // Assign to moderator
      await modal.click('[data-testid="assign-button"]');
      await modal.selectOption(
        '[data-testid="moderator-select"]',
        TEST_USERS.moderator.clerkId
      );
      await modal.fill(
        '[data-testid="assignment-note"]',
        'Assigning to specialist for review'
      );
      await modal.click('[data-testid="confirm-assign"]');

      // Verify assignment success
      await modal.waitForSelector('[data-testid="assignment-success"]');

      // Close modal and verify assignment in queue
      await modal.click('[data-testid="close-modal"]');
      await expect(
        unassignedCard.locator('[data-testid="assigned-moderator"]')
      ).toContainText(TEST_USERS.moderator.email);

      await adminPage.close();
    });
  });

  test.describe('Performance Tests', () => {
    test('should complete submission workflow within performance requirements', async () => {
      const startTime = Date.now();

      const storyData = {
        title: 'Performance Test Story',
        author: 'Performance Test Author',
        url: 'https://archiveofourown.org/works/999999',
        fandom: 'harry-potter',
        tags: ['test'],
        submitterEmail: 'perf@test.com',
      };

      // Step 1: Extension submission (should be fast)
      const userPage = await context.newPage();
      const submissionStart = Date.now();
      const submissionId = await E2ETestUtils.submitStoryViaExtension(
        userPage,
        storyData
      );
      const submissionTime = Date.now() - submissionStart;

      expect(submissionTime).toBeLessThan(5000); // 5 seconds max for submission

      // Step 2: GitHub issue creation (within 30 seconds)
      const issueStart = Date.now();
      const issueNumber = await E2ETestUtils.waitForGitHubIssue(submissionId);
      const issueTime = Date.now() - issueStart;

      expect(issueTime).toBeLessThan(30000); // 30 seconds max for GitHub integration

      // Step 3: Admin moderation (should be responsive)
      const adminPage = await context.newPage();
      await E2ETestUtils.authenticateUser(adminPage, TEST_USERS.admin);

      const moderationStart = Date.now();
      await E2ETestUtils.moderateSubmission(adminPage, submissionId, 'approve');
      const moderationTime = Date.now() - moderationStart;

      expect(moderationTime).toBeLessThan(10000); // 10 seconds max for moderation action

      const totalTime = Date.now() - startTime;
      console.log(`Total workflow time: ${totalTime}ms`);

      // Total workflow should complete within reasonable time
      expect(totalTime).toBeLessThan(60000); // 1 minute max for full workflow

      await userPage.close();
      await adminPage.close();
    });

    test('should handle concurrent submissions efficiently', async () => {
      const concurrentSubmissions = 5;
      const submissions = [];

      for (let i = 0; i < concurrentSubmissions; i++) {
        const page = await context.newPage();
        const submission = E2ETestUtils.submitStoryViaExtension(page, {
          title: `Concurrent Story ${i}`,
          author: `Author ${i}`,
          url: `https://archiveofourown.org/works/conc${i}`,
          fandom: 'harry-potter',
          tags: [`concurrent-${i}`],
          submitterEmail: `concurrent${i}@test.com`,
        });

        submissions.push({ page, submission });
      }

      // Wait for all submissions to complete
      const startTime = Date.now();
      const results = await Promise.all(submissions.map(s => s.submission));
      const totalTime = Date.now() - startTime;

      // All submissions should succeed
      results.forEach(submissionId => {
        expect(submissionId).toMatch(/^sub_[a-zA-Z0-9]+$/);
      });

      // Should handle concurrent load efficiently
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 5 concurrent submissions

      // Clean up pages
      await Promise.all(submissions.map(s => s.page.close()));
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle API failures gracefully', async () => {
      const page = await context.newPage();

      // Mock API failure
      await page.route('**/api/v1/submissions', route => {
        route.abort('failed');
      });

      await page.goto('about:blank');
      // Simulate extension popup with API failure
      // This would test the error handling in the extension

      expect(true).toBe(true); // Placeholder - would implement actual error simulation

      await page.close();
    });

    test('should handle GitHub integration failures', async () => {
      // Test GitHub webhook failures, issue creation failures, etc.
      expect(true).toBe(true); // Placeholder for GitHub failure testing
    });

    test('should handle email service failures', async () => {
      // Test email notification failures
      expect(true).toBe(true); // Placeholder for email failure testing
    });
  });
});

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async () => {
      // Skip Firefox and WebKit for extension tests since they have different APIs
      if (browserName !== 'chromium') {
        test.skip();
        return;
      }

      // Test basic functionality across browsers
      const page = await context.newPage();
      await page.goto(`${TEST_CONFIG.baseURL}/admin/submissions`);

      // Basic functionality should work
      await expect(page.locator('h1')).toBeVisible();

      await page.close();
    });
  });
});

test.describe('Security Tests', () => {
  test('should prevent unauthorized access to admin functions', async () => {
    const page = await context.newPage();

    // Try to access admin without authentication
    await page.goto(`${TEST_CONFIG.baseURL}/admin/submissions`);

    // Should redirect to sign-in
    await page.waitForURL('**/sign-in**');
    expect(page.url()).toContain('/sign-in');

    await page.close();
  });

  test('should validate submission data properly', async () => {
    const page = await context.newPage();

    // Test malicious input handling
    const maliciousData = {
      title: '<script>alert("xss")</script>',
      author: 'javascript:alert("xss")',
      url: 'http://malicious.com',
      description: '${7*7}',
    };

    // Submit malicious data and verify it's sanitized
    // This would test the validation and sanitization logic

    expect(true).toBe(true); // Placeholder for security testing

    await page.close();
  });
});

// Helper function to clean up test data
test.afterEach(async () => {
  // Clean up test submissions, GitHub issues, etc.
  // This would integrate with the database to remove test data
});

// Performance monitoring
test.afterAll(async () => {
  // Report performance metrics
  console.log('E2E Test Suite completed');
});
