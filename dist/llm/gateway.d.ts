/**
 * Agent 4: LLM Gateway - Main Gateway
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Agent 4
 * CTS-02 (LLM Gateway)
 *
 * Responsible for:
 * - Provider-agnostic LLM interface
 * - Adapter management (Anthropic, OpenAI)
 * - Caching and budget tracking
 * - Prompt formatting
 *
 * NOTE: Phase 2 is skeleton only (no grounding validator yet)
 * Grounding Validator will be added in Phase 4
 */
import type { CompletionOptions } from './adapters/anthropic.js';
import { UsageStats } from './budget.js';
import type { FactSet } from '../kb/models.js';
export type Provider = 'anthropic' | 'openai';
export interface GatewayOptions {
    anthropicApiKey?: string;
    openaiApiKey?: string;
    provider?: Provider;
    budgetTokens?: number;
    enableCache?: boolean;
    cacheTTLMs?: number;
}
export interface SummarizeOptions {
    deterministic?: boolean;
    model?: string;
    temperature?: number;
    promptKey?: 'O' | 'R1' | 'R2';
    guidance?: string[];
}
export declare class LLMGateway {
    private adapters;
    private currentProvider;
    private cache;
    private budget;
    private cacheEnabled;
    constructor(options: GatewayOptions);
    /**
     * Get current provider name
     */
    getCurrentProvider(): Provider;
    /**
     * Switch to a different provider
     */
    setProvider(provider: Provider): void;
    /**
     * Send prompt and get response
     */
    completions(prompt: string, options?: CompletionOptions): Promise<string>;
    /**
     * Check if budget allows more requests
     */
    checkBudget(): boolean;
    /**
     * Get remaining budget in tokens
     */
    getRemainingBudget(): number;
    /**
     * Get usage statistics
     */
    getUsage(): UsageStats;
    /**
     * Get cache statistics
     */
    getCacheStats(): import("./cache.js").CacheStats;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Summarize factSets into fluent prose (CTS-02 §6)
     *
     * @param factSets - Array of factSets to summarize
     * @param style - Style guide version (e.g., 'spec-ready')
     * @param options - Summarization options
     * @returns Promise resolving to summarized text
     */
    summarize(factSets: FactSet[], style: string, options?: SummarizeOptions): Promise<string>;
    /**
     * Polish a low-confidence chunk using LLM assistance (Phase 6 Quality Improvement)
     *
     * Takes a template-generated description and enhances it with LLM-based inference
     * while staying grounded in the provided factSets.
     *
     * @param draftText - Template-generated text (e.g., "Function foo (intent unclear from static analysis)")
     * @param entity - The entity being described
     * @param factSets - Array of factSets providing evidence
     * @returns Promise resolving to polished, meaningful description
     */
    polish(draftText: string, entity: {
        id: string;
        kind: string;
        name: string;
        path: string;
    }, factSets: FactSet[]): Promise<string>;
    /**
     * Build prompt for polish() operation
     * @private
     */
    private buildPolishPrompt;
    /**
     * Build prompt for summarize() operation
     * Differentiates prompts based on promptKey (O/R1/R2) per CTS-02 §4.4
     * @private
     */
    private buildSummarizePrompt;
}
//# sourceMappingURL=gateway.d.ts.map