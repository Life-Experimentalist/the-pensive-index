import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager, DatabaseHealthChecker } from '@/lib/database';

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  try {
    const dbManager = DatabaseManager.getInstance();
    const connection = dbManager.getConnection();
    const healthChecker = new DatabaseHealthChecker(connection);
    const healthCheck = await healthChecker.checkHealth();

    const status = healthCheck.status === 'healthy' ? 200 : 503;

    return NextResponse.json(healthCheck, { status });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: { status: 'fail', message: 'Health check failed' },
        checks: [],
      },
      { status: 500 }
    );
  }
}
