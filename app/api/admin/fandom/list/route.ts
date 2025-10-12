/**
 * Fandoms API for User Assignment
 *
 * Provides list of available fandoms for admin assignment
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Lazy database connection to avoid build-time errors
function getDb() {
  const dbPath = path.join(process.cwd(), 'data', 'the-pensive-index.db');

  // Check if directory exists, create if not (for Cloudflare builds)
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create empty database if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    // Return empty response during build
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return null;
    }
  }

  return new Database(dbPath);
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ fandoms: [] }); // Return empty during build
    }

    // Get all fandoms
    const stmt = db.prepare(`
      SELECT id, name, slug, description, created_at
      FROM fandoms
      ORDER BY name ASC
    `);

    const fandoms = stmt.all();
    db.close();

    return NextResponse.json({ fandoms });
  } catch (error) {
    console.error('Get fandoms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fandoms' },
      { status: 500 }
    );
  }
}
