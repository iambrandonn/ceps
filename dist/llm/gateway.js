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
import { AnthropicAdapter } from './adapters/anthropic';
import { OpenAIAdapter } from './adapters/openai';
import { LLMCache } from './cache';
import { BudgetTracker } from './budget';
export class LLMGateway {
    adapters = {};
    currentProvider;
    cache;
    budget;
    cacheEnabled;
    constructor(options) {
        // Validate at least one API key is provided
        if (!options.anthropicApiKey && !options.openaiApiKey) {
            throw new Error('At least one provider API key is required');
        }
        // Initialize adapters
        if (options.anthropicApiKey) {
            this.adapters['anthropic'] = new AnthropicAdapter(options.anthropicApiKey);
        }
        if (options.openaiApiKey) {
            this.adapters['openai'] = new OpenAIAdapter(options.openaiApiKey);
        }
        // Set current provider
        if (options.provider) {
            if (!this.adapters[options.provider]) {
                throw new Error(`Provider ${options.provider} is not configured`);
            }
            this.currentProvider = options.provider;
        }
        else {
            // Default to anthropic if available, otherwise openai
            this.currentProvider = options.anthropicApiKey ? 'anthropic' : 'openai';
        }
        // Initialize cache
        this.cacheEnabled = options.enableCache !== false;
        this.cache = new LLMCache({ ttlMs: options.cacheTTLMs });
        // Initialize budget tracker
        const budgetLimit = options.budgetTokens !== undefined ? options.budgetTokens : 1000000;
        this.budget = new BudgetTracker(budgetLimit);
    }
    /**
     * Get current provider name
     */
    getCurrentProvider() {
        return this.currentProvider;
    }
    /**
     * Switch to a different provider
     */
    setProvider(provider) {
        if (!this.adapters[provider]) {
            throw new Error(`Provider ${provider} is not configured`);
        }
        this.currentProvider = provider;
    }
    /**
     * Send prompt and get response
     */
    async completions(prompt, options = {}) {
        // Check budget before making API call
        if (!this.budget.checkBudget()) {
            throw new Error('Token budget exceeded');
        }
        const adapter = this.adapters[this.currentProvider];
        const model = options.model || adapter.getDefaultModel?.() || 'default';
        // Generate cache key
        const cacheKey = this.cache.generateCacheKey(prompt + JSON.stringify(options), model, 'ceps-style-1.0');
        // Check cache if enabled
        if (this.cacheEnabled) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        // Make API call
        const response = await adapter.completions(prompt, options);
        // Get usage from adapter
        const usage = adapter.getLastUsage?.();
        if (usage) {
            this.budget.recordUsage(this.currentProvider, usage.totalTokens, usage.inputTokens, usage.outputTokens, usage.costUSD);
        }
        // Cache response if enabled
        if (this.cacheEnabled) {
            this.cache.set(cacheKey, response);
        }
        return response;
    }
    /**
     * Check if budget allows more requests
     */
    checkBudget() {
        return this.budget.checkBudget();
    }
    /**
     * Get remaining budget in tokens
     */
    getRemainingBudget() {
        return this.budget.getRemainingBudget();
    }
    /**
     * Get usage statistics
     */
    getUsage() {
        return this.budget.getUsage();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=gateway.js.map