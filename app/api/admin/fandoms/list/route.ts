/**
 * Fandoms API for User Assignment
 *
 * Provides list of available fandoms for admin assignment
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'the-pensive-index.db');
const db = new Database(dbPath);

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all fandoms
    const stmt = db.prepare(`
      SELECT id, name, slug, description, created_at
      FROM fandoms
      ORDER BY name ASC
    `);

    const fandoms = stmt.all();

    return NextResponse.json({ fandoms });
  } catch (error) {
    console.error('Get fandoms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fandoms' },
      { status: 500 }
    );
  }
}
