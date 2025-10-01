/**
 * Playwright Configuration for E2E Testing
 * Configures test environment for community submission system testing
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',

  /* Maximum time one test can run for. */
  timeout: 60 * 1000, // 60 seconds

  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 10000, // 10 seconds
  },

  /* Run tests in files in parallel */
  fullyParallel: false, // Disabled for extension tests that need sequential execution

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global test timeout */
    actionTimeout: 15000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Extension-specific configuration
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
      testMatch: '**/community-submission-workflow.test.ts',
    },

    {
      name: 'chrome-admin-dashboard',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/admin-dashboard-e2e.test.ts',
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/admin-dashboard-e2e.test.ts',
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/admin-dashboard-e2e.test.ts',
    },

    /* Mobile testing */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/mobile-responsive-e2e.test.ts',
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/mobile-responsive-e2e.test.ts',
    },
  ],

  /* Global setup and teardown */
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  /* Test environment setup */
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000, // 2 minutes to start dev server
    },
    {
      // Mock GitHub webhook server for testing
      command: 'node tests/e2e/mock-github-server.js',
      port: 8080,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Mock email service for testing
      command: 'node tests/e2e/mock-email-server.js',
      port: 8025,
      reuseExistingServer: !process.env.CI,
    },
  ],

  /* Output directory */
  outputDir: 'test-results/e2e-artifacts',
});
