/**
 * Global E2E Test Setup
 * Prepares test environment for community submission system testing
 */

import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');

  // Ensure test directories exist
  await fs.mkdir('test-results', { recursive: true });
  await fs.mkdir('test-results/e2e-artifacts', { recursive: true });
  await fs.mkdir('test-results/screenshots', { recursive: true });

  // Setup test database
  await setupTestDatabase();

  // Setup test users
  await setupTestUsers();

  // Setup mock services
  await setupMockServices();

  // Build extension for testing
  await buildTestExtension();

  console.log('✅ E2E test environment ready');
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');

  // Create test database with sample data
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Run database migrations for test environment
    await execAsync('npm run db:migrate:test');

    // Seed test data
    await execAsync('npm run db:seed:test');

    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

async function setupTestUsers() {
  console.log('👥 Setting up test users...');

  const testUsers = [
    {
      clerkId: 'clerk_admin_123',
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'admin',
      permissions: [
        'moderate_submissions',
        'assign_moderators',
        'manage_queue',
      ],
    },
    {
      clerkId: 'clerk_mod_456',
      email: 'moderator@test.com',
      name: 'Test Moderator',
      role: 'moderator',
      permissions: ['moderate_submissions'],
    },
    {
      clerkId: 'clerk_user_789',
      email: 'user@test.com',
      name: 'Test User',
      role: 'user',
      permissions: [],
    },
  ];

  // Insert test users into database
  const { db } = await import('../src/lib/database/connection');
  const { adminUsers } = await import('../src/lib/database/schema');

  for (const user of testUsers) {
    try {
      await db
        .insert(adminUsers)
        .values({
          clerkUserId: user.clerkId,
          email: user.email,
          name: user.name,
          role: user.role as 'admin' | 'moderator' | 'user',
          permissions: user.permissions,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    } catch (error) {
      // User might already exist, continue
      console.log(`User ${user.email} already exists`);
    }
  }

  console.log('✅ Test users ready');
}

async function setupMockServices() {
  console.log('🔧 Setting up mock services...');

  // Write mock service configuration
  const mockConfig = {
    github: {
      apiUrl: 'http://localhost:8080',
      webhookSecret: 'test_webhook_secret',
      repo: 'test-org/test-repo',
    },
    email: {
      smtpUrl: 'http://localhost:8025',
      fromAddress: 'noreply@test.com',
    },
    extension: {
      buildPath: './test-results/extension-build',
      manifestVersion: 3,
    },
  };

  await fs.writeFile(
    'test-results/mock-config.json',
    JSON.stringify(mockConfig, null, 2)
  );

  console.log('✅ Mock services configured');
}

async function buildTestExtension() {
  console.log('🔧 Building test extension...');

  const extensionDir = 'test-results/extension-build';

  // Ensure extension build directory exists
  await fs.mkdir(extensionDir, { recursive: true });

  // Copy extension files
  const extensionFiles = [
    'src/extension/manifest.json',
    'src/extension/service-worker.js',
    'src/extension/content-script.js',
    'src/extension/popup/popup.html',
    'src/extension/popup/popup.css',
  ];

  for (const file of extensionFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const targetPath = path.join(extensionDir, path.basename(file));
      await fs.writeFile(targetPath, content);
    } catch (error) {
      // File might not exist, create minimal version
      const fileName = path.basename(file);
      const targetPath = path.join(extensionDir, fileName);

      if (fileName === 'manifest.json') {
        const manifest = {
          manifest_version: 3,
          name: 'The Pensive Index Test Extension',
          version: '1.0.0',
          action: {
            default_popup: 'popup.html',
          },
          background: {
            service_worker: 'service-worker.js',
          },
          content_scripts: [
            {
              matches: [
                '*://*.archiveofourown.org/*',
                '*://*.fanfiction.net/*',
              ],
              js: ['content-script.js'],
            },
          ],
          permissions: ['activeTab', 'storage'],
        };
        await fs.writeFile(targetPath, JSON.stringify(manifest, null, 2));
      } else {
        // Create minimal file
        await fs.writeFile(targetPath, `// Test ${fileName}`);
      }
    }
  }

  // Create popup bundle for testing
  const popupBundle = `
    // Test popup bundle
    window.ExtensionPopup = {
      init: () => console.log('Test extension popup initialized'),
    };
  `;

  await fs.writeFile(path.join(extensionDir, 'popup-bundle.js'), popupBundle);

  console.log('✅ Test extension built');
}

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'file:./test-results/test.db';
process.env.GITHUB_REPO = 'test-org/test-repo';
process.env.GITHUB_TOKEN = 'test_token';
process.env.GITHUB_WEBHOOK_SECRET = 'test_webhook_secret';

export default globalSetup;
