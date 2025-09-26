import { PathwayModel, PathwayItem, PathwayAnalysis } from './pathway';
import { StoryModel, StorySearchResult, StorySearchFilters } from './story';

export interface SearchRequest {
  fandomId: number;
  pathway: PathwayItem[];
  filters?: {
    minWordCount?: number;
    maxWordCount?: number;
    status?: string;
    language?: string;
    rating?: string;
  };
  limit?: number;
  includePopular?: boolean;
}

export interface SearchResponse {
  pathway: PathwayAnalysis;
  stories: StorySearchResult[];
  prompt: {
    text: string;
    noveltyHighlights: string[];
    completionSuggestions: string[];
  };
  metadata: {
    totalResults: number;
    searchTime: number;
    hasMoreResults: boolean;
    searchFilters: StorySearchFilters;
  };
}

export interface NoveltyAnalysis {
  unusualCombinations: string[];
  rareElements: string[];
  missingElements: string[];
  suggestedAdditions: string[];
}

export class SearchResultModel {
  /**
   * Perform complete pathway search with story results and prompt generation
   */
  static async performSearch(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    // Analyze the pathway
    const pathwayAnalysis = await PathwayModel.analyzePathway(request.pathway);

    // Build story search filters from pathway
    const searchFilters: StorySearchFilters = {
      tags: request.pathway
        .filter(item => item.type === 'tag')
        .map(item => item.name),
      plotBlocks: request.pathway
        .filter(item => item.type === 'plot_block')
        .map(item => item.name),
      requireAll: false,
      ...request.filters,
    };

    // Search for matching stories
    const stories = await StoryModel.search(
      request.fandomId.toString(),
      searchFilters,
      request.limit || 20
    );

    // Add popular stories if few matches found and requested
    if (stories.length < 5 && request.includePopular) {
      const popular = await StoryModel.getPopular(
        request.fandomId,
        5 - stories.length
      );
      stories.push(...popular);
    }

    // Analyze novelty and generate suggestions
    const noveltyAnalysis = await this.analyzeNovelty(request.pathway, stories);

    // Generate story prompt
    const prompt = PathwayModel.generatePrompt(
      request.pathway,
      noveltyAnalysis.unusualCombinations
    );

    const searchTime = Date.now() - startTime;

    return {
      pathway: pathwayAnalysis,
      stories: stories.slice(0, request.limit || 20),
      prompt: {
        text: prompt,
        noveltyHighlights: noveltyAnalysis.unusualCombinations,
        completionSuggestions: noveltyAnalysis.suggestedAdditions,
      },
      metadata: {
        totalResults: stories.length,
        searchTime,
        hasMoreResults: stories.length >= (request.limit || 20),
        searchFilters,
      },
    };
  }

  /**
   * Get pathway completion suggestions
   */
  static async getCompletionSuggestions(
    fandomId: number,
    currentPathway: PathwayItem[],
    limit: number = 5
  ): Promise<PathwayItem[]> {
    return await PathwayModel.getSuggestions(currentPathway, fandomId.toString(), limit);
  }

  /**
   * Analyze pathway for novelty and gaps
   */
  private static async analyzeNovelty(
    pathway: PathwayItem[],
    existingStories: StorySearchResult[]
  ): Promise<NoveltyAnalysis> {
    const unusualCombinations: string[] = [];
    const rareElements: string[] = [];
    const missingElements: string[] = [];
    const suggestedAdditions: string[] = [];

    // Find unusual combinations (low match count)
    const lowMatchStories = existingStories.filter(
      story => story.relevanceScore < 30
    );
    if (lowMatchStories.length < 3) {
      const combinations = this.generateCombinations(pathway);
      unusualCombinations.push(...combinations.slice(0, 3));
    }

    // Find rare elements (elements with few story matches)
    const elementFrequency = this.analyzeElementFrequency(
      pathway,
      existingStories
    );
    for (const [element, frequency] of elementFrequency.entries()) {
      if (frequency < 2) {
        rareElements.push(element);
      }
    }

    // Suggest missing common elements
    const hasCharacter = pathway.some(
      item =>
        item.category?.toLowerCase().includes('character') ||
        item.category?.toLowerCase().includes('ship')
    );
    const hasGenre = pathway.some(item =>
      item.category?.toLowerCase().includes('genre')
    );
    const hasPlot = pathway.some(item => item.type === 'plot_block');

    if (!hasCharacter) {
      suggestedAdditions.push('character focus');
      missingElements.push('character development');
    }
    if (!hasGenre) {
      suggestedAdditions.push('genre specification');
      missingElements.push('genre elements');
    }
    if (!hasPlot) {
      suggestedAdditions.push('plot structure');
      missingElements.push('plot development');
    }

    return {
      unusualCombinations,
      rareElements,
      missingElements,
      suggestedAdditions,
    };
  }

  /**
   * Generate description of pathway element combinations
   */
  private static generateCombinations(pathway: PathwayItem[]): string[] {
    const combinations: string[] = [];

    if (pathway.length < 2) return combinations;

    // Generate pairwise combinations
    for (let i = 0; i < pathway.length - 1; i++) {
      for (let j = i + 1; j < Math.min(pathway.length, i + 3); j++) {
        const combo = `${pathway[i].name} + ${pathway[j].name}`;
        combinations.push(combo);
      }
    }

    return combinations.slice(0, 5);
  }

  /**
   * Analyze how frequently each pathway element appears in search results
   */
  private static analyzeElementFrequency(
    pathway: PathwayItem[],
    stories: StorySearchResult[]
  ): Map<string, number> {
    const frequency = new Map<string, number>();

    for (const item of pathway) {
      let count = 0;

      for (const story of stories) {
        const isMatched =
          item.type === 'tag'
            ? story.matchedTags.includes(item.name)
            : story.matchedPlotBlocks.includes(item.name);

        if (isMatched) {
          count++;
        }
      }

      frequency.set(item.name, count);
    }

    return frequency;
  }

  /**
   * Get search history and trending pathways (placeholder for future enhancement)
   */
  static async getTrendingSearches(
    fandomId: number,
    limit: number = 10
  ): Promise<Array<{ pathway: PathwayItem[]; frequency: number }>> {
    // Placeholder implementation - would use analytics data in production
    return [];
  }

  /**
   * Export search results for sharing or analysis
   */
  static exportResults(searchResponse: SearchResponse): string {
    const { pathway, stories, prompt, metadata } = searchResponse;

    const exportData = {
      timestamp: new Date().toISOString(),
      pathway: pathway.items.map(item => ({
        name: item.name,
        type: item.type,
        category: item.category,
      })),
      pathwayAnalysis: {
        noveltyScore: pathway.noveltyScore,
        completeness: pathway.completeness,
        isValid: pathway.validation.isValid,
      },
      storiesFound: stories.length,
      topStories: stories.slice(0, 5).map(story => ({
        title: story.title,
        author: story.author,
        relevanceScore: story.relevanceScore,
        url: story.url,
      })),
      generatedPrompt: prompt.text,
      searchMetadata: metadata,
    };

    return JSON.stringify(exportData, null, 2);
  }
}
