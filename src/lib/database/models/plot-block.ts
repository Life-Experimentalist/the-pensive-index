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

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/--+/g, '-') // Replace multiple dashes with single dash
    .trim();
}

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
   * Get all root tropes for a fandom (no parent)
   */
  static async getRootBlocks(fandomId: string | number): Promise<PlotBlock[]> {
    const db = getDatabase();
    // Convert fandomId to string since plotBlocks.fandom_id is TEXT
    const fandomIdStr = String(fandomId);

    const allBlocks = await db
      .select()
      .from(plotBlocks)
      .where(and(eq(plotBlocks.is_active, true), isNull(plotBlocks.parent_id)));

    // Filter by fandom_id manually to handle type mismatch
    return allBlocks.filter(block => block.fandom_id === fandomIdStr);
  }

  /**
   * Get child blocks for a parent trope
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
   * Get full hierarchical tree for a fandom
   */
  static async getTreeStructure(
    fandomId: string
  ): Promise<PlotBlockWithChildren[]> {
    // Get all tropes for the fandom
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
   * Get trope by ID
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
   * Create a new trope
   */
  static async create(data: CreatePlotBlockData): Promise<PlotBlock> {
    const plotBlockData = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      slug: generateSlug(data.name), // Generate slug from name
      fandom_id: data.fandomId,
      description: data.description,
      is_active: data.isActive ?? true,
      parent_id: data.parentId || null,
      display_order: 0, // Default display order
    };

    const db = getDatabase();
    const result = await db
      .insert(plotBlocks)
      .values(plotBlockData)
      .returning();

    return result[0];
  }

  /**
   * Update existing trope
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
   * Search tropes with filters
   */
  static async search(filters: PlotBlockFilters = {}): Promise<PlotBlock[]> {
    const db = getDatabase();

    // Build query based on filters
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

    // Default: all active tropes
    return db
      .select()
      .from(plotBlocks)
      .where(eq(plotBlocks.is_active, filters.isActive ?? true))
      .orderBy(desc(plotBlocks.name));
  }

  /**
   * Validate trope name is unique within fandom
   */
  static async validateName(
    name: string,
    fandomId: string,
    excludeId?: string
  ): Promise<boolean> {
    const db = getDatabase();
    const existing = await db
      .select()
      .from(plotBlocks)
      .where(
        and(eq(plotBlocks.fandom_id, fandomId), eq(plotBlocks.name, name))
      );

    if (excludeId && existing.length > 0) {
      return existing[0].id === excludeId;
    }

    return existing.length === 0;
  }

  /**
   * Get trope relationships (conflicts, requirements, etc.)
   * Note: These fields were removed from the schema. This method returns empty arrays.
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
    // These fields (conflicts_with, requires, soft_requires, enhances, enabled_by)
    // were removed from the plot_blocks schema.
    // Returning empty arrays for backward compatibility.
    return {
      conflicts: [],
      requirements: [],
      enhancements: [],
    };
  }

  /**
   * Soft delete trope
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
