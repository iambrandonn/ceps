/**
 * Phase 4 WS-F1 Stage E: Retry Controller & Template Fallback Tests
 *
 * Tests for accept/retry/fallback decision logic per CTS-02 §4.4.
 * Coordinates validator results with LLM gateway retry strategy.
 *
 * TDD: Write ALL tests BEFORE implementation (Red phase).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RetryController } from '../retry-controller.js';
import type { GroundingResult, ChunkMetadata } from '../types.js';

describe('RetryController', () => {
  let controller: RetryController;

  beforeEach(() => {
    controller = new RetryController();
  });

  describe('Accept Flow', () => {
    it('should return accept when validation passes', () => {
      const validationResult: GroundingResult = {
        status: 'accept',
        diagnostics: [],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 0);

      expect(decision.outcome).toBe('accept');
      expect(decision.promptKey).toBe('O'); // Original prompt
      expect(decision.attemptCount).toBe(0);
      expect(decision.shouldRetry).toBe(false);
    });

    it('should use LLM text when accepting', () => {
      const validationResult: GroundingResult = {
        status: 'accept',
        diagnostics: [],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-2',
        targetEntityId: 'entity-2',
        factSetIds: ['fs-2'],
        confidence: 'Medium',
      };

      const decision = controller.decide(validationResult, metadata, 0);

      expect(decision.outcome).toBe('accept');
      expect(decision.useLLMText).toBe(true);
      expect(decision.useTemplate).toBe(false);
    });
  });

  describe('First Retry (R1)', () => {
    it('should return retry with R1 prompt on first failure', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'entity',
            reason: 'Unknown entity "AdminService"',
          },
        ],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 0);

      expect(decision.outcome).toBe('retry');
      expect(decision.promptKey).toBe('R1');
      expect(decision.attemptCount).toBe(1);
      expect(decision.shouldRetry).toBe(true);
    });

    it('should include retry guidance in metadata', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'numeric',
            reason: 'Value beyond tolerance',
          },
        ],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 0);

      expect(decision.retryGuidance).toBeDefined();
      expect(decision.retryGuidance).toContain('numeric');
    });
  });

  describe('Second Retry (R2)', () => {
    it('should return retry with R2 prompt on second failure', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'enum',
            reason: 'Invalid enum value',
          },
        ],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 1);

      expect(decision.outcome).toBe('retry');
      expect(decision.promptKey).toBe('R2');
      expect(decision.attemptCount).toBe(2);
      expect(decision.shouldRetry).toBe(true);
    });
  });

  describe('Template Fallback', () => {
    it('should fallback to template after 2 retries', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'entity',
            reason: 'Persistent validation failure',
          },
        ],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 2);

      expect(decision.outcome).toBe('fallback');
      expect(decision.promptKey).toBe('TEMPLATE');
      expect(decision.shouldRetry).toBe(false);
      expect(decision.useTemplate).toBe(true);
      expect(decision.useLLMText).toBe(false);
    });

    it('should preserve factSetIds in fallback', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1', 'fs-2'],
        confidence: 'Medium',
      };

      const decision = controller.decide(validationResult, metadata, 2);

      expect(decision.outcome).toBe('fallback');
      expect(decision.metadata.factSetIds).toEqual(['fs-1', 'fs-2']);
    });

    it('should include warning for fallback', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'relation',
            reason: 'Missing relation',
          },
        ],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 2);

      expect(decision.warning).toBeDefined();
      expect(decision.warning).toContain('fallback');
      expect(decision.warning).toContain('template');
    });

    it('should track fallback metrics', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 2);

      expect(decision.metrics).toBeDefined();
      expect(decision.metrics.fallbackCount).toBe(1);
    });

    it('should bypass re-validation for template (trusted)', () => {
      const validationResult: GroundingResult = {
        status: 'retry',
        diagnostics: [],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 2);

      expect(decision.outcome).toBe('fallback');
      expect(decision.skipRevalidation).toBe(true);
    });
  });

  describe('Prompt Key Mapping (CTS-02)', () => {
    it('should use exact CTS-02 prompt keys', () => {
      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      // Original prompt
      const accept: GroundingResult = { status: 'accept', diagnostics: [] };
      expect(controller.decide(accept, metadata, 0).promptKey).toBe('O');

      // First retry
      const retry1: GroundingResult = { status: 'retry', diagnostics: [] };
      expect(controller.decide(retry1, metadata, 0).promptKey).toBe('R1');

      // Second retry
      const retry2: GroundingResult = { status: 'retry', diagnostics: [] };
      expect(controller.decide(retry2, metadata, 1).promptKey).toBe('R2');

      // Fallback
      const fallback: GroundingResult = { status: 'retry', diagnostics: [] };
      expect(controller.decide(fallback, metadata, 2).promptKey).toBe('TEMPLATE');
    });
  });

  describe('Immediate Fallback', () => {
    it('should fallback immediately if validation status is fallback', () => {
      const validationResult: GroundingResult = {
        status: 'fallback',
        diagnostics: [
          {
            chunkId: 'chunk-1',
            rule: 'numeric',
            reason: 'Unrecoverable numeric error',
          },
        ],
      };

      const metadata: ChunkMetadata = {
        chunkId: 'chunk-1',
        targetEntityId: 'entity-1',
        factSetIds: ['fs-1'],
        confidence: 'High',
      };

      const decision = controller.decide(validationResult, metadata, 0);

      expect(decision.outcome).toBe('fallback');
      expect(decision.promptKey).toBe('TEMPLATE');
      expect(decision.attemptCount).toBe(0);
    });
  });
});
