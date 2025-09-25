/**
 * Fandom Creation Service
 *
 * Orchestrates the complete fandom creation process including template application,
 * validation, content population, and approval workflows.
 *
 * @package the-pensive-index
 */

import { FandomQueries } from '@/lib/database/fandom-queries';
import { TemplateQueries } from '@/lib/database/template-queries';
import { ContentQueries } from '@/lib/database/content-queries';
import { ApprovalQueries } from '@/lib/database/approval-queries';
import type { FandomTemplate, ContentVersion, BulkOperation } from '@/types';

export interface FandomCreationOptions {
  // Basic fandom information
  name: string;
  slug: string;
  description?: string;

  // Template-based creation
  template_id?: number;
  template_customizations?: Record<string, any>;

  // Manual creation
  genre?: string;
  initial_content?: {
    tags?: any[];
    plotBlocks?: any[];
    characters?: any[];
    validationRules?: any[];
  };

  // Approval workflow
  require_approval?: boolean;
  auto_populate?: boolean;

  // Creator information
  created_by: string;
}

export interface FandomCreationResult {
  fandom: any;
  content_items: any[];
  template_applied?: any;
  approval_required: boolean;
  approval_requests?: any[];
  validation_results: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class FandomCreationService {
  private fandomQueries: FandomQueries;
  private templateQueries: TemplateQueries;
  private contentQueries: ContentQueries;
  private approvalQueries: ApprovalQueries;

  constructor() {
    this.fandomQueries = new FandomQueries();
    this.templateQueries = new TemplateQueries();
    this.contentQueries = new ContentQueries();
    this.approvalQueries = new ApprovalQueries();
  }

  /**
   * Create new fandom with template or manual setup
   */
  async createFandom(
    options: FandomCreationOptions
  ): Promise<FandomCreationResult> {
    // Validate input options
    const validationResult = await this.validateCreationOptions(options);
    if (!validationResult.is_valid) {
      return {
        fandom: null,
        content_items: [],
        approval_required: false,
        validation_results: validationResult,
      };
    }

    try {
      let result: FandomCreationResult;

      if (options.template_id) {
        // Create from template
        result = await this.createFromTemplate(options);
      } else {
        // Create manually
        result = await this.createManually(options);
      }

      // Handle approval workflow if required
      if (options.require_approval && result.fandom) {
        result.approval_requests = await this.submitForApproval(
          result.fandom,
          result.content_items,
          options.created_by
        );
      }

      return result;
    } catch (error) {
      return {
        fandom: null,
        content_items: [],
        approval_required: options.require_approval || false,
        validation_results: {
          is_valid: false,
          errors: [`Creation failed: ${error}`],
          warnings: [],
        },
      };
    }
  }

  /**
   * Create fandom from template
   */
  private async createFromTemplate(
    options: FandomCreationOptions
  ): Promise<FandomCreationResult> {
    // Get template
    const template = await this.templateQueries.getTemplateById(
      options.template_id!
    );
    if (!template) {
      return {
        fandom: null,
        content_items: [],
        approval_required: false,
        validation_results: {
          is_valid: false,
          errors: ['Template not found'],
          warnings: [],
        },
      };
    }

    // Validate template
    const templateValidation = await this.templateQueries.validateTemplate(
      template.id
    );
    if (!templateValidation.is_valid) {
      return {
        fandom: null,
        content_items: [],
        approval_required: false,
        validation_results: templateValidation,
      };
    }

    // Create fandom using template
    const fandom = await this.fandomQueries.createFandomFromTemplate({
      name: options.name,
      slug: options.slug,
      description: options.description,
      template_id: template.id,
      customizations: options.template_customizations || {},
      created_by: options.created_by,
    });

    // Get populated content items
    const contentItems = await this.getCreatedContentItems(fandom.id);

    return {
      fandom,
      content_items: contentItems,
      template_applied: template,
      approval_required: options.require_approval || false,
      validation_results: {
        is_valid: true,
        errors: [],
        warnings: templateValidation.warnings,
      },
    };
  }

  /**
   * Create fandom manually without template
   */
  private async createManually(
    options: FandomCreationOptions
  ): Promise<FandomCreationResult> {
    // Create basic fandom
    const fandom = await this.fandomQueries.createFandom({
      name: options.name,
      slug: options.slug,
      description: options.description || '',
      genre: options.genre || 'general',
      created_by: options.created_by,
      template_id: null,
      is_active: true,
    });

    let contentItems: any[] = [];

    // Populate initial content if provided
    if (options.initial_content && options.auto_populate) {
      contentItems = await this.populateInitialContent(
        fandom.id,
        options.initial_content,
        options.created_by
      );
    }

    return {
      fandom,
      content_items: contentItems,
      approval_required: options.require_approval || false,
      validation_results: {
        is_valid: true,
        errors: [],
        warnings: [],
      },
    };
  }

  /**
   * Populate fandom with initial content
   */
  private async populateInitialContent(
    fandomId: number,
    initialContent: NonNullable<FandomCreationOptions['initial_content']>,
    createdBy: string
  ): Promise<any[]> {
    const contentItems: any[] = [];

    // Create tags
    if (initialContent.tags) {
      for (const tag of initialContent.tags) {
        const contentItem = await this.contentQueries.createContentItem({
          fandom_id: fandomId,
          content_type: 'tag',
          content_name: tag.name || tag,
          content_slug: this.generateSlug(tag.name || tag),
          content_data: typeof tag === 'object' ? tag : { name: tag },
          category: tag.category || 'general',
          submitted_by: createdBy,
          status: 'draft',
        });
        contentItems.push(contentItem);
      }
    }

    // Create plot blocks
    if (initialContent.plotBlocks) {
      for (const plotBlock of initialContent.plotBlocks) {
        const contentItem = await this.contentQueries.createContentItem({
          fandom_id: fandomId,
          content_type: 'plot_block',
          content_name: plotBlock.name || plotBlock,
          content_slug: this.generateSlug(plotBlock.name || plotBlock),
          content_data:
            typeof plotBlock === 'object' ? plotBlock : { name: plotBlock },
          category: plotBlock.category || 'general',
          submitted_by: createdBy,
          status: 'draft',
        });
        contentItems.push(contentItem);
      }
    }

    // Create characters
    if (initialContent.characters) {
      for (const character of initialContent.characters) {
        const contentItem = await this.contentQueries.createContentItem({
          fandom_id: fandomId,
          content_type: 'character',
          content_name: character.name || character,
          content_slug: this.generateSlug(character.name || character),
          content_data:
            typeof character === 'object' ? character : { name: character },
          category: character.category || 'main',
          submitted_by: createdBy,
          status: 'draft',
        });
        contentItems.push(contentItem);
      }
    }

    // Create validation rules
    if (initialContent.validationRules) {
      for (const rule of initialContent.validationRules) {
        const contentItem = await this.contentQueries.createContentItem({
          fandom_id: fandomId,
          content_type: 'validation_rule',
          content_name: rule.name || rule,
          content_slug: this.generateSlug(rule.name || rule),
          content_data: typeof rule === 'object' ? rule : { rule: rule },
          category: rule.category || 'general',
          submitted_by: createdBy,
          status: 'draft',
        });
        contentItems.push(contentItem);
      }
    }

    return contentItems;
  }

  /**
   * Submit fandom and content for approval
   */
  private async submitForApproval(
    fandom: any,
    contentItems: any[],
    submittedBy: string
  ): Promise<any[]> {
    const approvalRequests: any[] = [];

    // Submit each content item for approval
    for (const contentItem of contentItems) {
      const approval = await this.approvalQueries.createApprovalRequest({
        content_item_id: contentItem.id,
        approval_status: 'pending',
        priority: 'normal',
        submitted_by: submittedBy,
      });
      approvalRequests.push(approval);
    }

    return approvalRequests;
  }

  /**
   * Get content items created for a fandom
   */
  private async getCreatedContentItems(fandomId: number): Promise<any[]> {
    const result = await this.contentQueries.getContentByFandom(fandomId, {
      active_only: false,
      limit: 1000, // Get all content items
    });

    return result.content;
  }

  /**
   * Validate fandom creation options
   */
  private async validateCreationOptions(
    options: FandomCreationOptions
  ): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!options.name || options.name.trim() === '') {
      errors.push('Fandom name is required');
    }

    if (!options.slug || options.slug.trim() === '') {
      errors.push('Fandom slug is required');
    }

    if (!options.created_by || options.created_by.trim() === '') {
      errors.push('Creator ID is required');
    }

    // Validate slug format
    if (options.slug && !/^[a-z0-9-]+$/.test(options.slug)) {
      errors.push(
        'Slug must contain only lowercase letters, numbers, and hyphens'
      );
    }

    // Check for existing fandom with same slug
    if (options.slug) {
      const existingFandom = await this.fandomQueries.getFandomBySlug(
        options.slug
      );
      if (existingFandom) {
        errors.push('A fandom with this slug already exists');
      }
    }

    // Validate template if specified
    if (options.template_id) {
      const template = await this.templateQueries.getTemplateById(
        options.template_id
      );
      if (!template) {
        errors.push('Specified template does not exist');
      } else if (!template.is_active) {
        errors.push('Specified template is not active');
      } else if (!template.is_public) {
        warnings.push('Using a private template');
      }
    }

    // Validate mutual exclusivity
    if (options.template_id && options.initial_content) {
      warnings.push(
        'Both template and initial content provided. Template will take precedence.'
      );
    }

    // Validate initial content structure
    if (options.initial_content) {
      if (
        options.initial_content.tags &&
        !Array.isArray(options.initial_content.tags)
      ) {
        errors.push('Initial content tags must be an array');
      }
      if (
        options.initial_content.plotBlocks &&
        !Array.isArray(options.initial_content.plotBlocks)
      ) {
        errors.push('Initial content plot blocks must be an array');
      }
      if (
        options.initial_content.characters &&
        !Array.isArray(options.initial_content.characters)
      ) {
        errors.push('Initial content characters must be an array');
      }
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

  /**
   * Get fandom creation status
   */
  async getFandomCreationStatus(fandomId: number): Promise<{
    fandom: any;
    content_summary: {
      total: number;
      by_type: Record<string, number>;
      pending_approval: number;
    };
    template_info?: any;
  }> {
    const fandom = await this.fandomQueries.getFandomById(fandomId);
    if (!fandom) {
      throw new Error('Fandom not found');
    }

    // Get content summary
    const contentStats = await this.contentQueries.getContentStatsByFandom(
      fandomId
    );

    // Get template info if applicable
    let templateInfo = null;
    if (fandom.template_id) {
      templateInfo = await this.templateQueries.getTemplateById(
        fandom.template_id
      );
    }

    return {
      fandom,
      content_summary: {
        total: contentStats.total_content,
        by_type: contentStats.by_type,
        pending_approval: contentStats.pending_approvals,
      },
      template_info: templateInfo,
    };
  }

  /**
   * Clone existing fandom
   */
  async cloneFandom(
    sourceFandomId: number,
    newFandomData: {
      name: string;
      slug: string;
      description?: string;
      created_by: string;
    },
    options: {
      clone_content?: boolean;
      require_approval?: boolean;
    } = {}
  ): Promise<FandomCreationResult> {
    // Get source fandom
    const sourceFandom = await this.fandomQueries.getFandomById(sourceFandomId);
    if (!sourceFandom) {
      return {
        fandom: null,
        content_items: [],
        approval_required: false,
        validation_results: {
          is_valid: false,
          errors: ['Source fandom not found'],
          warnings: [],
        },
      };
    }

    // Validate new fandom data
    const validation = await this.validateCreationOptions({
      ...newFandomData,
      created_by: newFandomData.created_by,
    });

    if (!validation.is_valid) {
      return {
        fandom: null,
        content_items: [],
        approval_required: false,
        validation_results: validation,
      };
    }

    // Create new fandom
    const newFandom = await this.fandomQueries.createFandom({
      name: newFandomData.name,
      slug: newFandomData.slug,
      description:
        newFandomData.description || `Cloned from ${sourceFandom.name}`,
      genre: sourceFandom.genre,
      template_id: sourceFandom.template_id,
      created_by: newFandomData.created_by,
      is_active: true,
    });

    let contentItems: any[] = [];

    // Clone content if requested
    if (options.clone_content) {
      const sourceContent = await this.contentQueries.getContentByFandom(
        sourceFandomId,
        {
          active_only: true,
          limit: 1000,
        }
      );

      for (const sourceItem of sourceContent.content) {
        const clonedItem = await this.contentQueries.createContentItem({
          fandom_id: newFandom.id,
          content_type: sourceItem.content_type,
          content_name: sourceItem.content_name,
          content_slug: `${sourceItem.content_slug}-cloned`,
          content_data: sourceItem.content_data,
          category: sourceItem.category,
          subcategory: sourceItem.subcategory,
          submitted_by: newFandomData.created_by,
          status: options.require_approval ? 'draft' : 'approved',
        });
        contentItems.push(clonedItem);
      }
    }

    // Submit for approval if required
    let approvalRequests: any[] = [];
    if (options.require_approval && contentItems.length > 0) {
      approvalRequests = await this.submitForApproval(
        newFandom,
        contentItems,
        newFandomData.created_by
      );
    }

    return {
      fandom: newFandom,
      content_items: contentItems,
      approval_required: options.require_approval || false,
      approval_requests: approvalRequests,
      validation_results: {
        is_valid: true,
        errors: [],
        warnings: validation.warnings,
      },
    };
  }
}
