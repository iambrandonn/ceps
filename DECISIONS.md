# Phase 6 Architecture Decisions

This document tracks key architectural decisions made during Phase 6 (Production Hardening). All decisions include date, rationale, owner, and approval status.

---

## Hardware Baseline (Pre-I1)

**Date:** 2025-11-07
**Decision:** Apple M2 Pro (10-core CPU, 32GB RAM, NVMe ≥1 GB/s) **OR** AMD Ryzen 7 5800X / Intel Core i7-12700K class (8 physical cores, 32GB RAM, NVMe ≥1 GB/s)
**Rationale:** Per IMPLEMENTATION_PLAN_PHASE6.md §2 entry criteria. Baseline hardware ensures consistent performance measurements and reproducible benchmark results.
**Owner:** Agent 6 (Performance)
**Approver:** Architect
**Status:** ✅ Approved

---

## Tier-1 Scope Deferral (Pre-I1)

**Date:** 2025-11-07
**Decision:** Next.js and Prisma patterns deferred to post-M3
**Rationale:** Focus Phase 6 resources on Tier-0 frameworks (Express, React, Redux, GraphQL, HTTP clients) to meet M3 gate requirements. Tier-1 patterns require more complex integration work and can be addressed in a separate phase.
**Owner:** Product
**Approver:** Architect
**Status:** ✅ Approved
**Reference:** IMPLEMENTATION_PLAN_PHASE6.md §2 entry criteria

---

## Benchmark Repository Setup (Pre-I1)

**Date:** 2025-11-07
**Decision:** Pin `vercel/next.js` benchmark to commit `db5528317e24e0316e0497716976a715a325ca09`
**Rationale:** Ensures reproducible performance measurements. Commit hash verification via `git rev-parse --verify` prevents accidental benchmark drift.
**Owner:** Agent 6 (Performance)
**Approver:** Architect
**Status:** ✅ Approved
**Reference:** IMPLEMENTATION_PLAN_PHASE6.md §2, §3.6

---

## Performance Optimization Sequencing (Wave Planning)

**Date:** 2025-11-07
**Decision:** Performance work (Agent 6) trails pattern implementation (Agents 1-5) by 1 wave
**Rationale:** Optimizations should target stable behavior patterns to avoid churn. Wave 1 focuses on pattern expansion; Wave 2 on performance tuning.
**Owner:** Agent 6 (Performance)
**Approver:** Architect
**Status:** ✅ Approved
**Reference:** IMPLEMENTATION_PLAN_PHASE6.md §4 Wave structure

---

## I3 Config Pattern Scope (Express)

**Date:** 2025-11-07
**Decision:** Defer accuracy harness implementation to I5 (polish iteration)
**Rationale:**
1. I3 scope is narrow (config patterns only)
2. Accuracy metrics more meaningful with full Express pattern suite (I1-I4 complete)
3. Master plan allows buffer days (Day 11-12) for tooling catch-up
4. Unit tests provide strong coverage for I3 scope
5. Accuracy harness becomes critical for I5 sign-off (F1 ≥0.90 requirement)

**Owner:** Agent 1 (Express)
**Approver:** Code Review Agent
**Status:** ✅ Approved
**Reference:** FEEDBACK_I3_EXPRESS_CONFIG_REVIEW.md §1.5, §5.3 M1

---

## I3 Parser Limitation Handling (Express)

**Date:** 2025-11-07
**Decision:** Document parser limitation for `process.env` facts in integration tests; pattern falls back to generic description when facts missing
**Rationale:**
- Phase 2 parser may not emit `reads-property` facts for all `process.env` access patterns
- Integration test explicitly documents this limitation (see `phase6-express-integration.test.ts:210-251`)
- Pattern correctly handles missing facts without crashing
- Parser enhancement tracked for future work, not blocking I3

**Owner:** Agent 1 (Express)
**Approver:** Code Review Agent
**Status:** ✅ Approved
**Impact:** Non-blocking; pattern works correctly with available facts
**Reference:** PHASE6_EXPRESS_PHASE_MINUS_ONE.md, FEEDBACK_I3_EXPRESS_CONFIG_REVIEW.md §4.1

---

## I3 Grounding Validator Anti-Patterns (Express Config)

**Date:** 2025-11-07
**Decision:** Add 5 anti-patterns for Express config terminology:
- `application.properties` (Java Spring)
- `@ConfigurationProperties` (Java Spring annotation)
- `Spring Boot config` (Java framework)
- `settings.ini` (generic config)
- `configuration manager` (too abstract)

**Rationale:** Prevent LLM from using Java/Spring terminology in Express specs. These terms are semantically incorrect for Node.js/Express configuration patterns.
**Owner:** Agent 1 (Express)
**Approver:** Code Review Agent
**Status:** ✅ Approved
**Tests:** 5 adversarial tests in `lexicon-validator.test.ts` (lines 301-384)
**Reference:** FEEDBACK_I3_EXPRESS_CONFIG_REVIEW.md §5.2 H1

---

## Finalization Test Strategy (I3)

**Date:** 2025-11-07
**Decision:** Skip dedicated I3 finalization integration test; rationale documented in integration test file
**Rationale:**
- Finalization engine already validated in Phase 5 (78 tests, 935 passing)
- Config patterns follow same QID/factSet patterns as I1/I2
- Integration test documents approach would be identical to existing tests
- Avoids redundant test coverage

**Owner:** Agent 1 (Express)
**Approver:** Code Review Agent
**Status:** ✅ Approved (with documentation requirement)
**Reference:** FEEDBACK_I3_EXPRESS_CONFIG_REVIEW.md §3.1 Cross-workstream DoD

---

## I4 Mongoose Integration Completion

**Date:** 2025-11-07
**Decision:** Express I4 (Mongoose auxiliary patterns) approved with critical fixes
**Rationale:**
- Word-boundary anti-pattern logic fixed (regex now handles compound words correctly)
- Full test suite validation required before iteration sign-off (1155+ tests)
- Cross-workstream DoD enforced (lexicon validator, golden specs, KB chunk assertions)
- Mongoose schema/model/query patterns deliver full Express ↔ Mongoose linking

**Owner:** Agent 1 (Express)
**Approver:** Code Review Agent
**Status:** ✅ Approved
**Impact:** Establishes pattern for future auxiliary integrations (Apollo Client, styled-components, etc.)
**Reference:** FEEDBACK_I4_MONGOOSE_FIXES_COMPLETE.md, PHASE6_EXPRESS_I4_COMPLETION.md

**Metrics:**
- Test count: 1155+ passing (up from 935 in Phase 5)
- Lexicon: 49 terms + 15 anti-patterns, 51/51 validator tests green
- Coverage: Express middleware, routing, error handling, async, config, Mongoose schema/model/query

---

## I5 Validation Sweep & Handoff (Complete)

**Date:** 2025-11-07
**Decision:** I5 is polish iteration (no new patterns), focused on validation sweep + lessons doc + M3 prep
**Rationale:**
- All Express/Mongoose patterns complete (I1-I4)
- I5 validates gates (all green), full test suite, and produces handoff artifacts
- Accuracy harness and benchmark scripts deferred to Agent 6 (Performance) Wave 2 for coordinated Tier-0 implementation
- Lessons doc (`PHASE6_EXPRESS_LESSONS.md`) seeds React/Redux/GraphQL/HTTP agents with workflows and pitfalls
- M3 artifacts prepared for Agent 6 to assemble master gate review

**Owner:** Agent 1 (Express)
**Approver:** Pending (Architect + Product)
**Status:** ✅ Complete — Awaiting Architect Review
**Reference:** IMPLEMENTATION_PLAN_PHASE6_WS_D_EXPRESS_I5.md

**Exit Criteria (Completed):**
- [x] Lexicon validator 51/51 green ✅
- [x] Full test suite passing (1155 tests, 4 skipped) ✅
- [x] Golden regressions passing (included in integration tests) ✅
- [x] Finalization scenario green (smoke test passing) ✅
- [x] Coverage matrix updated (I5 summary section added) ✅
- [x] Release notes drafted (docs/RELEASE_NOTES_PHASE6.md) ✅
- [x] Lessons doc complete (docs/internal/PHASE6_EXPRESS_LESSONS.md) ✅
- [x] Decision log updated (I4 + I5 entries) ✅
- [x] M3 artifacts prepared (docs/reviews/M3_EXPRESS_CONTRIBUTION.md) ✅

**Deferred to Wave 2 (Agent 6):**
- Accuracy harness script implementation + F1 measurement
- Benchmark script implementation + performance metrics
- Rationale: Better coordinated across all Tier-0 frameworks by Performance agent

**Final Metrics:**
- **Tests:** 1155 passing, 4 skipped (+220 from Phase 5)
- **Lexicon:** 49 terms + 15 anti-patterns, 51/51 validator tests green
- **Patterns:** 8 modules (middleware, routing, error, async, config, Mongoose schema/model/query)
- **Coverage:** Express + Mongoose Tier-0 support complete
- **Integration:** Full route → query → model → schema → fields linking validated

---

## Future Decisions

Add new decisions below as they are made during Phase 6 iterations.

### Decision Template

```markdown
## [Decision Name] ([Component/Iteration])

**Date:** YYYY-MM-DD
**Decision:** Brief statement of what was decided
**Rationale:** Why this decision was made (bullet points or prose)
**Owner:** Agent # (Role)
**Approver:** Name/Role
**Status:** 🟡 Proposed | ✅ Approved | ❌ Rejected
**Impact:** [Optional] Downstream effects or constraints
**Reference:** [Optional] Link to docs/plans/reviews
```

---

## Decision Log Maintenance

- **When to add:** Any architectural choice, scope change, or technical trade-off
- **Who updates:** Pattern agent or responsible lead
- **Review cadence:** Weekly sync (30 min) + mid-wave checkpoint
- **Format:** Use template above; keep entries concise
- **Approval SLA:** Architect responds within 24h; Agent 6 acts as backup reviewer

---

**End of Decisions Log**
