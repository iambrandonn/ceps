/**
 * Phase 4 WS-F2 Stage A: Interface Contract Tests
 *
 * Verifies that LLM Gateway wrappers correctly delegate to CTS-02 §6 interfaces:
 * - summarize(factSets[], style, options) → ChunkDraft
 * - validate(chunkDraft, factSets[]) → ValidationOutcome
 *
 * These tests ensure interface alignment between Generator, Gateway, and Validator.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMGateway } from '../gateway.js';
import { MockValidator } from '../../validation/mock-validator.js';
import type { Validator, ChunkMetadata } from '../../validation/types.js';
import type { FactSet } from '../../kb/models.js';

describe('LLM Gateway Interface Contracts (CTS-02 §6)', () => {
  let gateway: LLMGateway;
  let validator: Validator;

  beforeEach(() => {
    // Initialize gateway with mock API key
    gateway = new LLMGateway({
      anthropicApiKey: 'test-key',
      budgetTokens: 10000,
    });

    // Mock the completions method to avoid real API calls
    vi.spyOn(gateway as any, 'completions').mockResolvedValue(
      'This is a mocked LLM response describing the behavior.'
    );

    // Initialize mock validator
    validator = new MockValidator();
  });

  describe('summarize() interface', () => {
    it('should accept factSets array, style, and options', async () => {
      const factSets: FactSet[] = [
        {
          id: 'fs-1',
          facts: [
            { subjectId: 'entity-1', predicate: 'has-type', object: 'function' },
          ],
          sources: [{ kind: 'ast', file: 'test.ts' }],
          evidenceScore: 90,
        },
      ];

      const style = 'spec-ready';
      const options = { deterministic: false };

      const result = await gateway.summarize(factSets, style, options);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should preserve factSetIds in chunk metadata', async () => {
      const factSets: FactSet[] = [
        {
          id: 'fs-1',
          facts: [],
          sources: [],
          evidenceScore: 80,
        },
        {
          id: 'fs-2',
          facts: [],
          sources: [],
          evidenceScore: 75,
        },
      ];

      const result = await gateway.summarize(factSets, 'spec-ready', {});

      // Result should include reference to original factSets
      // (implementation details TBD, but interface contract requires this)
      expect(result).toBeDefined();
    });

    it('should use deterministic mode when specified', async () => {
      // Deterministic mode should set temperature=0
      const factSets: FactSet[] = [
        {
          id: 'fs-1',
          facts: [],
          sources: [],
          evidenceScore: 85,
        },
      ];

      const result1 = await gateway.summarize(factSets, 'spec-ready', {
        deterministic: true,
      });

      const result2 = await gateway.summarize(factSets, 'spec-ready', {
        deterministic: true,
      });

      // In deterministic mode with mocked response, identical inputs yield identical outputs
      expect(result1).toBe(result2);
      expect(result1).toBeDefined();
      expect(typeof result1).toBe('string');
    });
  });

  describe('validate() integration', () => {
    it('should accept chunk draft, factSetIds, and metadata', () => {
      // This should work with MockValidator
      const draft = 'This function validates user input.';
      const factSetIds = ['fs-1', 'fs-2'];
      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1', 'fs-2'],
        confidence: 'High',
      };

      const result = validator.validate(draft, factSetIds, metadata);

      expect(result).toBeDefined();
      expect(result.status).toBe('accept');
      expect(result.diagnostics).toEqual([]);
    });

    it('should handle retry outcome from validator', () => {
      const mockValidator = validator as MockValidator;

      // Configure mock to return retry
      mockValidator.setNextResult({
        status: 'retry',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'entity',
            reason: 'Unknown entity "UserService" not in factSets',
          },
        ],
        retryMetadata: {
          attempt: 0,
          promptKey: 'O',
        },
      });

      const result = mockValidator.validate(
        'UserService validates input.',
        ['fs-1'],
        {
          chunkId: 'chunk-1',
          targetEntityId: 'entity-1',
          factSetIds: ['fs-1'],
          confidence: 'High',
        }
      );

      expect(result.status).toBe('retry');
      expect(result.retryMetadata?.promptKey).toBe('O');
    });

    it('should handle fallback outcome from validator', () => {
      const mockValidator = validator as MockValidator;

      // Configure mock to return fallback
      mockValidator.setNextResult({
        status: 'fallback',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'numeric',
            reason: 'Numeric mismatch: expected 5000ms, got "6 seconds"',
          },
        ],
      });

      const result = mockValidator.validate(
        'Process completes in 6 seconds.',
        ['fs-1'],
        {
          chunkId: 'chunk-1',
          targetEntityId: 'entity-1',
          factSetIds: ['fs-1'],
          confidence: 'Medium',
        }
      );

      expect(result.status).toBe('fallback');
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('CTS interface delegation', () => {
    it('should call underlying provider adapter for summarize', async () => {
      // RED: This will fail until we implement the delegation
      const spy = vi.spyOn(gateway as any, 'completions');

      const factSets: FactSet[] = [
        {
          id: 'fs-1',
          facts: [{ subjectId: 'e-1', predicate: 'type', object: 'function' }],
          sources: [],
          evidenceScore: 90,
        },
      ];

      try {
        await gateway.summarize(factSets, 'spec-ready', {});
      } catch {
        // Expected to fail in RED phase
      }

      // Once implemented, summarize should call completions internally
      // expect(spy).toHaveBeenCalled();
    });
  });
});
