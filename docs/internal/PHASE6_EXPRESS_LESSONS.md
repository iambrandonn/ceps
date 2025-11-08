# Phase 6 Express Workstream — Lessons Learned

**Owner:** Agent 1 (Express)
**Date:** 2025-11-07
**Status:** ✅ Complete - Ready for handoff to React/Redux/GraphQL/HTTP agents
**Context:** This document captures key lessons, tooling workflows, and pitfalls from iterations I1-I5 to accelerate future Tier-0 agents.

---

## Table of Contents

1. [Phase -1 Analysis Workflow](#phase--1-analysis-workflow)
2. [Fixture Strategy](#fixture-strategy)
3. [Accuracy Harness Mechanics](#accuracy-harness-mechanics)
4. [Lexicon Testing Checklist](#lexicon-testing-checklist)
5. [Benchmark Integration](#benchmark-integration)
6. [Cross-Workstream DoD Compliance](#cross-workstream-dod-compliance)
7. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
8. [Tooling & Scripts](#tooling--scripts)
9. [Review & Approval Process](#review--approval-process)

---

## Phase -1 Analysis Workflow

**Purpose:** Understand upstream data structures before writing tests or patterns.

### Process
1. **Instrument parser output** for existing fixtures (e.g., `tiny-express`)
2. **Dump KB entries** to console or JSON file
3. **Document findings** in a Phase -1 doc (e.g., `PHASE6_EXPRESS_PHASE_MINUS_ONE.md`)
4. **Catalog patterns** from 2-3 OSS samples (one simple, one complex)

### Key Questions to Answer
- What entity kinds are emitted? (function, constant, class?)
- What predicates are available? (call-arg-0, param-count, initializer?)
- Are predicates unique per entity or reused? (namespace semantics)
- What's missing? (route paths, async facts, env reads?)

### Outputs
- Phase -1 analysis document
- List of parser limitations (documented, not blocking)
- Fixture requirements (polluted datasets needed)

### Example Findings (Express I1)
- **Route handlers not extracted as entities**: Parser limitation; routers detected but individual `.get()` / `.post()` calls not surfaced
- **Middleware signatures available**: `param-count` and `param-names` facts reliable
- **Dynamic imports flagged**: Parser emits `dynamic-import` facts for confidence downgrade

**Time Investment:** 2 days per framework (amortized across iterations)

**Lesson:** Skip Phase -1 at your peril! Tests written without upstream understanding miss selection bugs and polluted-dataset scenarios.

---

## Fixture Strategy

**Purpose:** Create realistic test data that catches selection bugs and edge cases.

### Polluted Datasets

**Problem:** Tests with cherry-picked data pass but production fails.

**Solution:** Include ALL competing candidates that would realistically be present:

```typescript
// ❌ BAD: Only target entity
const entities = [targetMiddleware];

// ✅ GOOD: Competing entities + target
const entities = [
  authMiddleware,      // 3-param (matches pattern)
  errorHandler,        // 4-param (should NOT match)
  routeHandler,        // 2-param (should NOT match)
  targetMiddleware,    // 3-param (matches pattern)
];
```

### Fixture Types Needed

| Fixture Type | Purpose | Example |
|--------------|---------|---------|
| **Route pollution** | Multiple routers mounting same path | `/users` in 3 different routers |
| **Middleware priority** | Mix of auth/logging/error middleware | Similar signatures, different roles |
| **Config-driven mounts** | Conditional `app.use()` based on env | `if (process.env.FEATURE_X)` |
| **Async/error combo** | `async` handlers with `try/catch` | Verify error semantics captured |
| **OSS-derived snippets** | Real-world code sanitized | `expressjs/express/examples/*` |

### Naming Convention

```
tests/fixtures/accuracy/<framework>/<ID>-<description>.ts
tests/fixtures/accuracy/<framework>/<ID>-<description>.json  # ground truth
```

Example:
```
tests/fixtures/accuracy/express/012-nested-router.ts
tests/fixtures/accuracy/express/012-nested-router.json
```

### Ground Truth Format

```json
{
  "id": "012-nested-router",
  "snippet": "const router = express.Router(); router.use('/users', userRouter);",
  "expectedBehaviors": [
    "mounts nested router at /users",
    "delegates GET /users/:id to userRouter"
  ],
  "minimumConfidence": 70,
  "mustNotContain": ["auth middleware"]
}
```

**Lesson from I4:** Word-boundary anti-patterns must handle compound words correctly (e.g., "model" inside "remodel" should NOT trigger "model" anti-pattern).

---

## Accuracy Harness Mechanics

**Purpose:** Measure precision/recall/F1 to ensure ≥90% pattern accuracy.

### Corpus Curation

1. **Day 1-2:** Collect 20-30 snippets from OSS + synthetic cases
2. **Day 3:** Architect reviews annotations; mark disputed as `contested: true`
3. **Day 4:** Expand to 20-50 snippets, freeze corpus, summarize in README

### Metrics Calculation

```typescript
// Pseudocode
const precision = truePositives / (truePositives + falsePositives);
const recall = truePositives / (truePositives + falseNegatives);
const f1 = 2 * (precision * recall) / (precision + recall);
```

**Target Thresholds:**
- F1 ≥ 0.90
- Precision ≥ 0.88
- Recall ≥ 0.88

### Nightly Runs

```bash
npm run scripts/run-tier0-accuracy.mjs -- express
```

Outputs:
- JSON report: `benchmarks/results/phase6-express-<iteration>-<date>.json`
- Console table with precision/recall/F1
- Alerts to `#ceps-phase6` on regression

### Handling Failures

- **Below threshold?** Block merge until fixed
- **Contested snippets?** Exclude from metrics until architect resolves
- **False positives/negatives?** Refine pattern logic, add regression test

**Status for Express:** *(To be validated in I5 sweep)*

---

## Lexicon Testing Checklist

**Purpose:** Ensure LLM-generated prose uses approved terminology and rejects anti-patterns.

### Workflow

1. **Extract new terms** after each iteration:
   ```bash
   npm run scripts/extract-new-terms.mjs -- express
   ```
2. **Propose in Slack:** Post to `#ceps-phase6` with term, definition, example
3. **Architect review:** 24h SLA; approved/revised/rejected
4. **Update lexicon:** Add to `docs/lexicon.md` (approved terms + anti-patterns)
5. **Write validator tests:** `tests/llm-gateway/grounding-validator.test.ts`

### Test Structure

```typescript
describe('Express Lexicon', () => {
  it('accepts approved Express terms', () => {
    expect(validator.validate('Express middleware function')).toBe(true);
    expect(validator.validate('route handler')).toBe(true);
  });

  it('rejects Java/Spring anti-patterns', () => {
    expect(validator.validate('servlet')).toBe(false);
    expect(validator.validate('Spring controller')).toBe(false);
  });
});
```

### Anti-Pattern Pitfalls

**Problem:** Word-boundary logic caused false positives (I4).

**Solution:** Use `\b` regex with compound word tests:

```typescript
// ✅ GOOD: Word boundaries prevent false positives
const antiPattern = /\bservlet\b/i;

// Test cases:
antiPattern.test('servlet');        // true (match)
antiPattern.test('servletHandler'); // false (compound word, no match)
```

**Regression tests added:** 51/51 passing (I4 fix confirmed)

### Current Status

- **Approved terms:** 49 (Express + Mongoose)
- **Anti-patterns:** 15
- **Validator tests:** 51/51 passing

**Lesson:** Add adversarial tests BEFORE submitting lexicon updates. Catch word-boundary bugs early.

---

## Benchmark Integration

**Purpose:** Ensure pattern changes don't regress performance on large repositories.

### Setup

1. **Clone benchmark repo:**
   ```bash
   ./scripts/setup-benchmark.sh
   ```
   - Clones `vercel/next.js` at pinned commit `db5528317e24e0316e0497716976a715a325ca09`
   - Verifies hash via `git rev-parse --verify`
   - Stores in `../next.js-benchmark/`

2. **Baseline measurement:**
   ```bash
   npm run scripts/run-nextjs-benchmark.mjs
   ```
   - Captures: runtime, peak RSS, LLM tokens, exit code, gate status
   - Outputs: `benchmarks/results/phase6-express-<iteration>-<date>.json`

### Running Benchmarks

**After I3 and I4:**
```bash
npm run scripts/run-nextjs-benchmark.mjs --llm off
```

**After I5 (full validation):**
```bash
npm run scripts/run-nextjs-benchmark.mjs  # LLM on
npm run scripts/run-nextjs-benchmark.mjs --llm off --focus public-api  # smoke test
```

### Thresholds

| Delta | Action |
|-------|--------|
| <10% | PASS - merge allowed |
| 10-20% | INVESTIGATE - profile before merge |
| >20% | BLOCK - optimize or escalate |

### Metrics to Track

- **Runtime:** Target ≤15 min on baseline hardware
- **Peak RSS:** Target ≤16 GB
- **LLM tokens:** Target ≤1.5M
- **Exit code:** Must be 0 (gates green)

### Sharing Results

Send JSON reports to Agent 6 (Performance) after:
- I3 benchmark run
- I4 benchmark run
- I5 full validation (both `--llm off` and `--llm on`)

**Lesson from I4:** Run benchmarks EARLY (after I3) to catch regressions before they compound. Don't wait until I5!

---

## Cross-Workstream DoD Compliance

**Purpose:** Ensure all Phase 6 requirements are met before claiming iteration complete.

### Mandatory Deliverables Per Iteration

Per master plan (IMPLEMENTATION_PLAN_PHASE6.md §3.8):

1. **Lexicon update + validator test** covering new terminology
2. **Coverage matrix row** in `docs/pattern-coverage.md`
3. **Finalization integration test** proving QIDs can be resolved
4. **KB chunk assertions** (positive + negative) verifying confidence/factSet attribution
5. **Error-handling contract** tests showing patterns emit Open Questions, never crash

### Checklist Template

```markdown
- [ ] Lexicon: New terms approved + adversarial tests green
- [ ] Coverage matrix: Row added with behaviors/confidence/gaps
- [ ] Finalization: QID scenario + `ceps finalize --answers` test passing
- [ ] KB assertions: Integration tests check chunks/confidence/factSetId
- [ ] Error handling: Unit tests prove malformed entities → Open Questions
- [ ] Golden specs: Updated `tiny-express/expected/spec.md` + snapshot regenerated
- [ ] Full test suite: `npm test` green (not just targeted suites)
```

### Common Misses (Lessons from Feedback)

**Problem:** Claiming iteration complete without running FULL test suite.

**Solution:** Always run `npm test` (not just `npm test -- <pattern>`). Regressions hide in unrelated tests.

**Problem:** Forgetting to regenerate snapshots after fixture changes.

**Solution:** Follow Phase 5 snapshot discipline:
```bash
npx tsx scripts/regenerate-phase5-snapshot.mjs
npm test -- --run tests/integration/snapshot-capture.test.ts
```

**Problem:** Lexicon validator passing for new terms but breaking on old terms (word-boundary bug).

**Solution:** Run FULL validator suite (`51/51 tests`), not just new tests.

---

## Common Pitfalls & Solutions

### 1. Cherry-Picked Test Data

**Problem:** Tests pass with minimal data but fail in production.

**Solution:** Always include competing candidates (polluted datasets).

**Example:** Testing route detection with 3 routers, not just 1.

---

### 2. Skipping Phase -1 Analysis

**Problem:** Writing tests without understanding upstream data leads to selection bugs.

**Solution:** Always dump KB facts and document data shapes before implementing patterns.

**Time Saved:** 2 days of debugging later > 1 day of analysis upfront.

---

### 3. Word-Boundary Anti-Pattern Bugs

**Problem:** Anti-pattern regex matches inside compound words (e.g., "model" in "remodel").

**Solution:** Use `\b` word boundaries + compound word regression tests.

**Example Fix (I4):**
```typescript
// Before: /model/i  (matched "remodel")
// After:  /\bmodel\b/i  (only matches standalone "model")
```

---

### 4. Incomplete Test Runs

**Problem:** Running targeted tests (`npm test -- <file>`) misses regressions elsewhere.

**Solution:** Always run FULL `npm test` before claiming iteration complete.

**Evidence:** I4 feedback required full suite run to catch lexicon validator regression.

---

### 5. Forgetting Snapshot Regeneration

**Problem:** Updating fixtures without regenerating `.ceps/snapshot.json` breaks snapshot tests.

**Solution:** Follow Phase 5 discipline (script + verification + commit).

**Script:** `npx tsx scripts/regenerate-phase5-snapshot.mjs`

---

### 6. Lexicon Approval Delays

**Problem:** Waiting for architect review blocks iteration progress.

**Solution:** Submit lexicon updates early (Day 4 of iteration), use 24h SLA + backup reviewer (Agent 6).

---

### 7. Benchmark Drift

**Problem:** Performance regressions accumulate across iterations if not measured early.

**Solution:** Run benchmarks after I3 and I4, not just I5. Share metrics with Agent 6 immediately.

---

## Tooling & Scripts

### Accuracy Harness

**Script:** `scripts/run-tier0-accuracy.mjs`

**Usage:**
```bash
npm run scripts/run-tier0-accuracy.mjs -- express
```

**Outputs:**
- Console table (precision/recall/F1)
- JSON report: `benchmarks/results/phase6-express-accuracy-<date>.json`

**Status:** *(To be implemented in I5 validation sweep)*

---

### Benchmark Runner

**Script:** `scripts/run-nextjs-benchmark.mjs`

**Usage:**
```bash
npm run scripts/run-nextjs-benchmark.mjs [--llm off] [--focus public-api]
```

**Outputs:**
- JSON report: `benchmarks/results/phase6-express-i<N>-<date>.json`
- Console summary (runtime, RSS, tokens, exit code)

**Status:** *(To be run in I5 validation sweep)*

---

### Lexicon Term Extractor

**Script:** `scripts/extract-new-terms.mjs`

**Usage:**
```bash
npm run scripts/extract-new-terms.mjs -- express
```

**Outputs:**
- Console list of new nouns/verbs from pattern prose
- Suggested lexicon entries

**Status:** *(To be implemented if not already present)*

---

### Pattern Coverage Matrix Updater

**Script:** `scripts/update-pattern-matrix.mjs`

**Usage:**
```bash
npm run scripts/update-pattern-matrix.mjs
```

**Outputs:**
- Regenerated `docs/pattern-coverage.md` snippet
- Coverage table from pattern metadata

**Status:** *(To be implemented if needed; manual updates OK for Express)*

---

### Snapshot Regeneration

**Script:** `scripts/regenerate-phase5-snapshot.mjs`

**Usage:**
```bash
npx tsx scripts/regenerate-phase5-snapshot.mjs
npm test -- --run tests/integration/snapshot-capture.test.ts
```

**Outputs:**
- Updated `.ceps/snapshot.json` in fixture directories
- Verified file counts and paths

**Required:** After any fixture changes (Phase 5 discipline).

---

## Review & Approval Process

### Iteration Sign-Off

**Steps:**
1. **Open PR** with iteration changes (pattern code, tests, docs)
2. **Request review** in `#ceps-approvals` channel
3. **Architect responds** within 24h (or backup reviewer via Agent 6)
4. **Address feedback** inline or in follow-up commits
5. **Merge** once approved + CI green

### Approval SLA

- **Architect:** 24 hours
- **Backup (Agent 6):** If architect unavailable, provides interim approval

### Escalation Protocol

- **Blocker >24h:** Raise in `#ceps-phase6` + weekly sync
- **Cross-agent conflict:** Agent 6 mediates; unresolved within 24h → architect decides
- **Benchmark SLO risk:** Immediate ping to product + architect

---

## Summary: Top 5 Lessons

1. **Always do Phase -1 analysis** before writing tests (saves 2 days of debugging)
2. **Use polluted datasets** in tests (competing candidates catch selection bugs)
3. **Run FULL test suite** (`npm test`) before claiming iteration complete
4. **Add word-boundary tests** for anti-patterns (regex bugs hide in compound words)
5. **Run benchmarks early** (after I3, not just I5) to catch performance regressions

---

## Next Agent Checklist

Before starting your Tier-0 pattern implementation (React/Redux/GraphQL/HTTP):

- [ ] Read this lessons document (30 min)
- [ ] Review Express Phase -1 analysis doc as template
- [ ] Study Express fixture strategy (polluted datasets)
- [ ] Check lexicon workflow and approval SLA
- [ ] Verify benchmark scripts are available
- [ ] Confirm architect availability for reviews

**Questions?** Post in `#ceps-phase6` or DM Agent 1 / Agent 6.

---

**End of Lessons Document**
