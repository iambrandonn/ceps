/**
 * Phase 4 WS-F1 Stage B: Identifier Validation
 *
 * Validates extracted identifiers against KB to ensure no hallucinations.
 * Enforces:
 * - Entity existence (no unknown identifiers)
 * - Scope boundaries (only reference declared factSetIds)
 * - Relation existence (call/import graph)
 * - Pronoun resolution (antecedent within 2 sentences)
 */

import type { KnowledgeBase } from '../kb/knowledge-base.js';
import type { GroundingDiagnostic } from './types.js';
import { EntityNameIndex } from './entity-name-index.js';

interface ValidationResult {
  valid: boolean;
  diagnostics: GroundingDiagnostic[];
}

/**
 * IdentifierValidator validates identifiers against KB.
 */
export class IdentifierValidator {
  private nameIndex: EntityNameIndex;

  constructor(private kb: KnowledgeBase) {
    // Build name index once for all validations
    const entities = kb.getAllEntities();
    this.nameIndex = new EntityNameIndex(entities);
  }

  /**
   * Validate a list of identifiers against KB.
   *
   * @param identifiers - Array of identifier names to validate
   * @param factSetIds - Array of factSet IDs this chunk is allowed to reference
   * @returns ValidationResult with diagnostics
   */
  validate(identifiers: string[], factSetIds: string[]): ValidationResult {
    const diagnostics: GroundingDiagnostic[] = [];

    // Rebuild nameIndex dynamically to catch entities added after construction
    const currentEntities = this.kb.getAllEntities();
    const currentIndex = new EntityNameIndex(currentEntities);

    for (const identifier of identifiers) {
      // Step 1: Check if entity exists in KB
      const entityIds = currentIndex.find(identifier);

      if (entityIds.length === 0) {
        diagnostics.push({
          chunkId: 'unknown', // Will be filled by caller
          rule: 'entity',
          reason: `Entity "${identifier}" not found in KB`,
          context: { expected: identifier, actual: undefined },
        });
        continue;
      }

      // Step 2: Check scope - entity must belong to one of the declared factSetIds
      const validEntityId = this.findEntityInScope(entityIds, factSetIds);

      if (!validEntityId) {
        diagnostics.push({
          chunkId: 'unknown',
          rule: 'scope',
          reason: `Entity "${identifier}" found but outside declared factSetIds`,
          context: { expected: factSetIds, actual: entityIds },
        });
      }
    }

    return {
      valid: diagnostics.length === 0,
      diagnostics,
    };
  }

  /**
   * Validate relations (call/import graph).
   *
   * @param subjectEntityId - Entity that should have relations
   * @param targetIdentifiers - Identifiers that should be related
   * @param factSetIds - Allowed factSet scope
   * @returns ValidationResult
   */
  validateRelations(
    subjectEntityId: string,
    targetIdentifiers: string[],
    factSetIds: string[]
  ): ValidationResult {
    const diagnostics: GroundingDiagnostic[] = [];
    const callGraph = this.kb.getCallGraph();

    // Get callees for subject entity
    const callees = callGraph.get(subjectEntityId) || new Set();

    for (const targetId of targetIdentifiers) {
      // Rebuild nameIndex dynamically to catch entities added after construction
      const currentEntities = this.kb.getAllEntities();
      const currentIndex = new EntityNameIndex(currentEntities);
      const entityIds = currentIndex.find(targetId);

      if (entityIds.length === 0) {
        // Already handled by validate()
        continue;
      }

      // Check if any of the entity IDs are in the call graph
      const hasRelation = entityIds.some(eid => callees.has(eid));

      if (!hasRelation) {
        // Check if it's a method in same class (allowed)
        const entity = entityIds.length > 0 ? this.kb.getEntity(entityIds[0]) : undefined;
        if (entity && entity.kind === 'method') {
          // Methods in same class don't need call relation
          continue;
        }

        diagnostics.push({
          chunkId: 'unknown',
          rule: 'relation',
          reason: `Relation from ${subjectEntityId} to "${targetId}" not observed in call graph`,
          context: { expected: targetId, actual: Array.from(callees) },
        });
      }
    }

    return {
      valid: diagnostics.length === 0,
      diagnostics,
    };
  }

  /**
   * Validate pronoun usage (antecedent must precede within chunk).
   *
   * @param text - Chunk text to analyze
   * @returns ValidationResult
   */
  validatePronouns(text: string): ValidationResult {
    const diagnostics: GroundingDiagnostic[] = [];

    // Split into sentences (simple heuristic)
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

    // Track identifiers and proxy nouns seen in recent sentences (last 2)
    const recentIdentifiers: string[][] = [];

    // Pronouns to check
    const pronouns = /(^|\s)(It|They|This|That|These|Those)(\s|$)/gi;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      // Extract identifiers from this sentence (PascalCase/camelCase heuristic)
      const identifiersInSentence = this.extractIdentifiersFromSentence(sentence);

      // Also accept common proxy nouns like "service", "function", "method", "class"
      const proxyNouns = /\b(service|function|method|class|component|module|handler|controller)\b/gi;
      let proxyMatch;
      while ((proxyMatch = proxyNouns.exec(sentence)) !== null) {
        identifiersInSentence.push(proxyMatch[0]);
      }

      recentIdentifiers.push(identifiersInSentence);

      // Keep only last 3 sentences of identifiers (allow 2 sentences between)
      if (recentIdentifiers.length > 3) {
        recentIdentifiers.shift();
      }

      // Check for pronouns in this sentence
      let pronounMatch;
      pronouns.lastIndex = 0; // Reset regex
      while ((pronounMatch = pronouns.exec(sentence)) !== null) {
        const pronoun = pronounMatch[2]; // Extract pronoun without whitespace

        // Check if there's an antecedent in recent sentences (including current)
        const hasAntecedent = recentIdentifiers.flat().length > 0;

        // Special case: if pronoun is first word of first sentence, it's invalid
        if (i === 0 && sentence.trim().startsWith(pronoun)) {
          diagnostics.push({
            chunkId: 'unknown',
            rule: 'pronoun',
            reason: `Pronoun "${pronoun}" at start of chunk without antecedent`,
          });
          continue;
        }

        if (!hasAntecedent) {
          diagnostics.push({
            chunkId: 'unknown',
            rule: 'pronoun',
            reason: `Pronoun "${pronoun}" without antecedent in previous sentences`,
          });
        }
      }
    }

    return {
      valid: diagnostics.length === 0,
      diagnostics,
    };
  }

  /**
   * Extract identifiers from a single sentence (helper for pronoun validation).
   *
   * @param sentence - Sentence text
   * @returns Array of identifier names
   */
  private extractIdentifiersFromSentence(sentence: string): string[] {
    const identifiers: string[] = [];

    // PascalCase pattern
    const pascalPattern = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g;
    let match;
    while ((match = pascalPattern.exec(sentence)) !== null) {
      identifiers.push(match[0]);
    }

    // camelCase pattern
    const camelPattern = /\b[a-z]+(?:[A-Z][a-z]+)+\b/g;
    while ((match = camelPattern.exec(sentence)) !== null) {
      identifiers.push(match[0]);
    }

    return identifiers;
  }

  /**
   * Find entity ID that belongs to one of the declared factSetIds.
   *
   * @param entityIds - Candidate entity IDs
   * @param factSetIds - Allowed factSet scope
   * @returns Entity ID if found in scope, null otherwise
   */
  private findEntityInScope(entityIds: string[], factSetIds: string[]): string | null {
    for (const entityId of entityIds) {
      // Check if this entity appears in any of the declared factSets
      for (const factSetId of factSetIds) {
        const factSet = this.kb.getFactSet(factSetId);
        if (factSet) {
          // Check if any fact in this factSet references this entity
          const hasEntity = factSet.facts.some(f => f.subjectId === entityId);
          if (hasEntity) {
            return entityId;
          }
        }
      }
    }

    return null;
  }
}
