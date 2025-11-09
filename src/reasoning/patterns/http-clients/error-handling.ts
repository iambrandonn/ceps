/**
 * Phase 6 I1: HTTP Error Handling Pattern
 *
 * Detects HTTP-specific error handling patterns.
 * Identifies try-catch blocks with HTTP calls, response.ok checks,
 * and status code validation.
 */

import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import {
  PatternModule,
  PatternPriority,
  ConfidenceDelta,
} from '../types.js';
import {
  hasFact,
  getFactSets,
} from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';

/**
 * Error handling patterns detected.
 */
interface ErrorHandlingPattern {
  hasTryCatch: boolean;
  checksResponseOk: boolean;
  checksStatus: boolean;
  hasHttpCall: boolean;
}

export class HttpErrorHandlingPattern implements PatternModule {
  id = 'http-clients.error-handling';
  priority = PatternPriority.FRAMEWORK_CORE;

  private chunkIds = new Set<string>();

  /**
   * Match functions with HTTP-specific error handling.
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be a function
      if (entity.kind !== 'function') {
        return false;
      }

      const patterns = this.detectPatterns(kb, entity);

      // Must have HTTP call AND some error handling mechanism
      return (
        patterns.hasHttpCall &&
        (patterns.hasTryCatch || patterns.checksResponseOk || patterns.checksStatus)
      );
    } catch (error) {
      // Error handling contract: never throw
      return false;
    }
  }

  /**
   * Generate behavior chunk describing error handling.
   */
  describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
    try {
      // Should only be called after matches() returns true
      if (!this.matches(kb, entity)) {
        return [];
      }

      const factSets = getFactSets(kb, entity);
      if (factSets.length === 0) {
        return [];
      }

      // Collect factSet IDs
      const factSetIds = factSets.map(fs => fs.id);

      // Detect error handling patterns
      const patterns = this.detectPatterns(kb, entity);

      // Build description
      const textDraft = this.buildDescription(entity.name, patterns);

      // Generate unique chunk ID
      const chunkId = this.generateChunkId(entity);

      return [
        {
          id: chunkId,
          targetEntityId: entity.id,
          textDraft,
          factSetIds,
          confidence: 'High', // Error handling patterns are clear-cut
        },
      ];
    } catch (error) {
      // Error handling contract: return Low-confidence error chunk
      return [
        {
          id: `error-${this.id}-${entity.id}`,
          targetEntityId: entity.id,
          textDraft: `Pattern '${this.id}' encountered error describing entity: ${error instanceof Error ? error.message : String(error)}`,
          factSetIds: [],
          confidence: 'Low',
        },
      ];
    }
  }

  /**
   * Confidence adjustment for error handling patterns.
   */
  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    try {
      if (!this.matches(kb, entity)) {
        return undefined;
      }

      return {
        adjustment: 8, // Strong signal for HTTP error handling
        reason: 'HTTP-specific error handling detected',
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Detect error handling patterns in the entity.
   */
  private detectPatterns(kb: KnowledgeBase, entity: Entity): ErrorHandlingPattern {
    return {
      hasTryCatch: hasFact(kb, entity, 'has-try-catch'),
      checksResponseOk: hasFact(kb, entity, 'checks-property', 'response.ok'),
      checksStatus: hasFact(kb, entity, 'checks-property', 'response.status'),
      hasHttpCall: this.hasHttpCall(kb, entity),
    };
  }

  /**
   * Check if entity makes HTTP calls (fetch, axios, etc.).
   */
  private hasHttpCall(kb: KnowledgeBase, entity: Entity): boolean {
    const httpCalls = [
      'fetch',
      'axios.get',
      'axios.post',
      'axios.put',
      'axios.delete',
      'axios.patch',
      'axios',
    ];

    return httpCalls.some(call => hasFact(kb, entity, 'calls-expression', call));
  }

  /**
   * Build human-readable description.
   */
  private buildDescription(name: string, patterns: ErrorHandlingPattern): string {
    const parts: string[] = [`Implements error handling for HTTP requests in \`${name}\``];

    if (patterns.hasTryCatch) {
      parts.push(`Uses try-catch block to handle request failures`);
    }

    if (patterns.checksResponseOk) {
      parts.push(`Validates HTTP response via \`response.ok\` property check`);
    }

    if (patterns.checksStatus) {
      parts.push(`Checks HTTP status code via \`response.status\` property`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Generate deterministic chunk ID.
   */
  private generateChunkId(entity: Entity): string {
    const content = `${this.id}-${entity.kind}-${entity.name}-${entity.path}`;
    const chunkId = generateAnchor('chunk', content, this.chunkIds);
    this.chunkIds.add(chunkId);
    return chunkId;
  }
}
