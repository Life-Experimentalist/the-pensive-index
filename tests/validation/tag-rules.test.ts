/**
 * Tag Class Rule Validation Tests
 *
 * Tests validation rules for tag classes including:
 * - Mutual exclusion rules enforcement
 * - Required context validation
 * - Instance count limits
 * - Category applicability rules
 * - Complex rule combinations
 * - Performance for rule evaluation
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock types and interfaces for testing
interface TagClass {
  id: string;
  name: string;
  slug: string;
  validation_rules?: {
    mutual_exclusion?: string[];
    required_context?: string[];
    max_instances?: number;
    applicable_categories?: string[];
    excluded_categories?: string[];
    min_instances?: number;
    dependency_rules?: Array<{
      requires: string[];
      when: string[];
    }>;
  };
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  tag_class_id?: string;
  fandom_id: number;
}

interface PlotBlock {
  id: string;
  name: string;
  category: string;
  tags: string[];
  metadata?: Record<string, any>;
}

interface ValidationContext {
  plot_block?: PlotBlock;
  applied_tags: string[];
  all_tags: Tag[];
  tag_classes: TagClass[];
  metadata?: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  violations: Array<{
    rule: string;
    message: string;
    severity: 'error' | 'warning';
    conflicting_tags?: string[];
    missing_context?: string[];
    current_count?: number;
    max_allowed?: number;
  }>;
}

// Mock validation engine functions (to be implemented in T035)
class TagClassRuleValidator {
  static validateMutualExclusion(
    tagClass: TagClass,
    appliedTags: string[],
    allTags: Tag[]
  ): ValidationResult {
    // Mock implementation for testing
    const violations: ValidationResult['violations'] = [];
    const rules = tagClass.validation_rules?.mutual_exclusion || [];

    if (rules.length === 0) {
      return { valid: true, violations: [] };
    }

    const classTagSlugs = allTags
      .filter(
        tag => tag.tag_class_id === tagClass.id && appliedTags.includes(tag.id)
      )
      .map(tag => tag.slug);

    const conflictingTags = classTagSlugs.filter(slug => rules.includes(slug));

    if (conflictingTags.length > 1) {
      violations.push({
        rule: 'mutual_exclusion',
        message: `Tags ${conflictingTags.join(', ')} are mutually exclusive`,
        severity: 'error',
        conflicting_tags: conflictingTags,
      });
    }

    return { valid: violations.length === 0, violations };
  }

  static validateRequiredContext(
    tagClass: TagClass,
    context: ValidationContext
  ): ValidationResult {
    const violations: ValidationResult['violations'] = [];
    const requiredContext = tagClass.validation_rules?.required_context || [];

    if (requiredContext.length === 0) {
      return { valid: true, violations: [] };
    }

    const availableContext = Object.keys(context.metadata || {});
    const missingContext = requiredContext.filter(
      ctx => !availableContext.includes(ctx)
    );

    if (missingContext.length > 0) {
      violations.push({
        rule: 'required_context',
        message: `Missing required context: ${missingContext.join(', ')}`,
        severity: 'error',
        missing_context: missingContext,
      });
    }

    return { valid: violations.length === 0, violations };
  }

  static validateInstanceCount(
    tagClass: TagClass,
    appliedTags: string[],
    allTags: Tag[]
  ): ValidationResult {
    const violations: ValidationResult['violations'] = [];
    const maxInstances = tagClass.validation_rules?.max_instances;
    const minInstances = tagClass.validation_rules?.min_instances;

    const classTagCount = allTags.filter(
      tag => tag.tag_class_id === tagClass.id && appliedTags.includes(tag.id)
    ).length;

    if (maxInstances !== undefined && classTagCount > maxInstances) {
      violations.push({
        rule: 'max_instances',
        message: `Maximum ${maxInstances} tags allowed, but ${classTagCount} applied`,
        severity: 'error',
        current_count: classTagCount,
        max_allowed: maxInstances,
      });
    }

    if (minInstances !== undefined && classTagCount < minInstances) {
      violations.push({
        rule: 'min_instances',
        message: `Minimum ${minInstances} tags required, but only ${classTagCount} applied`,
        severity: 'error',
        current_count: classTagCount,
        max_allowed: minInstances,
      });
    }

    return { valid: violations.length === 0, violations };
  }

  static validateCategoryApplicability(
    tagClass: TagClass,
    plotBlockCategory: string
  ): ValidationResult {
    const violations: ValidationResult['violations'] = [];
    const applicableCategories =
      tagClass.validation_rules?.applicable_categories;
    const excludedCategories = tagClass.validation_rules?.excluded_categories;

    if (excludedCategories && excludedCategories.includes(plotBlockCategory)) {
      violations.push({
        rule: 'category_exclusion',
        message: `Tag class "${tagClass.name}" cannot be applied to ${plotBlockCategory} blocks`,
        severity: 'error',
      });
    }

    if (
      applicableCategories &&
      !applicableCategories.includes(plotBlockCategory)
    ) {
      violations.push({
        rule: 'category_applicability',
        message: `Tag class "${tagClass.name}" is not applicable to ${plotBlockCategory} blocks`,
        severity: 'error',
      });
    }

    return { valid: violations.length === 0, violations };
  }

  static validateDependencyRules(
    tagClass: TagClass,
    appliedTags: string[],
    allTags: Tag[]
  ): ValidationResult {
    const violations: ValidationResult['violations'] = [];
    const dependencyRules = tagClass.validation_rules?.dependency_rules || [];

    for (const rule of dependencyRules) {
      const whenTagsApplied = rule.when.some(tagSlug =>
        allTags.some(
          tag => tag.slug === tagSlug && appliedTags.includes(tag.id)
        )
      );

      if (whenTagsApplied) {
        const requiredTagsApplied = rule.requires.every(tagSlug =>
          allTags.some(
            tag => tag.slug === tagSlug && appliedTags.includes(tag.id)
          )
        );

        if (!requiredTagsApplied) {
          const missingTags = rule.requires.filter(
            tagSlug =>
              !allTags.some(
                tag => tag.slug === tagSlug && appliedTags.includes(tag.id)
              )
          );

          violations.push({
            rule: 'dependency_requirement',
            message: `When ${rule.when.join(
              ' or '
            )} is applied, must also have: ${missingTags.join(', ')}`,
            severity: 'error',
            missing_context: missingTags,
          });
        }
      }
    }

    return { valid: violations.length === 0, violations };
  }
}

describe('Tag Class Rule Validation Tests', () => {
  let sampleTagClasses: TagClass[];
  let sampleTags: Tag[];
  let samplePlotBlocks: PlotBlock[];

  beforeEach(() => {
    // Setup test data
    sampleTagClasses = [
      {
        id: 'relationship-status',
        name: 'Relationship Status',
        slug: 'relationship-status',
        validation_rules: {
          mutual_exclusion: ['single', 'married', 'divorced'],
          required_context: ['character-name'],
          max_instances: 1,
          applicable_categories: ['relationship', 'character-development'],
        },
      },
      {
        id: 'character-traits',
        name: 'Character Traits',
        slug: 'character-traits',
        validation_rules: {
          max_instances: 5,
          min_instances: 1,
          applicable_categories: ['character-development'],
        },
      },
      {
        id: 'power-level',
        name: 'Power Level',
        slug: 'power-level',
        validation_rules: {
          mutual_exclusion: ['weak', 'moderate', 'strong', 'overpowered'],
          max_instances: 1,
          dependency_rules: [
            {
              requires: ['magical-training'],
              when: ['strong', 'overpowered'],
            },
          ],
        },
      },
    ];

    sampleTags = [
      // Relationship Status tags
      {
        id: 'tag-1',
        name: 'Single',
        slug: 'single',
        tag_class_id: 'relationship-status',
        fandom_id: 1,
      },
      {
        id: 'tag-2',
        name: 'Married',
        slug: 'married',
        tag_class_id: 'relationship-status',
        fandom_id: 1,
      },
      {
        id: 'tag-3',
        name: 'Divorced',
        slug: 'divorced',
        tag_class_id: 'relationship-status',
        fandom_id: 1,
      },

      // Character Traits tags
      {
        id: 'tag-4',
        name: 'Brave',
        slug: 'brave',
        tag_class_id: 'character-traits',
        fandom_id: 1,
      },
      {
        id: 'tag-5',
        name: 'Intelligent',
        slug: 'intelligent',
        tag_class_id: 'character-traits',
        fandom_id: 1,
      },
      {
        id: 'tag-6',
        name: 'Loyal',
        slug: 'loyal',
        tag_class_id: 'character-traits',
        fandom_id: 1,
      },

      // Power Level tags
      {
        id: 'tag-7',
        name: 'Weak',
        slug: 'weak',
        tag_class_id: 'power-level',
        fandom_id: 1,
      },
      {
        id: 'tag-8',
        name: 'Strong',
        slug: 'strong',
        tag_class_id: 'power-level',
        fandom_id: 1,
      },
      {
        id: 'tag-9',
        name: 'Overpowered',
        slug: 'overpowered',
        tag_class_id: 'power-level',
        fandom_id: 1,
      },
      {
        id: 'tag-10',
        name: 'Magical Training',
        slug: 'magical-training',
        tag_class_id: 'character-traits',
        fandom_id: 1,
      },
    ];

    samplePlotBlocks = [
      {
        id: 'plot-1',
        name: 'Character Introduction',
        category: 'character-development',
        tags: [],
        metadata: { 'character-name': 'Harry Potter' },
      },
      {
        id: 'plot-2',
        name: 'Romance Arc',
        category: 'relationship',
        tags: [],
        metadata: { 'character-name': 'Hermione Granger' },
      },
      {
        id: 'plot-3',
        name: 'Action Sequence',
        category: 'action',
        tags: [],
      },
    ];
  });

  describe('Mutual Exclusion Rule Validation', () => {
    it('should pass when no conflicting tags are applied', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status
      const appliedTags = ['tag-1']; // Only Single

      const result = TagClassRuleValidator.validateMutualExclusion(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when multiple mutually exclusive tags are applied', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status
      const appliedTags = ['tag-1', 'tag-2']; // Single AND Married

      const result = TagClassRuleValidator.validateMutualExclusion(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('mutual_exclusion');
      expect(result.violations[0].severity).toBe('error');
      expect(result.violations[0].conflicting_tags).toEqual([
        'single',
        'married',
      ]);
    });

    it('should fail when three mutually exclusive tags are applied', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status
      const appliedTags = ['tag-1', 'tag-2', 'tag-3']; // Single AND Married AND Divorced

      const result = TagClassRuleValidator.validateMutualExclusion(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].conflicting_tags).toEqual([
        'single',
        'married',
        'divorced',
      ]);
    });

    it('should pass when no mutual exclusion rules are defined', () => {
      const tagClass = sampleTagClasses[1]; // Character Traits (no mutual exclusion)
      const appliedTags = ['tag-4', 'tag-5', 'tag-6']; // Multiple traits

      const result = TagClassRuleValidator.validateMutualExclusion(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Required Context Validation', () => {
    it('should pass when required context is provided', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status
      const context: ValidationContext = {
        applied_tags: ['tag-1'],
        all_tags: sampleTags,
        tag_classes: sampleTagClasses,
        metadata: { 'character-name': 'Harry Potter' },
      };

      const result = TagClassRuleValidator.validateRequiredContext(
        tagClass,
        context
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when required context is missing', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status
      const context: ValidationContext = {
        applied_tags: ['tag-1'],
        all_tags: sampleTags,
        tag_classes: sampleTagClasses,
        metadata: {}, // Missing character-name
      };

      const result = TagClassRuleValidator.validateRequiredContext(
        tagClass,
        context
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('required_context');
      expect(result.violations[0].missing_context).toEqual(['character-name']);
    });

    it('should pass when no required context is defined', () => {
      const tagClass = sampleTagClasses[1]; // Character Traits (no required context)
      const context: ValidationContext = {
        applied_tags: ['tag-4'],
        all_tags: sampleTags,
        tag_classes: sampleTagClasses,
        metadata: {},
      };

      const result = TagClassRuleValidator.validateRequiredContext(
        tagClass,
        context
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle multiple required context fields', () => {
      const tagClassWithMultipleContext: TagClass = {
        id: 'multi-context',
        name: 'Multi Context',
        slug: 'multi-context',
        validation_rules: {
          required_context: ['character-name', 'location', 'time-period'],
        },
      };

      const context: ValidationContext = {
        applied_tags: ['tag-1'],
        all_tags: sampleTags,
        tag_classes: sampleTagClasses,
        metadata: { 'character-name': 'Harry', location: 'Hogwarts' }, // Missing time-period
      };

      const result = TagClassRuleValidator.validateRequiredContext(
        tagClassWithMultipleContext,
        context
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].missing_context).toEqual(['time-period']);
    });
  });

  describe('Instance Count Validation', () => {
    it('should pass when tag count is within max limit', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status (max 1)
      const appliedTags = ['tag-1']; // Only 1 tag

      const result = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when tag count exceeds max limit', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status (max 1)
      const appliedTags = ['tag-1', 'tag-2']; // 2 tags (exceeds limit)

      const result = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('max_instances');
      expect(result.violations[0].current_count).toBe(2);
      expect(result.violations[0].max_allowed).toBe(1);
    });

    it('should pass when tag count meets min requirement', () => {
      const tagClass = sampleTagClasses[1]; // Character Traits (min 1, max 5)
      const appliedTags = ['tag-4', 'tag-5']; // 2 tags (within range)

      const result = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when tag count is below min requirement', () => {
      const tagClass = sampleTagClasses[1]; // Character Traits (min 1)
      const appliedTags: string[] = []; // 0 tags (below minimum)

      const result = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('min_instances');
      expect(result.violations[0].current_count).toBe(0);
    });

    it('should fail when tag count exceeds max in character traits', () => {
      const tagClass = sampleTagClasses[1]; // Character Traits (max 5)
      const appliedTags = [
        'tag-4',
        'tag-5',
        'tag-6',
        'tag-10',
        'extra-1',
        'extra-2',
      ]; // 6 tags

      // Add extra tags to test data
      const extendedTags = [
        ...sampleTags,
        {
          id: 'extra-1',
          name: 'Extra1',
          slug: 'extra1',
          tag_class_id: 'character-traits',
          fandom_id: 1,
        },
        {
          id: 'extra-2',
          name: 'Extra2',
          slug: 'extra2',
          tag_class_id: 'character-traits',
          fandom_id: 1,
        },
      ];

      const result = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        extendedTags
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('max_instances');
      expect(result.violations[0].current_count).toBe(6);
      expect(result.violations[0].max_allowed).toBe(5);
    });
  });

  describe('Category Applicability Validation', () => {
    it('should pass when tag class is applicable to plot block category', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status (applicable to relationship, character-development)
      const plotBlockCategory = 'relationship';

      const result = TagClassRuleValidator.validateCategoryApplicability(
        tagClass,
        plotBlockCategory
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when tag class is not applicable to plot block category', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status (not applicable to action)
      const plotBlockCategory = 'action';

      const result = TagClassRuleValidator.validateCategoryApplicability(
        tagClass,
        plotBlockCategory
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('category_applicability');
    });

    it('should fail when tag class is explicitly excluded from category', () => {
      const tagClassWithExclusion: TagClass = {
        id: 'combat-only',
        name: 'Combat Only',
        slug: 'combat-only',
        validation_rules: {
          excluded_categories: ['relationship', 'character-development'],
        },
      };

      const result = TagClassRuleValidator.validateCategoryApplicability(
        tagClassWithExclusion,
        'relationship'
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('category_exclusion');
    });

    it('should pass when no category restrictions are defined', () => {
      const unrestrictedTagClass: TagClass = {
        id: 'unrestricted',
        name: 'Unrestricted',
        slug: 'unrestricted',
      };

      const result = TagClassRuleValidator.validateCategoryApplicability(
        unrestrictedTagClass,
        'any-category'
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Dependency Rule Validation', () => {
    it('should pass when dependency requirements are met', () => {
      const tagClass = sampleTagClasses[2]; // Power Level
      const appliedTags = ['tag-8', 'tag-10']; // Strong + Magical Training

      const result = TagClassRuleValidator.validateDependencyRules(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when dependency requirements are not met', () => {
      const tagClass = sampleTagClasses[2]; // Power Level
      const appliedTags = ['tag-8']; // Strong but missing Magical Training

      const result = TagClassRuleValidator.validateDependencyRules(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('dependency_requirement');
      expect(result.violations[0].missing_context).toEqual([
        'magical-training',
      ]);
    });

    it('should pass when triggering condition is not met', () => {
      const tagClass = sampleTagClasses[2]; // Power Level
      const appliedTags = ['tag-7']; // Weak (no dependency requirements)

      const result = TagClassRuleValidator.validateDependencyRules(
        tagClass,
        appliedTags,
        sampleTags
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle multiple dependency rules', () => {
      const complexTagClass: TagClass = {
        id: 'complex-magic',
        name: 'Complex Magic',
        slug: 'complex-magic',
        validation_rules: {
          dependency_rules: [
            {
              requires: ['magical-training'],
              when: ['strong', 'overpowered'],
            },
            {
              requires: ['formal-education'],
              when: ['overpowered'],
            },
          ],
        },
      };

      const extendedTags = [
        ...sampleTags,
        {
          id: 'formal-education',
          name: 'Formal Education',
          slug: 'formal-education',
          tag_class_id: 'character-traits',
          fandom_id: 1,
        },
      ];

      const appliedTags = ['tag-9']; // Overpowered but missing both dependencies

      const result = TagClassRuleValidator.validateDependencyRules(
        complexTagClass,
        appliedTags,
        extendedTags
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(2); // Both dependency rules violated
    });
  });

  describe('Complex Rule Combinations', () => {
    it('should validate multiple rules simultaneously', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status
      const appliedTags = ['tag-1']; // Single
      const context: ValidationContext = {
        plot_block: samplePlotBlocks[1], // Romance Arc (relationship category)
        applied_tags: appliedTags,
        all_tags: sampleTags,
        tag_classes: sampleTagClasses,
        metadata: { 'character-name': 'Hermione' },
      };

      // Test all rules
      const mutualExclusionResult =
        TagClassRuleValidator.validateMutualExclusion(
          tagClass,
          appliedTags,
          sampleTags
        );

      const requiredContextResult =
        TagClassRuleValidator.validateRequiredContext(tagClass, context);

      const instanceCountResult = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        sampleTags
      );

      const categoryResult =
        TagClassRuleValidator.validateCategoryApplicability(
          tagClass,
          context.plot_block!.category
        );

      expect(mutualExclusionResult.valid).toBe(true);
      expect(requiredContextResult.valid).toBe(true);
      expect(instanceCountResult.valid).toBe(true);
      expect(categoryResult.valid).toBe(true);
    });

    it('should handle multiple rule violations', () => {
      const tagClass = sampleTagClasses[0]; // Relationship Status
      const appliedTags = ['tag-1', 'tag-2']; // Single AND Married (violation)
      const context: ValidationContext = {
        plot_block: samplePlotBlocks[2], // Action Sequence (wrong category)
        applied_tags: appliedTags,
        all_tags: sampleTags,
        tag_classes: sampleTagClasses,
        metadata: {}, // Missing required context
      };

      const mutualExclusionResult =
        TagClassRuleValidator.validateMutualExclusion(
          tagClass,
          appliedTags,
          sampleTags
        );

      const requiredContextResult =
        TagClassRuleValidator.validateRequiredContext(tagClass, context);

      const instanceCountResult = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        sampleTags
      );

      const categoryResult =
        TagClassRuleValidator.validateCategoryApplicability(
          tagClass,
          context.plot_block!.category
        );

      // Should have multiple violations
      expect(mutualExclusionResult.valid).toBe(false); // Mutual exclusion
      expect(requiredContextResult.valid).toBe(false); // Missing context
      expect(instanceCountResult.valid).toBe(false); // Too many instances
      expect(categoryResult.valid).toBe(false); // Wrong category
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of tags efficiently', () => {
      const startTime = performance.now();

      // Create large dataset
      const largeTags = Array.from({ length: 1000 }, (_, i) => ({
        id: `tag-${i}`,
        name: `Tag ${i}`,
        slug: `tag-${i}`,
        tag_class_id: 'character-traits',
        fandom_id: 1,
      }));

      const largeAppliedTags = largeTags.slice(0, 100).map(tag => tag.id);

      const result = TagClassRuleValidator.validateInstanceCount(
        sampleTagClasses[1], // Character Traits (max 5)
        largeAppliedTags,
        largeTags
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.valid).toBe(false); // Should exceed max
      expect(duration).toBeLessThan(50); // Should be fast (< 50ms)
    });

    it('should handle empty rule sets gracefully', () => {
      const emptyTagClass: TagClass = {
        id: 'empty',
        name: 'Empty',
        slug: 'empty',
        validation_rules: {},
      };

      const context: ValidationContext = {
        applied_tags: ['tag-1'],
        all_tags: sampleTags,
        tag_classes: [emptyTagClass],
        metadata: {},
      };

      const mutualExclusionResult =
        TagClassRuleValidator.validateMutualExclusion(
          emptyTagClass,
          context.applied_tags,
          context.all_tags
        );

      const requiredContextResult =
        TagClassRuleValidator.validateRequiredContext(emptyTagClass, context);

      expect(mutualExclusionResult.valid).toBe(true);
      expect(requiredContextResult.valid).toBe(true);
    });

    it('should handle missing tag class references', () => {
      const orphanedTags = [
        {
          id: 'orphan-1',
          name: 'Orphan',
          slug: 'orphan',
          tag_class_id: 'non-existent',
          fandom_id: 1,
        },
      ];

      const result = TagClassRuleValidator.validateMutualExclusion(
        sampleTagClasses[0],
        ['orphan-1'],
        orphanedTags
      );

      // Should handle gracefully (no tags match class)
      expect(result.valid).toBe(true);
    });

    it('should validate circular dependency detection', () => {
      const circularTagClass: TagClass = {
        id: 'circular',
        name: 'Circular',
        slug: 'circular',
        validation_rules: {
          dependency_rules: [
            {
              requires: ['tag-b'],
              when: ['tag-a'],
            },
            {
              requires: ['tag-a'],
              when: ['tag-b'],
            },
          ],
        },
      };

      const circularTags = [
        {
          id: 'tag-a',
          name: 'Tag A',
          slug: 'tag-a',
          tag_class_id: 'circular',
          fandom_id: 1,
        },
        {
          id: 'tag-b',
          name: 'Tag B',
          slug: 'tag-b',
          tag_class_id: 'circular',
          fandom_id: 1,
        },
      ];

      const appliedTags = ['tag-a', 'tag-b'];

      const result = TagClassRuleValidator.validateDependencyRules(
        circularTagClass,
        appliedTags,
        circularTags
      );

      // Should pass because both dependencies are satisfied
      expect(result.valid).toBe(true);
    });
  });

  describe('Rule Priority and Severity', () => {
    it('should distinguish between error and warning violations', () => {
      // This test anticipates future severity handling
      const tagClass: TagClass = {
        id: 'severity-test',
        name: 'Severity Test',
        slug: 'severity-test',
        validation_rules: {
          mutual_exclusion: ['conflicting-1', 'conflicting-2'], // Error
          max_instances: 1, // Error when exceeded
        },
      };

      const conflictingTags = [
        {
          id: 'conf-1',
          name: 'Conflicting 1',
          slug: 'conflicting-1',
          tag_class_id: 'severity-test',
          fandom_id: 1,
        },
        {
          id: 'conf-2',
          name: 'Conflicting 2',
          slug: 'conflicting-2',
          tag_class_id: 'severity-test',
          fandom_id: 1,
        },
      ];

      const appliedTags = ['conf-1', 'conf-2'];

      const mutualExclusionResult =
        TagClassRuleValidator.validateMutualExclusion(
          tagClass,
          appliedTags,
          conflictingTags
        );

      const instanceCountResult = TagClassRuleValidator.validateInstanceCount(
        tagClass,
        appliedTags,
        conflictingTags
      );

      // Both should be errors
      expect(mutualExclusionResult.violations[0].severity).toBe('error');
      expect(instanceCountResult.violations[0].severity).toBe('error');
    });
  });
});
