import { NextRequest, NextResponse } from 'next/server';
import {
  ValidationRuleModel,
  PathwayModel,
  type PathwayItem,
} from '@/lib/database/models';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/discovery/pathways/validate
 *
 * Real-time pathway validation endpoint.
 * Validates user-selected pathway for conflicts and completeness.
 *
 * Performance target: <200ms response time
 * Called during pathway building for real-time feedback
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Parse request body
    const body = await request.json();
    const { fandomId, pathway, userId } = body;

    // Validate request structure
    if (!fandomId || !Array.isArray(pathway)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'fandomId and pathway array are required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Convert to PathwayItem format
    const pathwayItems: PathwayItem[] = pathway.map(
      (item: any, index: number) => ({
        id: item.id || `item_${index}`,
        type: item.type || 'tag',
        name: item.name || '',
        description: item.description,
        category: item.category,
        position: item.position || index,
        metadata: item.metadata || {},
      })
    );

    // Perform validation using ValidationRuleModel
    const validationResult = await ValidationRuleModel.validatePathway(
      pathwayItems,
      parseInt(fandomId),
      userId
    );

    // Analyze pathway for completeness and suggestions
    const pathwayAnalysis = await PathwayModel.analyzePathway(pathwayItems);

    // Get completion suggestions if pathway is incomplete
    let suggestions: PathwayItem[] = [];
    if (pathwayAnalysis.completeness < 0.8 && pathwayItems.length < 10) {
      suggestions = await PathwayModel.getSuggestions(
        pathwayItems,
        fandomId,
        5
      );
    }

    const executionTime = Date.now() - startTime;

    // Check if we're meeting performance target
    if (executionTime > 200) {
      console.warn(
        `Validation exceeded 200ms target: ${executionTime}ms for ${pathwayItems.length} items`
      );
    }

    const response = {
      validation: {
        isValid: validationResult.isValid,
        errors: validationResult.errors.map(error => ({
          type: 'error',
          rule: error.rule,
          message: error.message,
          severity: error.severity,
        })),
        warnings: validationResult.warnings.map(warning => ({
          type: 'warning',
          rule: warning.rule,
          message: warning.message,
          severity: warning.severity,
        })),
        suggestions: validationResult.suggestions.map(suggestion => ({
          type: 'suggestion',
          rule: suggestion.rule,
          message: suggestion.message,
          fix: suggestion.fix,
        })),
        blockedCombinations: validationResult.blockedCombinations.map(
          block => ({
            type: 'blocked',
            rule: block.rule,
            message: block.message,
          })
        ),
      },
      analysis: {
        completeness: pathwayAnalysis.completeness,
        noveltyScore: pathwayAnalysis.noveltyScore,
        searchability: pathwayAnalysis.searchability,
        itemCount: pathwayItems.length,
        hasCharacters: pathwayItems.some(
          item =>
            item.category?.toLowerCase().includes('character') ||
            item.category?.toLowerCase().includes('ship')
        ),
        hasGenre: pathwayItems.some(item =>
          item.category?.toLowerCase().includes('genre')
        ),
        hasPlotElements: pathwayItems.some(item => item.type === 'plot_block'),
      },
      suggestions: suggestions.map(suggestion => ({
        id: suggestion.id,
        type: suggestion.type,
        name: suggestion.name,
        description: suggestion.description,
        category: suggestion.category,
        reason: 'Improves pathway completeness',
      })),
      metadata: {
        fandomId,
        pathwayLength: pathwayItems.length,
        executionTime,
        timestamp: new Date().toISOString(),
        performanceTarget: executionTime <= 200 ? 'met' : 'exceeded',
      },
    };

    // Performance monitoring headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Execution-Time': executionTime.toString(),
      'X-Performance-Target': executionTime <= 200 ? 'met' : 'exceeded',
      'X-Pathway-Length': pathwayItems.length.toString(),
      'X-Validation-Errors': validationResult.errors.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Real-time validation, no caching
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error validating pathway:', error);

    const executionTime = Date.now() - Date.now();

    return NextResponse.json(
      {
        error: 'Validation failed',
        message: 'An error occurred during pathway validation',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'X-Execution-Time': executionTime.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

/**
 * OPTIONS /api/v1/discovery/pathways/validate
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
