/**
 * Phase 6 Quality Improvement: Semantic Function Name Pattern
 *
 * Enhances generic fallback descriptions by extracting semantic hints
 * from function names and parameter names. Converts "intent unclear"
 * into meaningful descriptions based on naming conventions.
 *
 * Target: Fix ~40 generic function descriptions in research-coi baseline
 *
 * Examples:
 * - getLatestDisclosure → "Retrieves latest disclosure for user"
 * - isHealthCheck → "Checks if request is health check"
 * - updateContentProject → "Updates content project with changes"
 */

import { PatternModule, PatternPriority } from '../types.js';
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { generateAnchor } from '../../../kb/id-generation.js';
import { getFactSets } from './helpers.js';

// Semantic prefixes and their descriptions
const SEMANTIC_PATTERNS = [
  // Retrieval
  { prefix: 'get', verb: 'Retrieves', returnHint: 'Returns' },
  { prefix: 'fetch', verb: 'Fetches', returnHint: 'Returns' },
  { prefix: 'find', verb: 'Finds', returnHint: 'Returns' },
  { prefix: 'load', verb: 'Loads', returnHint: 'Returns' },
  { prefix: 'read', verb: 'Reads', returnHint: 'Returns' },
  { prefix: 'query', verb: 'Queries', returnHint: 'Returns' },

  // Validation
  { prefix: 'is', verb: 'Checks if', returnHint: 'Returns boolean indicating whether' },
  { prefix: 'has', verb: 'Checks if', returnHint: 'Returns boolean indicating whether' },
  { prefix: 'can', verb: 'Determines if', returnHint: 'Returns boolean indicating whether' },
  { prefix: 'should', verb: 'Determines if', returnHint: 'Returns boolean indicating whether' },
  { prefix: 'validate', verb: 'Validates', returnHint: 'Returns validation result' },
  { prefix: 'check', verb: 'Checks', returnHint: 'Returns check result' },
  { prefix: 'verify', verb: 'Verifies', returnHint: 'Returns verification result' },

  // Mutation
  { prefix: 'update', verb: 'Updates', returnHint: 'Returns updated' },
  { prefix: 'modify', verb: 'Modifies', returnHint: 'Returns modified' },
  { prefix: 'set', verb: 'Sets', returnHint: 'Returns' },
  { prefix: 'create', verb: 'Creates', returnHint: 'Returns created' },
  { prefix: 'add', verb: 'Adds', returnHint: 'Returns' },
  { prefix: 'insert', verb: 'Inserts', returnHint: 'Returns' },
  { prefix: 'delete', verb: 'Deletes', returnHint: 'Returns' },
  { prefix: 'remove', verb: 'Removes', returnHint: 'Returns' },
  { prefix: 'clear', verb: 'Clears', returnHint: 'Returns' },

  // Transformation
  { prefix: 'convert', verb: 'Converts', returnHint: 'Returns converted' },
  { prefix: 'transform', verb: 'Transforms', returnHint: 'Returns transformed' },
  { prefix: 'map', verb: 'Maps', returnHint: 'Returns mapped' },
  { prefix: 'filter', verb: 'Filters', returnHint: 'Returns filtered' },
  { prefix: 'sort', verb: 'Sorts', returnHint: 'Returns sorted' },
  { prefix: 'parse', verb: 'Parses', returnHint: 'Returns parsed' },
  { prefix: 'format', verb: 'Formats', returnHint: 'Returns formatted' },

  // Computation
  { prefix: 'calculate', verb: 'Calculates', returnHint: 'Returns calculated' },
  { prefix: 'compute', verb: 'Computes', returnHint: 'Returns computed' },
  { prefix: 'count', verb: 'Counts', returnHint: 'Returns count of' },
  { prefix: 'sum', verb: 'Sums', returnHint: 'Returns sum of' },

  // Comparison
  { prefix: 'are', verb: 'Compares', returnHint: 'Returns boolean indicating whether' },
  { prefix: 'match', verb: 'Checks if', returnHint: 'Returns boolean indicating whether' },
  { prefix: 'matches', verb: 'Checks if', returnHint: 'Returns boolean indicating whether' },
  { prefix: 'compare', verb: 'Compares', returnHint: 'Returns comparison result' },

  // Factory/Builder
  { prefix: 'build', verb: 'Builds', returnHint: 'Returns built' },
  { prefix: 'make', verb: 'Creates', returnHint: 'Returns created' },
  { prefix: 'construct', verb: 'Constructs', returnHint: 'Returns constructed' },
  { prefix: 'initialize', verb: 'Initializes', returnHint: 'Returns initialized' },
  { prefix: 'init', verb: 'Initializes', returnHint: 'Returns initialized' },

  // Transform/Modify
  { prefix: 'trim', verb: 'Trims', returnHint: 'Returns trimmed' },
  { prefix: 'populate', verb: 'Populates', returnHint: 'Returns populated' },
  { prefix: 'merge', verb: 'Merges', returnHint: 'Returns merged' },
  { prefix: 'combine', verb: 'Combines', returnHint: 'Returns combined' },
  { prefix: 'split', verb: 'Splits', returnHint: 'Returns split' },
  { prefix: 'join', verb: 'Joins', returnHint: 'Returns joined' },
  { prefix: 'normalize', verb: 'Normalizes', returnHint: 'Returns normalized' },

  // Setup/Configuration
  { prefix: 'configure', verb: 'Configures', returnHint: 'Returns configured' },
  { prefix: 'setup', verb: 'Sets up', returnHint: 'Returns' },
  { prefix: 'register', verb: 'Registers', returnHint: 'Returns' },
  { prefix: 'enable', verb: 'Enables', returnHint: 'Returns' },
  { prefix: 'disable', verb: 'Disables', returnHint: 'Returns' },

  // Logging/Recording
  { prefix: 'log', verb: 'Logs', returnHint: 'Returns' },
  { prefix: 'record', verb: 'Records', returnHint: 'Returns' },
  { prefix: 'track', verb: 'Tracks', returnHint: 'Returns' },
  { prefix: 'report', verb: 'Reports', returnHint: 'Returns' },

  // Extraction/Selection
  { prefix: 'extract', verb: 'Extracts', returnHint: 'Returns extracted' },
  { prefix: 'select', verb: 'Selects', returnHint: 'Returns selected' },
  { prefix: 'choose', verb: 'Chooses', returnHint: 'Returns chosen' },
  { prefix: 'pick', verb: 'Picks', returnHint: 'Returns picked' },
];

export class SemanticFunctionPattern implements PatternModule {
  readonly id = 'shared.semantic-function-names';
  readonly priority = PatternPriority.SHARED_PRIMITIVES;

  matches(kb: KnowledgeBase, entity: Entity): boolean {
    // Only match function entities
    if (entity.kind !== 'function') {
      return false;
    }

    // Check if function name starts with any semantic prefix
    const name = entity.name.toLowerCase();
    return SEMANTIC_PATTERNS.some(pattern => name.startsWith(pattern.prefix));
  }

  describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
    const factSets = getFactSets(kb, entity);
    if (factSets.length === 0) {
      return [];
    }

    const pattern = this.findMatchingPattern(entity.name);
    if (!pattern) {
      return [];
    }

    const subject = this.extractSubject(entity.name, pattern.prefix);
    const params = this.extractParameters(kb, entity);
    const textDraft = this.generateDescription(pattern, subject, params);

    const factSetIds = factSets.map(fs => fs.id);

    return [{
      id: generateAnchor(entity.path, entity.name),
      targetEntityId: entity.id,
      textDraft,
      factSetIds,
      confidence: 'Medium' // Based on naming convention, not deep analysis
    }];
  }

  /**
   * Find the matching semantic pattern for the function name
   */
  private findMatchingPattern(name: string): typeof SEMANTIC_PATTERNS[0] | null {
    const nameLower = name.toLowerCase();
    return SEMANTIC_PATTERNS.find(p => nameLower.startsWith(p.prefix)) || null;
  }

  /**
   * Extract the subject from the function name (part after prefix)
   * Examples:
   * - getLatestDisclosure → "latest disclosure"
   * - isHealthCheck → "health check"
   * - updateContentProject → "content project"
   */
  private extractSubject(name: string, prefix: string): string {
    // Remove prefix
    let subject = name.slice(prefix.length);

    // Convert camelCase to space-separated words
    subject = subject.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

    return subject || 'data';
  }

  /**
   * Extract parameter names from KB facts
   */
  private extractParameters(kb: KnowledgeBase, entity: Entity): string[] {
    const factSets = getFactSets(kb, entity);

    for (const factSet of factSets) {
      const paramNamesFact = factSet.facts.find(f => f.predicate === 'param-names');
      if (paramNamesFact) {
        const paramsStr = String(paramNamesFact.object);
        return paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
      }
    }

    return [];
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(
    pattern: typeof SEMANTIC_PATTERNS[0],
    subject: string,
    params: string[]
  ): string {
    let description = `${pattern.verb} ${subject}`;

    // Add parameter context if available
    if (params.length > 0) {
      // Extract meaningful parameter names
    const meaningfulParams = params.filter(p =>
        !['req', 'res', 'next', 'callback', 'cb', 'options', 'opts'].includes(p.toLowerCase())
      );

      if (meaningfulParams.length > 0) {
        const paramList = meaningfulParams.slice(0, 2).join(' and ');
        description += ` based on ${paramList}`;
      }
    }

    description += '.';

    // Add note about inference method
    description += '\n\n*Note: Description inferred from function name. Specific implementation details may vary.*';

    return description;
  }

  confidenceAdjustments(kb: KnowledgeBase, entity: Entity) {
    // Pattern handles confidence internally (always Medium)
    return undefined;
  }
}
