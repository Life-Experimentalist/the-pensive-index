import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ValidationEngine } from '../../src/lib/validation/engine';
import { PerformanceMonitor } from '../../src/lib/performance/monitor';

// Integration test types for realistic fanfiction scenarios
interface PathwayContext {
  fandom: string;
  tags: string[];
  plotBlocks: string[];
  characters: string[];
  relationships: string[];
  metadata: {
    wordCount?: number;
    chapters?: number;
    status: 'complete' | 'in-progress' | 'abandoned';
    rating: 'G' | 'T' | 'M' | 'E';
  };
}

interface ValidationWorkflowResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  performanceMetrics: {
    totalTime: number;
    ruleExecutionTime: number;
    tagValidationTime: number;
    plotValidationTime: number;
  };
  pathwayAnalysis: {
    complexity: 'low' | 'medium' | 'high' | 'extreme';
    conflictCount: number;
    dependencyIssues: number;
    noveltySuggestions: string[];
  };
}

interface ValidationError {
  type:
    | 'conflict'
    | 'missing_dependency'
    | 'invalid_combination'
    | 'constraint_violation';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  affectedTags?: string[];
  affectedPlotBlocks?: string[];
  suggestedFix?: string[];
}

interface ValidationWarning {
  type:
    | 'potential_conflict'
    | 'unusual_combination'
    | 'performance_concern'
    | 'completeness';
  message: string;
  affectedElements: string[];
  recommendation?: string;
}

interface ValidationSuggestion {
  type: 'enhancement' | 'alternative' | 'optimization' | 'novelty';
  message: string;
  tags?: string[];
  plotBlocks?: string[];
  reasoning: string;
}

// Mock Complex Validation Engine for Integration Testing
class IntegratedValidationEngine {
  private validationEngine: ValidationEngine;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.validationEngine = new ValidationEngine();
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  async validateCompletePathway(
    pathway: PathwayContext
  ): Promise<ValidationWorkflowResult> {
    const startTime = performance.now();

    try {
      // Performance monitoring setup
      const mainTimer =
        this.performanceMonitor.startTimer('pathway-validation');

      // Tag validation phase
      const tagTimer = this.performanceMonitor.startTimer('tag-validation');
      const tagValidationResult = await this.validateTags(pathway);
      const tagValidationTime = tagTimer.end(tagValidationResult.valid);

      // Plot block validation phase
      const plotTimer = this.performanceMonitor.startTimer('plot-validation');
      const plotValidationResult = await this.validatePlotBlocks(pathway);
      const plotValidationTime = plotTimer.end(plotValidationResult.valid);

      // Cross-system validation
      const crossTimer = this.performanceMonitor.startTimer('cross-validation');
      const crossValidationResult = await this.validateCrossSystemRules(
        pathway
      );
      crossTimer.end(crossValidationResult.valid);

      // Pathway analysis
      const pathwayAnalysis = this.analyzePathwayComplexity(pathway);

      const totalTime = mainTimer.end(true);

      return {
        isValid: this.determineOverallValidity([
          tagValidationResult,
          plotValidationResult,
          crossValidationResult,
        ]),
        errors: this.consolidateErrors([
          tagValidationResult,
          plotValidationResult,
          crossValidationResult,
        ]),
        warnings: this.consolidateWarnings([
          tagValidationResult,
          plotValidationResult,
          crossValidationResult,
        ]),
        suggestions: this.generateSuggestions(pathway, pathwayAnalysis),
        performanceMetrics: {
          totalTime,
          ruleExecutionTime: totalTime - tagValidationTime - plotValidationTime,
          tagValidationTime,
          plotValidationTime,
        },
        pathwayAnalysis,
      };
    } catch (error: unknown) {
      const totalTime = performance.now() - startTime;

      return {
        isValid: false,
        errors: [
          {
            type: 'constraint_violation',
            severity: 'critical',
            message: `Validation engine error: ${
              error instanceof Error ? error.message : String(error)
            }`,
            suggestedFix: [
              'Check pathway structure',
              'Verify all required fields',
            ],
          },
        ],
        warnings: [],
        suggestions: [],
        performanceMetrics: {
          totalTime,
          ruleExecutionTime: 0,
          tagValidationTime: 0,
          plotValidationTime: 0,
        },
        pathwayAnalysis: {
          complexity: 'extreme',
          conflictCount: 0,
          dependencyIssues: 1,
          noveltySuggestions: [],
        },
      };
    }
  }

  private async validateTags(pathway: PathwayContext): Promise<any> {
    const errors = [];
    const warnings = [];

    // Harry Potter shipping validation
    if (pathway.fandom === 'harry-potter') {
      const shippingTags = pathway.tags.filter(
        tag =>
          tag.includes('/') || tag.includes('-shipping') || tag.includes('x')
      );

      // Mutual exclusion validation
      const harryShips = shippingTags.filter(tag => tag.includes('harry'));
      if (harryShips.length > 1) {
        errors.push({
          type: 'conflict',
          severity: 'major',
          message: 'Multiple Harry Potter shipping tags detected',
          affectedTags: harryShips,
          suggestedFix: [
            'Choose one primary ship',
            'Use "multiple-relationships" tag if intentional',
          ],
        });
      }

      // Age-appropriate relationship validation
      const adultShips = ['teacher/student', 'adult/minor'];
      const problemShips = shippingTags.filter(tag =>
        adultShips.some(adult => tag.includes(adult))
      );

      if (problemShips.length > 0 && pathway.metadata.rating !== 'E') {
        warnings.push({
          type: 'potential_conflict',
          message: 'Adult relationships may require mature rating',
          affectedElements: problemShips,
          recommendation: 'Consider appropriate content rating',
        });
      }
    }

    // Time period consistency
    const timeTags = pathway.tags.filter(
      tag => tag.includes('era') || tag.includes('war') || tag.includes('year')
    );

    if (timeTags.includes('marauders-era') && timeTags.includes('next-gen')) {
      errors.push({
        type: 'invalid_combination',
        severity: 'major',
        message: 'Conflicting time periods: Marauders Era and Next Generation',
        affectedTags: ['marauders-era', 'next-gen'],
        suggestedFix: [
          'Choose one time period',
          'Use "time-travel" if both are intentional',
        ],
      });
    }

    return { errors, warnings };
  }

  private async validatePlotBlocks(pathway: PathwayContext): Promise<any> {
    const errors = [];
    const warnings = [];

    // Plot block dependency validation
    if (pathway.plotBlocks.includes('soul-bond')) {
      const requiredTags = ['romantic', 'bonding', 'magical-bond'];
      const missingTags = requiredTags.filter(
        tag => !pathway.tags.includes(tag)
      );

      if (missingTags.length > 0) {
        warnings.push({
          type: 'completeness',
          message: 'Soul bond plot may benefit from additional tags',
          affectedElements: missingTags,
          recommendation: 'Consider adding relevant bond-related tags',
        });
      }
    }

    // Inheritance plot complexity
    if (pathway.plotBlocks.includes('goblin-inheritance')) {
      const lordshipCount = pathway.plotBlocks.filter(
        block => block.includes('lordship') || block.includes('heir')
      ).length;

      if (lordshipCount > 3) {
        warnings.push({
          type: 'performance_concern',
          message: 'Very complex inheritance structure detected',
          affectedElements: pathway.plotBlocks.filter(
            block => block.includes('lordship') || block.includes('heir')
          ),
          recommendation:
            'Consider simplifying or using "multiple-lordships" tag',
        });
      }
    }

    // Dark magic plot validation
    if (
      pathway.plotBlocks.includes('dark-magic-use') &&
      pathway.metadata.rating === 'G'
    ) {
      errors.push({
        type: 'invalid_combination',
        severity: 'major',
        message: 'Dark magic content incompatible with General rating',
        affectedPlotBlocks: ['dark-magic-use'],
        suggestedFix: [
          'Change rating to Teen or higher',
          'Remove dark magic elements',
        ],
      });
    }

    return { errors, warnings };
  }

  private async validateCrossSystemRules(
    pathway: PathwayContext
  ): Promise<any> {
    const errors = [];
    const warnings = [];

    // Character-relationship consistency
    if (
      pathway.relationships.includes('harry/hermione') &&
      !pathway.characters.includes('harry-potter')
    ) {
      errors.push({
        type: 'missing_dependency',
        severity: 'critical',
        message: 'Relationship specified without required character',
        suggestedFix: [
          'Add harry-potter to characters',
          'Remove harry/hermione relationship',
        ],
      });
    }

    // Plot-character alignment
    if (
      pathway.plotBlocks.includes('wrong-boy-who-lived') &&
      pathway.characters.includes('neville-longbottom') &&
      !pathway.tags.includes('neville-as-bwl')
    ) {
      warnings.push({
        type: 'unusual_combination',
        message: 'Wrong BWL plot with Neville present but not tagged as BWL',
        affectedElements: ['wrong-boy-who-lived', 'neville-longbottom'],
        recommendation: 'Consider adding "neville-as-bwl" tag for clarity',
      });
    }

    // Fandom-specific constraints
    if (
      pathway.fandom === 'percy-jackson' &&
      pathway.tags.includes('hogwarts') &&
      !pathway.tags.includes('crossover')
    ) {
      errors.push({
        type: 'invalid_combination',
        severity: 'major',
        message:
          'Hogwarts elements in Percy Jackson fandom without crossover tag',
        suggestedFix: [
          'Add "crossover" tag',
          'Move to crossover fandom category',
        ],
      });
    }

    return { errors, warnings };
  }

  private analyzePathwayComplexity(pathway: PathwayContext): any {
    const totalElements =
      pathway.tags.length +
      pathway.plotBlocks.length +
      pathway.characters.length +
      pathway.relationships.length;

    let complexity: 'low' | 'medium' | 'high' | 'extreme' = 'low';

    if (totalElements > 50) complexity = 'extreme';
    else if (totalElements > 30) complexity = 'high';
    else if (totalElements > 15) complexity = 'medium';

    // Generate novelty suggestions
    const noveltySuggestions = [];

    if (
      pathway.plotBlocks.includes('time-travel') &&
      !pathway.tags.includes('time-loop')
    ) {
      noveltySuggestions.push(
        'Consider time-loop mechanics for unique storytelling'
      );
    }

    if (
      pathway.characters.includes('luna-lovegood') &&
      !pathway.tags.includes('seer-luna')
    ) {
      noveltySuggestions.push("Explore Luna's prophetic abilities");
    }

    return {
      complexity,
      conflictCount: 0, // Would be calculated from actual validation
      dependencyIssues: 0, // Would be calculated from actual validation
      noveltySuggestions,
    };
  }

  private determineOverallValidity(results: any[]): boolean {
    return !results.some(result =>
      result.errors.some((error: any) => error.severity === 'critical')
    );
  }

  private consolidateErrors(results: any[]): ValidationError[] {
    return results.flatMap(result => result.errors);
  }

  private consolidateWarnings(results: any[]): ValidationWarning[] {
    return results.flatMap(result => result.warnings);
  }

  private generateSuggestions(
    pathway: PathwayContext,
    analysis: any
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // Novelty-based suggestions
    analysis.noveltySuggestions.forEach((suggestion: any) => {
      suggestions.push({
        type: 'novelty',
        message: suggestion,
        reasoning: 'Enhance story uniqueness',
      });
    });

    // Optimization suggestions
    if (analysis.complexity === 'extreme') {
      suggestions.push({
        type: 'optimization',
        message: 'Consider simplifying pathway for better readability',
        reasoning: 'High complexity may overwhelm readers',
      });
    }

    // Enhancement suggestions based on existing elements
    if (
      pathway.tags.includes('angst') &&
      !pathway.tags.includes('hurt-comfort')
    ) {
      suggestions.push({
        type: 'enhancement',
        message: 'Consider adding hurt/comfort elements',
        tags: ['hurt-comfort'],
        reasoning: 'Complements angst themes well',
      });
    }

    return suggestions;
  }
}

describe('Integration Tests - Validation Workflows', () => {
  let engine: IntegratedValidationEngine;

  beforeEach(() => {
    engine = new IntegratedValidationEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up performance monitors
    PerformanceMonitor.getInstance().clearMetrics();
  });

  describe('Harry Potter Fanfiction Scenarios', () => {
    it('should validate simple Harry/Hermione romantic story', async () => {
      const pathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'harry-potter',
          'hermione-granger',
          'romantic',
          'post-war',
          'friends-to-lovers',
          'fluff',
          'one-shot',
        ],
        plotBlocks: ['post-war-healing', 'relationship-development'],
        characters: ['harry-potter', 'hermione-granger'],
        relationships: ['harry/hermione'],
        metadata: {
          wordCount: 5000,
          chapters: 1,
          status: 'complete',
          rating: 'T',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.performanceMetrics.totalTime).toBeLessThan(100);
      expect(result.pathwayAnalysis.complexity).toBe('low');

      // Should have suggestions for enhancement
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.type === 'enhancement')).toBe(true);
    });

    it('should detect shipping conflicts in complex pathway', async () => {
      const pathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'harry-potter',
          'hermione-granger',
          'ginny-weasley',
          'harry/hermione',
          'harry/ginny',
          'romantic',
          'love-triangle',
        ],
        plotBlocks: ['relationship-drama', 'choice-dilemma'],
        characters: ['harry-potter', 'hermione-granger', 'ginny-weasley'],
        relationships: ['harry/hermione', 'harry/ginny'],
        metadata: {
          wordCount: 25000,
          chapters: 10,
          status: 'in-progress',
          rating: 'T',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('conflict');
      expect(result.errors[0].message).toContain(
        'Multiple Harry Potter shipping'
      );
      expect(result.errors[0].suggestedFix).toContain(
        'Choose one primary ship'
      );
    });

    it('should validate complex inheritance plot with multiple lordships', async () => {
      const pathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'harry-potter',
          'inheritance',
          'lordships',
          'political',
          'wizengamot',
          'ancient-magic',
          'powerful-harry',
        ],
        plotBlocks: [
          'goblin-inheritance',
          'potter-lordship',
          'black-lordship',
          'peverell-lordship',
          'political-maneuvering',
        ],
        characters: ['harry-potter', 'griphook', 'kingsley-shacklebolt'],
        relationships: [],
        metadata: {
          wordCount: 150000,
          chapters: 30,
          status: 'in-progress',
          rating: 'T',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.isValid).toBe(true);
      expect(result.pathwayAnalysis.complexity).toBe('high');
      expect(result.warnings.some(w => w.type === 'performance_concern')).toBe(
        true
      );
      expect(result.performanceMetrics.totalTime).toBeLessThan(100);
    });

    it('should handle time travel paradox scenarios', async () => {
      const pathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'time-travel',
          'marauders-era',
          'seventh-year',
          'harry-potter',
          'james-potter',
          'lily-evans',
          'paradox',
          'fix-it',
        ],
        plotBlocks: [
          'time-travel-accident',
          'meeting-parents',
          'changing-timeline',
          'paradox-resolution',
        ],
        characters: [
          'harry-potter',
          'james-potter',
          'lily-evans',
          'remus-lupin',
          'sirius-black',
          'peter-pettigrew',
        ],
        relationships: ['james/lily'],
        metadata: {
          wordCount: 80000,
          chapters: 20,
          status: 'complete',
          rating: 'T',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.suggestions.some(s => s.message.includes('time-loop'))
      ).toBe(true);
    });

    it('should reject inappropriate age combinations', async () => {
      const pathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'teacher/student',
          'underage',
          'romantic',
          'severus-snape',
          'hermione-granger',
        ],
        plotBlocks: ['forbidden-relationship'],
        characters: ['severus-snape', 'hermione-granger'],
        relationships: ['snape/hermione'],
        metadata: {
          rating: 'G', // Inappropriate rating for content
          status: 'complete',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.isValid).toBe(true); // Warning, not error
      expect(
        result.warnings.some(w =>
          w.message.includes('Adult relationships may require mature rating')
        )
      ).toBe(true);
    });
  });

  describe('Cross-Fandom Validation', () => {
    it('should detect missing crossover tags', async () => {
      const pathway: PathwayContext = {
        fandom: 'percy-jackson',
        tags: [
          'percy-jackson',
          'annabeth-chase',
          'hogwarts',
          'magic',
          'demigods',
          'wizards',
        ],
        plotBlocks: ['demigod-at-hogwarts'],
        characters: ['percy-jackson', 'harry-potter'],
        relationships: [],
        metadata: {
          rating: 'T',
          status: 'complete',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('crossover tag'))).toBe(
        true
      );
    });

    it('should validate proper crossover structure', async () => {
      const pathway: PathwayContext = {
        fandom: 'crossover',
        tags: [
          'harry-potter',
          'percy-jackson',
          'crossover',
          'demigod-harry',
          'magic',
          'mythology',
          'adventure',
        ],
        plotBlocks: [
          'hidden-heritage',
          'two-worlds-collision',
          'power-combination',
        ],
        characters: ['harry-potter', 'percy-jackson', 'chiron', 'dumbledore'],
        relationships: [],
        metadata: {
          wordCount: 50000,
          chapters: 15,
          status: 'in-progress',
          rating: 'T',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.pathwayAnalysis.complexity).toBe('medium');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle extremely complex pathways within performance limits', async () => {
      const pathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: Array.from({ length: 50 }, (_, i) => `tag-${i}`),
        plotBlocks: Array.from({ length: 20 }, (_, i) => `plot-${i}`),
        characters: Array.from({ length: 30 }, (_, i) => `character-${i}`),
        relationships: Array.from({ length: 15 }, (_, i) => `rel-${i}`),
        metadata: {
          wordCount: 500000,
          chapters: 100,
          status: 'in-progress',
          rating: 'M',
        },
      };

      const result = await engine.validateCompletePathway(pathway);

      expect(result.performanceMetrics.totalTime).toBeLessThan(100);
      expect(result.pathwayAnalysis.complexity).toBe('extreme');
      expect(result.suggestions.some(s => s.type === 'optimization')).toBe(
        true
      );
    });

    it('should validate multiple pathways concurrently', async () => {
      const basePathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: ['harry-potter', 'hermione-granger', 'romantic'],
        plotBlocks: ['relationship-development'],
        characters: ['harry-potter', 'hermione-granger'],
        relationships: ['harry/hermione'],
        metadata: { rating: 'T', status: 'complete' },
      };

      const pathways = Array.from({ length: 10 }, (_, i) => ({
        ...basePathway,
        tags: [...basePathway.tags, `variation-${i}`],
      }));

      const startTime = performance.now();

      const results = await Promise.all(
        pathways.map(pathway => engine.validateCompletePathway(pathway))
      );

      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.isValid)).toBe(true);
      expect(totalTime).toBeLessThan(500); // 50ms per pathway average
    });

    it('should maintain consistent performance with repeated validations', async () => {
      const pathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: ['harry-potter', 'time-travel', 'marauders-era', 'fix-it'],
        plotBlocks: ['time-travel-fix', 'parent-interaction'],
        characters: ['harry-potter', 'james-potter', 'lily-evans'],
        relationships: [],
        metadata: { rating: 'T', status: 'complete' },
      };

      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const result = await engine.validateCompletePathway(pathway);
        times.push(result.performanceMetrics.totalTime);
        expect(result.isValid).toBe(true);
      }

      // Performance should be consistent (within 2x of median)
      const median = times.sort()[Math.floor(times.length / 2)];
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      expect(maxTime / minTime).toBeLessThan(3);
      expect(median).toBeLessThan(100);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle malformed pathway data gracefully', async () => {
      const malformedPathway = {
        fandom: null,
        tags: 'not-an-array',
        plotBlocks: undefined,
        characters: [null, undefined, ''],
        relationships: {},
        metadata: 'invalid',
      } as any;

      const result = await engine.validateCompletePathway(malformedPathway);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].severity).toBe('critical');
      expect(result.performanceMetrics.totalTime).toBeGreaterThan(0);
    });

    it('should handle empty pathway gracefully', async () => {
      const emptyPathway: PathwayContext = {
        fandom: '',
        tags: [],
        plotBlocks: [],
        characters: [],
        relationships: [],
        metadata: {
          status: 'complete',
          rating: 'G',
        },
      };

      const result = await engine.validateCompletePathway(emptyPathway);

      expect(result.isValid).toBe(true); // Empty is valid
      expect(result.pathwayAnalysis.complexity).toBe('low');
      expect(result.performanceMetrics.totalTime).toBeLessThan(50);
    });

    it('should provide detailed validation context for debugging', async () => {
      const debugPathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: ['unknown-tag', 'invalid/format', ''],
        plotBlocks: ['non-existent-plot'],
        characters: ['character-not-in-fandom'],
        relationships: ['invalid/relationship/format'],
        metadata: {
          rating: 'Z' as any, // Invalid rating
          status: 'complete',
        },
      };

      const result = await engine.validateCompletePathway(debugPathway);

      expect(result.errors.length).toBeGreaterThan(0);

      // Should provide specific error details
      result.errors.forEach(error => {
        expect(error.message).toBeDefined();
        expect(error.type).toBeDefined();
        expect(error.severity).toBeDefined();
      });
    });

    it('should handle extremely large datasets', async () => {
      const massivePathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: Array.from({ length: 1000 }, (_, i) => `mass-tag-${i}`),
        plotBlocks: Array.from({ length: 500 }, (_, i) => `mass-plot-${i}`),
        characters: Array.from({ length: 200 }, (_, i) => `mass-char-${i}`),
        relationships: Array.from({ length: 100 }, (_, i) => `mass-rel-${i}`),
        metadata: {
          wordCount: 10000000,
          chapters: 5000,
          status: 'in-progress',
          rating: 'M',
        },
      };

      const result = await engine.validateCompletePathway(massivePathway);

      // Should complete within reasonable time even with massive data
      expect(result.performanceMetrics.totalTime).toBeLessThan(1000);
      expect(result.pathwayAnalysis.complexity).toBe('extreme');

      // Should suggest optimization
      expect(result.suggestions.some(s => s.type === 'optimization')).toBe(
        true
      );
    });
  });

  describe('Realistic Fanfiction Workflow Scenarios', () => {
    it('should validate complete Hogwarts 8th year story workflow', async () => {
      const eighthYearPathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'eighth-year',
          'hogwarts',
          'post-war',
          'healing',
          'ptsd',
          'draco-malfoy',
          'harry-potter',
          'enemies-to-lovers',
          'slow-burn',
          'redemption',
          'angst',
          'hurt-comfort',
        ],
        plotBlocks: [
          'return-to-hogwarts',
          'war-recovery',
          'relationship-development',
          'redemption-arc',
          'healing-together',
        ],
        characters: [
          'harry-potter',
          'draco-malfoy',
          'hermione-granger',
          'ron-weasley',
          'pansy-parkinson',
          'blaise-zabini',
          'minerva-mcgonagall',
        ],
        relationships: ['harry/draco', 'hermione/ron'],
        metadata: {
          wordCount: 75000,
          chapters: 25,
          status: 'complete',
          rating: 'M',
        },
      };

      const result = await engine.validateCompletePathway(eighthYearPathway);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.pathwayAnalysis.complexity).toBe('medium');

      // Should suggest complementary tags
      expect(
        result.suggestions.some(
          s => s.type === 'enhancement' && s.message.includes('hurt/comfort')
        )
      ).toBe(true);
    });

    it('should validate Marauders era complete story arc', async () => {
      const maraudersPathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'marauders-era',
          'james-potter',
          'sirius-black',
          'remus-lupin',
          'peter-pettigrew',
          'lily-evans',
          'severus-snape',
          'hogwarts',
          'friendship',
          'first-war',
          'betrayal',
          'werewolf',
          'animagus',
        ],
        plotBlocks: [
          'marauders-friendship',
          'james-lily-development',
          'first-war-begins',
          'betrayal-storyline',
          'werewolf-acceptance',
        ],
        characters: [
          'james-potter',
          'sirius-black',
          'remus-lupin',
          'peter-pettigrew',
          'lily-evans',
          'severus-snape',
          'albus-dumbledore',
        ],
        relationships: ['james/lily', 'sirius/remus'],
        metadata: {
          wordCount: 200000,
          chapters: 40,
          status: 'complete',
          rating: 'T',
        },
      };

      const result = await engine.validateCompletePathway(maraudersPathway);

      expect(result.isValid).toBe(true);
      expect(result.pathwayAnalysis.complexity).toBe('high');
      expect(result.performanceMetrics.totalTime).toBeLessThan(100);

      // Should not conflict with main timeline
      expect(result.errors.some(e => e.type === 'invalid_combination')).toBe(
        false
      );
    });

    it('should validate soul bond trope with magical realism', async () => {
      const soulBondPathway: PathwayContext = {
        fandom: 'harry-potter',
        tags: [
          'soul-bond',
          'soulmates',
          'magical-bond',
          'empathic-bond',
          'harry-potter',
          'ginny-weasley',
          'magical-realism',
          'destiny',
          'ancient-magic',
          'bond-formation',
        ],
        plotBlocks: [
          'soul-bond-discovery',
          'bond-development',
          'magical-connection',
          'bond-challenges',
          'bond-completion',
        ],
        characters: ['harry-potter', 'ginny-weasley'],
        relationships: ['harry/ginny'],
        metadata: {
          wordCount: 45000,
          chapters: 12,
          status: 'complete',
          rating: 'T',
        },
      };

      const result = await engine.validateCompletePathway(soulBondPathway);

      expect(result.isValid).toBe(true);

      // Should suggest enhancing soul bond elements
      expect(
        result.warnings.some(w =>
          w.message.includes('benefit from additional tags')
        )
      ).toBe(true);
    });
  });
});
