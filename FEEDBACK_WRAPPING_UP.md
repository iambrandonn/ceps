# Phase 4 Wrap-Up Feedback

`pnpm typecheck` (using `/home/iambrandonn/.local/share/pnpm/pnpm`) still fails with 22 TypeScript errors, so Phase 4 can’t be marked complete yet. Key blockers:

1. **WS-F1 — Grounding Validator:**  
   - `src/validation/grounding-validator.ts:65-72` emits `retryMetadata` with fields (`attemptCount`, `guidance`) that aren’t part of `RetryMetadata` (which only allows `attempt` and `promptKey`), causing a type mismatch.  
   - Validator tests import `ChunkMetadata` from `../../kb/models.js`, but that module doesn’t export it (`src/validation/__tests__/validator-adversarial.test.ts:12`, `validator-integration.test.ts:14`), so type resolution fails.

2. **WS-F2 — Generator Integration:**  
   - `spec-generator.ts` and the LLM orchestration tests assume `Entity` has a `confidence` property (`src/generator/spec-generator.ts:358`, `src/generator/__tests__/llm-orchestration.test.ts:44`, `199`, `221`, `243`); the KB model doesn’t expose that field, so these references are invalid.  
   - `withBudgetHelper` is invoked with too few arguments in tests (`src/__tests__/integration/phase4-llm-integration.test.ts:402`, `src/generator/__tests__/llm-orchestration.test.ts:199`, `221`, `243`).  
   - Several tests treat the validator mock as having a `.mock` property, but it’s just a function typed as `Validator` (`src/generator/__tests__/llm-orchestration.test.ts:289`, `309`, `329`).

3. **WS-H — Gate Wiring:**  
   - Orchestrator code looks for `BehaviorChunk.entityId`, but the model only provides `targetEntityId` (`src/orchestrator/index.ts:156`, `src/orchestrator/orchestrator.ts:406`).  
   - Confidence gate input assumes open questions have an `id` field when the model exposes `qid` (`src/orchestrator/index.ts:202`, `src/orchestrator/orchestrator.ts:452`).  
   - Token usage is passed to the cost gate as `ProviderUsage` objects rather than raw numbers (`src/orchestrator/index.ts:226`, `src/orchestrator/orchestrator.ts:476`), conflicting with the expected shape.

Tests (`pnpm test`) are currently green, but the type errors mean we’re not Phase‑4 complete. After these issues are fixed and `pnpm typecheck` passes cleanly, final confirmation and documentation updates can proceed.  

---

## Resolution

`pnpm typecheck` now runs cleanly, `pnpm test` passes with 62 test files / 823 tests (3 skipped), and `pnpm test:coverage` reports 93.42% overall coverage. The blockers above have been addressed, so Phase 4 can be marked complete and documentation has been updated accordingly.
