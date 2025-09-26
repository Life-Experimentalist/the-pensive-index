import type { PathwayItem, Tag, PlotBlock, Story, SearchResult } from '@/types';

export interface PromptGenerationContext {
  fandomId: string;
  fandomName: string;
  pathway: PathwayItem[];
  tags: Tag[];
  plotBlocks: PlotBlock[];
  existingStories?: SearchResult[];
  userPreferences?: PromptPreferences;
}

export interface PromptPreferences {
  style: 'detailed' | 'concise' | 'creative';
  tone: 'formal' | 'casual' | 'enthusiastic';
  includeCharacterDetails: boolean;
  includeWorldBuilding: boolean;
  includePlotStructure: boolean;
  maxLength?: number;
}

export interface GeneratedPrompt {
  id: string;
  title: string;
  premise: string;
  description: string;
  sections: {
    characterFocus?: string;
    plotElements?: string;
    worldBuilding?: string;
    themes?: string;
    tone?: string;
    structure?: string;
  };
  noveltyHighlights: NoveltyHighlight[];
  tags: string[];
  estimatedLength: 'oneshot' | 'short' | 'medium' | 'long' | 'epic';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
}

export interface NoveltyHighlight {
  type:
    | 'unique_combination'
    | 'rare_element'
    | 'unexplored_angle'
    | 'creative_twist';
  element: string;
  description: string;
  rarity: 'uncommon' | 'rare' | 'very_rare' | 'unique';
  examples?: string[];
}

export interface PromptAnalysis {
  originalityScore: number; // 0-100, higher = more original
  complexityScore: number; // 0-100, higher = more complex
  marketGap: boolean; // True if few/no existing stories match
  popularityPotential: number; // 0-100, predicted reader interest
  writingChallenges: string[];
  similarStoryCount: number;
  recommendedLength: string;
}

/**
 * Prompt Generation Service
 *
 * Creates intelligent story prompts with novelty detection and gap analysis.
 * Analyzes pathway selections to generate creative writing prompts that
 * highlight unexplored combinations and creative opportunities.
 *
 * Features:
 * - Novelty detection against existing story database
 * - Multi-section prompt structure with customizable styles
 * - Originality scoring and market gap analysis
 * - Creative angle suggestions and writing challenges
 * - Adaptive complexity based on pathway elements
 *
 * Core Philosophy:
 * - Encourage exploration of underrepresented combinations
 * - Provide actionable writing guidance
 * - Balance familiarity with innovation
 * - Support writers at all experience levels
 */
export class PromptGenerationService {
  private readonly templateLibrary = new Map<string, PromptTemplate>();
  private readonly noveltyAnalyzer = new NoveltyAnalyzer();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate a complete story prompt with novelty analysis
   */
  async generatePrompt(
    context: PromptGenerationContext
  ): Promise<GeneratedPrompt> {
    // 1. Analyze pathway for novelty and complexity
    const analysis = await this.analyzePathway(context);

    // 2. Select appropriate template and style
    const template = this.selectTemplate(context, analysis);

    // 3. Generate core prompt sections
    const sections = await this.generatePromptSections(context, template);

    // 4. Detect and highlight novelty elements
    const noveltyHighlights = await this.detectNoveltyElements(
      context,
      analysis
    );

    // 5. Generate title and premise
    const { title, premise } = this.generateTitleAndPremise(context, sections);

    // 6. Compile final description
    const description = this.compileDescription(
      sections,
      context.userPreferences
    );

    // 7. Generate metadata
    const metadata = this.generateMetadata(context, analysis);

    const prompt: GeneratedPrompt = {
      id: this.generatePromptId(),
      title,
      premise,
      description,
      sections,
      noveltyHighlights,
      tags: this.extractPromptTags(context),
      estimatedLength: metadata.estimatedLength,
      difficulty: metadata.difficulty,
      createdAt: new Date(),
    };

    return prompt;
  }

  /**
   * Analyze pathway for originality and complexity
   */
  private async analyzePathway(
    context: PromptGenerationContext
  ): Promise<PromptAnalysis> {
    const { pathway, tags, plotBlocks, existingStories = [] } = context;

    // Calculate originality score
    const originalityScore = await this.calculateOriginalityScore(
      pathway,
      existingStories
    );

    // Calculate complexity score based on pathway elements
    const complexityScore = this.calculateComplexityScore(
      pathway,
      tags,
      plotBlocks
    );

    // Determine if this represents a market gap
    const marketGap = existingStories.length < 5; // Few existing stories

    // Predict popularity potential
    const popularityPotential = await this.calculatePopularityPotential(
      pathway,
      tags,
      plotBlocks,
      existingStories
    );

    // Identify writing challenges
    const writingChallenges = this.identifyWritingChallenges(
      pathway,
      tags,
      plotBlocks
    );

    // Recommend length based on complexity
    const recommendedLength = this.recommendLength(
      complexityScore,
      pathway.length
    );

    return {
      originalityScore,
      complexityScore,
      marketGap,
      popularityPotential,
      writingChallenges,
      similarStoryCount: existingStories.length,
      recommendedLength,
    };
  }

  /**
   * Calculate how original this pathway combination is
   */
  private async calculateOriginalityScore(
    pathway: PathwayItem[],
    existingStories: SearchResult[]
  ): Promise<number> {
    if (pathway.length === 0) return 0;

    // Base originality on story scarcity and exact matches
    const totalCombinations = Math.pow(2, pathway.length); // Possible combinations
    const exactMatches = existingStories.filter(
      story => story.relevanceScore > 95 // Very high match
    ).length;

    // Calculate rarity
    if (exactMatches === 0) return 95; // Very original
    if (exactMatches <= 2) return 80; // Quite original
    if (exactMatches <= 5) return 65; // Moderately original
    if (exactMatches <= 10) return 45; // Somewhat common
    return 25; // Common combination
  }

  /**
   * Calculate complexity score based on pathway elements
   */
  private calculateComplexityScore(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[]
  ): number {
    let complexity = 0;

    // Base complexity on number of elements
    complexity += Math.min(pathway.length * 10, 40);

    // Add complexity for different element types
    const tagCount = pathway.filter(p => p.type === 'tag').length;
    const plotBlockCount = pathway.filter(p => p.type === 'plot_block').length;

    if (tagCount > 0 && plotBlockCount > 0) {
      complexity += 20; // Mixed types increase complexity
    }

    // Add complexity for plot block dependencies
    const pathwayPlotBlocks = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    const totalDependencies = pathwayPlotBlocks.reduce(
      (sum, pb) => sum + (pb.dependencies?.length || 0),
      0
    );
    complexity += Math.min(totalDependencies * 5, 20);

    // Add complexity for conflicting elements
    const conflicts = this.detectPotentialConflicts(pathway, tags, plotBlocks);
    complexity += Math.min(conflicts.length * 10, 20);

    return Math.min(complexity, 100);
  }

  /**
   * Calculate potential popularity based on pathway elements
   */
  private async calculatePopularityPotential(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[],
    existingStories: SearchResult[]
  ): Promise<number> {
    let potential = 50; // Base score

    // Factor in tag popularity
    const pathwayTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(Boolean) as Tag[];

    const avgTagPopularity =
      pathwayTags.length > 0
        ? pathwayTags.reduce((sum, tag) => sum + (tag.storyCount || 0), 0) /
          pathwayTags.length
        : 0;

    // Boost for popular tags (but not too popular)
    if (avgTagPopularity > 50 && avgTagPopularity < 500) {
      potential += 20;
    } else if (avgTagPopularity > 10) {
      potential += 10;
    }

    // Factor in plot block appeal
    const pathwayPlotBlocks = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    const popularPlotBlocks = pathwayPlotBlocks.filter(
      pb => pb.storyCount && pb.storyCount > 20
    );
    potential += Math.min(popularPlotBlocks.length * 10, 30);

    // Penalty for overly complex combinations
    if (pathway.length > 8) {
      potential -= 15;
    }

    // Boost for balanced combinations
    const tagCount = pathway.filter(p => p.type === 'tag').length;
    const plotBlockCount = pathway.filter(p => p.type === 'plot_block').length;
    if (
      tagCount >= 2 &&
      plotBlockCount >= 1 &&
      tagCount + plotBlockCount <= 6
    ) {
      potential += 15;
    }

    return Math.max(0, Math.min(100, potential));
  }

  /**
   * Identify potential writing challenges
   */
  private identifyWritingChallenges(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[]
  ): string[] {
    const challenges: string[] = [];

    // Complex character relationships
    const relationshipTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'relationship') as Tag[];

    if (relationshipTags.length > 2) {
      challenges.push('Balancing multiple complex relationships');
    }

    // Time-travel or alternate universe elements
    const complexPlotBlocks = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(
        pb =>
          pb &&
          (pb.name.toLowerCase().includes('time') ||
            pb.name.toLowerCase().includes('alternate') ||
            pb.name.toLowerCase().includes('dimension'))
      ) as PlotBlock[];

    if (complexPlotBlocks.length > 0) {
      challenges.push(
        'Maintaining logical consistency with alternate timelines/universes'
      );
    }

    // Multiple POV characters implied
    const characterTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'character') as Tag[];

    if (characterTags.length > 3) {
      challenges.push(
        'Managing multiple character perspectives and development'
      );
    }

    // Genre blending
    const genreTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'genre') as Tag[];

    if (genreTags.length > 2) {
      challenges.push('Successfully blending multiple genres');
    }

    return challenges;
  }

  /**
   * Generate prompt sections based on template
   */
  private async generatePromptSections(
    context: PromptGenerationContext,
    template: PromptTemplate
  ): Promise<GeneratedPrompt['sections']> {
    const { pathway, tags, plotBlocks, fandomName } = context;

    const sections: GeneratedPrompt['sections'] = {};

    // Character Focus
    if (template.includeCharacterFocus) {
      sections.characterFocus = this.generateCharacterFocus(
        pathway,
        tags,
        fandomName
      );
    }

    // Plot Elements
    if (template.includePlotElements) {
      sections.plotElements = this.generatePlotElements(pathway, plotBlocks);
    }

    // World Building
    if (template.includeWorldBuilding) {
      sections.worldBuilding = this.generateWorldBuilding(
        pathway,
        tags,
        plotBlocks,
        fandomName
      );
    }

    // Themes
    if (template.includeThemes) {
      sections.themes = this.generateThemes(pathway, tags);
    }

    // Tone
    if (template.includeTone) {
      sections.tone = this.generateTone(pathway, tags);
    }

    // Structure
    if (template.includeStructure) {
      sections.structure = this.generateStructure(pathway, plotBlocks);
    }

    return sections;
  }

  /**
   * Generate character focus section
   */
  private generateCharacterFocus(
    pathway: PathwayItem[],
    tags: Tag[],
    fandomName: string
  ): string {
    const characterTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'character') as Tag[];

    const relationshipTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'relationship') as Tag[];

    if (characterTags.length === 0 && relationshipTags.length === 0) {
      return `Explore character dynamics within the ${fandomName} universe, focusing on character development and relationships that align with your selected themes.`;
    }

    let focus = '';

    if (characterTags.length > 0) {
      const charNames = characterTags.map(tag => tag.name).join(', ');
      focus += `Center your story around ${charNames}, `;

      if (characterTags.length === 1) {
        focus +=
          'exploring their internal conflicts, growth, and relationships with other characters.';
      } else {
        focus +=
          'weaving together their individual arcs while exploring how they interact and influence each other.';
      }
    }

    if (relationshipTags.length > 0) {
      const relationships = relationshipTags.map(tag => tag.name).join(', ');
      focus += focus ? ' ' : '';
      focus += `Develop the dynamics of ${relationships}, showing the progression, challenges, and emotional depth of these relationships.`;
    }

    return focus;
  }

  /**
   * Generate plot elements section
   */
  private generatePlotElements(
    pathway: PathwayItem[],
    plotBlocks: PlotBlock[]
  ): string {
    const pathwayPlotBlocks = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    if (pathwayPlotBlocks.length === 0) {
      return 'Develop an engaging plot that serves the character development and themes you want to explore.';
    }

    const plotNames = pathwayPlotBlocks.map(pb => pb.name).join(', ');

    let elements = `Incorporate these key plot elements: ${plotNames}. `;

    if (pathwayPlotBlocks.length === 1) {
      elements +=
        'Build your story around this central concept, exploring its implications and consequences for your characters.';
    } else {
      elements +=
        'Weave these elements together in a way that feels natural and serves your overall narrative arc.';
    }

    // Add specific guidance for complex plot blocks
    const complexElements = pathwayPlotBlocks.filter(
      pb => pb.dependencies && pb.dependencies.length > 0
    );

    if (complexElements.length > 0) {
      elements +=
        ' Pay special attention to the setup and consequences of these interconnected plot elements.';
    }

    return elements;
  }

  /**
   * Generate world building section
   */
  private generateWorldBuilding(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[],
    fandomName: string
  ): string {
    const worldTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(
        tag =>
          tag &&
          (tag.category === 'setting' ||
            tag.category === 'alternate-universe' ||
            tag.category === 'world-building')
      ) as Tag[];

    let worldBuilding = `Ground your story in the ${fandomName} universe`;

    if (worldTags.length > 0) {
      const settings = worldTags.map(tag => tag.name).join(', ');
      worldBuilding += `, specifically exploring ${settings}`;
    }

    worldBuilding += '. ';

    // Add guidance based on plot blocks
    const auPlotBlocks = plotBlocks.filter(
      pb =>
        pathway.some(p => p.id === pb.id) &&
        (pb.name.toLowerCase().includes('alternate') ||
          pb.name.toLowerCase().includes('modern') ||
          pb.name.toLowerCase().includes('muggle'))
    );

    if (auPlotBlocks.length > 0) {
      worldBuilding +=
        'Consider how the familiar elements of the original world translate or change in your alternate setting. ';
    }

    worldBuilding +=
      'Use world-building details to enhance atmosphere and support your plot development.';

    return worldBuilding;
  }

  /**
   * Generate themes section
   */
  private generateThemes(pathway: PathwayItem[], tags: Tag[]): string {
    const themeTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(
        tag =>
          tag &&
          (tag.category === 'theme' ||
            tag.category === 'genre' ||
            tag.category === 'tone')
      ) as Tag[];

    if (themeTags.length === 0) {
      return 'Explore themes of growth, relationships, and personal discovery that emerge naturally from your plot and character choices.';
    }

    const themes = themeTags.map(tag => tag.name).join(', ');
    return `Weave themes of ${themes} throughout your narrative, using character actions and plot developments to explore these concepts in depth.`;
  }

  /**
   * Generate tone section
   */
  private generateTone(pathway: PathwayItem[], tags: Tag[]): string {
    const toneTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'tone') as Tag[];

    const genreTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'genre') as Tag[];

    let tone = 'Maintain a consistent tone that serves your story goals';

    if (toneTags.length > 0) {
      const tones = toneTags.map(tag => tag.name).join(' and ');
      tone += `, balancing ${tones}`;
    }

    if (genreTags.length > 0) {
      const genres = genreTags.map(tag => tag.name).join(' and ');
      tone += tone.includes(',')
        ? ` while honoring the ${genres} elements`
        : `, embracing the ${genres} genre`;
    }

    tone += '. Use tone to enhance emotional impact and reader engagement.';

    return tone;
  }

  /**
   * Generate structure section
   */
  private generateStructure(
    pathway: PathwayItem[],
    plotBlocks: PlotBlock[]
  ): string {
    const pathwayPlotBlocks = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    if (pathwayPlotBlocks.length === 0) {
      return 'Structure your story with a clear beginning, middle, and end that allows for proper character and plot development.';
    }

    let structure =
      'Consider structuring your story to best showcase your plot elements. ';

    if (pathwayPlotBlocks.length === 1) {
      structure +=
        'Build toward and around your central plot element, using it as a turning point or driving force.';
    } else {
      structure +=
        'Plan how to introduce and resolve multiple plot elements without overwhelming the narrative flow.';
    }

    // Add specific structural advice
    const complexPlotBlocks = pathwayPlotBlocks.filter(
      pb => pb.dependencies && pb.dependencies.length > 0
    );

    if (complexPlotBlocks.length > 0) {
      structure +=
        ' Ensure proper setup for complex plot elements to maintain reader understanding and engagement.';
    }

    return structure;
  }

  /**
   * Detect novelty elements in the pathway
   */
  private async detectNoveltyElements(
    context: PromptGenerationContext,
    analysis: PromptAnalysis
  ): Promise<NoveltyHighlight[]> {
    const highlights: NoveltyHighlight[] = [];
    const { pathway, tags, plotBlocks, existingStories = [] } = context;

    // Check for unique combinations
    if (analysis.originalityScore > 80) {
      highlights.push({
        type: 'unique_combination',
        element: 'Pathway Combination',
        description:
          'This combination of elements is rarely or never explored in existing stories',
        rarity: analysis.originalityScore > 95 ? 'unique' : 'very_rare',
      });
    }

    // Check for rare individual elements
    const rareElements = this.identifyRareElements(pathway, tags, plotBlocks);
    highlights.push(...rareElements);

    // Check for unexplored angles
    const unexploredAngles = this.identifyUnexploredAngles(
      pathway,
      tags,
      plotBlocks,
      existingStories
    );
    highlights.push(...unexploredAngles);

    // Check for creative twists
    const creativeOpportunities = this.identifyCreativeOpportunities(
      pathway,
      tags,
      plotBlocks
    );
    highlights.push(...creativeOpportunities);

    return highlights.slice(0, 5); // Limit to top 5 highlights
  }

  /**
   * Identify rare individual elements
   */
  private identifyRareElements(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[]
  ): NoveltyHighlight[] {
    const highlights: NoveltyHighlight[] = [];

    // Check tags
    const pathwayTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(Boolean) as Tag[];

    const rareTags = pathwayTags.filter(
      tag => tag.storyCount && tag.storyCount < 10
    );

    for (const tag of rareTags) {
      highlights.push({
        type: 'rare_element',
        element: tag.name,
        description: `The "${tag.name}" tag is used in very few stories, offering fresh creative territory`,
        rarity: tag.storyCount! < 3 ? 'very_rare' : 'rare',
      });
    }

    // Check plot blocks
    const pathwayPlotBlocks = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    const rarePlotBlocks = pathwayPlotBlocks.filter(
      pb => pb.storyCount && pb.storyCount < 15
    );

    for (const plotBlock of rarePlotBlocks) {
      highlights.push({
        type: 'rare_element',
        element: plotBlock.name,
        description: `"${plotBlock.name}" is an underexplored plot element with creative potential`,
        rarity: plotBlock.storyCount! < 5 ? 'very_rare' : 'rare',
      });
    }

    return highlights;
  }

  /**
   * Identify unexplored angles from existing stories
   */
  private identifyUnexploredAngles(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[],
    existingStories: SearchResult[]
  ): NoveltyHighlight[] {
    const highlights: NoveltyHighlight[] = [];

    // If few existing stories, the whole angle is unexplored
    if (existingStories.length < 3) {
      highlights.push({
        type: 'unexplored_angle',
        element: 'Story Concept',
        description:
          'This concept has minimal existing exploration, offering a fresh perspective for readers',
        rarity: 'very_rare',
        examples:
          existingStories.length > 0
            ? [
                `Only ${existingStories.length} similar ${
                  existingStories.length === 1
                    ? 'story exists'
                    : 'stories exist'
                }`,
              ]
            : undefined,
      });
    }

    return highlights;
  }

  /**
   * Identify creative opportunities and twists
   */
  private identifyCreativeOpportunities(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[]
  ): NoveltyHighlight[] {
    const highlights: NoveltyHighlight[] = [];

    // Look for interesting tag + plot block combinations
    const characterTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'character') as Tag[];

    const plotElements = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    if (characterTags.length > 0 && plotElements.length > 0) {
      const charNames = characterTags.map(tag => tag.name).join(' & ');
      const plotNames = plotElements.map(pb => pb.name).join(' + ');

      highlights.push({
        type: 'creative_twist',
        element: `${charNames} in ${plotNames}`,
        description:
          'This character and plot element combination offers unique storytelling opportunities',
        rarity: 'uncommon',
      });
    }

    return highlights;
  }

  /**
   * Generate title and premise for the prompt
   */
  private generateTitleAndPremise(
    context: PromptGenerationContext,
    sections: GeneratedPrompt['sections']
  ): { title: string; premise: string } {
    const { pathway, tags, plotBlocks, fandomName } = context;

    // Generate title
    let title = 'Story Prompt: ';

    const keyElements: string[] = [];

    // Add character elements
    const characterTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(tag => tag && tag.category === 'character') as Tag[];

    if (characterTags.length > 0) {
      keyElements.push(
        characterTags
          .slice(0, 2)
          .map(tag => tag.name)
          .join(' & ')
      );
    }

    // Add plot elements
    const plotElements = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => plotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    if (plotElements.length > 0) {
      keyElements.push(plotElements[0].name);
    }

    // Add genre/theme
    const genreTags = pathway
      .filter(p => p.type === 'tag')
      .map(p => tags.find(t => t.id === p.id))
      .filter(
        tag => tag && (tag.category === 'genre' || tag.category === 'theme')
      ) as Tag[];

    if (genreTags.length > 0) {
      keyElements.push(genreTags[0].name);
    }

    title += keyElements.join(' in ') + ` (${fandomName})`;

    // Generate premise
    let premise = `A ${fandomName} fanfiction exploring `;

    if (characterTags.length > 0) {
      premise += `${characterTags.map(tag => tag.name).join(' and ')}`;
    } else {
      premise += 'compelling characters';
    }

    if (plotElements.length > 0) {
      premise += ` through the lens of ${plotElements
        .map(pb => pb.name.toLowerCase())
        .join(' and ')}`;
    }

    if (genreTags.length > 0) {
      premise += `, embracing ${genreTags
        .map(tag => tag.name.toLowerCase())
        .join(' and ')} elements`;
    }

    premise += '.';

    return { title, premise };
  }

  /**
   * Compile final description from sections
   */
  private compileDescription(
    sections: GeneratedPrompt['sections'],
    preferences?: PromptPreferences
  ): string {
    const parts: string[] = [];

    // Add sections based on preferences
    const style = preferences?.style || 'detailed';

    if (
      sections.characterFocus &&
      (style === 'detailed' || style === 'creative')
    ) {
      parts.push(`**Character Focus**: ${sections.characterFocus}`);
    }

    if (sections.plotElements) {
      parts.push(`**Plot Elements**: ${sections.plotElements}`);
    }

    if (sections.worldBuilding && style === 'detailed') {
      parts.push(`**World Building**: ${sections.worldBuilding}`);
    }

    if (sections.themes && (style === 'detailed' || style === 'creative')) {
      parts.push(`**Themes**: ${sections.themes}`);
    }

    if (sections.tone && style !== 'concise') {
      parts.push(`**Tone**: ${sections.tone}`);
    }

    if (sections.structure && style === 'detailed') {
      parts.push(`**Structure**: ${sections.structure}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate metadata for the prompt
   */
  private generateMetadata(
    context: PromptGenerationContext,
    analysis: PromptAnalysis
  ): {
    estimatedLength: GeneratedPrompt['estimatedLength'];
    difficulty: GeneratedPrompt['difficulty'];
  } {
    const { pathway } = context;

    // Estimate length based on complexity
    let estimatedLength: GeneratedPrompt['estimatedLength'] = 'short';

    if (analysis.complexityScore < 30) {
      estimatedLength = 'oneshot';
    } else if (analysis.complexityScore < 50) {
      estimatedLength = 'short';
    } else if (analysis.complexityScore < 70) {
      estimatedLength = 'medium';
    } else if (analysis.complexityScore < 85) {
      estimatedLength = 'long';
    } else {
      estimatedLength = 'epic';
    }

    // Determine difficulty
    let difficulty: GeneratedPrompt['difficulty'] = 'intermediate';

    if (pathway.length <= 3 && analysis.complexityScore < 40) {
      difficulty = 'beginner';
    } else if (analysis.complexityScore > 75 || pathway.length > 6) {
      difficulty = 'advanced';
    }

    return { estimatedLength, difficulty };
  }

  // Helper methods

  private initializeTemplates(): void {
    // Initialize prompt templates for different styles and contexts
    // This would load from configuration or database in practice
  }

  private selectTemplate(
    context: PromptGenerationContext,
    analysis: PromptAnalysis
  ): PromptTemplate {
    // Return a template based on context and analysis
    return {
      includeCharacterFocus: true,
      includePlotElements: true,
      includeWorldBuilding:
        context.userPreferences?.includeWorldBuilding !== false,
      includeThemes: true,
      includeTone: true,
      includeStructure: context.userPreferences?.includePlotStructure !== false,
    };
  }

  private detectPotentialConflicts(
    pathway: PathwayItem[],
    tags: Tag[],
    plotBlocks: PlotBlock[]
  ): Array<{ item1: string; item2: string; type: string }> {
    // Simplified conflict detection
    return [];
  }

  private recommendLength(
    complexityScore: number,
    pathwayLength: number
  ): string {
    if (complexityScore < 30 && pathwayLength <= 3) return 'oneshot';
    if (complexityScore < 50) return 'short';
    if (complexityScore < 70) return 'medium';
    if (complexityScore < 85) return 'long';
    return 'epic';
  }

  private extractPromptTags(context: PromptGenerationContext): string[] {
    return context.pathway.map(item => item.id);
  }

  private generatePromptId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface PromptTemplate {
  includeCharacterFocus: boolean;
  includePlotElements: boolean;
  includeWorldBuilding: boolean;
  includeThemes: boolean;
  includeTone: boolean;
  includeStructure: boolean;
}

class NoveltyAnalyzer {
  // Placeholder for novelty analysis functionality
}

// Export singleton instance
export const promptGenerationService = new PromptGenerationService();
