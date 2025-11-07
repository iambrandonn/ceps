/**
 * Phase 6 I1: Express Middleware Pattern
 *
 * Detects Express middleware functions (3-parameter signature: req, res, next).
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
  getParameterCount,
  getParameterNames,
  getFactSets,
} from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';

export class ExpressMiddlewarePattern implements PatternModule {
  id = 'express.middleware';
  priority = PatternPriority.FRAMEWORK_CORE;

  private chunkIds = new Set<string>();

  /**
   * Match Express middleware: 3-param function with req/res/next signature.
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be a function
      if (entity.kind !== 'function') {
        return false;
      }

      // Must have 3 parameters
      const paramCount = getParameterCount(kb, entity);
      if (paramCount !== 3) {
        return false;
      }

      // Param names must match req, res, next pattern (case-insensitive)
      const paramNames = getParameterNames(kb, entity);
      if (paramNames.length !== 3) {
        return false;
      }

      // Match req.*res.*next pattern (allowing for variations like Request, Response, NextFunction)
      const namesStr = paramNames.join(',').toLowerCase();
      const middlewarePattern = /req.*res.*next/i;

      return middlewarePattern.test(namesStr);
    } catch (error) {
      // Error handling contract: never throw, return false
      return false;
    }
  }

  /**
   * Generate behavior chunk describing middleware function.
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

      // Build description
      const textDraft = `Express middleware function ${entity.name} that processes requests in the middleware chain. Takes request, response, and next function as parameters.`;

      // Generate unique chunk ID
      const chunkId = this.generateChunkId(entity);

      return [
        {
          id: chunkId,
          targetEntityId: entity.id,
          textDraft,
          factSetIds,
          confidence: 'High', // Strong signal from 3-param + naming pattern
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
   * Confidence adjustment for Express middleware pattern.
   */
  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    try {
      if (!this.matches(kb, entity)) {
        return undefined;
      }

      return {
        adjustment: 10, // Strong framework signal
        reason: 'Express middleware pattern (3-param req/res/next signature)',
      };
    } catch (error) {
      return undefined;
    }
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
