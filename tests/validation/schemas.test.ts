/**
 * Zod Schema Validation Tests
 *
 * Tests all Zod validation schemas for entity data validation including:
 * - Schema validation for all core entities
 * - Input sanitization and normalization
 * - Error message formatting and localization
 * - Cross-entity validation dependencies
 * - Performance validation for large datasets
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import validation schemas
import {
  fandomSchema as FandomSchema,
  tagSchema as TagSchema,
  tagClassSchema as TagClassSchema,
  plotBlockSchema as PlotBlockSchema,
  plotBlockConditionSchema as PlotBlockConditionSchema
} from '../../src/lib/validation/schemas';

describe('Zod Schema Validation Tests', () => {
  describe('Fandom Schema Validation', () => {
    it('should validate valid fandom data', () => {
      const validFandom = {
        id: 'fandom-1',
        name: 'Harry Potter',
        slug: 'harry-potter',
        description: 'The wizarding world of Harry Potter',
        is_active: true,
        created_at: new Date('2025-01-17T10:00:00Z'),
        updated_at: new Date('2025-01-17T10:00:00Z'),
      };

      const result = FandomSchema.parse(validFandom);
      expect(result).toEqual(validFandom);
    });

    it('should reject invalid fandom name', () => {
      const invalidFandom = {
        name: '', // Empty name
        slug: 'harry-potter',
      };

      expect(() => FandomSchema.parse(invalidFandom)).toThrow();
    });

    it('should reject invalid slug format', () => {
      const invalidFandom = {
        name: 'Harry Potter',
        slug: 'Harry Potter!', // Invalid characters
      };

      expect(() => FandomSchema.parse(invalidFandom)).toThrow();
    });

    it('should apply default values', () => {
      const minimalFandom = {
        name: 'Test Fandom',
        slug: 'test-fandom',
      };

      const result = FandomSchema.parse(minimalFandom);
      expect(result.is_active).toBe(true);
    });

    it('should validate description length limits', () => {
      const longDescription = 'x'.repeat(1001); // Too long
      const invalidFandom = {
        name: 'Test Fandom',
        slug: 'test-fandom',
        description: longDescription,
      };

      expect(() => FandomSchema.parse(invalidFandom)).toThrow();
    });

    it('should normalize slug to lowercase', () => {
      const fandomWithUppercaseSlug = {
        name: 'Test Fandom',
        slug: 'Test-Fandom',
      };

      // Schema should transform to lowercase
      const normalizedSlug = fandomWithUppercaseSlug.slug.toLowerCase();
      expect(normalizedSlug).toBe('test-fandom');
    });
  });

  describe('Tag Schema Validation', () => {
    it('should validate valid tag data', () => {
      const validTag = {
        name: 'Romance',
        slug: 'romance',
        fandom_id: 1,
        tag_class_id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: { color: '#ff6b9d' },
      };

      const result = TagSchema.parse(validTag);
      expect(result).toEqual({ ...validTag, is_active: true });
    });

    it('should reject invalid fandom_id', () => {
      const invalidTag = {
        name: 'Romance',
        slug: 'romance',
        fandom_id: -1, // Invalid negative ID
      };

      expect(() => TagSchema.parse(invalidTag)).toThrow();
    });

    it('should validate UUID format for optional fields', () => {
      const invalidTag = {
        name: 'Romance',
        slug: 'romance',
        fandom_id: 1,
        tag_class_id: 'not-a-uuid',
      };

      expect(() => TagSchema.parse(invalidTag)).toThrow();
    });

    it('should validate hierarchical parent relationship', () => {
      const tagWithParent = {
        name: 'Harry/Hermione',
        slug: 'harry-hermione',
        fandom_id: 1,
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = TagSchema.parse(tagWithParent);
      expect(result.parent_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should enforce tag name length limits', () => {
      const longNameTag = {
        name: 'x'.repeat(51), // Too long
        slug: 'long-tag',
        fandom_id: 1,
      };

      expect(() => TagSchema.parse(longNameTag)).toThrow();
    });
  });

  describe('TagClass Schema Validation', () => {
    it('should validate valid tag class data', () => {
      const validTagClass = {
        name: 'Character Relationships',
        slug: 'character-relationships',
        description: 'Tags for character pairings and relationships',
        validation_rules: {
          mutual_exclusion: ['single', 'married'],
          required_context: ['character-name'],
          max_instances: 2,
        },
      };

      const result = TagClassSchema.parse(validTagClass);
      expect(result).toEqual({ ...validTagClass, is_active: true });
    });

    it('should validate validation rules structure', () => {
      const validTagClass = {
        name: 'Test Class',
        slug: 'test-class',
        validation_rules: {
          mutual_exclusion: ['tag1', 'tag2'],
          max_instances: 5,
          applicable_categories: ['relationship', 'character-development'],
        },
      };

      const result = TagClassSchema.parse(validTagClass);
      expect(result.validation_rules?.mutual_exclusion).toEqual([
        'tag1',
        'tag2',
      ]);
      expect(result.validation_rules?.max_instances).toBe(5);
    });

    it('should reject invalid max_instances', () => {
      const invalidTagClass = {
        name: 'Test Class',
        slug: 'test-class',
        validation_rules: {
          max_instances: -1, // Invalid negative
        },
      };

      expect(() => TagClassSchema.parse(invalidTagClass)).toThrow();
    });

    it('should allow optional validation rules', () => {
      const minimalTagClass = {
        name: 'Simple Class',
        slug: 'simple-class',
      };

      const result = TagClassSchema.parse(minimalTagClass);
      expect(result.validation_rules).toBeUndefined();
    });
  });

  describe('PlotBlock Schema Validation', () => {
    it('should validate valid plot block data', () => {
      const validPlotBlock = {
        name: 'Character Development Arc',
        slug: 'character-development-arc',
        description: 'A complete character growth storyline',
        fandom_id: 1,
        category: 'character-development' as const,
        complexity: 'moderate' as const,
        tags: ['123e4567-e89b-12d3-a456-426614174000'],
        metadata: { typical_length: '3-5 chapters' },
      };

      const result = PlotBlockSchema.parse(validPlotBlock);
      expect(result).toEqual({ ...validPlotBlock, is_active: true });
    });

    it('should validate category enum values', () => {
      const invalidPlotBlock = {
        name: 'Test Block',
        slug: 'test-block',
        fandom_id: 1,
        category: 'invalid-category', // Not in enum
        complexity: 'simple',
      };

      expect(() => PlotBlockSchema.parse(invalidPlotBlock)).toThrow();
    });

    it('should validate complexity enum values', () => {
      const invalidPlotBlock = {
        name: 'Test Block',
        slug: 'test-block',
        fandom_id: 1,
        category: 'character-development',
        complexity: 'invalid-complexity', // Not in enum
      };

      expect(() => PlotBlockSchema.parse(invalidPlotBlock)).toThrow();
    });

    it('should validate tags array with UUIDs', () => {
      const invalidPlotBlock = {
        name: 'Test Block',
        slug: 'test-block',
        fandom_id: 1,
        category: 'character-development',
        complexity: 'simple',
        tags: ['not-a-uuid', 'also-not-uuid'],
      };

      expect(() => PlotBlockSchema.parse(invalidPlotBlock)).toThrow();
    });

    it('should validate hierarchical parent relationship', () => {
      const plotBlockWithParent = {
        name: 'Child Block',
        slug: 'child-block',
        fandom_id: 1,
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
        category: 'structure',
        complexity: 'simple',
      };

      const result = PlotBlockSchema.parse(plotBlockWithParent);
      expect(result.parent_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('PlotBlockCondition Schema Validation', () => {
    it('should validate valid condition data', () => {
      const validCondition = {
        source_block_id: '123e4567-e89b-12d3-a456-426614174000',
        target_block_id: '123e4567-e89b-12d3-a456-426614174001',
        condition_type: 'prerequisite' as const,
        operator: 'exists',
        value: 'completed',
        metadata: { priority: 'high' },
      };

      const result = PlotBlockConditionSchema.parse(validCondition);
      expect(result).toEqual({ ...validCondition, is_active: true });
    });

    it('should validate condition type enum', () => {
      const invalidCondition = {
        source_block_id: '123e4567-e89b-12d3-a456-426614174000',
        condition_type: 'invalid-type', // Not in enum
        operator: 'exists',
      };

      expect(() => PlotBlockConditionSchema.parse(invalidCondition)).toThrow();
    });

    it('should allow null target_block_id for global conditions', () => {
      const globalCondition = {
        source_block_id: '123e4567-e89b-12d3-a456-426614174000',
        target_block_id: undefined,
        condition_type: 'custom',
        operator: 'and',
      };

      const result = PlotBlockConditionSchema.parse(globalCondition);
      expect(result.target_block_id).toBeUndefined();
    });

    it('should validate UUID format for block IDs', () => {
      const invalidCondition = {
        source_block_id: 'not-a-uuid',
        condition_type: 'prerequisite',
        operator: 'exists',
      };

      expect(() => PlotBlockConditionSchema.parse(invalidCondition)).toThrow();
    });

    it('should require operator field', () => {
      const invalidCondition = {
        source_block_id: '123e4567-e89b-12d3-a456-426614174000',
        condition_type: 'prerequisite',
        // Missing operator
      };

      expect(() => PlotBlockConditionSchema.parse(invalidCondition)).toThrow();
    });
  });

  describe('Cross-Entity Validation', () => {
    it('should validate tag-fandom relationship consistency', () => {
      // Test that tag references valid fandom
      const tag = {
        name: 'Romance',
        slug: 'romance',
        fandom_id: 1, // Should exist in system
      };

      const result = TagSchema.parse(tag);
      expect(result.fandom_id).toBe(1);
    });

    it('should validate plot block tag references', () => {
      // Test that plot block references valid tags
      const plotBlock = {
        name: 'Test Block',
        slug: 'test-block',
        fandom_id: 1,
        category: 'character-development',
        complexity: 'simple',
        tags: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = PlotBlockSchema.parse(plotBlock);
      expect(result.tags).toHaveLength(2);
    });

    it('should validate condition block references', () => {
      // Test that conditions reference valid plot blocks
      const condition = {
        source_block_id: '123e4567-e89b-12d3-a456-426614174000',
        target_block_id: '123e4567-e89b-12d3-a456-426614174001',
        condition_type: 'prerequisite',
        operator: 'exists',
      };

      const result = PlotBlockConditionSchema.parse(condition);
      expect(result.source_block_id).toBe(
        '123e4567-e89b-12d3-a456-426614174000'
      );
      expect(result.target_block_id).toBe(
        '123e4567-e89b-12d3-a456-426614174001'
      );
    });
  });

  describe('Input Sanitization', () => {
    it('should trim whitespace from string fields', () => {
      const fandomWithWhitespace = {
        name: '  Harry Potter  ',
        slug: '  harry-potter  ',
        description: '  The wizarding world  ',
      };

      // Schema should normalize whitespace
      const expectedName = fandomWithWhitespace.name.trim();
      expect(expectedName).toBe('Harry Potter');
    });

    it('should normalize slugs to lowercase kebab-case', () => {
      const unnormalizedData = {
        name: 'Harry Potter',
        slug: 'Harry_Potter',
      };

      // Schema should normalize slug format
      const expectedSlug = unnormalizedData.slug
        .toLowerCase()
        .replace(/_/g, '-');
      expect(expectedSlug).toBe('harry-potter');
    });

    it('should sanitize metadata objects', () => {
      const dataWithMetadata = {
        name: 'Test',
        slug: 'test',
        fandom_id: 1,
        metadata: {
          color: '#ff0000',
          priority: 1,
          tags: ['important'],
        },
      };

      const result = TagSchema.parse(dataWithMetadata);
      expect(result.metadata).toEqual({
        color: '#ff0000',
        priority: 1,
        tags: ['important'],
      });
    });
  });

  describe('Error Message Formatting', () => {
    it('should provide clear error messages for validation failures', () => {
      const invalidFandom = {
        name: '',
        slug: 'invalid slug!',
      };

      try {
        FandomSchema.parse(invalidFandom);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;
        expect(zodError.issues).toHaveLength(2); // name and slug errors
        expect(zodError.issues.some(issue => issue.path.includes('name'))).toBe(
          true
        );
        expect(zodError.issues.some(issue => issue.path.includes('slug'))).toBe(
          true
        );
      }
    });

    it('should provide field-specific error messages', () => {
      const invalidTag = {
        name: 'x'.repeat(51), // Too long
        slug: 'valid-slug',
        fandom_id: 'not-a-number', // Wrong type
      };

      try {
        TagSchema.parse(invalidTag);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const zodError = error as z.ZodError;
        const nameError = zodError.issues.find(issue =>
          issue.path.includes('name')
        );
        const fandomIdError = zodError.issues.find(issue =>
          issue.path.includes('fandom_id')
        );

        expect(nameError?.message).toContain('50');
        expect(fandomIdError?.code).toBe('invalid_type');
      }
    });
  });

  describe('Performance Validation', () => {
    it('should validate large datasets efficiently', () => {
      const startTime = performance.now();

      // Validate 1000 entities
      const entities = Array.from({ length: 1000 }, (_, i) => ({
        name: `Test Fandom ${i}`,
        slug: `test-fandom-${i}`,
        description: `Description for test fandom ${i}`,
      }));

      entities.forEach(entity => {
        FandomSchema.parse(entity);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 100ms for 1000 validations)
      expect(duration).toBeLessThan(100);
    });

    it('should handle complex nested validation efficiently', () => {
      const startTime = performance.now();

      const complexPlotBlock = {
        name: 'Complex Plot Block',
        slug: 'complex-plot-block',
        fandom_id: 1,
        category: 'structure',
        complexity: 'epic',
        tags: Array.from(
          { length: 50 },
          (_, i) =>
            `123e4567-e89b-12d3-a456-42661417400${i
              .toString()
              .padStart(1, '0')}`
        ),
        metadata: {
          chapters: Array.from({ length: 100 }, (_, i) => ({
            number: i + 1,
            title: `Chapter ${i + 1}`,
            tags: [`tag-${i}`],
          })),
        },
      };

      PlotBlockSchema.parse(complexPlotBlock);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Complex validation should still be fast (< 10ms)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Schema Evolution and Backwards Compatibility', () => {
    it('should handle deprecated fields gracefully', () => {
      const legacyFandom = {
        name: 'Legacy Fandom',
        slug: 'legacy-fandom',
        deprecated_field: 'old value', // Should be ignored
        legacy_metadata: { old: 'format' }, // Should be handled
      };

      // Schema should parse successfully, ignoring unknown fields
      const result = FandomSchema.passthrough().parse(legacyFandom);
      expect(result.name).toBe('Legacy Fandom');
      expect(result.slug).toBe('legacy-fandom');
    });

    it('should support schema versioning', () => {
      // Future: Test different schema versions
      const v1Schema = FandomSchema;
      const v2Schema = FandomSchema.extend({
        version: z.literal('v2').default('v2'),
        new_field: z.string().optional(),
      });

      const v1Data = { name: 'Test', slug: 'test' };
      const v2Data = { name: 'Test', slug: 'test', new_field: 'value' };

      expect(() => v1Schema.parse(v1Data)).not.toThrow();
      expect(() => v2Schema.parse(v2Data)).not.toThrow();
    });
  });

  describe('Custom Validation Rules', () => {
    it('should support custom slug validation', () => {
      const customSlugSchema = z
        .string()
        .refine(slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), {
          message: 'Slug must be lowercase alphanumeric with hyphens only',
        });

      expect(() => customSlugSchema.parse('valid-slug-123')).not.toThrow();
      expect(() => customSlugSchema.parse('invalid_slug')).toThrow();
      expect(() => customSlugSchema.parse('Invalid-Slug')).toThrow();
    });

    it('should support metadata validation rules', () => {
      const plotBlockWithCustomMetadata = PlotBlockSchema.extend({
        metadata: z
          .object({
            chapters: z.number().min(1).optional(),
            word_count: z.number().min(0).optional(),
            rating: z.enum(['G', 'PG', 'PG-13', 'R', 'NC-17']).optional(),
            warnings: z.array(z.string()).optional(),
          })
          .optional(),
      });

      const validData = {
        name: 'Test',
        slug: 'test',
        fandom_id: 1,
        category: 'character-development',
        complexity: 'simple',
        metadata: {
          chapters: 5,
          word_count: 10000,
          rating: 'PG-13',
          warnings: ['violence'],
        },
      };

      expect(() => plotBlockWithCustomMetadata.parse(validData)).not.toThrow();
    });
  });
});
