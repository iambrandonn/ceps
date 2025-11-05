/**
 * Phase 4 WS-F1 Stage A1: Validator Contract Tests
 *
 * These tests validate the validator interface types and mock implementation.
 * Written BEFORE implementation per TDD Red-Green-Refactor workflow.
 */

import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';

// Import types (will fail until implemented)
import type {
  ValidationOutcome,
  GroundingDiagnostic,
  ChunkMetadata,
  GroundingResult,
  RetryMetadata,
  Validator,
} from '../types.js';

// Import mock (will fail until implemented)
import { MockValidator } from '../mock-validator.js';

describe('Validator Contract', () => {
  describe('Type Definitions', () => {
    it('should define ValidationOutcome as union type', () => {
      const accept: ValidationOutcome = 'accept';
      const retry: ValidationOutcome = 'retry';
      const fallback: ValidationOutcome = 'fallback';

      expect(accept).toBe('accept');
      expect(retry).toBe('retry');
      expect(fallback).toBe('fallback');
    });

    it('should define GroundingDiagnostic interface', () => {
      const diagnostic: GroundingDiagnostic = {
        chunkId: 'chunk-1',
        rule: 'entity',
        reason: 'Entity not found',
        context: { expected: 'UserService', actual: undefined },
      };

      expect(diagnostic.chunkId).toBe('chunk-1');
      expect(diagnostic.rule).toBe('entity');
      expect(diagnostic.reason).toBe('Entity not found');
    });

    it('should define ChunkMetadata interface', () => {
      const metadata: ChunkMetadata = {
        chunkId: 'chunk-42',
        targetEntityId: 'func-getUserById',
        factSetIds: ['fs-1', 'fs-2'],
        confidence: 'High',
      };

      expect(metadata.chunkId).toBe('chunk-42');
      expect(metadata.confidence).toBe('High');
    });

    it('should define GroundingResult interface', () => {
      const result: GroundingResult = {
        status: 'accept',
        diagnostics: [],
      };

      expect(result.status).toBe('accept');
      expect(result.diagnostics).toEqual([]);
    });

    it('should define RetryMetadata interface', () => {
      const retryMeta: RetryMetadata = {
        attempt: 1,
        promptKey: 'R1',
      };

      expect(retryMeta.attempt).toBe(1);
      expect(retryMeta.promptKey).toBe('R1');
    });

    it('should define Validator interface with validate method', () => {
      type ValidateMethod = Validator['validate'];

      expectTypeOf<ValidateMethod>().toBeFunction();
      expectTypeOf<ValidateMethod>().parameters.toMatchTypeOf<
        [string, string[], ChunkMetadata]
      >();
      expectTypeOf<ValidateMethod>().returns.toMatchTypeOf<GroundingResult>();
    });
  });

  describe('MockValidator', () => {
    it('should implement Validator interface', () => {
      const mock = new MockValidator();

      expectTypeOf(mock).toMatchTypeOf<Validator>();
      expect(mock.validate).toBeDefined();
      expect(typeof mock.validate).toBe('function');
    });

    it('should return default accept result', () => {
      const mock = new MockValidator();

      const result = mock.validate('Some draft text', ['fs-1'], {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      });

      expect(result.status).toBe('accept');
      expect(result.diagnostics).toEqual([]);
    });

    it('should allow setting next result via setNextResult', () => {
      const mock = new MockValidator();

      const customResult: GroundingResult = {
        status: 'retry',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'entity',
            reason: 'Entity not found',
          },
        ],
        retryMetadata: { attempt: 1, promptKey: 'R1' },
      };

      mock.setNextResult(customResult);

      const result = mock.validate('Some draft text', ['fs-1'], {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      });

      expect(result.status).toBe('retry');
      expect(result.diagnostics).toHaveLength(1);
      expect(result.retryMetadata?.attempt).toBe(1);
    });

    it('should validate schema of custom result', () => {
      const mock = new MockValidator();

      const invalidResult = {
        status: 'invalid-status', // Invalid status
        diagnostics: [],
      };

      // @ts-expect-error - Testing runtime validation
      expect(() => mock.setNextResult(invalidResult)).toThrow();
    });

    it('should support all three outcome states', () => {
      const mock = new MockValidator();

      // Test accept
      mock.setNextResult({ status: 'accept', diagnostics: [] });
      expect(mock.validate('text', ['fs-1'], {} as ChunkMetadata).status).toBe('accept');

      // Test retry
      mock.setNextResult({
        status: 'retry',
        diagnostics: [],
        retryMetadata: { attempt: 1, promptKey: 'R1' },
      });
      expect(mock.validate('text', ['fs-1'], {} as ChunkMetadata).status).toBe('retry');

      // Test fallback
      mock.setNextResult({ status: 'fallback', diagnostics: [] });
      expect(mock.validate('text', ['fs-1'], {} as ChunkMetadata).status).toBe('fallback');
    });
  });
});
