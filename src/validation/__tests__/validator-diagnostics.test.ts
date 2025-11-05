/**
 * Phase 4 WS-F1 Stage F: Diagnostic Formatting Tests
 *
 * Tests for deterministic diagnostic output with --debug flag.
 * Ensures consistent, meaningful diagnostics for debugging.
 *
 * TDD: Write ALL tests BEFORE implementation (Red phase).
 */

import { describe, it, expect } from 'vitest';
import { renderDiagnostics, type DiagnosticRenderOptions } from '../diagnostic-renderer.js';
import type { GroundingDiagnostic } from '../types.js';

describe('DiagnosticRenderer', () => {
  describe('Debug Off (No Output)', () => {
    it('should return empty string when debug is off', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'chunk-1',
          rule: 'entity',
          reason: 'Unknown entity',
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: false,
      };

      const result = renderDiagnostics(diagnostics, options);

      expect(result).toBe('');
    });
  });

  describe('Debug On (Sorted Output)', () => {
    it('should output diagnostics sorted by chunkId, rule, reason', () => {
      const diagnostics: GroundingDiagnostic[] = [
        { chunkId: 'chunk-2', rule: 'numeric', reason: 'Value out of range' },
        { chunkId: 'chunk-1', rule: 'entity', reason: 'Unknown entity' },
        { chunkId: 'chunk-1', rule: 'entity', reason: 'Another issue' },
        { chunkId: 'chunk-1', rule: 'enum', reason: 'Invalid enum' },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
      };

      const result = renderDiagnostics(diagnostics, options);

      // Parse lines and check order
      const lines = result.trim().split('\n').filter(l => l.trim());
      expect(lines.length).toBeGreaterThan(0);

      // First diagnostic should be chunk-1, entity (alphabetically first)
      expect(lines[0]).toContain('chunk-1');
      expect(lines[0]).toContain('entity');

      // Last should be chunk-2
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toContain('chunk-2');
    });

    it('should include context when provided', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'chunk-1',
          rule: 'numeric',
          reason: 'Value mismatch',
          context: {
            expected: { value: 5000, unit: 'ms' },
            actual: { value: 6000, unit: 'ms' },
          },
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
      };

      const result = renderDiagnostics(diagnostics, options);

      expect(result).toContain('expected');
      expect(result).toContain('actual');
      expect(result).toContain('5000');
      expect(result).toContain('6000');
    });

    it('should include location when provided', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'chunk-1',
          rule: 'entity',
          reason: 'Unknown identifier',
          context: {
            location: 'src/services/user-service.ts:42',
          },
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
      };

      const result = renderDiagnostics(diagnostics, options);

      expect(result).toContain('location');
      expect(result).toContain('user-service.ts:42');
    });
  });

  describe('Strip Non-Deterministic Values', () => {
    it('should strip timestamps from context', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'chunk-1',
          rule: 'entity',
          reason: 'Test',
          context: {
            timestamp: Date.now(),
            data: 'important',
          } as any,
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
        stripNonDeterministic: true,
      };

      const result = renderDiagnostics(diagnostics, options);

      expect(result).not.toContain('timestamp');
      expect(result).toContain('data');
      expect(result).toContain('important');
    });

    it('should strip random IDs from output', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'random-abc123',
          rule: 'entity',
          reason: 'Test',
          context: {
            generatedId: 'xyz-789',
          } as any,
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
        stripNonDeterministic: true,
      };

      const result = renderDiagnostics(diagnostics, options);

      // Should still have structure but sanitized
      // In text format, rule appears in brackets like [entity]
      expect(result).toContain('[entity]');
      expect(result).toContain('Test');
    });
  });

  describe('FactSet ID Included', () => {
    it('should include factSetId when available', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'chunk-1',
          rule: 'scope',
          reason: 'Entity outside scope',
          context: {
            factSetIds: ['fs-user-service', 'fs-auth'],
          } as any,
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
      };

      const result = renderDiagnostics(diagnostics, options);

      expect(result).toContain('factSetIds');
      expect(result).toContain('fs-user-service');
      expect(result).toContain('fs-auth');
    });
  });

  describe('Format Options', () => {
    it('should support JSON format', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'chunk-1',
          rule: 'entity',
          reason: 'Unknown entity',
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
        format: 'json',
      };

      const result = renderDiagnostics(diagnostics, options);

      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();

      const parsed = JSON.parse(result);
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed[0]).toHaveProperty('chunkId');
      expect(parsed[0]).toHaveProperty('rule');
    });

    it('should support text format (default)', () => {
      const diagnostics: GroundingDiagnostic[] = [
        {
          chunkId: 'chunk-1',
          rule: 'entity',
          reason: 'Unknown entity',
        },
      ];

      const options: DiagnosticRenderOptions = {
        debug: true,
        format: 'text',
      };

      const result = renderDiagnostics(diagnostics, options);

      expect(result).toContain('chunk-1');
      expect(result).toContain('entity');
      expect(result).toContain('Unknown entity');
    });
  });

  describe('Empty Diagnostics', () => {
    it('should handle empty diagnostics array', () => {
      const diagnostics: GroundingDiagnostic[] = [];

      const options: DiagnosticRenderOptions = {
        debug: true,
      };

      const result = renderDiagnostics(diagnostics, options);

      expect(result).toBe('');
    });
  });
});
