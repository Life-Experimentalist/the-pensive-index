/**
 * Audit Log API
 * 
 * API endpoints for retrieving and managing admin audit logs.
 * Provides comprehensive logging access with filtering and export capabilities.
 * 
 * @package the-pensive-index
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AuditLogService } from '@/lib/admin/services/AuditLogService';
import { PermissionValidator } from '@/lib/admin/utils/PermissionValidator';

// Request validation schemas
const GetLogsSchema = z.object({
  user_id: z.string().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  fandom_id: z.string().optional(),
  success: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  start_date: z.string().datetime().transform(val => new Date(val)).optional(),
  end_date: z.string().datetime().transform(val => new Date(val)).optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 1000).optional(),
  offset: z.string().transform(val => parseInt(val)).refine(val => val >= 0).optional()
});

const SearchLogsSchema = z.object({
  search_term: z.string().min(1, 'Search term is required'),
  user_id: z.string().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  fandom_id: z.string().optional(),
  start_date: z.string().datetime().transform(val => new Date(val)).optional(),
  end_date: z.string().datetime().transform(val => new Date(val)).optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).optional(),
  offset: z.string().transform(val => parseInt(val)).refine(val => val >= 0).optional()
});

const ExportLogsSchema = z.object({
  format: z.enum(['json', 'csv']),
  user_id: z.string().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  fandom_id: z.string().optional(),
  start_date: z.string().datetime().transform(val => new Date(val)).optional(),
  end_date: z.string().datetime().transform(val => new Date(val)).optional()
});

// Initialize services
const auditService = AuditLogService.getInstance();
const permissionValidator = PermissionValidator.getInstance();

/**
 * GET /api/admin/audit-logs
 * Retrieve audit logs with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'list' | 'search' | 'stats' | 'failed'
    
    // Convert searchParams to object for validation
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Handle different actions
    switch (action) {
      case 'search':
        return await handleSearchLogs(request, currentUserId, queryParams);
      case 'stats':
        return await handleGetStats(request, currentUserId, queryParams);
      case 'failed':
        return await handleGetFailedLogs(request, currentUserId, queryParams);
      case 'export':
        return await handleExportLogs(request, currentUserId, queryParams);
      default:
        return await handleGetLogs(request, currentUserId, queryParams);
    }

  } catch (error) {
    console.error('Error in audit log API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle getting audit logs
 */
async function handleGetLogs(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Validate query parameters
    const validatedParams = GetLogsSchema.parse(queryParams);
    const fandomId = validatedParams.fandom_id;

    // Permission check
    const canView = await permissionValidator.canViewAuditLogs(currentUserId, fandomId);
    if (!canView) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to view audit logs',
          fandom_context: fandomId
        },
        { status: 403 }
      );
    }

    // Build filters
    const filters = {
      user_id: validatedParams.user_id,
      action: validatedParams.action,
      resource_type: validatedParams.resource_type,
      resource_id: validatedParams.resource_id,
      fandom_id: validatedParams.fandom_id,
      success: validatedParams.success,
      start_date: validatedParams.start_date,
      end_date: validatedParams.end_date,
      limit: validatedParams.limit || 50,
      offset: validatedParams.offset || 0
    };

    // Get logs
    const result = await auditService.getLogs(filters);

    return NextResponse.json({
      success: true,
      logs: result.logs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        user_email: log.user_email,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        fandom_id: log.fandom_id,
        details: log.details,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        success: log.success,
        error_message: log.error_message,
        timestamp: log.timestamp
      })),
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        has_more: result.total > (filters.offset + filters.limit)
      },
      filters: filters
    });

  } catch (error) {
    console.error('Error getting audit logs:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

/**
 * Handle searching audit logs
 */
async function handleSearchLogs(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Validate search parameters
    const validatedParams = SearchLogsSchema.parse(queryParams);
    const fandomId = validatedParams.fandom_id;

    // Permission check
    const canView = await permissionValidator.canViewAuditLogs(currentUserId, fandomId);
    if (!canView) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to search audit logs',
          fandom_context: fandomId
        },
        { status: 403 }
      );
    }

    // Build search filters
    const filters = {
      user_id: validatedParams.user_id,
      action: validatedParams.action,
      resource_type: validatedParams.resource_type,
      fandom_id: validatedParams.fandom_id,
      start_date: validatedParams.start_date,
      end_date: validatedParams.end_date
    };

    // Search logs
    const result = await auditService.searchLogs(
      validatedParams.search_term,
      filters,
      validatedParams.limit || 50,
      validatedParams.offset || 0
    );

    return NextResponse.json({
      success: true,
      search_term: validatedParams.search_term,
      logs: result.logs,
      pagination: {
        total: result.total,
        limit: validatedParams.limit || 50,
        offset: validatedParams.offset || 0,
        has_more: result.total > ((validatedParams.offset || 0) + (validatedParams.limit || 50))
      },
      filters: filters
    });

  } catch (error) {
    console.error('Error searching audit logs:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid search parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

/**
 * Handle getting audit log statistics
 */
async function handleGetStats(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Permission check - stats require global access
    const canView = await permissionValidator.canViewAuditLogs(currentUserId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit log statistics' },
        { status: 403 }
      );
    }

    // Parse timeframe if provided
    let timeframe;
    if (queryParams.start_date && queryParams.end_date) {
      timeframe = {
        start_date: new Date(queryParams.start_date),
        end_date: new Date(queryParams.end_date)
      };
    }

    // Get statistics
    const stats = await auditService.getLogStats(timeframe);

    return NextResponse.json({
      success: true,
      statistics: stats,
      timeframe: timeframe
    });

  } catch (error) {
    console.error('Error getting audit log stats:', error);
    throw error;
  }
}

/**
 * Handle getting failed actions
 */
async function handleGetFailedLogs(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Permission check
    const canView = await permissionValidator.canViewAuditLogs(currentUserId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view failed actions' },
        { status: 403 }
      );
    }

    const limit = queryParams.limit ? parseInt(queryParams.limit) : 100;
    const offset = queryParams.offset ? parseInt(queryParams.offset) : 0;

    // Get failed actions
    const failedLogs = await auditService.getFailedActions(limit, offset);

    return NextResponse.json({
      success: true,
      failed_actions: failedLogs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        user_email: log.user_email,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        fandom_id: log.fandom_id,
        error_message: log.error_message,
        details: log.details,
        timestamp: log.timestamp
      })),
      pagination: {
        limit,
        offset,
        total: failedLogs.length
      }
    });

  } catch (error) {
    console.error('Error getting failed actions:', error);
    throw error;
  }
}

/**
 * Handle exporting audit logs
 */
async function handleExportLogs(
  request: NextRequest,
  currentUserId: string,
  queryParams: Record<string, string>
) {
  try {
    // Validate export parameters
    const validatedParams = ExportLogsSchema.parse(queryParams);
    const fandomId = validatedParams.fandom_id;

    // Permission check
    const canView = await permissionValidator.canViewAuditLogs(currentUserId, fandomId);
    if (!canView) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to export audit logs',
          fandom_context: fandomId
        },
        { status: 403 }
      );
    }

    // Build export filters
    const filters = {
      user_id: validatedParams.user_id,
      action: validatedParams.action,
      resource_type: validatedParams.resource_type,
      fandom_id: validatedParams.fandom_id,
      start_date: validatedParams.start_date,
      end_date: validatedParams.end_date
    };

    // Export logs
    const exportData = await auditService.exportLogs(validatedParams.format, filters);

    // Set appropriate headers for download
    const headers = new Headers();
    if (validatedParams.format === 'csv') {
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    } else {
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', 'attachment; filename="audit-logs.json"');
    }

    return new NextResponse(exportData, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error exporting audit logs:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid export parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

/**
 * POST /api/admin/audit-logs
 * Clean up old audit logs (admin maintenance)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Permission check - cleanup requires project admin
    const canCleanup = await permissionValidator.canViewAuditLogs(currentUserId);
    if (!canCleanup) {
      return NextResponse.json(
        { error: 'Insufficient permissions to perform audit log maintenance' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const retentionDays = body.retention_days || 90;

    if (retentionDays < 30 || retentionDays > 365) {
      return NextResponse.json(
        { error: 'Retention period must be between 30 and 365 days' },
        { status: 400 }
      );
    }

    // Perform cleanup
    const deletedCount = await auditService.cleanupOldLogs(retentionDays);

    return NextResponse.json({
      success: true,
      message: 'Audit log cleanup completed',
      deleted_logs: deletedCount,
      retention_days: retentionDays,
      cleaned_by: currentUserId,
      cleanup_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}