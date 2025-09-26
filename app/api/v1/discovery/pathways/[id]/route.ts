import { NextResponse } from 'next/server';
import { PathwayModel, type PathwayItem } from '@/lib/database/models';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/discovery/pathways/[id]
 *
 * Retrieve pathway details and analysis.
 * Used for sharing pathways and deep linking.
 *
 * Performance target: <200ms response time
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const pathwayId = resolvedParams.id;

  try {
    const startTime = Date.now();

    // For MVP, we'll treat pathway ID as encoded pathway data
    // In production, this would retrieve from a pathways table

    // Decode pathway from URL-safe base64 (simple implementation)
    let pathwayItems: PathwayItem[];

    try {
      const decodedData = Buffer.from(pathwayId, 'base64url').toString('utf-8');
      const pathwayData = JSON.parse(decodedData);

      pathwayItems = Array.isArray(pathwayData.pathway)
        ? pathwayData.pathway
        : [];

      // Validate pathway structure
      pathwayItems = pathwayItems.map((item: any, index: number) => ({
        id: item.id || `item_${index}`,
        type: item.type || 'tag',
        name: item.name || '',
        description: item.description,
        category: item.category,
        position: item.position || index,
        metadata: item.metadata || {},
      }));
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'Invalid pathway ID',
          message: 'Could not decode pathway data',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Analyze the pathway
    const pathwayAnalysis = await PathwayModel.analyzePathway(pathwayItems);

    // Generate prompt for the pathway
    const prompt = PathwayModel.generatePrompt(pathwayItems);

    const executionTime = Date.now() - startTime;

    const response = {
      pathway: {
        id: pathwayId,
        items: pathwayItems.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          description: item.description,
          category: item.category,
          position: item.position,
        })),
        analysis: {
          isValid: pathwayAnalysis.validation.isValid,
          completeness: pathwayAnalysis.completeness,
          noveltyScore: pathwayAnalysis.noveltyScore,
          searchability: pathwayAnalysis.searchability,
          itemCount: pathwayItems.length,
        },
        validation: {
          errors: pathwayAnalysis.validation.errors,
          warnings: pathwayAnalysis.validation.warnings,
          suggestions: pathwayAnalysis.validation.suggestions,
        },
        prompt: {
          text: prompt,
          generated: true,
        },
      },
      sharing: {
        url: `${new URL(request.url).origin}/pathway/${pathwayId}`,
        encoded: pathwayId,
        shareable: true,
      },
      metadata: {
        pathwayId,
        itemCount: pathwayItems.length,
        executionTime,
        timestamp: new Date().toISOString(),
      },
    };

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // 1 hour cache
      'X-Execution-Time': executionTime.toString(),
      'X-Pathway-Items': pathwayItems.length.toString(),
    });

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(`Error fetching pathway ${pathwayId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to fetch pathway',
        message: 'An error occurred while retrieving pathway data',
        pathwayId: pathwayId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

/**
 * OPTIONS /api/v1/discovery/pathways/[id]
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
