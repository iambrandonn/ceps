/**
 * Tests for Semantic Similarity Helper
 * Phase 0.6: Regression testing infrastructure
 */

import { describe, it, expect } from 'vitest';
import { calculateSimilarity, assertSemanticSimilarity } from './semantic-similarity';

describe('Semantic Similarity', () => {
  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical text', () => {
      const text = 'Function buildCache creates a cache instance.';
      const similarity = calculateSimilarity(text, text);

      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for paraphrased text', () => {
      const baseline = 'Function buildCache creates a cache instance based on keyPrefix.';
      const candidate = 'Function buildCache constructs a cache instance using the provided keyPrefix.';

      const similarity = calculateSimilarity(baseline, candidate);

      // Should be >0.7 (paraphrase preserves key concepts)
      expect(similarity).toBeGreaterThan(0.70);
    });

    it('should return low similarity for different content', () => {
      const baseline = 'Function buildCache creates a cache instance.';
      const candidate = 'Function formatDate converts timestamps to strings.';

      const similarity = calculateSimilarity(baseline, candidate);

      // Should be <0.5 (completely different semantics)
      expect(similarity).toBeLessThan(0.5);
    });

    it('should ignore markdown formatting', () => {
      const baseline = 'Function **buildCache** creates a `cache` instance.';
      const candidate = 'Function buildCache creates a cache instance.';

      const similarity = calculateSimilarity(baseline, candidate);

      expect(similarity).toBeGreaterThan(0.95);
    });

    it('should ignore case differences', () => {
      const baseline = 'Function BuildCache creates a Cache instance.';
      const candidate = 'Function buildcache creates a cache instance.';

      const similarity = calculateSimilarity(baseline, candidate);

      expect(similarity).toBeGreaterThan(0.95);
    });

    it('should handle empty strings', () => {
      const similarity = calculateSimilarity('', '');

      expect(similarity).toBe(1.0);
    });

    it('should handle one empty string', () => {
      const baseline = 'Some text content.';
      const candidate = '';

      const similarity = calculateSimilarity(baseline, candidate);

      // Won't be exactly 0 due to structural similarity component
      expect(similarity).toBeLessThan(0.5);
    });

    it('should give high score to improved wording', () => {
      const baseline = 'Function buildCache. Builds cache based on keyPrefix.';
      const candidate = 'Function buildCache initializes a caching layer with the specified keyPrefix parameter.';

      const similarity = calculateSimilarity(baseline, candidate);

      // LLM output is more fluent but semantically equivalent
      expect(similarity).toBeGreaterThan(0.60);
    });

    it('should detect missing key concepts', () => {
      const baseline = 'Express middleware function that validates authentication tokens.';
      const candidate = 'Express middleware function.';

      const similarity = calculateSimilarity(baseline, candidate);

      // Missing "validates authentication tokens" should reduce score
      expect(similarity).toBeLessThan(0.7);
    });

    it('should handle real spec-like text', () => {
      const baseline = `
## buildCache

**Signature:** \`(keyPrefix, options): { get, set, del }\`

**Visibility:** Public (exported)

**Behavior:**

- Builds cache based on keyPrefix.

*Note: Description inferred from function name. Specific implementation details may vary.*
      `;

      const candidate = `
## buildCache

**Signature:** \`(keyPrefix, options): { get, set, del }\`

**Visibility:** Public (exported)

**Behavior:**

- Initializes a caching interface with methods for getting, setting, and deleting cached values.
- Uses the provided keyPrefix to namespace cache entries.

*Note: Enhanced description with implementation details.*
      `;

      const similarity = calculateSimilarity(baseline, candidate);

      // Candidate adds detail but preserves core concepts
      expect(similarity).toBeGreaterThan(0.60);
    });
  });

  describe('assertSemanticSimilarity', () => {
    it('should pass for similar text', () => {
      const baseline = 'Function creates cache instance.';
      const candidate = 'Function constructs cache instance.';

      expect(() => {
        assertSemanticSimilarity(baseline, candidate, 0.60);
      }).not.toThrow();
    });

    it('should throw for dissimilar text', () => {
      const baseline = 'Function creates cache instance.';
      const candidate = 'Function formats date strings.';

      expect(() => {
        assertSemanticSimilarity(baseline, candidate, 0.80);
      }).toThrow(/below threshold/);
    });

    it('should include context in error message', () => {
      const baseline = 'Function creates cache.';
      const candidate = 'Function formats date.';

      expect(() => {
        assertSemanticSimilarity(baseline, candidate, 0.80, 'buildCache');
      }).toThrow(/buildCache/);
    });

    it('should show missing and added phrases in error', () => {
      const baseline = 'Function creates cache with keyPrefix.';
      const candidate = 'Function formats date with timezone.';

      expect(() => {
        assertSemanticSimilarity(baseline, candidate, 0.80);
      }).toThrow(/Missing phrases.*Added phrases/s);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Express middleware descriptions', () => {
      const baseline = `
Middleware function with signature (req, res, next). Validates request data.
      `;

      const candidate = `
Express middleware that accepts request, response, and next parameters.
Performs validation on incoming request payload.
      `;

      const similarity = calculateSimilarity(baseline, candidate);

      expect(similarity).toBeGreaterThan(0.50);
    });

    it('should handle React component descriptions', () => {
      const baseline = `
Function Button returns JSX. Renders a clickable button element.
      `;

      const candidate = `
React functional component Button that renders an interactive button.
Returns JSX element with click handling.
      `;

      const similarity = calculateSimilarity(baseline, candidate);

      expect(similarity).toBeGreaterThan(0.50);
    });

    it('should handle Mongoose schema descriptions', () => {
      const baseline = `
Constant UserSchema defines schema fields: name, email, createdAt.
      `;

      const candidate = `
Mongoose schema definition UserSchema with fields for user name, email address, and creation timestamp.
      `;

      const similarity = calculateSimilarity(baseline, candidate);

      expect(similarity).toBeGreaterThan(0.35);
    });

    it('should tolerate confidence level changes', () => {
      const baseline = `
## buildCache

**Confidence:** Medium

Builds cache based on keyPrefix.
      `;

      const candidate = `
## buildCache

**Confidence:** High

Initializes a caching layer with the specified keyPrefix parameter.
Provides get, set, and del methods for cache operations.
      `;

      const similarity = calculateSimilarity(baseline, candidate);

      // Confidence change + more detail may have lower similarity due to brevity
      expect(similarity).toBeGreaterThan(0.25);
    });
  });
});
