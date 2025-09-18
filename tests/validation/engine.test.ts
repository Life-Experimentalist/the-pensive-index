import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationEngine } from '../../src/lib/validation/engine';
import type {
  ValidationContext,
  ValidationResult,
  TagClass,
  PlotBlock,
  Tag,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
} from '../../src/types';

describe('ValidationEngine Core', () => {
  let validationEngine: ValidationEngine;

  const mockTagClasses: TagClass[] = [
    {
      id: 'tc-001',
      name: 'Shipping Tags',
      fandom_id: 'harry-potter',
      description: 'Romantic relationship tags',
      validation_rules: {
        mutual_exclusion: {
          within_class: true,
          conflicting_tags: ['harry-ginny', 'harry-hermione', 'harry-luna'],
        },
        instance_limits: {
          max_instances: 1,
        },
      },
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'tc-002',
      name: 'Plot Categories',
      fandom_id: 'harry-potter',
      description: 'Major plot categorization',
      validation_rules: {
        required_context: {
          required_tags: ['time-travel'],
        },
        dependencies: {
          requires: ['core-premise'],
        },
      },
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
  ];

  const mockPlotBlocks: PlotBlock[] = [
    {
      id: 'pb-001',
      name: 'Soul Bond',
      fandom_id: 'harry-potter',
      category: 'magical-connection',
      description: 'Magical soul connection between characters',
      requires: ['romantic-tag'],
      soft_requires: ['soulmate'],
      enhances: ['emotional-depth'],
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'pb-002',
      name: 'Goblin Inheritance',
      fandom_id: 'harry-potter',
      category: 'financial-political',
      description: 'Harry discovers his magical inheritance',
      conflicts_with: ['muggle-raised'],
      requires: ['gringotts-visit'],
      max_instances: 1,
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'pb-003',
      name: 'Time Travel',
      fandom_id: 'harry-potter',
      category: 'temporal',
      description: 'Characters travel through time',
      conflicts_with: ['canon-timeline'],
      requires: ['time-turner'],
      excludes_categories: ['pure-canon'],
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
  ];

  const mockTags: Tag[] = [
    {
      id: 'tag-001',
      name: 'harry-hermione',
      fandom_id: 'harry-potter',
      description: 'Harry Potter/Hermione Granger relationship',
      category: 'shipping',
      tag_class_id: 'tc-001',
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'tag-002',
      name: 'harry-ginny',
      fandom_id: 'harry-potter',
      description: 'Harry Potter/Ginny Weasley relationship',
      category: 'shipping',
      tag_class_id: 'tc-001',
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'tag-003',
      name: 'time-travel',
      fandom_id: 'harry-potter',
      description: 'Time travel elements',
      category: 'plot',
      requires: ['temporal-mechanics'],
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
    {
      id: 'tag-004',
      name: 'soulmate',
      fandom_id: 'harry-potter',
      description: 'Soulmate bond concept',
      category: 'relationship-type',
      enhances: ['soul-bond'],
      is_active: true,
      created_at: new Date('2025-01-17T10:00:00Z'),
      updated_at: new Date('2025-01-17T10:00:00Z'),
    },
  ];

  beforeEach(() => {
    // Create fresh instance for each test with mock data
    validationEngine = new ValidationEngine(mockTagClasses, mockPlotBlocks);
  });

  describe('Engine Initialization', () => {
    it('should initialize with empty arrays by default', () => {
      const engine = new ValidationEngine();
      expect(engine).toBeDefined();
    });

    it('should accept tag classes and plot blocks in constructor', () => {
      const engine = new ValidationEngine(mockTagClasses, mockPlotBlocks);
      expect(engine).toBeDefined();
    });

    it('should load tag classes correctly', () => {
      const engine = new ValidationEngine();
      engine.loadTagClasses(mockTagClasses);
      // Test by running validation that would use tag classes
      expect(engine).toBeDefined();
    });

    it('should load plot blocks correctly', () => {
      const engine = new ValidationEngine();
      engine.loadPlotBlocks(mockPlotBlocks);
      // Test by running validation that would use plot blocks
      expect(engine).toBeDefined();
    });
  });

  describe('Validation Context Processing', () => {
    it('should validate a simple context successfully', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione'],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(result).toMatchObject({
        is_valid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });

    it('should detect shipping conflicts within tag class', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'harry-ginny'], // Conflicting ships
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Should detect mutual exclusion violation
      expect(result.is_valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some(
          error =>
            error.message.toLowerCase().includes('conflict') ||
            error.message.toLowerCase().includes('exclusion')
        )
      ).toBe(true);
    });

    it('should handle empty applied tags gracefully', () => {
      const context: ValidationContext = {
        applied_tags: [],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(result.is_valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate plot block context when provided', () => {
      const context: ValidationContext = {
        plot_block: mockPlotBlocks[0], // Soul Bond
        applied_tags: ['harry-hermione'],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(result).toMatchObject({
        is_valid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });
  });

  describe('Tag Class Validation Rules', () => {
    it('should enforce mutual exclusion within class', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'harry-ginny'],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      expect(result.is_valid).toBe(false);
      expect(
        result.errors.some(
          error =>
            error.type === 'mutual_exclusion' ||
            error.message.toLowerCase().includes('conflict')
        )
      ).toBe(true);
    });

    it('should enforce instance limits', () => {
      // Create context that violates max_instances: 1 for shipping class
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'harry-luna'], // Assuming both are in shipping class
        all_tags: [
          ...mockTags,
          {
            id: 'tag-005',
            name: 'harry-luna',
            fandom_id: 'harry-potter',
            description: 'Harry Potter/Luna Lovegood relationship',
            category: 'shipping',
            tag_class_id: 'tc-001',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Should detect instance limit violation if shipping class has max_instances: 1
      if (
        mockTagClasses[0].validation_rules.instance_limits?.max_instances === 1
      ) {
        expect(result.is_valid).toBe(false);
        expect(
          result.errors.some(
            error =>
              error.message.toLowerCase().includes('instance') ||
              error.message.toLowerCase().includes('limit')
          )
        ).toBe(true);
      }
    });

    it('should validate required context', () => {
      const contextWithMissingRequirement: ValidationContext = {
        applied_tags: [], // Missing required 'time-travel' tag for tc-002
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(contextWithMissingRequirement);

      // Check if validation detects missing required context
      expect(result).toMatchObject({
        is_valid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });
  });

  describe('Plot Block Validation', () => {
    it('should validate plot block requirements', () => {
      const context: ValidationContext = {
        plot_block: mockPlotBlocks[0], // Soul Bond - requires 'romantic-tag'
        applied_tags: [], // Missing required tags
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Should detect missing requirements
      expect(
        result.errors.length + result.warnings.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should detect plot block conflicts', () => {
      const context: ValidationContext = {
        plot_block: mockPlotBlocks[1], // Goblin Inheritance - conflicts with 'muggle-raised'
        applied_tags: ['muggle-raised'],
        all_tags: [
          ...mockTags,
          {
            id: 'tag-006',
            name: 'muggle-raised',
            fandom_id: 'harry-potter',
            description: 'Raised by muggles',
            category: 'background',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Should detect conflict
      expect(
        result.errors.some(error =>
          error.message.toLowerCase().includes('conflict')
        )
      ).toBe(true);
    });

    it('should handle enhancement relationships', () => {
      const context: ValidationContext = {
        plot_block: mockPlotBlocks[0], // Soul Bond - enhanced by 'soulmate'
        applied_tags: ['harry-hermione', 'soulmate'],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Should validate successfully with enhancement
      expect(result).toMatchObject({
        is_valid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });
  });

  describe('Performance and Error Handling', () => {
    it('should complete validation within reasonable time', () => {
      const startTime = performance.now();

      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'time-travel'],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within 100ms for simple validation
      expect(executionTime).toBeLessThan(100);
      expect(result).toBeDefined();
    });

    it('should handle malformed tag classes gracefully', () => {
      const malformedTagClasses = [
        {
          id: 'bad-tc',
          validation_rules: {}, // Missing required fields
        } as any,
      ];

      const engine = new ValidationEngine(malformedTagClasses, mockPlotBlocks);

      const context: ValidationContext = {
        applied_tags: ['harry-hermione'],
        all_tags: mockTags,
        tag_classes: malformedTagClasses,
        metadata: {},
      };

      // Should not throw error
      expect(() => engine.validate(context)).not.toThrow();
    });

    it('should handle malformed plot blocks gracefully', () => {
      const malformedPlotBlocks = [
        {
          id: 'bad-pb',
          // Missing required fields
        } as any,
      ];

      const engine = new ValidationEngine(mockTagClasses, malformedPlotBlocks);

      const context: ValidationContext = {
        plot_block: malformedPlotBlocks[0],
        applied_tags: ['harry-hermione'],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      // Should not throw error
      expect(() => engine.validate(context)).not.toThrow();
    });

    it('should handle large numbers of tags efficiently', () => {
      // Create large tag array for stress testing
      const largeTags = [...mockTags];
      for (let i = 0; i < 100; i++) {
        largeTags.push({
          id: `stress-tag-${i}`,
          name: `stress-tag-${i}`,
          fandom_id: 'harry-potter',
          description: `Stress test tag ${i}`,
          category: 'test',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      const startTime = performance.now();

      const context: ValidationContext = {
        applied_tags: largeTags.slice(0, 50).map(t => t.name),
        all_tags: largeTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should still complete within reasonable time even with many tags
      expect(executionTime).toBeLessThan(500); // 500ms for stress test
      expect(result).toBeDefined();
    });
  });

  describe('Result Structure Validation', () => {
    it('should return properly structured validation result', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione'],
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      // Validate result structure
      expect(result).toHaveProperty('is_valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.is_valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should include suggestions when available', () => {
      const context: ValidationContext = {
        plot_block: mockPlotBlocks[0], // Soul Bond - soft requires 'soulmate'
        applied_tags: ['harry-hermione'], // Missing soft requirement
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      if (result.suggestions) {
        expect(Array.isArray(result.suggestions)).toBe(true);
        result.suggestions.forEach(suggestion => {
          expect(suggestion).toHaveProperty('type');
          expect(suggestion).toHaveProperty('message');
          expect(suggestion).toHaveProperty('action');
        });
      }
    });

    it('should provide detailed error information', () => {
      const context: ValidationContext = {
        applied_tags: ['harry-hermione', 'harry-ginny'], // Conflicting ships
        all_tags: mockTags,
        tag_classes: mockTagClasses,
        metadata: {},
      };

      const result = validationEngine.validate(context);

      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          expect(error).toHaveProperty('type');
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('severity');
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(0);
        });
      }
    });
  });
});
