import { describe, it, expect, beforeEach } from 'vitest';
import { LLMCache, CacheEntry } from '../../../src/llm/cache';
import * as crypto from 'crypto';

describe('LLMCache', () => {
  let cache: LLMCache;

  beforeEach(() => {
    cache = new LLMCache();
  });

  describe('generateCacheKey', () => {
    it('should generate deterministic cache key from inputs', () => {
      const facts = 'export function foo() { return 42; }';
      const model = 'claude-sonnet-4';
      const styleVersion = 'ceps-style-1.0';

      const key1 = cache.generateCacheKey(facts, model, styleVersion);
      const key2 = cache.generateCacheKey(facts, model, styleVersion);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different facts', () => {
      const facts1 = 'export function foo() { return 42; }';
      const facts2 = 'export function bar() { return 24; }';
      const model = 'claude-sonnet-4';
      const styleVersion = 'ceps-style-1.0';

      const key1 = cache.generateCacheKey(facts1, model, styleVersion);
      const key2 = cache.generateCacheKey(facts2, model, styleVersion);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different models', () => {
      const facts = 'export function foo() { return 42; }';
      const model1 = 'claude-sonnet-4';
      const model2 = 'gpt-4';
      const styleVersion = 'ceps-style-1.0';

      const key1 = cache.generateCacheKey(facts, model1, styleVersion);
      const key2 = cache.generateCacheKey(facts, model2, styleVersion);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different style versions', () => {
      const facts = 'export function foo() { return 42; }';
      const model = 'claude-sonnet-4';
      const style1 = 'ceps-style-1.0';
      const style2 = 'ceps-style-2.0';

      const key1 = cache.generateCacheKey(facts, model, style1);
      const key2 = cache.generateCacheKey(facts, model, style2);

      expect(key1).not.toBe(key2);
    });

    it('should use SHA-256 hash in cache key', () => {
      const facts = 'export function foo() { return 42; }';
      const model = 'claude-sonnet-4';
      const styleVersion = 'ceps-style-1.0';

      const key = cache.generateCacheKey(facts, model, styleVersion);

      // Key should contain a SHA-256 hash (64 hex chars)
      expect(key).toMatch(/[a-f0-9]{64}/);
    });

    it('should include model and style version in key format', () => {
      const facts = 'export function foo() { return 42; }';
      const model = 'claude-sonnet-4';
      const styleVersion = 'ceps-style-1.0';

      const key = cache.generateCacheKey(facts, model, styleVersion);

      // Format should be: hash_model_styleVersion
      expect(key).toContain(model);
      expect(key).toContain(styleVersion);
    });
  });

  describe('get', () => {
    it('should return null for cache miss', () => {
      const result = cache.get('nonexistent-key');
      expect(result).toBeNull();
    });

    it('should return cached value for cache hit', () => {
      const key = 'test-key-123';
      const response = 'This function validates user input';

      cache.set(key, response);
      const result = cache.get(key);

      expect(result).toBe(response);
    });

    it('should return null for expired entries', async () => {
      // Create cache with short TTL
      const shortCache = new LLMCache({ ttlMs: 10 }); // 10ms TTL
      const key = 'test-key-expire';
      const response = 'This will expire';

      shortCache.set(key, response);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));

      const result = shortCache.get(key);
      expect(result).toBeNull();
    });

    it('should track cache hits', () => {
      const key = 'test-key-hits';
      const response = 'Cached response';

      cache.set(key, response);
      cache.get(key);
      cache.get(key);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses', () => {
      cache.get('nonexistent-1');
      cache.get('nonexistent-2');

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
    });
  });

  describe('set', () => {
    it('should store response in cache', () => {
      const key = 'test-key-set';
      const response = 'This function handles errors';

      cache.set(key, response);
      const result = cache.get(key);

      expect(result).toBe(response);
    });

    it('should overwrite existing entries', () => {
      const key = 'test-key-overwrite';

      cache.set(key, 'First response');
      cache.set(key, 'Second response');

      const result = cache.get(key);
      expect(result).toBe('Second response');
    });

    it('should store entry with timestamp', () => {
      const key = 'test-key-timestamp';
      const response = 'Response with timestamp';

      const beforeTime = Date.now();
      cache.set(key, response);
      const afterTime = Date.now();

      const entry = cache.getEntry(key);
      expect(entry).toBeDefined();
      expect(entry!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(entry!.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('has', () => {
    it('should return true for existing entries', () => {
      const key = 'test-key-exists';
      cache.set(key, 'Exists');

      expect(cache.has(key)).toBe(true);
    });

    it('should return false for nonexistent entries', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', async () => {
      const shortCache = new LLMCache({ ttlMs: 10 });
      const key = 'test-key-expire-has';

      shortCache.set(key, 'Will expire');
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(shortCache.has(key)).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should remove single entry', () => {
      const key = 'test-key-invalidate';
      cache.set(key, 'To be invalidated');

      cache.invalidate(key);

      expect(cache.has(key)).toBe(false);
      expect(cache.get(key)).toBeNull();
    });

    it('should not affect other entries', () => {
      cache.set('key1', 'Value 1');
      cache.set('key2', 'Value 2');

      cache.invalidate('key1');

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.get('key2')).toBe('Value 2');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'Value 1');
      cache.set('key2', 'Value 2');
      cache.set('key3', 'Value 3');

      cache.clear();

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(false);
    });

    it('should reset stats', () => {
      cache.set('key1', 'Value 1');
      cache.get('key1'); // Hit
      cache.get('nonexistent'); // Miss

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      const key = 'test-key-rate';
      cache.set(key, 'Value');

      cache.get(key); // Hit
      cache.get(key); // Hit
      cache.get('nonexistent'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.6667, 4); // 2/3 = 66.67%
    });

    it('should track cache size', () => {
      cache.set('key1', 'Value 1');
      cache.set('key2', 'Value 2');
      cache.set('key3', 'Value 3');

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
    });
  });

  describe('TTL and expiration', () => {
    it('should use default TTL (15 minutes)', () => {
      const defaultCache = new LLMCache();
      const key = 'test-key-default-ttl';

      defaultCache.set(key, 'Value');
      const entry = defaultCache.getEntry(key);

      expect(entry).toBeDefined();
      // Default TTL should be 15 minutes (900000 ms)
      const expectedExpiry = entry!.timestamp + 900000;
      const actualExpiry = entry!.expiresAt;

      expect(actualExpiry).toBe(expectedExpiry);
    });

    it('should use custom TTL', () => {
      const customCache = new LLMCache({ ttlMs: 60000 }); // 1 minute
      const key = 'test-key-custom-ttl';

      customCache.set(key, 'Value');
      const entry = customCache.getEntry(key);

      expect(entry).toBeDefined();
      const expectedExpiry = entry!.timestamp + 60000;
      const actualExpiry = entry!.expiresAt;

      expect(actualExpiry).toBe(expectedExpiry);
    });

    it('should clean up expired entries on access', async () => {
      const shortCache = new LLMCache({ ttlMs: 10 });

      shortCache.set('key1', 'Value 1');
      shortCache.set('key2', 'Value 2');

      await new Promise(resolve => setTimeout(resolve, 20));

      // Accessing should trigger cleanup
      shortCache.get('key1');

      const stats = shortCache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('maxSize limit', () => {
    it('should respect maximum cache size', () => {
      const limitedCache = new LLMCache({ maxSize: 3 });

      limitedCache.set('key1', 'Value 1');
      limitedCache.set('key2', 'Value 2');
      limitedCache.set('key3', 'Value 3');
      limitedCache.set('key4', 'Value 4'); // Should evict oldest

      const stats = limitedCache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should evict least recently used entries when full', () => {
      const limitedCache = new LLMCache({ maxSize: 2 });

      limitedCache.set('key1', 'Value 1');
      limitedCache.set('key2', 'Value 2');
      limitedCache.set('key3', 'Value 3'); // Should evict key1

      expect(limitedCache.has('key1')).toBe(false);
      expect(limitedCache.has('key2')).toBe(true);
      expect(limitedCache.has('key3')).toBe(true);
    });
  });
});
