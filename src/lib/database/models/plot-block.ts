/**
 * PlotBlock Model - T020
 *
 * Represents structured story elements with hierarchical tree structure and conditional requirements.
 * Supports complex relationships and validation for story discovery.
 */

import { eq, and, desc, isNull } from 'drizzle-orm';
import { getDatabase } from '../config';
import { plotBlocks, plotBlockConditions } from '../schema';
import type { PlotBlock, NewPlotBlock } from '../schema';

// Extended types for discovery interface
export interface PlotBlockWithChildren extends PlotBlock {
  childBlocks?: PlotBlockWithChildren[];
  conditionCount: number;
}

export interface CreatePlotBlockData {
  id?: string;
  name: string;
  fandomId: string;
  category: string;
  description: string;
  isActive?: boolean;
  conflictsWith?: string[] | null;
  requires?: string[] | null;
  softRequires?: string[] | null;
  enhances?: string[] | null;
  enabledBy?: string[] | null;
  excludesCategories?: string[] | null;
  maxInstances?: number | null;
  parentId?: string | null;
  children?: string[] | null;
}

export interface UpdatePlotBlockData {
  name?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  conflictsWith?: string[] | null;
  requires?: string[] | null;
  softRequires?: string[] | null;
  enhances?: string[] | null;
  enabledBy?: string[] | null;
  excludesCategories?: string[] | null;
  maxInstances?: number | null;
  parentId?: string | null;
  children?: string[] | null;
}

export interface PlotBlockFilters {
  fandomId?: string;
  category?: string;
  isActive?: boolean;
  parentId?: string | null;
}

/**
 * PlotBlock Model for discovery interface
 * Provides hierarchical tree structure support and complex relationship management
 */
export class PlotBlockModel {
  /**
   * Get all root plot blocks for a fandom (no parent)
   */
  static async getRootBlocks(fandomId: string): Promise<PlotBlock[]> {
    const db = getDatabase();
    return db
      .select()
      .from(plotBlocks)
      .where(
        and(
          eq(plotBlocks.fandom_id, fandomId),
          eq(plotBlocks.is_active, true),
          isNull(plotBlocks.parent_id)
        )
      )
      .orderBy(desc(plotBlocks.name));
  }

  /**
   * Get child blocks for a parent plot block
   */
  static async getChildBlocks(parentId: string): Promise<PlotBlock[]> {
    const db = getDatabase();
    return db
      .select()
      .from(plotBlocks)
      .where(
        and(eq(plotBlocks.parent_id, parentId), eq(plotBlocks.is_active, true))
      )
      .orderBy(desc(plotBlocks.name));
  }

  /**
   * Get plot blocks by category for a fandom
   */
  static async getByCategory(
    fandomId: string,
    category: string
  ): Promise<PlotBlock[]> {
    const db = getDatabase();
    return db
      .select()
      .from(plotBlocks)
      .where(
        and(
          eq(plotBlocks.fandom_id, fandomId),
          eq(plotBlocks.category, category),
          eq(plotBlocks.is_active, true)
        )
      )
      .orderBy(desc(plotBlocks.name));
  }

  /**
   * Get full hierarchical tree for a fandom
   */
  static async getTreeStructure(
    fandomId: string
  ): Promise<PlotBlockWithChildren[]> {
    // Get all plot blocks for the fandom
    const db = getDatabase();
    const allBlocks = await db
      .select()
      .from(plotBlocks)
      .where(
        and(eq(plotBlocks.fandom_id, fandomId), eq(plotBlocks.is_active, true))
      )
      .orderBy(desc(plotBlocks.name));

    // Build tree structure
    const blockMap = new Map<string, PlotBlockWithChildren>();
    const rootBlocks: PlotBlockWithChildren[] = [];

    // First pass: create map and add condition counts
    for (const block of allBlocks) {
      const blockWithChildren: PlotBlockWithChildren = {
        ...block,
        childBlocks: [],
        conditionCount: 0, // Simplified for T020
      };
      blockMap.set(block.id, blockWithChildren);
    }

    // Second pass: build hierarchy
    for (const block of allBlocks) {
      const blockWithChildren = blockMap.get(block.id)!;

      if (block.parent_id) {
        const parent = blockMap.get(block.parent_id);
        if (parent) {
          parent.childBlocks!.push(blockWithChildren);
        }
      } else {
        rootBlocks.push(blockWithChildren);
      }
    }

    return rootBlocks;
  }

  /**
   * Get plot block by ID
   */
  static async getById(id: string): Promise<PlotBlock | null> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(plotBlocks)
      .where(eq(plotBlocks.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new plot block
   */
  static async create(data: CreatePlotBlockData): Promise<PlotBlock> {
    const plotBlockData = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      fandom_id: data.fandomId,
      category: data.category,
      description: data.description,
      is_active: data.isActive ?? true,
      conflicts_with: data.conflictsWith,
      requires: data.requires,
      soft_requires: data.softRequires,
      enhances: data.enhances,
      enabled_by: data.enabledBy,
      excludes_categories: data.excludesCategories,
      max_instances: data.maxInstances,
      parent_id: data.parentId,
      children: data.children,
    };

    const db = getDatabase();
    const result = await db
      .insert(plotBlocks)
      .values(plotBlockData)
      .returning();

    return result[0];
  }

  /**
   * Update existing plot block
   */
  static async update(
    id: string,
    data: UpdatePlotBlockData
  ): Promise<PlotBlock | null> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.conflictsWith !== undefined)
      updateData.conflicts_with = data.conflictsWith;
    if (data.requires !== undefined) updateData.requires = data.requires;
    if (data.softRequires !== undefined)
      updateData.soft_requires = data.softRequires;
    if (data.enhances !== undefined) updateData.enhances = data.enhances;
    if (data.enabledBy !== undefined) updateData.enabled_by = data.enabledBy;
    if (data.excludesCategories !== undefined)
      updateData.excludes_categories = data.excludesCategories;
    if (data.maxInstances !== undefined)
      updateData.max_instances = data.maxInstances;
    if (data.parentId !== undefined) updateData.parent_id = data.parentId;
    if (data.children !== undefined) updateData.children = data.children;

    updateData.updated_at = new Date();

    const db = getDatabase();
    const result = await db
      .update(plotBlocks)
      .set(updateData)
      .where(eq(plotBlocks.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Search plot blocks with filters
   */
  static async search(filters: PlotBlockFilters = {}): Promise<PlotBlock[]> {
    const db = getDatabase();

    // Build query based on filters to avoid type issues
    if (filters.fandomId && filters.category) {
      return db
        .select()
        .from(plotBlocks)
        .where(
          and(
            eq(plotBlocks.fandom_id, filters.fandomId),
            eq(plotBlocks.category, filters.category),
            eq(plotBlocks.is_active, filters.isActive ?? true)
          )
        )
        .orderBy(desc(plotBlocks.name));
    }

    if (filters.fandomId) {
      return db
        .select()
        .from(plotBlocks)
        .where(
          and(
            eq(plotBlocks.fandom_id, filters.fandomId),
            eq(plotBlocks.is_active, filters.isActive ?? true)
          )
        )
        .orderBy(desc(plotBlocks.name));
    }

    // Default: all active plot blocks
    return db
      .select()
      .from(plotBlocks)
      .where(eq(plotBlocks.is_active, filters.isActive ?? true))
      .orderBy(desc(plotBlocks.name));
  }

  /**
   * Get all categories for a fandom
   */
  static async getCategoriesByFandom(fandomId: string): Promise<string[]> {
    const db = getDatabase();
    const result = await db
      .select()
      .from(plotBlocks)
      .where(
        and(eq(plotBlocks.fandom_id, fandomId), eq(plotBlocks.is_active, true))
      );

    // Extract unique categories
    const categories = result.map(row => row.category);
    return [...new Set(categories)].sort();
  }

  /**
   * Validate plot block name is unique within fandom and category
   */
  static async validateName(
    name: string,
    fandomId: string,
    category: string,
    excludeId?: string
  ): Promise<boolean> {
    const db = getDatabase();
    const existing = await db
      .select()
      .from(plotBlocks)
      .where(
        and(
          eq(plotBlocks.name, name),
          eq(plotBlocks.fandom_id, fandomId),
          eq(plotBlocks.category, category)
        )
      )
      .limit(1);

    // If excluding an ID, check it's not the same record
    if (excludeId && existing.length > 0) {
      return existing[0].id === excludeId;
    }

    return existing.length === 0;
  }

  /**
   * Get plot block relationships (conflicts, requirements, etc.)
   */
  static async getRelationships(fandomId: string): Promise<{
    conflicts: Array<{ blockId: string; conflictsWith: string[] }>;
    requirements: Array<{
      blockId: string;
      requires: string[];
      softRequires: string[];
    }>;
    enhancements: Array<{
      blockId: string;
      enhances: string[];
      enabledBy: string[];
    }>;
  }> {
    const db = getDatabase();
    const blocks = await db
      .select()
      .from(plotBlocks)
      .where(
        and(eq(plotBlocks.fandom_id, fandomId), eq(plotBlocks.is_active, true))
      );

    const conflicts: Array<{ blockId: string; conflictsWith: string[] }> = [];
    const requirements: Array<{
      blockId: string;
      requires: string[];
      softRequires: string[];
    }> = [];
    const enhancements: Array<{
      blockId: string;
      enhances: string[];
      enabledBy: string[];
    }> = [];

    for (const block of blocks) {
      if (block.conflicts_with && block.conflicts_with.length > 0) {
        conflicts.push({
          blockId: block.id,
          conflictsWith: block.conflicts_with,
        });
      }

      if (
        (block.requires && block.requires.length > 0) ||
        (block.soft_requires && block.soft_requires.length > 0)
      ) {
        requirements.push({
          blockId: block.id,
          requires: block.requires || [],
          softRequires: block.soft_requires || [],
        });
      }

      if (
        (block.enhances && block.enhances.length > 0) ||
        (block.enabled_by && block.enabled_by.length > 0)
      ) {
        enhancements.push({
          blockId: block.id,
          enhances: block.enhances || [],
          enabledBy: block.enabled_by || [],
        });
      }
    }

    return { conflicts, requirements, enhancements };
  }

  /**
   * Soft delete plot block
   */
  static async softDelete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .update(plotBlocks)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(plotBlocks.id, id))
      .returning();

    return result.length > 0;
  }
}

export default PlotBlockModel;
