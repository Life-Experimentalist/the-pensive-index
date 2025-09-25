import { NextRequest, NextResponse } from 'next/server';
import { ImportExportService } from '@/lib/admin/services/ImportExportService';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Query parameters validation schema
const ExportParamsSchema = z.object({
  format: z.enum(['json', 'csv', 'xml']).optional().default('json'),
  content_types: z.string().optional(), // comma-separated list: "tag,plot_block,character"
  include_inactive: z.enum(['true', 'false']).optional().default('false'),
  include_metadata: z.enum(['true', 'false']).optional().default('true'),
  include_versions: z.enum(['true', 'false']).optional().default('false'),
  category: z.string().optional(),
  subcategory: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication once auth system is configured
    const userId = 'dev-user-id';

    // Validate fandom ID
    const fandomId = parseInt(params.id);
    if (isNaN(fandomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fandom ID format',
        },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      format: searchParams.get('format') || 'json',
      content_types: searchParams.get('content_types'),
      include_inactive: searchParams.get('include_inactive') || 'false',
      include_metadata: searchParams.get('include_metadata') || 'true',
      include_versions: searchParams.get('include_versions') || 'false',
      category: searchParams.get('category'),
      subcategory: searchParams.get('subcategory'),
    };

    const validatedParams = ExportParamsSchema.parse(queryParams);

    // Initialize service
    const importExportService = new ImportExportService();

    // Export fandom content using the actual service method
    const exportedContent = await importExportService.exportContent(fandomId);

    // Filter content based on parameters
    let filteredContent = exportedContent;

    // Filter by content types if specified
    if (validatedParams.content_types) {
      const contentTypes = validatedParams.content_types
        .split(',')
        .map(t => t.trim());
      filteredContent = filteredContent.filter((item: any) =>
        contentTypes.includes(item.type)
      );
    }

    // Filter by category if specified
    if (validatedParams.category) {
      filteredContent = filteredContent.filter(
        (item: any) => item.category === validatedParams.category
      );
    }

    // Filter by subcategory if specified
    if (validatedParams.subcategory) {
      filteredContent = filteredContent.filter(
        (item: any) => item.subcategory === validatedParams.subcategory
      );
    }

    // Prepare export metadata
    const exportMetadata = {
      fandom_id: fandomId,
      exported_at: new Date().toISOString(),
      exported_by: userId,
      export_format: validatedParams.format,
      total_items: filteredContent.length,
      content_types: [
        ...new Set(filteredContent.map((item: any) => item.type)),
      ],
      categories: [
        ...new Set(
          filteredContent.map((item: any) => item.category).filter(Boolean)
        ),
      ],
      filters_applied: {
        content_types: validatedParams.content_types,
        category: validatedParams.category,
        subcategory: validatedParams.subcategory,
        include_inactive: validatedParams.include_inactive === 'true',
        include_metadata: validatedParams.include_metadata === 'true',
        include_versions: validatedParams.include_versions === 'true',
      },
    };

    // Format response based on requested format
    if (validatedParams.format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          metadata:
            validatedParams.include_metadata === 'true'
              ? exportMetadata
              : undefined,
          content: filteredContent,
        },
      });
    } else if (validatedParams.format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(
        filteredContent,
        validatedParams.include_metadata === 'true' ? exportMetadata : undefined
      );

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="fandom-${fandomId}-export-${
            new Date().toISOString().split('T')[0]
          }.csv"`,
        },
      });
    } else if (validatedParams.format === 'xml') {
      // Convert to XML format
      const xmlContent = convertToXML(
        filteredContent,
        validatedParams.include_metadata === 'true' ? exportMetadata : undefined
      );

      return new NextResponse(xmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="fandom-${fandomId}-export-${
            new Date().toISOString().split('T')[0]
          }.xml"`,
        },
      });
    }
  } catch (error) {
    console.error('Content export error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid export parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle business logic errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Helper function to convert data to CSV format
function convertToCSV(data: any[], metadata?: any): string {
  if (data.length === 0) {
    return metadata
      ? `# Export Metadata\n# ${JSON.stringify(
          metadata
        )}\n\ntype,name,slug,category,subcategory\n`
      : 'type,name,slug,category,subcategory\n';
  }

  // Create header
  const headers = ['type', 'name', 'slug', 'category', 'subcategory', 'data'];
  let csvContent = '';

  // Add metadata as comments if included
  if (metadata) {
    csvContent += `# Export Metadata\n`;
    csvContent += `# Exported at: ${metadata.exported_at}\n`;
    csvContent += `# Total items: ${metadata.total_items}\n`;
    csvContent += `# Content types: ${metadata.content_types.join(', ')}\n`;
    csvContent += '\n';
  }

  // Add headers
  csvContent += headers.join(',') + '\n';

  // Add data rows
  for (const item of data) {
    const row = [
      item.type || '',
      (item.name || '').replace(/"/g, '""'),
      item.slug || '',
      item.category || '',
      item.subcategory || '',
      JSON.stringify(item.data || {}).replace(/"/g, '""'),
    ];
    csvContent += '"' + row.join('","') + '"\n';
  }

  return csvContent;
}

// Helper function to convert data to XML format
function convertToXML(data: any[], metadata?: any): string {
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xmlContent += '<fandom_export>\n';

  // Add metadata if included
  if (metadata) {
    xmlContent += '  <metadata>\n';
    xmlContent += `    <fandom_id>${metadata.fandom_id}</fandom_id>\n`;
    xmlContent += `    <exported_at>${metadata.exported_at}</exported_at>\n`;
    xmlContent += `    <total_items>${metadata.total_items}</total_items>\n`;
    xmlContent += '    <content_types>\n';
    for (const type of metadata.content_types) {
      xmlContent += `      <type>${type}</type>\n`;
    }
    xmlContent += '    </content_types>\n';
    xmlContent += '  </metadata>\n';
  }

  // Add content items
  xmlContent += '  <content_items>\n';
  for (const item of data) {
    xmlContent += '    <item>\n';
    xmlContent += `      <type>${item.type || ''}</type>\n`;
    xmlContent += `      <name><![CDATA[${item.name || ''}]]></name>\n`;
    xmlContent += `      <slug>${item.slug || ''}</slug>\n`;
    xmlContent += `      <category>${item.category || ''}</category>\n`;
    xmlContent += `      <subcategory>${
      item.subcategory || ''
    }</subcategory>\n`;
    xmlContent += `      <data><![CDATA[${JSON.stringify(
      item.data || {}
    )}]]></data>\n`;
    xmlContent += '    </item>\n';
  }
  xmlContent += '  </content_items>\n';
  xmlContent += '</fandom_export>';

  return xmlContent;
}
