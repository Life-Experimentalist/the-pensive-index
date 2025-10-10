/**
 * GitHub API Client for Story Submission Management
 *
 * Provides authentication, rate limiting, issue management,
 * and webhook handling for the community submission system.
 */

import { Octokit } from '@octokit/rest';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import type { GitHubIssueData, GitHubWebhookPayload } from '@/types/submission';
import type { SubmissionData } from '../database/submissions';

// Configuration interfaces
interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  webhookSecret?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  used: number;
}

interface IssueTemplate {
  title: string;
  body: string;
  labels: string[];
}

/**
 * GitHub API Client with rate limiting and webhook support
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
      userAgent: 'the-pensive-index-v1.0.0',
      baseUrl: 'https://api.github.com',
      request: {
        timeout: 30000, // 30 second timeout
      },
    });

    // Set up rate limit monitoring
    this.octokit.hook.after('request', async response => {
      await Promise.resolve(); // Make async valid
      this.updateRateLimitInfo(response.headers);
    });
  }

  /**
   * Create a GitHub issue for a story submission
   */
  async createSubmissionIssue(submission: any): Promise<GitHubIssueData> {
    try {
      await this.checkRateLimit();

      const template = this.generateIssueTemplate(submission);

      const response = await this.octokit.rest.issues.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: template.title,
        body: template.body,
        labels: template.labels,
        assignees: [], // Will be assigned by moderators
      });

      return {
        issueNumber: response.data.number,
        issueUrl: response.data.html_url,
        issueId: response.data.id,
        state: response.data.state as 'open' | 'closed',
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at),
        labels: response.data.labels
          .map(label => (typeof label === 'string' ? label : label.name || ''))
          .filter(Boolean),
      };
    } catch (error) {
      throw this.handleGitHubError(error, 'Failed to create submission issue');
    }
  }

  /**
   * Update an existing GitHub issue
   */
  async updateSubmissionIssue(
    issueNumber: number,
    updates: Partial<any>,
    moderationNote?: string
  ): Promise<GitHubIssueData> {
    try {
      await this.checkRateLimit();

      const currentIssue = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      });

      // Generate updated template
      const template = this.generateIssueTemplate({
        ...this.parseIssueBody(currentIssue.data.body || ''),
        ...updates,
      });

      // Add moderation note if provided
      let body = template.body;
      if (moderationNote) {
        body += `\n\n---\n**Moderation Note:** ${moderationNote}`;
      }

      const response = await this.octokit.rest.issues.update({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        title: template.title,
        body: body,
        labels: template.labels,
      });

      return {
        issueNumber: response.data.number,
        issueUrl: response.data.html_url,
        issueId: response.data.id,
        state: response.data.state as 'open' | 'closed',
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at),
        labels: response.data.labels
          .map(label => (typeof label === 'string' ? label : label.name || ''))
          .filter(Boolean),
      };
    } catch (error) {
      throw this.handleGitHubError(error, 'Failed to update submission issue');
    }
  }

  /**
   * Close a GitHub issue with a comment
   */
  async closeSubmissionIssue(
    issueNumber: number,
    reason: string,
    finalComment?: string
  ): Promise<void> {
    try {
      await this.checkRateLimit();

      // Add final comment if provided
      if (finalComment) {
        await this.octokit.rest.issues.createComment({
          owner: this.config.owner,
          repo: this.config.repo,
          issue_number: issueNumber,
          body: `${finalComment}\n\n**Reason for closure:** ${reason}`,
        });
      }

      // Close the issue
      await this.octokit.rest.issues.update({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        state: 'closed',
        state_reason: 'completed',
      });
    } catch (error) {
      throw this.handleGitHubError(error, 'Failed to close submission issue');
    }
  }

  /**
   * Add a comment to a GitHub issue
   */
  async addIssueComment(issueNumber: number, comment: string): Promise<void> {
    try {
      await this.checkRateLimit();

      await this.octokit.rest.issues.createComment({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        body: comment,
      });
    } catch (error) {
      throw this.handleGitHubError(error, 'Failed to add issue comment');
    }
  }

  /**
   * Get GitHub issue details
   */
  async getIssue(issueNumber: number): Promise<GitHubIssueData> {
    try {
      await this.checkRateLimit();

      const response = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      });

      return {
        issueNumber: response.data.number,
        issueUrl: response.data.html_url,
        issueId: response.data.id,
        state: response.data.state as 'open' | 'closed',
        createdAt: new Date(response.data.created_at),
        updatedAt: new Date(response.data.updated_at),
        labels: response.data.labels
          .map(label => (typeof label === 'string' ? label : label.name || ''))
          .filter(Boolean),
      };
    } catch (error) {
      throw this.handleGitHubError(error, 'Failed to get issue details');
    }
  }

  /**
   * Validate webhook signature for security
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const actualSignature = signature.replace('sha256=', '');

    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(actualSignature, 'hex')
    );
  }

  /**
   * Parse webhook payload from GitHub
   */
  async parseWebhookPayload(
    request: NextRequest
  ): Promise<GitHubWebhookPayload | null> {
    try {
      const signature = request.headers.get('x-hub-signature-256');
      const payload = await request.text();

      if (!signature || !this.validateWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const data = JSON.parse(payload);

      // Only process issue events
      if (data.action && data.issue) {
        return {
          action: data.action,
          issueNumber: data.issue.number,
          issueState: data.issue.state,
          labels: data.issue.labels?.map((label: any) => label.name) || [],
          assignees:
            data.issue.assignees?.map((assignee: any) => assignee.login) || [],
          sender: data.sender?.login || 'unknown',
          repository: `${data.repository?.owner?.login}/${data.repository?.name}`,
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return null;
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitInfo> {
    const response = await this.octokit.rest.rateLimit.get();
    const core = response.data.resources.core;

    return {
      limit: core.limit,
      remaining: core.remaining,
      resetTime: new Date(core.reset * 1000),
      used: core.used,
    };
  }

  /**
   * Check if we're approaching rate limits
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 100) {
      const now = new Date();
      const resetTime = this.rateLimitInfo.resetTime;

      if (now < resetTime) {
        const waitTime = resetTime.getTime() - now.getTime();
        console.warn(
          `Rate limit approaching. Waiting ${waitTime}ms until reset.`
        );

        if (waitTime > 0 && waitTime < 60000) {
          // Only wait if less than 1 minute
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(headers: any): void {
    const limit = parseInt(headers['x-ratelimit-limit'] || '0');
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
    const reset = parseInt(headers['x-ratelimit-reset'] || '0');
    const used = parseInt(headers['x-ratelimit-used'] || '0');

    if (limit && reset) {
      this.rateLimitInfo = {
        limit,
        remaining,
        resetTime: new Date(reset * 1000),
        used,
      };
    }
  }

  /**
   * Generate GitHub issue template from submission data
   */
  private generateIssueTemplate(submission: any): IssueTemplate {
    const title = `Story Submission: ${submission.title}`;

    const body = `## Story Submission

**Title:** ${submission.title}
**URL:** ${submission.url}
**Source:** ${submission.source}
**Fandom:** ${submission.fandom}

### Tags
${submission.tags?.map((tag: string) => `- ${tag}`).join('\n') || 'No tags'}

### Tropes
${
  submission.plotBlocks?.map((block: string) => `- ${block}`).join('\n') ||
  'No tropes'
}

### Summary
${submission.summary || 'No summary provided'}

### Additional Notes
${submission.additionalNotes || 'No additional notes'}

---
**Submitted by:** ${submission.submitterEmail || 'Anonymous'}
**Submission ID:** ${submission.submissionId}
**Submitted:** ${new Date().toISOString()}

### Moderation Checklist
- [ ] Story URL is valid and accessible
- [ ] Tags are appropriate and follow guidelines
- [ ] Tropes are correctly identified
- [ ] No duplicate submission exists
- [ ] Content is suitable for the platform

### Admin Actions
Use the following commands in comments:
- \`/approve\` - Approve and add to database
- \`/reject <reason>\` - Reject with reason
- \`/request-changes <details>\` - Request changes from submitter
- \`/assign @username\` - Assign to moderator`;

    const labels = [
      'story-submission',
      'needs-review',
      `source:${submission.source.toLowerCase()}`,
      `fandom:${submission.fandom.toLowerCase().replace(/\s+/g, '-')}`,
    ];

    return { title, body, labels };
  }

  /**
   * Parse submission data from GitHub issue body
   * (Simplified version - would need more robust parsing in production)
   */
  private parseIssueBody(body: string): Partial<any> {
    const lines = body.split('\n');
    const data: Partial<any> = {};

    // Basic parsing - would need to be more robust
    for (const line of lines) {
      if (line.startsWith('**Title:**')) {
        data.title = line.replace('**Title:**', '').trim();
      } else if (line.startsWith('**URL:**')) {
        data.url = line.replace('**URL:**', '').trim();
      } else if (line.startsWith('**Source:**')) {
        data.source = line.replace('**Source:**', '').trim();
      } else if (line.startsWith('**Fandom:**')) {
        data.fandom = line.replace('**Fandom:**', '').trim();
      }
    }

    return data;
  }

  /**
   * Handle GitHub API errors consistently
   */
  private handleGitHubError(error: any, context: string): Error {
    console.error(`${context}:`, error);

    if (error.status === 401) {
      return new Error(
        'GitHub authentication failed. Please check your token.'
      );
    } else if (error.status === 403) {
      return new Error(
        'GitHub API rate limit exceeded or insufficient permissions.'
      );
    } else if (error.status === 404) {
      return new Error('GitHub repository or issue not found.');
    } else if (error.status === 422) {
      return new Error(
        'Invalid GitHub API request. Please check the data format.'
      );
    } else {
      return new Error(
        `${context}: ${error.message || 'Unknown GitHub API error'}`
      );
    }
  }
}

/**
 * Create GitHub client instance with environment configuration
 */
export function createGitHubClient(): GitHubClient {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!token || !owner || !repo) {
    throw new Error(
      'GitHub configuration missing. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.'
    );
  }

  return new GitHubClient({
    token,
    owner,
    repo,
    webhookSecret,
  });
}

/**
 * Singleton instance for use across the application
 */
let gitHubClient: GitHubClient | null = null;

export function getGitHubClient(): GitHubClient {
  if (!gitHubClient) {
    gitHubClient = createGitHubClient();
  }
  return gitHubClient;
}

// Export types for external use
export type { GitHubConfig, RateLimitInfo, IssueTemplate };
