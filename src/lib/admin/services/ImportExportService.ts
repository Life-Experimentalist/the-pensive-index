/**
 * Import/Export Service
 *
 * Handles bulk content import/export operations with validation
 * and progress tracking.
 *
 * @package the-pensive-index
 */

import { ContentQueries } from '@/lib/database/content-queries';
import { FandomQueries } from '@/lib/database/fandom-queries';

export class ImportExportService {
  private contentQueries: ContentQueries;
  private fandomQueries: FandomQueries;

  constructor() {
    this.contentQueries = new ContentQueries();
    this.fandomQueries = new FandomQueries();
  }

  /**
   * Import content from JSON
   */
  async importContent(
    fandomId: number,
    contentData: any[],
    importedBy: string
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of contentData) {
      try {
        await this.contentQueries.createContentItem({
          fandom_id: fandomId,
          content_type: item.type,
          content_name: item.name,
          content_slug: item.slug || this.generateSlug(item.name),
          content_data: item.data,
          category: item.category,
          submitted_by: importedBy,
          status: 'draft',
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to import ${item.name}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Export content to JSON
   */
  async exportContent(fandomId: number): Promise<any[]> {
    const result = await this.contentQueries.getContentByFandom(fandomId, {
      active_only: true,
      limit: 1000,
    });

    return result.content.map(item => ({
      type: item.content_type,
      name: item.content_name,
      slug: item.content_slug,
      data: item.content_data,
      category: item.category,
      subcategory: item.subcategory,
    }));
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
