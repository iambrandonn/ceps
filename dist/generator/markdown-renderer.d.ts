/**
 * Agent 3: Spec Generator - Markdown Renderer
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Step 3.1
 *
 * Responsible for:
 * - Rendering entities as Markdown sections
 * - Including anchors for cross-linking
 * - Rendering side effects, errors, signatures
 * - Using style kit lexicon (active voice, present tense)
 * - Generating template prose (no LLM polish yet)
 */
import { Entity, BehaviorChunk, OpenQuestion } from '../kb/models.js';
export declare class MarkdownRenderer {
    /**
     * Renders an entity as a Markdown section
     * @param entity - Entity to render
     * @param chunks - Optional behavior chunks (if available)
     * @param openQuestions - Optional Open Question list (for unresolved QIDs)
     * @returns Markdown string
     */
    renderEntity(entity: Entity, chunks?: BehaviorChunk[], openQuestions?: OpenQuestion[]): string;
    /**
     * Generate template prose from entity metadata
     * Uses heuristics based on entity name and kind
     */
    private generateTemplateProse;
    /**
     * Infer purpose from function/method name using heuristics
     */
    private inferPurpose;
    /**
     * Convert camelCase/PascalCase to human-readable
     */
    private humanizeName;
}
//# sourceMappingURL=markdown-renderer.d.ts.map