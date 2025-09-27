import { eq, and, asc, desc, like, sql } from 'drizzle-orm';
import { getDatabase } from './config';
import { fandoms, type Fandom } from './schema';
import type { BulkOperation } from '@/types';

/**
 * @description Template System Database Queries
 * Database operations for managing fandoms, which are treated as templates
 * for creating new story pathways. This file adapts the original template
 * query structure to work with the existing 'fandoms' schema.
 * @package the-pensive-index
 */
export class TemplateQueries {
  private db = getDatabase();

  /**
   * @description Creates a new fandom, treating it as a template.
   * @param data - The data for the new fandom.
   * @returns The newly created fandom.
   */
  async createTemplate(
    data: Omit<Fandom, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Fandom> {
    const [newTemplate] = await this.db
      .insert(fandoms)
      .values({
        ...data,
        created_at: sql`(unixepoch())`,
        updated_at: sql`(unixepoch())`,
      })
      .returning();
    return newTemplate;
  }

  /**
   * @description Retrieves a fandom by its ID.
   * @param id - The UUID of the fandom.
   * @returns The fandom object or null if not found.
   */
  async getTemplateById(id: string): Promise<Fandom | null> {
    const result = await this.db
      .select()
      .from(fandoms)
      .where(eq(fandoms.id, id))
      .limit(1);
    return result[0] || null;
  }

  /**
   * @description Retrieves a fandom by its slug.
   * @param slug - The slug of the fandom.
   * @returns The fandom object or null if not found.
   */
  async getTemplateBySlug(slug: string): Promise<Fandom | null> {
    const result = await this.db
      .select()
      .from(fandoms)
      .where(eq(fandoms.slug, slug))
      .limit(1);
    return result[0] || null;
  }

  /**
   * @description Lists available fandoms with filtering and pagination.
   * @param options - Filtering and pagination options.
   * @returns A list of fandoms and the total count.
   */
  async listTemplates(
    options: {
      is_active?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ templates: Fandom[]; total: number }> {
    const { is_active, search, limit = 50, offset = 0 } = options;

    const conditions = [];
    if (typeof is_active === 'boolean') {
      conditions.push(eq(fandoms.is_active, is_active));
    }
    if (search) {
      conditions.push(like(fandoms.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const templatesResult = await this.db
      .select()
      .from(fandoms)
      .where(whereClause)
      .orderBy(asc(fandoms.name))
      .limit(limit)
      .offset(offset);

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(fandoms)
      .where(whereClause);

    return {
      templates: templatesResult,
      total: totalResult[0]?.count || 0,
    };
  }

  /**
   * @description Updates an existing fandom.
   * @param id - The UUID of the fandom to update.
   * @param data - The data to update.
   * @returns The updated fandom object or null if not found.
   */
  async updateTemplate(
    id: string,
    data: Partial<Omit<Fandom, 'id' | 'created_at'>>
  ): Promise<Fandom | null> {
    const [updatedTemplate] = await this.db
      .update(fandoms)
      .set({
        ...data,
        updated_at: sql`(unixepoch())`,
      })
      .where(eq(fandoms.id, id))
      .returning();
    return updatedTemplate || null;
  }

  /**
   * @description Deletes a fandom.
   * @param id - The UUID of the fandom to delete.
   * @returns True if the deletion was successful, false otherwise.
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(fandoms).where(eq(fandoms.id, id));
    return result.changes > 0;
  }

  /**
   * @description Searches for active fandoms by a query string.
   * @param query - The search query.
   * @param options - Search options, like limit.
   * @returns A list of matching fandoms.
   */
  async searchTemplates(
    query: string,
    options: { limit?: number } = {}
  ): Promise<Fandom[]> {
    const { limit = 20 } = options;
    return this.db
      .select()
      .from(fandoms)
      .where(and(eq(fandoms.is_active, true), like(fandoms.name, `%${query}%`)))
      .orderBy(asc(fandoms.name))
      .limit(limit);
  }

  /**
   * @description Gets basic statistics about fandoms.
   * @returns The total number of active fandoms.
   */
  async getTemplateStats(): Promise<{ total: number }> {
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(fandoms)
      .where(eq(fandoms.is_active, true));

    return {
      total: totalResult[0]?.count || 0,
    };
  }
}
