/**
 * Template System Database Queries
 *
 * Database operations for managing fandom templates including creation,
 * application, customization, and usage tracking.
 *
 * @package the-pensive-index
 */

import { eq, and, desc, asc, like, sql, inArray, isNull } from 'drizzle-orm';
import { getDatabase } from './config';
import { fandomTemplates } from './schemas/fandom-template';
import { fandoms } from './schemas/fandom';
import type { FandomTemplate, BulkOperation } from '@/types';

export class TemplateQueries {
  private db = getDatabase();

  /**
   * Create new fandom template
   */
  async createTemplate(
    data: Omit<any, 'id' | 'created_at' | 'updated_at'>
  ): Promise<any> {
    const [newTemplate] = await this.db
      .insert(fandomTemplates)
      .values({
        ...data,
        created_at: sql`datetime('now')`,
        updated_at: sql`datetime('now')`,
      })
      .returning();

    return newTemplate;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: number): Promise<any | null> {
    const result = await this.db
      .select()
      .from(fandomTemplates)
      .where(eq(fandomTemplates.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get template by slug
   */
  async getTemplateBySlug(slug: string): Promise<any | null> {
    const result = await this.db
      .select()
      .from(fandomTemplates)
      .where(eq(fandomTemplates.template_slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * List available templates
   */
  async listTemplates(
    options: {
      genre?: string;
      is_active?: boolean;
      is_public?: boolean;
      created_by?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ templates: any[]; total: number }> {
    const {
      genre,
      is_active = true,
      is_public,
      created_by,
      search,
      limit = 50,
      offset = 0,
    } = options;

    // Build where conditions
    const conditions = [];

    if (genre) {
      conditions.push(eq(fandomTemplates.genre, genre));
    }
    if (typeof is_active === 'boolean') {
      conditions.push(eq(fandomTemplates.is_active, is_active));
    }
    if (typeof is_public === 'boolean') {
      conditions.push(eq(fandomTemplates.is_public, is_public));
    }
    if (created_by) {
      conditions.push(eq(fandomTemplates.created_by, created_by));
    }
    if (search) {
      conditions.push(
        sql`${fandomTemplates.template_name} LIKE ${`%${search}%`} OR
            ${fandomTemplates.description} LIKE ${`%${search}%`}`
      );
    }

    // Get templates with pagination
    const templatesQuery = this.db
      .select()
      .from(fandomTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(fandomTemplates.template_name))
      .limit(limit)
      .offset(offset);

    // Get templates result and count manually
    const templatesResult = await templatesQuery;

    // Get total count by running the same query without pagination
    const allTemplates = await this.db
      .select()
      .from(fandomTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      templates: templatesResult,
      total: allTemplates.length,
    };
  }

  /**
   * Update template
   */
  async updateTemplate(id: number, updates: Partial<any>): Promise<any | null> {
    const [updatedTemplate] = await this.db
      .update(fandomTemplates)
      .set({
        ...updates,
        updated_at: sql`datetime('now')`,
      })
      .where(eq(fandomTemplates.id, id))
      .returning();

    return updatedTemplate || null;
  }

  /**
   * Delete template (soft delete)
   */
  async deactivateTemplate(id: number): Promise<boolean> {
    const result = await this.db
      .update(fandomTemplates)
      .set({
        is_active: false,
        updated_at: sql`datetime('now')`,
      })
      .where(eq(fandomTemplates.id, id));

    return result.changes > 0;
  }

  /**
   * Clone template for customization
   */
  async cloneTemplate(
    originalId: number,
    newTemplateData: {
      template_name: string;
      template_slug: string;
      created_by: string;
      description?: string;
    }
  ): Promise<any | null> {
    return await this.db.transaction(async (tx: any) => {
      // Get original template
      const [originalTemplate] = await tx
        .select()
        .from(fandomTemplates)
        .where(eq(fandomTemplates.id, originalId));

      if (!originalTemplate) return null;

      // Create cloned template
      const [clonedTemplate] = await tx
        .insert(fandomTemplates)
        .values({
          template_name: newTemplateData.template_name,
          template_slug: newTemplateData.template_slug,
          description:
            newTemplateData.description ||
            `Cloned from ${originalTemplate.template_name}`,
          genre: originalTemplate.genre,
          template_data: originalTemplate.template_data,
          configuration: originalTemplate.configuration,
          created_by: newTemplateData.created_by,
          is_public: false, // Cloned templates are private by default
          is_active: true,
          parent_template_id: originalId,
          created_at: sql`datetime('now')`,
          updated_at: sql`datetime('now')`,
        })
        .returning();

      return clonedTemplate;
    });
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(templateId: number): Promise<{
    total_fandoms: number;
    recent_usage: any[];
    popular_customizations: any[];
  }> {
    // Get fandoms using this template
    const fandomsUsingTemplate = await this.db
      .select({
        id: fandoms.id,
        name: fandoms.name,
        created_at: fandoms.created_at,
      })
      .from(fandoms)
      .where(eq(fandoms.template_id, templateId));

    // Get recent usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsage = fandomsUsingTemplate
      .filter(fandom => new Date(fandom.created_at) > thirtyDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);

    return {
      total_fandoms: fandomsUsingTemplate.length,
      recent_usage: recentUsage,
      popular_customizations: [], // TODO: Implement when we have customization tracking
    };
  }

  /**
   * Get templates by genre
   */
  async getTemplatesByGenre(genre: string): Promise<any[]> {
    return await this.db
      .select()
      .from(fandomTemplates)
      .where(
        and(
          eq(fandomTemplates.genre, genre),
          eq(fandomTemplates.is_active, true),
          eq(fandomTemplates.is_public, true)
        )
      )
      .orderBy(asc(fandomTemplates.template_name));
  }

  /**
   * Search templates by content
   */
  async searchTemplates(query: string): Promise<any[]> {
    return await this.db
      .select()
      .from(fandomTemplates)
      .where(
        and(
          sql`(${fandomTemplates.template_name} LIKE ${`%${query}%`} OR
               ${fandomTemplates.description} LIKE ${`%${query}%`} OR
               json_extract(${
                 fandomTemplates.template_data
               }, '$.tags') LIKE ${`%${query}%`})`,
          eq(fandomTemplates.is_active, true),
          eq(fandomTemplates.is_public, true)
        )
      )
      .orderBy(asc(fandomTemplates.template_name));
  }

  /**
   * Get popular templates (most used)
   */
  async getPopularTemplates(limit: number = 10): Promise<any[]> {
    // Get template usage counts
    const templateUsage = await this.db
      .select({
        template_id: fandoms.template_id,
        usage_count: sql`COUNT(*) as usage_count`,
      })
      .from(fandoms)
      .where(sql`${fandoms.template_id} IS NOT NULL`)
      .groupBy(fandoms.template_id)
      .orderBy(sql`usage_count DESC`)
      .limit(limit);

    // Get template details for the most popular ones
    if (templateUsage.length === 0) return [];

    const templateIds = templateUsage.map(t => t.template_id).filter(Boolean);

    const templates = await this.db
      .select()
      .from(fandomTemplates)
      .where(
        and(
          inArray(fandomTemplates.id, templateIds),
          eq(fandomTemplates.is_active, true),
          eq(fandomTemplates.is_public, true)
        )
      );

    // Combine usage data with template details
    return templates
      .map(template => {
        const usage = templateUsage.find(u => u.template_id === template.id);
        return {
          ...template,
          usage_count: Number(usage?.usage_count || 0),
        };
      })
      .sort((a, b) => b.usage_count - a.usage_count);
  }

  /**
   * Get template hierarchy (parent/child relationships)
   */
  async getTemplateHierarchy(templateId: number): Promise<{
    parent: any | null;
    children: any[];
    siblings: any[];
  }> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      return { parent: null, children: [], siblings: [] };
    }

    // Get parent template
    let parent = null;
    if (template.parent_template_id) {
      parent = await this.getTemplateById(template.parent_template_id);
    }

    // Get child templates
    const children = await this.db
      .select()
      .from(fandomTemplates)
      .where(
        and(
          eq(fandomTemplates.parent_template_id, templateId),
          eq(fandomTemplates.is_active, true)
        )
      )
      .orderBy(asc(fandomTemplates.template_name));

    // Get sibling templates (same parent)
    let siblings = [];
    if (template.parent_template_id) {
      siblings = await this.db
        .select()
        .from(fandomTemplates)
        .where(
          and(
            eq(fandomTemplates.parent_template_id, template.parent_template_id),
            sql`${fandomTemplates.id} != ${templateId}`,
            eq(fandomTemplates.is_active, true)
          )
        )
        .orderBy(asc(fandomTemplates.template_name));
    }

    return {
      parent,
      children,
      siblings,
    };
  }

  /**
   * Validate template configuration
   */
  async validateTemplate(templateId: number): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      return {
        is_valid: false,
        errors: ['Template not found'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!template.template_name || template.template_name.trim() === '') {
      errors.push('Template name is required');
    }

    if (!template.template_slug || template.template_slug.trim() === '') {
      errors.push('Template slug is required');
    }

    if (!template.genre || template.genre.trim() === '') {
      errors.push('Genre is required');
    }

    // Validate template_data structure
    try {
      const templateData = template.template_data;
      if (!templateData || typeof templateData !== 'object') {
        errors.push('Template data must be a valid JSON object');
      } else {
        // Check for required template data fields
        if (!templateData.tags || !Array.isArray(templateData.tags)) {
          warnings.push('Template should include a tags array');
        }

        if (
          !templateData.plotBlocks ||
          !Array.isArray(templateData.plotBlocks)
        ) {
          warnings.push('Template should include a plotBlocks array');
        }
      }
    } catch (e) {
      errors.push('Template data is not valid JSON');
    }

    // Check for duplicate slugs
    const duplicateSlug = await this.db
      .select()
      .from(fandomTemplates)
      .where(
        and(
          eq(fandomTemplates.template_slug, template.template_slug),
          sql`${fandomTemplates.id} != ${templateId}`,
          eq(fandomTemplates.is_active, true)
        )
      )
      .limit(1);

    if (duplicateSlug.length > 0) {
      errors.push('Template slug must be unique');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
