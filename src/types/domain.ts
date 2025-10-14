// Domain-facing types (camelCase) used by services and UI.
export interface DomainStory {
  id: string;
  title?: string;
  author?: string;
  fandomId?: string;
  description?: string;
  url?: string;
  wordCount?: number | null;
  chapterCount?: number | null;
  status?: 'complete' | 'incomplete' | 'abandoned' | 'hiatus' | 'unknown';
  rating?: string;
  warnings?: string[];
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;

  // Computed fields
  relevanceScore?: number;
  tagMatchCount?: number;
  plotBlockMatchCount?: number;

  // Popularity
  kudosCount?: number;
  hitCount?: number;
  bookmarkCount?: number;
  summary?: string;
}

export type DomainStoryResult = {
  story: DomainStory;
  relevanceScore?: number;
  matchedTags?: any[];
  matchedPlotBlocks?: any[];
  relevanceFactors?: any;
  searchRank?: number;
};

export {};
