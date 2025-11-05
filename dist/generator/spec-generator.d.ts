/**
 * Agent 3: Spec Generator - Main Generator
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Steps 3.2-3.3
 *
 * Responsible for:
 * - Generating root spec.md (overview, conventions, index)
 * - Generating per-directory spec.md files
 * - Handling monorepo packages (per-package specs)
 * - Grouping entities by file and directory
 * - Including style kit conventions
 *
 * IMPORTANT: Constructor signature is:
 *   constructor(kb: KnowledgeBase, fileIndex?: FileIndex)
 */
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { FileIndex } from '../types/index.js';
import type { LLMGateway } from '../llm/gateway.js';
import type { BudgetTracker } from '../llm/budget.js';
import type { Validator } from '../validation/types.js';
export interface GeneratorOptions {
    llmEnabled?: boolean;
    deterministicMode?: boolean;
    llmGateway?: LLMGateway;
    validator?: Validator;
    budgetTracker?: BudgetTracker;
}
export interface GeneratorMetrics {
    llmPolished: number;
    templateFallback: number;
    budgetExhausted: boolean;
    warnings: string[];
}
export declare class SpecGenerator {
    private kb;
    private renderer;
    private fileIndex?;
    private llmGateway?;
    private validator?;
    private budgetTracker?;
    private llmEnabled;
    private deterministicMode;
    private metrics;
    constructor(kb: KnowledgeBase, fileIndex?: FileIndex, options?: GeneratorOptions);
    /**
     * Get generator metrics
     */
    getMetrics(): GeneratorMetrics;
    /**
     * Generate root spec.md content
     */
    generateRootSpec(projectRoot: string): string;
    /**
     * Generate per-directory or per-package spec.md files
     * Returns a map of file paths to markdown content
     */
    generateDirectorySpecs(projectRoot: string): Record<string, string>;
    /**
     * Get list of directories containing exported entities
     */
    private getDirectories;
    /**
     * Group entities by file path
     */
    private groupByFile;
    /**
     * Async version of generateDirectorySpecs with LLM polish support
     */
    generateDirectorySpecsAsync(projectRoot: string): Promise<Record<string, string>>;
    /**
     * Render entity with optional LLM polish
     */
    private renderEntityWithLLM;
    /**
     * Generate template draft from entity (deterministic template output)
     */
    private generateChunkDraft;
    /**
     * Apply LLM polish to chunk with budget/validator integration and retry logic
     */
    private applyLLMPolish;
    /**
     * Map numeric confidence to band
     */
    private mapConfidenceBand;
}
//# sourceMappingURL=spec-generator.d.ts.map