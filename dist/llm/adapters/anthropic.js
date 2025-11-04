/**
 * Agent 4: LLM Gateway - Anthropic Adapter
 *
 * CTS-02 §2 (Provider Adapters)
 *
 * Responsible for:
 * - Integration with Anthropic Claude API
 * - Token counting and cost estimation
 * - Usage tracking
 */
import Anthropic from '@anthropic-ai/sdk';
const MODEL_PRICING = {
    'claude-sonnet-4-5-20250929': {
        inputPerMillion: 3,
        outputPerMillion: 15
    },
    'claude-opus-4': {
        inputPerMillion: 15,
        outputPerMillion: 75
    },
    'claude-3-5-sonnet-20241022': {
        inputPerMillion: 3,
        outputPerMillion: 15
    }
};
export class AnthropicAdapter {
    client;
    defaultModel;
    lastUsage = null;
    constructor(apiKey, options = {}) {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API key is required');
        }
        this.client = new Anthropic({ apiKey });
        this.defaultModel = options.model || 'claude-sonnet-4-5-20250929';
    }
    /**
     * Get default model
     */
    getDefaultModel() {
        return this.defaultModel;
    }
    /**
     * Send prompt to Claude and get response
     */
    async completions(prompt, options = {}) {
        try {
            const model = options.model || this.defaultModel;
            const temperature = options.temperature ?? 0.3;
            const maxTokens = options.maxTokens || 4096;
            const params = {
                model,
                max_tokens: maxTokens,
                temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            };
            // Add system prompt if provided
            if (options.system) {
                params.system = options.system;
            }
            const response = await this.client.messages.create(params);
            // Extract text from response
            const text = response.content
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('\n');
            // Track usage
            const inputTokens = response.usage.input_tokens;
            const outputTokens = response.usage.output_tokens;
            const totalTokens = inputTokens + outputTokens;
            const costUSD = this.calculateCost(inputTokens, outputTokens, model);
            this.lastUsage = {
                inputTokens,
                outputTokens,
                totalTokens,
                costUSD
            };
            return text;
        }
        catch (error) {
            throw new Error(`Anthropic API error: ${error.message}`);
        }
    }
    /**
     * Estimate token count for text
     * Note: This is a rough estimate. Anthropic uses a different tokenizer.
     * Rough rule: ~4 characters per token for English text
     */
    countTokens(text) {
        if (!text || text.length === 0) {
            return 0;
        }
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    /**
     * Calculate cost in USD for token usage
     * @param inputTokens Number of input tokens
     * @param outputTokens Number of output tokens
     * @param model Model name
     * @returns Cost in USD
     */
    calculateCost(inputTokens, outputTokens, model) {
        const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929'];
        const inputCost = (inputTokens / 1000000) * pricing.inputPerMillion;
        const outputCost = (outputTokens / 1000000) * pricing.outputPerMillion;
        return inputCost + outputCost;
    }
    /**
     * Get usage statistics from last completion
     */
    getLastUsage() {
        return this.lastUsage;
    }
}
//# sourceMappingURL=anthropic.js.map