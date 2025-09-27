/**
 * Fandom Database Queries
 *
 * Database operations for fandom management including creation,
 * template application, and content population.
 *
 * @package the-pensive-index
 */

import { eq, and, desc, asc, like, sql, inArray } from 'drizzle-orm';
import { getDatabase } from './config';
import { fandoms, type Fandom, type NewFandom } from '@/lib/database/schema';
import { fandomContentItems } from './schemas/fandom-content';
import { fandomTemplates } from './schemas/fandom-template';
// FandomTemplate type will be defined later

export class FandomQueries {
  private db = getDatabase();

  /**
   * Create a new fandom
   */
  async createFandom(data: NewFandom): Promise<Fandom> {
    const [newFandom] = await this.db
      .insert(fandoms)
      .values({
        ...data,
        created_at: sql`datetime('now')`,
        updated_at: sql`datetime('now')`,
      })
      .returning();

    return newFandom;
  }

  /**
   * Get fandom by ID
   */
  async getFandomById(id: string): Promise<Fandom | null> {
    const result = await this.db
      .select()
      .from(fandoms)
      .where(eq(fandoms.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get fandom by slug
   */
  async getFandomBySlug(slug: string): Promise<Fandom | null> {
    const result = await this.db
      .select()
      .from(fandoms)
      .where(eq(fandoms.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * List all fandoms with optional filtering
   */
  async listFandoms(
    options: {
      active_only?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
      order_by?: 'name' | 'created_at' | 'updated_at';
      order_direction?: 'asc' | 'desc';
    } = {}
  ): Promise<{ fandoms: Fandom[]; total: number }> {
    const {
      active_only = false,
      search,
      limit = 50,
      offset = 0,
      order_by = 'name',
      order_direction = 'asc',
    } = options;

    // Build where conditions
    const conditions = [];
    if (active_only) {
      conditions.push(eq(fandoms.is_active, true));
    }
    if (search) {
      conditions.push(
        sql`${fandoms.name} LIKE ${`%${search}%`} OR ${
          fandoms.description
        } LIKE ${`%${search}%`}`
      );
    }

    // Build order clause
    const orderColumn = fandoms[order_by];
    const orderClause =
      order_direction === 'desc' ? desc(orderColumn) : asc(orderColumn);

    // Get fandoms with pagination
    const fandomsQuery = this.db
      .select()
      .from(fandoms)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countQuery = this.db
      .select()
      .from(fandoms)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const [fandomsResult, countResult] = await Promise.all([
      fandomsQuery,
      countQuery,
    ]);

    return {
      fandoms: fandomsResult,
      total: countResult.length,
    };
  }

  /**
   * Update fandom
   */
  async updateFandom(
    id: string,
    updates: Partial<Omit<Fandom, 'id' | 'created_at'>>
  ): Promise<Fandom | null> {
    const [updatedFandom] = await this.db
      .update(fandoms)
      .set({
        ...updates,
        updated_at: sql`datetime('now')`,
      })
      .where(eq(fandoms.id, id))
      .returning();

    return updatedFandom || null;
  }

  /**
   * Soft delete fandom (deactivate)
   */
  async deactivateFandom(id: string): Promise<boolean> {
    const result = await this.db
      .update(fandoms)
      .set({
        is_active: false,
        updated_at: sql`datetime('now')`,
      })
      .where(eq(fandoms.id, id));

    return result.changes > 0;
  }

  /**
   * Hard delete fandom (use with caution)
   */
  async deleteFandom(id: string): Promise<boolean> {
    const result = await this.db.delete(fandoms).where(eq(fandoms.id, id));

    return result.changes > 0;
  }

  /**
   * Check if fandom name exists
   */
  async fandomNameExists(name: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(fandoms.name, name)];
    if (excludeId) {
      conditions.push(sql`${fandoms.id} != ${excludeId}`);
    }

    const result = await this.db
      .select()
      .from(fandoms)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Check if fandom slug exists
   */
  async fandomSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(fandoms.slug, slug)];
    if (excludeId) {
      conditions.push(sql`${fandoms.id} != ${excludeId}`);
    }

    const result = await this.db
      .select()
      .from(fandoms)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get fandom statistics
   */
  async getFandomStats(id: string): Promise<{
    content_count: {
      tags: number;
      plot_blocks: number;
      validation_rules: number;
      total: number;
    };
    created_at: string;
    last_updated: string;
    is_active: boolean;
  } | null> {
    // Get fandom basic info
    const fandom = await this.getFandomById(id);
    if (!fandom) {
      return null;
    }

    // Get content counts - simplified approach for now
    const allContent = await this.db
      .select()
      .from(fandomContentItems)
      .where(eq(fandomContentItems.fandom_id, parseInt(id)));

    // Process content counts manually
    const counts = {
      tags: 0,
      plot_blocks: 0,
      validation_rules: 0,
      total: 0,
    };

    for (const item of allContent) {
      counts.total += 1;

      switch (item.content_type) {
        case 'tag':
          counts.tags += 1;
          break;
        case 'plot_block':
          counts.plot_blocks += 1;
          break;
        case 'validation_rule':
          counts.validation_rules += 1;
          break;
      }
    }

    return {
      content_count: counts,
      created_at: fandom.created_at.toISOString(),
      last_updated: fandom.updated_at.toISOString(),
      is_active: fandom.is_active,
    };
  }

  /**
   * Create fandom from template
   */
  async createFandomFromTemplate(
    fandomData: NewFandom,
    templateId: number,
    customizations?: {
      exclude_tags?: string[];
      add_tags?: Array<{
        name: string;
        category: string;
        description?: string;
      }>;
      modify_validation?: Record<string, any>;
    }
  ): Promise<{
    fandom: Fandom;
    applied_template: any;
    content_created: {
      tags: number;
      plot_blocks: number;
      validation_rules: number;
    };
  }> {
    return await (this.db as any).transaction(async (tx: any) => {
      // Create the fandom first
      const [newFandom] = await tx
        .insert(fandoms)
        .values({
          ...fandomData,
          created_at: sql`datetime('now')`,
          updated_at: sql`datetime('now')`,
        })
        .returning();

      // Get template configuration
      const [template] = await tx
        .select()
        .from(fandomTemplates)
        .where(eq(fandomTemplates.id, templateId));

      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }

      // Parse template configuration
      const config = template.configuration;
      const contentCreated = {
        tags: 0,
        plot_blocks: 0,
        validation_rules: 0,
      };

      // Create default tags from template
      if (config.default_tags && Array.isArray(config.default_tags)) {
        const tagsToCreate = config.default_tags.filter(
          (tag: any) => !customizations?.exclude_tags?.includes(tag.name)
        );

        for (const tagConfig of tagsToCreate) {
          await tx.insert(fandomContentItems).values({
            fandom_id: newFandom.id,
            content_type: 'tag',
            content_name: tagConfig.name,
            content_slug: tagConfig.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-'),
            content_data: JSON.stringify({
              name: tagConfig.name,
              description: tagConfig.description,
              category: tagConfig.category,
              tag_class: tagConfig.tag_class,
            }),
            category: tagConfig.category,
            is_active: true,
            created_by: 'system',
            created_at: sql`datetime('now')`,
            updated_at: sql`datetime('now')`,
          });
          contentCreated.tags++;
        }
      }

      // Create default plot blocks from template
      if (
        config.default_plot_blocks &&
        Array.isArray(config.default_plot_blocks)
      ) {
        for (const plotConfig of config.default_plot_blocks) {
          await tx.insert(fandomContentItems).values({
            fandom_id: newFandom.id,
            content_type: 'plot_block',
            content_name: plotConfig.name,
            content_slug: plotConfig.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-'),
            content_data: JSON.stringify({
              name: plotConfig.name,
              description: plotConfig.description,
              category: plotConfig.category,
              conditions: plotConfig.conditions || [],
            }),
            category: plotConfig.category,
            is_active: true,
            created_by: 'system',
            created_at: sql`datetime('now')`,
            updated_at: sql`datetime('now')`,
          });
          contentCreated.plot_blocks++;
        }
      }

      // Add any custom tags
      if (customizations?.add_tags) {
        for (const tagConfig of customizations.add_tags) {
          await tx.insert(fandomContentItems).values({
            fandom_id: newFandom.id,
            content_type: 'tag',
            content_name: tagConfig.name,
            content_slug: tagConfig.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-'),
            content_data: JSON.stringify({
              name: tagConfig.name,
              description: tagConfig.description,
              category: tagConfig.category,
            }),
            category: tagConfig.category,
            is_active: true,
            created_by: 'system',
            created_at: sql`datetime('now')`,
            updated_at: sql`datetime('now')`,
          });
          contentCreated.tags++;
        }
      }

      // Update template usage count
      await tx
        .update(fandomTemplates)
        .set({
          usage_count: sql`${fandomTemplates.usage_count} + 1`,
          updated_at: sql`datetime('now')`,
        })
        .where(eq(fandomTemplates.id, templateId));

      return {
        fandom: newFandom,
        applied_template: template,
        content_created: contentCreated,
      };
    });
  }

  /**
   * Get fandoms created from a specific template
   */
  getFandomsByTemplate(templateId: number): Promise<Fandom[]> {
    // This would require storing template_id in fandoms table
    // For now, we'll return empty array as this is a future enhancement
    return Promise.resolve([]);
  }

  /**
   * Search fandoms by content
   */
  async searchFandomsByContent(
    query: string,
    contentTypes?: string[]
  ): Promise<Fandom[]> {
    const conditions = [];

    if (contentTypes && contentTypes.length > 0) {
      conditions.push(inArray(fandomContentItems.content_type, contentTypes));
    }

    conditions.push(
      sql`${fandomContentItems.content_name} LIKE ${`%${query}%`} OR
          json_extract(${
            fandomContentItems.content_data
          }, '$.description') LIKE ${`%${query}%`}`
    );

    const result = await this.db
      .select()
      .from(fandomContentItems)
      .innerJoin(fandoms, eq(fandomContentItems.fandom_id, fandoms.id))
      .where(and(...conditions))
      .groupBy(fandoms.id)
      .orderBy(fandoms.name);

    return result.map(row => row.fandoms);
  }
}
