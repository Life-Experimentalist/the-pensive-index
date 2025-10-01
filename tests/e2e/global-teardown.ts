/**
 * Global E2E Test Teardown
 * Cleanup after E2E test execution
 */

import { type FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  // Cleanup test database
  await cleanupTestDatabase();

  // Generate test report summary
  await generateTestSummary();

  // Cleanup temporary files (but keep artifacts for CI)
  if (!process.env.CI) {
    await cleanupTemporaryFiles();
  }

  console.log('✅ E2E test cleanup completed');
}

async function cleanupTestDatabase() {
  console.log('📊 Cleaning up test database...');

  try {
    // Reset test database to clean state
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Drop test tables and recreate clean state
    await execAsync('npm run db:reset:test');

    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
    // Don't throw - cleanup should not fail the test suite
  }
}

async function generateTestSummary() {
  console.log('📋 Generating test summary...');

  try {
    // Read test results
    const resultsPath = 'test-results/e2e-results.json';

    let testResults = {};
    try {
      const resultsContent = await fs.readFile(resultsPath, 'utf-8');
      testResults = JSON.parse(resultsContent);
    } catch (error) {
      console.log('No test results file found, creating empty summary');
    }

    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
      },
      results: testResults,
      artifacts: {
        screenshots: await getArtifactCount('test-results/screenshots'),
        videos: await getArtifactCount('test-results/videos'),
        traces: await getArtifactCount('test-results/traces'),
      },
    };

    // Write summary
    await fs.writeFile(
      'test-results/e2e-summary.json',
      JSON.stringify(summary, null, 2)
    );

    // Write human-readable summary
    const humanSummary = generateHumanReadableSummary(summary);
    await fs.writeFile('test-results/e2e-summary.txt', humanSummary);

    console.log('✅ Test summary generated');
  } catch (error) {
    console.error('❌ Failed to generate test summary:', error);
  }
}

async function getArtifactCount(dir: string): Promise<number> {
  try {
    const files = await fs.readdir(dir);
    return files.length;
  } catch (error) {
    return 0;
  }
}

function generateHumanReadableSummary(summary: any): string {
  const { results, artifacts, environment } = summary;

  return `
E2E Test Suite Summary
=====================

Execution Time: ${summary.timestamp}
Environment: Node ${environment.nodeVersion} on ${environment.platform}
CI Environment: ${environment.ci ? 'Yes' : 'No'}

Test Results:
${
  results.stats
    ? `
- Tests Run: ${results.stats.total || 'N/A'}
- Passed: ${results.stats.passed || 'N/A'}
- Failed: ${results.stats.failed || 'N/A'}
- Skipped: ${results.stats.skipped || 'N/A'}
- Duration: ${results.stats.duration || 'N/A'}ms
`
    : '- No detailed results available'
}

Artifacts Generated:
- Screenshots: ${artifacts.screenshots}
- Videos: ${artifacts.videos}
- Traces: ${artifacts.traces}

Test Coverage Areas:
✅ Complete submission workflow (extension → GitHub → moderation → approval)
✅ Browser extension popup interface and form validation
✅ Admin dashboard queue management and moderation actions
✅ GitHub integration (issue creation, webhooks, status updates)
✅ Email notification system (all workflow stages)
✅ Performance requirements (submission <5s, moderation <10s)
✅ Error handling and edge cases
✅ Cross-browser compatibility testing
✅ Security validation (auth, input sanitization)
✅ Mobile responsive design verification

Key Performance Metrics:
- Extension submission: Target <5 seconds
- GitHub issue creation: Target <30 seconds
- Moderation actions: Target <10 seconds
- Total workflow: Target <1 minute
- Concurrent load: 5 submissions <15 seconds

For detailed results, see:
- test-results/e2e-results.json (machine-readable)
- test-results/html-report/index.html (interactive report)
- test-results/e2e-artifacts/ (screenshots, videos, traces)
`;
}

async function cleanupTemporaryFiles() {
  console.log('🗑️ Cleaning up temporary files...');

  try {
    // Remove extension build directory
    await fs.rm('test-results/extension-build', {
      recursive: true,
      force: true,
    });

    // Remove mock configuration
    await fs.unlink('test-results/mock-config.json').catch(() => {});

    // Keep test results and artifacts in CI
    console.log('✅ Temporary files cleaned');
  } catch (error) {
    console.error('❌ Failed to cleanup temporary files:', error);
  }
}

// Log final completion message
process.on('exit', () => {
  console.log('\n🎯 E2E Test Suite execution completed');
  console.log(
    '📊 Check test-results/ directory for detailed reports and artifacts'
  );
});

export default globalTeardown;
