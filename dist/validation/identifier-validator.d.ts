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
interface ValidationResult {
    valid: boolean;
    diagnostics: GroundingDiagnostic[];
}
/**
 * IdentifierValidator validates identifiers against KB.
 */
export declare class IdentifierValidator {
    private kb;
    private nameIndex;
    constructor(kb: KnowledgeBase);
    /**
     * Validate a list of identifiers against KB.
     *
     * @param identifiers - Array of identifier names to validate
     * @param factSetIds - Array of factSet IDs this chunk is allowed to reference
     * @returns ValidationResult with diagnostics
     */
    validate(identifiers: string[], factSetIds: string[]): ValidationResult;
    /**
     * Validate relations (call/import graph).
     *
     * @param subjectEntityId - Entity that should have relations
     * @param targetIdentifiers - Identifiers that should be related
     * @param factSetIds - Allowed factSet scope
     * @returns ValidationResult
     */
    validateRelations(subjectEntityId: string, targetIdentifiers: string[], factSetIds: string[]): ValidationResult;
    /**
     * Validate pronoun usage (antecedent must precede within chunk).
     *
     * @param text - Chunk text to analyze
     * @returns ValidationResult
     */
    validatePronouns(text: string): ValidationResult;
    /**
     * Extract identifiers from a single sentence (helper for pronoun validation).
     *
     * @param sentence - Sentence text
     * @returns Array of identifier names
     */
    private extractIdentifiersFromSentence;
    /**
     * Find entity ID that belongs to one of the declared factSetIds.
     *
     * @param entityIds - Candidate entity IDs
     * @param factSetIds - Allowed factSet scope
     * @returns Entity ID if found in scope, null otherwise
     */
    private findEntityInScope;
}
export {};
//# sourceMappingURL=identifier-validator.d.ts.map