/**
 * Agent 4: LLM Gateway - OpenAI Adapter
 *
 * CTS-02 §2 (Provider Adapters)
 *
 * Responsible for:
 * - Integration with OpenAI API
 * - Token counting and cost estimation
 * - Usage tracking
 */
export interface CompletionOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    system?: string;
}
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUSD: number;
}
export declare class OpenAIAdapter {
    private client;
    private defaultModel;
    private lastUsage;
    constructor(apiKey: string, options?: {
        model?: string;
    });
    /**
     * Get default model
     */
    getDefaultModel(): string;
    /**
     * Send prompt to OpenAI and get response
     */
    completions(prompt: string, options?: CompletionOptions): Promise<string>;
    /**
     * Estimate token count for text
     * Note: This is a rough estimate. OpenAI uses tiktoken.
     * Rough rule: ~4 characters per token for English text
     */
    countTokens(text: string): number;
    /**
     * Calculate cost in USD for token usage
     */
    calculateCost(inputTokens: number, outputTokens: number, model: string): number;
    /**
     * Get usage statistics from last completion
     */
    getLastUsage(): TokenUsage | null;
}
//# sourceMappingURL=openai.d.ts.map