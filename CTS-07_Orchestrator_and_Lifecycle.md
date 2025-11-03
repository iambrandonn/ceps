# CTS-07 — Orchestrator & Lifecycle

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Lifecycle coordination, phases, concurrency, gating, progress, errors, finalization.

---

## 1) Purpose & Position
The **Orchestrator** coordinates all ceps components end-to-end. It owns the run lifecycle, concurrency model, gate enforcement, progress reporting, and the optional **finalization** mode. It does **not** parse code, reason about behavior, or format specs itself; it schedules components that do.

---

## 2) Responsibilities

1. **Lifecycle control**: execute phases in the canonical order (SADS §3.2), manage iteration loops, and terminate cleanly with well-defined exit codes.  
2. **Concurrency management**: manage worker pools for parsing/pattern detection and queues for LLM work; apply backpressure based on budgets and latency.  
3. **Gate enforcement**: enforce Coverage, Grounding, Confidence, Link Validation, and Monorepo gates before exit.  
4. **Configuration propagation**: consolidate CLI/env/config and pass normalized options to phases.  
5. **Progress & logging**: emit structured progress and metrics; summarize warnings/errors.  
6. **Finalization**: load snapshot, ingest answers, scope impacts, and run a **selective** re-analysis/patch of specs.

---

## 3) Lifecycle & Phases

### 3.1 Canonical Order
```
scan
→ parse_extract + detect_patterns  (parallel per file)
→ aux_readers                      (parallel after index ready)
→ draft_generation                 (templates)
→ llm_polish                       (bounded, grounded)
→ grounding_validation             (reject/retry/fallback)
→ ambiguity_resolution             (iterative; cap by --max-iterations)
→ spec_generation + link_validation
→ (optional) finalization
```

### 3.2 Phase Contracts
Each phase implements `run(context): PhaseReport` where:

```
PhaseReport = {
  ok: boolean,
  warnings: string[],
  metrics: Record<string, number>
}
```

**Context** carries: normalized config, **KB handle**, queues/pools, snapshot info, progress emitter, and gate status.

### 3.3 Iteration Policy
- **Ambiguity loop** runs until: (a) no changes since last iteration, or (b) `--max-iterations` reached.  
- Remaining Low-confidence items become **Open Questions**; exported/flow-critical items are marked **Critical** in root summary.

---

## 4) Concurrency Model

### 4.1 Worker Pools & Queues
- **Parser Pool**: CPU-bound pool for parse+fact extraction; size `min(#cores, --max-workers)`; per-file tasks.  
- **Aux Reader Pool**: I/O-bound; throttled to avoid disk thrash.  
- **LLM Queue**: rate-limited (tokens/sec or requests/sec), with **budget guard** (`--llm-budget`) and **latency SLO** cutoff; on overload → switch to deterministic templates for queued chunks.

### 4.2 Backpressure
- If **LLM budget** exhausted or latency SLO breached, LLM jobs pause; `draft_generation` output is used directly (template fallback) for the affected chunks.  
- Parser Pool prioritizes smaller files first (to increase perceived progress).

---

## 5) Gates & Exit Codes

### 5.1 Gates
- **Coverage Gate**: All exported/public surfaces documented to **Spec-Ready** or carry QIDs.  
- **Grounding Gate**: No emitted chunk without `factSetId`; all LLM chunks pass validator or fall back to templates; cross-link validation passes.  
- **Confidence Gate**: Low → Open Question; Medium/High → assertive prose.  
- **Monorepo Gate**: root overview exists; package specs link correctly.

### 5.2 Exit Codes
- `0` success  
- `1` internal/uncaught error  
- `2` gate failures  
- `3` snapshot mismatch during finalization without `--reconcile`

---

## 6) Finalization Mode

### 6.1 Preconditions
- Load `.ceps/snapshot.json` and verify Merkle root. If mismatch: require `--reconcile` and label output **best‑effort**.

### 6.2 Impact Scoping
- Reverse dependencies transitive closure with caps: **max hops = 3**, **max nodes = 250**.  
- Always refresh impacted directory overviews and root/package summaries.

### 6.3 Flow
1) Parse `answers.md` (QID → answer).  
2) Attach answers in KB; mark impacted entities.  
3) Re-run **draft → (optional) llm_polish → grounding_validation** for impacted chunks only.  
4) Regenerate affected spec sections; remove resolved QIDs; append **Finalization Summary** in changed files.

---

## 7) Configuration & Determinism

- **Deterministic mode** (`--deterministic`): low temperature, disable paraphrase variance, stable ordering for file traversal and output.  
- **Max workers** (`--max-workers`) and **iterations** (`--max-iterations`) set global bounds.  
- **Focus valves** (`--focus public-api`) reduce scope without violating Spec‑Ready doc for public surfaces.

---

## 8) Interfaces

- `orchestrate(config): ExitCode` — main entry.  
- `registerPhase(name, fn)` — internal; phases wired at bootstrap.  
- `emitProgress(evt)` — standardized events: `{phase, component, path?, current, total, percent}`.  
- `withBudget(kind, tokens)` — LLM budget guard around polishing.

---

## 9) Error Handling

- Components throw typed errors (`ParseError`, `ReaderError`, `LLMError`, `KBError`).  
- Orchestrator policy: **continue** on per-file parse/read errors (log, note in specs); **fallback** on LLM errors; **fail** on gate violations unless `--force` (not recommended).  
- All errors summarized at end of run.

---

## 10) Metrics & Logging

- Phase durations; queue sizes; LLM token usage; validator rejects/retries; link check failures.  
- JSON log option for CI parsing; human-readable console by default.

---

## 11) Acceptance Criteria

- Phases execute in order; parallelism respected; backpressure works.  
- Gates applied and exit codes correct.  
- Finalization updates **only** impacted sections and appends summaries.  
- Deterministic mode produces stable output across repeated runs.

---

## 12) Risks & Mitigations

- **Starvation** in queues → age-based priority and small-first scheduling.  
- **Budget/cost spikes** → strict budget guard and cache; template fallback.  
- **Deadlocks** → no phase waits on downstream phases; queues bounded with timeouts.  
- **Scope creep** → finalization caps; explicit `--finalize-scope full` to override.
