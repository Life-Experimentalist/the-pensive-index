import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationEngine } from '../../src/lib/validation/engine';
import type {
  ValidationContext,
  TagClass,
  PlotBlock,
  Tag,
} from '../../src/types';

describe('Rule Conditions - Tag Class Validation', () => {
  let validationEngine: ValidationEngine;

  // Comprehensive tag classes for testing different validation rules
  const testTagClasses: TagClass[] = [
    {
      id: 'tc-shipping',
      name: 'Shipping Tags',
      fandom_id: 'harry-potter',
      description: 'Romantic relationship tags',
      validation_rules: {
        mutual_exclusion: {
          within_class: true,
          conflicting_tags: [
            'harry-ginny',
            'harry-hermione',
            'harry-luna',
            'hermione-ron',
          ],
          conflicting_classes: ['friendship-shipping'],
        },
        instance_limits: {
          max_instances: 2,
          min_instances: 0,
        },
        required_context: {
          required_tags: ['romantic-content'],
          required_metadata: ['relationship-type'],
        },
      },
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'tc-temporal',
      name: 'Time Travel Tags',
      fandom_id: 'harry-potter',
      description: 'Time manipulation and temporal mechanics',
      validation_rules: {
        mutual_exclusion: {
          within_class: false,
          conflicting_classes: ['canon-timeline', 'strict-canon'],
          conflicting_tags: ['fixed-timeline'],
        },
        required_context: {
          required_tags: ['time-turner', 'temporal-mechanics'],
          required_classes: ['magical-devices'],
        },
        category_restrictions: {
          excluded_categories: ['pure-canon', 'canon-compliant'],
          required_plot_blocks: ['time-travel-mechanics'],
        },
        dependencies: {
          requires: ['magical-theory'],
          enhances: ['plot-complexity'],
          enables: ['butterfly-effect'],
        },
      },
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'tc-power-levels',
      name: 'Character Power Levels',
      fandom_id: 'harry-potter',
      description: 'Character strength and ability tags',
      validation_rules: {
        instance_limits: {
          max_instances: 1,
          exact_instances: 1,
        },
        mutual_exclusion: {
          within_class: true,
        },
        category_restrictions: {
          applicable_categories: ['character-development', 'power-fantasy'],
          excluded_categories: ['slice-of-life', 'mundane'],
        },
      },
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'tc-complex-dependencies',
      name: 'Complex Dependency Testing',
      fandom_id: 'harry-potter',
      description: 'Tag class with complex dependency chains',
      validation_rules: {
        dependencies: {
          requires: ['prerequisite-a', 'prerequisite-b'],
          enhances: ['enhancement-target'],
          enables: ['enabled-feature-1', 'enabled-feature-2'],
        },
        required_context: {
          required_tags: ['context-tag-1', 'context-tag-2'],
          required_classes: ['dependent-class'],
          required_metadata: ['complexity-level', 'narrative-scope'],
        },
      },
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
  ];

  const testTags: Tag[] = [
    // Shipping tags
    {
      id: 'tag-harry-hermione',
      name: 'harry-hermione',
      fandom_id: 'harry-potter',
      description: 'Harry Potter/Hermione Granger relationship',
      category: 'shipping',
      tag_class_id: 'tc-shipping',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-harry-ginny',
      name: 'harry-ginny',
      fandom_id: 'harry-potter',
      description: 'Harry Potter/Ginny Weasley relationship',
      category: 'shipping',
      tag_class_id: 'tc-shipping',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-hermione-ron',
      name: 'hermione-ron',
      fandom_id: 'harry-potter',
      description: 'Hermione Granger/Ron Weasley relationship',
      category: 'shipping',
      tag_class_id: 'tc-shipping',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Context tags
    {
      id: 'tag-romantic-content',
      name: 'romantic-content',
      fandom_id: 'harry-potter',
      description: 'Contains romantic elements',
      category: 'content-type',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Time travel tags
    {
      id: 'tag-time-turner',
      name: 'time-turner',
      fandom_id: 'harry-potter',
      description: 'Time-Turner device usage',
      category: 'magical-device',
      tag_class_id: 'tc-temporal',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-temporal-mechanics',
      name: 'temporal-mechanics',
      fandom_id: 'harry-potter',
      description: 'Time travel mechanics and rules',
      category: 'plot-element',
      tag_class_id: 'tc-temporal',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-fixed-timeline',
      name: 'fixed-timeline',
      fandom_id: 'harry-potter',
      description: 'Fixed timeline, no changes possible',
      category: 'temporal-rule',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Power level tags
    {
      id: 'tag-powerful-harry',
      name: 'powerful-harry',
      fandom_id: 'harry-potter',
      description: 'Harry Potter with enhanced abilities',
      category: 'character-development',
      tag_class_id: 'tc-power-levels',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-weak-harry',
      name: 'weak-harry',
      fandom_id: 'harry-potter',
      description: 'Harry Potter with diminished abilities',
      category: 'character-development',
      tag_class_id: 'tc-power-levels',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Dependency test tags
    {
      id: 'tag-prerequisite-a',
      name: 'prerequisite-a',
      fandom_id: 'harry-potter',
      description: 'First prerequisite for complex dependencies',
      category: 'dependency-test',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-prerequisite-b',
      name: 'prerequisite-b',
      fandom_id: 'harry-potter',
      description: 'Second prerequisite for complex dependencies',
      category: 'dependency-test',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-context-tag-1',
      name: 'context-tag-1',
      fandom_id: 'harry-potter',
      description: 'First required context tag',
      category: 'context',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'tag-context-tag-2',
      name: 'context-tag-2',
      fandom_id: 'harry-potter',
      description: 'Second required context tag',
      category: 'context',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  beforeEach(() => {
    validationEngine = new ValidationEngine(testTagClasses, []);
  });

  describe('Mutual Exclusion Rules', () => {
    it('should detect conflicts within same tag class', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'harry-ginny'], // Both shipping tags, should conflict
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('mutual exclusion') ||
            error.message.toLowerCase().includes('conflict') ||
            error.message.toLowerCase().includes('exclusive')
        )
      ).toBe(true);
    });

    it('should allow multiple shipping tags when within_class is false', () => {
      // Temporarily modify validation rules for this test
      const modifiedTagClasses = testTagClasses.map(tc => {
        if (tc.id === 'tc-shipping') {
          return {
            ...tc,
            validation_rules: {
              ...tc.validation_rules,
              mutual_exclusion: {
                within_class: false, // Allow multiple in same class
              },
            },
          };
        }
        return tc;
      });

      const engine = new ValidationEngine(modifiedTagClasses, []);

      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'harry-ginny'],
        all_tags: testTags,
        tag_classes: modifiedTagClasses,
        metadata: {},
      };

      const result = engine.validate(context);

      // Should not have mutual exclusion errors within class
      expect(
        result.errors.some(error =>
          error.message.toLowerCase().includes('mutual exclusion')
        )
      ).toBe(false);
    });

    it('should detect conflicts between specific conflicting tags', () => {
      const context: ValidationContext = {
        applied_tags: ['time-turner', 'fixed-timeline'], // Explicitly conflicting
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(error =>
          error.message.toLowerCase().includes('conflict')
        )
      ).toBe(true);
    });

    it('should detect conflicts between conflicting classes', () => {
      // Create tags from conflicting classes
      const friendshipShippingTag: Tag = {
        id: 'tag-friendship-shipping',
        name: 'friendship-shipping',
        fandom_id: 'harry-potter',
        description: 'Platonic friendship interpretation',
        category: 'relationship-type',
        tag_class_id: 'friendship-shipping',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'friendship-shipping'],
        all_tags: [...testTags, friendshipShippingTag],
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Should detect class-level conflict
      expect(
        result.errors.some(error =>
          error.message.toLowerCase().includes('conflict')
        )
      ).toBe(true);
    });
  });

  describe('Instance Limit Rules', () => {
    it('should enforce maximum instance limits', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'hermione-ron', 'harry-ginny'], // 3 shipping tags, max is 2
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('limit') ||
            error.message.toLowerCase().includes('maximum') ||
            error.message.toLowerCase().includes('too many')
        )
      ).toBe(true);
    });

    it('should enforce exact instance requirements', () => {
      const context: ValidationContext = {
        applied_tags: ['powerful-harry', 'weak-harry'], // 2 power level tags, exact should be 1
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('exact') ||
            error.message.toLowerCase().includes('exactly') ||
            error.message.toLowerCase().includes('instance')
        )
      ).toBe(true);
    });

    it('should enforce minimum instance requirements', () => {
      // For this test, let's create a tag class with min_instances requirement
      const minRequiredTagClass: TagClass = {
        id: 'tc-required-minimum',
        name: 'Required Minimum Tags',
        fandom_id: 'harry-potter',
        description: 'Tag class requiring minimum instances',
        validation_rules: {
          instance_limits: {
            min_instances: 2,
          },
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const minTag1: Tag = {
        id: 'min-tag-1',
        name: 'min-tag-1',
        fandom_id: 'harry-potter',
        tag_class_id: 'tc-required-minimum',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const engine = new ValidationEngine(
        [...testTagClasses, minRequiredTagClass],
        []
      );

      const context: ValidationContext = {
        applied_tags: ['min-tag-1'], // Only 1 tag, min is 2
        all_tags: [...testTags, minTag1],
        tag_classes: [...testTagClasses, minRequiredTagClass],
        metadata: {},
      };

      const result = engine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('minimum') ||
            error.message.toLowerCase().includes('at least')
        )
      ).toBe(true);
    });

    it('should pass when instance limits are satisfied', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione'], // 1 shipping tag, within limits (max 2)
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Should not have instance limit errors
      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('limit') ||
            error.message.toLowerCase().includes('instance')
        )
      ).toBe(false);
    });
  });

  describe('Required Context Rules', () => {
    it('should detect missing required tags', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione'], // Shipping tag without required 'romantic-content'
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('required') ||
            error.message.toLowerCase().includes('missing')
        )
      ).toBe(true);
    });

    it('should detect missing required metadata', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'romantic-content'],
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {}, // Missing required 'relationship-type' metadata
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('metadata') ||
            error.message.toLowerCase().includes('required')
        )
      ).toBe(true);
    });

    it('should detect missing required tag classes', () => {
      const context: ValidationContext = {
        applied_tags: ['time-turner', 'temporal-mechanics'], // Temporal tags without 'magical-devices' class
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('class') ||
            error.message.toLowerCase().includes('required')
        )
      ).toBe(true);
    });

    it('should pass when all required context is present', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'romantic-content'],
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {
          'relationship-type': 'romantic',
        },
      };

      const result = validationEngine.validate(context);

      // Should not have required context errors for this combination
      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('required') &&
            error.message.toLowerCase().includes('romantic-content')
        )
      ).toBe(false);
    });
  });

  describe('Category Restriction Rules', () => {
    it('should detect excluded categories', () => {
      const timeTag: Tag = {
        id: 'tag-time-travel',
        name: 'time-travel',
        fandom_id: 'harry-potter',
        description: 'Time travel plot element',
        category: 'pure-canon', // Excluded category for temporal tags
        tag_class_id: 'tc-temporal',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: ['time-travel'],
        all_tags: [...testTags, timeTag],
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('category') ||
            error.message.toLowerCase().includes('excluded')
        )
      ).toBe(true);
    });

    it('should enforce applicable categories', () => {
      const powerTag: Tag = {
        id: 'tag-weak-character',
        name: 'weak-character',
        fandom_id: 'harry-potter',
        description: 'Character with weak abilities',
        category: 'slice-of-life', // Not in applicable categories for power levels
        tag_class_id: 'tc-power-levels',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: ['weak-character'],
        all_tags: [...testTags, powerTag],
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('category') ||
            error.message.toLowerCase().includes('applicable')
        )
      ).toBe(true);
    });

    it('should require specific plot blocks', () => {
      const context: ValidationContext = {
        applied_tags: ['time-turner'], // Temporal tag without required plot block
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('plot block') ||
            error.message.toLowerCase().includes('required')
        )
      ).toBe(true);
    });
  });

  describe('Dependency Rules', () => {
    it('should detect missing hard dependencies', () => {
      const dependentTag: Tag = {
        id: 'tag-complex-dependent',
        name: 'complex-dependent',
        fandom_id: 'harry-potter',
        description: 'Tag with complex dependencies',
        category: 'dependency-test',
        tag_class_id: 'tc-complex-dependencies',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: ['complex-dependent'], // Missing prerequisites
        all_tags: [...testTags, dependentTag],
        tag_classes: testTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('dependency') ||
            error.message.toLowerCase().includes('prerequisite') ||
            error.message.toLowerCase().includes('required')
        )
      ).toBe(true);
    });

    it('should suggest enhancements', () => {
      const dependentTag: Tag = {
        id: 'tag-enhancement-source',
        name: 'enhancement-source',
        fandom_id: 'harry-potter',
        description: 'Tag that can enhance others',
        category: 'dependency-test',
        tag_class_id: 'tc-complex-dependencies',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: [
          'enhancement-source',
          'prerequisite-a',
          'prerequisite-b',
        ],
        all_tags: [...testTags, dependentTag],
        tag_classes: testTagClasses,
        metadata: {
          'complexity-level': 'high',
          'narrative-scope': 'epic',
        },
      };

      const result = validationEngine.validate(context);

      // Should have suggestions for enhancements
      if (result.suggestions) {
        expect(
          result.suggestions.some(
            suggestion =>
              suggestion.message.toLowerCase().includes('enhance') ||
              suggestion.action === 'add'
          )
        ).toBe(true);
      }
    });

    it('should validate enabled features', () => {
      const dependentTag: Tag = {
        id: 'tag-feature-enabler',
        name: 'feature-enabler',
        fandom_id: 'harry-potter',
        description: 'Tag that enables other features',
        category: 'dependency-test',
        tag_class_id: 'tc-complex-dependencies',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: [
          'feature-enabler',
          'prerequisite-a',
          'prerequisite-b',
          'context-tag-1',
          'context-tag-2',
        ],
        all_tags: [...testTags, dependentTag],
        tag_classes: testTagClasses,
        metadata: {
          'complexity-level': 'high',
          'narrative-scope': 'epic',
        },
      };

      const result = validationEngine.validate(context);

      // Should suggest enabled features
      if (result.suggestions) {
        expect(
          result.suggestions.some(
            suggestion =>
              suggestion.message.toLowerCase().includes('enable') ||
              suggestion.message.toLowerCase().includes('unlock')
          )
        ).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing tag class references gracefully', () => {
      const orphanTag: Tag = {
        id: 'tag-orphan',
        name: 'orphan-tag',
        fandom_id: 'harry-potter',
        description: 'Tag with non-existent tag class',
        category: 'test',
        tag_class_id: 'non-existent-class',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: ['orphan-tag'],
        all_tags: [...testTags, orphanTag],
        tag_classes: testTagClasses,
        metadata: {},
      };

      // Should not throw error
      expect(() => validationEngine.validate(context)).not.toThrow();
    });

    it('should handle empty validation rules gracefully', () => {
      const emptyRulesTagClass: TagClass = {
        id: 'tc-empty',
        name: 'Empty Rules',
        fandom_id: 'harry-potter',
        description: 'Tag class with empty validation rules',
        validation_rules: {}, // Empty rules
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const engine = new ValidationEngine(
        [...testTagClasses, emptyRulesTagClass],
        []
      );

      const emptyTag: Tag = {
        id: 'tag-empty-rules',
        name: 'empty-rules-tag',
        fandom_id: 'harry-potter',
        tag_class_id: 'tc-empty',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const context: ValidationContext = {
        applied_tags: ['empty-rules-tag'],
        all_tags: [...testTags, emptyTag],
        tag_classes: [...testTagClasses, emptyRulesTagClass],
        metadata: {},
      };

      const result = engine.validate(context);

      // Should pass without errors
      expect(result.is_valid).toBe(true);
    });

    it('should handle malformed validation rules gracefully', () => {
      const malformedTagClass: TagClass = {
        id: 'tc-malformed',
        name: 'Malformed Rules',
        fandom_id: 'harry-potter',
        description: 'Tag class with malformed validation rules',
        validation_rules: {
          mutual_exclusion: null as any, // Malformed rule
          instance_limits: {
            max_instances: -1, // Invalid value
          },
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const engine = new ValidationEngine(
        [...testTagClasses, malformedTagClass],
        []
      );

      const context: ValidationContext = {
        applied_tags: ['harry-hermione'],
        all_tags: testTags,
        tag_classes: [...testTagClasses, malformedTagClass],
        metadata: {},
      };

      // Should not throw error
      expect(() => engine.validate(context)).not.toThrow();
    });
  });

  describe('Performance with Complex Rules', () => {
    it('should validate complex rule combinations efficiently', () => {
      const startTime = performance.now();

      // Create a complex context with multiple rule types
      const context: ValidationContext = {
        applied_tags: [
          'harry-hermione',
          'romantic-content',
          'time-turner',
          'temporal-mechanics',
          'powerful-harry',
          'prerequisite-a',
          'prerequisite-b',
          'context-tag-1',
          'context-tag-2',
        ],
        all_tags: testTags,
        tag_classes: testTagClasses,
        metadata: {
          'relationship-type': 'romantic',
          'complexity-level': 'high',
          'narrative-scope': 'epic',
        },
      };

      const result = validationEngine.validate(context);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete complex validation within 50ms
      expect(executionTime).toBeLessThan(50);
      expect(result).toBeDefined();
    });
  });
});
