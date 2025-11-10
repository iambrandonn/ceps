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
export declare class SemanticFunctionPattern implements PatternModule {
    readonly id = "shared.semantic-function-names";
    readonly priority = PatternPriority.SHARED_PRIMITIVES;
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Find the matching semantic pattern for the function name
     */
    private findMatchingPattern;
    /**
     * Extract the subject from the function name (part after prefix)
     * Examples:
     * - getLatestDisclosure → "latest disclosure"
     * - isHealthCheck → "health check"
     * - updateContentProject → "content project"
     */
    private extractSubject;
    /**
     * Extract parameter names from KB facts
     */
    private extractParameters;
    /**
     * Generate human-readable description
     */
    private generateDescription;
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): undefined;
}
//# sourceMappingURL=semantic-function-names.d.ts.map