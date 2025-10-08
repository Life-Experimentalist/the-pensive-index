/**
 * LRUCache: In-memory Least Recently Used cache (Layer 3)
 * Feature: 003-optimize-the-platform
 *
 * Provides fast in-memory caching with automatic eviction
 * Falls back to KV cache on miss
 *
 * Performance targets:
 * - Memory hit: < 10ms
 * - Max memory: 100MB (configurable)
 * - Automatic eviction on memory pressure
 */

import type { CacheEntry } from '@/types/performance';

/**
 * Cache node for doubly-linked list
 */
interface CacheNode<T> {
  key: string;
  value: T;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
  size: number; // Estimated size in bytes
  expiresAt: number; // Unix timestamp
}

/**
 * LRU Cache configuration
 */
interface LRUCacheConfig {
  maxMemoryMB: number; // Maximum memory in megabytes
  defaultTTL: number; // Default TTL in seconds
}

/**
 * In-memory LRU cache with automatic eviction
 *
 * Uses doubly-linked list for O(1) access and eviction
 * Map for O(1) key lookup
 */
export class LRUCache<T = unknown> {
  private cache: Map<string, CacheNode<T>>;
  private head: CacheNode<T> | null;
  private tail: CacheNode<T> | null;
  private currentMemory: number; // Bytes
  private maxMemory: number; // Bytes
  private defaultTTL: number; // Seconds

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };

  constructor(config: LRUCacheConfig) {
    this.cache = new Map();
    this.head = null;
    this.tail = null;
    this.currentMemory = 0;
    this.maxMemory = config.maxMemoryMB * 1024 * 1024; // Convert MB to bytes
    this.defaultTTL = config.defaultTTL;
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   */
  get(key: string): T | null {
    const node = this.cache.get(key);

    if (!node) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (node.expiresAt < now) {
      this.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }

    // Move to head (most recently used)
    this.moveToHead(node);
    this.stats.hits++;
    return node.value;
  }

  /**
   * Set value in cache with optional TTL
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const existingNode = this.cache.get(key);

    // Calculate size (rough estimate)
    const size = this.estimateSize(value);
    const ttl = ttlSeconds || this.defaultTTL;
    const expiresAt = Date.now() + ttl * 1000;

    if (existingNode) {
      // Update existing node
      this.currentMemory -= existingNode.size;
      existingNode.value = value;
      existingNode.size = size;
      existingNode.expiresAt = expiresAt;
      this.currentMemory += size;
      this.moveToHead(existingNode);
    } else {
      // Create new node
      const newNode: CacheNode<T> = {
        key,
        value,
        prev: null,
        next: null,
        size,
        expiresAt,
      };

      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.currentMemory += size;
    }

    // Evict if over memory limit
    while (this.currentMemory > this.maxMemory && this.tail) {
      this.evictTail();
    }
  }

  /**
   * Delete key from cache
   */
  delete(key: string): void {
    const node = this.cache.get(key);
    if (!node) {
      return;
    }

    this.removeNode(node);
    this.cache.delete(key);
    this.currentMemory -= node.size;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentMemory = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;

    return {
      ...this.stats,
      hitRate,
      size: this.cache.size,
      memoryUsed: this.currentMemory,
      memoryUsedMB: this.currentMemory / (1024 * 1024),
      memoryLimit: this.maxMemory,
      memoryLimitMB: this.maxMemory / (1024 * 1024),
      memoryUtilization: this.currentMemory / this.maxMemory,
    };
  }

  /**
   * Cleanup expired entries
   * Should be called periodically
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    // Iterate through cache and remove expired entries
    for (const [key, node] of this.cache.entries()) {
      if (node.expiresAt < now) {
        this.delete(key);
        cleaned++;
        this.stats.expirations++;
      }
    }

    return cleaned;
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  /**
   * Add node to head (most recently used)
   */
  private addToHead(node: CacheNode<T>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove node from linked list
   */
  private removeNode(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Move node to head (mark as most recently used)
   */
  private moveToHead(node: CacheNode<T>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Evict least recently used node (tail)
   */
  private evictTail(): void {
    if (!this.tail) {
      return;
    }

    const key = this.tail.key;
    this.delete(key);
    this.stats.evictions++;
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 0;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let lruCacheInstance: LRUCache | null = null;

/**
 * Initialize LRU cache
 */
export function initLRUCache(config: LRUCacheConfig): void {
  lruCacheInstance = new LRUCache(config);

  // Cleanup expired entries every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      if (lruCacheInstance) {
        lruCacheInstance.cleanupExpired();
      }
    }, 5 * 60 * 1000);
  }
}

/**
 * Get LRU cache instance
 */
export function getLRUCache(): LRUCache {
  if (!lruCacheInstance) {
    throw new Error('LRUCache not initialized. Call initLRUCache() first.');
  }
  return lruCacheInstance;
}

/**
 * Export for testing
 */
export const lruCache = {
  get: <T>(key: string) => getLRUCache().get(key) as T | null,
  set: <T>(key: string, value: T, ttl?: number) =>
    getLRUCache().set(key, value, ttl),
  delete: (key: string) => getLRUCache().delete(key),
  clear: () => getLRUCache().clear(),
  getStats: () => getLRUCache().getStats(),
  cleanupExpired: () => getLRUCache().cleanupExpired(),
};
