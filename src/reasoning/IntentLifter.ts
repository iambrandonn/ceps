/**
 * Phase 3 Step 3: IntentLifter (Updated for Phase 6)
 *
 * Converts factSets to BehaviorChunks with human-readable text.
 * Uses PatternMatcher (Phase 3) OR PatternRegistry (Phase 6) to detect framework patterns.
 * Computes confidence using KB.scoreConfidence() API.
 *
 * Phase 6 Enhancement:
 * - Accepts optional PatternRegistry for advanced pattern detection
 * - Falls back to legacy PatternMatcher if registry not provided
 * - Preserves backward compatibility for Phase 3 tests
 */

import { KnowledgeBase } from '../kb/knowledge-base.js';
import { FactSet, BehaviorChunk, Entity } from '../kb/models.js';
import { PatternMatcher, Pattern } from './PatternMatcher.js';
import { PatternRegistry } from './patterns/pattern-registry.js';
import { generateAnchor } from '../kb/id-generation.js';

export class IntentLifter {
  private chunkIds = new Set<string>();

  constructor(
    private kb: KnowledgeBase,
    private matcher: PatternMatcher,
    private registry?: PatternRegistry  // Phase 6: Optional new pattern system
  ) {}

  /**
   * Lift factSets into a BehaviorChunk with human-readable intent.
   *
   * Phase 6 Update: Tries PatternRegistry first (entity-based), falls back to PatternMatcher.
   *
   * @param factSetIds - Array of factSet IDs to lift (typically one per entity)
   * @returns BehaviorChunk with textDraft, confidence, and factSetIds
   */
  liftIntent(factSetIds: string[]): BehaviorChunk {
    if (factSetIds.length === 0) {
      throw new Error('No factSets provided');
    }

    // Get first factSet to extract entity info
    const factSet = this.kb.getFactSet(factSetIds[0]);
    if (!factSet) {
      throw new Error(`FactSet ${factSetIds[0]} not found`);
    }

    const subjectId = this.getSubjectId(factSet);
    const entity = this.kb.getEntity(subjectId);
    if (!entity) {
      throw new Error(`Entity ${subjectId} not found`);
    }

    // Phase 6: Try new PatternRegistry first (entity-based patterns)
    if (this.registry) {
      const registryChunks = this.registry.describe(this.kb, entity);
      if (registryChunks.length > 0) {
        // Registry generated chunks directly - use first one
        return registryChunks[0];
      }

      // Also apply confidence adjustments if available
      const delta = this.registry.getConfidenceAdjustments(this.kb, entity);
      if (delta) {
        // Registry matched but describe() returned empty - fall through to legacy
        // but apply delta to base score later
      }
    }

    // Phase 3 fallback: Try to match against framework patterns (factSet-based)
    const pattern = this.matcher.match(factSet);

    // Generate human-readable text
    const textDraft = pattern
      ? this.buildPatternBasedText(entity, pattern, factSet)
      : this.buildGenericText(entity, factSet);

    // Compute confidence with pattern bonus
    // Base confidence from KB (framework-agnostic)
    let baseScore = this.kb.getConfidenceScore(factSetIds);

    // Add pattern bonus if framework pattern detected
    if (pattern) {
      baseScore += pattern.confidence;
      baseScore = Math.min(baseScore, 100);  // Clamp to max
    }

    // Phase 6: Apply registry confidence adjustments if no pattern matched
    if (!pattern && this.registry) {
      const delta = this.registry.getConfidenceAdjustments(this.kb, entity);
      if (delta) {
        baseScore += delta.adjustment;
        baseScore = Math.min(baseScore, 100);
      }
    }

    // Convert final score to confidence band
    const confidence = this.kb.scoreToConfidenceBand(baseScore);

    // Generate unique chunk ID
    const chunkId = this.generateChunkId(entity);

    return {
      id: chunkId,
      targetEntityId: subjectId,
      textDraft,
      confidence,
      factSetIds,
    };
  }

  /**
   * Build text description based on detected pattern.
   * Incorporates JSDoc if available.
   */
  private buildPatternBasedText(entity: Entity, pattern: Pattern, factSet: FactSet): string {
    const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
    const summary = jsDoc ? String(jsDoc.object) : '';

    let text = pattern.intent;
    if (summary) {
      text += `. ${summary}`;
    }

    return text;
  }

  /**
   * Build generic text description when no pattern matches.
   * Falls back to JSDoc or generic placeholder.
   *
   * Enhancement (Phase 6 Wave 2): Infers behavior from call patterns when JSDoc absent.
   * This significantly reduces "intent unclear" fallback by detecting common utility patterns.
   */
  private buildGenericText(entity: Entity, factSet: FactSet): string {
    const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
    const summary = jsDoc ? String(jsDoc.object) : null;

    if (summary) {
      return `${this.getEntityKindLabel(entity.kind)} ${entity.name}: ${summary}`;
    }

    // Try to infer from call patterns before falling back to "intent unclear"
    const inferredBehavior = this.inferFromCallPatterns(entity, factSet);
    if (inferredBehavior) {
      return `${this.getEntityKindLabel(entity.kind)} ${entity.name}: ${inferredBehavior}`;
    }

    // No JSDoc or patterns - return generic description
    return `${this.getEntityKindLabel(entity.kind)} ${entity.name} (intent unclear from static analysis)`;
  }

  /**
   * Infer behavioral description from call patterns and parameter names.
   *
   * Phase 6 Wave 2 Enhancement: This lightweight heuristic system provides basic
   * behavioral descriptions when JSDoc is absent and no framework patterns match.
   *
   * Detected Patterns:
   * - Array operations: filter, map, reduce, find, some, every, sort
   * - Comparison functions: parameter names like (previous, current) or (old, new)
   * - Validation functions: boolean return + is/has/validate/check prefix
   * - Getter/setter patterns: get*, set*, update*, with*, create* prefixes
   * - Iteration: forEach loops
   * - Object operations: assign, merge
   *
   * Priority: Checks parameter-based patterns first (more specific), then call-based.
   *
   * @param entity - Entity being analyzed
   * @param factSet - Facts about the entity
   * @returns Inferred description or null if no patterns detected
   */
  private inferFromCallPatterns(entity: Entity, factSet: FactSet): string | null {
    // Extract calls and parameters
    const calls = factSet.facts
      .filter(f => f.predicate === 'calls-expression')
      .map(f => String(f.object));

    const paramNames = factSet.facts.find(f => f.predicate === 'param-names');
    const params = paramNames ? String(paramNames.object).toLowerCase() : '';

    // Pattern 1: Comparison/diffing functions (HIGHEST PRIORITY - more specific than array ops)
    // Check parameter names first as this is highly indicative of comparison logic
    if ((params.includes('prev') && params.includes('current')) ||
        (params.includes('old') && params.includes('new')) ||
        (params.includes('previous') && params.includes('current'))) {
      return 'Compares data between versions or states';
    }

    // Pattern 2: Array transformation patterns (most common in utility code)
    if (calls.includes('filter') && calls.includes('map')) {
      return 'Filters and transforms array data';
    }
    if (calls.includes('map') && calls.includes('flatMap')) {
      return 'Transforms and flattens nested array data';
    }
    if (calls.includes('map')) {
      return 'Transforms array elements';
    }
    if (calls.includes('filter')) {
      return 'Filters array based on criteria';
    }
    if (calls.includes('reduce')) {
      return 'Aggregates array data into a single value';
    }
    if (calls.includes('find')) {
      return 'Searches for matching element in collection';
    }
    if (calls.includes('some')) {
      return 'Checks if any elements match criteria';
    }
    if (calls.includes('every')) {
      return 'Checks if all elements match criteria';
    }

    // Pattern 3: Sorting and ordering
    if (calls.includes('sort') || calls.includes('orderBy')) {
      return 'Sorts collection by criteria';
    }

    // Pattern 4: Validation functions (boolean return + validation-y names)
    const paramCount = factSet.facts.find(f => f.predicate === 'param-count');
    const isReturningBool = entity.signature?.includes(': boolean') ||
                            entity.signature?.includes(': any'); // any might be bool
    if (isReturningBool && (
        entity.name.startsWith('is') ||
        entity.name.startsWith('has') ||
        entity.name.startsWith('validate') ||
        entity.name.startsWith('check'))) {
      return 'Validates or checks a condition';
    }

    // Pattern 5: Getter/setter/with patterns (common functional patterns)
    if (entity.name.startsWith('get') && paramCount && Number(paramCount.object) <= 2) {
      return 'Retrieves data or value';
    }
    if (entity.name.startsWith('set') || entity.name.startsWith('update')) {
      return 'Updates or modifies data';
    }
    if (entity.name.startsWith('with')) {
      return 'Enhances or augments data with additional information';
    }
    if (entity.name.startsWith('create')) {
      return 'Creates or constructs a new instance';
    }

    // Pattern 6: forEach/iteration patterns (side-effect operations)
    if (calls.includes('forEach')) {
      return 'Iterates over collection and performs operations';
    }

    // Pattern 7: Object merging/assignment
    if (calls.includes('assign') || calls.includes('merge')) {
      return 'Merges or combines objects';
    }

    // No recognizable patterns
    return null;
  }

  /**
   * Get human-readable label for entity kind.
   */
  private getEntityKindLabel(kind: string): string {
    switch (kind) {
      case 'function':
        return 'Function';
      case 'class':
        return 'Class';
      case 'method':
        return 'Method';
      case 'constant':
        return 'Constant';
      case 'variable':
        return 'Variable';
      case 'interface':
        return 'Interface';
      case 'type':
        return 'Type';
      case 'endpoint':
        return 'Endpoint';
      default:
        return 'Entity';
    }
  }

  /**
   * Extract subject ID from factSet (first fact's subjectId).
   */
  private getSubjectId(factSet: FactSet): string {
    if (factSet.facts.length === 0) {
      throw new Error('Empty factSet');
    }
    return factSet.facts[0].subjectId;
  }

  /**
   * Generate unique chunk ID based on entity.
   * Uses content-based anchor to ensure determinism.
   */
  private generateChunkId(entity: Entity): string {
    // Use entity name and kind as content (deterministic)
    const content = `${entity.kind}-${entity.name}-${entity.path}`;
    const chunkId = generateAnchor('chunk', content, this.chunkIds);
    this.chunkIds.add(chunkId);
    return chunkId;
  }
}
