import { z } from 'zod';

// Common validation patterns
const entityIdSchema = z
  .string()
  .min(1, 'ID cannot be empty')
  .max(100, 'ID too long');
const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');
const emailSchema = z.string().email('Invalid email format');
const urlSchema = z.string().url('Invalid URL format').optional();
const timestampSchema = z.coerce.date();

// Fandom validation schema
export const fandomSchema = z
  .object({
    id: entityIdSchema,
    name: z
      .string()
      .min(1, 'Fandom name is required')
      .max(200, 'Fandom name too long'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(2000, 'Description too long'),
    slug: slugSchema,
    is_active: z.boolean().default(true),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const createFandomSchema = fandomSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateFandomSchema = fandomSchema.partial().omit({
  id: true,
  created_at: true,
});

// Tag validation schemas
export const tagSchema = z
  .object({
    id: entityIdSchema,
    name: z
      .string()
      .min(1, 'Tag name is required')
      .max(100, 'Tag name too long')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Tag name must be lowercase with hyphens'
      ),
    fandom_id: entityIdSchema,
    description: z.string().max(1000, 'Description too long').optional(),
    category: z.string().max(50, 'Category too long').optional(),
    is_active: z.boolean().default(true),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    requires: z.array(entityIdSchema).optional(),
    enhances: z.array(entityIdSchema).optional(),
    tag_class_id: entityIdSchema.optional(),
  })
  .strict();

export const createTagSchema = tagSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateTagSchema = tagSchema.partial().omit({
  id: true,
  created_at: true,
});

// Tag class validation rules schema
export const tagClassValidationRulesSchema = z
  .object({
    mutual_exclusion: z
      .object({
        within_class: z.boolean().default(false),
        conflicting_tags: z.array(entityIdSchema).optional(),
        conflicting_classes: z.array(entityIdSchema).optional(),
      })
      .optional(),

    required_context: z
      .object({
        required_tags: z.array(entityIdSchema).optional(),
        required_classes: z.array(entityIdSchema).optional(),
        required_metadata: z.array(z.string()).optional(),
      })
      .optional(),

    instance_limits: z
      .object({
        max_instances: z.number().int().positive().optional(),
        min_instances: z.number().int().nonnegative().optional(),
        exact_instances: z.number().int().positive().optional(),
      })
      .refine(
        data => {
          if (data.exact_instances !== undefined) {
            return (
              data.max_instances === undefined &&
              data.min_instances === undefined
            );
          }
          if (
            data.max_instances !== undefined &&
            data.min_instances !== undefined
          ) {
            return data.max_instances >= data.min_instances;
          }
          return true;
        },
        { message: 'Instance limits configuration is invalid' }
      )
      .optional(),

    category_restrictions: z
      .object({
        applicable_categories: z.array(z.string()).optional(),
        excluded_categories: z.array(z.string()).optional(),
        required_plot_blocks: z.array(entityIdSchema).optional(),
      })
      .optional(),

    dependencies: z
      .object({
        requires: z.array(entityIdSchema).optional(),
        enhances: z.array(entityIdSchema).optional(),
        enables: z.array(entityIdSchema).optional(),
      })
      .optional(),
  })
  .strict();

// Tag class validation schema
export const tagClassSchema = z
  .object({
    id: entityIdSchema,
    name: z
      .string()
      .min(1, 'Tag class name is required')
      .max(100, 'Tag class name too long'),
    fandom_id: entityIdSchema,
    description: z
      .string()
      .min(1, 'Description is required')
      .max(1000, 'Description too long'),
    validation_rules: tagClassValidationRulesSchema,
    is_active: z.boolean().default(true),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const createTagClassSchema = tagClassSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateTagClassSchema = tagClassSchema.partial().omit({
  id: true,
  created_at: true,
});

// Plot block validation schema
export const plotBlockSchema = z
  .object({
    id: entityIdSchema,
    name: z
      .string()
      .min(1, 'Plot block name is required')
      .max(200, 'Plot block name too long'),
    fandom_id: entityIdSchema,
    category: z
      .string()
      .min(1, 'Category is required')
      .max(50, 'Category too long'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(2000, 'Description too long'),
    is_active: z.boolean().default(true),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    conflicts_with: z.array(entityIdSchema).optional(),
    requires: z.array(entityIdSchema).optional(),
    soft_requires: z.array(entityIdSchema).optional(),
    enhances: z.array(entityIdSchema).optional(),
    enabled_by: z.array(entityIdSchema).optional(),
    excludes_categories: z.array(z.string()).optional(),
    max_instances: z.number().int().positive().optional(),
    parent_id: entityIdSchema.optional(),
    children: z.array(entityIdSchema).optional(),
  })
  .strict();

export const createPlotBlockSchema = plotBlockSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updatePlotBlockSchema = plotBlockSchema.partial().omit({
  id: true,
  created_at: true,
});

// Plot block condition validation schema
export const plotBlockConditionSchema = z
  .object({
    id: entityIdSchema,
    plot_block_id: entityIdSchema,
    parent_id: entityIdSchema.optional(),
    name: z
      .string()
      .min(1, 'Condition name is required')
      .max(200, 'Condition name too long'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(1000, 'Description too long'),
    order: z.number().int().nonnegative(),
    is_active: z.boolean().default(true),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    conflicts_with: z.array(entityIdSchema).optional(),
    requires: z.array(entityIdSchema).optional(),
    enables: z.array(entityIdSchema).optional(),
    children: z.array(entityIdSchema).optional(),
  })
  .strict();

export const createPlotBlockConditionSchema = plotBlockConditionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updatePlotBlockConditionSchema = plotBlockConditionSchema
  .partial()
  .omit({
    id: true,
    created_at: true,
  });

// Story validation schema
export const storySchema = z
  .object({
    id: entityIdSchema,
    title: z
      .string()
      .min(1, 'Story title is required')
      .max(500, 'Story title too long'),
    author: z
      .string()
      .min(1, 'Author is required')
      .max(200, 'Author name too long'),
    fandom_id: entityIdSchema,
    description: z.string().max(5000, 'Description too long').optional(),
    url: urlSchema,
    word_count: z.number().int().nonnegative().optional(),
    chapter_count: z.number().int().positive().optional(),
    status: z.enum(['complete', 'incomplete', 'abandoned', 'hiatus']),
    rating: z.string().max(20, 'Rating too long'),
    warnings: z.array(z.string().max(100)).optional(),
    is_active: z.boolean().default(true),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    relevance_score: z.number().min(0).max(1).optional(),
    tag_match_count: z.number().int().nonnegative().optional(),
    plot_block_match_count: z.number().int().nonnegative().optional(),
  })
  .strict();

export const createStorySchema = storySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  relevance_score: true,
  tag_match_count: true,
  plot_block_match_count: true,
});

export const updateStorySchema = storySchema.partial().omit({
  id: true,
  created_at: true,
});

// Story relationship schemas
export const storyTagSchema = z
  .object({
    story_id: entityIdSchema,
    tag_id: entityIdSchema,
    relevance_weight: z.number().min(0).max(1).default(1),
    created_at: timestampSchema,
  })
  .strict();

export const storyPlotBlockSchema = z
  .object({
    story_id: entityIdSchema,
    plot_block_id: entityIdSchema,
    relevance_weight: z.number().min(0).max(1).default(1),
    created_at: timestampSchema,
  })
  .strict();

// Story submission validation schema
export const storySubmissionSchema = z
  .object({
    id: entityIdSchema,
    title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
    author: z
      .string()
      .min(1, 'Author is required')
      .max(200, 'Author name too long'),
    fandom_id: entityIdSchema,
    url: z.string().url('Valid URL is required'),
    description: z.string().max(5000, 'Description too long').optional(),
    suggested_tags: z
      .array(z.string().max(100))
      .min(1, 'At least one tag is required'),
    suggested_plot_blocks: z.array(entityIdSchema),
    submitter_email: emailSchema.optional(),
    status: z
      .enum(['pending', 'approved', 'rejected', 'needs_review'])
      .default('pending'),
    admin_notes: z.string().max(2000, 'Admin notes too long').optional(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const createStorySubmissionSchema = storySubmissionSchema.omit({
  id: true,
  status: true,
  admin_notes: true,
  created_at: true,
  updated_at: true,
});

export const updateStorySubmissionSchema = storySubmissionSchema
  .partial()
  .omit({
    id: true,
    created_at: true,
  });

// Admin user validation schema
export const adminUserSchema = z
  .object({
    id: entityIdSchema,
    email: emailSchema,
    name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
    role: z.enum(['admin', 'moderator', 'contributor']),
    permissions: z.array(
      z.object({
        id: entityIdSchema,
        name: z.string().max(100),
        description: z.string().max(500),
        scope: z.enum(['global', 'fandom', 'content']),
      })
    ),
    is_active: z.boolean().default(true),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const createAdminUserSchema = adminUserSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateAdminUserSchema = adminUserSchema.partial().omit({
  id: true,
  created_at: true,
});

// Search and filter validation schemas
export const storySearchFiltersSchema = z
  .object({
    rating: z.array(z.string()).optional(),
    status: z
      .array(z.enum(['complete', 'incomplete', 'abandoned', 'hiatus']))
      .optional(),
    min_word_count: z.number().int().nonnegative().optional(),
    max_word_count: z.number().int().positive().optional(),
    min_relevance_score: z.number().min(0).max(1).optional(),
    exclude_warnings: z.array(z.string()).optional(),
    sort_by: z
      .enum(['relevance', 'word_count', 'updated_at', 'created_at'])
      .default('relevance'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
    limit: z.number().int().positive().max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
  })
  .refine(
    data => {
      if (
        data.min_word_count !== undefined &&
        data.max_word_count !== undefined
      ) {
        return data.max_word_count >= data.min_word_count;
      }
      return true;
    },
    {
      message: 'max_word_count must be greater than or equal to min_word_count',
    }
  )
  .strict();

export const storySearchContextSchema = z
  .object({
    fandom_id: entityIdSchema,
    selected_tags: z.array(entityIdSchema).default([]),
    selected_plot_blocks: z.array(entityIdSchema).default([]),
    selected_conditions: z.array(entityIdSchema).default([]),
    filters: storySearchFiltersSchema.optional().default({
      sort_by: 'relevance',
      sort_order: 'desc',
      limit: 20,
      offset: 0,
    }),
  })
  .strict();

// Validation context schemas
export const validationContextSchema = z
  .object({
    plot_block: plotBlockSchema.optional(),
    applied_tags: z.array(entityIdSchema).default([]),
    all_tags: z.array(tagSchema).default([]),
    tag_classes: z.array(tagClassSchema).default([]),
    metadata: z.record(z.string(), z.any()).default({}),
  })
  .strict();

export const conflictDetectionContextSchema = z
  .object({
    selected_plot_blocks: z.array(plotBlockSchema).default([]),
    selected_conditions: z.array(plotBlockConditionSchema).default([]),
    all_plot_blocks: z.array(plotBlockSchema).default([]),
    all_conditions: z.array(plotBlockConditionSchema).default([]),
  })
  .strict();

export const dependencyValidationContextSchema = z
  .object({
    selected_plot_blocks: z.array(plotBlockSchema).default([]),
    selected_conditions: z.array(plotBlockConditionSchema).default([]),
    selected_tags: z.array(entityIdSchema).default([]),
    all_plot_blocks: z.array(plotBlockSchema).default([]),
    all_conditions: z.array(plotBlockConditionSchema).default([]),
    all_tags: z.array(tagSchema).default([]),
  })
  .strict();

export const circularReferenceContextSchema = z
  .object({
    plot_blocks: z.array(plotBlockSchema).default([]),
    conditions: z.array(plotBlockConditionSchema).default([]),
    tags: z.array(tagSchema).default([]),
  })
  .strict();

// Pathway and UI validation schemas
export const pathwayElementSchema = z
  .object({
    id: entityIdSchema,
    type: z.enum(['tag', 'plot_block', 'condition']),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    category: z.string().max(50).optional(),
    order: z.number().int().nonnegative(),
    is_selected: z.boolean(),
    is_conflicted: z.boolean().optional(),
    conflict_reason: z.string().max(500).optional(),
    dependency_status: z.enum(['satisfied', 'missing', 'optional']).optional(),
  })
  .strict();

export const pathwayStateSchema = z
  .object({
    fandom_id: entityIdSchema,
    elements: z.array(pathwayElementSchema).default([]),
    validation_status: z.enum(['valid', 'invalid', 'warning', 'pending']),
    validation_result: z
      .object({
        is_valid: z.boolean(),
        errors: z.array(
          z.object({
            type: z.string(),
            message: z.string(),
            field: z.string().optional(),
            value: z.any().optional(),
            severity: z.enum(['error', 'warning', 'info']),
          })
        ),
        warnings: z.array(
          z.object({
            type: z.string(),
            message: z.string(),
            field: z.string().optional(),
            suggestion: z.string().optional(),
          })
        ),
        suggestions: z
          .array(
            z.object({
              type: z.string(),
              message: z.string(),
              action: z.string(),
              target_id: entityIdSchema.optional(),
              alternative_ids: z.array(entityIdSchema).optional(),
            })
          )
          .optional(),
      })
      .optional(),
    estimated_story_count: z.number().int().nonnegative().optional(),
    last_validated_at: timestampSchema.optional(),
  })
  .strict();

// API response validation schemas
export const apiResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional(),
      })
      .optional(),
    metadata: z
      .object({
        timestamp: timestampSchema,
        request_id: z.string(),
        processing_time_ms: z.number().nonnegative(),
      })
      .optional(),
  })
  .strict();

export const paginatedResponseSchema = apiResponseSchema
  .extend({
    data: z.array(z.any()),
    pagination: z.object({
      page: z.number().int().positive(),
      per_page: z.number().int().positive(),
      total_count: z.number().int().nonnegative(),
      total_pages: z.number().int().nonnegative(),
      has_next: z.boolean(),
      has_previous: z.boolean(),
    }),
  })
  .strict();

// Input sanitization schemas
export const sanitizedStringSchema = z
  .string()
  .trim()
  .transform(str => {
    // Remove dangerous characters and normalize whitespace
    return str
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, 10000); // Limit length
  });

export const sanitizedTextSchema = z
  .string()
  .trim()
  .transform(str => {
    // More permissive for longer text content
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .slice(0, 50000); // Limit length
  });

// Bulk operation schemas
export const bulkCreateSchema = z
  .object({
    items: z
      .array(z.any())
      .min(1, 'At least one item required')
      .max(100, 'Too many items'),
    validate_relationships: z.boolean().default(true),
    continue_on_error: z.boolean().default(false),
  })
  .strict();

export const bulkUpdateSchema = z
  .object({
    updates: z
      .array(
        z.object({
          id: entityIdSchema,
          data: z.record(z.string(), z.any()),
        })
      )
      .min(1, 'At least one update required')
      .max(100, 'Too many updates'),
    validate_relationships: z.boolean().default(true),
    continue_on_error: z.boolean().default(false),
  })
  .strict();

export const bulkDeleteSchema = z
  .object({
    ids: z
      .array(entityIdSchema)
      .min(1, 'At least one ID required')
      .max(100, 'Too many IDs'),
    cascade: z.boolean().default(false),
    confirm_cascade: z.boolean().default(false),
  })
  .refine(data => !data.cascade || data.confirm_cascade, {
    message: 'Cascade deletion must be confirmed',
  })
  .strict();

// Configuration validation schema
export const appConfigSchema = z
  .object({
    database: z.object({
      url: z.string().url(),
      max_connections: z.number().int().positive().max(100),
      query_timeout_ms: z.number().int().positive().max(30000),
    }),
    validation: z.object({
      enable_circular_reference_detection: z.boolean().default(true),
      max_dependency_chain_length: z
        .number()
        .int()
        .positive()
        .max(50)
        .default(20),
      performance_timeout_ms: z
        .number()
        .int()
        .positive()
        .max(5000)
        .default(1000),
    }),
    search: z.object({
      default_limit: z.number().int().positive().max(100).default(20),
      max_limit: z.number().int().positive().max(100).default(100),
      relevance_threshold: z.number().min(0).max(1).default(0.1),
      cache_ttl_seconds: z.number().int().positive().max(86400).default(3600),
    }),
    admin: z.object({
      auto_approve_threshold: z.number().min(0).max(1).default(0.9),
      require_email_verification: z.boolean().default(true),
      max_pending_submissions: z
        .number()
        .int()
        .positive()
        .max(1000)
        .default(100),
    }),
  })
  .strict();

// Export all schema types for TypeScript inference
export type FandomSchema = z.infer<typeof fandomSchema>;
export type CreateFandomSchema = z.infer<typeof createFandomSchema>;
export type UpdateFandomSchema = z.infer<typeof updateFandomSchema>;

export type TagSchema = z.infer<typeof tagSchema>;
export type CreateTagSchema = z.infer<typeof createTagSchema>;
export type UpdateTagSchema = z.infer<typeof updateTagSchema>;

export type TagClassSchema = z.infer<typeof tagClassSchema>;
export type CreateTagClassSchema = z.infer<typeof createTagClassSchema>;
export type UpdateTagClassSchema = z.infer<typeof updateTagClassSchema>;

export type PlotBlockSchema = z.infer<typeof plotBlockSchema>;
export type CreatePlotBlockSchema = z.infer<typeof createPlotBlockSchema>;
export type UpdatePlotBlockSchema = z.infer<typeof updatePlotBlockSchema>;

export type PlotBlockConditionSchema = z.infer<typeof plotBlockConditionSchema>;
export type CreatePlotBlockConditionSchema = z.infer<
  typeof createPlotBlockConditionSchema
>;
export type UpdatePlotBlockConditionSchema = z.infer<
  typeof updatePlotBlockConditionSchema
>;

export type StorySchema = z.infer<typeof storySchema>;
export type CreateStorySchema = z.infer<typeof createStorySchema>;
export type UpdateStorySchema = z.infer<typeof updateStorySchema>;

export type StorySubmissionSchema = z.infer<typeof storySubmissionSchema>;
export type CreateStorySubmissionSchema = z.infer<
  typeof createStorySubmissionSchema
>;
export type UpdateStorySubmissionSchema = z.infer<
  typeof updateStorySubmissionSchema
>;

export type AdminUserSchema = z.infer<typeof adminUserSchema>;
export type CreateAdminUserSchema = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserSchema = z.infer<typeof updateAdminUserSchema>;

export type StorySearchFiltersSchema = z.infer<typeof storySearchFiltersSchema>;
export type StorySearchContextSchema = z.infer<typeof storySearchContextSchema>;

export type ValidationContextSchema = z.infer<typeof validationContextSchema>;
export type ConflictDetectionContextSchema = z.infer<
  typeof conflictDetectionContextSchema
>;
export type DependencyValidationContextSchema = z.infer<
  typeof dependencyValidationContextSchema
>;
export type CircularReferenceContextSchema = z.infer<
  typeof circularReferenceContextSchema
>;

export type PathwayElementSchema = z.infer<typeof pathwayElementSchema>;
export type PathwayStateSchema = z.infer<typeof pathwayStateSchema>;

export type ApiResponseSchema = z.infer<typeof apiResponseSchema>;
export type PaginatedResponseSchema = z.infer<typeof paginatedResponseSchema>;

export type AppConfigSchema = z.infer<typeof appConfigSchema>;
