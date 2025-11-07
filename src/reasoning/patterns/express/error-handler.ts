/**
 * Phase 6 I2: Express Error Handler Pattern
 *
 * Detects Express error middleware (4-param signature: err, req, res, next).
 * Error handlers have priority 2 (framework core) and receive +10 confidence.
 */

import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import {
  PatternModule,
  PatternPriority,
  ConfidenceDelta,
} from '../types.js';
import {
  getParameterCount,
  getParameterNames,
  isAsync,
} from '../shared/helpers.js';

export class ExpressErrorHandlerPattern implements PatternModule {
  id = 'express.error-handler';
  priority = PatternPriority.FRAMEWORK_CORE;

  /**
   * Match Express error middleware: 4-param function with err/req/res/next signature.
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be a function
      if (entity.kind !== 'function') {
        return false;
      }

      // Must have exactly 4 parameters
      const paramCount = getParameterCount(kb, entity);
      if (paramCount !== 4) {
        return false;
      }

      // Check parameter names match Express error handler signature
      const paramNames = getParameterNames(kb, entity);
      if (paramNames.length !== 4) {
        return false;
      }

      // Express error middleware: (err, req, res, next)
      // Allow common variations: error/err, request/req, response/res
      const [param0, param1, param2, param3] = paramNames;
      const isErrorParam = /^(err|error)$/i.test(param0);
      const isReqParam = /^(req|request)$/i.test(param1);
      const isResParam = /^(res|response)$/i.test(param2);
      const isNextParam = /^next$/i.test(param3);

      return isErrorParam && isReqParam && isResParam && isNextParam;
    } catch {
      // Error handling contract: never throw
      return false;
    }
  }

  describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
    try {
      // Verify pattern still matches
      if (!this.matches(kb, entity)) {
        // Emit diagnostic Open Question for malformed entity
        return [
          {
            id: `error-handler-unknown-${entity.id}`,
            targetEntityId: entity.id,
            confidence: 'Low',
            textDraft: `**${entity.name}** has 4 parameters but doesn't match Express error handler signature.`,
            factSetIds: [`${entity.id}:param-count`],
          },
        ];
      }

      // Get factSets for grounding
      const factSets = kb.getFactSetsBySubject(entity.id);
      const paramFactSets = factSets.filter(fs =>
        fs.facts.some(f => f.predicate === 'param-count' || f.predicate === 'param-names')
      );

      // Check for async behavior
      const async = isAsync(kb, entity);
      const asyncFactSets = async ? factSets.filter(fs =>
        fs.facts.some(f => f.predicate === 'is-async' || f.predicate === 'returns-promise')
      ) : [];

      // Generate behavior description
      const asyncPrefix = async ? 'async ' : '';
      const asyncSuffix = async ? ' Handles asynchronous error handling with Promise-based flow.' : '';
      const description = `**${entity.name}** is an ${asyncPrefix}Express error handler (4-param middleware) that catches errors from the middleware chain.${asyncSuffix}`;

      return [
        {
          id: `error-handler-${entity.id}`,
          targetEntityId: entity.id,
          confidence: 'High',
          textDraft: description,
          factSetIds: [...paramFactSets, ...asyncFactSets].map(fs => fs.id),
        },
      ];
    } catch (error) {
      // Error handling contract: never throw, emit Low confidence chunk
      return [
        {
          id: `error-handler-error-${entity.id}`,
          targetEntityId: entity.id,
          confidence: 'Low',
          textDraft: `**${entity.name}** could not be analyzed (unexpected structure).`,
          factSetIds: [],
        },
      ];
    }
  }

  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta {
    // +10 for Express error handler detection
    return {
      delta: 10,
      reason: 'Express error handler (4-param middleware)',
    };
  }
}
