import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { tags } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication when Clerk is configured
    // const { userId } = auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const dbConnection = getDatabase();
    const db = await dbConnection;

    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, params.id))
      .limit(1);

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Failed to fetch tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication when Clerk is configured
    // const { userId } = auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const data = await request.json();
    const {
      name,
      slug,
      description,
      fandom_id,
      tag_class_id,
      parent_id,
      category,
      is_active,
    } = data;

    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check if tag exists
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Check for duplicate slug within the same fandom (excluding current tag)
    if (slug && fandom_id) {
      const [duplicate] = await db
        .select()
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);

      if (
        duplicate &&
        duplicate.id !== params.id &&
        duplicate.fandom_id === fandom_id
      ) {
        return NextResponse.json(
          { error: `Tag with slug "${slug}" already exists in this fandom` },
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
    if (tag_class_id !== undefined) {
      updateData.tag_class_id = tag_class_id || null;
    }
    if (parent_id !== undefined) {
      updateData.parent_id = parent_id || null;
    }
    if (category !== undefined) {
      updateData.category = category || null;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    const [updatedTag] = await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, params.id))
      .returning();

    return NextResponse.json({ tag: updatedTag });
  } catch (error) {
    console.error('Failed to update tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication when Clerk is configured
    // const { userId } = auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check if tag exists
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Delete the tag
    await db.delete(tags).where(eq(tags.id, params.id));

    return NextResponse.json({
      message: 'Tag deleted successfully',
      deleted: existing,
    });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
