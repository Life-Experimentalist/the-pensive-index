/**
 * GitHub Integration Module
 *
 * This module provides comprehensive GitHub integration for the community
 * submission system, including API client, webhook handlers, and issue templates.
 */

// Main GitHub API client
export { GitHubClient, createGitHubClient, getGitHubClient } from './client';
export type { GitHubConfig, RateLimitInfo, IssueTemplate } from './client';

// Webhook handling
export {
  GitHubWebhookHandler,
  GitHubCommandParser,
  webhookHandler,
  commandParser,
} from './webhook';

// Import for internal use
import { getGitHubClient, type RateLimitInfo } from './client';
import { webhookHandler, commandParser } from './webhook';

// Issue templates
export {
  createSubmissionTemplate,
  createUpdateTemplate,
  createApprovalTemplate,
  createRejectionTemplate,
  createChangeRequestTemplate,
  getTemplateForAction,
  SUBMISSION_LABELS,
} from './templates/submission';

// Re-export types from main types file
export type { GitHubIssueData, GitHubWebhookPayload } from '@/types/submission';

/**
 * Initialize GitHub integration with environment variables
 *
 * This function creates and configures all necessary GitHub integration
 * components using environment variables for configuration.
 */
export function initializeGitHubIntegration() {
  const requiredEnvVars = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for GitHub integration: ${missingVars.join(
        ', '
      )}`
    );
  }

  // Create GitHub client instance
  const client = getGitHubClient();

  console.log('GitHub integration initialized successfully');
  console.log(
    `Repository: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`
  );
  console.log(
    `Webhook secret configured: ${!!process.env.GITHUB_WEBHOOK_SECRET}`
  );

  return {
    client,
    webhookHandler,
    commandParser,
  };
}

/**
 * Health check for GitHub integration
 */
export async function checkGitHubHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  rateLimit?: RateLimitInfo;
}> {
  try {
    const client = getGitHubClient();
    const rateLimit = await client.getRateLimitStatus();

    if (rateLimit.remaining < 100) {
      return {
        status: 'unhealthy',
        message: `Rate limit low: ${rateLimit.remaining}/${rateLimit.limit} remaining`,
        rateLimit,
      };
    }

    return {
      status: 'healthy',
      message: 'GitHub integration is operational',
      rateLimit,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message:
        error instanceof Error
          ? error.message
          : 'Unknown GitHub integration error',
    };
  }
}
