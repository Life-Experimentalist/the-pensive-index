/**
 * Pathway Management API Route
 * GET /api/pathways/[id] - Get a single pathway
 * PATCH /api/pathways/[id] - Update a pathway with optimistic locking
 * DELETE /api/pathways/[id] - Delete a pathway
 * Feature 004-integrate-the-pathway: US1 - Concurrency handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/config';
import { pathways } from '@/lib/database/schema';
import {
  pathwayTags,
  pathwayPlotBlocks,
} from '@/lib/database/schemas/pathway-extensions';
import { eq, and } from 'drizzle-orm';
import { checkAuth } from '@/lib/api/clerk-auth';
import { ValidationEngine } from '@/lib/validation/engine';

// GET /api/pathways/[id] - Get a single pathway
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pathwayId } = await params;

    const db = getDatabase();
    const result = await db
      .select()
      .from(pathways)
      .where(eq(pathways.id, pathwayId))
      .all();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Pathway not found' }, { status: 404 });
    }

    const pathway = result[0];

    // Check if pathway is public or user owns it
    const authResult = await checkAuth();
    if (!pathway.is_public) {
      if (!authResult.success || authResult.userId !== pathway.user_id) {
        return NextResponse.json(
          { error: 'Unauthorized to view this pathway' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ pathway });
  } catch (error) {
    console.error('Error fetching pathway:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pathway' },
      { status: 500 }
    );
  }
}

// PATCH /api/pathways/[id] - Update pathway with optimistic locking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pathwayId } = await params;
    const body = await request.json();

    const {
      name,
      description,
      tags,
      plotBlocks,
      isPublic,
      version, // Required for optimistic locking
    } = body;

    // Authentication required for updates
    const authResult = await checkAuth();
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getDatabase();

    // Fetch current pathway
    const currentResult = await db
      .select()
      .from(pathways)
      .where(eq(pathways.id, pathwayId))
      .all();

    if (currentResult.length === 0) {
      return NextResponse.json({ error: 'Pathway not found' }, { status: 404 });
    }

    const currentPathway = currentResult[0];

    // Check ownership
    if (currentPathway.user_id !== authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this pathway' },
        { status: 403 }
      );
    }

    // Optimistic locking: check version
    if (version !== undefined && currentPathway.version !== version) {
      return NextResponse.json(
        {
          error: 'Conflict: Pathway has been modified by another session',
          conflictType: 'VERSION_MISMATCH',
          currentVersion: currentPathway.version,
          providedVersion: version,
          currentData: currentPathway,
        },
        { status: 409 } // Conflict status
      );
    }

    // Run validation if tags/plotBlocks provided
    if (tags || plotBlocks) {
      const validationEngine = new ValidationEngine();

      const validationResult = validationEngine.validate({
        fandomId: currentPathway.fandom_id,
        applied_tags: tags || currentPathway.selected_tags,
        all_tags: [], // TODO: Load from database
        tag_classes: [], // TODO: Load from database
        metadata: {
          selectedPlotBlocks: plotBlocks || currentPathway.selected_plot_blocks,
          allPlotBlocks: [], // TODO: Load from database
        },
      });

      if (!validationResult.is_valid) {
        return NextResponse.json(
          {
            error: 'Pathway validation failed',
            validationErrors: validationResult.errors,
            warnings: validationResult.warnings,
            suggestions: validationResult.suggestions,
          },
          { status: 400 }
        );
      }
    }

    // Visibility validation
    const newIsPublic =
      isPublic !== undefined ? isPublic : currentPathway.is_public;
    if (newIsPublic && !currentPathway.is_persisted) {
      return NextResponse.json(
        {
          error: 'Public pathways must be saved (isPersisted must be true)',
          validationErrors: [
            {
              type: 'VISIBILITY_ERROR',
              message: 'Cannot make a session-only pathway public',
              field: 'isPublic',
              severity: 'error',
            },
          ],
        },
        { status: 400 }
      );
    }

    // Build update object
    const updates: any = {
      last_edited_by: authResult.userId,
      version: currentPathway.version + 1,
      updated_at: new Date(),
    };

    if (name !== undefined) {
      updates.name = name;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (tags !== undefined) {
      updates.selected_tags = tags; // Drizzle handles JSON serialization
    }
    if (plotBlocks !== undefined) {
      updates.selected_plot_blocks = plotBlocks; // Drizzle handles JSON serialization
    }
    if (isPublic !== undefined) {
      updates.is_public = isPublic;
    }

    // Update pathway
    const updateResult = await db
      .update(pathways)
      .set(updates)
      .where(eq(pathways.id, pathwayId))
      .returning();

    const updatedPathway = updateResult[0];

    // Update junction tables if tags/plotBlocks changed
    if (tags !== undefined) {
      // Delete old tags
      await db.delete(pathwayTags).where(eq(pathwayTags.pathway_id, pathwayId));

      // Insert new tags
      if (tags.length > 0) {
        const tagInserts = tags.map((tagId: string, index: number) => ({
          pathway_id: pathwayId,
          tag_id: tagId,
          position: index,
        }));
        await db.insert(pathwayTags).values(tagInserts);
      }
    }

    if (plotBlocks !== undefined) {
      // Delete old tropes
      await db
        .delete(pathwayPlotBlocks)
        .where(eq(pathwayPlotBlocks.pathway_id, pathwayId));

      // Insert new tropes
      if (plotBlocks.length > 0) {
        const plotBlockInserts = plotBlocks.map(
          (blockId: string, index: number) => ({
            pathway_id: pathwayId,
            plot_block_id: blockId,
            position: index,
          })
        );
        await db.insert(pathwayPlotBlocks).values(plotBlockInserts);
      }
    }

    return NextResponse.json({
      pathway: updatedPathway,
      message: 'Pathway updated successfully',
    });
  } catch (error) {
    console.error('Error updating pathway:', error);
    return NextResponse.json(
      { error: 'Failed to update pathway', message: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/pathways/[id] - Delete a pathway
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pathwayId } = await params;

    // Authentication required for deletion
    const authResult = await checkAuth();
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getDatabase();

    // Fetch pathway to check ownership
    const currentResult = await db
      .select()
      .from(pathways)
      .where(eq(pathways.id, pathwayId))
      .all();

    if (currentResult.length === 0) {
      return NextResponse.json({ error: 'Pathway not found' }, { status: 404 });
    }

    const pathway = currentResult[0];

    // Check ownership
    if (pathway.user_id !== authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this pathway' },
        { status: 403 }
      );
    }

    // Delete junction table entries first (foreign key constraints)
    await db.delete(pathwayTags).where(eq(pathwayTags.pathway_id, pathwayId));
    await db
      .delete(pathwayPlotBlocks)
      .where(eq(pathwayPlotBlocks.pathway_id, pathwayId));

    // Delete pathway
    await db.delete(pathways).where(eq(pathways.id, pathwayId));

    return NextResponse.json({
      message: 'Pathway deleted successfully',
      deletedId: pathwayId,
    });
  } catch (error) {
    console.error('Error deleting pathway:', error);
    return NextResponse.json(
      { error: 'Failed to delete pathway', message: String(error) },
      { status: 500 }
    );
  }
}
