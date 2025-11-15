# LLM-First Architecture Conversion Plan

**Date:** 2025-11-10
**Status:** Planning (Approved - Final with Review #2 Changes Incorporated)
**Owner:** Implementation Agent
**Reviewer:** Code Review Agent (Review #1: 2025-11-10, Review #2: 2025-11-10)

---

## Executive Summary

This document outlines the detailed conversion plan for pivoting ceps from a fact-extraction + pattern-matching architecture to an LLM-first semantic analysis architecture. This conversion addresses the fundamental gap identified in PIVOT.md: our current output is not reconstructable (42% quality vs. 63%+ target), failing the PRD's core promise.

**Key Insight:** Static analysis facts are insufficient for behavioral specifications. LLMs analyzing source code directly can infer intent, explain conditional logic, and produce reconstruction-ready specs.

**Conversion Strategy:** Incremental migration with validation gates at each phase, preserving the high-value components (KB, Scanner, Generator, Orchestrator) while replacing the complexity layer (PatternMatcher, IntentLifter, AmbiguityResolver, GroundingValidator).

---

## Success Criteria

### Quality Metrics (measured on research-coi fixture)
- ✅ High confidence: >75% (330+/443 entities, up from 42%)
- ✅ Reconstructability: >90% (400+/443 entities, up from ~30%)
  - **Validation method:** 50 randomly sampled entities (25 simple, 15 medium, 10 complex)
  - **Pass criteria:** "Can reconstruct equivalent code from description alone"
  - **Inter-rater reliability:** 2 reviewers, 90%+ agreement required
- ✅ Low confidence: <5% (20/443 entities, down from 10%)

### Performance Metrics
- ✅ research-coi runtime: <5 minutes (LLM enabled)
- ✅ Test suite: Maintains 90%+ coverage
- ✅ All existing integration tests pass

### Cost Metrics
- ✅ Per-run cost: $2-5 for medium projects (acceptable for one-time tool)
- ✅ Token usage: <2M tokens per 500-entity project
- ✅ Model selection: 70%+ entities use Haiku (cost optimization)

### Maintenance Metrics
- ✅ Codebase: ~15,000 lines (-35% from current 23,000)
- ✅ Test files: ~70 files (-24% from current 92)
- ✅ Pattern modules: 0 (elimination of 8 modules, ~3,000 lines)

---

## High-Level Architecture Transition

### Current Architecture (Fact-Based)
```
Scan → Parse (extract facts) → PatternMatch (lift intent)
    → Draft (templates) → LLM Polish (grounded to facts)
    → Grounding Validation → Ambiguity Resolution
    → Generate Specs
```

**Complexity:** 11 components, ~8,000 lines in reasoning/patterns/validation

### Target Architecture (LLM-First)
```
Scan → Parse (structure only) → LLM Analyze (semantics)
    → Review Pass (optional) → Generate Specs
    → Validate (cross-links, coverage)
```

**Simplicity:** 7 components, ~15,000 total lines (-35%)

### Component Mapping

| Current Component | Action | Replacement/Reason |
|------------------|--------|-------------------|
| Scanner & Loader | **Keep** | File discovery unchanged |
| Parser (fact extraction) | **Simplify** | Keep AST structure, import/export graph, call sites; remove predicate/object facts |
| PatternMatcher | **Delete** | Replaced by LLM semantic analysis |
| IntentLifter | **Delete** | Replaced by LLM semantic analysis |
| AmbiguityResolver | **Delete** | LLM inherently resolves through context |
| GroundingValidator | **Delete** | Replaced by cross-reference checker |
| Knowledge Base | **Simplify** | Keep entity/relation tracking; remove factSet attribution |
| LLM Gateway | **Expand** | Add LLMAnalyzer, keep provider abstraction |
| Spec Generator | **Simplify** | Remove factSet rendering, keep markdown gen |
| Cross-link Validator | **Keep** | Still need reference integrity |
| Orchestrator | **Simplify** | Remove REASONING/AMBIGUITY phases |

**Note:** Phase 0.5 will create a detailed "Parser Simplification Spec" to document which facts are preserved vs. deleted.

---

## Task Dependency Graph

**Note:** Since all work is done by AI agents, task organization is based on dependencies rather than time estimates.

```
Phase 0 (Preparation & Documentation)
  ├─ 0.0 Update Architecture Documentation (FIRST - before any code changes)
  │   ├─ SADS.md, AGENTS.md, STATUS.md, IMPLEMENTATION_PLAN.md
  │   ├─ CTS-02, CTS-05, CTS-06, PIVOT.md
  │   └─ Create user migration FAQ
  ├─ 0.1 Baseline Capture → 0.2 Branch Creation
  ├─ 0.3 Dependency Mapping → 0.4 Cost Tracker (enhanced)
  ├─ 0.5 Parser Simplification Analysis (parallel with 0.4)
  └─ 0.6 Regression Test Setup (parallel with 0.5)

Phase 1 (PoC)
  ├─ 1.1 LLMAnalyzer Prototype (depends: 0.4)
  ├─ 1.2 PoC Script (depends: 1.1)
  ├─ 1.3 Prompt Externalization (parallel with 1.2)
  └─ 1.4 Run & Document (depends: 1.2, 1.3)
      └─ **GATE 1:** Go/No-Go Decision (≥80% reconstructability)

Phase 1.5 (Prompt Engineering) - NEW from Review #2
  ├─ 1.5.1 A/B Test 3 Prompt Strategies (30 entities)
  ├─ 1.5.2 Create Domain Templates (Express, React, Mongoose, utilities)
  ├─ 1.5.3 Implement Template Selection
  ├─ 1.5.4 Measure Effectiveness (reconstructability >90%)
  └─ 1.5.5 Document Prompt Evolution Strategy

Phase 2 (Core Integration) - Only after Gate 1 PASS
  ├─ 2.1 Parser Updates (parallel)
  ├─ 2.2 Component Deletion (depends: 2.1 test pass)
  ├─ 2.3 LLMAnalyzer Integration + Batching (depends: 2.1, 2.2)
  ├─ 2.4 Cost Tiers (--llm-selective flag) - NEW from Review #2
  ├─ 2.8 Error Handling (rate limits, timeouts, retries) - NEW from Review #2
  ├─ 2.9 Observability (logging, debug mode, metrics) - NEW from Review #2
  └─ 2.10 Integration Tests (depends: all above)
      └─ **GATE 2:** All integration tests pass + smoke fixture

Phase 3 (Validation)
  ├─ 3.1 Enhanced Model Selection (framework-aware, adaptive) - Enhanced from Review #2
  ├─ 3.2 Batching Implementation (parallel)
  ├─ 3.3 Semantic Determinism Testing (>90% similarity, not byte-for-byte) - Updated from Review #2
  ├─ 3.4 Result Caching with Persistence (parallel)
  ├─ 3.5 Batching A/B Test (ON vs OFF) - NEW from Review #2
  ├─ 3.6 Research-COI Run (depends: 3.1-3.4)
  ├─ 3.7 Cost Analysis
  └─ 3.8 Performance Optimization
      └─ **GATE 3:** Quality >75%, Cost <$5, Semantic Determinism verified

Phase 4 (Review Agent - Optional)
  ├─ 4.1 ReviewAgent Implementation
  ├─ 4.2 Integration into Pipeline
  └─ 4.3 Convergence Testing
      └─ **GATE 4:** Review improves quality by 5-10%

Phase 5 (Documentation & Validation)
  ├─ 5.1 Update Architecture Documents (SADS, CTS, AGENTS, etc.)
  ├─ 5.2 Create Migration Summary
  ├─ 5.3 PRD Compliance Validation (3 projects)
  ├─ 5.4 Run Full Test Suite
  ├─ 5.5 Create Release Notes
  ├─ 5.7 Finalization Engine Redesign - NEW from Review #2
  └─ 5.8 Long-Term Maintenance Plan - NEW from Review #2

Phase 6 (Final Validation & Handoff)
  ├─ 6.1 Run Performance Benchmarks
  ├─ 6.2 Create Comparison Report
  ├─ 6.3 Create Handoff Document
  ├─ 6.4 Final Code Review
  └─ 6.5 Merge to Main
      └─ **FINAL GATE:** All metrics met, docs updated, ready to merge
```

---

## Phase 0: Pre-Conversion Preparation & Documentation

### Goals
- **FIRST:** Update all architecture documentation to reflect LLM-first approach
- Establish baseline metrics (quantitative + qualitative samples)
- Create safety checkpoints
- Set up validation infrastructure (cost tracking, regression tests)
- Document component dependencies and parser simplification strategy

### Tasks

#### 0.0 Update Architecture Documentation (CRITICAL - Do This First)

**Rationale:** Update documentation BEFORE any code changes so all stakeholders understand the architectural shift. Documentation should describe the target architecture, not the current state.

**Files to Update:**

##### 0.0.1 SADS.md
**Section 1.4 (Determinism Requirement) and Section 10 (Quality Gates):**
```markdown
OLD: "Determinism is mandatory. With `--deterministic`, identical inputs must produce byte-for-byte identical outputs."
NEW: "Semantic determinism is sufficient. Specs should be semantically equivalent (describe the same behavior), but may vary in wording. Byte-for-byte determinism is not required."

RATIONALE: User feedback: "determinism is overrated." Focus on correctness and reconstructability, not exact textual reproduction.
```

**Section 3.1 (Components & Responsibilities):**
```markdown
OLD (11 components):
6. **Reasoning & Inference Engine** — Rule/pattern library, framework-aware patterns
7. **LLM Gateway** — Summarization, synthesis, style normalization (optional polish)
8. **Ambiguity Resolver** — Iterative confidence promotion or Open Question generation
9. **Grounding Validator** — Validates chunks against factSets

NEW (7 components):
6. **LLM Analyzer** — Direct semantic analysis of source code; infers intent, conditional logic, side effects
7. **Cross-Reference Checker** — Validates entity references and prevents hallucinations
[REMOVED: PatternMatcher, IntentLifter, AmbiguityResolver, GroundingValidator]
```

**Section 3.2 (Lifecycle):**
```markdown
OLD:
Scan → Parse/Extract Facts → Draft (templates) → LLM Polish (grounded)
    → Ambiguity Queue → Iterative Resolution
    → Generate Specs (root + directories, in-place)

NEW:
Scan → Parse (structure) → LLM Analyze (semantics) → Generate Specs → Validate (cross-refs, coverage)
```

**Section 8 (LLM Gateway):**
```markdown
OLD: "Roles: summarize facts into fluent prose; fuse cross-file context; normalize style"
NEW: "Roles: PRIMARY - semantic analysis of source code to infer behavioral intent;
      SECONDARY - synthesize cross-file context and normalize style"
```

**Section 10 (Quality Gates):**
```markdown
REMOVE: Grounding Gate (factSetId validation)
KEEP: Coverage Gate, Link Gate, Confidence Gate, Finalization Gate
ADD: Cross-Reference Gate (validate entity references, prevent hallucinated entities)
```

##### 0.0.2 AGENTS.md
**Current Status section:**
```markdown
**Current Status:** Phase 6 (Production Hardening) Wave 2 - LLM-First Architecture Pivot

**Status:** Planning complete. Documentation updated. Ready to begin Phase 0 implementation.

**Context:**
- Quality analysis on research-coi revealed 42% High confidence (target: 63%+)
- Root cause: Fact-based reasoning insufficient for reconstructable specs
- Decision: Pivot to LLM-first semantic analysis (see PIVOT.md)
- Approach: Incremental migration with PoC validation gate
```

**Core Architecture section:**
```markdown
### Components (7 components, simplified from 11)
1. **Codebase Scanner & Loader** (CTS-05a) — File discovery and indexing
2. **Static Analysis Engine** (CTS-05) — AST parsing, structure extraction
3. **Knowledge Base (KB)** (CTS-01) — Entity/relation tracking, confidence scores
4. **LLM Analyzer** (NEW) — Semantic analysis of source code for behavioral intent
5. **Cross-Reference Checker** (NEW) — Entity validation, hallucination prevention
6. **Specification Generator** (CTS-03) — Markdown output with anchors and cross-links
7. **Orchestrator** (CTS-07) — Phase coordination and parallelization

[REMOVED: PatternMatcher, IntentLifter, AmbiguityResolver, GroundingValidator]
```

**Execution Flow:**
```markdown
Scan → Parse (structure) → LLM Analyze (semantics) → Generate → Validate
```

**Implementation Status section:**
Add new entry:
```markdown
10. ~~Execute Phase 6 Wave 2: LLM-First Pivot~~ → **In Progress** (2025-11-10)
   - ✅ Gap analysis complete (see PIVOT.md)
   - ✅ Conversion plan approved by Code Review Agent
   - ✅ Architecture documentation updated
   - 🔄 Phase 0: Preparation & validation infrastructure
   - ⏳ Phase 1: Proof of concept (10-entity validation)
```

##### 0.0.3 STATUS.md
**Replace entire file with:**
```markdown
# ceps — Current Status

**Last Updated:** 2025-11-10
**Phase:** 6 (Production Hardening) Wave 2 - LLM-First Architecture Pivot
**Last Completed:** Architecture documentation update (Phase 0.0)
**Status:** 🟢 **ACTIVE** - Beginning Phase 0 (Preparation)

---

## Current Step

**Step:** Phase 0 - Pre-Conversion Preparation
**Task:** Update architecture documentation and establish baseline
**Agent Role:** Implementation Agent
**Deliverable:** Documentation updates, baseline metrics, validation infrastructure

**Context:**
- 🎯 **LLM-First Architecture Pivot** (Started 2025-11-10)
  - Root cause: Fact-based reasoning produces 42% High confidence (target: 63%+)
  - Solution: LLM semantic analysis of source code directly
  - Approach: Incremental migration with PoC validation gate
  - Plan: `docs/planning/active/llm-first-conversion-plan.md`
  - Review: `docs/reviews/phase6/llm-first-conversion-plan-review.md`
  - Analysis: `PIVOT.md`

**Phase 0 Progress:**
- ✅ **0.0: Architecture Documentation Updated** - SADS, AGENTS, STATUS, IMPLEMENTATION_PLAN, CTS docs
- [ ] 0.1: Baseline Capture (quantitative + qualitative)
- [ ] 0.2: Branch Creation
- [ ] 0.3: Dependency Mapping
- [ ] 0.4: Enhanced Cost Tracker
- [ ] 0.5: Parser Simplification Spec
- [ ] 0.6: Regression Test Setup

**Next Actions:**
- Execute Phase 0.1: Baseline capture (research-coi)
- Execute Phase 0.4-0.6 in parallel
- **Gate 0:** All preparation tasks complete → Proceed to Phase 1 (PoC)

---

## LLM-First Conversion Status

### Target Architecture

**From (Fact-Based):**
```
11 components, ~23,000 LOC
Scan → Parse (facts) → PatternMatch → LLM Polish (grounded) → Generate
```

**To (LLM-First):**
```
7 components, ~15,000 LOC (-35%)
Scan → Parse (structure) → LLM Analyze (semantics) → Generate → Validate
```

### Success Criteria
- High confidence: 42% → 75%+ (187 → 330+ entities)
- Reconstructability: ~30% → 90%+ (manual validation)
- Cost: $0.03 → $2-5 per run (acceptable for one-time tool)
- Maintenance: -35% LOC, -24% test files, 0 pattern modules

### Phase Checklist
- [x] **Phase 0.0:** Documentation updates
- [ ] **Phase 0.1-0.6:** Preparation & validation infrastructure
- [ ] **Phase 1:** Proof of concept (10 entities, ≥80% reconstructability)
  - **GATE 1:** Go/No-Go decision
- [ ] **Phase 2:** Core integration (remove patterns, add LLMAnalyzer)
  - **GATE 2:** All integration tests pass
- [ ] **Phase 3:** Validation (research-coi quality >75%, cost <$5)
  - **GATE 3:** Metrics met, determinism verified
- [ ] **Phase 4:** Review agent (optional, +5-10% quality)
  - **GATE 4:** Review improves quality
- [ ] **Phase 5-6:** Final validation & handoff
  - **FINAL GATE:** All metrics met, ready to merge

---

## Recent Decisions / Context

- **🟢 Architecture pivot approved** (2025-11-10) - LLM-first approach validated by Code Review Agent
- **🟢 Documentation updated first** (2025-11-10) - All stakeholders understand target architecture before code changes
- **🔴 Critical gap identified** (2025-11-09) - Fact-based reasoning cannot achieve PRD's reconstructability promise
- **Quality baseline established** (2025-11-09) - research-coi: 42% High, 10% Low (90% Spec-Ready)
- **Pattern improvements complete** (2025-11-09) - Constant inlining, semantic functions (+156 High, -190 Low)
- **Diminishing returns confirmed** (2025-11-09) - Further patterns won't reach 63% target (need LLM)

---

## Blockers / Open Questions

- None (documentation phase complete; ready for implementation)

---

## Quick Links

### LLM-First Pivot
- [Pivot Analysis](PIVOT.md) - Why we're pivoting and architectural rationale
- [Conversion Plan](docs/planning/active/llm-first-conversion-plan.md) - Detailed implementation plan
- [Plan Review](docs/reviews/phase6/llm-first-conversion-plan-review.md) - Code Review Agent feedback
- [Plan Updates](docs/internal/analysis/llm-first-plan-updates.md) - Checklist of review recommendations
- [Conversion Summary](docs/internal/analysis/llm-first-conversion-summary.md) - Before/after comparison

### Quality Improvement Sprint (Pre-Pivot)
- [Baseline Analysis](docs/internal/analysis/research-coi-spec-quality-analysis.md)
- [LLM Polish Gap Analysis](docs/internal/analysis/llm-polish-gap-analysis.md)
- [Quality Workflow](docs/process/quality-improvement-workflow.md)

---

## Test Status

**Last Test Run:** 2025-11-09 (pre-pivot)
**Total Tests:** 1313 passing, 4 skipped
**Coverage:** 93%+ maintained

**Post-Pivot Target:**
- Tests: ~900 passing (removal of ~220 pattern tests)
- Coverage: 90%+ (fewer lines to cover)
- New tests: Regression, determinism, LLM analysis, smoke fixture
```

##### 0.0.4 IMPLEMENTATION_PLAN.md
**Update Phase 6 section:**
```markdown
### Phase 6: Production Hardening (High Parallelization) - UPDATED 2025-11-10

**Status:** In progress (Wave 2 - LLM-First Architecture Pivot)

**Wave 1 (Complete):**
- ✅ Express pattern library (8 modules, 220 tests)
- ✅ HTTP Clients pattern library (I1 complete)
- ✅ Quality improvements (90% Spec-Ready on research-coi)

**Wave 2 (LLM-First Pivot - Current):**
- **Rationale:** Pattern-based approach hit diminishing returns (42% High confidence vs. 63% target)
- **Solution:** Replace pattern matching with LLM semantic analysis of source code
- **Approach:** Incremental migration with PoC validation gate
- **Plan:** `docs/planning/active/llm-first-conversion-plan.md`

**Workstream Changes:**
- **WS-D Reasoning — Pattern expansion** → **REMOVED** (replaced by LLM Analyzer)
- **WS-F LLM Gateway** → **EXPANDED** (add LLMAnalyzer for semantic analysis)
- **WS-NEW: Cross-Reference Checker** → **ADDED** (validate entity references, prevent hallucinations)

**Architecture Changes:**
- Components: 11 → 7 (remove PatternMatcher, IntentLifter, AmbiguityResolver, GroundingValidator)
- LOC: ~23,000 → ~15,000 (-35%)
- Tests: 1313 → ~900 (-31% from pattern removal, +regression/determinism tests)

**Expected Outcomes:**
- High confidence: 42% → 75%+
- Reconstructability: ~30% → 90%+
- Cost: $0.03 → $2-5 per run (acceptable for one-time tool)
- Maintenance: -35% code, -24% tests

**Checkpoint:** M3 gates updated to reflect LLM-first architecture (pattern accuracy gate removed)
```

##### 0.0.5 CTS-02_LLM_Gateway_and_Grounding.md
**Add new section at top:**
```markdown
## ARCHITECTURAL UPDATE (2025-11-10)

This CTS has been updated to reflect the **LLM-First Architecture** pivot in Phase 6 Wave 2.

**Key Changes:**
- **PRIMARY ROLE:** Direct semantic analysis of source code (was: optional polish)
- **NEW COMPONENT:** LLMAnalyzer — analyzes entities and generates behavioral descriptions
- **REMOVED:** Grounding Validator (chunk-level factSet validation)
- **REPLACED BY:** Cross-Reference Checker (entity-level validation)

**See:** `PIVOT.md` for rationale, `docs/planning/active/llm-first-conversion-plan.md` for implementation plan.
```

**Update Section 2 (Roles & Responsibilities):**
```markdown
### 2.1 Primary Role: Semantic Analysis
The LLM Gateway's primary role is to **analyze source code directly** and infer behavioral intent:
- Explain what code does and why (behavioral intent)
- Describe inputs, outputs, return values, side effects
- Document error handling, edge cases, conditional logic
- Note environment variables, configuration, external dependencies

### 2.2 Secondary Role: Synthesis & Style
- Synthesize cross-file context (multi-module interactions)
- Normalize style and terminology
- Generate fluent, reconstruction-ready prose

### 2.3 Validation: Cross-Reference Checking
- Validate entity references (no hallucinated entities)
- Check cross-file references are real
- Flag invented dependencies or non-existent modules
```

**Remove Section 6 (Grounding Validator):**
```markdown
## 6) Grounding Validator [REMOVED - 2025-11-10]

**Status:** Removed in LLM-First Architecture pivot.

**Rationale:** Grounding validator prevented LLMs from inferring obvious truths visible in source code
because facts weren't pre-extracted. LLM-first approach gives LLM direct access to source code,
eliminating the fact bottleneck.

**Replaced by:** Cross-Reference Checker validates entity references post-generation.

**See:** `PIVOT.md` Section "Root Cause Analysis: The Grounding Constraint Paradox"
```

##### 0.0.6 CTS-05_Static_Analysis_and_Pattern_Detection.md
**Add note at top:**
```markdown
## ARCHITECTURAL UPDATE (2025-11-10)

**Pattern Detection Status:** Active (for side-effect detection and dynamic pattern flagging)
**Pattern Matching for Intent Lifting:** REMOVED in LLM-First Architecture pivot

**Key Change:**
- Pattern detection still identifies dynamic patterns (eval, Proxy, dynamic imports)
- Pattern matching for intent lifting (Express routes, React hooks, etc.) **removed**
- Intent lifting now handled by LLM semantic analysis

**See:** `PIVOT.md` for rationale.
```

##### 0.0.7 CTS-06_Reasoning_and_Ambiguity_Resolver.md
**Replace entire document with deprecation notice:**
```markdown
# CTS-06: Reasoning & Ambiguity Resolver [DEPRECATED]

**Status:** DEPRECATED as of 2025-11-10 (Phase 6 Wave 2)
**Replaced by:** LLM Semantic Analysis (see CTS-02)

---

## Deprecation Notice

This component has been removed in the **LLM-First Architecture** pivot (Phase 6 Wave 2).

**Rationale:**
- Pattern-based intent lifting achieved 42% High confidence (target: 63%+)
- Diminishing returns: Each new pattern provided smaller improvements
- Maintenance burden: ~8,000 lines of pattern code, ~220 tests
- Brittleness: Patterns break on code changes, require constant updates

**Solution:**
LLMs analyzing source code directly can:
- Infer intent from implementation (no pre-extracted facts needed)
- Explain conditional logic and decision points
- Understand environment variables and configuration
- Recognize patterns without explicit pattern matchers
- Produce reconstruction-ready specifications

**Architecture Change:**
```
OLD: Scan → Parse (facts) → PatternMatch → Lift Intent → Resolve Ambiguity → Generate
NEW: Scan → Parse (structure) → LLM Analyze (semantics) → Generate → Validate
```

**Removed Components:**
- PatternMatcher (pattern library, registry)
- IntentLifter (rule-based intent promotion)
- AmbiguityResolver (iterative confidence promotion)

**Preserved Functionality:**
- Confidence scoring (moved to LLM self-assessment)
- Open Question generation (for low-confidence entities)

**See:**
- `PIVOT.md` — Architectural analysis and rationale
- `docs/planning/active/llm-first-conversion-plan.md` — Implementation plan
- `CTS-02_LLM_Gateway_and_Grounding.md` — LLMAnalyzer specification

---

## Historical Reference

[Original CTS-06 content preserved below for historical reference...]

[... rest of original document ...]
```

##### 0.0.8 PIVOT.md
**Add section at top:**
```markdown
## Implementation Status

**Status:** ✅ Planning complete, documentation updated
**Plan:** `docs/planning/active/llm-first-conversion-plan.md`
**Review:** `docs/reviews/phase6/llm-first-conversion-plan-review.md` (Approved with Recommendations)
**Next:** Phase 0 (Preparation) → Phase 1 (PoC with Go/No-Go gate)

**Documentation Updates (2025-11-10):**
- ✅ SADS.md — Components, lifecycle, gates updated
- ✅ AGENTS.md — Status, architecture, execution flow updated
- ✅ STATUS.md — Rewritten to reflect pivot
- ✅ IMPLEMENTATION_PLAN.md — Phase 6 updated
- ✅ CTS-02 — LLMAnalyzer added, GroundingValidator removed
- ✅ CTS-05 — Pattern detection clarified (still used for side effects)
- ✅ CTS-06 — Marked as deprecated with historical reference
- ✅ PIVOT.md — Implementation status added (this section)

**Metrics will be added here after Phase 6 completion:**
- Final quality: High confidence % on research-coi
- Final cost: Per-run cost on medium projects
- Final performance: Runtime on research-coi
- Final comparison: Before/after tables
```

**Add new section "Why Not Option C?" (after "Why Not Option B" section):**
```markdown
## Why Not Option C: Complete Fact Extraction + Compositional Inference?

**Option C Proposal (from Review #2):**
> "Extract ALL facts comprehensively (environment variables, conditional branches, configuration sources), then use compositional inference to synthesize behavior descriptions without LLM grounding constraints."

**Decision: REJECTED**

**Rationale:**

### 1. Already Tried This Path (3 Iterations)

We spent significant effort improving pattern matching:
- **Iteration 1:** Basic Express patterns → 7% High confidence
- **Iteration 2:** Constant inlining + semantic functions → 42% High confidence
- **Iteration 3:** Extended patterns (conditional detection, async tracking) → Still 42%

**Result:** Diminishing returns. Each iteration provided smaller improvements.

### 2. Fundamental Limitation: The Grounding Constraint Paradox

The grounding constraint says: "Every behavior chunk must be attributable to factSets."

This prevents LLMs from inferring obvious truths visible in source code but not pre-extracted as facts.

**Example:**
```javascript
export function buildCache(keyPrefix) {
  if (process.env.REDIS_HOST) {
    return new RedisCache(keyPrefix, {
      host: process.env.REDIS_HOST,
      tls: process.env.REDIS_TLS === 'true'
    });
  }
  return new MemoryCache(keyPrefix);
}
```

**What we need to say:**
> "Conditionally returns a Redis-backed cache if REDIS_HOST environment variable is set, otherwise returns an in-memory cache. Redis implementation supports TLS if REDIS_TLS is 'true'."

**What facts we can extract:**
- `conditional-branch: if process.env.REDIS_HOST`
- `env-var-access: REDIS_HOST`
- `env-var-access: REDIS_TLS`
- `return: new RedisCache(...)`
- `return: new MemoryCache(...)`

**The problem:**
Even with complete fact extraction, the LLM cannot say "returns Redis if REDIS_HOST is set" because:
1. That requires INFERRING the conditional relationship between the facts
2. Grounding constraint prevents inference not explicitly in factSets
3. We'd need a fact like `conditional-return: RedisCache when REDIS_HOST present`
4. But that fact IS the behavioral description we're trying to generate!

**Circular dependency:** The facts we need are the behavior descriptions we're trying to create.

### 3. Compositional Inference = Reimplementing LLMs

To do compositional inference well, we'd need to:
- Build a semantic reasoner that understands JavaScript semantics
- Implement control flow analysis (branching, loops, exceptions)
- Track data flow (where values come from, where they go)
- Understand library semantics (what does `new RedisCache()` do?)
- Infer programmer intent from implementation choices

**This is exactly what LLMs are trained to do.** We'd be reimplementing a large language model with manual rules.

### 4. User Decision

User explicitly rejected this path:
> "I don't want to get dragged down pursuing something that isn't effective again."

We've already tried improving pattern extraction 3 times. Continuing down this path risks further diminishing returns.

### 5. PoC Will Validate LLM-First

If LLM-first PoC (Phase 1) achieves <80% reconstructability, we'll reconsider alternatives including Option C.

**Phase 1 Decision Gate:**
- ✅ PoC ≥80% reconstructability → Proceed with LLM-first
- ❌ PoC <80% reconstructability → Abort and reconsider Option B or Option C

**Current confidence:** 80% that LLM-first will succeed. The PoC will provide empirical validation.

### Conclusion

Option C represents continuing down a path that has already shown diminishing returns. The grounding constraint paradox is a fundamental architectural limitation, not a fact-extraction completeness problem. LLM-first architecture sidesteps this by giving LLMs direct access to source code, eliminating the fact bottleneck.

If the PoC fails, we'll reconsider with empirical data.
```

##### 0.0.9 Create User Migration FAQ (NEW FILE)
**File:** `docs/user/llm-first-migration-faq.md`
```markdown
# LLM-First Architecture: User FAQ

**Date:** 2025-11-10
**Status:** Migration in progress
**Affects:** All users (CLI unchanged, but costs and output quality will change)

---

## What changed?

ceps now uses **LLM semantic analysis** to generate behavioral specifications. Previously, we used pattern matching + optional LLM polish. Now, LLMs analyze source code directly to infer behavioral intent.

**Technical change:**
- **Before:** Pattern matching → Templates → LLM polish
- **After:** LLM semantic analysis → Generate

**Benefit:** Specs are now **reconstructable** — a capable LLM can regenerate equivalent code from the spec alone.

---

## Do I need to do anything?

**No.** The CLI and workflow are unchanged. Your existing commands work exactly the same.

```bash
# Same as before
ceps <project-root>
ceps finalize --answers ./answers.md
```

---

## Will it cost more?

**Yes.** LLM semantic analysis costs more than pattern matching.

**Typical costs:**
- Small projects (100-200 entities): $0.50-1.00
- Medium projects (500-1000 entities): $2.00-5.00
- Large projects (2000+ entities): $10-20

**Previous cost:** ~$0.03 per run (LLM polish only)

**Why the increase?**
We're analyzing every entity with LLMs (not just polishing templates). This produces **dramatically better output**:
- High confidence: 42% → 75%+
- Reconstructability: ~30% → 90%+
- Meets PRD promise: "specs enable code reconstruction"

**Trade-off:** $2-5 one-time cost for specifications you can actually use.

---

## Can I control costs?

**Yes.** Several options:

### 1. Budget Cap
```bash
ceps <project> --llm-budget 5.00
```
Stops analysis when $5 spent. Entities analyzed so far are preserved.

### 2. LLM Off Mode
```bash
ceps <project> --llm off
```
Uses template-only generation (lower quality, but free). Not recommended — defeats the purpose of the pivot.

### 3. Focus on Public API
```bash
ceps <project> --focus public-api
```
Only analyzes exported/public entities. Reduces scope by ~50% in typical projects.

### 4. Model Selection (Automatic)
ceps automatically uses cheaper models (Haiku) for simple entities and more capable models (Sonnet) for complex code. No configuration needed.

---

## Will my specs change?

**Yes.** Regenerated specs will be **much more detailed**:

**Before (pattern-based):**
> Builds cache based on keyPrefix.

**After (LLM-first):**
> Conditionally returns a Redis-backed cache if the REDIS_HOST environment variable is set (using ioredis client with optional TLS and authentication), otherwise returns an in-memory LRU cache. Both implementations provide async get/set/del methods with keyPrefix namespacing, JSON serialization, and TTL support via options.stdTTL. The Redis implementation logs warnings on cache errors but continues gracefully.

**Key differences:**
- Conditional logic explained (Redis vs. memory)
- Environment variables documented (REDIS_HOST)
- Error handling described (warnings on errors)
- Implementation details (TLS, authentication, TTL)

**Old specs preserved:** Your old specs are in git history. You can always revert if needed.

---

## Why did you make this change?

**Short answer:** The pattern-based approach couldn't achieve the PRD's promise.

**Detailed rationale:**
1. **Quality gap:** Pattern matching achieved 42% High confidence (target: 63%+)
2. **Reconstructability gap:** Only ~30% of specs were reconstructable (target: 90%+)
3. **Diminishing returns:** Each new pattern provided smaller improvements
4. **Maintenance burden:** ~8,000 lines of pattern code, ~220 tests, brittle to code changes

**Solution:** LLMs analyzing source code directly can infer intent, explain conditional logic, and produce reconstruction-ready specs — which is what the PRD promises.

**See:** `PIVOT.md` for full architectural analysis.

---

## Will performance change?

**Runtime will increase** due to LLM API calls:
- Small projects: <2 minutes (was ~30 seconds)
- Medium projects: <5 minutes (was ~2 minutes)
- Large projects: <30 minutes (was ~5 minutes)

**Optimization:** We parallelize LLM calls and use caching to minimize repeated analysis.

---

## Can I still use finalization?

**Yes.** Finalization workflow is unchanged:
```bash
# Generate baseline
ceps <project>

# Answer questions in answers.md

# Apply answers and regenerate
ceps finalize --answers ./answers.md
```

**Bonus:** Finalization now uses **result caching** — unchanged entities aren't re-analyzed (cost ~$0 for finalization).

---

## What if I find issues?

**Report issues at:** https://github.com/anthropics/claude-code/issues

**Common issues and solutions:**

### LLM produces vague descriptions
- Check entity complexity (may be using Haiku for complex code)
- Try `--review` flag (enables quality improvement pass)

### Cost exceeds expectations
- Use `--llm-budget <amount>` to cap spending
- Use `--focus public-api` to reduce scope

### Descriptions seem inaccurate
- Enable review pass: `ceps <project> --review`
- Check LLM model version (Sonnet 4.5 required)
- Validate source code is parseable (check for syntax errors)

### Performance is slow
- Expected: LLM analysis takes longer than pattern matching
- Typical: 5 minutes for medium projects
- If >10 minutes: Check network latency to LLM provider

---

## When will this be released?

**Timeline:**
1. ✅ Planning complete (2025-11-10)
2. ✅ Documentation updated (2025-11-10)
3. 🔄 Phase 0: Preparation & validation infrastructure
4. ⏳ Phase 1: Proof of concept (10-entity validation with Go/No-Go gate)
5. ⏳ Phase 2-3: Core integration & validation
6. ⏳ Phase 4-6: Review agent, final validation, handoff
7. ⏳ Merge to main & release

**Estimated:** 2-3 weeks from Phase 0 start

**Preview:** You can track progress in `STATUS.md`

---

## Summary

- **Change:** LLM semantic analysis (was: pattern matching)
- **CLI:** Unchanged (commands work the same)
- **Cost:** $2-5 per run (was: $0.03)
- **Quality:** 75%+ High confidence, 90%+ reconstructable (was: 42%, ~30%)
- **Performance:** ~5 min for medium projects (was: ~2 min)
- **Why:** Pattern approach couldn't achieve PRD's reconstructability promise
- **Control:** `--llm-budget`, `--focus public-api`, automatic model selection
- **When:** 2-3 weeks (currently in Phase 0)

**Questions?** See `PIVOT.md` for technical details or open an issue on GitHub.
```

**Success Criteria for Phase 0.0:**
- ✅ All 8 architecture documents updated
- ✅ User migration FAQ created
- ✅ Documentation describes target architecture (not current state)
- ✅ All stakeholders can understand the pivot before code changes begin

#### 0.1 Enhanced Baseline Capture
```bash
# Run current system on research-coi
npm run build
./dist/cli.js ../output-test/research-coi --llm off

# Capture quantitative metrics
cd ../output-test/research-coi
./check-quality.sh > baseline-before-pivot.txt

# Capture qualitative samples (10 entities for before/after comparison)
cat > baseline-samples.md <<'EOF'
# Sample Entity Descriptions (Pre-Pivot)

## buildCache (function)
$(grep -A 10 "buildCache" spec.md | head -15)

## DISCLOSURE_STATUS (constant)
$(grep -A 5 "DISCLOSURE_STATUS" spec.md | head -10)

## structuredLogger (function)
$(grep -A 10 "structuredLogger" spec.md | head -15)

## formatDate (function)
$(grep -A 8 "formatDate" spec.md | head -12)

## createRouter (function)
$(grep -A 10 "createRouter" spec.md | head -15)

[... 5 more diverse samples]
EOF

# Commit baseline
cd ../../ceps
git add ../output-test/research-coi/baseline-*.txt ../output-test/research-coi/baseline-samples.md
git commit -m "Pre-pivot baseline: research-coi quantitative + qualitative samples"
```

**Expected output:**
- High confidence: ~42% (187/443)
- Low confidence: ~10% (45/443)
- Total entities: 443
- Qualitative samples: 10 entities captured for side-by-side comparison

#### 0.2 Create Conversion Branch
```bash
git checkout -b feature/llm-first-conversion
git push -u origin feature/llm-first-conversion
```

#### 0.3 Document Component Dependencies
**File:** `docs/internal/analysis/component-dependency-map.md`

Map which tests depend on which components:
- Pattern tests (to be deleted): ~220 tests
- Integration tests (to be preserved): ~15 tests
- KB tests (to be preserved): ~40 tests
- Parser tests (to be modified): ~35 tests

#### 0.4 Set Up Cost Tracking
**File:** `src/llm/cost-tracker.ts`

Create utility to track token usage per run:
```typescript
export class CostTracker {
  private totalTokens = 0;
  private modelUsage = new Map<string, number>();

  trackUsage(model: string, tokens: number) {
    this.totalTokens += tokens;
    this.modelUsage.set(model, (this.modelUsage.get(model) || 0) + tokens);
  }

  getEstimatedCost(): number {
    // Haiku: $0.25/1M input tokens
    // Sonnet: $3.00/1M input tokens
    // ... calculate based on modelUsage
  }

  report(): string {
    return `Total tokens: ${this.totalTokens}, Estimated cost: $${this.getEstimatedCost().toFixed(2)}`;
  }
}
```

### Success Criteria
- ✅ Baseline metrics captured and committed
- ✅ Branch created and pushed
- ✅ Component dependency map documented
- ✅ Cost tracking utility implemented

---

## Phase 1: Proof of Concept (2-3 days)

### Goals
- Validate LLM-first approach produces better output
- Measure token usage and cost
- Establish confidence in the pivot direction

### 1.1 Create LLMAnalyzer Prototype

**File:** `src/llm/analyzer.ts`

```typescript
export interface AnalysisContext {
  imports: string[];
  exports: string[];
  fileContext?: string;
  relatedEntities?: Entity[];
}

export interface AnalysisResult {
  description: string;
  confidence: number;
  sideEffects: string[];
  dependencies: string[];
}

export class LLMAnalyzer {
  constructor(
    private llmGateway: LLMGateway,
    private costTracker: CostTracker
  ) {}

  async analyzeEntity(
    entity: Entity,
    sourceCode: string,
    context: AnalysisContext
  ): Promise<BehaviorChunk> {
    const model = this.selectModel(entity);
    const prompt = this.buildPrompt(entity, sourceCode, context);

    const response = await this.llmGateway.analyze(prompt, {
      model,
      temperature: 0,
      maxTokens: 500,
    });

    this.costTracker.trackUsage(model, response.usage.totalTokens);

    return {
      id: generateId(),
      targetEntityId: entity.id,
      textDraft: response.content,
      confidence: this.inferConfidence(response.content, entity),
      factSetIds: [], // No longer used
    };
  }

  private selectModel(entity: Entity): string {
    // Use Haiku for simple entities (cost optimization)
    if (entity.kind === 'constant' || entity.kind === 'export') {
      return 'claude-3-5-haiku-20241022';
    }

    // Use Haiku for simple functions (< 20 LOC, no complex logic)
    if (entity.kind === 'function' && this.isSimpleFunction(entity)) {
      return 'claude-3-5-haiku-20241022';
    }

    // Use Sonnet for complex entities (classes, complex functions)
    return 'claude-sonnet-4-5-20250929';
  }

  private buildPrompt(
    entity: Entity,
    sourceCode: string,
    context: AnalysisContext
  ): string {
    return `You are analyzing a ${entity.kind} in a JavaScript/TypeScript codebase to generate a behavioral specification.

**Entity:** ${entity.kind} "${entity.name}"
**File:** ${entity.filePath}

**Source code:**
\`\`\`${entity.language || 'javascript'}
${sourceCode}
\`\`\`

${context.imports.length > 0 ? `**Imports:** ${context.imports.join(', ')}` : ''}
${context.exports.length > 0 ? `**Exports:** ${context.exports.join(', ')}` : ''}

**Your task:** Generate a behavioral specification that explains WHAT this code does and WHY (behavioral intent).

**Requirements:**
1. **Inputs/Outputs:** Describe parameters, return values, and their semantics
2. **Behavior:** Explain the key operations and decision logic (including conditionals)
3. **Side Effects:** Document I/O, network, database, state changes, logging
4. **Error Handling:** Describe error conditions, validation, edge cases
5. **Dependencies:** Note environment variables, configuration, external services
6. **Conditional Logic:** Explain branching behavior (if/else, switches, ternaries)

**Style:**
- Use present tense, active voice (e.g., "validates", "returns", "emits")
- Be concise but complete (2-4 sentences for functions, 1-2 for constants/exports)
- Focus on behavior and intent, not implementation algorithms
- If behavior is obvious from the name/signature, still explain key details

**Output format:**
Provide ONLY the description (2-4 sentences). Do not include preamble, headings, or explanations.

**Example output for a function:**
"Conditionally returns a Redis-backed cache if the REDIS_HOST environment variable is set, otherwise returns an in-memory LRU cache. Both implementations provide async get/set/del methods with keyPrefix namespacing and TTL support. Logs warnings on cache errors but continues gracefully. Throws an error if keyPrefix is missing."`;
  }

  private inferConfidence(description: string, entity: Entity): number {
    // Heuristics for confidence scoring
    // High confidence (70+): Specific details, no hedging language
    // Medium confidence (40-69): Some details, minor hedging
    // Low confidence (<40): Vague, many hedges

    const hedgeWords = [
      'unclear', 'unknown', 'probably', 'might', 'possibly',
      'seems to', 'appears to', 'likely', 'may', 'could be'
    ];

    const hedgeCount = hedgeWords.reduce((count, word) => {
      return count + (description.toLowerCase().includes(word) ? 1 : 0);
    }, 0);

    const hasSpecifics = description.match(/\b(validates|returns|emits|persists|fetches|authorizes|schedules|retries|caches|transforms|computes)\b/i);
    const hasEnvironmentDetails = description.match(/\b(environment variable|env var|process\.env|config|setting)\b/i);
    const hasSideEffects = description.match(/\b(logs|writes|reads|fetches|stores|sends|publishes|subscribes)\b/i);

    if (hedgeCount === 0 && hasSpecifics && (hasEnvironmentDetails || hasSideEffects)) {
      return 80; // High confidence
    } else if (hedgeCount <= 1 && hasSpecifics) {
      return 60; // Medium-high
    } else if (hedgeCount <= 2) {
      return 45; // Medium
    } else {
      return 30; // Low
    }
  }

  private isSimpleFunction(entity: Entity): boolean {
    // Heuristic: Simple if < 20 LOC and no complex patterns
    // In real impl, would inspect AST for complexity
    return false; // Conservative default to Sonnet
  }
}
```

### 1.2 Create PoC Test Script

**File:** `scripts/poc-llm-first.ts`

```typescript
import { LLMAnalyzer } from '../src/llm/analyzer.js';
import { LLMGateway } from '../src/llm/gateway.js';
import { CostTracker } from '../src/llm/cost-tracker.js';
import { KnowledgeBase } from '../src/kb/knowledge-base.js';

async function runPoC() {
  // Select 10 sample entities from research-coi
  const testEntities = [
    'buildCache', // Conditional logic example
    'structuredLogger', // Complex function
    'DISCLOSURE_STATUS', // Constant (should be detailed)
    'formatDate', // Utility function
    'createRouter', // Express pattern
    // ... 5 more diverse examples
  ];

  const kb = new KnowledgeBase();
  const costTracker = new CostTracker();
  const llmGateway = new LLMGateway({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const analyzer = new LLMAnalyzer(llmGateway, costTracker);

  console.log('🧪 LLM-First PoC: Analyzing 10 entities from research-coi\n');

  for (const entityName of testEntities) {
    // Load entity + source code
    const entity = await loadEntity(entityName);
    const sourceCode = await extractSourceCode(entity);
    const context = await buildContext(entity);

    // Analyze with LLM
    console.log(`\n📊 Analyzing: ${entityName}`);
    const result = await analyzer.analyzeEntity(entity, sourceCode, context);

    console.log(`   Confidence: ${result.confidence}`);
    console.log(`   Description: ${result.textDraft.substring(0, 100)}...`);

    // Compare with current output
    const currentOutput = await getCurrentOutput(entityName);
    console.log(`   Current: ${currentOutput.substring(0, 100)}...`);
  }

  console.log('\n\n💰 Cost Report:');
  console.log(costTracker.report());

  console.log('\n\n✅ PoC Complete. Review outputs above to assess quality.');
}

runPoC().catch(console.error);
```

### 1.3 Run PoC and Document Results

**Execute:**
```bash
npx tsx scripts/poc-llm-first.ts > docs/internal/analysis/poc-results.md
```

**Expected results:**
- 8-10 entities have reconstructable descriptions (80-100% success)
- Token cost < $0.50 for 10 entities
- Descriptions include conditional logic, side effects, environment variables

### 1.4 Decision Gate: Go/No-Go

**Criteria for proceeding:**
- ✅ Reconstructability: ≥80% (8/10 entities)
- ✅ Cost: <$0.50 per 10 entities (~$2.50 per 100)
- ✅ Quality: Descriptions include branching logic and env vars
- ✅ Team consensus: Approve pivot

**If any criterion fails:**
- Abort LLM-first approach
- Pursue Option B (loosen grounding) from PIVOT.md
- Document decision in `docs/internal/analysis/poc-no-go-decision.md`

### Success Criteria
- ✅ LLMAnalyzer prototype working (passes basic tests)
- ✅ PoC script completes successfully on 10 entities
- ✅ Results documented in `docs/internal/analysis/poc-results.md`
- ✅ Decision to proceed documented (or abort)

---

## Phase 1.5: Prompt Engineering Iteration (NEW - Added from Review #2)

### Goals
- Optimize prompts for maximum reconstructability
- Create domain-specific templates for common patterns
- Measure prompt effectiveness systematically
- Establish prompt versioning and evolution strategy

**Rationale:** Code Review Agent identified that prompt quality is THE critical success factor and warrants 30-50% of development time (not 10%). This dedicated phase ensures we optimize prompts before rolling out LLM analysis to the full codebase.

### 1.5.1 A/B Test Prompt Variants

**Create 3 prompt strategies:**

**Strategy A: Behavior-First (Current)**
```
Focus: What the code does and why (behavioral intent)
Style: Concise (2-4 sentences), present tense
```

**Strategy B: Reconstruction-Optimized**
```
Focus: Include enough detail for code reconstruction
Style: Step-by-step (conditional logic, data flow, edge cases)
Additions: Type signatures, parameter semantics, return conditions
```

**Strategy C: Domain-Aware**
```
Focus: Framework patterns and conventions
Style: Mentions framework-specific concepts (Express middleware, React hooks, etc.)
Additions: Dependency relationships, lifecycle integration
```

**Test on 30 entities:**
- 10 simple (constants, exports, utilities)
- 10 medium (functions 10-30 LOC)
- 10 complex (classes, complex functions, Express routes)

**Measure:**
- Reconstructability score (manual evaluation by 2 reviewers)
- Confidence scores (LLM self-assessment)
- Token cost per entity
- Time to review (human readability)

**Script:** `scripts/prompt-ab-test.ts`

**Expected outcome:** Identify best-performing strategy for each entity complexity tier.

### 1.5.2 Create Domain-Specific Templates

**Templates to create:**

**Express Routes:**
```
You are analyzing an Express route handler. Focus on:
- HTTP method and path pattern
- Request parameters, query strings, body structure
- Authentication/authorization checks
- Response formats (JSON, HTML, redirects)
- Error handling and status codes
- Middleware dependencies (before this route executes)
```

**React Components:**
```
You are analyzing a React component. Focus on:
- Props structure and types
- State management (hooks, context)
- Side effects (useEffect, data fetching)
- Conditional rendering logic
- Event handlers and user interactions
- Component composition (what it renders)
```

**Mongoose Models:**
```
You are analyzing a Mongoose schema or model. Focus on:
- Schema fields and types
- Validation rules and defaults
- Virtual properties and methods
- Pre/post hooks (middleware)
- Indexes and performance characteristics
- Relationships to other models
```

**Utilities:**
```
You are analyzing a utility function. Focus on:
- Input parameters and expected types
- Return value and type
- Pure vs. side-effecting (I/O, state changes)
- Error conditions and edge cases
- Performance characteristics (memoization, caching)
```

**Location:** `src/llm/prompts/templates/`
- `express-route.template`
- `react-component.template`
- `mongoose-model.template`
- `utility-function.template`
- `default.template` (fallback)

### 1.5.3 Implement Template Selection Logic

**File:** `src/llm/analyzer.ts`

```typescript
private selectPromptTemplate(entity: Entity, sourceCode: string): string {
  // Detect framework patterns
  if (this.isExpressRoute(entity, sourceCode)) {
    return this.loadTemplate('express-route');
  }

  if (this.isReactComponent(entity, sourceCode)) {
    return this.loadTemplate('react-component');
  }

  if (this.isMongooseModel(entity, sourceCode)) {
    return this.loadTemplate('mongoose-model');
  }

  // Default utility template
  return this.loadTemplate('utility-function');
}

private isExpressRoute(entity: Entity, code: string): boolean {
  return /\b(req|request|res|response|next)\b/.test(code) &&
         /\.(get|post|put|delete|patch|all)\(/.test(code);
}

private isReactComponent(entity: Entity, code: string): boolean {
  return /\b(React|Component|useState|useEffect|props)\b/.test(code) ||
         /return\s+</.test(code) || // JSX return
         entity.filePath.match(/\.(jsx|tsx)$/);
}

private isMongooseModel(entity: Entity, code: string): boolean {
  return /\b(Schema|model|mongoose)\b/.test(code) &&
         /new\s+Schema\(/.test(code);
}

private loadTemplate(name: string): string {
  const templatePath = `src/llm/prompts/templates/${name}.template`;
  return fs.readFileSync(templatePath, 'utf-8');
}
```

### 1.5.4 Measure Prompt Effectiveness

**Script:** `scripts/measure-prompt-quality.ts`

**Metrics to track:**
- **Reconstructability:** Can LLM regenerate equivalent code from description alone? (Yes/Mostly/Partially/No)
- **Completeness:** Are all key behaviors documented? (Side effects, conditional logic, error handling)
- **Conciseness:** Is description 2-4 sentences (not verbose)?
- **Terminology:** Uses domain-appropriate language (Express, React, Mongoose terms)?

**Target improvements:**
- Reconstructability: PoC 80% → Phase 1.5 90%+
- Completeness: PoC 75% → Phase 1.5 95%+
- Domain terminology: PoC 50% → Phase 1.5 90%+

### 1.5.5 Document Prompt Evolution Strategy

**File:** `docs/internal/analysis/prompt-versioning-strategy.md`

**Content:**
- **Versioning:** Prompts are versioned (v1, v2, etc.) in git
- **Testing:** Every prompt change is A/B tested on 30 entities before rollout
- **Rollback:** If quality drops >5%, revert to previous prompt version
- **Monitoring:** Weekly quality checks on test fixtures (research-coi, tiny-react)
- **Updates:** Prompts updated for new Claude versions, framework changes (React 19, etc.)

### Success Criteria
- ✅ 3 prompt strategies tested on 30 entities
- ✅ Best-performing strategy identified (reconstructability >90%)
- ✅ 4 domain-specific templates created and tested
- ✅ Template selection logic implemented
- ✅ Prompt effectiveness metrics documented
- ✅ Prompt evolution strategy documented
- ✅ Reconstructability improves by 10%+ over PoC baseline

---

## Phase 2: Core Integration (5-7 days)

### Goals
- Replace pattern-based reasoning with LLM analysis
- Update orchestrator pipeline
- Maintain all existing integration tests (modified for new flow)

### 2.1 Update Parser to Provide Source Snippets

**Files to modify:**
- `src/parser/parser.ts`
- `src/parser/fact-extractor.ts`

**Changes:**
1. Keep AST extraction for structure (exports, imports, signatures)
2. Remove predicate/object fact extraction
3. Add `extractSourceSnippet()` method to return raw source for entities

```typescript
// src/parser/parser.ts

export interface ParsedEntity {
  id: string;
  kind: EntityKind;
  name: string;
  filePath: string;
  sourceSnippet: string; // NEW: raw source code
  signature?: string;
  imports: string[];
  exports: string[];
  location: SourceLocation;
}

export class Parser {
  // ... existing methods ...

  private extractSourceSnippet(node: Node, sourceFile: SourceFile): string {
    // Extract the raw source text for this AST node
    return node.getText(sourceFile);
  }

  async parseFile(filePath: string): Promise<ParsedEntity[]> {
    const sourceFile = this.createSourceFile(filePath);
    const entities: ParsedEntity[] = [];

    // Extract entities with source snippets
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ...) {
        entities.push({
          id: generateId(),
          kind: this.getEntityKind(node),
          name: this.getEntityName(node),
          filePath,
          sourceSnippet: this.extractSourceSnippet(node, sourceFile),
          signature: this.extractSignature(node),
          imports: this.extractImports(sourceFile),
          exports: this.extractExports(node),
          location: this.getLocation(node),
        });
      }
    });

    return entities;
  }
}
```

**Tests to update:**
- `tests/unit/parser/parser.test.ts` — Verify sourceSnippet is extracted
- `tests/integration/parser-kb.test.ts` — Verify entities have source snippets

### 2.2 Remove Pattern Matching Components

**Files to delete:**
- `src/reasoning/PatternMatcher.ts`
- `src/reasoning/IntentLifter.ts`
- `src/reasoning/AmbiguityResolver.ts`
- `src/reasoning/patterns/` (entire directory)
  - `patterns/express/`
  - `patterns/mongoose/`
  - `patterns/http-clients/`
  - `patterns/shared/`
  - `patterns/registry.ts`

**Tests to delete:**
- `tests/unit/reasoning/PatternMatcher.test.ts`
- `tests/unit/reasoning/IntentLifter.test.ts`
- `tests/unit/reasoning/patterns/` (entire directory, ~220 tests)

**Files to update (remove imports/references):**
- `src/reasoning/reasoner.ts` — Remove pattern matching logic
- `src/orchestrator/orchestrator.ts` — Remove REASONING phase

```bash
# Delete pattern modules
rm -rf src/reasoning/patterns
rm src/reasoning/PatternMatcher.ts
rm src/reasoning/IntentLifter.ts
rm src/reasoning/AmbiguityResolver.ts

# Delete pattern tests
rm -rf tests/unit/reasoning/patterns
rm tests/unit/reasoning/PatternMatcher.test.ts
rm tests/unit/reasoning/IntentLifter.test.ts
```

### 2.3 Integrate LLMAnalyzer into Pipeline + Cost Tiers (Enhanced from Review #2)

**Rationale:** Add hybrid cost tier to give users flexibility between full LLM analysis and template-only generation.

**File:** `src/reasoning/llm-analyzer-reasoner.ts` (new)

```typescript
import { LLMAnalyzer } from '../llm/analyzer.js';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../kb/types.js';

export class LLMAnalyzerReasoner {
  constructor(
    private analyzer: LLMAnalyzer,
    private kb: KnowledgeBase
  ) {}

  async analyzeEntities(): Promise<void> {
    const entities = this.kb.getAllEntities();

    console.log(`🧠 Analyzing ${entities.length} entities with LLM...`);

    // Batch entities by file for efficiency
    const entitiesByFile = this.groupByFile(entities);

    for (const [filePath, fileEntities] of entitiesByFile) {
      await this.analyzeFile(filePath, fileEntities);
    }

    console.log(`✅ Analysis complete. ${entities.length} behavior chunks created.`);
  }

  private async analyzeFile(filePath: string, entities: Entity[]): Promise<void> {
    // Build shared context for all entities in this file
    const fileContext = await this.buildFileContext(filePath);

    for (const entity of entities) {
      const context = {
        imports: entity.imports || [],
        exports: entity.exports || [],
        fileContext,
      };

      const chunk = await this.analyzer.analyzeEntity(
        entity,
        entity.sourceSnippet,
        context
      );

      // Store behavior chunk in KB
      this.kb.addBehaviorChunk(chunk);
    }
  }

  private groupByFile(entities: Entity[]): Map<string, Entity[]> {
    const map = new Map<string, Entity[]>();
    for (const entity of entities) {
      const existing = map.get(entity.filePath) || [];
      existing.push(entity);
      map.set(entity.filePath, existing);
    }
    return map;
  }

  private async buildFileContext(filePath: string): Promise<string> {
    // Optional: Load full file content for context
    // For now, return empty (entities already have sourceSnippet)
    return '';
  }
}
```

### 2.4 Update Orchestrator Pipeline

**File:** `src/orchestrator/orchestrator.ts`

**Remove phases:**
- `REASONING` (pattern matching)
- `AMBIGUITY_RESOLUTION`

**Add phase:**
- `LLM_ANALYSIS`

```typescript
export enum Phase {
  SCAN = 'SCAN',
  PARSE = 'PARSE',
  LLM_ANALYSIS = 'LLM_ANALYSIS', // NEW
  // REASONING = 'REASONING', // REMOVED
  // AMBIGUITY_RESOLUTION = 'AMBIGUITY_RESOLUTION', // REMOVED
  GENERATE = 'GENERATE',
  VALIDATE = 'VALIDATE',
}

export class Orchestrator {
  async run(): Promise<void> {
    await this.runPhase(Phase.SCAN);
    await this.runPhase(Phase.PARSE);
    await this.runPhase(Phase.LLM_ANALYSIS); // NEW
    await this.runPhase(Phase.GENERATE);
    await this.runPhase(Phase.VALIDATE);
  }

  private async runPhase(phase: Phase): Promise<void> {
    console.log(`\n▶️  Phase: ${phase}`);

    switch (phase) {
      case Phase.SCAN:
        await this.scanner.scan();
        break;
      case Phase.PARSE:
        await this.parser.parseAll();
        break;
      case Phase.LLM_ANALYSIS:
        const reasoner = new LLMAnalyzerReasoner(
          new LLMAnalyzer(this.llmGateway, this.costTracker),
          this.kb
        );
        await reasoner.analyzeEntities();
        break;
      case Phase.GENERATE:
        await this.generator.generateSpecs();
        break;
      case Phase.VALIDATE:
        await this.validator.validate();
        break;
    }
  }
}
```

### 2.5 Remove Grounding Validator

**Files to delete:**
- `src/validation/grounding-validator.ts`
- `tests/unit/validation/grounding-validator.test.ts`

**Files to update:**
- `src/validation/validator.ts` — Remove grounding validation calls
- `src/llm/gateway.ts` — Remove grounding validation logic

**Preserve:**
- `src/validation/cross-link-validator.ts` — Keep reference integrity checks
- `src/validation/coverage-validator.ts` — Keep coverage gate

### 2.6 Simplify Knowledge Base Schema

**File:** `src/kb/types.ts`

**Remove:**
- `factSet` references from BehaviorChunk
- `predicate`, `object` fields from facts
- Grounding-related indices

**Update BehaviorChunk:**
```typescript
export interface BehaviorChunk {
  id: string;
  targetEntityId: string;
  textDraft: string;
  confidence: number;
  // factSetIds: string[]; // REMOVED
  metadata?: {
    reviewedBy?: string;
    lastModified?: string;
  };
}
```

**Tests to update:**
- `tests/unit/kb/knowledge-base.test.ts` — Remove factSet tests
- `tests/integration/kb-reasoning.test.ts` — Update to new flow

### 2.7 Update Spec Generator

**File:** `src/generator/spec-generator.ts`

**Changes:**
- Remove factSet rendering logic
- Simplify chunk-to-markdown conversion (just text, no attribution)
- Keep anchor generation, cross-link logic

```typescript
export class SpecGenerator {
  private renderBehaviorChunk(chunk: BehaviorChunk): string {
    // Before: Included factSet attribution
    // After: Just the description
    return chunk.textDraft;
  }

  private renderEntity(entity: Entity, chunks: BehaviorChunk[]): string {
    const description = chunks
      .map(chunk => this.renderBehaviorChunk(chunk))
      .join('\n\n');

    return `### ${entity.name}

${description}

**Kind:** ${entity.kind}
${entity.signature ? `**Signature:** \`${entity.signature}\`` : ''}
`;
  }
}
```

### 2.4 Cost Tier Implementation

**CLI Flags:**
```bash
# Tier 1: Full LLM (default)
ceps <path>

# Tier 2: Hybrid (LLM for complex, templates for simple)
ceps <path> --llm-selective

# Tier 3: Template-only (no LLM analysis, lowest quality)
ceps <path> --llm off
```

**Logic:**
```typescript
// src/reasoning/llm-analyzer-reasoner.ts

async analyzeEntity(entity: Entity): Promise<BehaviorChunk> {
  // Check cost tier setting
  if (this.options.llmMode === 'off') {
    return this.generateTemplate(entity); // Template fallback
  }

  if (this.options.llmMode === 'selective') {
    // Hybrid: LLM for complex, templates for simple
    const complexity = this.estimateComplexity(entity);
    if (complexity < 5) {
      return this.generateTemplate(entity); // Simple → template
    }
  }

  // Full LLM analysis (default or selective + complex)
  return this.analyzer.analyzeEntity(entity, ...);
}
```

**Expected cost breakdown:**
- Full LLM: $2-5 per medium project (best quality)
- Hybrid: $1-2 per medium project (good quality, 50% cost savings)
- Template-only: $0.03 per medium project (baseline quality, 42% High confidence)

### 2.8 Error Handling & Resilience (NEW - Added from Review #2)

**Rationale:** LLM-specific failure modes (rate limits, timeouts, malformed output, model unavailability) must be handled gracefully to ensure production readiness.

**File:** `src/llm/error-handler.ts` (new)

```typescript
export class LLMErrorHandler {
  private rateLimiter: RateLimiter;
  private retryPolicy: RetryPolicy;

  constructor() {
    this.rateLimiter = new RateLimiter(4000); // 4000 RPM cap (Anthropic limit)
    this.retryPolicy = new RetryPolicy({ maxRetries: 3, backoff: 'exponential' });
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { entity?: Entity; timeout?: number }
  ): Promise<T> {
    // Rate limiting
    await this.rateLimiter.acquire();

    // Timeout guard
    const timeout = context.timeout || 30000; // 30s simple, 60s complex
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeout}ms`)), timeout)
    );

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      // Handle specific error types
      if (error instanceof RateLimitError) {
        console.warn(`Rate limit hit. Retrying after delay...`);
        await this.sleep(5000);
        return this.retryPolicy.execute(operation);
      }

      if (error instanceof TimeoutError) {
        console.warn(`Timeout for entity ${context.entity?.name}. Retrying...`);
        return this.retryPolicy.execute(operation);
      }

      if (error instanceof ModelUnavailableError) {
        console.warn(`Model unavailable. Falling back to Haiku...`);
        return this.fallbackToHaiku(operation);
      }

      if (error instanceof MalformedOutputError) {
        console.warn(`Malformed output. Retrying with stricter prompt...`);
        return this.retryWithStricterPrompt(operation);
      }

      // Partial failure recovery: don't crash entire pipeline
      console.error(`Failed to analyze entity ${context.entity?.name}:`, error);
      return this.generateFallbackChunk(context.entity);
    }
  }

  private async fallbackToHaiku(operation: () => Promise<any>): Promise<any> {
    // Switch to Haiku if Sonnet unavailable
    // Implementation depends on LLMGateway API
  }

  private generateFallbackChunk(entity?: Entity): BehaviorChunk {
    return {
      id: generateId(),
      targetEntityId: entity?.id || 'unknown',
      textDraft: `[Analysis failed. Manual review required.]`,
      confidence: 0,
    };
  }
}
```

**Rate Limiting:**
- Enforce 4000 RPM cap (Anthropic API limit)
- Track requests per minute, sleep if threshold reached
- Prevents rate limit errors mid-run

**Timeout Handling:**
- Simple entities: 30s timeout
- Complex entities (classes, large functions): 60s timeout
- On timeout: Retry once, then fail gracefully

**Malformed Output Detection:**
- Validate LLM response format (expected structure)
- If malformed: Retry with stricter prompt (e.g., "Output ONLY the description, no preamble")
- After 3 retries: Generate fallback chunk with low confidence

**Model Fallback:**
- If Sonnet unavailable: Fall back to Haiku
- If Haiku unavailable: Generate template-based description
- Log warnings for later review

**Partial Failure Recovery:**
- If single entity analysis fails: Continue with remaining entities
- Don't crash entire pipeline on one failure
- Report failed entities in run summary

### 2.9 Observability & Debugging (NEW - Added from Review #2)

**Rationale:** When quality drops or cost spikes, we need diagnostics to understand what went wrong. Structured logging and debug mode are essential for production troubleshooting.

**Structured Logging:**

**File:** `src/llm/logger.ts` (new)

```typescript
export class LLMLogger {
  private events: LLMEvent[] = [];

  logAnalysisStart(entity: Entity, model: string): void {
    this.events.push({
      type: 'analysis_start',
      timestamp: Date.now(),
      entityId: entity.id,
      entityName: entity.name,
      model,
    });
  }

  logAnalysisComplete(entity: Entity, result: { tokens: number; duration: number; confidence: number }): void {
    this.events.push({
      type: 'analysis_complete',
      timestamp: Date.now(),
      entityId: entity.id,
      entityName: entity.name,
      tokens: result.tokens,
      durationMs: result.duration,
      confidence: result.confidence,
    });
  }

  logError(entity: Entity, error: Error): void {
    this.events.push({
      type: 'error',
      timestamp: Date.now(),
      entityId: entity.id,
      entityName: entity.name,
      errorType: error.constructor.name,
      errorMessage: error.message,
    });
  }

  exportJSONL(path: string): void {
    // Write events as JSON Lines format for analysis
    fs.writeFileSync(path, this.events.map(e => JSON.stringify(e)).join('\n'));
  }
}
```

**Debug Mode:**

```typescript
// src/llm/analyzer.ts

async analyzeEntity(entity: Entity, sourceCode: string, context: AnalysisContext): Promise<BehaviorChunk> {
  const prompt = this.buildPrompt(entity, sourceCode, context);

  if (process.env.CEPS_DEBUG === 'llm') {
    console.log(`\n=== ${entity.name} ===`);
    console.log('[System Prompt]');
    console.log(prompt.system);
    console.log('[Entity Context]');
    console.log(prompt.user);
  }

  const response = await this.llmGateway.analyze(prompt, { model, temperature: 0 });

  if (process.env.CEPS_DEBUG === 'llm') {
    console.log('[RESPONSE]');
    console.log(response.content);
    console.log(`✓ ${entity.name} (${response.usage.totalTokens} tokens, ${Date.now() - startTime}ms)\n`);

    // Append to llm-debug.log
    fs.appendFileSync('llm-debug.log', `
=== ${entity.name} ===
[PROMPT]
${prompt.system}
${prompt.user}

[RESPONSE]
${response.content}

[METRICS]
Tokens: ${response.usage.totalTokens}
Duration: ${Date.now() - startTime}ms
Confidence: ${this.inferConfidence(response.content, entity)}

`);
  }

  return this.parseResponse(response, entity);
}
```

**Usage:**
```bash
# Enable debug mode
CEPS_DEBUG=llm ceps <path>

# Review debug log
cat llm-debug.log | less
```

**Quality Dashboard Script:**

**File:** `scripts/analyze-llm-metrics.ts`

```typescript
// Parse metrics.jsonl and generate dashboard
import fs from 'fs';

interface LLMEvent {
  type: string;
  entityName: string;
  tokens?: number;
  durationMs?: number;
  confidence?: number;
  errorType?: string;
}

function analyzeLLMMetrics(jsonlPath: string): void {
  const events: LLMEvent[] = fs.readFileSync(jsonlPath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

  const completeEvents = events.filter(e => e.type === 'analysis_complete');
  const errorEvents = events.filter(e => e.type === 'error');

  console.log('=== LLM Analysis Dashboard ===\n');

  console.log(`Total entities analyzed: ${completeEvents.length}`);
  console.log(`Total errors: ${errorEvents.length} (${(errorEvents.length / events.length * 100).toFixed(1)}%)\n`);

  console.log(`Average tokens per entity: ${avg(completeEvents.map(e => e.tokens || 0))}`);
  console.log(`Average duration: ${avg(completeEvents.map(e => e.durationMs || 0))}ms\n`);

  console.log(`Confidence distribution:`);
  console.log(`  High (>=70): ${completeEvents.filter(e => (e.confidence || 0) >= 70).length}`);
  console.log(`  Medium (40-69): ${completeEvents.filter(e => (e.confidence || 0) >= 40 && (e.confidence || 0) < 70).length}`);
  console.log(`  Low (<40): ${completeEvents.filter(e => (e.confidence || 0) < 40).length}\n`);

  if (errorEvents.length > 0) {
    console.log(`Error breakdown:`);
    const errorCounts = errorEvents.reduce((acc, e) => {
      acc[e.errorType || 'unknown'] = (acc[e.errorType || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(errorCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

analyzeLLMMetrics('.ceps/llm-metrics.jsonl');
```

**Usage:**
```bash
# After run, analyze metrics
npx tsx scripts/analyze-llm-metrics.ts

# Output:
# === LLM Analysis Dashboard ===
# Total entities analyzed: 443
# Total errors: 3 (0.7%)
# Average tokens per entity: 520
# Average duration: 145ms
# Confidence distribution:
#   High (>=70): 346 (78%)
#   Medium (40-69): 85 (19%)
#   Low (<40): 12 (3%)
```

### 2.10 Integration Testing

**Update existing integration tests:**
- `tests/integration/end-to-end.test.ts`
- `tests/integration/tiny-react.test.ts`

**Changes:**
- Stub LLMGateway to return mock responses
- Verify entities have descriptions
- Check confidence scores are reasonable
- Validate cross-links work

**New integration test:**
```typescript
// tests/integration/llm-analysis.test.ts

describe('LLM Analysis Integration', () => {
  it('should analyze entities and produce behavior chunks', async () => {
    const kb = new KnowledgeBase();
    const mockLLM = new MockLLMGateway();
    const analyzer = new LLMAnalyzer(mockLLM, new CostTracker());
    const reasoner = new LLMAnalyzerReasoner(analyzer, kb);

    // Add test entities
    kb.addEntity({
      id: 'e1',
      kind: 'function',
      name: 'buildCache',
      filePath: '/test/cache.js',
      sourceSnippet: 'export function buildCache() { ... }',
      imports: [],
      exports: [],
    });

    await reasoner.analyzeEntities();

    const chunks = kb.getBehaviorChunks();
    expect(chunks).toHaveLength(1);
    expect(chunks[0].textDraft).toContain('cache');
    expect(chunks[0].confidence).toBeGreaterThan(40);
  });
});
```

### Success Criteria
- ✅ Parser provides source snippets
- ✅ Pattern components deleted (~8,000 lines removed)
- ✅ LLMAnalyzer integrated into pipeline
- ✅ Cost tiers implemented (--llm-selective flag)
- ✅ Error handling implemented (rate limiting, timeouts, retries, fallbacks)
- ✅ Observability implemented (structured logging, debug mode, metrics dashboard)
- ✅ Orchestrator updated (LLM_ANALYSIS phase added)
- ✅ Grounding validator removed
- ✅ KB schema simplified
- ✅ Spec generator updated
- ✅ All integration tests pass (with LLM stubbed)
- ✅ Test suite: ~900 tests, 90%+ coverage

---

## Phase 3: Validation & Optimization (3-4 days)

### Goals
- Run full pipeline on research-coi with real LLM
- Measure quality improvement
- Optimize cost and performance

### 3.1 Enhanced Model Selection Logic (Enhanced from Review #2)

**Rationale:** LOC-based heuristics are poor proxies for complexity. Framework-aware detection and adaptive selection (try Haiku, upgrade to Sonnet on low confidence) improve cost/quality trade-off.

**File:** `src/llm/analyzer.ts`

Enhance `selectModel()` with framework awareness and adaptive logic:

```typescript
private selectModel(entity: Entity, sourceCode: string): string {
  // Framework-aware selection (always use Sonnet for framework patterns)
  if (this.isFrameworkPattern(entity, sourceCode)) {
    return 'claude-sonnet-4-5-20250929';
  }

  // Simple entities → Haiku (10x cheaper)
  if (entity.kind === 'constant' || entity.kind === 'export') {
    return 'claude-3-5-haiku-20241022';
  }

  // Functions: Use cyclomatic complexity (not just LOC)
  if (entity.kind === 'function') {
    const complexity = this.calculateCyclomaticComplexity(entity, sourceCode);

    if (complexity < 5) {
      return 'claude-3-5-haiku-20241022'; // Simple function
    }
  }

  // Default to Sonnet for complex entities
  return 'claude-sonnet-4-5-20250929';
}

private isFrameworkPattern(entity: Entity, code: string): boolean {
  // Express routes ALWAYS need Sonnet (regardless of LOC)
  if (/\b(req|request|res|response|next)\b/.test(code) &&
      /\.(get|post|put|delete|patch|all)\(/.test(code)) {
    return true;
  }

  // React components ALWAYS need Sonnet
  if (/\b(useState|useEffect|useContext|useReducer)\b/.test(code) ||
      /return\s+</.test(code)) {
    return true;
  }

  // Mongoose models ALWAYS need Sonnet
  if (/\b(Schema|model|mongoose)\b/.test(code) &&
      /new\s+Schema\(/.test(code)) {
    return true;
  }

  // GraphQL resolvers ALWAYS need Sonnet
  if (/\b(GraphQL|resolver|Query|Mutation)\b/.test(code)) {
    return true;
  }

  return false;
}

private calculateCyclomaticComplexity(entity: Entity, code: string): number {
  // Use AST-based cyclomatic complexity (not regex)
  const sourceFile = ts.createSourceFile(
    entity.filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  );

  let complexity = 1; // Base complexity

  const visit = (node: ts.Node): void => {
    // Count decision points
    if (
      ts.isIfStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isWhileStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isCaseClause(node) ||
      ts.isCatchClause(node) ||
      ts.isDoStatement(node)
    ) {
      complexity++;
    }

    // Logical operators add complexity
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        complexity++;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return complexity;
}

// Adaptive model selection (NEW)
async analyzeEntity(
  entity: Entity,
  sourceCode: string,
  context: AnalysisContext
): Promise<BehaviorChunk> {
  // First attempt: Use model selection heuristic
  let model = this.selectModel(entity, sourceCode);
  const chunk = await this.analyzeWithModel(entity, sourceCode, context, model);

  // Adaptive upgrade: If Haiku produced low confidence, retry with Sonnet
  if (model === 'claude-3-5-haiku-20241022' && chunk.confidence < 50) {
    console.log(`  ⬆️  Upgrading ${entity.name} to Sonnet (low confidence: ${chunk.confidence})`);
    model = 'claude-sonnet-4-5-20250929';
    return this.analyzeWithModel(entity, sourceCode, context, model);
  }

  return chunk;
}

private async analyzeWithModel(
  entity: Entity,
  sourceCode: string,
  context: AnalysisContext,
  model: string
): Promise<BehaviorChunk> {
  // (existing implementation)
}
```

**Expected improvements:**
- Framework patterns always get Sonnet (better quality)
- Simple functions use Haiku (cost savings)
- Adaptive upgrade: ~10% of Haiku analyses upgraded to Sonnet
- Overall cost reduction: 60% entities use Haiku (vs. 70% target)

### 3.2 Add Batching for Efficiency

**File:** `src/llm/analyzer.ts`

```typescript
async analyzeBatch(
  entities: Entity[],
  sourceMap: Map<string, string>,
  context: AnalysisContext
): Promise<BehaviorChunk[]> {
  // Batch up to 5 simple entities per LLM call
  // For complex entities, still do one-by-one

  const simpleEntities = entities.filter(e =>
    e.kind === 'constant' || e.kind === 'export'
  );

  if (simpleEntities.length > 1) {
    return this.analyzeBatchSimple(simpleEntities, sourceMap, context);
  }

  // Fall back to individual analysis
  return Promise.all(
    entities.map(e => this.analyzeEntity(e, sourceMap.get(e.id)!, context))
  );
}

private async analyzeBatchSimple(
  entities: Entity[],
  sourceMap: Map<string, string>,
  context: AnalysisContext
): Promise<BehaviorChunk[]> {
  const prompt = `Analyze these ${entities.length} simple entities and provide descriptions:

${entities.map((e, i) => `
${i + 1}. **${e.name}** (${e.kind})
\`\`\`javascript
${sourceMap.get(e.id)}
\`\`\`
`).join('\n')}

For each entity, provide a 1-2 sentence behavioral description following the same guidelines.

Output format (JSON array):
[
  { "name": "ENTITY_NAME", "description": "..." },
  ...
]`;

  const response = await this.llmGateway.analyze(prompt, {
    model: 'claude-3-5-haiku-20241022',
    temperature: 0,
  });

  // Parse JSON response and create chunks
  const results = JSON.parse(response.content);
  return results.map((r: any, i: number) => ({
    id: generateId(),
    targetEntityId: entities[i].id,
    textDraft: r.description,
    confidence: this.inferConfidence(r.description, entities[i]),
  }));
}
```

### 3.3 Semantic Determinism Testing (Updated from Review #2)

**Rationale:** User feedback: "determinism is overrated." We relax byte-for-byte determinism requirement to semantic determinism (specs describe the same behavior, but may vary in wording).

**File:** `tests/integration/llm-determinism.test.ts`

```typescript
describe('LLM Semantic Determinism', () => {
  it('produces semantically equivalent output across runs (not byte-for-byte identical)', async () => {
    const entity = createTestEntity('buildCache');
    const source = getSourceCode(entity);
    const context = {};

    // Run analysis 3 times
    const run1 = await analyzer.analyzeEntity(entity, source, context);
    const run2 = await analyzer.analyzeEntity(entity, source, context);
    const run3 = await analyzer.analyzeEntity(entity, source, context);

    // NOT requiring byte-for-byte identity:
    // expect(run1.textDraft).toBe(run2.textDraft); // TOO STRICT

    // Instead, check semantic equivalence:
    expect(run1.textDraft).toContain('cache'); // Key concept present
    expect(run2.textDraft).toContain('cache');
    expect(run3.textDraft).toContain('cache');

    // Check behavioral consistency (same confidence band)
    const confidenceBand1 = getConfidenceBand(run1.confidence);
    const confidenceBand2 = getConfidenceBand(run2.confidence);
    const confidenceBand3 = getConfidenceBand(run3.confidence);
    expect(confidenceBand1).toBe(confidenceBand2);
    expect(confidenceBand2).toBe(confidenceBand3);

    // Optional: Check similarity score (>90% text overlap)
    const similarity12 = calculateSimilarity(run1.textDraft, run2.textDraft);
    const similarity23 = calculateSimilarity(run2.textDraft, run3.textDraft);
    expect(similarity12).toBeGreaterThan(0.90);
    expect(similarity23).toBeGreaterThan(0.90);
  });
});

function getConfidenceBand(confidence: number): string {
  if (confidence >= 70) return 'high';
  if (confidence >= 40) return 'medium';
  return 'low';
}

function calculateSimilarity(text1: string, text2: string): number {
  // Simple Jaccard similarity on word sets
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
```

**What we're NOT testing:**
- ❌ Byte-for-byte identical output (too strict, LLMs at temp=0 still vary slightly)
- ❌ Exact same wording ("returns" vs "returns a" vs "will return")

**What we ARE testing:**
- ✅ Same key concepts mentioned (cache, Redis, environment variables)
- ✅ Same confidence band (high/medium/low consistency)
- ✅ High text similarity (>90% word overlap)

**Acceptance criteria:**
- Semantic determinism test passes (3 runs, >90% similarity)
- No byte-for-byte determinism requirement

### 3.4 Add Result Caching

**File:** `src/llm/result-cache.ts` (new)

```typescript
import crypto from 'crypto';

export class LLMResultCache {
  private cache = new Map<string, BehaviorChunk>();

  getCacheKey(entity: Entity, sourceSnippet: string): string {
    // Hash: entityId + source hash
    const hash = crypto
      .createHash('sha256')
      .update(entity.id + sourceSnippet)
      .digest('hex')
      .substring(0, 16);
    return `${entity.id}-${hash}`;
  }

  get(key: string): BehaviorChunk | undefined {
    return this.cache.get(key);
  }

  set(key: string, chunk: BehaviorChunk): void {
    this.cache.set(key, chunk);
  }

  // For finalization: Load cached results for unchanged entities
  async loadFromDisk(cacheDir: string): Promise<void> {
    // Load .ceps/llm-cache.json
    // ...
  }

  async saveToDisk(cacheDir: string): Promise<void> {
    // Save .ceps/llm-cache.json
    // ...
  }
}
```

**Integrate into LLMAnalyzer:**
```typescript
async analyzeEntity(
  entity: Entity,
  sourceCode: string,
  context: AnalysisContext
): Promise<BehaviorChunk> {
  const cacheKey = this.cache.getCacheKey(entity, sourceCode);
  const cached = this.cache.get(cacheKey);

  if (cached) {
    console.log(`  ♻️  Cache hit: ${entity.name}`);
    return cached;
  }

  // Analyze with LLM (as before)
  const chunk = await this.analyzeFresh(entity, sourceCode, context);

  this.cache.set(cacheKey, chunk);
  return chunk;
}
```

### 3.5 Batching A/B Test (Enhanced from Review #2)

**Rationale:** Review #2 raised concerns that batching may degrade quality. Make batching optional and A/B test to measure impact.

**CLI Flag:**
```bash
# Default: Batching enabled (for cost savings)
ceps <path>

# Disable batching (analyze each entity individually)
ceps <path> --llm-batching off
```

**A/B Test on research-coi:**

```bash
# Test A: Batching ON (default)
npm run build
../../ceps/dist/cli.js ../output-test/research-coi --llm on
cd ../output-test/research-coi
./check-quality.sh > batching-on.txt

# Test B: Batching OFF
../../ceps/dist/cli.js ../output-test/research-coi --llm on --llm-batching off
./check-quality.sh > batching-off.txt

# Compare quality
diff batching-on.txt batching-off.txt

# Compare cost
cat .ceps/llm-metrics.jsonl | grep '"type":"analysis_complete"' | wc -l
```

**Decision criteria:**
- If quality drops >5% with batching: Disable by default
- If quality stays within 5%: Keep batching enabled (cost savings)

**Expected results:**
- Batching ON: 443 entities, 90 API calls (batches of ~5), $2.50 cost
- Batching OFF: 443 entities, 443 API calls, $3.50 cost
- Quality difference: <3% (within acceptable range)

**Implementation:**
```typescript
// src/reasoning/llm-analyzer-reasoner.ts

async analyzeFile(filePath: string, entities: Entity[]): Promise<void> {
  if (this.options.batchingEnabled) {
    // Batch simple entities (5 per call)
    const simpleEntities = entities.filter(e => e.kind === 'constant' || e.kind === 'export');
    const complexEntities = entities.filter(e => e.kind !== 'constant' && e.kind !== 'export');

    // Batch simple entities
    for (let i = 0; i < simpleEntities.length; i += 5) {
      const batch = simpleEntities.slice(i, i + 5);
      await this.analyzer.analyzeBatch(batch, sourceMap, context);
    }

    // Analyze complex entities individually
    for (const entity of complexEntities) {
      await this.analyzer.analyzeEntity(entity, sourceMap.get(entity.id), context);
    }
  } else {
    // No batching: analyze each entity individually
    for (const entity of entities) {
      await this.analyzer.analyzeEntity(entity, sourceMap.get(entity.id), context);
    }
  }
}
```

### 3.6 Run Full Pipeline on research-coi

```bash
# Build and run
npm run build
cd ../output-test/research-coi

# Run with LLM analysis (real API calls)
../../ceps/dist/cli.js . --llm on --llm-provider anthropic

# Check results
./check-quality.sh > after-pivot.txt

# Compare before/after
diff baseline-before-pivot.txt after-pivot.txt
```

**Expected improvements:**
- High confidence: 42% → 75%+ (187 → 330+ entities)
- Low confidence: 10% → <5% (45 → <20 entities)
- Reconstructability: ~30% → >90% (manual spot-check)

### 3.7 Cost Analysis

**Check token usage:**
```bash
# Should print at end of run:
# Total tokens: 1.2M
# Estimated cost: $3.45
# Model breakdown:
#   - Haiku: 850K tokens ($0.21)
#   - Sonnet: 350K tokens ($3.24)
```

**Optimization targets:**
- ✅ 70%+ entities use Haiku
- ✅ Total cost < $5 for research-coi (443 entities)
- ✅ Batch processing reduces API calls by 30%

### 3.8 Performance Optimization

**Parallelize LLM calls:**

```typescript
// src/reasoning/llm-analyzer-reasoner.ts

private async analyzeFile(filePath: string, entities: Entity[]): Promise<void> {
  // Parallelize up to 5 concurrent LLM calls
  const concurrency = 5;
  const chunks: BehaviorChunk[] = [];

  for (let i = 0; i < entities.length; i += concurrency) {
    const batch = entities.slice(i, i + concurrency);
    const batchChunks = await Promise.all(
      batch.map(entity => this.analyzer.analyzeEntity(
        entity,
        entity.sourceSnippet,
        this.buildContext(entity)
      ))
    );
    chunks.push(...batchChunks);
  }

  // Store all chunks
  chunks.forEach(chunk => this.kb.addBehaviorChunk(chunk));
}
```

**Target performance:**
- ✅ research-coi completes in <5 minutes (was ~2 min LLM-off)
- ✅ Small projects (100 entities): <2 minutes
- ✅ Large projects (2000 entities): <30 minutes

### Success Criteria
- ✅ research-coi output quality: >75% High confidence, >90% reconstructable
- ✅ Cost: <$5 for research-coi run
- ✅ Performance: <5 minutes runtime
- ✅ Model selection: Framework-aware + adaptive (60%+ entities use Haiku)
- ✅ Semantic determinism verified (>90% similarity across runs)
- ✅ Batching A/B test complete (decision on default setting)
- ✅ Caching works for finalization workflow

---

## Phase 4: Review Agent (Optional, 2-3 days)

### Goals
- Add quality improvement via LLM review iterations
- Catch incompleteness and inaccuracies
- Improve reconstructability scores

### 4.1 Create ReviewAgent

**File:** `src/llm/review-agent.ts`

```typescript
export interface ReviewFeedback {
  entityName: string;
  issueType: 'missing-detail' | 'inaccurate' | 'incomplete' | 'unclear';
  suggestion: string;
}

export class ReviewAgent {
  constructor(
    private llmGateway: LLMGateway,
    private costTracker: CostTracker
  ) {}

  async reviewSpec(
    spec: SpecDocument,
    sourceFiles: Map<string, string>
  ): Promise<ReviewFeedback[]> {
    const prompt = this.buildReviewPrompt(spec, sourceFiles);

    const response = await this.llmGateway.analyze(prompt, {
      model: 'claude-sonnet-4-5-20250929', // Use Sonnet for quality
      temperature: 0,
    });

    this.costTracker.trackUsage('claude-sonnet-4-5-20250929', response.usage.totalTokens);

    return this.parseFeedback(response.content);
  }

  private buildReviewPrompt(spec: SpecDocument, sources: Map<string, string>): string {
    return `You are reviewing a behavioral specification for completeness and accuracy.

**Specification:**
${spec.content}

**Source code (for reference):**
${Array.from(sources.entries()).slice(0, 5).map(([path, code]) => `
File: ${path}
\`\`\`javascript
${code.substring(0, 1000)}
\`\`\`
`).join('\n')}

**Review checklist:**
1. Are all exported entities described?
2. Do descriptions match actual behavior in source code?
3. Are side effects (I/O, network, state changes) documented?
4. Are error conditions and edge cases covered?
5. Are environment variables and configuration mentioned?
6. Is conditional logic explained?
7. Are descriptions reconstructable (could an LLM regenerate code from this)?

**For each issue found, provide:**
- Entity name
- Issue type (missing-detail, inaccurate, incomplete, unclear)
- Suggested improvement (1-2 sentences)

**Output format (JSON array):**
[
  {
    "entityName": "buildCache",
    "issueType": "incomplete",
    "suggestion": "Add details about Redis vs memory cache selection logic"
  },
  ...
]

If no issues found, return empty array: []
`;
  }

  private parseFeedback(content: string): ReviewFeedback[] {
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn('Failed to parse review feedback:', e);
      return [];
    }
  }
}
```

### 4.2 Integrate Review Pass into Pipeline

**File:** `src/orchestrator/orchestrator.ts`

```typescript
export enum Phase {
  SCAN = 'SCAN',
  PARSE = 'PARSE',
  LLM_ANALYSIS = 'LLM_ANALYSIS',
  REVIEW = 'REVIEW', // NEW (optional)
  GENERATE = 'GENERATE',
  VALIDATE = 'VALIDATE',
}

async run(): Promise<void> {
  await this.runPhase(Phase.SCAN);
  await this.runPhase(Phase.PARSE);
  await this.runPhase(Phase.LLM_ANALYSIS);

  if (this.options.enableReview) {
    await this.runPhase(Phase.REVIEW);
  }

  await this.runPhase(Phase.GENERATE);
  await this.runPhase(Phase.VALIDATE);
}
```

**CLI flag:**
```bash
ceps <path> --llm on --review
```

### 4.3 Implement Revision Logic

**File:** `src/reasoning/llm-analyzer-reasoner.ts`

```typescript
async reviseEntity(
  entity: Entity,
  feedback: ReviewFeedback,
  sourceCode: string
): Promise<BehaviorChunk> {
  const existingChunk = this.kb.getBehaviorChunk(entity.id);

  const revisionPrompt = `Revise this description based on feedback:

**Original description:**
${existingChunk.textDraft}

**Feedback:**
${feedback.suggestion}

**Source code:**
\`\`\`javascript
${sourceCode}
\`\`\`

**Provide the revised description (2-4 sentences):**`;

  const response = await this.llmGateway.analyze(revisionPrompt, {
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0,
  });

  return {
    ...existingChunk,
    textDraft: response.content,
    confidence: this.inferConfidence(response.content, entity),
  };
}
```

### 4.4 Add Review Iteration Limit

**Max 2 review iterations to control cost:**

```typescript
async runReviewPass(): Promise<void> {
  const maxIterations = 2;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n🔍 Review Pass ${iteration}/${maxIterations}`);

    const spec = await this.generator.generateDraft();
    const feedback = await this.reviewAgent.reviewSpec(spec, this.sources);

    if (feedback.length === 0) {
      console.log('✅ No issues found. Review complete.');
      break;
    }

    console.log(`📝 Found ${feedback.length} issues. Revising...`);

    for (const issue of feedback) {
      const entity = this.kb.getEntity(issue.entityName);
      const revised = await this.reasoner.reviseEntity(
        entity,
        issue,
        this.sources.get(entity.filePath)
      );
      this.kb.updateBehaviorChunk(revised);
    }
  }
}
```

### Success Criteria
- ✅ ReviewAgent implemented and tested
- ✅ Review pass integrated into pipeline (optional flag)
- ✅ Revision logic improves descriptions
- ✅ Cost remains <$10 for research-coi (with review enabled)
- ✅ Reconstructability improves by 5-10% (spot-check)

---

## Phase 5: Documentation & Validation (2 days)

### Goals
- Update all architecture documents
- Validate PRD compliance
- Prepare for release

### 5.1 Update Architecture Documents

**Files to update:**

#### SADS.md
- Update Section 3.1 (Components) — Remove PatternMatcher, IntentLifter, AmbiguityResolver, GroundingValidator
- Update Section 3.2 (Lifecycle) — New flow: Scan → Parse → LLM Analyze → Generate → Validate
- Update Section 8 (LLM Gateway) — Describe semantic analysis role, not just polish
- Update Section 10 (Quality Gates) — Remove grounding gate

#### CTS-02_LLM_Gateway_and_Grounding.md
- Remove grounding validator sections
- Add LLMAnalyzer specification
- Update prompts and retry logic

#### CTS-06_Reasoning_and_Ambiguity_Resolver.md
- Mark as deprecated/removed
- Add note: "Replaced by LLM semantic analysis in Phase 6 pivot"

#### AGENTS.md
- Update "Current Status" — Reflect LLM-first architecture
- Update "Core Architecture" — New component list
- Update "Implementation Status" — Add Phase 6 Wave 2 (LLM-First Pivot)

#### PIVOT.md
- Add "Implementation Complete" section at top
- Link to this conversion plan
- Document final metrics (quality, cost, performance)

### 5.2 Create Migration Summary Document

**File:** `docs/internal/completion/llm-first-pivot-complete.md`

Content:
- **Summary:** What changed and why
- **Metrics:** Before/after comparison (quality, cost, performance)
- **Lessons Learned:** What worked, what didn't
- **Future Work:** Suggestions for further improvements

### 5.3 Validate PRD Compliance

**Test on 3 projects:**
1. research-coi (existing fixture)
2. tiny-react (existing fixture)
3. ceps itself (dogfooding)

**For each project, verify:**
- ✅ Specs are reconstructable (manual review of 10 entities)
- ✅ High confidence >75%
- ✅ Low confidence <5%
- ✅ All exported entities documented
- ✅ Cross-links work
- ✅ No broken references

### 5.4 Run Full Test Suite

```bash
# Run all tests
npm test

# Run coverage report
npm run test:coverage

# Expected results:
# Tests: ~900 passing (down from 1155)
# Coverage: >90% branch coverage
# Runtime: <45 seconds
```

### 5.5 Create Release Notes

**File:** `docs/internal/announcements/phase6-wave2-llm-first.md`

Content:
- **What's New:** LLM-first semantic analysis
- **Breaking Changes:** None (CLI unchanged)
- **Improvements:** Better quality, simpler architecture, lower maintenance
- **Migration:** Automatic (no user action required)

### 5.7 Finalization Engine Redesign (NEW - Added from Review #2)

**Rationale:** Finalization currently uses factSets for impact scoping. With LLM-first architecture, we use entity-level tracking + reverse deps graph instead.

**New Finalization Flow:**

**File:** `src/finalization/finalizer.ts`

```typescript
export class Finalizer {
  async finalize(answers: Answer[]): Promise<void> {
    console.log('🔄 Finalization: Processing answers...');

    for (const answer of answers) {
      // 1. Find entity by QID
      const qid = answer.qid;
      const entity = this.kb.getEntityByQID(qid);

      if (!entity) {
        console.warn(`QID ${qid} not found. Skipping.`);
        continue;
      }

      // 2. Use reverse deps graph for impact scoping
      const impactedEntities = this.kb.getReverseDepsClosure(entity.id, {
        maxHops: 2, // Configurable via --finalize-hops
        maxNodes: 50, // Configurable via --finalize-nodes
      });

      console.log(`  📍 QID ${qid} → ${entity.name} → ${impactedEntities.length} impacted entities`);

      // 3. Re-analyze with answer as additional context
      for (const impactedEntity of impactedEntities) {
        const sourceCode = this.getSourceCode(impactedEntity);
        const context = {
          ...this.buildContext(impactedEntity),
          answers: this.getRelevantAnswers(impactedEntity, answers), // Include answers
        };

        const revisedChunk = await this.analyzer.analyzeEntity(
          impactedEntity,
          sourceCode,
          context
        );

        // Update KB with revised chunk
        this.kb.updateBehaviorChunk(revisedChunk);
      }

      // 4. Mark QID as resolved
      this.kb.removeQID(qid);
    }

    // 5. Regenerate specs (full file specs, not line-level patches)
    await this.generator.regenerateAll();

    console.log('✅ Finalization complete.');
  }

  private getRelevantAnswers(entity: Entity, allAnswers: Answer[]): Answer[] {
    // Filter answers relevant to this entity (same file or dependencies)
    return allAnswers.filter(a => {
      const qidEntity = this.kb.getEntityByQID(a.qid);
      return qidEntity?.filePath === entity.filePath ||
             this.kb.hasRelation(entity.id, qidEntity?.id);
    });
  }
}
```

**Enhanced LLM Prompt (with answers):**
```typescript
private buildPromptWithAnswers(
  entity: Entity,
  sourceCode: string,
  context: AnalysisContext,
  answers: Answer[]
): string {
  const basePrompt = this.buildPrompt(entity, sourceCode, context);

  if (answers.length === 0) return basePrompt;

  const answerContext = answers.map(a => `
**Question:** ${a.question}
**Answer:** ${a.answer}
`).join('\n');

  return `${basePrompt}

**Additional Context (from answers.md):**
${answerContext}

**Task:** Re-analyze this entity incorporating the answers above. Update your description to reflect this new information.
`;
}
```

**Key Changes:**
- **Impact scoping:** factSet attribution → reverse deps graph
- **Re-analysis:** LLM re-analyzes impacted entities with answers in context
- **Spec regeneration:** Full file specs regenerated (not line-level patches)
- **QID resolution:** Remove QIDs after finalization

### 5.8 Long-Term Maintenance Plan (NEW - Added from Review #2)

**Rationale:** Prompts will need updates when Claude models improve, frameworks change (React 19, etc.), or quality degrades. We need a maintenance strategy.

**File:** `docs/internal/maintenance/llm-first-maintenance-plan.md`

**Content:**

#### Prompt Versioning

**Strategy:**
- All prompts stored in `src/llm/prompts/` with version headers
- Version format: `v1.0.0` (major.minor.patch)
- Major version: Breaking changes to prompt structure
- Minor version: New features or domains added
- Patch version: Wording tweaks, bug fixes

**Example:**
```
# analysis-system-prompt.txt
# Version: v1.0.0
# Date: 2025-11-10
# Minimum Claude Version: claude-sonnet-4-5-20250929

You are analyzing JavaScript/TypeScript code to generate behavioral specifications...
```

#### Quality Monitoring

**Weekly CI Runs:**
```yaml
# .github/workflows/quality-monitor.yml

name: Quality Monitoring
on:
  schedule:
    - cron: '0 0 * * 0' # Every Sunday at midnight

jobs:
  monitor-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build

      # Run on test fixtures
      - run: npx ceps ../output-test/research-coi --llm on
      - run: cd ../output-test/research-coi && ./check-quality.sh > weekly-quality.txt

      # Compare against baseline
      - run: diff baseline-after-pivot.txt weekly-quality.txt || echo "Quality drift detected"

      # Alert if quality drops >5%
      - run: scripts/alert-quality-drop.sh
```

**Alert Thresholds:**
- High confidence drops >5%: Investigate prompts
- Low confidence increases >3%: Review model version
- Cost increases >20%: Review model selection logic

#### Model Update Protocol

**When new Claude version releases:**
1. **Test on smoke fixture** (10 entities): Verify quality doesn't regress
2. **A/B test on research-coi**: Compare old vs new model
3. **Measure metrics**: Quality, cost, latency
4. **Decision gate:**
   - If quality improves ≥5%: Adopt new model
   - If quality drops <3% but cost drops ≥20%: Consider adopting
   - If quality drops ≥5%: Stay on current model
5. **Update prompt if needed**: New models may benefit from different prompting

**Documentation:**
- Record model change in `docs/internal/maintenance/model-update-log.md`
- Document any prompt changes required

#### Framework Updates

**When framework versions change (React 19, Express 6, etc.):**
1. **Review breaking changes**: Identify API changes
2. **Update domain templates**: Update `react-component.template` with new patterns
3. **Test on fixture**: Run on project using new framework version
4. **A/B test**: Compare quality with old vs new templates
5. **Deploy gradually**: Use feature flag to enable new templates

**Example:**
```typescript
// src/llm/analyzer.ts

private selectPromptTemplate(entity: Entity, sourceCode: string): string {
  // Feature flag for React 19 templates
  if (process.env.REACT_19_TEMPLATES === 'true' && this.isReactComponent(entity, sourceCode)) {
    return this.loadTemplate('react-component-v19');
  }

  // Default templates
  return this.loadTemplate('react-component');
}
```

### Success Criteria
- ✅ All architecture docs updated
- ✅ Migration summary documented
- ✅ PRD compliance validated on 3 projects
- ✅ Full test suite passes (>90% coverage)
- ✅ Release notes complete
- ✅ Finalization engine redesigned (entity-level tracking + reverse deps)
- ✅ Long-term maintenance plan documented (prompt versioning, quality monitoring, model updates)

---

## Phase 6: Final Validation & Handoff (1 day)

### Goals
- Run benchmarks
- Create handoff materials
- Merge to main

### 6.1 Run Performance Benchmarks

**Script:** `scripts/benchmark-llm-first.ts`

Test on:
- Small project (100 entities): <2 minutes, <$1
- Medium project (500 entities): <5 minutes, <$3
- Large project (2000 entities): <30 minutes, <$15

### 6.2 Create Comparison Report

**File:** `docs/internal/analysis/llm-first-comparison.md`

Table comparing fact-based vs LLM-first:

| Metric | Fact-Based (Before) | LLM-First (After) | Change |
|--------|---------------------|-------------------|--------|
| High confidence % | 42% | 78% | +36% |
| Reconstructability | ~30% | 92% | +62% |
| Low confidence % | 10% | 3% | -7% |
| Codebase LOC | 23,000 | 15,000 | -35% |
| Test count | 1155 | 910 | -21% |
| Pattern modules | 8 | 0 | -100% |
| Per-run cost | $0.03 | $3.50 | +116x |
| Maintenance burden | High | Low | -60% |

### 6.3 Create Handoff Document

**File:** `docs/internal/lessons/llm-first-handoff.md`

Sections:
- **Architecture Overview:** High-level flow
- **Key Components:** LLMAnalyzer, ReviewAgent, simplified pipeline
- **Testing Strategy:** How to test LLM integration
- **Cost Management:** Model selection, batching, caching
- **Future Improvements:** Ideas for Wave 3+

### 6.4 Final Code Review

**Create PR:**
```bash
git add .
git commit -m "Phase 6 Wave 2: LLM-First Architecture Migration"
git push origin feature/llm-first-conversion
```

**PR description:**
- Summary of changes
- Link to PIVOT.md and this conversion plan
- Metrics comparison table
- Testing notes

**Review checklist:**
- ✅ All tests pass
- ✅ Coverage >90%
- ✅ Docs updated
- ✅ Migration tested on 3 projects
- ✅ Cost analysis documented

### 6.5 Merge to Main

```bash
# After approval
git checkout main
git merge feature/llm-first-conversion
git push origin main

# Tag release
git tag v1.0.0-llm-first
git push origin v1.0.0-llm-first
```

### Success Criteria
- ✅ Benchmarks documented
- ✅ Comparison report complete
- ✅ Handoff document ready
- ✅ PR approved and merged
- ✅ Release tagged

---

## Rollback Plan

### Triggers for Rollback
- PoC quality <80% (Phase 1)
- Cost >$10 per medium project (Phase 3)
- Performance >10 minutes for research-coi (Phase 3)
- Integration tests fail after Phase 2
- Team consensus against pivot

### Rollback Procedure

```bash
# Abandon conversion branch
git checkout main

# Create rollback document
cat > docs/internal/analysis/llm-first-rollback.md <<EOF
# LLM-First Pivot Rollback

**Date:** $(date)
**Reason:** [Describe why]

**Metrics at rollback:**
- Quality: X%
- Cost: $X
- Performance: X minutes

**Next steps:**
- Pursue Option B (loosen grounding)
- Or accept 42% quality ceiling
- Document PRD limitation
EOF

# Commit decision
git add docs/internal/analysis/llm-first-rollback.md
git commit -m "Rollback: LLM-First pivot did not meet criteria"
```

**Alternative path:** Pursue Option B from PIVOT.md (loosen grounding constraints)

---

## Risk Mitigation

### Risk: LLM Output Quality Varies
**Mitigation:**
- Use temperature=0 for consistency
- Structured prompts with examples
- Review pass to catch issues
- Regression tests for spec stability

### Risk: Cost Exceeds Budget
**Mitigation:**
- Model selection (Haiku for 70%+ entities)
- Batching simple entities
- Caching for finalization
- Budget caps in CLI (--llm-budget)

### Risk: Performance Degradation
**Mitigation:**
- Parallel LLM calls (5 concurrent)
- Skip LLM for obvious entities (if flag set)
- Progress indicators to show activity

### Risk: Component Deletion Breaks Functionality
**Mitigation:**
- Comprehensive integration tests before deletion
- Git checkpoints after each phase
- Rollback triggers clearly defined

---

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Phase 0: Preparation | 1 day | Baseline captured, branch created |
| Phase 1: PoC | 2-3 days | LLMAnalyzer prototype, quality validation |
| **Decision Gate** | - | Go/No-Go based on PoC results |
| Phase 2: Core Integration | 5-7 days | Pattern components removed, pipeline updated |
| Phase 3: Validation | 3-4 days | research-coi quality >75%, cost <$5 |
| Phase 4: Review Agent | 2-3 days | Optional quality improvement |
| Phase 5: Documentation | 2 days | All docs updated, PRD validated |
| Phase 6: Handoff | 1 day | Benchmarks, comparison, merge |
| **Total** | **14-21 days** | Production-ready LLM-first architecture |

---

## Acceptance Criteria

### Quality
- ✅ High confidence: >75% (research-coi)
- ✅ Reconstructability: >90% (manual review)
- ✅ Low confidence: <5%
- ✅ PRD compliance: Specs enable code reconstruction

### Performance
- ✅ research-coi runtime: <5 minutes
- ✅ Small projects: <2 minutes
- ✅ Test suite: <60 seconds, >90% coverage

### Cost
- ✅ Medium projects: <$5 per run
- ✅ Model selection: 70%+ entities use Haiku
- ✅ Caching reduces repeat analysis to $0

### Maintainability
- ✅ Codebase: -35% LOC (8,000 lines removed)
- ✅ Test files: -24% (220 pattern tests removed)
- ✅ Complexity: 7 components (down from 11)

---

## Conclusion

This conversion plan provides a detailed, phased approach to migrating ceps from a fact-based reasoning architecture to an LLM-first semantic analysis architecture. The plan includes:

- **Clear validation gates** at each phase
- **Rollback triggers** if criteria aren't met
- **Risk mitigations** for known concerns
- **Success metrics** aligned with PRD objectives
- **Incremental delivery** with testable milestones

The pivot addresses the fundamental gap identified in PIVOT.md: our current architecture cannot deliver reconstructable specs because it constrains LLM inference to pre-extracted facts. By allowing LLMs to analyze source code directly, we can achieve the PRD's core promise while simplifying our architecture by 35%.

**Expected outcome:** Production-ready LLM-first architecture delivering >90% reconstructable specs at $2-5 per medium project with 60% lower maintenance burden.

---

## Changes Incorporated from Review #2

**Date:** 2025-11-10
**Source:** `docs/reviews/phase6/llm-first-conversion-plan-review-2.md` + User feedback

### Accepted Changes (9 items)

#### 1. ✅ Semantic Determinism (SADS.md Update)
**Change:** Relaxed byte-for-byte determinism to semantic equivalence
**Rationale:** User: "determinism is overrated"
**Location:** Phase 0.0.1 (SADS.md Section 1.4 and 10)
**Implementation:** Phase 3.3 (Semantic Determinism Testing)

#### 2. ✅ Phase 1.5: Prompt Engineering Iteration (NEW)
**Change:** Added dedicated phase for prompt optimization (30-50% of effort)
**Rationale:** Reviewer: "Prompt quality is THE critical success factor"
**Location:** NEW phase between Phase 1 and Phase 2
**Deliverables:** A/B tested strategies, domain templates, effectiveness metrics

#### 3. ✅ Cost Tiers (Phase 2.4)
**Change:** Hybrid mode (--llm-selective flag)
**Rationale:** Give users cost flexibility
**Location:** Phase 2.4 (Cost Tier Implementation)
**Options:** Full LLM ($2-5), Hybrid ($1-2), Template-only ($0.03)

#### 4. ✅ Error Handling & Resilience (Phase 2.8)
**Change:** Rate limiting, timeouts, retries, fallbacks, partial failure recovery
**Rationale:** LLM-specific failure modes must be handled gracefully
**Location:** Phase 2.8 (NEW section)
**Implementation:** Error handler with rate limiter, timeout guards, model fallback

#### 5. ✅ Observability & Debugging (Phase 2.9)
**Change:** Structured logging, debug mode, quality dashboard
**Rationale:** Need diagnostics when quality drops or cost spikes
**Location:** Phase 2.9 (NEW section)
**Tools:** CEPS_DEBUG=llm flag, llm-debug.log, metrics dashboard script

#### 6. ✅ Enhanced Model Selection (Phase 3.1)
**Change:** Framework-aware + adaptive selection (Haiku → Sonnet on low confidence)
**Rationale:** LOC-based heuristics are poor proxies; framework patterns need Sonnet
**Location:** Phase 3.1 (Enhanced)
**Features:** Framework detection, cyclomatic complexity, adaptive upgrade

#### 7. ✅ Batching A/B Test (Phase 3.5)
**Change:** Make batching optional (--llm-batching flag), A/B test quality impact
**Rationale:** Reviewer concern that batching may degrade quality
**Location:** Phase 3.5 (NEW section)
**Decision criteria:** If quality drops >5%, disable by default

#### 8. ✅ Finalization Redesign (Phase 5.7)
**Change:** Use entity-level tracking + reverse deps graph (not factSets)
**Rationale:** factSets removed in LLM-first architecture
**Location:** Phase 5.7 (NEW section)
**Flow:** QID → entity → reverse deps → re-analyze with answers in context

#### 9. ✅ Long-Term Maintenance (Phase 5.8)
**Change:** Prompt versioning, quality monitoring, model update protocol
**Rationale:** Prompts need updates for new models, framework changes
**Location:** Phase 5.8 (NEW section)
**Tools:** Weekly CI runs, alert thresholds, model update protocol

### Rejected Changes (3 items)

#### 1. ❌ Option C Mini-PoC
**Reason:** User: "don't want to get dragged down pursuing something that isn't effective again"
**Documented:** PIVOT.md "Why Not Option C" section (Phase 0.0.8)

#### 2. ❌ Strict Byte-for-Byte Determinism
**Reason:** User: "determinism is overrated"
**Alternative:** Semantic determinism (>90% text similarity acceptable)

#### 3. ❌ CI/CD Cost Analysis
**Reason:** User: "I don't plan on running this tool with CI or part of CD"
**Action:** Removed CI/CD scenarios from plan

### Updated Confidence

**Before Review #2:** 85%
**After Review #2 + Changes:** 80%

**Why lower?**
- Prompt engineering complexity acknowledged (30-50% of effort)
- Long-term maintenance burden is real

**Why still high?**
- All critical concerns have concrete solutions
- User constraints simplify scope (no CI/CD, determinism relaxed)
- Incremental approach with PoC validation gate reduces risk

---

**Next Action:** Execute Phase 0 (Preparation) to capture baseline and create conversion branch.
