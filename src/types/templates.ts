/**
 * Fandom Template Type Definitions
 *
 * Type definitions for fandom templates system including genre-based templates,
 * template configurations, and template management operations.
 *
 * @package the-pensive-index
 */

import type { TemplateConfiguration } from '@/lib/database/schemas';
import type { TaxonomyStructure, FandomInitialContent } from '@/types/fandom';

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export type GenreType =
  | 'urban-fantasy'
  | 'sci-fi'
  | 'historical'
  | 'contemporary'
  | 'medieval-fantasy'
  | 'superhero'
  | 'dystopian'
  | 'romance'
  | 'mystery'
  | 'horror'
  | 'adventure'
  | 'slice-of-life'
  | 'crossover'
  | 'alternate-universe'
  | 'time-travel'
  | 'custom';

export interface FandomTemplateDefinition {
  id: number;
  name: string;
  slug: string;
  genre: GenreType;
  description: string;
  version: string;
  usage_count: number;
  configuration: TemplateConfiguration;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// GENRE-SPECIFIC TEMPLATE CONFIGURATIONS
// ============================================================================

export interface UrbanFantasyTemplate {
  taxonomy_structure: {
    categories: [
      'magical-systems',
      'supernatural-creatures',
      'modern-settings',
      'character-types',
      'plot-devices',
      'world-building'
    ];
    subcategories: {
      'magical-systems': ['elemental', 'ritual', 'innate', 'artifact-based'];
      'supernatural-creatures': [
        'vampires',
        'werewolves',
        'fae',
        'demons',
        'angels',
        'spirits'
      ];
      'modern-settings': [
        'hidden-world',
        'open-supernatural',
        'government-aware',
        'secret-societies'
      ];
      'character-types': [
        'magical',
        'human',
        'hybrid',
        'hunter',
        'scholar',
        'civilian'
      ];
      'plot-devices': [
        'prophecy',
        'magical-artifact',
        'ancient-evil',
        'awakening',
        'war'
      ];
      'world-building': [
        'masquerade',
        'coexistence',
        'conflict',
        'integration'
      ];
    };
  };
  default_content: {
    tags: UrbanFantasyTag[];
    plot_blocks: UrbanFantasyPlotBlock[];
    characters: UrbanFantasyCharacter[];
    validation_rules: UrbanFantasyValidationRule[];
  };
}

export interface SciFiTemplate {
  taxonomy_structure: {
    categories: [
      'technology-level',
      'space-settings',
      'alien-species',
      'character-roles',
      'sci-fi-concepts',
      'future-society'
    ];
    subcategories: {
      'technology-level': [
        'near-future',
        'advanced',
        'post-apocalyptic',
        'cyberpunk',
        'steampunk'
      ];
      'space-settings': [
        'earth-based',
        'space-station',
        'generation-ship',
        'alien-world',
        'multiverse'
      ];
      'alien-species': [
        'humanoid',
        'non-humanoid',
        'energy-beings',
        'hive-mind',
        'artificial'
      ];
      'character-roles': [
        'scientist',
        'pilot',
        'engineer',
        'diplomat',
        'soldier',
        'civilian'
      ];
      'sci-fi-concepts': [
        'time-travel',
        'parallel-dimensions',
        'ai-consciousness',
        'genetic-engineering'
      ];
      'future-society': [
        'utopian',
        'dystopian',
        'corporate-controlled',
        'post-scarcity',
        'federation'
      ];
    };
  };
  default_content: {
    tags: SciFiTag[];
    plot_blocks: SciFiPlotBlock[];
    characters: SciFiCharacter[];
    validation_rules: SciFiValidationRule[];
  };
}

export interface HistoricalTemplate {
  taxonomy_structure: {
    categories: [
      'time-periods',
      'geographical-regions',
      'social-classes',
      'character-archetypes',
      'historical-events',
      'cultural-elements'
    ];
    subcategories: {
      'time-periods': [
        'ancient',
        'medieval',
        'renaissance',
        'industrial',
        'modern-historical'
      ];
      'geographical-regions': [
        'europe',
        'asia',
        'americas',
        'africa',
        'oceania',
        'global'
      ];
      'social-classes': [
        'nobility',
        'clergy',
        'merchant',
        'artisan',
        'peasant',
        'military'
      ];
      'character-archetypes': [
        'ruler',
        'scholar',
        'warrior',
        'artist',
        'explorer',
        'revolutionary'
      ];
      'historical-events': [
        'war',
        'political-change',
        'cultural-shift',
        'discovery',
        'disaster'
      ];
      'cultural-elements': [
        'religion',
        'art',
        'technology',
        'customs',
        'language',
        'philosophy'
      ];
    };
  };
  default_content: {
    tags: HistoricalTag[];
    plot_blocks: HistoricalPlotBlock[];
    characters: HistoricalCharacter[];
    validation_rules: HistoricalValidationRule[];
  };
}

// ============================================================================
// TEMPLATE CONTENT TYPE DEFINITIONS
// ============================================================================

export interface UrbanFantasyTag {
  name: string;
  category:
    | 'magical-systems'
    | 'supernatural-creatures'
    | 'modern-settings'
    | 'character-types'
    | 'plot-devices'
    | 'world-building';
  description?: string;
  common_pairings?: string[];
  restriction_rules?: string[];
}

export interface UrbanFantasyPlotBlock {
  name: string;
  category: string;
  description: string;
  typical_length: 'short' | 'medium' | 'long' | 'series-arc';
  prerequisites?: string[];
  common_outcomes?: string[];
  character_requirements?: string[];
}

export interface UrbanFantasyCharacter {
  name: string;
  character_type: 'magical' | 'human' | 'hybrid' | 'supernatural';
  typical_roles: string[];
  power_level?: 'normal' | 'enhanced' | 'powerful' | 'legendary';
  common_backgrounds?: string[];
}

export interface UrbanFantasyValidationRule {
  name: string;
  rule_type:
    | 'magical-consistency'
    | 'character-balance'
    | 'world-logic'
    | 'genre-adherence';
  description: string;
  validation_logic: Record<string, any>;
}

export interface SciFiTag {
  name: string;
  category:
    | 'technology-level'
    | 'space-settings'
    | 'alien-species'
    | 'character-roles'
    | 'sci-fi-concepts'
    | 'future-society';
  description?: string;
  tech_level_required?: number;
  scientific_plausibility?: 'hard' | 'soft' | 'space-opera' | 'fantasy';
}

export interface SciFiPlotBlock {
  name: string;
  category: string;
  description: string;
  complexity_level: 'simple' | 'moderate' | 'complex' | 'epic';
  required_tech_level?: number;
  scientific_concepts?: string[];
}

export interface SciFiCharacter {
  name: string;
  character_type: 'human' | 'alien' | 'ai' | 'cyborg' | 'enhanced-human';
  specializations: string[];
  tech_familiarity: 'low' | 'moderate' | 'high' | 'expert';
}

export interface SciFiValidationRule {
  name: string;
  rule_type:
    | 'tech-consistency'
    | 'scientific-plausibility'
    | 'character-capability'
    | 'world-building';
  description: string;
  hardness_level: 'hard-sci-fi' | 'soft-sci-fi' | 'space-opera';
  validation_logic: Record<string, any>;
}

export interface HistoricalTag {
  name: string;
  category:
    | 'time-periods'
    | 'geographical-regions'
    | 'social-classes'
    | 'character-archetypes'
    | 'historical-events'
    | 'cultural-elements';
  description?: string;
  historical_accuracy_level:
    | 'strict'
    | 'moderate'
    | 'loose'
    | 'alternate-history';
  time_period_constraints?: string[];
}

export interface HistoricalPlotBlock {
  name: string;
  category: string;
  description: string;
  historical_basis: 'documented' | 'plausible' | 'speculative' | 'fictional';
  time_period: string;
  geographical_scope: 'local' | 'regional' | 'national' | 'international';
}

export interface HistoricalCharacter {
  name: string;
  character_type:
    | 'historical-figure'
    | 'period-typical'
    | 'anachronistic'
    | 'modern-perspective';
  social_class: string;
  historical_role: string[];
  accuracy_requirements: 'strict' | 'moderate' | 'creative-license';
}

export interface HistoricalValidationRule {
  name: string;
  rule_type:
    | 'historical-accuracy'
    | 'period-consistency'
    | 'cultural-appropriateness'
    | 'anachronism-check';
  description: string;
  strictness_level: 'academic' | 'reasonable' | 'creative' | 'loose';
  validation_logic: Record<string, any>;
}

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

export interface CreateTemplateRequest {
  name: string;
  slug: string;
  genre: GenreType;
  description: string;
  configuration: TemplateConfiguration;
  is_active?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  configuration?: Partial<TemplateConfiguration>;
  version?: string;
  is_active?: boolean;
}

export interface TemplateUsageStats {
  template_id: number;
  template_name: string;
  usage_count: number;
  recent_uses: Array<{
    fandom_id: number;
    fandom_name: string;
    used_at: string;
    user_id: string;
  }>;
  success_rate: number; // Percentage of successful fandom creations
  user_feedback: Array<{
    rating: number;
    comment?: string;
    user_id: string;
    created_at: string;
  }>;
}

export interface TemplateValidationResult {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// TEMPLATE LIBRARY ORGANIZATION
// ============================================================================

export interface TemplateLibrary {
  featured_templates: FandomTemplateDefinition[];
  by_genre: Record<GenreType, FandomTemplateDefinition[]>;
  most_popular: FandomTemplateDefinition[];
  recently_added: FandomTemplateDefinition[];
  community_favorites: FandomTemplateDefinition[];
}

export interface TemplateSearchFilters {
  genre?: GenreType[];
  usage_count_min?: number;
  created_after?: string;
  created_by?: string;
  has_content_type?: (
    | 'tags'
    | 'plot_blocks'
    | 'characters'
    | 'validation_rules'
  )[];
  complexity_level?: ('beginner' | 'intermediate' | 'advanced')[];
}

export interface TemplateSearchResponse {
  templates: FandomTemplateDefinition[];
  facets: {
    genres: Record<GenreType, number>;
    complexity_levels: Record<string, number>;
    content_types: Record<string, number>;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
}

// ============================================================================
// TEMPLATE PREVIEW & TESTING
// ============================================================================

export interface TemplatePreview {
  template: FandomTemplateDefinition;
  preview_fandom: {
    name: string;
    structure: TaxonomyStructure;
    sample_content: FandomInitialContent;
    estimated_setup_time: string;
    complexity_indicators: {
      content_volume: 'low' | 'medium' | 'high';
      rule_complexity: 'simple' | 'moderate' | 'complex';
      customization_required: 'minimal' | 'moderate' | 'extensive';
    };
  };
}

export interface TemplateTestResult {
  template_id: number;
  test_type:
    | 'validation'
    | 'content_creation'
    | 'user_workflow'
    | 'performance';
  status: 'passed' | 'failed' | 'warning';
  results: {
    tests_run: number;
    tests_passed: number;
    tests_failed: number;
    performance_metrics?: Record<string, number>;
  };
  issues: Array<{
    severity: 'critical' | 'major' | 'minor' | 'cosmetic';
    description: string;
    location: string;
    suggested_fix?: string;
  }>;
  tested_at: string;
  tested_by: string;
}

// ============================================================================
// CUSTOM TEMPLATE CREATION
// ============================================================================

export interface CustomTemplateBuilder {
  base_template?: number; // Start from existing template
  genre: GenreType;
  taxonomy_builder: TaxonomyBuilder;
  content_builder: ContentBuilder;
  validation_builder: ValidationBuilder;
  preview_mode: boolean;
}

export interface TaxonomyBuilder {
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    parent_id?: string;
    content_types: string[];
    is_required: boolean;
    max_items?: number;
  }>;
  relationships: Array<{
    parent_category: string;
    child_category: string;
    relationship_type: 'requires' | 'excludes' | 'suggests';
  }>;
}

export interface ContentBuilder {
  content_templates: Record<string, any>;
  import_from_existing?: {
    fandom_id: number;
    content_types: string[];
    include_categories?: string[];
  };
  generation_rules: Array<{
    content_type: string;
    auto_generate: boolean;
    generation_parameters: Record<string, any>;
  }>;
}

export interface ValidationBuilder {
  rule_templates: Array<{
    rule_type: string;
    parameters: Record<string, any>;
    severity: 'error' | 'warning' | 'info';
    auto_fix_available: boolean;
  }>;
  custom_validators: Array<{
    name: string;
    description: string;
    validation_function: string; // Serialized validation logic
    test_cases: Array<{
      input: any;
      expected_result: boolean;
      description: string;
    }>;
  }>;
}
