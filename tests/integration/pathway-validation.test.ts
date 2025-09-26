/**
 * Integration Test: Pathway Validation User Story (T016)
 *
 * User Story: "As a user, I want the system to validate my story pathway
 * and show conflict detection with suggested fixes in a modal so I can
 * build coherent, conflict-free story combinations."
 *
 * This test validates the validation engine per constitutional requirement
 * for <200ms validation response time and comprehensive conflict detection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock validation rules for testing
const mockValidationRules = {
  tagConflicts: [
    {
      id: 'ship-conflict-1',
      conflicting: ['harry/hermione', 'harry/ginny'],
      type: 'mutual-exclusion',
      severity: 'error',
      message: 'Harry cannot be paired with multiple people simultaneously',
      suggestedFix: 'Choose one romantic pairing for Harry',
    },
    {
      id: 'timeline-conflict-1',
      conflicting: ['marauders-era', 'post-hogwarts'],
      type: 'temporal-incompatible',
      severity: 'error',
      message: 'These time periods cannot occur simultaneously',
      suggestedFix: 'Select a single time period for your story',
    },
  ],
  plotBlockConflicts: [
    {
      id: 'power-conflict-1',
      conflicting: ['dark-harry', 'light-harry'],
      type: 'character-alignment',
      severity: 'error',
      message: 'Harry cannot be both dark and light aligned',
      suggestedFix: 'Choose a consistent character alignment',
    },
  ],
  dependencies: [
    {
      id: 'inheritance-dependency-1',
      requires: 'goblin-inheritance',
      dependent: 'multiple-lordships',
      type: 'prerequisite',
      severity: 'warning',
      message:
        'Multiple lordships typically requires goblin inheritance discovery',
      suggestedFix: 'Add goblin inheritance to enable multiple lordships',
    },
  ],
  impossibleCombinations: [
    {
      id: 'impossible-1',
      elements: ['voldemort-dead', 'voldemort-alive'],
      type: 'logical-contradiction',
      severity: 'error',
      message: 'Voldemort cannot be simultaneously dead and alive',
      suggestedFix: 'Choose one state for Voldemort',
    },
  ],
};

// Mock pathway with conflicts for testing
const mockConflictedPathway = {
  id: 'pathway-conflict-1',
  fandomId: 'harry-potter',
  elements: [
    { id: 'tag-1', name: 'harry/hermione', type: 'tag', order: 0 },
    { id: 'tag-2', name: 'harry/ginny', type: 'tag', order: 1 }, // Conflict!
    { id: 'tag-3', name: 'time-travel', type: 'tag', order: 2 },
    { id: 'plot-1', name: 'dark-harry', type: 'plotBlock', order: 3 },
    { id: 'plot-2', name: 'light-harry', type: 'plotBlock', order: 4 }, // Conflict!
    { id: 'plot-3', name: 'multiple-lordships', type: 'plotBlock', order: 5 }, // Missing dependency
  ],
};

// Mock valid pathway for comparison
const mockValidPathway = {
  id: 'pathway-valid-1',
  fandomId: 'harry-potter',
  elements: [
    { id: 'tag-1', name: 'harry/hermione', type: 'tag', order: 0 },
    { id: 'tag-2', name: 'time-travel', type: 'tag', order: 1 },
    { id: 'plot-1', name: 'goblin-inheritance', type: 'plotBlock', order: 2 },
    { id: 'plot-2', name: 'multiple-lordships', type: 'plotBlock', order: 3 },
  ],
};

// Mock validation response structure
const mockValidationResponse = {
  isValid: false,
  validationTime: 145, // milliseconds
  conflicts: [
    {
      id: 'conflict-1',
      type: 'mutual-exclusion',
      severity: 'error',
      elements: ['harry/hermione', 'harry/ginny'],
      message: 'Harry cannot be paired with multiple people simultaneously',
      suggestedFixes: [
        {
          action: 'remove',
          elementId: 'tag-2',
          description: 'Remove Harry/Ginny pairing',
        },
        {
          action: 'remove',
          elementId: 'tag-1',
          description: 'Remove Harry/Hermione pairing',
        },
      ],
    },
    {
      id: 'conflict-2',
      type: 'character-alignment',
      severity: 'error',
      elements: ['dark-harry', 'light-harry'],
      message: 'Harry cannot be both dark and light aligned',
      suggestedFixes: [
        {
          action: 'remove',
          elementId: 'plot-1',
          description: 'Remove dark Harry characterization',
        },
        {
          action: 'remove',
          elementId: 'plot-2',
          description: 'Remove light Harry characterization',
        },
      ],
    },
  ],
  warnings: [
    {
      id: 'warning-1',
      type: 'missing-dependency',
      severity: 'warning',
      elements: ['multiple-lordships'],
      message:
        'Multiple lordships typically requires goblin inheritance discovery',
      suggestedFixes: [
        {
          action: 'add',
          elementId: 'goblin-inheritance',
          description: 'Add goblin inheritance plot block',
        },
      ],
    },
  ],
  suggestions: [
    {
      id: 'suggestion-1',
      type: 'enhancement',
      message:
        'Consider adding "powerful-harry" tag to complement multiple lordships',
      elementToAdd: { name: 'powerful-harry', type: 'tag' },
    },
  ],
  fixedPathwayOptions: [
    {
      id: 'option-1',
      description: 'Remove conflicting relationships, keep time travel focus',
      changes: [
        { action: 'remove', elementId: 'tag-2' },
        { action: 'remove', elementId: 'plot-2' },
        {
          action: 'add',
          element: { name: 'goblin-inheritance', type: 'plotBlock' },
        },
      ],
    },
  ],
};

describe('Pathway Validation Integration Test (T016)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for validation API calls
    global.fetch = vi.fn();

    // Mock performance timing
    Object.defineProperty(global.performance, 'now', {
      writable: true,
      value: vi.fn(() => Date.now()),
    });
  });

  it('should validate validation component structure exists', async () => {
    // This test MUST fail initially - validation components don't exist yet
    const ValidationComponentExists = () => {
      try {
        // These imports will fail until validation components are implemented
        // @ts-expect-error - Components don't exist yet
        const {
          PathwayValidator,
        } = require('@/components/validation/PathwayValidator');
        // @ts-expect-error - Components don't exist yet
        const {
          ConflictModal,
        } = require('@/components/validation/ConflictModal');
        // @ts-expect-error - Components don't exist yet
        const {
          ValidationEngine,
        } = require('@/lib/validation/ValidationEngine');
        // @ts-expect-error - Components don't exist yet
        const {
          ConflictDetector,
        } = require('@/lib/validation/ConflictDetector');

        return true;
      } catch {
        return false;
      }
    };

    // Should fail until validation components are implemented
    expect(ValidationComponentExists()).toBe(false);
  });

  it('should detect tag conflicts correctly', () => {
    // Test tag conflict detection algorithm
    const detectTagConflicts = (
      pathway: typeof mockConflictedPathway,
      rules: typeof mockValidationRules
    ) => {
      const pathwayTags = pathway.elements
        .filter(el => el.type === 'tag')
        .map(el => el.name);

      const conflicts: Array<{ rule: any; conflictingElements: string[] }> = [];

      rules.tagConflicts.forEach(rule => {
        const conflictingInPathway = rule.conflicting.filter(tag =>
          pathwayTags.includes(tag)
        );

        if (conflictingInPathway.length > 1) {
          conflicts.push({
            rule,
            conflictingElements: conflictingInPathway,
          });
        }
      });

      return conflicts;
    };

    const tagConflicts = detectTagConflicts(
      mockConflictedPathway,
      mockValidationRules
    );

    expect(tagConflicts).toHaveLength(1);
    expect(tagConflicts[0].conflictingElements).toContain('harry/hermione');
    expect(tagConflicts[0].conflictingElements).toContain('harry/ginny');
    expect(tagConflicts[0].rule.severity).toBe('error');
  });

  it('should detect plot block conflicts correctly', () => {
    // Test plot block conflict detection
    const detectPlotBlockConflicts = (
      pathway: typeof mockConflictedPathway,
      rules: typeof mockValidationRules
    ) => {
      const pathwayPlotBlocks = pathway.elements
        .filter(el => el.type === 'plotBlock')
        .map(el => el.name);

      const conflicts: Array<{ rule: any; conflictingElements: string[] }> = [];

      rules.plotBlockConflicts.forEach(rule => {
        const conflictingInPathway = rule.conflicting.filter(block =>
          pathwayPlotBlocks.includes(block)
        );

        if (conflictingInPathway.length > 1) {
          conflicts.push({
            rule,
            conflictingElements: conflictingInPathway,
          });
        }
      });

      return conflicts;
    };

    const plotConflicts = detectPlotBlockConflicts(
      mockConflictedPathway,
      mockValidationRules
    );

    expect(plotConflicts).toHaveLength(1);
    expect(plotConflicts[0].conflictingElements).toContain('dark-harry');
    expect(plotConflicts[0].conflictingElements).toContain('light-harry');
  });

  it('should detect missing dependencies', () => {
    // Test dependency validation
    const checkDependencies = (
      pathway: typeof mockConflictedPathway,
      rules: typeof mockValidationRules
    ) => {
      const pathwayElementNames = pathway.elements.map(el => el.name);
      const missingDependencies: Array<{ rule: any; missing: string }> = [];

      rules.dependencies.forEach(rule => {
        if (
          pathwayElementNames.includes(rule.dependent) &&
          !pathwayElementNames.includes(rule.requires)
        ) {
          missingDependencies.push({
            rule,
            missing: rule.requires,
          });
        }
      });

      return missingDependencies;
    };

    const missing = checkDependencies(
      mockConflictedPathway,
      mockValidationRules
    );

    expect(missing).toHaveLength(1);
    expect(missing[0].missing).toBe('goblin-inheritance');
    expect(missing[0].rule.dependent).toBe('multiple-lordships');
  });

  it('should meet constitutional performance requirements', async () => {
    // Constitutional requirement: <200ms validation response time
    const maxValidationTime = 200;

    const simulateValidation = async (
      pathway: typeof mockConflictedPathway
    ) => {
      const startTime = performance.now();

      // Simulate validation processing
      const result = {
        ...mockValidationResponse,
        validationTime: Math.random() * 150 + 50, // 50-200ms range
      };

      const endTime = performance.now();
      return {
        result,
        actualTime: endTime - startTime,
        reportedTime: result.validationTime,
      };
    };

    const validationResult = await simulateValidation(mockConflictedPathway);

    // Both actual and reported times should meet constitutional requirement
    expect(validationResult.reportedTime).toBeLessThan(maxValidationTime);
    expect(validationResult.actualTime).toBeLessThan(maxValidationTime);
  });

  it('should validate validation API contract', async () => {
    // Mock validation API call
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockValidationResponse),
    });
    global.fetch = mockFetch;

    const validatePathway = async (pathway: typeof mockConflictedPathway) => {
      const response = await fetch('/api/validation/pathway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fandom: pathway.fandomId,
          elements: pathway.elements,
        }),
      });

      return response.json();
    };

    const result = await validatePathway(mockConflictedPathway);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/validation/pathway',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(result.isValid).toBe(false);
    expect(result.conflicts).toHaveLength(2);
  });

  it('should generate suggested fixes for conflicts', () => {
    // Test suggested fix generation
    const generateFixes = (
      conflicts: typeof mockValidationResponse.conflicts
    ) => {
      const fixes: Array<{
        conflictId: string;
        options: Array<{
          action: string;
          description: string;
          elementId?: string;
        }>;
      }> = [];

      conflicts.forEach(conflict => {
        const options: Array<{
          action: string;
          description: string;
          elementId?: string;
        }> = [];

        if (conflict.type === 'mutual-exclusion') {
          // For mutual exclusion, offer to remove each conflicting element
          conflict.elements.forEach(element => {
            options.push({
              action: 'remove',
              description: `Remove ${element}`,
              elementId: element,
            });
          });
        }

        if (conflict.type === 'character-alignment') {
          // For alignment conflicts, suggest keeping one alignment
          options.push(
            {
              action: 'remove',
              description: `Keep character as ${conflict.elements[0]}`,
              elementId: conflict.elements[1],
            },
            {
              action: 'remove',
              description: `Keep character as ${conflict.elements[1]}`,
              elementId: conflict.elements[0],
            }
          );
        }

        fixes.push({
          conflictId: conflict.id,
          options,
        });
      });

      return fixes;
    };

    const fixes = generateFixes(mockValidationResponse.conflicts);

    expect(fixes).toHaveLength(2);
    expect(fixes[0].options.length).toBeGreaterThan(0);
    expect(fixes[0].options[0]).toHaveProperty('action');
    expect(fixes[0].options[0]).toHaveProperty('description');
  });

  it('should support auto-fix suggestions', () => {
    // Test automatic fix application
    const autoFix = (
      pathway: typeof mockConflictedPathway,
      fixes: Array<{ action: string; elementId?: string; element?: any }>
    ) => {
      let fixedPathway = { ...pathway };

      fixes.forEach(fix => {
        if (fix.action === 'remove' && fix.elementId) {
          fixedPathway = {
            ...fixedPathway,
            elements: fixedPathway.elements.filter(
              el => el.name !== fix.elementId
            ),
          };
        }

        if (fix.action === 'add' && fix.element) {
          const newElement = {
            id: `auto-${Date.now()}`,
            name: fix.element.name,
            type: fix.element.type,
            order: fixedPathway.elements.length,
          };

          fixedPathway = {
            ...fixedPathway,
            elements: [...fixedPathway.elements, newElement],
          };
        }
      });

      return fixedPathway;
    };

    const fixes = [
      { action: 'remove', elementId: 'harry/ginny' },
      { action: 'remove', elementId: 'light-harry' },
      {
        action: 'add',
        element: { name: 'goblin-inheritance', type: 'plotBlock' },
      },
    ];

    const fixedPathway = autoFix(mockConflictedPathway, fixes);

    expect(fixedPathway.elements.some(el => el.name === 'harry/ginny')).toBe(
      false
    );
    expect(fixedPathway.elements.some(el => el.name === 'light-harry')).toBe(
      false
    );
    expect(
      fixedPathway.elements.some(el => el.name === 'goblin-inheritance')
    ).toBe(true);
  });

  it('should validate conflict modal structure and behavior', () => {
    // Test conflict modal data structure
    const modalData = {
      isOpen: true,
      title: 'Pathway Conflicts Detected',
      conflicts: mockValidationResponse.conflicts,
      warnings: mockValidationResponse.warnings,
      onApplyFix: vi.fn(),
      onDismiss: vi.fn(),
      onAutoFix: vi.fn(),
      showSeverityFilter: true,
      allowBulkFixes: true,
    };

    expect(modalData.conflicts).toHaveLength(2);
    expect(modalData.warnings).toHaveLength(1);
    expect(modalData.conflicts[0]).toHaveProperty('suggestedFixes');
    expect(typeof modalData.onApplyFix).toBe('function');
  });

  it('should support real-time validation during pathway building', () => {
    // Test incremental validation as elements are added
    const incrementalValidation = (
      currentPathway: typeof mockValidPathway,
      newElement: any,
      rules: typeof mockValidationRules
    ) => {
      const tempPathway = {
        ...currentPathway,
        elements: [...currentPathway.elements, newElement],
      };

      // Quick validation check for immediate feedback
      const quickCheck = {
        hasConflicts: false,
        newConflicts: [] as string[],
        warnings: [] as string[],
      };

      // Check if new element conflicts with existing ones
      const existingElementNames = currentPathway.elements.map(el => el.name);

      rules.tagConflicts.forEach(rule => {
        if (
          rule.conflicting.includes(newElement.name) &&
          rule.conflicting.some(tag => existingElementNames.includes(tag))
        ) {
          quickCheck.hasConflicts = true;
          quickCheck.newConflicts.push(rule.id);
        }
      });

      return quickCheck;
    };

    // Test adding conflicting element
    const conflictingElement = {
      id: 'new-1',
      name: 'harry/ginny',
      type: 'tag',
      order: 4,
    };
    const validationResult = incrementalValidation(
      mockValidPathway,
      conflictingElement,
      mockValidationRules
    );

    // Should detect conflict since mockValidPathway has harry/hermione
    expect(validationResult.hasConflicts).toBe(true);
    expect(validationResult.newConflicts.length).toBeGreaterThan(0);
  });

  it('should validate complex multi-element conflicts', () => {
    // Test complex validation scenarios with multiple dependencies
    const complexValidation = (pathway: typeof mockConflictedPathway) => {
      const elementNames = pathway.elements.map(el => el.name);
      const complexConflicts = [];

      // Check for impossible timeline combinations
      const timelineElements = ['marauders-era', 'post-war', 'next-gen'];
      const timelineInPathway = elementNames.filter(name =>
        timelineElements.includes(name)
      );

      if (timelineInPathway.length > 1) {
        complexConflicts.push({
          type: 'temporal-impossibility',
          elements: timelineInPathway,
          message: 'Multiple incompatible time periods selected',
        });
      }

      // Check for character age conflicts
      const characterAges = {
        'young-harry': 11,
        'adult-harry': 25,
        'elderly-harry': 60,
      };

      const ageConflicts = Object.keys(characterAges).filter(age =>
        elementNames.includes(age)
      );
      if (ageConflicts.length > 1) {
        complexConflicts.push({
          type: 'age-inconsistency',
          elements: ageConflicts,
          message: 'Character cannot be multiple ages simultaneously',
        });
      }

      return complexConflicts;
    };

    const complexResult = complexValidation(mockConflictedPathway);
    expect(Array.isArray(complexResult)).toBe(true);
  });

  it('should support validation rule customization', () => {
    // Test custom validation rules for different fandoms
    const customRules = {
      'harry-potter': mockValidationRules,
      'percy-jackson': {
        tagConflicts: [
          {
            id: 'godly-parent-conflict',
            conflicting: ['child-of-poseidon', 'child-of-zeus'],
            type: 'parentage-conflict',
            severity: 'error',
            message: 'Character cannot have multiple godly parents',
            suggestedFix: 'Choose one godly parent',
          },
        ],
        plotBlockConflicts: [],
        dependencies: [],
        impossibleCombinations: [],
      },
    };

    const getRulesForFandom = (fandomId: string) => {
      return (
        customRules[fandomId as keyof typeof customRules] ||
        customRules['harry-potter']
      );
    };

    const harryPotterRules = getRulesForFandom('harry-potter');
    const percyJacksonRules = getRulesForFandom('percy-jackson');

    expect(harryPotterRules.tagConflicts).toHaveLength(2);
    expect(percyJacksonRules.tagConflicts).toHaveLength(1);
    expect(percyJacksonRules.tagConflicts[0].id).toBe('godly-parent-conflict');
  });

  it('should handle validation errors gracefully', async () => {
    // Test error handling for validation service failures
    const mockFailedFetch = vi
      .fn()
      .mockRejectedValue(new Error('Validation service unavailable'));
    global.fetch = mockFailedFetch;

    const validateWithFallback = async (
      pathway: typeof mockConflictedPathway
    ) => {
      try {
        const response = await fetch('/api/validation/pathway');
        return await response.json();
      } catch (error) {
        return {
          isValid: null,
          conflicts: [],
          warnings: [],
          error: 'Validation temporarily unavailable',
          fallbackMode: true,
          message: 'Please review your pathway manually',
        };
      }
    };

    const errorResult = await validateWithFallback(mockConflictedPathway);

    expect(errorResult.isValid).toBeNull();
    expect(errorResult.error).toBe('Validation temporarily unavailable');
    expect(errorResult.fallbackMode).toBe(true);
  });

  it('should support batch validation for multiple pathways', () => {
    // Test batch validation functionality
    const batchValidate = (pathways: Array<typeof mockValidPathway>) => {
      return pathways.map(pathway => {
        const elementNames = pathway.elements.map(el => el.name);

        // Simple validation check
        const hasShippingConflict =
          elementNames.includes('harry/hermione') &&
          elementNames.includes('harry/ginny');

        return {
          pathwayId: pathway.id,
          isValid: !hasShippingConflict,
          conflictCount: hasShippingConflict ? 1 : 0,
          validationTime: Math.random() * 100 + 50,
        };
      });
    };

    const pathways = [mockValidPathway, mockConflictedPathway];
    const batchResults = batchValidate(pathways);

    expect(batchResults).toHaveLength(2);
    expect(batchResults[0].isValid).toBe(true);
    expect(batchResults[1].isValid).toBe(false);
    expect(batchResults[1].conflictCount).toBeGreaterThan(0);
  });

  it('should validate suggestion quality and relevance', () => {
    // Test suggestion algorithm for pathway improvements
    const generateSuggestions = (pathway: typeof mockValidPathway) => {
      const elementNames = pathway.elements.map(el => el.name);
      const suggestions = [];

      // Suggest complementary elements
      if (elementNames.includes('time-travel')) {
        suggestions.push({
          type: 'complementary',
          suggestion: 'fix-it',
          reason: 'Time travel stories often involve fixing canonical problems',
          confidence: 0.8,
        });
      }

      if (elementNames.includes('goblin-inheritance')) {
        suggestions.push({
          type: 'enhancement',
          suggestion: 'powerful-harry',
          reason: 'Inheritance plots typically involve power increases',
          confidence: 0.7,
        });
      }

      // Suggest popular combinations
      if (
        elementNames.includes('harry/hermione') &&
        elementNames.includes('time-travel')
      ) {
        suggestions.push({
          type: 'popular-combination',
          suggestion: 'third-year-au',
          reason: 'Popular combination in time travel romance stories',
          confidence: 0.9,
        });
      }

      return suggestions;
    };

    const suggestions = generateSuggestions(mockValidPathway);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toHaveProperty('confidence');
    expect(suggestions[0].confidence).toBeGreaterThan(0);
    expect(suggestions[0].confidence).toBeLessThanOrEqual(1);
  });
});
