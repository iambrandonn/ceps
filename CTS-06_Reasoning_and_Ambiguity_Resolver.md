# CTS-06 — Reasoning & Ambiguity Resolver

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Rules/patterns, iterative lifting, ambiguity queue, confidence upgrades, LLM fusion.

---

## 1) Purpose & Position
Transform structural facts into **behavioral intent** expressed as chunks, and converge on high-confidence explanations; unresolved items become **Open Questions**.

---

## 2) Reasoning Inputs & Outputs
- **Inputs:** entities, relations, factSets (AST + aux), framework matches, dynamic flags.  
- **Outputs:** behavior chunks (textDraft + confidence + factSetIds), updated relations when safe (e.g., inferred dependency semantics).

---

## 3) Rules & Patterns
- Directory semantics (controllers/routes/services/utils).  
- Signature shapes (Express `(req,res,next)`, middleware arity, React component patterns).  
- Known API idioms (fetch/axios, fs, crypto, timers).  
- Dataflow heuristics (accumulate → total; filter → validation; map → transform).  
- Error & side-effect extraction (throws, logging, I/O).  
- Config influence linking (env/config to branches/parameters).

---

## 4) Iterative Process
1) **Draft pass**: create minimal Spec-Ready chunks with templates.  
2) **Cross-reference pass**: analyze usage contexts (callers/callees), importers, config and test hints.  
3) **LLM fusion (optional)**: per-element and per-file synthesis with grounded prompts.  
4) **Convergence check**: stop when no change or cap reached; remaining Low → Open Questions.

---

## 5) Ambiguity Queue & Triage
- Queue Low-confidence items; prioritize exported/public symbols and flow-critical elements.  
- When hitting `--max-iterations`, convert remaining Lows to **Open Questions**; mark **Critical** where exported/public or flow-critical; list in root summary.

---

## 6) Confidence Upgrades
- Promote to Medium/High when rules and corroborating facts (types, tests, config, patterns) increase the score above thresholds (High ≥70, Medium 40–69)
- Apply confidence scoring algorithm from CTS-01 (additive model with clamping)
- Multiple factSets per chunk: weighted mean with conservative floor (min confidence band)

---

## 7) Interfaces
- `proposeChunks(entityId) → chunk[]`  
- `refine(chunkId) → chunk`  
- `triageOpenQuestions() → QID[]`

---

## 8) Acceptance
- Behavioral chunks exist for all exported/public surfaces (or Open Questions exist)
- Convergence within bounded iterations; no oscillation
- Confidence and triage rules applied consistently across runs

### 8.1 Testing Strategy
- **Unit tests:** One suite per component, target ≥80% branch coverage for scoring and validators
- **Deterministic fixtures:** For confidence scoring, pattern matches, anchor/QID generation
- **Integration fixtures:** Synthetic tiny projects (tiny-express-app, tiny-react-app, tiny-nest-service, tiny-orm-sql)
- **Golden file tests:** Run with `--deterministic` and `--llm off`; compare against golden outputs
- **Property-based tests:** For numeric/unit normalization and confidence score combinations
