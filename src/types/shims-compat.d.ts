// Temporary compatibility shims to reduce TypeScript noise during incremental migration.
// These should be replaced with real typed definitions or proper module augmentations.

declare module '@/types' {
  // Core domain types (lightweight any aliases to satisfy imports).
  export type Story = any;
  export type SearchResult = any;
  export type PathwayItem = any;
  export type Tag = any;
  export type PlotBlock = any;
  export type PlotBlockCondition = any;
  export type TagClass = any;

  // Validation types
  export type ValidationError = any;
  export type ValidationContext = any;
  export type ValidationResult = any;
  export type ValidationWarning = any;
  export type ValidationSuggestion = any;

  // Rule engine types
  export type RuleCondition = any;
  export type RuleAction = any;

  // Smaller helpers often imported from '@/types'
  export type SearchResultItem = any;
  export type SubmissionStatus = any;
}

// Global compatibility for Cloudflare D1/SQLite result shapes used in the codebase.
// Global compatibility for Cloudflare D1/SQLite result shapes is provided in
// src/types/ambient.d.ts. That file is the single authoritative source for
// D1/RunResult/ResultSet shapes during the migration; avoid duplicating the
// declarations here to prevent conflicting typings.

// Minimal module declarations for optional external libs referenced in the codebase.
declare module 'ioredis' {
  export default class Redis {
    constructor(...args: any[]);
    on(event: string, cb: (...args: any[]) => void): void;
    get(key: string): Promise<string | null>;
    set(key: string, value: any): Promise<'OK' | null>;
    del(key: string): Promise<number>;
    // allow index signature for other usages
    [key: string]: any;
  }
}

declare module 'lru-cache' {
  export class LRUCache<K, V> {
    constructor(opts?: any);
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    has(key: K): boolean;
    clear(): void;
  }
}

export {};
