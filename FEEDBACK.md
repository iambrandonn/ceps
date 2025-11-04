# Phase 3 – Step 2 Review (Confidence Scoring)

## Findings
- **High — Reinforcers/Penalties missing** (`src/kb/knowledge-base.ts:405-436`)  
  The acceptance criteria for Step 2 call for the full reinforcer set (+15 type info, +10 callers≥3, +5 callers 1‑2, +10 test coverage, +5 “JSDoc complete”) and the full penalty set (‑20 dynamic patterns, ‑10 TODO/FIXME, ‑10 missing type info, ‑5 unused). The implementation only applies type info, caller count, and an extra “errors” boost; penalties only cover missing type info and unused. We still need the test-coverage and JSDoc completeness bonuses, plus the dynamic/TODO deductions that the spec states must land in Phase 3. (If any of these signals are truly unavailable, we should update the acceptance doc to record the deferral explicitly; right now the code and doc diverge.)

- **Medium — `mergeFactSets` violates the `Source` type** (`src/kb/knowledge-base.ts:451-469`)  
  The synthetic fact set sets `sources` to objects with `kind: 'test' | 'config' | 'llm'`, but the `Source` type (src/types/index.ts) only allows `'ast' | 'aux' | 'derived'`. Type-checking will fail once we run `pnpm typecheck`, and downstream consumers of `FactSet.sources` expect the documented union. Please either reuse the existing `Source` objects or map them back to the allowed kinds.

- **Medium — Spec/docs still list private helpers as public APIs** (`src/kb/spec.md:276-340`)  
  After regeneration, the KB spec now exposes `computeBaseEvidence`, `computeReinforcers`, `computePenalties`, etc. as public methods. These remain `private` in the implementation, so the generated docs are out of sync. Regenerate the spec with the updated visibility metadata (or mark the helpers with `@internal`) so consumers don’t assume these helpers are callable.

Once the missing scoring signals are implemented (or formally deferred) and the doc/type issues are cleaned up, Step 2 will be ready to freeze. !*** End Patch**
