import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { tags, fandoms, tagClasses } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication when Clerk is configured
    // const { userId } = auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const searchParams = request.nextUrl.searchParams;
    const fandomFilter = searchParams.get('fandom');
    const parentOnly = searchParams.get('parent_only') === 'true';

    const dbConnection = getDatabase();
    const db = await dbConnection;

    let conditions = [];

    if (fandomFilter && fandomFilter !== 'all') {
      conditions.push(eq(tags.fandom_id, fandomFilter));
    }

    if (parentOnly) {
      conditions.push(sql`${tags.parent_id} IS NULL`);
    }

    const tagsWithDetails = await db
      .select()
      .from(tags)
      .leftJoin(fandoms, eq(tags.fandom_id, fandoms.id))
      .leftJoin(tagClasses, eq(tags.tag_class_id, tagClasses.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(tags.name);

    // Transform the joined data into the expected format
    const formattedTags = tagsWithDetails.map(row => ({
      id: row.tags.id,
      name: row.tags.name,
      slug: row.tags.slug,
      description: row.tags.description,
      fandom_id: row.tags.fandom_id,
      fandom_name: row.fandoms?.name || null,
      tag_class_id: row.tags.tag_class_id,
      tag_class_name: row.tag_classes?.name || null,
      parent_id: row.tags.parent_id,
      parent_name: null, // TODO: Add parent name lookup if needed
      category: row.tags.category,
      is_active: row.tags.is_active,
      created_at: row.tags.created_at,
      updated_at: row.tags.updated_at,
    }));

    return NextResponse.json({
      tags: formattedTags,
      count: formattedTags.length,
    });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    if (!name || !slug || !fandom_id) {
      return NextResponse.json(
        { error: 'Name, slug, and fandom are required' },
        { status: 400 }
      );
    }

    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check for duplicate slug within the same fandom
    const existing = await db
      .select()
      .from(tags)
      .where(and(eq(tags.slug, slug), eq(tags.fandom_id, fandom_id)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Tag with slug "${slug}" already exists in this fandom` },
        { status: 409 }
      );
    }

    const now = Date.now();
    const tagId = `tag_${fandom_id}_${slug}_${now}`;

    const newTags = await db
      .insert(tags)
      .values({
        id: tagId,
        name,
        slug,
        description: description || null,
        fandom_id,
        tag_class_id: tag_class_id || null,
        parent_id: parent_id || null,
        category: category || null,
        is_active: is_active ?? true,
        created_at: now,
        updated_at: now,
      })
      .returning();

    const newTag = newTags[0];

    return NextResponse.json({ tag: newTag }, { status: 201 });
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
