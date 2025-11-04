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
import type { CompletionOptions } from './adapters/anthropic';
import { UsageStats } from './budget';
export type Provider = 'anthropic' | 'openai';
export interface GatewayOptions {
    anthropicApiKey?: string;
    openaiApiKey?: string;
    provider?: Provider;
    budgetTokens?: number;
    enableCache?: boolean;
    cacheTTLMs?: number;
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
    getCacheStats(): import("./cache").CacheStats;
    /**
     * Clear cache
     */
    clearCache(): void;
}
//# sourceMappingURL=gateway.d.ts.map