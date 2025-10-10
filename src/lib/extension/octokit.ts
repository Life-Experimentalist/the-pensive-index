/**
 * Octokit GitHub Integration Service
 * Handles GitHub Issues API for extension submission workflow
 * Used for creating and updating submission issues
 */

import { Octokit } from '@octokit/rest';

// Initialize Octokit with GitHub App authentication
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}

export interface UpdateIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
  state?: 'open' | 'closed';
  labels?: string[];
  body?: string;
}

/**
 * Create a GitHub issue for story submission
 */
export async function createSubmissionIssue(params: CreateIssueParams) {
  try {
    const response = await octokit.issues.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      labels: params.labels,
    });

    return {
      success: true,
      issueUrl: response.data.html_url,
      issueNumber: response.data.number,
    };
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a GitHub issue (e.g., when submission is approved/rejected)
 */
export async function updateSubmissionIssue(params: UpdateIssueParams) {
  try {
    const response = await octokit.issues.update({
      owner: params.owner,
      repo: params.repo,
      issue_number: params.issueNumber,
      state: params.state,
      labels: params.labels,
      body: params.body,
    });

    return {
      success: true,
      issueUrl: response.data.html_url,
    };
  } catch (error) {
    console.error('Error updating GitHub issue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format submission as GitHub issue body
 */
export function formatSubmissionIssueBody(submission: {
  storyTitle: string;
  storyAuthor: string;
  storyUrl: string;
  fandomName: string;
  submitterUsername?: string;
  submitterId: string;
  suggestedTags: Array<{ id: string; name: string }>;
  suggestedPlotBlocks: Array<{ id: string; name: string }>;
  voteCount: number;
  pollStatus: string;
  duplicateCheckStatus: string;
  submissionUrl: string;
}): string {
  return `## Story Details
- **Title**: ${submission.storyTitle}
- **Author**: ${submission.storyAuthor}
- **URL**: ${submission.storyUrl}
- **Fandom**: ${submission.fandomName}
- **Submitted by**: ${
    submission.submitterUsername
      ? `@${submission.submitterUsername}`
      : 'Anonymous'
  } (User ID: ${submission.submitterId})

## Suggested Tags
${submission.suggestedTags.map(tag => `- ${tag.name}`).join('\n')}

## Suggested Plot Blocks
${submission.suggestedPlotBlocks.map(pb => `- ${pb.name}`).join('\n')}

## Crowd-Polling Status
- **Votes**: ${submission.voteCount}
- **Status**: ${submission.pollStatus}
- **Duplicate Check**: ${submission.duplicateCheckStatus}

---
*Auto-generated submission via browser extension. Vote at: ${
    submission.submissionUrl
  }*`;
}

/**
 * Extract issue number from GitHub issue URL
 */
export function extractIssueNumber(issueUrl: string): number {
  const match = issueUrl.match(/\/issues\/(\d+)$/);
  if (!match) {
    throw new Error('Invalid GitHub issue URL');
  }
  return parseInt(match[1], 10);
}
