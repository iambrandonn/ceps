/**
 * Phase 6 I4: Mongoose Query Pattern
 *
 * Detects Mongoose query operations in route handlers and functions.
 * Links queries to model definitions for enriched behavior descriptions.
 */

import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import {
  PatternModule,
  PatternPriority,
  ConfidenceDelta,
} from '../types.js';
import {
  getFactsByPredicate,
  getFactSets,
  getFirstFact,
} from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';

/**
 * Mongoose query methods to detect.
 * Organized by category for better diagnostics.
 */
const QUERY_METHODS = {
  read: ['find', 'findOne', 'findById', 'findByIdAndUpdate', 'findOneAndUpdate', 'countDocuments', 'exists', 'estimatedDocumentCount'],
  write: ['create', 'insertMany', 'updateOne', 'updateMany', 'replaceOne', 'findByIdAndDelete', 'findOneAndDelete', 'deleteOne', 'deleteMany'],
  aggregate: ['aggregate'],
};

const ALL_QUERY_METHODS = [
  ...QUERY_METHODS.read,
  ...QUERY_METHODS.write,
  ...QUERY_METHODS.aggregate,
];

interface QueryOperation {
  modelName: string;
  method: string;
  category: 'read' | 'write' | 'aggregate';
}

export class MongooseQueryPattern implements PatternModule {
  id = 'mongoose.query';
  priority = PatternPriority.AUXILIARY_ADAPTERS;

  private chunkIds = new Set<string>();

  /**
   * Match functions or constants that contain Mongoose query calls.
   *
   * Works with:
   * - Router constants (queries in route handler definitions)
   * - Functions (queries in function body)
   * - Methods (queries in method body)
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be function, method, or constant
      if (!['function', 'method', 'constant'].includes(entity.kind)) {
        return false;
      }

      // Look for calls-expression facts matching Mongoose query patterns
      const callExprs = getFactsByPredicate(kb, entity, 'calls-expression');

      return callExprs.some(fact => {
        const callExpr = String(fact.object);
        return ALL_QUERY_METHODS.some(method =>
          new RegExp(`\\w+\\.${method}\\b`).test(callExpr)
        );
      });
    } catch (error) {
      // Error handling contract: never throw
      return false;
    }
  }

  /**
   * Generate behavior chunk describing query operations.
   */
  describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
    try {
      if (!this.matches(kb, entity)) {
        return [];
      }

      const factSets = getFactSets(kb, entity);
      if (factSets.length === 0) {
        return [];
      }

      const factSetIds = factSets.map(fs => fs.id);

      // Extract query operations
      const operations = this.extractQueryOperations(kb, entity);

      if (operations.length === 0) {
        return [];
      }

      // Resolve models and build descriptions
      const descriptions = operations.map(op => {
        const modelEntity = this.resolveModelEntity(kb, entity, op.modelName);

        let modelInfo = op.modelName;
        if (modelEntity) {
          // Try to get model's schema info
          const modelChunks = kb.getChunksByEntity(modelEntity.id);
          if (modelChunks.length > 0) {
            const modelText = modelChunks[0]?.textDraft || '';
            const fieldsMatch = modelText.match(/Supports fields: ([^.]+)/);
            if (fieldsMatch) {
              modelInfo += ` (fields: ${fieldsMatch[1]})`;
            }
          }
        } else {
          modelInfo += ' (model not resolved)';
        }

        return `${this.categorizeOperation(op.method)}: ${modelInfo}`;
      });

      // Build chunk text
      let textDraft: string;
      if (operations.length === 1) {
        textDraft = `Performs Mongoose ${descriptions[0]}.`;
      } else {
        textDraft = `Performs Mongoose operations: ${descriptions.join('; ')}.`;
      }

      // Confidence based on model resolution
      const resolvedCount = operations.filter(op =>
        this.resolveModelEntity(kb, entity, op.modelName) !== null
      ).length;

      let confidence: 'High' | 'Medium' | 'Low';
      if (resolvedCount === operations.length) {
        confidence = 'High'; // All models resolved
      } else if (resolvedCount > 0) {
        confidence = 'Medium'; // Some models resolved
      } else {
        confidence = 'Low'; // No models resolved
      }

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
   * Confidence adjustment for Mongoose Query pattern.
   */
  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    try {
      if (!this.matches(kb, entity)) {
        return undefined;
      }

      const operations = this.extractQueryOperations(kb, entity);
      const resolvedCount = operations.filter(op =>
        this.resolveModelEntity(kb, entity, op.modelName) !== null
      ).length;

      if (resolvedCount === operations.length) {
        // All models resolved
        return {
          adjustment: 5,
          reason: 'Mongoose queries with all models resolved',
        };
      } else if (resolvedCount > 0) {
        // Some models resolved
        return {
          adjustment: 0,
          reason: 'Mongoose queries with some unresolved models',
        };
      } else {
        // No models resolved - decrease confidence
        return {
          adjustment: -5,
          reason: 'Mongoose queries with unresolved model references',
        };
      }
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract query operations from entity's calls-expression facts.
   */
  private extractQueryOperations(kb: KnowledgeBase, entity: Entity): QueryOperation[] {
    const operations: QueryOperation[] = [];

    try {
      const callExprs = getFactsByPredicate(kb, entity, 'calls-expression');

      for (const fact of callExprs) {
        const callExpr = String(fact.object);

        // Pattern: ModelName.method(...)
        for (const method of ALL_QUERY_METHODS) {
          const pattern = new RegExp(`(\\w+)\\.${method}\\b`);
          const match = callExpr.match(pattern);

          if (match) {
            const modelName = match[1];
            const category = this.getMethodCategory(method);

            operations.push({
              modelName,
              method,
              category,
            });
          }
        }
      }
    } catch (error) {
      // Best effort - return partial results
    }

    // Deduplicate by model+method (same query called multiple times)
    const seen = new Set<string>();
    return operations.filter(op => {
      const key = `${op.modelName}.${op.method}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Resolve model name to model entity.
   *
   * Strategy:
   * 1. Check for model constant in same file
   * 2. Check for imported model from related files
   * 3. Search all entities for matching model name
   */
  private resolveModelEntity(kb: KnowledgeBase, sourceEntity: Entity, modelName: string): Entity | null {
    try {
      const entities = kb.getAllEntities();
      if (!entities || entities.length === 0) {
        return null;
      }

      // Prefer entities in same file
      const sameFileEntities = entities.filter(e => e.path === sourceEntity.path);
      for (const entity of sameFileEntities) {
        if (entity.kind === 'constant' && entity.name === modelName) {
          // Check if it's a Mongoose model
          const initCallFact = getFirstFact(kb, entity, 'initializer-call');
          if (initCallFact && String(initCallFact.object) === 'mongoose.model') {
            return entity;
          }
        }
      }

      // Fall back to any entity with matching name
      for (const entity of entities) {
        if (entity.kind === 'constant' && entity.name === modelName) {
          const initCallFact = getFirstFact(kb, entity, 'initializer-call');
          if (initCallFact && String(initCallFact.object) === 'mongoose.model') {
            return entity;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get category for a query method.
   */
  private getMethodCategory(method: string): 'read' | 'write' | 'aggregate' {
    if (QUERY_METHODS.read.includes(method)) return 'read';
    if (QUERY_METHODS.write.includes(method)) return 'write';
    if (QUERY_METHODS.aggregate.includes(method)) return 'aggregate';
    return 'read'; // Default
  }

  /**
   * Categorize operation for human-readable description.
   */
  private categorizeOperation(method: string): string {
    const category = this.getMethodCategory(method);
    return `${category} query (${method})`;
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
