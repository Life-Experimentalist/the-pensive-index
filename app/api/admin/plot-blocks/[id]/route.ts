import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { plotBlocks } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const dbConnection = getDatabase();
    const db = await dbConnection;

    const [block] = await db
      .select()
      .from(plotBlocks)
      .where(eq(plotBlocks.id, id))
      .limit(1);

    if (!block) {
      return NextResponse.json(
        { error: 'Plot block not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ plotBlock: block });
  } catch (error) {
    console.error('Failed to fetch plot block:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plot block' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await request.json();
    const {
      name,
      slug,
      description,
      fandom_id,
      category,
      parent_id,
      tag_combination,
      is_active,
    } = data;

    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check if plot block exists
    const [existing] = await db
      .select()
      .from(plotBlocks)
      .where(eq(plotBlocks.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Plot block not found' },
        { status: 404 }
      );
    }

    // Check for duplicate slug within the same fandom (excluding current block)
    if (slug && fandom_id) {
      const [duplicate] = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.slug, slug))
        .limit(1);

      if (
        duplicate &&
        duplicate.id !== id &&
        duplicate.fandom_id === fandom_id
      ) {
        return NextResponse.json(
          {
            error: `Plot block with slug "${slug}" already exists in this fandom`,
          },
          { status: 409 }
        );
      }
    }

    const updateData: any = {
      updated_at: Date.now(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }
    if (slug !== undefined) {
      updateData.slug = slug;
    }
    if (description !== undefined) {
      updateData.description = description || null;
    }
    if (fandom_id !== undefined) {
      updateData.fandom_id = fandom_id;
    }
    if (category !== undefined) {
      updateData.category = category || null;
    }
    if (parent_id !== undefined) {
      updateData.parent_id = parent_id || null;
    }
    if (tag_combination !== undefined) {
      updateData.tag_combination = JSON.stringify(tag_combination);
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    const [updatedBlock] = await db
      .update(plotBlocks)
      .set(updateData)
      .where(eq(plotBlocks.id, id))
      .returning();

    return NextResponse.json({ plotBlock: updatedBlock });
  } catch (error) {
    console.error('Failed to update plot block:', error);
    return NextResponse.json(
      { error: 'Failed to update plot block' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check if plot block exists
    const [existing] = await db
      .select()
      .from(plotBlocks)
      .where(eq(plotBlocks.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Plot block not found' },
        { status: 404 }
      );
    }

    // Delete the plot block
    await db.delete(plotBlocks).where(eq(plotBlocks.id, id));

    return NextResponse.json({
      message: 'Plot block deleted successfully',
      deleted: existing,
    });
  } catch (error) {
    console.error('Failed to delete plot block:', error);
    return NextResponse.json(
      { error: 'Failed to delete plot block' },
      { status: 500 }
    );
  }
}
