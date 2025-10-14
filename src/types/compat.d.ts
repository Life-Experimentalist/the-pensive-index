declare module '@/types' {
  // Add camelCase aliases to Story
  interface Story {
    fandomId?: string;
    wordCount?: number;
    chapterCount?: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    relevanceScore?: number;
    tagMatchCount?: number;
    plotBlockMatchCount?: number;
    summary?: string;
    kudosCount?: number;
    hitCount?: number;
    bookmarkCount?: number;
  }

  // ValidationRule camelCase helpers
  interface ValidationRule {
    fandomId?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    // allow loose access during migration
    [key: string]: any;
  }

  // Minimal search-related types used by services
  interface StorySearchFilters {
    ratings?: string[];
    statuses?: ('complete' | 'incomplete' | 'abandoned' | 'hiatus')[];
    minWordCount?: number;
    maxWordCount?: number;
    updatedAfter?: string;
    minRelevanceScore?: number;
    sort?: { field?: string; direction?: 'asc' | 'desc' } | string;
    [key: string]: any;
  }

  interface StorySearchResult {
    story: Story;
    relevanceScore?: number;
    searchRank?: number;
    search_metadata?: any;
    [key: string]: any;
  }

  type SearchResult = StorySearchResult;
}
