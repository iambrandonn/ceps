/**
 * Phase 3 Step 6: Cross-Link Validator
 *
 * Two-phase validation:
 * 1. Pre-generation: Check 100% coverage of exported entities (BehaviorChunks or QIDs)
 * 2. Post-generation: Check all cross-reference links resolve to valid anchors
 *
 * Based on Phase -1 analysis of upstream components:
 * - Anchors are HTML tags: <a id="entity-id"></a>
 * - Cross-links are markdown: [text](#anchor)
 * - QIDs count as valid coverage (Low confidence entities)
 */
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { ValidationResult, SpecFile, Anchor } from './types.js';
export declare class CrossLinkValidator {
    private kb;
    constructor(kb: KnowledgeBase);
    /**
     * Pre-generation validation: Check coverage of exported entities.
     *
     * Every exported entity must have:
     * - At least one BehaviorChunk (High/Medium/Low confidence), OR
     * - At least one OpenQuestion (Low confidence with QID)
     *
     * Returns validation result with coverage percentage and missing entity IDs.
     */
    validatePreGeneration(): ValidationResult;
    /**
     * Build anchor map from generated spec files.
     *
     * Extracts HTML anchor tags emitted by Phase 2 MarkdownRenderer:
     *   <a id="entity-id"></a>
     *
     * Returns map keyed by entity.id (NOT entity.name) for uniqueness.
     */
    buildAnchorMap(specFiles: SpecFile[]): Map<string, Anchor>;
    /**
     * Post-generation validation: Check all cross-reference links resolve.
     *
     * Finds markdown links: [text](#anchor)
     * Validates each anchor target exists in the anchor map.
     * Returns broken links with file path and line number.
     */
    validatePostGeneration(specFiles: SpecFile[], anchorMap: Map<string, Anchor>): ValidationResult;
}
//# sourceMappingURL=cross-link-validator.d.ts.map