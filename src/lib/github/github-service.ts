/**
 * GitHub Service
 * Handles GitHub API integration for issue management
 */

import { Octokit } from '@octokit/rest';

interface GitHubIssueParams {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config?: Partial<GitHubConfig>) {
    // Use environment variables as defaults
    this.config = {
      owner: config?.owner || process.env.GITHUB_REPO_OWNER || '',
      repo: config?.repo || process.env.GITHUB_REPO_NAME || '',
      token: config?.token || process.env.GITHUB_TOKEN || '',
    };

    // Initialize Octokit with authentication
    this.octokit = new Octokit({
      auth: this.config.token,
    });
  }

  /**
   * Create a new GitHub issue
   */
  async createIssue(params: GitHubIssueParams): Promise<any> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('GitHub repository configuration is missing');
    }

    try {
      const response = await this.octokit.issues.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: params.title,
        body: params.body,
        labels: params.labels || [],
        assignees: params.assignees || [],
      });

      return {
        number: response.data.number,
        url: response.data.html_url,
        id: response.data.id,
        state: response.data.state,
      };
    } catch (error) {
      console.error('Failed to create GitHub issue:', error);
      throw new Error(
        `Failed to create GitHub issue: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Update labels on an existing issue
   */
  async updateIssueLabels(issueNumber: number, labels: string[]): Promise<any> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('GitHub repository configuration is missing');
    }

    try {
      const response = await this.octokit.issues.setLabels({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        labels,
      });

      return {
        issueNumber,
        labels: response.data.map(label => label.name),
      };
    } catch (error) {
      console.error(
        `Failed to update labels for issue #${issueNumber}:`,
        error
      );
      throw new Error(
        `Failed to update issue labels: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Add a comment to an existing issue
   */
  async addIssueComment(issueNumber: number, comment: string): Promise<any> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('GitHub repository configuration is missing');
    }

    try {
      const response = await this.octokit.issues.createComment({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        body: comment,
      });

      return {
        id: response.data.id,
        url: response.data.html_url,
        createdAt: response.data.created_at,
      };
    } catch (error) {
      console.error(`Failed to add comment to issue #${issueNumber}:`, error);
      throw new Error(
        `Failed to add issue comment: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Close an existing issue
   */
  async closeIssue(issueNumber: number): Promise<any> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('GitHub repository configuration is missing');
    }

    try {
      const response = await this.octokit.issues.update({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        state: 'closed',
      });

      return {
        number: response.data.number,
        state: response.data.state,
        closedAt: response.data.closed_at,
      };
    } catch (error) {
      console.error(`Failed to close issue #${issueNumber}:`, error);
      throw new Error(
        `Failed to close issue: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Add labels to an existing issue (additive, doesn't replace)
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<any> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('GitHub repository configuration is missing');
    }

    try {
      const response = await this.octokit.issues.addLabels({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        labels,
      });

      return {
        issueNumber,
        addedLabels: labels,
        allLabels: response.data.map(label => label.name),
      };
    } catch (error) {
      console.error(`Failed to add labels to issue #${issueNumber}:`, error);
      throw new Error(
        `Failed to add labels: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
