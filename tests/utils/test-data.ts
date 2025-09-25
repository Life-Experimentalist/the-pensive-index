import { randomUUID } from 'crypto';

/**
 * Utility functions for generating test data with proper database schemas
 */

export function createTestPlotBlock(overrides: {
  name: string;
  description?: string;
  fandom_id: string;
  category: string;
  parent_id?: string | null;
  display_order?: number;
  is_active?: boolean;
}) {
  return {
    id: randomUUID(),
    slug: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    display_order: overrides.display_order ?? 0,
    is_active: overrides.is_active ?? true,
    description: overrides.description ?? '',
    ...overrides,
  };
}

export function createTestTag(overrides: {
  name: string;
  description?: string;
  fandom_id: string;
  tag_class_id?: string | null;
  category: string;
  is_active?: boolean;
}) {
  return {
    id: randomUUID(),
    slug: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    is_active: overrides.is_active ?? true,
    description: overrides.description ?? '',
    ...overrides,
  };
}

export function createTestTagClass(overrides: {
  name: string;
  description?: string;
  fandom_id: string;
  validation_rules?: object;
  is_active?: boolean;
}) {
  return {
    id: randomUUID(),
    is_active: overrides.is_active ?? true,
    description: overrides.description ?? '',
    validation_rules: overrides.validation_rules
      ? JSON.stringify(overrides.validation_rules)
      : JSON.stringify({}),
    ...overrides,
  };
}

export function createTestFandom(overrides: {
  name: string;
  description?: string;
  is_active?: boolean;
}) {
  return {
    id: randomUUID(),
    slug: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    is_active: overrides.is_active ?? true,
    description: overrides.description ?? '',
    ...overrides,
  };
}
