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
    /**
     * Summarize factSets into fluent prose (CTS-02 §6)
     *
     * @param factSets - Array of factSets to summarize
     * @param style - Style guide version (e.g., 'spec-ready')
     * @param options - Summarization options
     * @returns Promise resolving to summarized text
     */
    async summarize(factSets, style, options = {}) {
        // Build prompt from factSets
        const prompt = this.buildSummarizePrompt(factSets, style, options);
        // Prepare completion options
        const completionOptions = {
            model: options.model,
            temperature: options.deterministic ? 0 : (options.temperature ?? 0.3),
        };
        // Delegate to completions() method
        return this.completions(prompt, completionOptions);
    }
    /**
     * Build prompt for summarize() operation
     * Differentiates prompts based on promptKey (O/R1/R2) per CTS-02 §4.4
     * @private
     */
    buildSummarizePrompt(factSets, style, options) {
        // Format factSets as structured data
        const factsText = factSets
            .map((fs, idx) => {
            const factsFormatted = fs.facts
                .map((f) => `  - ${f.subjectId} ${f.predicate}${f.object !== undefined ? ` ${JSON.stringify(f.object)}` : ''}`)
                .join('\n');
            return `FactSet ${idx + 1} (id: ${fs.id}, evidence: ${fs.evidenceScore}):\n${factsFormatted}`;
        })
            .join('\n\n');
        // Format guidance from previous validation failures
        const guidanceText = options.guidance && options.guidance.length > 0
            ? `\nPrevious validation failures:\n${options.guidance.map((g) => `- ${g}`).join('\n')}\n`
            : '';
        // Differentiate prompts based on promptKey (CTS-02 §4.4)
        switch (options.promptKey) {
            case 'R2':
                // Strictest: Bullet-only, exact canonical names, no inference
                return `OUTPUT BULLETS ONLY. Use EXACT canonical names from facts.
Include ONLY numbers/enums explicitly present.
NO synonyms. NO inference. NO new entities.
If missing critical info: emit NEEDS_QUESTION.
${guidanceText}
Facts:
${factsText}

Output (bullets only):`;
            case 'R1':
                // Stricter: Bullet format, canonical names, strict enumeration
                return `Output **bullets only**. Use exact canonical names from FACTS (no synonyms).
Include only numbers/enums from FACTS.
No new entities/relations. If missing info, emit NEEDS_QUESTION.
${guidanceText}
Facts:
${factsText}

Output:`;
            case 'O':
            default:
                // Original: Paragraph format, reasonable paraphrasing
                return `Write a concise paragraph describing the behavior using only the facts provided.
Use canonical names; do not add entities, relations, or numbers not present in the facts.
If unsure, return NEEDS_QUESTION.

Style: ${style}
${options.deterministic ? 'Mode: Deterministic (no paraphrasing variance)\n' : ''}
Facts:
${factsText}

Output:`;
        }
    }
}
//# sourceMappingURL=gateway.js.map