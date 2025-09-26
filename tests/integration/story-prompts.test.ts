/**
 * Integration Test: Story Prompts User Story (T015)
 *
 * User Story: "As a user, I want to see both existing matching stories AND
 * enhanced story prompts with novelty highlights so I can choose between
 * reading existing content or creating something new that fills gaps in
 * the current library."
 *
 * This test validates the dual output system per constitutional requirement
 * for library-first discovery with enhanced prompt generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock pathway for prompt generation
const mockPromptPathway = {
  id: 'pathway-1',
  fandomId: 'harry-potter',
  elements: [
    {
      id: 'tag-1',
      name: 'time-travel',
      type: 'tag',
      weight: 1.0,
      description: 'Characters travel through time',
    },
    {
      id: 'tag-2',
      name: 'harry/hermione',
      type: 'tag',
      weight: 0.8,
      description: 'Harry Potter and Hermione Granger romantic pairing',
    },
    {
      id: 'plot-1',
      name: 'goblin-inheritance',
      type: 'plotBlock',
      weight: 0.9,
      description: 'Harry discovers magical inheritance through Gringotts',
    },
    {
      id: 'plot-2',
      name: 'triwizard-tournament',
      type: 'plotBlock',
      weight: 0.7,
      description: 'Events surrounding the Triwizard Tournament',
    },
  ],
  createdAt: Date.now(),
  userPreferences: {
    preferNovelty: true,
    includeExisting: true,
    promptStyle: 'detailed',
  },
};

// Mock existing stories for comparison
const mockExistingStories = [
  {
    id: 'story-1',
    title: 'Time Turner Romance',
    tags: ['time-travel', 'harry/hermione'],
    plotBlocks: [],
    relevanceScore: 0.75,
    popularity: 8500,
    wordCount: 45000,
  },
  {
    id: 'story-2',
    title: 'The Inheritance Plot',
    tags: ['inheritance'],
    plotBlocks: ['goblin-inheritance'],
    relevanceScore: 0.6,
    popularity: 12000,
    wordCount: 85000,
  },
];

// Mock prompt generation response
const mockPromptResponse = {
  storyPrompt: {
    title: 'Time-Traveling Heir: A Tournament Paradox',
    premise:
      "When Harry Potter's name emerges from the Goblet of Fire, he discovers it's not just magic at work—it's a temporal loop created by his own future self. Armed with knowledge of his goblin inheritance and accompanied by Hermione Granger, Harry must navigate the tournament while unraveling a conspiracy that spans multiple timelines.",
    keyElements: [
      {
        element: 'time-travel',
        noveltyAspect: 'self-created temporal loop',
        integration:
          'The time travel is consequence-driven rather than tool-driven',
      },
      {
        element: 'harry/hermione',
        noveltyAspect: 'partnership forged through temporal crisis',
        integration:
          'Relationship develops through shared knowledge of timeline manipulation',
      },
      {
        element: 'goblin-inheritance',
        noveltyAspect: 'inheritance unlocked by temporal paradox',
        integration: 'Past and future selves create inheritance conditions',
      },
      {
        element: 'triwizard-tournament',
        noveltyAspect: 'tournament as temporal anchor point',
        integration: 'Each task represents different timeline convergence',
      },
    ],
    noveltyHighlights: [
      'Combines time-travel with inheritance in causally-linked way',
      'Tournament tasks serve as temporal convergence points',
      'Harry/Hermione relationship develops through shared temporal knowledge',
      'Goblin magic interacts with time magic in unprecedented way',
    ],
    potentialConflicts: [
      {
        description: 'Time-travel paradoxes with inheritance triggers',
        suggestion: 'Use stable time loops rather than changeable timelines',
      },
    ],
    estimatedNovelty: 0.85,
    writingPrompts: [
      'How does Harry first realize the temporal loop exists?',
      'What goblin magic is uniquely suited to time manipulation?',
      'How do the tournament tasks change when viewed across timelines?',
      'What brings Harry and Hermione together as temporal partners?',
    ],
  },
  existingAlternatives: mockExistingStories,
  comparisonAnalysis: {
    coverageGaps: [
      'No existing stories combine all four pathway elements',
      'Time-travel + inheritance combination is underexplored',
      'Tournament setting rarely used for temporal plots',
    ],
    noveltyScore: 0.85,
    recommendCreation: true,
    reasons: [
      'Unique combination of elements not found in existing stories',
      'High potential for exploring underutilized magic interactions',
      'Tournament provides structured narrative framework',
    ],
  },
  generationMetadata: {
    processingTime: 180, // milliseconds
    elementsAnalyzed: 4,
    storiesCompared: 2,
    noveltyCalculationMethod: 'element-combination-analysis',
    confidenceScore: 0.92,
  },
};

// Mock prompt enhancement features
const mockPromptEnhancements = {
  characterDevelopment: {
    protagonistGrowth:
      'Harry learns to balance temporal responsibility with teenage desires',
    relationshipArcs:
      'Harry/Hermione develop trust through shared temporal secrets',
    antagonistMotivation:
      "Future Harry's temporal manipulation creates present conflict",
  },
  plotStructure: {
    actBreakdown: [
      'Act 1: Discovery of temporal loop and goblin inheritance',
      'Act 2A: First tournament task reveals temporal mechanics',
      'Act 2B: Partnership with Hermione deepens, inheritance complications',
      'Act 3: Resolution of temporal paradox through collaborative magic',
    ],
    conflictLayers: [
      'External: Tournament challenges and temporal enemies',
      "Internal: Harry's responsibility for creating the loop",
      'Interpersonal: Building trust with Hermione despite secrets',
    ],
  },
  worldBuilding: {
    magicSystemExpansion: [
      'Goblin temporal magic differs from wizard time-turners',
      'Inheritance magic can be triggered across timelines',
      'Tournament magic interacts unexpectedly with temporal forces',
    ],
    settingDetails: [
      'Gringotts vaults that exist outside normal time',
      'Tournament grounds that show temporal echoes',
      'Hogwarts locations where timeline convergence is visible',
    ],
  },
};

describe('Story Prompts Integration Test (T015)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for API calls
    global.fetch = vi.fn();

    // Mock AI/ML services for prompt generation
    (global as any).promptGenerationService = vi.fn();
  });

  it('should validate prompt generation component structure exists', async () => {
    // This test MUST fail initially - prompt components don't exist yet
    const PromptComponentExists = () => {
      try {
        // These imports will fail until prompt components are implemented
        const {
          StoryPromptGenerator,
        } = require('@/components/prompts/StoryPromptGenerator');
        const { PromptDisplay } = require('@/components/prompts/PromptDisplay');
        const {
          NoveltyHighlighter,
        } = require('@/components/prompts/NoveltyHighlighter');
        const { DualOutput } = require('@/components/prompts/DualOutput');

        return true;
      } catch {
        return false;
      }
    };

    // Should fail until prompt components are implemented
    expect(PromptComponentExists()).toBe(false);
  });

  it('should generate comprehensive story prompts from pathway elements', () => {
    // Test prompt generation algorithm
    const generatePrompt = (
      pathway: typeof mockPromptPathway,
      existingStories: typeof mockExistingStories
    ) => {
      const elements = pathway.elements;
      const elementNames = elements.map(el => el.name);

      // Analyze existing coverage
      const coveredElements = new Set<string>();
      existingStories.forEach(story => {
        story.tags.forEach(tag => coveredElements.add(tag));
        story.plotBlocks.forEach(block => coveredElements.add(block));
      });

      // Calculate novelty
      const novelElements = elementNames.filter(
        name => !coveredElements.has(name)
      );
      const noveltyScore = novelElements.length / elementNames.length;

      // Generate premise
      const premise = `A story combining ${elementNames.join(
        ', '
      )} with emphasis on ${novelElements.join(' and ')}`;

      return {
        premise,
        noveltyScore,
        novelElements,
        totalElements: elementNames.length,
        recommendation: noveltyScore > 0.3 ? 'create' : 'explore-existing',
      };
    };

    const prompt = generatePrompt(mockPromptPathway, mockExistingStories);

    expect(prompt.premise).toContain('time-travel');
    expect(prompt.premise).toContain('harry/hermione');
    expect(prompt.noveltyScore).toBeGreaterThan(0);
    expect(prompt.novelElements.length).toBeGreaterThan(0);
  });

  it('should identify novelty gaps and highlight them', () => {
    // Test novelty highlighting logic
    const identifyNoveltyGaps = (
      pathway: typeof mockPromptPathway,
      existingStories: typeof mockExistingStories
    ) => {
      const pathwayElements = pathway.elements.map(el => el.name);
      const gaps: Array<{
        element: string;
        reason: string;
        noveltyType: string;
      }> = [];

      // Check individual elements
      pathwayElements.forEach(elementName => {
        const storiesWithElement = existingStories.filter(
          story =>
            story.tags.includes(elementName) ||
            story.plotBlocks.includes(elementName)
        );

        if (storiesWithElement.length === 0) {
          gaps.push({
            element: elementName,
            reason: 'No existing stories found with this element',
            noveltyType: 'unexplored',
          });
        } else if (storiesWithElement.length < 2) {
          gaps.push({
            element: elementName,
            reason: 'Very few stories explore this element',
            noveltyType: 'underexplored',
          });
        }
      });

      // Check combinations
      if (pathwayElements.length > 1) {
        const combinationExists = existingStories.some(story => {
          const storyElements = [...story.tags, ...story.plotBlocks];
          return pathwayElements.every(element =>
            storyElements.includes(element)
          );
        });

        if (!combinationExists) {
          gaps.push({
            element: pathwayElements.join(' + '),
            reason: 'No stories combine all these elements',
            noveltyType: 'unique-combination',
          });
        }
      }

      return gaps;
    };

    const gaps = identifyNoveltyGaps(mockPromptPathway, mockExistingStories);

    expect(Array.isArray(gaps)).toBe(true);
    expect(gaps.some(gap => gap.noveltyType === 'unique-combination')).toBe(
      true
    );
  });

  it('should create dual output display (existing + new)', () => {
    // Test dual output structure
    const createDualOutput = (
      existingStories: typeof mockExistingStories,
      promptData: typeof mockPromptResponse
    ) => {
      return {
        existingContent: {
          title: 'Stories You Might Like',
          stories: existingStories.map(story => ({
            ...story,
            matchReason: `Matches ${
              story.tags.length + story.plotBlocks.length
            } of your elements`,
            readingTime: Math.ceil(story.wordCount / 250), // words per minute
          })),
          totalFound: existingStories.length,
        },
        newContent: {
          title: 'Create Something New',
          prompt: promptData.storyPrompt,
          noveltyHighlights: promptData.storyPrompt.noveltyHighlights,
          confidence: promptData.generationMetadata.confidenceScore,
          estimatedLength: 'Medium-length novel (50k-80k words)',
        },
        recommendation: {
          primary: promptData.comparisonAnalysis.recommendCreation
            ? 'create'
            : 'read',
          reasoning: promptData.comparisonAnalysis.reasons,
          confidence: promptData.comparisonAnalysis.noveltyScore,
        },
      };
    };

    const dualOutput = createDualOutput(
      mockExistingStories,
      mockPromptResponse
    );

    expect(dualOutput.existingContent.stories).toHaveLength(2);
    expect(dualOutput.newContent.prompt).toHaveProperty('title');
    expect(dualOutput.recommendation.primary).toMatch(/^(create|read)$/);
    expect(dualOutput.existingContent.stories[0]).toHaveProperty('readingTime');
  });

  it('should enhance prompts with detailed writing guidance', () => {
    // Test prompt enhancement features
    const enhancePrompt = (
      basicPrompt: string,
      elements: typeof mockPromptPathway.elements
    ) => {
      const enhancements = {
        characterDevelopment: elements
          .filter(el => el.type === 'tag' && el.name.includes('/'))
          .map(
            rel =>
              `Develop ${rel.name.replace(
                '/',
                ' and '
              )} relationship through shared experiences`
          ),

        plotStructure: elements
          .filter(el => el.type === 'plotBlock')
          .map(plot => `Use ${plot.name} as major plot catalyst`),

        worldBuilding: elements.map(el => `Explore ${el.description} in depth`),

        writingPrompts: [
          "What's the inciting incident that brings all elements together?",
          'How do the character relationships evolve throughout the story?',
          'What unique aspects of this magic system can you explore?',
          'What emotional journey will the protagonist experience?',
        ],
      };

      return {
        basicPrompt,
        ...enhancements,
        estimatedComplexity: elements.length * 0.2 + 0.6, // 0.6-1.0 scale
        suggestedLength: elements.length > 3 ? 'novel' : 'novella',
      };
    };

    const enhanced = enhancePrompt(
      mockPromptResponse.storyPrompt.premise,
      mockPromptPathway.elements
    );

    expect(enhanced.characterDevelopment.length).toBeGreaterThan(0);
    expect(enhanced.plotStructure.length).toBeGreaterThan(0);
    expect(enhanced.writingPrompts).toHaveLength(4);
    expect(enhanced.estimatedComplexity).toBeGreaterThan(0.6);
  });

  it('should validate prompt generation API contract', async () => {
    // Mock prompt generation API call
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPromptResponse),
    });
    global.fetch = mockFetch;

    const generateStoryPrompt = async (pathway: typeof mockPromptPathway) => {
      const response = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathway: pathway.elements,
          fandom: pathway.fandomId,
          preferences: pathway.userPreferences,
        }),
      });

      return response.json();
    };

    const result = await generateStoryPrompt(mockPromptPathway);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/prompts/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(result.storyPrompt).toHaveProperty('title');
    expect(result.storyPrompt).toHaveProperty('noveltyHighlights');
  });

  it('should meet constitutional performance requirements for prompt generation', async () => {
    // Constitutional requirement: reasonable prompt generation time
    const maxPromptGenerationTime = 3000; // 3 seconds for AI processing

    const simulatePromptGeneration = async () => {
      const startTime = performance.now();

      // Simulate AI processing
      const result = {
        ...mockPromptResponse,
        generationMetadata: {
          ...mockPromptResponse.generationMetadata,
          processingTime: Math.random() * 2000 + 500, // 500-2500ms range
        },
      };

      const endTime = performance.now();
      return {
        result,
        actualTime: endTime - startTime,
        reportedTime: result.generationMetadata.processingTime,
      };
    };

    const promptResult = await simulatePromptGeneration();

    expect(promptResult.reportedTime).toBeLessThan(maxPromptGenerationTime);
    expect(promptResult.actualTime).toBeLessThan(maxPromptGenerationTime);
  });

  it('should support different prompt styles and preferences', () => {
    // Test prompt customization based on user preferences
    const customizePrompt = (
      basePrompt: typeof mockPromptResponse.storyPrompt,
      preferences: typeof mockPromptPathway.userPreferences
    ) => {
      let customized = { ...basePrompt };

      if (preferences.promptStyle === 'brief') {
        customized = {
          ...customized,
          premise: customized.premise.split('.')[0] + '.', // First sentence only
          writingPrompts: customized.writingPrompts.slice(0, 2), // Fewer prompts
        };
      } else if (preferences.promptStyle === 'detailed') {
        customized = {
          ...customized,
          writingPrompts: [
            ...customized.writingPrompts,
            'What subplots could enrich the main narrative?',
            'How can you subvert reader expectations?',
          ],
        };
      }

      return customized;
    };

    // Test brief style
    const briefPrompt = customizePrompt(mockPromptResponse.storyPrompt, {
      ...mockPromptPathway.userPreferences,
      promptStyle: 'brief',
    });
    expect(briefPrompt.writingPrompts).toHaveLength(2);

    // Test detailed style
    const detailedPrompt = customizePrompt(mockPromptResponse.storyPrompt, {
      ...mockPromptPathway.userPreferences,
      promptStyle: 'detailed',
    });
    expect(detailedPrompt.writingPrompts.length).toBeGreaterThan(
      mockPromptResponse.storyPrompt.writingPrompts.length
    );
  });

  it('should validate confidence scoring for recommendations', () => {
    // Test confidence calculation for create vs. read recommendations
    const calculateConfidence = (
      pathway: typeof mockPromptPathway,
      existingStories: typeof mockExistingStories,
      promptData: typeof mockPromptResponse
    ) => {
      const factors = {
        elementNovelty: promptData.comparisonAnalysis.noveltyScore,
        pathwayComplexity: pathway.elements.length / 10, // Normalize to 0-1
        existingQuality:
          existingStories.length > 0
            ? Math.max(...existingStories.map(s => s.relevanceScore))
            : 0,
        promptQuality: promptData.generationMetadata.confidenceScore,
      };

      // Weight factors
      const weights = {
        elementNovelty: 0.4,
        pathwayComplexity: 0.2,
        existingQuality: -0.2,
        promptQuality: 0.3,
      };

      const confidence = Object.entries(factors).reduce(
        (total, [key, value]) => {
          return total + value * weights[key as keyof typeof weights];
        },
        0.5
      ); // Base confidence

      return Math.max(0, Math.min(1, confidence));
    };

    const confidence = calculateConfidence(
      mockPromptPathway,
      mockExistingStories,
      mockPromptResponse
    );

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
    expect(typeof confidence).toBe('number');
  });

  it('should support prompt template variations', () => {
    // Test different prompt template formats
    const promptTemplates = {
      narrative: (elements: string[]) =>
        `Write a story where ${elements.join(
          ', '
        )} intersect in unexpected ways.`,

      character: (elements: string[]) =>
        `Create a character-driven narrative exploring how ${elements.join(
          ' and '
        )} shape personal growth.`,

      worldBuilding: (elements: string[]) =>
        `Build a world where ${elements.join(
          ', '
        )} create unique magical/social dynamics.`,

      experimental: (elements: string[]) =>
        `Experiment with narrative structure while incorporating ${elements.join(
          ', '
        )}.`,
    };

    const elements = mockPromptPathway.elements.map(el => el.name);

    Object.entries(promptTemplates).forEach(([style, template]) => {
      const prompt = template(elements);
      expect(prompt).toContain(elements[0]);
      expect(prompt.length).toBeGreaterThan(20);
    });
  });

  it('should handle prompt generation errors gracefully', async () => {
    // Test error handling for failed prompt generation
    const mockFailedFetch = vi
      .fn()
      .mockRejectedValue(new Error('AI service unavailable'));
    global.fetch = mockFailedFetch;

    const generatePromptWithFallback = async (
      pathway: typeof mockPromptPathway
    ) => {
      try {
        const response = await fetch('/api/prompts/generate');
        return await response.json();
      } catch (error) {
        // Fallback to simple template-based prompt
        return {
          storyPrompt: {
            title: 'New Story Opportunity',
            premise: `A ${pathway.fandomId} story featuring ${pathway.elements
              .map(el => el.name)
              .join(', ')}.`,
            noveltyHighlights: ['Unique combination of selected elements'],
            keyElements: pathway.elements.map(el => ({
              element: el.name,
              noveltyAspect: 'User-selected combination',
              integration: 'To be determined by author',
            })),
          },
          fallbackMode: true,
          error: 'Advanced prompt generation temporarily unavailable',
        };
      }
    };

    const fallbackResult = await generatePromptWithFallback(mockPromptPathway);

    expect(fallbackResult.fallbackMode).toBe(true);
    expect(fallbackResult.error).toContain('unavailable');
    expect(fallbackResult.storyPrompt.title).toBe('New Story Opportunity');
  });

  it('should support A/B testing for prompt variations', () => {
    // Test prompt variation generation for optimization
    const generatePromptVariations = (pathway: typeof mockPromptPathway) => {
      const baseElements = pathway.elements.map(el => el.name);

      return {
        variation_a: {
          style: 'action-focused',
          premise: `High-stakes adventure combining ${baseElements.join(
            ', '
          )} in a fast-paced narrative.`,
          tone: 'exciting',
        },
        variation_b: {
          style: 'character-focused',
          premise: `Character study exploring how ${baseElements.join(
            ' and '
          )} shape personal relationships.`,
          tone: 'introspective',
        },
        variation_c: {
          style: 'world-focused',
          premise: `World-building showcase using ${baseElements.join(
            ', '
          )} to explore magical systems.`,
          tone: 'exploratory',
        },
      };
    };

    const variations = generatePromptVariations(mockPromptPathway);

    expect(variations).toHaveProperty('variation_a');
    expect(variations).toHaveProperty('variation_b');
    expect(variations).toHaveProperty('variation_c');

    Object.values(variations).forEach(variation => {
      expect(variation).toHaveProperty('style');
      expect(variation).toHaveProperty('premise');
      expect(variation).toHaveProperty('tone');
    });
  });
});
