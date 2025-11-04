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
export interface CacheEntry {
    response: string;
    timestamp: number;
    expiresAt: number;
}
export interface CacheOptions {
    ttlMs?: number;
    maxSize?: number;
}
export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}
export declare class LLMCache {
    private cache;
    private hits;
    private misses;
    private ttlMs;
    private maxSize;
    constructor(options?: CacheOptions);
    /**
     * Generate deterministic cache key from facts, model, and style version
     * Format: {hash}_{model}_{styleVersion}
     */
    generateCacheKey(facts: string, model: string, styleVersion: string): string;
    /**
     * Get cached response
     * @returns Cached response or null if miss/expired
     */
    get(key: string): string | null;
    /**
     * Store response in cache
     */
    set(key: string, response: string): void;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Invalidate (remove) a specific entry
     */
    invalidate(key: string): void;
    /**
     * Clear all entries and reset stats
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Get cache entry (for testing)
     */
    getEntry(key: string): CacheEntry | undefined;
    /**
     * Clean up expired entries
     */
    private cleanupExpired;
}
//# sourceMappingURL=cache.d.ts.map