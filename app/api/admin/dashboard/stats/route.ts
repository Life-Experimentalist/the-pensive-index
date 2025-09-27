/**
 * Admin Dashboard Statistics API
 *
 * Provides real statistics and metrics for the admin dashboard
 * including user counts, content counts, and system health.
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, count, sql } from 'drizzle-orm';
import { db } from '@/lib/database';
import {
  fandoms,
  tags,
  tagClasses,
  plotBlocks,
  validationRules,
  stories,
  pathways,
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

    // Get content counts in parallel
    const [
      fandomCount,
      tagCount,
      plotBlockCount,
      validationRuleCount,
      storyCount,
      pathwayCount,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(fandoms)
        .then(result => result[0]?.count || 0),
      db
        .select({ count: count() })
        .from(tags)
        .then(result => result[0]?.count || 0),
      db
        .select({ count: count() })
        .from(plotBlocks)
        .then(result => result[0]?.count || 0),
      db
        .select({ count: count() })
        .from(validationRules)
        .then(result => result[0]?.count || 0),
      db
        .select({ count: count() })
        .from(stories)
        .then(result => result[0]?.count || 0)
        .catch(() => 0),
      db
        .select({ count: count() })
        .from(pathways)
        .then(result => result[0]?.count || 0)
        .catch(() => 0),
    ]);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Get active fandoms count
    const activeFandomCount = await db
      .select({ count: count() })
      .from(fandoms)
      .where(eq(fandoms.is_active, true))
      .then(result => result[0]?.count || 0);

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
