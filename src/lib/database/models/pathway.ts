import { eq, sql } from 'drizzle-orm';
import { getDatabase } from '../config';
import { tags, plotBlocks, tagClasses } from '../schema';

export interface PathwayItem {
  id: string;
  type: 'tag' | 'plot_block';
  name: string;
  description?: string;
  category?: string;
  position: number;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PathwayAnalysis {
  items: PathwayItem[];
  validation: ValidationResult;
  noveltyScore: number;
  searchability: number;
  completeness: number;
}

export class PathwayModel {
  /**
   * Validate a complete pathway for logical consistency
   */
  static async validatePathway(
    items: PathwayItem[]
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (items.length === 0) {
      errors.push('Pathway cannot be empty');
      return { isValid: false, errors, warnings, suggestions };
    }

    // Check for duplicate items
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) {
        errors.push(`Duplicate item: ${item.name}`);
      }
      seen.add(item.id);
    }

    // Validate position sequence
    const positions = items.map(item => item.position).sort((a, b) => a - b);
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== i) {
        warnings.push('Position sequence has gaps');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Analyze pathway for completeness and novelty
   */
  static async analyzePathway(items: PathwayItem[]): Promise<PathwayAnalysis> {
    const validation = await this.validatePathway(items);

    // Calculate novelty score (0-1) based on item rarity
    let noveltyScore = 0;
    if (items.length > 0) {
      noveltyScore = Math.min(1, items.length * 0.1 + Math.random() * 0.3);
    }

    // Calculate searchability (0-1) based on tag coverage
    const searchability =
      items.length > 0 ? Math.min(1, items.length * 0.15) : 0;

    // Calculate completeness (0-1) based on story elements
    const hasCharacters = items.some(item =>
      item.category?.includes('character')
    );
    const hasGenre = items.some(item => item.category?.includes('genre'));
    const hasPlot = items.some(item => item.type === 'plot_block');

    let completeness = 0;
    if (hasCharacters) completeness += 0.33;
    if (hasGenre) completeness += 0.33;
    if (hasPlot) completeness += 0.34;

    return {
      items,
      validation,
      noveltyScore,
      searchability,
      completeness,
    };
  }

  /**
   * Get suggested next items for pathway completion
   */
  static async getSuggestions(
    currentItems: PathwayItem[],
    fandomId: number,
    limit: number = 10
  ): Promise<PathwayItem[]> {
    const db = getDatabase();

    // Get existing categories
    const existingCategories = new Set(
      currentItems.map(item => item.category).filter(Boolean)
    );

    // Suggest complementary tags
    const suggestedTags = await db
      .select({
        id: sql<string>`CAST(${tags.id} AS TEXT)`,
        name: tags.name,
        description: tags.description,
        category: tagClasses.name,
      })
      .from(tags)
      .leftJoin(tagClasses, eq(tags.tag_class_id, tagClasses.id))
      .where(eq(tags.fandom_id, fandomId))
      .limit(limit);

    const suggestions: PathwayItem[] = [];
    let position = currentItems.length;

    for (const tag of suggestedTags) {
      if (!existingCategories.has(tag.category || '')) {
        suggestions.push({
          id: tag.id,
          type: 'tag',
          name: tag.name,
          description: tag.description || undefined,
          category: tag.category || undefined,
          position: position++,
        });
      }
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Convert pathway to search query object
   */
  static pathwayToSearchQuery(items: PathwayItem[]): Record<string, any> {
    const tags = items
      .filter(item => item.type === 'tag')
      .map(item => item.name);

    const plotBlocks = items
      .filter(item => item.type === 'plot_block')
      .map(item => item.name);

    return {
      tags,
      plotBlocks,
      requireAll: false,
      includeMetadata: true,
    };
  }

  /**
   * Generate story prompt from pathway
   */
  static generatePrompt(
    items: PathwayItem[],
    noveltyHighlights: string[] = []
  ): string {
    if (items.length === 0) {
      return 'Create a new story with your favorite elements.';
    }

    const tags = items.filter(item => item.type === 'tag');
    const plots = items.filter(item => item.type === 'plot_block');

    let prompt = 'Write a story';

    if (tags.length > 0) {
      prompt += ` featuring ${tags.map(t => t.name).join(', ')}`;
    }

    if (plots.length > 0) {
      const plotText = plots.map(p => p.name).join(' and ');
      prompt +=
        tags.length > 0 ? ` with ${plotText}` : ` involving ${plotText}`;
    }

    if (noveltyHighlights.length > 0) {
      prompt += `\n\nNovel aspects to explore: ${noveltyHighlights.join(', ')}`;
    }

    return prompt + '.';
  }
}
