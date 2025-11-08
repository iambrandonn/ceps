# src/llm/adapters

**Directory Overview:** This directory contains 12 entities.

## anthropic.ts

<a id="kiKEC0GVsa"></a>

### AnthropicAdapter

**Visibility:** Public (exported)

**Behavior:**

- Class AnthropicAdapter (intent unclear from static analysis)

**Open Questions:**
- q:wfOAMgPmPV: What are the responsibilities and contract of class `AnthropicAdapter` at src/llm/adapters/anthropic.ts?

<a id="mxn0Ysj4sF"></a>

### getDefaultModel

**Signature:** `(): string`

**Visibility:** Public (exported)

**Behavior:**

- Method getDefaultModel (intent unclear from static analysis)

**Open Questions:**
- q:uGSlo7BG67: What is the behavior of method `getDefaultModel` at src/llm/adapters/anthropic.ts?

<a id="oFDTBUIWK2"></a>

### completions

**Signature:** `(prompt: string, options: CompletionOptions = {}): Promise<string>`

**Visibility:** Public (exported)

**Behavior:**

- Performs Mongoose write query (create): messages (model not resolved).

**Errors thrown:**
- new Error(`Anthropic API error: ${(error as Error).message}`);

**Open Questions:**
- q:0HxIEAcghK: What is the behavior of method `completions` at src/llm/adapters/anthropic.ts?

<a id="BWOOseJ6yQ"></a>

### countTokens

**Signature:** `(text: string): number`

**Visibility:** Public (exported)

**Behavior:**

- Method countTokens (intent unclear from static analysis)

**Open Questions:**
- q:tAW1qa6oTB: What is the behavior of method `countTokens` at src/llm/adapters/anthropic.ts?

<a id="Vh2O27Du0j"></a>

### calculateCost

**Signature:** `(inputTokens: number, outputTokens: number, model: string): number`

**Visibility:** Public (exported)

**Behavior:**

- Method calculateCost (intent unclear from static analysis)

**Open Questions:**
- q:T0aHH3HwmA: What is the behavior of method `calculateCost` at src/llm/adapters/anthropic.ts?

<a id="UIE6RLiET8"></a>

### getLastUsage

**Signature:** `(): import("/src/llm/adapters/anthropic").TokenUsage`

**Visibility:** Public (exported)

**Behavior:**

- Method getLastUsage (intent unclear from static analysis)

**Open Questions:**
- q:FwO6JrNgfd: What is the behavior of method `getLastUsage` at src/llm/adapters/anthropic.ts?

## openai.ts

<a id="44ZnbbzSsh"></a>

### OpenAIAdapter

**Visibility:** Public (exported)

**Behavior:**

- Class OpenAIAdapter (intent unclear from static analysis)

**Open Questions:**
- q:3ZFxVT2D4I: What are the responsibilities and contract of class `OpenAIAdapter` at src/llm/adapters/openai.ts?

<a id="1XljSHeaCO"></a>

### getDefaultModel

**Signature:** `(): string`

**Visibility:** Public (exported)

**Behavior:**

- Method getDefaultModel (intent unclear from static analysis)

**Open Questions:**
- q:adkSCAJZPA: What is the behavior of method `getDefaultModel` at src/llm/adapters/openai.ts?

<a id="3iqYiV60Nk"></a>

### completions

**Signature:** `(prompt: string, options: CompletionOptions = {}): Promise<string>`

**Visibility:** Public (exported)

**Behavior:**

- Performs Mongoose write query (create): completions (model not resolved).

**Errors thrown:**
- new Error(`OpenAI API error: ${(error as Error).message}`);

**Open Questions:**
- q:dwc2c8PABr: What is the behavior of method `completions` at src/llm/adapters/openai.ts?

<a id="N1J6IiYs3e"></a>

### countTokens

**Signature:** `(text: string): number`

**Visibility:** Public (exported)

**Behavior:**

- Method countTokens (intent unclear from static analysis)

**Open Questions:**
- q:OUjfNBLgKU: What is the behavior of method `countTokens` at src/llm/adapters/openai.ts?

<a id="L83wrRAWdf"></a>

### calculateCost

**Signature:** `(inputTokens: number, outputTokens: number, model: string): number`

**Visibility:** Public (exported)

**Behavior:**

- Method calculateCost (intent unclear from static analysis)

**Open Questions:**
- q:WXBwbXRdvU: What is the behavior of method `calculateCost` at src/llm/adapters/openai.ts?

<a id="Sb5yer4Kz4"></a>

### getLastUsage

**Signature:** `(): import("/src/llm/adapters/openai").TokenUsage`

**Visibility:** Public (exported)

**Behavior:**

- Method getLastUsage (intent unclear from static analysis)

**Open Questions:**
- q:TZSnZsVqcx: What is the behavior of method `getLastUsage` at src/llm/adapters/openai.ts?

