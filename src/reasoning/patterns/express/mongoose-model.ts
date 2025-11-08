/**
 * Phase 6 I4: Mongoose Model Pattern
 *
 * Detects Mongoose model definitions (mongoose.model('Name', schema)).
 * Links models to their schemas and inherits field/ref information.
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

export class MongooseModelPattern implements PatternModule {
  id = 'mongoose.model';
  priority = PatternPriority.AUXILIARY_ADAPTERS;

  private chunkIds = new Set<string>();

  /**
   * Match Mongoose Model: constant initialized with mongoose.model(...).
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be a constant
      if (entity.kind !== 'constant') {
        return false;
      }

      // Must have initializer-call fact with value 'mongoose.model'
      return hasFact(kb, entity, 'initializer-call', 'mongoose.model');
    } catch (error) {
      // Error handling contract: never throw
      return false;
    }
  }

  /**
   * Generate behavior chunk describing the model.
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

      // Extract model name and schema reference from initializer
      const initializerFact = getFirstFact(kb, entity, 'initializer');
      if (!initializerFact) {
        return [];
      }

      const initializer = String(initializerFact.object);

      // Parse: mongoose.model('ModelName', schemaVar)
      const modelNameMatch = initializer.match(/mongoose\.model\s*\(\s*['"](\w+)['"]/);
      const schemaRefMatch = initializer.match(/mongoose\.model\s*\([^,]+,\s*(\w+)/);

      const modelName = modelNameMatch ? modelNameMatch[1] : entity.name;
      const schemaRef = schemaRefMatch ? schemaRefMatch[1] : null;

      // Try to resolve schema reference to schema entity
      let schemaInfo = '';
      let confidence: 'High' | 'Medium' | 'Low' = 'High';

      if (schemaRef) {
        const schemaEntity = this.resolveSchemaEntity(kb, entity, schemaRef);
        if (schemaEntity) {
          // Found schema - extract its description for enrichment
          schemaInfo = ` using schema ${schemaRef}`;

          // Try to get schema fields from its behavior chunks (if already processed)
          const schemaChunks = kb.getChunksByEntity(schemaEntity.id);
          if (schemaChunks.length > 0) {
            // Extract field info from schema chunk text
            const schemaText = schemaChunks[0]?.textDraft || '';
            const fieldsMatch = schemaText.match(/defines fields: ([^.]+)/);
            if (fieldsMatch) {
              schemaInfo += `. Supports fields: ${fieldsMatch[1]}`;
            }
          }
        } else {
          // Schema reference not resolved - medium confidence
          schemaInfo = ` (schema: ${schemaRef}, not resolved)`;
          confidence = 'Medium';
        }
      } else {
        // No schema reference found - low confidence
        confidence = 'Low';
      }

      // Build description
      let textDraft = `Mongoose model ${entity.name} for collection '${modelName}'${schemaInfo}.`;

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
   * Confidence adjustment for Mongoose Model pattern.
   */
  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    try {
      if (!this.matches(kb, entity)) {
        return undefined;
      }

      // Get schema resolution status
      const initializerFact = getFirstFact(kb, entity, 'initializer');
      if (!initializerFact) {
        return undefined;
      }

      const initializer = String(initializerFact.object);
      const schemaRefMatch = initializer.match(/mongoose\.model\s*\([^,]+,\s*(\w+)/);

      if (schemaRefMatch) {
        const schemaRef = schemaRefMatch[1];
        const schemaEntity = this.resolveSchemaEntity(kb, entity, schemaRef);

        if (schemaEntity) {
          // Schema resolved - strong signal
          return {
            adjustment: 10,
            reason: 'Mongoose Model with resolved schema reference',
          };
        } else {
          // Schema not resolved - weaker signal
          return {
            adjustment: 5,
            reason: 'Mongoose Model with unresolved schema reference',
          };
        }
      }

      // Default adjustment
      return {
        adjustment: 8,
        reason: 'Mongoose Model pattern (mongoose.model call)',
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Resolve schema reference to schema entity.
   *
   * Strategy:
   * 1. Look for constant entity with matching name in same file
   * 2. If not found, search all entities in KB (may be imported)
   * 3. Return entity if it has 'new Schema' initializer pattern
   */
  private resolveSchemaEntity(kb: KnowledgeBase, modelEntity: Entity, schemaRef: string): Entity | null {
    try {
      // Search all entities for matching constant with schema pattern
      const entities = kb.getAllEntities();
      if (!entities || entities.length === 0) {
        return null;
      }

      // Prefer entities in same file
      const sameFileEntities = entities.filter(e => e.path === modelEntity.path);
      for (const entity of sameFileEntities) {
        if (entity.kind === 'constant' && entity.name === schemaRef) {
          // Check if it's a schema (has new Schema initializer)
          const initFact = getFirstFact(kb, entity, 'initializer');
          if (initFact && /^new\s+(mongoose\.)?Schema\s*\(/.test(String(initFact.object))) {
            return entity;
          }
        }
      }

      // Fall back to any entity with matching name
      for (const entity of entities) {
        if (entity.kind === 'constant' && entity.name === schemaRef) {
          const initFact = getFirstFact(kb, entity, 'initializer');
          if (initFact && /^new\s+(mongoose\.)?Schema\s*\(/.test(String(initFact.object))) {
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
   * Generate deterministic chunk ID.
   */
  private generateChunkId(entity: Entity): string {
    const content = `${this.id}-${entity.kind}-${entity.name}-${entity.path}`;
    const chunkId = generateAnchor('chunk', content, this.chunkIds);
    this.chunkIds.add(chunkId);
    return chunkId;
  }
}
