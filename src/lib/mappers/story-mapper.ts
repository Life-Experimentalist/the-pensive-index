import type { DomainStory } from '@/types/domain';

// Convert a DB row (snake_case) to a DomainStory with camelCase fields.
export function mapDbStoryToDomain(row: any): DomainStory {
  if (!row) {
    return {} as DomainStory;
  }

  return {
    id: String(row.id),
    title: row.title ?? row.story_title ?? undefined,
    author: row.author_name ?? row.author ?? undefined,
    fandomId: row.fandom_id ?? row.fandomId ?? undefined,
    description: row.description ?? row.summary ?? undefined,
    url: row.url ?? row.story_url ?? undefined,
    wordCount:
      row.word_count !== undefined
        ? Number(row.word_count)
        : row.wordCount ?? null,
    chapterCount:
      row.chapter_count !== undefined
        ? Number(row.chapter_count)
        : row.chapterCount ?? null,
    status: row.status ?? undefined,
    rating: row.rating ?? undefined,
    warnings: row.warnings ?? undefined,
    isActive: row.is_active ?? row.isActive ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? undefined,
    updatedAt: row.updated_at ?? row.updatedAt ?? undefined,
    relevanceScore: row.relevance_score ?? row.relevanceScore ?? undefined,
    tagMatchCount: row.tag_match_count ?? row.tagMatchCount ?? undefined,
    plotBlockMatchCount:
      row.plot_block_match_count ?? row.plotBlockMatchCount ?? undefined,
    kudosCount: row.kudos_count ?? row.kudosCount ?? undefined,
    hitCount: row.hit_count ?? row.hitCount ?? undefined,
    bookmarkCount: row.bookmark_count ?? row.bookmarkCount ?? undefined,
    summary: row.summary ?? undefined,
  };
}

export function mapDbStoriesToDomain(rows: any[]): DomainStory[] {
  return (rows || []).map(mapDbStoryToDomain);
}
