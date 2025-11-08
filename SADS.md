# ceps — System Architecture & Design Specification (SADS)
**Version:** 1.1 (Final)  
**Date:** 2025-11-03  
**Status:** Final baseline for CTS & Implementation Plan  
**Owners:** Product & Architecture (ceps)

---

## 0) Document Intent

This **System Architecture & Design Specification (SADS)** defines the end-to-end design for **ceps**, a one-time-use tool that reverse-engineers a JavaScript/TypeScript codebase into human-readable **Markdown specifications**. It is the blueprint from which we will derive **Component Technical Specs (CTS)** and the **Implementation Plan**. It provides architecture, components, data flows, interfaces, lifecycle, non-functional goals, and output standards—**without** code-level implementation or pseudocode.

**Directives & assumptions (final):**
- LLMs **may see the entire project** by default (privacy relaxed for this deployment).  
- **Root `spec.md` is always generated.**  
- **In-place output** is the default (one `spec.md` per source directory).  
- **Tests are used as context (facts) but are not documented.**  
- **Spec-Ready** is the default detail level (sufficient to adopt spec-driven development immediately).  
- **Answer-guided finalization** allows bounded, impact-scoped re-analysis after human answers.  
- **Monorepo-aware**: always produce a root overview and per-package links.

---

## 1) Overview & Goals

### 1.1 Purpose
**ceps** is a one-time transformation tool that analyzes an existing JS/TS codebase to infer **what** it does (behavior, intent, side effects, relationships) and emits **human-readable Markdown**. The outputs become the **source of truth** for a spec-driven workflow; the original codebase becomes secondary or disposable.

### 1.2 End State
- Repository contains a **root `spec.md`** and a **`spec.md` in each source directory**.  
- All exported/public surfaces are documented to a **Spec-Ready** bar or carry explicit **Open Questions** (QIDs).  
- Teams (or LLMs) can implement, regenerate, or evolve code solely from the specs.

### 1.3 Non-Goals
- No code generation, test generation, or ongoing two-way sync.  
- No runtime execution of the target application (static analysis only; optional probes later, off by default).

### 1.4 Design Principles
- **Behavior-first** (intent & outcomes, not algorithms).  
- **Iterative comprehension** with explicit confidence bands; unresolved items become **Open Questions**.  
- **Minimal human interruption** during analysis; answers applied once in a bounded finalization pass.  
- **LLM-assisted, not LLM-dependent** (templates produce a Spec-Ready baseline; LLMs add fluency/synthesis).  
- **Deterministic & reproducible** (stable anchors, QIDs, style; `--deterministic` mode).

---

## 2) Scope

### 2.1 In Scope
- Static analysis of JS/TS/JSX/TSX projects (incl. monorepos).  
- Extraction of entities/relations/side effects/contracts.  
- Iterative reasoning & ambiguity resolution.  
- Markdown generation (root + per-directory), with Open Questions (QIDs).  
- Optional **finalization**: ingest answers, impact-scoped re-analysis, patch specs.

### 2.2 Out of Scope
- Code or test generation (handled by downstream tools).  
- Ongoing synchronization after finalization.  
- Executing business logic (no DB/api calls).

---

## 3) Architecture Overview

### 3.1 Components & Responsibilities (final ordering)

1. **Codebase Scanner & Loader** — Discovers sources (TS/JS/JSX/TSX), honors ignore rules (`node_modules`, `dist`, `build`, minified/bundled), detects monorepo packages, builds a file index grouped by package/directory.

2. **Static Analysis Engine (Parser & Fact Extractor)** — Primary: **TypeScript compiler API / ts-morph** (types when available). Fallback: **Babel** for edge syntax. Extracts: exports, declarations, signatures, call/import graphs, error sites, async usage, side-effect hints (I/O, network, DB), config/env reads, comments/JSDoc. Prunes ASTs after fact extraction for memory efficiency.

3. **Dynamic Pattern Detector (Confidence Gate)** — Co-located with fact extraction per file; flags patterns that reduce static resolvability (dynamic imports, reflection, proxies, bracket access on unknowns, `eval`, metaprogramming). Downgrades confidence and seeds Open Questions where appropriate.

4. **Auxiliary Readers (Facts Only)** — Tests (names/assertions) for intent clues; config (JSON/YAML), `.env`, OpenAPI, SQL migrations for external effects and endpoint semantics. **No test documentation** is generated.

5. **Knowledge Base (KB)** — Central memory of entities, relations, factSets, behavior chunks, confidence, QIDs, anchors, and maps for cross-linking. Maintains an attribution map (chunk-level grounding to factSets).

6. **Reasoning & Inference Engine** — Rule/pattern library for idioms & frameworks (Express, React, Next.js, NestJS, Koa, Node events/streams, schedulers, Prisma/Sequelize/TypeORM, Redux/effects, fetch/axios). Lifts code facts to behavioral intent; iterates until convergence or cap.

7. **LLM Gateway (Provider-Agnostic, On by Default)** — Summarization, cross-file synthesis, style normalization, and hypothesis suggestions (emitted as questions if ungrounded). Adapters: OpenAI/Anthropic/Azure/local. Low temperature; caching and budgets supported. Privacy is relaxed (prompts may include full files); outputs must stay grounded in factSets.

8. **Grounding Validator** — Validates each behavior chunk against its factSet(s). Rejects non-entailed claims; triggers retries or template fallback.

9. **Ambiguity Resolver** — Manages Low-confidence queue; applies cross-reference strategies, pattern re-checks, auxiliary facts, and LLM fusion; converts persistent Low items into **Open Questions** with stable QIDs.

10. **Specification Generator (Markdown)** — Emits **root `spec.md`** and **per-directory `spec.md`** in-place. Stable anchors (slug + short hash), validated cross-links, consistent style kit, Open Questions inline with QIDs.

11. **Finalization Engine (Answer‑Guided Re‑Iteration)** — Ingests `answers.md` (QID→answer), verifies snapshot unchanged (hash tree; else `--reconcile`), scopes impacts via reverse deps, re-reasons impacted chunks, patches affected sections, deletes QIDs, and appends a **Finalization Summary** per changed file.

12. **Orchestrator** — Coordinates phases, parallelizes parsing, manages caches, enforces gates, and emits run summaries.

### 3.2 Lifecycle (Text Diagram & concurrency)

```
Scan → Parse/Extract Facts + Detect Patterns (parallel per file)
    → Aux Readers (parallel after index ready)
    → Draft (templates)
    → LLM Polish (grounded) → Grounding Validation (reject/retry/fallback)
    → Ambiguity Queue → Iterative Resolution
    → Generate Specs (root + directories, in-place) + Link Validation
    → (Optional) Finalization: ingest answers → scope impacts → re-reason → patch
```

---

## 4) Data & Behavior Modeling

### 4.1 Inputs
- Project root path (monorepo-aware).  
- Source files (JS/TS/JSX/TSX).  
- Optional context: tests, config, OpenAPI, SQL.

### 4.2 Knowledge Base (KB)
- **Entities**: module/file, export, class, method, function, constant/config, endpoint, event.  
- **Relations**: imports/exports, calls, publishes/subscribes, reads/writes resources.  
- **factSet**: normalized collection of atomic facts with provenance and optional parent chain (derived facts).  
- **Behavior Chunk**: human-readable paragraph/bullet derived from factSet(s) with `confidence` and `factSetId`.  
- **Confidence Bands (rule-weighted):** High ≥70, Medium 40–69, Low <40.  
  - High → assertive prose.  
  - Medium → assertive prose + optional *Assumptions*.  
  - Low → **Open Question** (no assertion).  
- **QIDs**: `q:<10-char base62 hash>` of (file-path + entity-key + ambiguity-kind); on collision → extend to 16 chars; if still collides → suffix `-n`.  
- **Anchors**: heading slug + short content hash; validated across files.

### 4.3 Snapshot (Finalization)
- **Merkle tree over normalized file contents** (UTF‑8, normalized EOL, trailing-space trimmed).  
- **Included:** sources + auxiliary inputs. **Excluded:** generated outputs (`spec.md`), ignored paths (e.g., `node_modules`, `dist`).  
- Root hash stored at `.ceps/snapshot.json`.

### 4.4 Outputs
- **Root `spec.md`** at repo root (overview, architecture map, conventions, index).  
- **Per-directory `spec.md`** (in-place), documenting files & key elements with Spec-Ready content and inline Open Questions (QIDs).  
- Console summary: counts, unresolved QIDs, warnings.

---

## 5) Execution Flow & Error Handling

1. **Initialize**: load patterns; detect monorepo; compute ignore set.  
2. **Scan**: index files by package/directory.  
3. **Parse & Extract Facts** (parallel) + **Pattern Detection** per file; prune ASTs after extraction.  
4. **Drafts**: template-based Spec-Ready bullets for each element.  
5. **LLM Polish (bounded & grounded)**: per-element → per-file → per-directory synthesis.  
6. **Grounding Validation**: reject non-entailed text; retry up to 2 times with stricter prompts; on failure → template fallback.  
7. **Ambiguity Resolution (iterative)**: cross-references, pattern re-checks, auxiliary facts, targeted LLM fusion; promote to High/Medium or mark Open Questions.  
8. **Generate Specs**: root and per-directory `spec.md`; stable anchors; **two-phase render & link validation** (build anchor index → render → validate).  
9. **Finalization (optional)**: ingest `answers.md` → verify snapshot → scope impacts (reverse deps; default **max hops=3**, **max nodes=250**; always refresh directory & root/package summaries referencing impacted entities) → re-reason → patch → remove QIDs → add Finalization Summaries.  
10. **Exit**: print summary; non-zero exit if Coverage/Grounding gates fail.

**Conflicts (tests vs code):** Code is ground truth. If a test appears to contradict code, downgrade confidence and emit **Open Question (Conflict: test vs code)**; do not assert the test claim as fact.

**Error surfacing:** Inline *Notes* for partial parsing; Open Question for unresolved semantics. Run summary lists parse/analysis errors by file.

---

## 6) Interfaces & Configuration (CLI)

### 6.1 Commands
```bash
# Default: in-place generation
ceps <project-root>

# Finalization (answer-guided, impact-scoped)
ceps finalize --answers ./answers.md
```

### 6.2 Options
- **Detail**: `--detail spec-ready` (default) | `exhaustive` | `minimal`
- **LLM**: `--llm on|off` (default: on), `--llm-provider <openai|anthropic|azure|local>`, `--llm-model <name>`, `--llm-budget <tokens>`, `--no-llm-cache`, `--deterministic`
- **Scope/perf**: `--focus public-api`, `--max-workers <n>`, `--max-iterations <n>`
- **Parser**: `--no-module-scope-calls` (disable module-scope call extraction; default: enabled)
- **Snapshot**: `--no-snapshot` (skip snapshot capture during baseline)
- **Finalization**: `--reconcile`, `--dry-run`, `--finalize-max-hops <n>`, `--finalize-max-nodes <n>`, `--finalize-scope full`
- **Monorepo**: auto-detected; no flag required

**Environment Variables**:
- `CEPS_MODULE_SCOPE_CALLS=false` — Equivalent to `--no-module-scope-calls` (Phase 6)

### 6.3 Exit Codes
- `0` success; `1` internal error; `2` Coverage/Grounding gates failed; `3` snapshot mismatch during finalize without `--reconcile`.

---

## 7) Output Specification (Markdown)

### 7.1 Root `spec.md` (always generated)
- **Title & Purpose**  
- **System Overview** (domain, subsystems, boundaries)  
- **Architecture Map** (text diagram of layers/packages and relationships)  
- **Conventions** (style, confidence bands, QIDs, link policy)  
- **Index** (links to package & directory `spec.md` files)

### 7.2 Per-directory `spec.md`
- **Directory Overview** (responsibility; role in end-to-end flows)  
- **Per-file Sections**  
  - File summary (what it does)  
  - **Exports/Key Elements** (Spec-Ready detail):  
    - Intent & responsibility  
    - Inputs/outputs & return semantics  
    - Errors/exception behavior  
    - Side effects (I/O, network, DB, state)  
    - Dependencies & interactions (cross-links)  
    - Config & environment influence  
    - Concurrency/timing (if relevant)  
  - **Open Questions** (inline; QIDs; concise, actionable)
- **Conflict notation**: **Open Question (Conflict: test vs code)** where applicable.

### 7.3 Style Kit
- **Voice/Tense**: present, active, behavior-first (“validates/returns/emits”).  
- **Format**: headings for files/elements; bullets for multi-step behavior; short sentences; minimal code.  
- **Lexicon**: validate, compute, transform, emit, persist, fetch, authorize, schedule, retry, cache.  
- **Anchor policy**: slug + short hash; two-phase link validation; broken links warn and fail the Grounding gate.  
- **Consistency**: text linter applied when LLM is off.

---

## 8) LLM Gateway & Grounding (final)

- **Roles**: summarize facts into fluent prose; fuse cross-file context; normalize style; suggest hypotheses (as questions if ungrounded).  
- **Grounding**: chunk-level attribution—every paragraph/bullet cites a **factSetId**; **Grounding Validator** checks entailment against factSet(s).  
- **Retries**: up to **2** with stricter constraints (reduced scope, bullet-only). Persistent failures → deterministic template fallback + warning.  
- **Prompts**: facts-first; privacy relaxed → may include full files where helpful.  
- **Determinism**: low temperature by default; `--deterministic` locks paraphrase variance.  
- **Budget & Cache**: token budget guard; cache keyed by (facts, model, style version).  
- **Fallback**: template-only generation if gateway/provider fails.

---

## 9) Finalization (Answer‑Guided Re‑Iteration)

- **Inputs**: `answers.md` mapping `QID: answer`.  
- **Snapshot lock**: Merkle root must match; else require `--reconcile` (best-effort label).  
- **Impact scope**: reverse dependencies (default **max hops=3**, **max nodes=250**); always refresh directory and root/package summaries referencing impacted entities.  
- **Process**: apply answers → re-reason impacted chunks (templates + LLM) → regenerate affected sections → remove QIDs → append **Finalization Summary** in each changed file.  
- **Dry run**: `ceps finalize --dry-run` previews mappings and impacted files.

---

## 10) Acceptance Criteria & Quality Gates

1. **Coverage**: 100% of exported/public surfaces documented to Spec-Ready checklist **or** carry QIDs.  
2. **Grounding**: no paragraph/bullet without a `factSetId`; link validation passes.  
3. **Confidence**: Low → Open Question; Medium/High → assertive prose (Medium may include *Assumptions*).  
4. **Monorepo**: root overview present; package specs linked correctly.  
5. **Finalization**: all answered QIDs removed; Finalization Summaries added.  
6. **Determinism (optional)**: with `--deterministic`, regenerated prose remains stable (modulo resolved QIDs).

---

## 11) Risks & Mitigations

- **Dynamic patterns evade static analysis** → detector flags & confidence downgrade; targeted questions.  
- **Mixed TS/JS/JSX** → TS compiler API primary; Babel fallback.  
- **Spec-Ready cost/time on large repos** → focus valves (`--focus public-api`), budget guard, caching, parallel parsing.  
- **Grounding complexity** → chunk-level attribution with factSet IDs; post-checks and retries.  
- **QID/anchor drift** → content-hash-based IDs; persisted maps; `finalize --dry-run`.  
- **Expectation drift (synchronizer)** → strict snapshot lock; explicit `--reconcile` path labeled best‑effort.  
- **Template readability (LLM-off)** → style kit + text linter.

---

## 12) Performance & Scalability

- **Parallel parsing** with worker pool; bounded concurrency.  
- **AST pruning** after fact extraction.  
- **Graph indices** for quick reverse-dependency scoping.  
- **LLM budget governor** and targeted polishing (only low-confidence/complex modules).  
- **Package-by-package processing** for monorepos.

---

## 13) Versioning & Support Matrix

- **Node.js:** ≥ 18 LTS  
- **TypeScript:** 5.x (parsing JS/TS/JSX/TSX)  
- **Framework Patterns (v1):** Express, React, Next.js, NestJS, Koa, Node events/streams, schedulers (node-cron), Redux/effects, ORM (Prisma, Sequelize, TypeORM), HTTP clients (fetch/axios)  
- **Style Guide Version:** `ceps-style-1.0` (pinned)

---

## 14) Logging, Diagnostics & Telemetry

- **Console logging:** progress, warnings, errors, summary.  
- **Diagnostics:** optional `--debug` to emit reasoning traces for a file (facts used, confidence changes).  
- **Telemetry:** off by default; can be enabled during development for performance tuning (build-time flag).

---

## 15) Packaging & Distribution

- CLI (Node/TypeScript), installed via `npm`/`npx` or standalone binary (later).  
- LLM access via configured provider (or local adapter).

---

## 16) Roadmap (Non-MVP Enhancements)

- `--out` for mirror docs directory (off by default).  
- Enumeration-only probes (e.g., route tables), disabled by default.  
- Additional frameworks (Vue, SvelteKit, Fastify, Hapi, Apollo/GraphQL).  
- Localization (`--locale`) and alt styles.  
- HTML/PDF rendering pipeline for specs.

---

## 17) Glossary

- **Spec-Ready**: Detail sufficient to replace the code as behavioral source of truth.  
- **QID**: Stable Open Question identifier derived from file path, entity key, and ambiguity kind.  
- **factSet / factSetId**: Grouped, attributed facts that justify a behavior chunk; basis for grounding.  
- **Behavior chunk**: Paragraph/bullet in the spec tied to a factSet and confidence band.  
- **Finalization**: Optional, **bounded** pass that ingests answers and selectively re-analyzes impacted areas to update specs.
