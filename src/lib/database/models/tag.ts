/**
 * Tag Model - T019
 *
 * Represents tags used for story categorization and discovery.
 * Extends existing Drizzle schema with discovery interface requirements.
 */

import { eq, and, desc, like } from 'drizzle-orm';
import { getDatabase } from '../config';
import { tags, tagClasses } from '../schema';
import type { Tag, NewTag } from '../schema';

// Extended types for discovery interface
export interface TagWithMetadata extends Tag {
  usageCount: number;
  className?: string;
}

export interface CreateTagData {
  id?: string;
  name: string;
  fandomId: string;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  requires?: string[] | null;
  enhances?: string[] | null;
  tagClassId?: string | null;
}

export interface UpdateTagData {
  name?: string;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  requires?: string[] | null;
  enhances?: string[] | null;
  tagClassId?: string | null;
}

export interface TagSearchFilters {
  fandomId?: string;
  category?: string;
  isActive?: boolean;
  tagClassId?: string;
}

/**
 * Tag Model for discovery interface
 * Provides CRUD operations and metadata for tag management
 */
export class TagModel {
  /**
   * Get all active tags for a fandom
   */
  static async getByFandom(fandomId: string): Promise<Tag[]> {
    const db = getDatabase();
    return db
      .select()
      .from(tags)
      .where(and(eq(tags.fandom_id, fandomId), eq(tags.is_active, true)))
      .orderBy(desc(tags.name));
  }

  /**
   * Get tags by category within a fandom
   */
  static async getByCategory(
    fandomId: string,
    category: string
  ): Promise<Tag[]> {
    const db = getDatabase();
    return db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.fandom_id, fandomId),
          eq(tags.category, category),
          eq(tags.is_active, true)
        )
      )
      .orderBy(desc(tags.name));
  }

  /**
   * Get tag by ID
   */
  static async getById(id: string): Promise<Tag | null> {
    const db = getDatabase();
    const result = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

    return result[0] || null;
  }

  /**
   * Create a new tag
   */
  static async create(data: CreateTagData): Promise<Tag> {
    const tagData = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      fandom_id: data.fandomId,
      description: data.description,
      category: data.category,
      is_active: data.isActive ?? true,
      requires: data.requires,
      enhances: data.enhances,
      tag_class_id: data.tagClassId,
    };

    const db = getDatabase();
    const result = await db.insert(tags).values(tagData).returning();

    return result[0];
  }

  /**
   * Update existing tag
   */
  static async update(id: string, data: UpdateTagData): Promise<Tag | null> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.requires !== undefined) updateData.requires = data.requires;
    if (data.enhances !== undefined) updateData.enhances = data.enhances;
    if (data.tagClassId !== undefined)
      updateData.tag_class_id = data.tagClassId;

    updateData.updated_at = new Date();

    const db = getDatabase();
    const result = await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Search tags with filters (simplified for T019)
   */
  static async search(
    query: string,
    filters: TagSearchFilters = {}
  ): Promise<Tag[]> {
    const db = getDatabase();

    // Build separate queries based on filters to avoid type issues
    if (filters.fandomId && filters.category) {
      return db
        .select()
        .from(tags)
        .where(
          and(
            eq(tags.fandom_id, filters.fandomId),
            eq(tags.category, filters.category),
            eq(tags.is_active, filters.isActive ?? true)
          )
        )
        .orderBy(desc(tags.name));
    }

    if (filters.fandomId) {
      return db
        .select()
        .from(tags)
        .where(
          and(
            eq(tags.fandom_id, filters.fandomId),
            eq(tags.is_active, filters.isActive ?? true)
          )
        )
        .orderBy(desc(tags.name));
    }

    // Default: all active tags
    return db
      .select()
      .from(tags)
      .where(eq(tags.is_active, filters.isActive ?? true))
      .orderBy(desc(tags.name));
  }

  /**
   * Get all categories for a fandom (simplified for T019)
   */
  static async getCategoriesByFandom(fandomId: string): Promise<string[]> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(tags)
      .where(and(eq(tags.fandom_id, fandomId), eq(tags.is_active, true)));

    // Extract unique categories from full records, filtering out nulls
    const categories = result
      .map(row => row.category)
      .filter((category): category is string => category !== null);

    return [...new Set(categories)].sort();
  }

  /**
   * Validate tag name is unique within fandom
   */
  static async validateName(
    name: string,
    fandomId: string,
    excludeId?: string
  ): Promise<boolean> {
    const db = getDatabase();
    const conditions = [eq(tags.name, name), eq(tags.fandom_id, fandomId)];

    const existing = await db
      .select()
      .from(tags)
      .where(and(...conditions))
      .limit(1);

    // If excluding an ID, check it's not the same record
    if (excludeId && existing.length > 0) {
      return existing[0].id === excludeId;
    }

    return existing.length === 0;
  }

  /**
   * Soft delete tag
   */
  static async softDelete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .update(tags)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(tags.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Get tags that require or enhance other tags
   */
  static async getTagDependencies(fandomId: string): Promise<{
    requires: Array<{ tagId: string; requiredTags: string[] }>;
    enhances: Array<{ tagId: string; enhancedTags: string[] }>;
  }> {
    const db = getDatabase();
    const tagsWithDeps = await db
      .select()
      .from(tags)
      .where(and(eq(tags.fandom_id, fandomId), eq(tags.is_active, true)));

    const requires: Array<{ tagId: string; requiredTags: string[] }> = [];
    const enhances: Array<{ tagId: string; enhancedTags: string[] }> = [];

    for (const tag of tagsWithDeps) {
      if (tag.requires && tag.requires.length > 0) {
        requires.push({
          tagId: tag.id,
          requiredTags: tag.requires,
        });
      }

      if (tag.enhances && tag.enhances.length > 0) {
        enhances.push({
          tagId: tag.id,
          enhancedTags: tag.enhances,
        });
      }
    }

    return { requires, enhances };
  }
}

export default TagModel;
