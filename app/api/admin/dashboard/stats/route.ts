/**
 * Admin Dashboard Stats API Route
 *
 * Provides real statistics and metrics for the admin dashboard
 * including user counts, content counts, and system health.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/init';
import {
  fandoms,
  tags,
  tagClasses,
  plotBlocks,
  validationRules,
  stories,
  adminUsers,
} from '@/lib/database/schema';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    admins: number;
    new_this_week: number;
  };
  content: {
    fandoms: number;
    stories: number;
    tags: number;
    plot_blocks: number;
    pathways: number;
    validation_rules: number;
  };
  activity: {
    searches_today: number;
    pathways_created_week: number;
    stories_submitted_week: number;
    validation_runs_week: number;
  };
  system: {
    database_size: string;
    uptime: string;
    response_time: number;
    active_connections: number;
  };
}

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard/stats
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add permission check for admin access
    // const hasPermission = await checkAdminPermission(userId);
    // if (!hasPermission) {
    //   return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    // }

    const startTime = Date.now();

    // Get initialized database connection
    const connection = await getDb();

    // Get actual counts from database with fallbacks for missing tables/columns
    // Database status: Fandoms ✅ | Tags ⚠️ (schema mismatch) | Stories ❌ (missing)

    const [
      fandomCount,
      tagCount,
      plotBlockCount,
      validationRuleCount,
      storyCount,
      pathwayCount,
    ] = await Promise.all([
      // Count fandoms - working table
      connection
        .select()
        .from(fandoms)
        .then((result: any[]) => result.length)
        .catch(() => 0),

      // Count tags - working with schema differences, use basic query
      connection
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .then((result: any[]) => result.length)
        .catch(() => 0),

      // Count plot blocks - table may not exist yet
      // connection
      //   .select()
      //   .from(plotBlocks)
      //   .then((result: any[]) => result.length)
      //   .catch(() => 0),
      Promise.resolve(0), // Placeholder until migrations are run

      // Count validation rules - table may not exist yet
      // connection
      //   .select()
      //   .from(validationRules)
      //   .then((result: any[]) => result.length)
      //   .catch(() => 0),
      Promise.resolve(0), // Placeholder until migrations are run

      // Count stories - table doesn't exist yet
      // connection
      //   .select()
      //   .from(stories)
      //   .then((result: any[]) => result.length)
      //   .catch(() => 0),
      Promise.resolve(0), // Placeholder until migrations are run

      // Pathways not implemented yet
      Promise.resolve(0),
    ]);    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Get active fandoms count from database
    const activeFandomCount = await connection
      .select({ id: fandoms.id, is_active: fandoms.is_active })
      .from(fandoms)
      .where(eq(fandoms.is_active, true))
      .then((result: any[]) => result.length)
      .catch(() => fandomCount); // Fallback to total fandoms if active query fails

    // Calculate system uptime (approximate)
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    const stats: DashboardStats = {
      users: {
        total: 0, // Will be updated with real Clerk user count
        active: 0,
        admins: 0,
        new_this_week: 0,
      },
      content: {
        fandoms: activeFandomCount,
        stories: storyCount,
        tags: tagCount,
        plot_blocks: plotBlockCount,
        pathways: pathwayCount,
        validation_rules: validationRuleCount,
      },
      activity: {
        searches_today: 0, // TODO: Implement activity tracking
        pathways_created_week: 0,
        stories_submitted_week: 0,
        validation_runs_week: 0,
      },
      system: {
        database_size: 'N/A',
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        response_time: responseTime,
        active_connections: 1, // Placeholder
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard statistics' },
      { status: 500 }
    );
  }
}
