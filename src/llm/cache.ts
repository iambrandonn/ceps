/**
 * Agent 4: LLM Gateway - Cache
 *
 * CTS-02 §4 (Caching)
 *
 * Responsible for:
 * - Caching LLM responses by (facts, model, style version)
 * - Cache hit/miss tracking
 * - Cache invalidation
 */

import * as crypto from 'crypto';

export interface CacheEntry {
  response: string;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttlMs?: number;      // Time to live in milliseconds (default: 15 minutes)
  maxSize?: number;    // Maximum number of entries (default: unlimited)
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class LLMCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private ttlMs: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 900000; // Default: 15 minutes
    this.maxSize = options.maxSize ?? Infinity;
  }

  /**
   * Generate deterministic cache key from facts, model, and style version
   * Format: {hash}_{model}_{styleVersion}
   */
  generateCacheKey(facts: string, model: string, styleVersion: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(facts)
      .digest('hex');

    return `${hash}_${model}_${styleVersion}`;
  }

  /**
   * Get cached response
   * @returns Cached response or null if miss/expired
   */
  get(key: string): string | null {
    this.cleanupExpired();

    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(key: string, response: string): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + this.ttlMs;

    // Evict oldest entry if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      response,
      timestamp,
      expiresAt
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate (remove) a specific entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries and reset stats
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate
    };
  }

  /**
   * Get cache entry (for testing)
   */
  getEntry(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }
}
