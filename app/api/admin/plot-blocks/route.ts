import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/database';
import { plotBlocks, fandoms } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fandomFilter = searchParams.get('fandom');
    const parentOnly = searchParams.get('parent_only') === 'true';

    const dbConnection = getDatabase();
    const db = await dbConnection;

    let conditions = [];

    if (fandomFilter && fandomFilter !== 'all') {
      conditions.push(eq(plotBlocks.fandom_id, fandomFilter));
    }

    if (parentOnly) {
      conditions.push(sql`${plotBlocks.parent_id} IS NULL`);
    }

    const blocksWithDetails = await db
      .select({
        id: plotBlocks.id,
        name: plotBlocks.name,
        slug: plotBlocks.slug,
        description: plotBlocks.description,
        fandom_id: plotBlocks.fandom_id,
        fandom_name: fandoms.name,
        category: plotBlocks.category,
        parent_id: plotBlocks.parent_id,
        parent_name: sql<string | null>`(
          SELECT ${plotBlocks.name}
          FROM ${plotBlocks} AS parent_block
          WHERE parent_block.id = ${plotBlocks.parent_id}
        )`,
        tag_combination: plotBlocks.tag_combination,
        is_active: plotBlocks.is_active,
        created_at: plotBlocks.created_at,
        updated_at: plotBlocks.updated_at,
      })
      .from(plotBlocks)
      .leftJoin(fandoms, eq(plotBlocks.fandom_id, fandoms.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(plotBlocks.name);

    return NextResponse.json({
      plotBlocks: blocksWithDetails,
      count: blocksWithDetails.length,
    });
  } catch (error) {
    console.error('Failed to fetch plot blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plot blocks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (
      !name ||
      !slug ||
      !fandom_id ||
      !tag_combination ||
      tag_combination.length === 0
    ) {
      return NextResponse.json(
        { error: 'Name, slug, fandom, and at least one tag are required' },
        { status: 400 }
      );
    }

    const dbConnection = getDatabase();
    const db = await dbConnection;

    // Check for duplicate slug within the same fandom
    const existing = await db
      .select()
      .from(plotBlocks)
      .where(
        and(eq(plotBlocks.slug, slug), eq(plotBlocks.fandom_id, fandom_id))
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: `Plot block with slug "${slug}" already exists in this fandom`,
        },
        { status: 409 }
      );
    }

    const now = Date.now();
    const [newBlock] = await db
      .insert(plotBlocks)
      .values({
        name,
        slug,
        description: description || null,
        fandom_id,
        category: category || null,
        parent_id: parent_id || null,
        tag_combination: JSON.stringify(tag_combination),
        is_active: is_active ?? true,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return NextResponse.json({ plotBlock: newBlock }, { status: 201 });
  } catch (error) {
    console.error('Failed to create plot block:', error);
    return NextResponse.json(
      { error: 'Failed to create plot block' },
      { status: 500 }
    );
  }
}
