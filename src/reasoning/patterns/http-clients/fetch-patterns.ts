/**
 * Phase 6 I1: Fetch Pattern
 *
 * Detects Fetch API wrapper functions.
 * Extracts URL, method, error handling patterns from async functions that call fetch().
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
  getFirstFact,
  getFactSets,
} from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';

export class FetchPattern implements PatternModule {
  id = 'http-clients.fetch-patterns';
  priority = PatternPriority.FRAMEWORK_CORE;

  private chunkIds = new Set<string>();

  /**
   * Match async functions that call fetch().
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be a function
      if (entity.kind !== 'function') {
        return false;
      }

      // Must call fetch
      return hasFact(kb, entity, 'calls-expression', 'fetch');
    } catch (error) {
      // Error handling contract: never throw
      return false;
    }
  }

  /**
   * Generate behavior chunk describing fetch wrapper.
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

      // Extract URL from call-arg-0
      const urlFact = getFirstFact(kb, entity, 'call-arg-0');
      const url = urlFact?.object ? String(urlFact.object) : null;

      // Detect error handling patterns
      const hasErrorHandling = this.detectErrorHandling(kb, entity);

      // Determine confidence
      const confidence = this.determineConfidence(url, hasErrorHandling);

      // Build description
      const textDraft = this.buildDescription(entity.name, url, hasErrorHandling);

      // Generate unique chunk ID
      const chunkId = this.generateChunkId(entity);

      return [
        {
          id: chunkId,
          targetEntityId: entity.id,
          textDraft,
          factSetIds,
          confidence,
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
   * Confidence adjustment for fetch patterns.
   */
  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    try {
      if (!this.matches(kb, entity)) {
        return undefined;
      }

      return {
        adjustment: 10, // Strong HTTP client signal
        reason: 'Fetch API wrapper function',
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Detect error handling patterns (try-catch, Error constructor).
   */
  private detectErrorHandling(kb: KnowledgeBase, entity: Entity): boolean {
    const hasTryCatch = hasFact(kb, entity, 'has-try-catch'); // Check for presence, not value
    const callsError = hasFact(kb, entity, 'calls-expression', 'Error');
    return hasTryCatch || callsError;
  }

  /**
   * Determine confidence based on extracted information.
   */
  private determineConfidence(
    url: string | null,
    hasErrorHandling: boolean
  ): 'High' | 'Medium' | 'Low' {
    if (url || hasErrorHandling) {
      return 'High'; // Static URL or error handling present - high confidence
    }

    return 'Medium'; // Dynamic URL without error handling
  }

  /**
   * Build human-readable description.
   */
  private buildDescription(
    name: string,
    url: string | null,
    hasErrorHandling: boolean
  ): string {
    const parts: string[] = [`Makes HTTP request using Fetch API in \`${name}\``];

    if (url) {
      parts.push(`Calls \`fetch()\` with URL \`${url}\``);
    } else {
      parts.push(`Calls \`fetch()\` with dynamic URL`);
    }

    if (hasErrorHandling) {
      parts.push(`Includes error handling for failed requests`);
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
