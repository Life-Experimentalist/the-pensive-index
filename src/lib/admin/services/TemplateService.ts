/**
 * Template Service
 *
 * Orchestrates template management including creation, validation,
 * usage tracking, and template application workflows.
 *
 * @package the-pensive-index
 */

import { TemplateQueries } from '@/lib/database/template-queries';
import { FandomQueries } from '@/lib/database/fandom-queries';
import type { FandomTemplate, BulkOperation } from '@/types';

export interface TemplateCreationOptions {
  template_name: string;
  template_slug?: string;
  description?: string;
  genre: string;
  template_data: any;
  configuration?: any;
  created_by: string;
  is_public?: boolean;
  parent_template_id?: number;
}

export class TemplateService {
  private templateQueries: TemplateQueries;
  private fandomQueries: FandomQueries;

  constructor() {
    this.templateQueries = new TemplateQueries();
    this.fandomQueries = new FandomQueries();
  }

  /**
   * Create new template
   */
  async createTemplate(options: TemplateCreationOptions): Promise<{
    template: any;
    validation_results: {
      is_valid: boolean;
      errors: string[];
      warnings: string[];
    };
  }> {
    // Validate template options
    const validation = await this.validateTemplateOptions(options);
    if (!validation.is_valid) {
      return {
        template: null,
        validation_results: validation,
      };
    }

    try {
      // Generate slug if not provided
      const templateSlug =
        options.template_slug || this.generateSlug(options.template_name);

      // Create template
      const template = await this.templateQueries.createTemplate({
        template_name: options.template_name,
        template_slug: templateSlug,
        description: options.description || '',
        genre: options.genre,
        template_data: options.template_data,
        configuration: options.configuration || {},
        created_by: options.created_by,
        is_public: options.is_public || false,
        is_active: true,
        parent_template_id: options.parent_template_id || null,
      });

      return {
        template,
        validation_results: {
          is_valid: true,
          errors: [],
          warnings: validation.warnings,
        },
      };
    } catch (error) {
      return {
        template: null,
        validation_results: {
          is_valid: false,
          errors: [`Template creation failed: ${error}`],
          warnings: [],
        },
      };
    }
  }

  /**
   * Get template with usage statistics
   */
  async getTemplate(templateId: number): Promise<{
    template: any;
    usage_stats: any;
    hierarchy: any;
  }> {
    const template = await this.templateQueries.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const [usageStats, hierarchy] = await Promise.all([
      this.templateQueries.getTemplateUsage(templateId),
      this.templateQueries.getTemplateHierarchy(templateId),
    ]);

    return {
      template,
      usage_stats: usageStats,
      hierarchy,
    };
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: number,
    updates: Partial<TemplateCreationOptions>
  ): Promise<{
    template: any;
    validation_results: {
      is_valid: boolean;
      errors: string[];
      warnings: string[];
    };
  }> {
    try {
      // Validate updates
      const validation = await this.validateTemplateUpdates(
        templateId,
        updates
      );
      if (!validation.is_valid) {
        return {
          template: null,
          validation_results: validation,
        };
      }

      // Update template
      const template = await this.templateQueries.updateTemplate(
        templateId,
        updates
      );

      return {
        template,
        validation_results: {
          is_valid: true,
          errors: [],
          warnings: validation.warnings,
        },
      };
    } catch (error) {
      return {
        template: null,
        validation_results: {
          is_valid: false,
          errors: [`Template update failed: ${error}`],
          warnings: [],
        },
      };
    }
  }

  /**
   * Clone template
   */
  async cloneTemplate(
    originalId: number,
    newTemplateData: {
      template_name: string;
      template_slug?: string;
      created_by: string;
      description?: string;
    }
  ): Promise<{
    template: any;
    validation_results: {
      is_valid: boolean;
      errors: string[];
      warnings: string[];
    };
  }> {
    try {
      const templateSlug =
        newTemplateData.template_slug ||
        this.generateSlug(newTemplateData.template_name);

      const template = await this.templateQueries.cloneTemplate(originalId, {
        ...newTemplateData,
        template_slug: templateSlug,
      });

      if (template) {
        return {
          template,
          validation_results: {
            is_valid: true,
            errors: [],
            warnings: [],
          },
        };
      } else {
        return {
          template: null,
          validation_results: {
            is_valid: false,
            errors: ['Failed to clone template'],
            warnings: [],
          },
        };
      }
    } catch (error) {
      return {
        template: null,
        validation_results: {
          is_valid: false,
          errors: [`Template cloning failed: ${error}`],
          warnings: [],
        },
      };
    }
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<any[]> {
    return await this.templateQueries.getPopularTemplates(limit);
  }

  /**
   * Search templates
   */
  async searchTemplates(
    query: string,
    filters: {
      genre?: string;
      is_public?: boolean;
      created_by?: string;
    } = {}
  ): Promise<any[]> {
    if (query) {
      return await this.templateQueries.searchTemplates(query);
    }

    const result = await this.templateQueries.listTemplates(filters);
    return result.templates;
  }

  /**
   * Get templates by genre
   */
  async getTemplatesByGenre(genre: string): Promise<any[]> {
    return await this.templateQueries.getTemplatesByGenre(genre);
  }

  /**
   * Validate template
   */
  async validateTemplate(templateId: number): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return await this.templateQueries.validateTemplate(templateId);
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(templateId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if template is in use
      const usageStats = await this.templateQueries.getTemplateUsage(
        templateId
      );
      if (usageStats.total_fandoms > 0) {
        return {
          success: false,
          message: `Cannot delete template: it is being used by ${usageStats.total_fandoms} fandoms`,
        };
      }

      const success = await this.templateQueries.deactivateTemplate(templateId);

      return {
        success,
        message: success
          ? 'Template successfully deleted'
          : 'Failed to delete template',
      };
    } catch (error) {
      return {
        success: false,
        message: `Template deletion failed: ${error}`,
      };
    }
  }

  /**
   * Get template usage analytics
   */
  async getTemplateAnalytics(): Promise<{
    total_templates: number;
    public_templates: number;
    private_templates: number;
    by_genre: Record<string, number>;
    most_popular: any[];
    recent_activity: any[];
  }> {
    // Get all templates
    const allTemplates = await this.templateQueries.listTemplates({
      limit: 1000,
    });

    // Calculate statistics
    const stats = {
      total_templates: allTemplates.templates.length,
      public_templates: 0,
      private_templates: 0,
      by_genre: {} as Record<string, number>,
      most_popular: [] as any[],
      recent_activity: [] as any[],
    };

    // Process template data
    for (const template of allTemplates.templates) {
      // Count public/private
      if (template.is_public) {
        stats.public_templates++;
      } else {
        stats.private_templates++;
      }

      // Count by genre
      const genre = template.genre || 'unknown';
      stats.by_genre[genre] = (stats.by_genre[genre] || 0) + 1;
    }

    // Get popular templates
    stats.most_popular = await this.getPopularTemplates(5);

    // Get recent templates (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    stats.recent_activity = allTemplates.templates
      .filter(template => new Date(template.created_at) > sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10);

    return stats;
  }

  /**
   * Validate template creation options
   */
  private async validateTemplateOptions(
    options: TemplateCreationOptions
  ): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!options.template_name || options.template_name.trim() === '') {
      errors.push('Template name is required');
    }

    if (!options.genre || options.genre.trim() === '') {
      errors.push('Genre is required');
    }

    if (!options.created_by || options.created_by.trim() === '') {
      errors.push('Creator ID is required');
    }

    if (!options.template_data || typeof options.template_data !== 'object') {
      errors.push('Template data must be a valid object');
    }

    // Validate slug if provided
    if (options.template_slug && !/^[a-z0-9-]+$/.test(options.template_slug)) {
      errors.push(
        'Template slug must contain only lowercase letters, numbers, and hyphens'
      );
    }

    // Check for duplicate slug
    const slug =
      options.template_slug || this.generateSlug(options.template_name);
    const existingTemplate = await this.templateQueries.getTemplateBySlug(slug);
    if (existingTemplate) {
      errors.push('A template with this slug already exists');
    }

    // Validate parent template if specified
    if (options.parent_template_id) {
      const parentTemplate = await this.templateQueries.getTemplateById(
        options.parent_template_id
      );
      if (!parentTemplate) {
        errors.push('Specified parent template does not exist');
      } else if (!parentTemplate.is_active) {
        errors.push('Cannot use inactive template as parent');
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate template updates
   */
  private async validateTemplateUpdates(
    templateId: number,
    updates: Partial<TemplateCreationOptions>
  ): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if template exists
    const template = await this.templateQueries.getTemplateById(templateId);
    if (!template) {
      errors.push('Template not found');
      return { is_valid: false, errors, warnings };
    }

    // Validate slug if being updated
    if (updates.template_slug) {
      if (!/^[a-z0-9-]+$/.test(updates.template_slug)) {
        errors.push(
          'Template slug must contain only lowercase letters, numbers, and hyphens'
        );
      } else {
        // Check for duplicate slug (excluding current template)
        const existingTemplate = await this.templateQueries.getTemplateBySlug(
          updates.template_slug
        );
        if (existingTemplate && existingTemplate.id !== templateId) {
          errors.push('A template with this slug already exists');
        }
      }
    }

    // Validate template_data if being updated
    if (updates.template_data && typeof updates.template_data !== 'object') {
      errors.push('Template data must be a valid object');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
