# src/llm

**Directory Overview:** This directory contains 28 entities.

## budget-helpers.ts

<a id="a6kbpSw21k"></a>

### withBudgetHelper

**Signature:** `(tracker: BudgetTracker, kind: string, estimate: number): import("/src/llm/budget-helpers").BudgetCheckResult`

**Visibility:** Public (exported)

This function performs an operation.

<a id="aHhb281GAp"></a>

### estimateTokens

**Signature:** `(text: string, provider: string): number`

**Visibility:** Public (exported)

This function performs an operation.

<a id="xAHlOEQOQg"></a>

### validateCostGate

**Signature:** `(tracker: BudgetTracker, fixtureType: string): boolean`

**Visibility:** Public (exported)

This function validates input.

**Errors thrown:**
- new Error(`Unknown fixture type: ${fixtureType}`);

## budget.ts

<a id="aUs9HquEBA"></a>

### BudgetTracker

**Visibility:** Public (exported)

This class represents budget tracker.

<a id="sgrJWlJtTn"></a>

### checkBudget

**Signature:** `(): boolean`

**Visibility:** Public (exported)

This method validates input.

<a id="T75lmsgVEw"></a>

### recordUsage

**Signature:** `(provider: string, totalTokens: number, promptTokens: number, completionTokens: number, costUSD: number): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="cmxXtK2EN8"></a>

### getUsage

**Signature:** `(): import("/src/llm/budget").UsageStats`

**Visibility:** Public (exported)

This method retrieves data.

<a id="JWAHUwFqRr"></a>

### getRemainingBudget

**Signature:** `(): number`

**Visibility:** Public (exported)

This method retrieves data.

<a id="BS8l8uSCvb"></a>

### reset

**Signature:** `(): void`

**Visibility:** Public (exported)

This method performs an operation.

## cache.ts

<a id="smK0Ubskss"></a>

### LLMCache

**Visibility:** Public (exported)

This class represents l l m cache.

<a id="jVHF7EeSqB"></a>

### generateCacheKey

**Signature:** `(facts: string, model: string, styleVersion: string): string`

**Visibility:** Public (exported)

This method performs an operation.

<a id="klsyebpWFX"></a>

### get

**Signature:** `(key: string): string`

**Visibility:** Public (exported)

This method retrieves data.

<a id="uJTsONQZyq"></a>

### set

**Signature:** `(key: string, response: string): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="b82TxVurGM"></a>

### has

**Signature:** `(key: string): boolean`

**Visibility:** Public (exported)

This method performs an operation.

<a id="iuF1hynvIG"></a>

### invalidate

**Signature:** `(key: string): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="vn3W7s7wlZ"></a>

### clear

**Signature:** `(): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="oc2FP5SCRz"></a>

### getStats

**Signature:** `(): import("/src/llm/cache").CacheStats`

**Visibility:** Public (exported)

This method retrieves data.

<a id="B1i9vgD20U"></a>

### getEntry

**Signature:** `(key: string): import("/src/llm/cache").CacheEntry`

**Visibility:** Public (exported)

This method retrieves data.

## gateway.ts

<a id="B53yJx2fY9"></a>

### LLMGateway

**Visibility:** Public (exported)

This class represents l l m gateway.

<a id="0hOehMGYiz"></a>

### getCurrentProvider

**Signature:** `(): import("/src/llm/gateway").Provider`

**Visibility:** Public (exported)

This method retrieves data.

<a id="0im59AJxog"></a>

### setProvider

**Signature:** `(provider: Provider): void`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new Error(`Provider ${provider} is not configured`);

<a id="3MexzPozyy"></a>

### completions

**Signature:** `(prompt: string, options: CompletionOptions = {}): Promise<string>`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new Error('Token budget exceeded');

<a id="K70akaAa45"></a>

### checkBudget

**Signature:** `(): boolean`

**Visibility:** Public (exported)

This method validates input.

<a id="JckVEyAiV3"></a>

### getRemainingBudget

**Signature:** `(): number`

**Visibility:** Public (exported)

This method retrieves data.

<a id="RuEGj2Ywom"></a>

### getUsage

**Signature:** `(): import("/src/llm/budget").UsageStats`

**Visibility:** Public (exported)

This method retrieves data.

<a id="5QpNC8Kv3L"></a>

### getCacheStats

**Signature:** `(): import("/src/llm/cache").CacheStats`

**Visibility:** Public (exported)

This method retrieves data.

<a id="2AeDsdm6c2"></a>

### clearCache

**Signature:** `(): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="JWnJ0dh3Nd"></a>

### summarize

**Signature:** `(factSets: FactSet[], style: string, options: SummarizeOptions = {}): Promise<string>`

**Visibility:** Public (exported)

This method performs an operation.

