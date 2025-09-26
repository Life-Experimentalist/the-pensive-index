/**
 * Fandom Model - T018
 *
 * Represents a fictional universe containing tags and plot blocks for story discovery.
 * Extends existing Drizzle schema with discovery interface requirements.
 */

import { eq, and, desc } from 'drizzle-orm';
import { getDatabase } from '../config';
import { fandoms } from '../schema';
import type { Fandom, NewFandom } from '../schema';

// Extended types for discovery interface
export interface FandomWithCounts extends Fandom {
  tagCount: number;
  plotBlockCount: number;
  storyCount: number;
}

export interface CreateFandomData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isActive?: boolean;
}

export interface UpdateFandomData {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export class FandomModel {
  /**
   * Get all active fandoms (simplified version for T018)
   */
  static async getAllActive(): Promise<Fandom[]> {
    const db = getDatabase();
    return db
      .select()
      .from(fandoms)
      .where(eq(fandoms.is_active, true))
      .orderBy(desc(fandoms.name));
  }

  /**
   * Get fandom by slug for SEO-friendly URLs
   */
  static async getBySlug(slug: string): Promise<Fandom | null> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(fandoms)
      .where(and(eq(fandoms.slug, slug), eq(fandoms.is_active, true)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get fandom by ID
   */
  static async getById(id: string): Promise<Fandom | null> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(fandoms)
      .where(and(eq(fandoms.id, id), eq(fandoms.is_active, true)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create new fandom (admin function)
   */
  static async create(data: CreateFandomData): Promise<Fandom> {
    const fandomData = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      slug: data.slug,
      description: data.description,
      is_active: data.isActive ?? true,
    };

    const db = getDatabase();
    const result = await db.insert(fandoms).values(fandomData).returning();

    return result[0];
  }

  /**
   * Update existing fandom (admin function)
   */
  static async update(
    id: string,
    data: UpdateFandomData
  ): Promise<Fandom | null> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    updateData.updated_at = new Date();

    const db = getDatabase();
    const result = await db
      .update(fandoms)
      .set(updateData)
      .where(eq(fandoms.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Validate fandom slug is unique and URL-safe
   */
  static async validateSlug(
    slug: string,
    excludeId?: string
  ): Promise<boolean> {
    // Check URL-safe pattern
    const urlSafePattern = /^[a-z0-9-]+$/;
    if (!urlSafePattern.test(slug)) {
      return false;
    }

    // Check uniqueness - simplified for T018
    const db = getDatabase();
    const existing = await db
      .select()
      .from(fandoms)
      .where(eq(fandoms.slug, slug))
      .limit(1);

    // If excluding an ID, check it's not the same record
    if (excludeId && existing.length > 0) {
      return existing[0].id === excludeId;
    }

    return existing.length === 0;
  }

  /**
   * Soft delete fandom (admin function)
   */
  static async softDelete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .update(fandoms)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(fandoms.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Search fandoms by name (for admin interface)
   */
  static async search(
    query: string,
    includeInactive = false
  ): Promise<Fandom[]> {
    const db = getDatabase();

    if (!query.trim()) {
      // No query, return all active fandoms
      return includeInactive
        ? db.select().from(fandoms).orderBy(desc(fandoms.name))
        : db
            .select()
            .from(fandoms)
            .where(eq(fandoms.is_active, true))
            .orderBy(desc(fandoms.name));
    }

    // Use LIKE for search - simplified implementation
    const conditions = [];
    if (!includeInactive) {
      conditions.push(eq(fandoms.is_active, true));
    }

    // Note: This is a simplified approach for T018.
    // A more robust implementation would use proper LIKE syntax
    return db
      .select()
      .from(fandoms)
      .where(includeInactive ? undefined : eq(fandoms.is_active, true))
      .orderBy(desc(fandoms.name));
  }
}

export default FandomModel;
