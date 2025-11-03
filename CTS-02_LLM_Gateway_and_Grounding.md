# CTS-02 — LLM Gateway & Grounding Validator

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Provider adapters, prompts, caching/budgeting, chunk-level grounding, retry/fallback, determinism.

---

## 1) Purpose & Position
Provide fluent, consistent prose and cross-file synthesis **without introducing new facts**. The **LLM Gateway** generates drafts; the **Grounding Validator** enforces entailment against factSets. If grounding fails, we retry or fall back to deterministic templates.

---

## 2) Provider & Runtime Model

- **Adapters:** `openai`, `anthropic`, `azure-openai`, `local` (Ollama/vLLM).  
- **Selection:** env or CLI (`CEPS_LLM_PROVIDER`, `CEPS_LLM_MODEL`, endpoint, API key).  
- **On by default**; `--llm off` disables gateway (templates only).  
- **Determinism:** low temperature defaults; `--deterministic` locks sampling and disables paraphrase variance.  
- **Budget & cache:** token budget per run; cache keyed by `(facts hash, model id, style version)`.

---

## 3) Prompting Strategy

- **Inputs:** structured factSets (and, when useful, **full files** or code snippets—privacy is relaxed), style kit constraints, target chunk scope.  
- **Instructions:** *“Use only supplied facts; do not invent new entities, relationships, or claims; if unsure, produce a neutral sentence or return NEEDS_QUESTION.”*  
- **Outputs:** a concise paragraph/bullets per chunk, in Spec-Ready tone; optional `ASSUMPTIONS:` line for Medium confidence text.

---

## 4) Grounding Validator

### 4.1 Unit of Check
**Behavior chunk** — each chunk validated against its factSet(s)

### 4.2 Validation Rules
- **No New Entities:**
  - Extract candidate identifiers from chunk text: backticked tokens, `PascalCase`/`camelCase` words, dotted paths
  - Lookup against **KB symbol table** (entity names + aliases)
  - **Pronouns:** allow if antecedent exists in the same chunk (first reference must be explicit)
  - **Synonyms:** normalized via **lexicon map** (`ceps.lexicon.json`), e.g., `fetch|retrieve|get → fetch`

- **No New Relations:** relations must match extracted graph edges

- **Numeric/enum safety:**
  - Extract numerics/units/enums from text; normalize units (e.g., ms ↔ s)
  - **Strict equality** after normalization
  - Allow rounding to nearest integer for human-friendly units (e.g., 5000ms ↔ "5 seconds")
  - Any other mismatch → rejection and retry

- **Scope adherence:** chunk must reference only its declared factSet(s)

- **Terminology consistency:** use canonical names from KB

### 4.3 Outcomes
- `accept` — chunk passes validation
- `retry` — non-entailed text detected; retry with stricter prompt
- `fallback` — persistent failures fall back to deterministic template

### 4.4 Retry Strategy (up to 2 retries)

**Original prompt (O):**
```
Write a concise paragraph describing TARGET using only FACTS.
Use canonical names; do not add entities, relations, or numbers
not present in FACTS. If unsure, return NEEDS_QUESTION.
```

**Retry #1 (R1):**
```
Output **bullets only**. Use exact canonical names from FACTS
(no synonyms). Include only numbers/enums from FACTS.
No new entities/relations. If missing info, emit NEEDS_QUESTION.
```

**Retry #2 (R2):**
```
Map each FACT to **one bullet** verbatim; no paraphrase;
include entity names **exactly** as in FACTS;
omit anything not in FACTS.
```

### 4.5 Acceptable Paraphrasing
- Allowed when canonical → synonym mapping exists in lexicon
- Example: "retrieve" for "fetch" **accepted** if in lexicon
- "acquire" not in lexicon → **rejected** (or rewritten in R1/R2)
- Lexicon maintained in-repo; updated via PRs as needed

---

## 5) Failure & Fallback

- Gateway or validation failure → template output for that chunk; warning recorded; run does **not** fail gates if Coverage is satisfied and the chunk has a factSet.  
- If an entire file fails grounding repeatedly, generator emits a *Note* and continues with template prose.

---

## 6) Interfaces (Async)

All LLM Gateway operations are **asynchronous** (rate-limited queue):
- `summarize(factSets[], style, options) → Promise<ChunkDraft>`
- `synthesize(fileScope|dirScope) → Promise<ChunkDraft>`
- `validate(chunkDraft, factSets[]) → accept|retry|fallback` (synchronous validation)

---

## 7) Acceptance

- 100% of emitted chunks pass validator or fall back to templates.  
- No chunk emitted without factSet(s).  
- With `--deterministic`, identical inputs yield identical outputs (modulo timestamped sections).

---

## 8) Risks & Mitigations

- Overzealous validator rejecting acceptable paraphrases → broaden synonym map via KB lexicon.  
- Cost/latency spikes → caching; selective polishing (only low-confidence/complex areas).