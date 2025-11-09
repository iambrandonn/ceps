/**
 * Phase 6 I1: Request/Response Transform Pattern
 *
 * Detects functions that transform HTTP request/response data.
 * Identifies JSON parsing (response.json), text parsing (response.text),
 * and request serialization (JSON.stringify).
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
 * Transform types detected by this pattern.
 */
enum TransformType {
  ResponseJSON = 'response.json',
  ResponseText = 'response.text',
  ResponseBlob = 'response.blob',
  ResponseArrayBuffer = 'response.arrayBuffer',
  JSONStringify = 'JSON.stringify',
  JSONParse = 'JSON.parse',
}

export class RequestResponseTransformPattern implements PatternModule {
  id = 'http-clients.request-response-transform';
  priority = PatternPriority.FRAMEWORK_CORE;

  private chunkIds = new Set<string>();

  /**
   * Match functions that perform request/response transformations.
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be a function
      if (entity.kind !== 'function') {
        return false;
      }

      // Check for any transform-related call expressions
      const transformCalls = [
        'response.json',
        'response.text',
        'response.blob',
        'response.arrayBuffer',
        'JSON.stringify',
        'JSON.parse',
      ];

      return transformCalls.some(call => hasFact(kb, entity, 'calls-expression', call));
    } catch (error) {
      // Error handling contract: never throw
      return false;
    }
  }

  /**
   * Generate behavior chunk describing transformation behavior.
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

      // Detect transformation types
      const transforms = this.detectTransforms(kb, entity);

      // Build description
      const textDraft = this.buildDescription(entity.name, transforms);

      // Generate unique chunk ID
      const chunkId = this.generateChunkId(entity);

      return [
        {
          id: chunkId,
          targetEntityId: entity.id,
          textDraft,
          factSetIds,
          confidence: 'High', // Transform patterns are straightforward
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
   * Confidence adjustment for transform patterns.
   */
  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    try {
      if (!this.matches(kb, entity)) {
        return undefined;
      }

      return {
        adjustment: 5, // Moderate signal for HTTP data transformation
        reason: 'HTTP request/response data transformation',
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Detect which transformation types are present.
   */
  private detectTransforms(kb: KnowledgeBase, entity: Entity): TransformType[] {
    const transforms: TransformType[] = [];

    for (const transformType of Object.values(TransformType)) {
      if (hasFact(kb, entity, 'calls-expression', transformType)) {
        transforms.push(transformType);
      }
    }

    return transforms;
  }

  /**
   * Build human-readable description.
   */
  private buildDescription(name: string, transforms: TransformType[]): string {
    const parts: string[] = [];

    // Categorize transforms
    const responseTransforms = transforms.filter(t => t.startsWith('response.'));
    const jsonTransforms = transforms.filter(t => t.startsWith('JSON.'));

    if (responseTransforms.length > 0) {
      // Detect if it's JSON response parsing
      const isJSON = responseTransforms.includes(TransformType.ResponseJSON);
      const isText = responseTransforms.includes(TransformType.ResponseText);

      if (isJSON) {
        parts.push(`Parses JSON response data in \`${name}\` using \`response.json()\``);
      } else if (isText) {
        parts.push(`Extracts text from HTTP response in \`${name}\` using \`response.text()\``);
      } else {
        const methods = responseTransforms.map(t => `\`${t}()\``).join(', ');
        parts.push(`Transforms HTTP response data in \`${name}\` using ${methods}`);
      }
    }

    if (jsonTransforms.includes(TransformType.JSONStringify)) {
      parts.push(`Converts request data to JSON format via \`JSON.stringify()\` for serialization`);
    }

    if (jsonTransforms.includes(TransformType.JSONParse)) {
      parts.push(`Parses JSON response data using \`JSON.parse()\``);
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
