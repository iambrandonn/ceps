# src/llm

**Directory Overview:** This directory contains 28 entities.

## budget-helpers.ts

<a id="a6kbpSw21k"></a>

### withBudgetHelper

**Signature:** `(tracker: BudgetTracker, kind: string, estimate: number): import("/src/llm/budget-helpers").BudgetCheckResult`

**Visibility:** Public (exported)

**Behavior:**

- Function withBudgetHelper: 
Check budget before LLM call (CTS-07 §8 wrapper)


<a id="aHhb281GAp"></a>

### estimateTokens

**Signature:** `(text: string, provider: string): number`

**Visibility:** Public (exported)

**Behavior:**

- Function estimateTokens: 
Estimate tokens for text based on provider

Uses provider-specific tokenizers when available,
falls back to heuristic for unknown providers.


<a id="xAHlOEQOQg"></a>

### validateCostGate

**Signature:** `(tracker: BudgetTracker, fixtureType: string): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Function validateCostGate: 
Validate that token usage meets cost gate threshold


**Errors thrown:**
- new Error(`Unknown fixture type: ${fixtureType}`);

## budget.ts

<a id="aUs9HquEBA"></a>

### BudgetTracker

**Visibility:** Public (exported)

**Behavior:**

- Class BudgetTracker (intent unclear from static analysis)

**Open Questions:**
- q:IGRrEKsEnB: What are the responsibilities and contract of class `BudgetTracker` at src/llm/budget.ts?

<a id="sgrJWlJtTn"></a>

### checkBudget

**Signature:** `(): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Method checkBudget (intent unclear from static analysis)

**Open Questions:**
- q:ExgNUb3mpg: What is the behavior of method `checkBudget` at src/llm/budget.ts?

<a id="T75lmsgVEw"></a>

### recordUsage

**Signature:** `(provider: string, totalTokens: number, promptTokens: number, completionTokens: number, costUSD: number): void`

**Visibility:** Public (exported)

**Behavior:**

- Method recordUsage (intent unclear from static analysis)

**Open Questions:**
- q:TK0iN4NvWL: What is the behavior of method `recordUsage` at src/llm/budget.ts?

<a id="cmxXtK2EN8"></a>

### getUsage

**Signature:** `(): import("/src/llm/budget").UsageStats`

**Visibility:** Public (exported)

**Behavior:**

- Method getUsage (intent unclear from static analysis)

**Open Questions:**
- q:01o3saVudQ: What is the behavior of method `getUsage` at src/llm/budget.ts?

<a id="JWAHUwFqRr"></a>

### getRemainingBudget

**Signature:** `(): number`

**Visibility:** Public (exported)

**Behavior:**

- Method getRemainingBudget (intent unclear from static analysis)

**Open Questions:**
- q:lKHcbTSZPy: What is the behavior of method `getRemainingBudget` at src/llm/budget.ts?

<a id="BS8l8uSCvb"></a>

### reset

**Signature:** `(): void`

**Visibility:** Public (exported)

**Behavior:**

- Method reset (intent unclear from static analysis)

**Open Questions:**
- q:RSMzFYsRPU: What is the behavior of method `reset` at src/llm/budget.ts?

## cache.ts

<a id="smK0Ubskss"></a>

### LLMCache

**Visibility:** Public (exported)

**Behavior:**

- Class LLMCache (intent unclear from static analysis)

**Open Questions:**
- q:WNJ4SxOnw4: What are the responsibilities and contract of class `LLMCache` at src/llm/cache.ts?

<a id="jVHF7EeSqB"></a>

### generateCacheKey

**Signature:** `(facts: string, model: string, styleVersion: string): string`

**Visibility:** Public (exported)

**Behavior:**

- Method generateCacheKey (intent unclear from static analysis)

**Open Questions:**
- q:YjDhBAygEx: What is the behavior of method `generateCacheKey` at src/llm/cache.ts?

<a id="klsyebpWFX"></a>

### get

**Signature:** `(key: string): string`

**Visibility:** Public (exported)

**Behavior:**

- Method get (intent unclear from static analysis)

**Open Questions:**
- q:pVLk0yIkcS: What is the behavior of method `get` at src/llm/cache.ts?

<a id="uJTsONQZyq"></a>

### set

**Signature:** `(key: string, response: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Method set (intent unclear from static analysis)

**Open Questions:**
- q:bznhrcicg4: What is the behavior of method `set` at src/llm/cache.ts?

<a id="b82TxVurGM"></a>

### has

**Signature:** `(key: string): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Method has (intent unclear from static analysis)

<a id="iuF1hynvIG"></a>

### invalidate

**Signature:** `(key: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Method invalidate (intent unclear from static analysis)

**Open Questions:**
- q:QA9aNJtwDJ: What is the behavior of method `invalidate` at src/llm/cache.ts?

<a id="vn3W7s7wlZ"></a>

### clear

**Signature:** `(): void`

**Visibility:** Public (exported)

**Behavior:**

- Method clear (intent unclear from static analysis)

**Open Questions:**
- q:BqUj63r7N5: What is the behavior of method `clear` at src/llm/cache.ts?

<a id="oc2FP5SCRz"></a>

### getStats

**Signature:** `(): import("/src/llm/cache").CacheStats`

**Visibility:** Public (exported)

**Behavior:**

- Method getStats (intent unclear from static analysis)

**Open Questions:**
- q:haL7MrO2l1: What is the behavior of method `getStats` at src/llm/cache.ts?

<a id="B1i9vgD20U"></a>

### getEntry

**Signature:** `(key: string): import("/src/llm/cache").CacheEntry`

**Visibility:** Public (exported)

**Behavior:**

- Method getEntry (intent unclear from static analysis)

**Open Questions:**
- q:JEvKMl99k8: What is the behavior of method `getEntry` at src/llm/cache.ts?

## gateway.ts

<a id="B53yJx2fY9"></a>

### LLMGateway

**Visibility:** Public (exported)

**Behavior:**

- Class LLMGateway (intent unclear from static analysis)

**Open Questions:**
- q:P0i9wtJZDT: What are the responsibilities and contract of class `LLMGateway` at src/llm/gateway.ts?

<a id="0hOehMGYiz"></a>

### getCurrentProvider

**Signature:** `(): import("/src/llm/gateway").Provider`

**Visibility:** Public (exported)

**Behavior:**

- Method getCurrentProvider (intent unclear from static analysis)

**Open Questions:**
- q:yQOB0yFN7H: What is the behavior of method `getCurrentProvider` at src/llm/gateway.ts?

<a id="0im59AJxog"></a>

### setProvider

**Signature:** `(provider: Provider): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setProvider (intent unclear from static analysis)

**Errors thrown:**
- new Error(`Provider ${provider} is not configured`);

<a id="3MexzPozyy"></a>

### completions

**Signature:** `(prompt: string, options: CompletionOptions = {}): Promise<string>`

**Visibility:** Public (exported)

**Behavior:**

- Method completions (intent unclear from static analysis)

**Errors thrown:**
- new Error('Token budget exceeded');

<a id="K70akaAa45"></a>

### checkBudget

**Signature:** `(): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Method checkBudget (intent unclear from static analysis)

**Open Questions:**
- q:DtuNM60uxp: What is the behavior of method `checkBudget` at src/llm/gateway.ts?

<a id="JckVEyAiV3"></a>

### getRemainingBudget

**Signature:** `(): number`

**Visibility:** Public (exported)

**Behavior:**

- Method getRemainingBudget (intent unclear from static analysis)

**Open Questions:**
- q:OkIFxTg0fe: What is the behavior of method `getRemainingBudget` at src/llm/gateway.ts?

<a id="RuEGj2Ywom"></a>

### getUsage

**Signature:** `(): import("/src/llm/budget").UsageStats`

**Visibility:** Public (exported)

**Behavior:**

- Method getUsage (intent unclear from static analysis)

**Open Questions:**
- q:HUyW4oOuCc: What is the behavior of method `getUsage` at src/llm/gateway.ts?

<a id="5QpNC8Kv3L"></a>

### getCacheStats

**Signature:** `(): import("/src/llm/cache").CacheStats`

**Visibility:** Public (exported)

**Behavior:**

- Method getCacheStats (intent unclear from static analysis)

**Open Questions:**
- q:J9D4aCHzbw: What is the behavior of method `getCacheStats` at src/llm/gateway.ts?

<a id="2AeDsdm6c2"></a>

### clearCache

**Signature:** `(): void`

**Visibility:** Public (exported)

**Behavior:**

- Method clearCache (intent unclear from static analysis)

**Open Questions:**
- q:Cpl1dR1s48: What is the behavior of method `clearCache` at src/llm/gateway.ts?

<a id="JWnJ0dh3Nd"></a>

### summarize

**Signature:** `(factSets: FactSet[], style: string, options: SummarizeOptions = {}): Promise<string>`

**Visibility:** Public (exported)

**Behavior:**

- Method summarize (intent unclear from static analysis)

**Open Questions:**
- q:KeiThtsCu8: What is the behavior of method `summarize` at src/llm/gateway.ts?

