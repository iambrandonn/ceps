# src/llm/adapters

**Directory Overview:** This directory contains 12 entities.

## anthropic.ts

<a id="kiKEC0GVsa"></a>

### AnthropicAdapter

**Visibility:** Public (exported)

This class represents anthropic adapter.

<a id="mxn0Ysj4sF"></a>

### getDefaultModel

**Signature:** `(): string`

**Visibility:** Public (exported)

This method retrieves data.

<a id="oFDTBUIWK2"></a>

### completions

**Signature:** `(prompt: string, options: CompletionOptions = {}): Promise<string>`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new Error(`Anthropic API error: ${(error as Error).message}`);

<a id="BWOOseJ6yQ"></a>

### countTokens

**Signature:** `(text: string): number`

**Visibility:** Public (exported)

This method performs an operation.

<a id="Vh2O27Du0j"></a>

### calculateCost

**Signature:** `(inputTokens: number, outputTokens: number, model: string): number`

**Visibility:** Public (exported)

This method computes values.

<a id="UIE6RLiET8"></a>

### getLastUsage

**Signature:** `(): import("/src/llm/adapters/anthropic").TokenUsage`

**Visibility:** Public (exported)

This method retrieves data.

## openai.ts

<a id="44ZnbbzSsh"></a>

### OpenAIAdapter

**Visibility:** Public (exported)

This class represents open a i adapter.

<a id="1XljSHeaCO"></a>

### getDefaultModel

**Signature:** `(): string`

**Visibility:** Public (exported)

This method retrieves data.

<a id="3iqYiV60Nk"></a>

### completions

**Signature:** `(prompt: string, options: CompletionOptions = {}): Promise<string>`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new Error(`OpenAI API error: ${(error as Error).message}`);

<a id="N1J6IiYs3e"></a>

### countTokens

**Signature:** `(text: string): number`

**Visibility:** Public (exported)

This method performs an operation.

<a id="L83wrRAWdf"></a>

### calculateCost

**Signature:** `(inputTokens: number, outputTokens: number, model: string): number`

**Visibility:** Public (exported)

This method computes values.

<a id="Sb5yer4Kz4"></a>

### getLastUsage

**Signature:** `(): import("/src/llm/adapters/openai").TokenUsage`

**Visibility:** Public (exported)

This method retrieves data.

