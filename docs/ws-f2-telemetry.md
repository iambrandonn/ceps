# WS-F2 Telemetry Interface

**Phase 4 WS-F2 Stage F: Run Summary Telemetry**

This document describes the telemetry interface provided by WS-F2 (LLM Gateway Integration) for use by WS-H (Orchestrator) in generating run summaries.

---

## Overview

WS-F2 provides two key interfaces for telemetry:
1. **GeneratorMetrics** - from `SpecGenerator.getMetrics()`
2. **LLMGatewayUsage** - from `LLMGateway.getUsage()`

These interfaces provide all the data WS-H needs to populate the `tokens`, `chunks`, and `warnings` sections of the run summary.

---

## GeneratorMetrics Interface

### Location
`src/generator/spec-generator.ts`

### TypeScript Definition
```typescript
export interface GeneratorMetrics {
  llmPolished: number;          // Count of chunks successfully polished by LLM
  templateFallback: number;     // Count of chunks that fell back to template
  budgetExhausted: boolean;     // True if token budget was exhausted during generation
  warnings: string[];           // Array of warning messages from generation process
}
```

### Access Method
```typescript
const generator = new SpecGenerator(kb, fileIndex, options);
await generator.generateDirectorySpecsAsync(projectRoot);
const metrics = generator.getMetrics();
```

### Metrics Tracking

**llmPolished** - Incremented when:
- Validator accepts LLM draft (status: 'accept')
- No validator present and LLM call succeeds

**templateFallback** - Incremented when:
- Budget exhausted before LLM call
- Validator returns 'fallback' status
- Max retries (R2) exhausted
- LLM call throws error

**budgetExhausted** - Set to true when:
- `withBudgetHelper()` returns `allowed: false`

**warnings** - Populated with:
- Budget exhaustion messages: `"Budget exhausted for entity {id}, falling back to template"`
- Validation failures: `"Validation failed for entity {id}: {reason}, using template"`
- LLM errors: `"LLM error for entity {id}: {error}, using template"`
- Max retry exhaustion: `"Max retries exhausted for entity {id}, using template"`

---

## LLMGatewayUsage Interface

### Location
`src/llm/budget.ts` (via `LLMGateway.getUsage()`)

### TypeScript Definition
```typescript
export interface UsageStats {
  total: number;                    // Total tokens used across all providers
  byProvider: Record<string, number>; // Token usage breakdown by provider (e.g., { "anthropic": 28450 })
}
```

### Access Method
```typescript
const gateway = new LLMGateway(options);
// ... after generation ...
const usage = gateway.getUsage();
```

### Data Sources
- Tracked by `BudgetTracker.recordUsage(kind, tokens)`
- Called after each LLM completion
- Aggregated across all chunks and retries

---

## Integration Example for WS-H

```typescript
import { SpecGenerator } from './generator/spec-generator';
import { LLMGateway } from './llm/gateway';
import { BudgetTracker } from './llm/budget';

async function generateWithMetrics(projectRoot: string) {
  // Setup
  const budgetTracker = new BudgetTracker(30000);
  const gateway = new LLMGateway({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    budgetTokens: 30000
  });

  const options = {
    llmEnabled: true,
    llmGateway: gateway,
    validator: myValidator,
    budgetTracker,
  };

  const generator = new SpecGenerator(kb, fileIndex, options);

  // Generate specs
  await generator.generateDirectorySpecsAsync(projectRoot);

  // Collect metrics for run summary
  const generatorMetrics = generator.getMetrics();
  const gatewayUsage = gateway.getUsage();

  // Build run summary
  const runSummary = {
    tokens: {
      total: gatewayUsage.total,
      budget: budgetTracker.getLimit(),
      providers: gatewayUsage.byProvider,
    },
    chunks: {
      total: generatorMetrics.llmPolished + generatorMetrics.templateFallback,
      llmPolished: generatorMetrics.llmPolished,
      templateFallback: generatorMetrics.templateFallback,
    },
    warnings: generatorMetrics.warnings,
    // WS-H populates gates and exit_code
    gates: evaluateGates(kb, generator),
    exit_code: allGatesPass(gates) ? 0 : 1,
  };

  // Write run summary
  await writeRunSummary(runSummary);
}
```

---

## Run Summary Schema

See `docs/examples/run-summary.json` for the full schema with field ownership documentation.

**WS-F2 Provides:**
- `tokens.total` (from `gateway.getUsage().total`)
- `tokens.budget` (from CLI args / BudgetTracker)
- `tokens.providers` (from `gateway.getUsage().byProvider`)
- `chunks.total` (from `metrics.llmPolished + metrics.templateFallback`)
- `chunks.llmPolished` (from `metrics.llmPolished`)
- `chunks.templateFallback` (from `metrics.templateFallback`)
- `warnings` (from `metrics.warnings`)

**WS-H Provides:**
- `gates.*` (all gate evaluations)
- `exit_code` (based on gate results)

---

## Cost Gate Thresholds

Per Phase 4 §3.2, the following cost gates are recommended:

| Fixture Type | Token Budget | Description |
|--------------|--------------|-------------|
| Express API  | ≤ 30,000     | Small backend API |
| React App    | ≤ 40,000     | Frontend application |
| Monorepo     | ≤ 100,000    | Multi-package repository |

**Cost Gate Implementation:**
```typescript
import { validateCostGate } from './llm/budget-helpers';

const passed = validateCostGate(budgetTracker, 'express');
// Returns true if total usage ≤ threshold, false otherwise
```

---

## Warnings Format

Warnings are human-readable strings describing generation issues:

```typescript
[
  "Budget exhausted for entity user-handler, falling back to template",
  "Validation failed for entity auth-middleware: entity name mismatch, using template",
  "Max retries exhausted for entity db-connection, using template"
]
```

**Parsing Guidance:**
- Warnings beginning with "Budget exhausted" indicate cost gate issues
- Warnings containing "Validation failed" indicate grounding gate issues
- Warnings with "Max retries exhausted" indicate persistent validation failures

---

## Status

**Implementation Status:**
- ✅ GeneratorMetrics interface complete
- ✅ LLMGatewayUsage interface complete
- ✅ Metrics tracking in generator complete
- ✅ Run summary schema documented
- ⏳ WS-H integration pending

**Next Steps for WS-H:**
1. Review `docs/examples/run-summary.json` schema
2. Implement gate evaluation logic
3. Integrate GeneratorMetrics and LLMGatewayUsage
4. Write run-summary.json to output directory
5. Set exit_code based on gate results

---

**Document version:** 1.0
**Last updated:** 2025-11-05 (Phase 4 WS-F2 Stage F)
**Contact:** WS-F2 agent for telemetry interface questions
