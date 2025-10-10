/**
 * Extension Submission API
 * Handles story submissions from browser extension
 * Contract: specs/004-integrate-the-pathway/contracts/extension-api.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { stories } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storyUrl,
      storyTitle,
      storyAuthor,
      storySummary,
      fandomId,
      suggestedTags,
      suggestedPlotBlocks,
      submitterId,
    } = body;

    if (!storyUrl || !storyTitle || !storyAuthor || !fandomId || !submitterId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: storyUrl, storyTitle, storyAuthor, fandomId, submitterId',
        },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // TODO: Check for duplicate URL
    // const duplicate = await db.query.stories.findFirst({
    //   where: eq(stories.url, storyUrl),
    // });

    // if (duplicate) {
    //   return NextResponse.json(
    //     {
    //       error: 'Story already exists',
    //       existingStoryId: duplicate.id,
    //       existingStoryUrl: duplicate.url,
    //     },
    //     { status: 409 }
    //   );
    // }

    // TODO: Create extension submission
    // TODO: Perform duplicate check (fuzzy matching)
    // TODO: Create GitHub issue via Octokit

    return NextResponse.json({
      submission: {
        id: crypto.randomUUID(),
        submitterId,
        storyUrl,
        storyTitle,
        storyAuthor,
        suggestedTags: suggestedTags || [],
        suggestedPlotBlocks: suggestedPlotBlocks || [],
        duplicateCheckStatus: 'unique',
        duplicateOfId: null,
        githubIssueUrl: null,
        voteCount: 0,
        pollStatus: 'pending',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}
