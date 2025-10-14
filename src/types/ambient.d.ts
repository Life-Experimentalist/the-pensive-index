// Low-risk ambient declarations to reduce noise during migration
// This file intentionally declares broad any-typed modules and globals
// so we can iteratively migrate the codebase without being blocked
// by third-party or environment-specific type errors.

declare global {
  // Compatibility helper exposed globally during migration
  function getResultChanges(result: any): number;
}
// Low-risk ambient declarations to reduce noise during migration
// This file intentionally declares broad any-typed modules and globals
// so we can iteratively migrate the codebase without being blocked
// by third-party or environment-specific type errors.

declare global {
  // Browser extension runtime (content scripts) - allow usage of `chrome` globally
  const chrome: any;

  // Minimal chrome namespace typings to satisfy usages like chrome.tabs.Tab
  namespace chrome {
    namespace tabs {
      interface Tab {
        id?: number | null;
        url?: string | null;
        title?: string | null;
      }
    }
    namespace runtime {
      interface MessageSender {
        tab?: chrome.tabs.Tab;
        frameId?: number;
        id?: string;
        url?: string;
        tlsChannelId?: string;
      }
      function onMessage(
        listener: (
          message: any,
          sender: MessageSender,
          sendResponse: (response?: any) => void
        ) => void
      ): void;
      function sendMessage(
        message: any,
        callback?: (response: any) => void
      ): void;
    }
  }

  // Drizzle/D1/SQLite run results often expose `.changes` at runtime; augment here
  interface D1Result<T = unknown> {
    // Cloudflare D1 / sqlite-run results often expose a numeric changes count
    changes?: number;
    // Optional result rows or single data payload
    results?: T[];
    data?: T;
    // Allow numeric indexing (e.g. result[0]) which some compatibility helpers use
    [index: number]: any;
    // Allow arbitrary additional properties during migration
    [key: string]: any;
  }

  interface RunResult {
    // sqlite-run / better-sqlite3 compatible run result
    changes?: number;
    // last insert id when available
    lastID?: number;
    // Optional array of rows for run/all/get compatibility
    results?: any[];
    // Allow numeric indexing and other arbitrary properties
    [index: number]: any;
    [key: string]: any;
  }

  // A union-friendly alias representing any DB run result shape used across the codebase
  type DBRunResult = D1Result | RunResult | ResultSet;

  // Generic result set indexing helper used in several compatibility helpers
  interface ResultSet extends Array<any> {
    // Some runtime result arrays also include a changes count
    changes?: number;
    [index: number]: any;
  }

  // Cloudflare D1 / development D1-compatible database interfaces
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
    first<T = unknown>(): Promise<T | null>;
    raw?<T = unknown>(): Promise<T[]>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec?(query: string): Promise<any>;
    batch?<T = unknown>(
      statements: D1PreparedStatement[]
    ): Promise<D1Result<T>[]>;
    dump?(): Promise<ArrayBuffer>;
  }

  // Declaration for KVNamespace
  declare const KVNamespace: {
    prototype: any;
    new (): any;
  };
}

// Clerk nextjs - small shim for commonly used exports
declare module '@clerk/nextjs' {
  export const useUser: any;
  export const UserProfile: any;
  export const SignedIn: any;
  export const SignedOut: any;
  export const UserButton: any;
  export const SignIn: any;
  export const SignUp: any;
  const _default: any;
  export default _default;
}

// Runtime modules without type packages in the repo
declare module 'ioredis' {
  const Redis: any;
  export default Redis;
}

declare module 'lru-cache' {
  export class LRUCache<K = any, V = any> {
    constructor(options?: any);
    get(key: K): V | undefined;
    set(key: K, value: V, options?: any): boolean;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size: number;
  }
  const _default: any;
  export default _default;
}

// Path-alias imports used in the project; provide minimal fallbacks
declare module '@/lib/constants/api-endpoints' {
  export const API_ENDPOINTS: any;
  export default API_ENDPOINTS;
}

// Provide loose shapes for some frequently imported internal types so refactors
// can progress without blocking on perfectly accurate domain typings.
declare module '@/types' {
  // Generic placeholders for complex project types. As we migrate,
  // these should be replaced with accurate definitions.
  export type ContentApproval = any;
  export type BulkOperation = any;
  export type ContentVersion = any;
  export type ConflictDetectionContext = any;
  export type ValidationRule = any;
  export type RuleCondition = any;
  export type RuleAction = any;
  export type SubmissionStatus = any;
  export type QueueAssignmentResult = any;

  // Minimal domain types used by many UI components and services.
  export interface Fandom {
    id: string;
    name: string;
    description?: string | null;
    slug?: string;
  }

  export interface FandomExtended extends Fandom {
    metadata?: Record<string, any>;
  }

  export interface Tag {
    id: string;
    name: string;
    category?: string | null;
    slug?: string;
    storyCount?: number;
    requires?: string[];
    enhances?: string[];
  }

  export interface PlotBlock {
    id: string;
    name: string;
    category?: string | null;
    dependencies?: string[];
    requires?: string[];
    soft_requires?: string[];
    children?: string[];
    conflicts_with?: string[];
    storyCount?: number;
    enhances?: string[];
  }

  export type PathwayItem =
    | { type: 'tag'; id: string }
    | { type: 'plot_block'; id: string };

  // Lightweight story-like shape used across services during migration
  export interface Story {
    id: string;
    title?: string;
    summary?: string | null;
    story_title?: string;
    author?: string;
    author_name?: string;
    fandomId?: string;
    fandom_id?: string;
    createdAt?: Date | string | null;
    created_at?: Date | string | null;
    updatedAt?: Date | string | null;
    updated_at?: Date | string | null;
    wordCount?: number | null;
    word_count?: number | null;
    status?: string;
    rating?: string;
    isActive?: boolean;
    is_active?: boolean;
    relevanceScore?: number;
    kudosCount?: number | null;
    kudos_count?: number | null;
    hitCount?: number | null;
    hit_count?: number | null;
    bookmarkCount?: number | null;
    bookmark_count?: number | null;
  }

  export type DomainStory = Story;

  export const __any: any;
}

export {};
