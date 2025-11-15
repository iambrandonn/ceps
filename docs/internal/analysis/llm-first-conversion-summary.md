# LLM-First Conversion Plan: Summary of Changes

**Date:** 2025-11-10
**Status:** Plan Updated and Approved
**Reviewer:** Code Review Agent
**Next Action:** Begin Phase 0

---

## Overview

The LLM-First Conversion Plan has been updated to incorporate all critical and high-priority recommendations from the Code Review Agent's feedback. The plan is now approved for execution.

**Key Changes:**
1. Removed all timeline estimates (replaced with task dependency graph)
2. Added 17 critical/high/medium priority updates
3. Enhanced testing, validation, and documentation strategies
4. Clarified component simplification (Parser, KB)
5. Added prompt externalization and budget enforcement
6. Expanded documentation update requirements

---

## What Changed in the Conversion Plan

### Structural Changes

#### 1. Task Organization
**Before:** Time-based phases ("2-3 days", "1 week")
**After:** Dependency-based graph with validation gates

```
Phase 0 → Phase 1 (Gate 1: PoC) → Phase 2 (Gate 2: Integration)
  → Phase 3 (Gate 3: Validation) → Phase 4 (Gate 4: Review)
  → Phase 5-6 (Final Gate: Documentation)
```

#### 2. Success Criteria Enhancement
**Added:**
- Validation sampling protocol (50 entities: 25 simple, 15 medium, 10 complex)
- Inter-rater reliability requirement (2 reviewers, 90%+ agreement)
- Reconstructability scoring rubric (Yes/Mostly/Partially/No)

#### 3. Component Mapping Clarification
**Parser:**
- **Keep:** AST structure, import/export graph, call sites (for side-effect detection)
- **Remove:** Predicate/object facts, factSet attribution

**Knowledge Base:**
- **Keep:** Entity/relation tracking
- **Remove:** factSet grounding, ambiguity queue

**Note:** Phase 0.5 will create detailed "Parser Simplification Spec"

### Phase 0 Enhancements

#### New Tasks Added
1. **0.1 Enhanced Baseline Capture**
   - Quantitative metrics (check-quality.sh output)
   - Qualitative samples (10 entity descriptions for before/after comparison)

2. **0.4 Enhanced Cost Tracker**
   - Per-call tracking (model, tokens, timestamp, entityId)
   - CSV export for analysis
   - Average latency calculation
   - Model-by-model cost breakdown

3. **0.5 Parser Simplification Analysis** (NEW)
   - Document which facts are preserved vs. deleted
   - Ensure cross-link validation still works
   - Ensure coverage gate can track documented entities

4. **0.6 Regression Test Setup** (NEW)
   - Capture current output as regression baseline
   - Create `tests/regression/llm-first-quality.test.ts`
   - Assert: High confidence ≥42%, Low confidence ≤10%

### Phase 1 Enhancements

#### 1.1 LLMAnalyzer Improvements
**Prompt Strategy:**
- Split into system prompt (cached, reused) + entity context
- Reduces tokens per call by 200-300
- System prompt in `src/llm/prompts/analysis-system-prompt.txt`
- Entity template in `src/llm/prompts/analysis-entity-context.template`

**Confidence Inference:**
- **Option A:** LLM self-assessment (ask LLM to rate 0-100)
- **Option B:** Validate keyword heuristic against manual review
- **Decision:** Test both in PoC, choose winner

#### 1.2 PoC Enhancements
**Stratified Sampling:**
- 3 simple (constants, exports)
- 3 medium functions (10-30 LOC, 2-5 branches)
- 2 complex functions (30+ LOC, conditional logic, async)
- 1 class (multiple methods)
- 1 edge case (dynamic import, reflection)

**Decision Gate:**
- ≥80% reconstructability (8/10 entities)
- <$0.50 per 10 entities
- Descriptions include conditional logic, env vars, side effects

#### 1.3 Prompt Externalization (NEW)
**Files Created:**
- `src/llm/prompts/analysis-system-prompt.txt`
- `src/llm/prompts/analysis-entity-context.template` (Handlebars)
- `src/llm/prompts/review-system-prompt.txt`

**Benefits:**
- A/B testing of prompt variations
- Git history tracks prompt evolution
- Non-engineers can tune prompts

#### 1.4 Smoke Test Fixture (NEW)
**Location:** `tests/fixtures/llm-first-smoke/`
**Contents:** 10 representative entities
**Usage:**
- `npm run test:llm-smoke` (~30 sec, $0.10)
- `npm run test:llm-full` (~5 min, $3.50)

### Phase 2 Enhancements

#### 2.1 Parser Updates
**Source Snippet Extraction:**
- Add 2000-char cap (safety valve)
- Log warning if truncated
- Extract signatures separately for large functions

#### 2.3 Batching (Moved from Phase 3)
**Format:** Line-by-line (not JSON)
```
1: [description for entity 1]
2: [description for entity 2]
```

**Fallback:** If batching fails, fall back to individual analysis (don't fail entire file)

**Reason:** Without batching, Phase 2 will show massive cost increase vs. PoC

#### 2.4 Budget Enforcement (NEW)
**Implementation:**
```typescript
class LLMAnalyzer {
  constructor(gateway, tracker, budgetLimit?: number) {}

  async analyzeEntity(...) {
    if (this.budgetLimit && currentCost >= this.budgetLimit) {
      throw new BudgetExceededError(`Budget exceeded: $${currentCost}`);
    }
    // ... proceed
  }
}
```

**CLI:** `--llm-budget 5.00` (dollars)

#### 2.5 Integration Testing
**MockLLMGateway:**
- Preload mock responses for test entities
- Generate fallback for unmocked entities
- Catch prompt/response format mismatches

**Real LLM Test:**
- Gated behind `ANTHROPIC_API_KEY` env var
- Validates actual API integration

### Phase 3 Enhancements

#### 3.1 AST-Based Complexity
**Replace regex with cyclomatic complexity:**
```typescript
calculateCyclomaticComplexity(node: ts.Node): number {
  // Count: if, while, for, switch cases, catch, &&, ||
  // Standard algorithm, more accurate than regex
}
```

**Benefit:** Better model selection → cost/quality trade-off

#### 3.2 Result Caching
**Disk Persistence:**
```typescript
async loadFromDisk(cacheDir: string) {
  // Load .ceps/llm-cache.json
}

async saveToDisk(cacheDir: string) {
  // Save .ceps/llm-cache.json
}
```

**CLI:** `--clear-cache` flag for debugging

#### 3.3 Determinism Testing (NEW)
**Test:**
```typescript
it('produces identical output with temp=0', async () => {
  const run1 = await analyzer.analyzeEntity(entity, source, {});
  const run2 = await analyzer.analyzeEntity(entity, source, {});
  const run3 = await analyzer.analyzeEntity(entity, source, {});

  expect(run1.textDraft).toBe(run2.textDraft);
  expect(run2.textDraft).toBe(run3.textDraft);
});
```

**File:** `tests/integration/llm-determinism.test.ts`

#### 3.4 Validation Protocol
**Structured Process:**
1. Sample 50 entities randomly (stratified: 25 simple, 15 medium, 10 complex)
2. For each, answer: "Could I reconstruct equivalent code from description alone?"
3. Scoring: Yes=100%, Mostly=75%, Partially=50%, No=0%
4. Threshold: Average ≥90% to pass

**Tool:** `scripts/validate-reconstructability.ts` (interactive side-by-side reviewer)

### Phase 4 Enhancements

#### 4.1 ReviewAgent
**Smart Source Truncation:**
```typescript
smartTruncate(code: string, maxChars: number): string {
  if (code.length <= maxChars) return code;

  // Try to truncate at function boundary
  const lastFunctionEnd = code.substring(0, maxChars).lastIndexOf('\n}');
  if (lastFunctionEnd > maxChars * 0.8) {
    return code.substring(0, lastFunctionEnd + 2) + '\n// ... [truncated]';
  }

  return code.substring(0, maxChars) + '\n// ... [truncated]';
}
```

#### 4.2 Convergence Detection
**Logic:**
```typescript
let previousIssueCount = Infinity;

while (iteration < maxIterations) {
  const feedback = await review();

  if (feedback.length === 0) break; // No issues

  if (feedback.length >= previousIssueCount) {
    console.warn('Not converging. Stopping.');
    break;
  }

  previousIssueCount = feedback.length;
  // ... revise
}
```

**Prevents:** Infinite loops, non-converging reviews

### Phase 5-6 Enhancements

#### 5.1 Documentation Updates

**Files to Update:**

1. **SADS.md**
   - Section 3.1: Remove 4 components (PatternMatcher, IntentLifter, AmbiguityResolver, GroundingValidator)
   - Section 3.2: Update lifecycle flow
   - Section 8: LLM Gateway → semantic analysis (not just polish)
   - Section 10: Remove grounding gate

2. **AGENTS.md**
   - Current Status: Reflect Phase 6 Wave 2 (LLM-First Pivot)
   - Core Architecture: 7 components (down from 11)
   - Implementation Status: Add pivot entry

3. **STATUS.md**
   - Current Step: "LLM-First Conversion (Phase 0)"
   - Recent Decisions: Add pivot rationale
   - Quality Metrics: Update after each phase

4. **IMPLEMENTATION_PLAN.md**
   - Phase 6: Update description (LLM-first, not pattern libraries)
   - Workstreams: Document removal of WS-D pattern matching

5. **CTS-02_LLM_Gateway_and_Grounding.md**
   - Remove: Grounding validator sections
   - Add: LLMAnalyzer specification
   - Update: Prompts for semantic analysis

6. **CTS-05_Static_Analysis_and_Pattern_Detection.md**
   - Mark: Pattern detection "no longer used for intent lifting"

7. **CTS-06_Reasoning_and_Ambiguity_Resolver.md**
   - Status: Mark as deprecated
   - Note: "Replaced by LLM semantic analysis"

8. **PIVOT.md**
   - Add: "Implementation Complete" section (after Phase 6)
   - Link: To conversion plan
   - Document: Final metrics

#### 5.2 PRD Compliance Validation
**Enhanced Sampling:**
- Research-coi: 30 entities (larger sample for high confidence)
- Tiny-react: 20 entities
- Ceps (dogfooding): 30 entities
- **Total:** 80 entity reviews (up from 30)

**Inter-rater Reliability:**
- 2 reviewers
- Measure agreement percentage
- Reconcile disagreements

#### 5.3 User Migration FAQ (NEW)
**File:** `docs/user/llm-first-migration-faq.md`

**Sections:**
- What changed? (LLM semantic analysis)
- Do I need to do anything? (No, CLI unchanged)
- Will it cost more? (Yes, $2-5 for medium projects vs. $0.03 before)
- Why the cost increase? (Quality: 42% → 75%+, reconstructability: 30% → 90%+)
- Can I control costs? (Yes, --llm-budget, --llm off)
- Will my specs change? (Yes, more detailed; old specs in git history)

#### 6.1 Benchmarks
**Added Metrics:**
- Memory usage (heap before/after)
- Rate limit hits (retry overhead)
- Model breakdown (Haiku vs. Sonnet usage %)

#### 6.2 Handoff Document
**Added Section: Troubleshooting**
- LLM produces vague descriptions → Check complexity threshold
- Cost exceeds budget → Increase Haiku usage, adjust thresholds
- Descriptions inaccurate → Enable review pass, validate model version
- Performance slow → Increase concurrency, enable caching

---

## Rollback Enhancements

### Partial Adoption Path (NEW)
If cost is acceptable but not ideal:
- Keep LLM for: classes, complex functions (complexity > 10)
- Revert patterns for: constants, simple functions, exports
- **Threshold:** Cost >$10 but quality >80% → consider hybrid

### Preserve PoC Learnings (NEW)
Before rollback, document:
- What worked (e.g., LLM excelled at conditional logic)
- What didn't (e.g., Haiku vague for domain code)
- Insights for Option B (e.g., loosen grounding rules)

**File:** `docs/internal/analysis/llm-first-poc-learnings.md`

---

## Added Throughout: Observability

### Debug Logging
**Flag:** `DEBUG_LLM=1` environment variable

**Output:**
```
=== buildCache ===
[System Prompt]
You are analyzing JavaScript/TypeScript code...
[Entity Context]
Entity: function "buildCache"
Source code:
```javascript
export function buildCache(keyPrefix, options) { ... }
```

RESPONSE:
Conditionally returns a Redis-backed cache if REDIS_HOST...

✓ buildCache (145ms, 520 tokens)
```

**File:** `llm-debug.log` (appended per entity)

### Per-Entity Timing
**Console Output:**
```
🧠 Analyzing 443 entities with LLM...
  ✓ buildCache (145ms, 520 tokens)
  ✓ DISCLOSURE_STATUS (89ms, 180 tokens)
  ♻️  Cache hit: formatDate
  ✓ structuredLogger (234ms, 680 tokens)
  ...
✅ Analysis complete. 443 behavior chunks created.
```

---

## Summary: What the Review Achieved

### Problems Identified
1. **Timeline estimates irrelevant** for AI agents
2. **No regression testing** strategy
3. **Prompts not versioned** (critical for quality)
4. **Budget enforcement missing** (risk of runaway costs)
5. **Determinism not tested** (SADS requirement)
6. **Confidence heuristic weak** (keyword-based)
7. **Cost optimization delayed** (batching in Phase 3)
8. **Validation vague** ("2-3 entities")
9. **Documentation updates unclear**
10. **Rollback plan incomplete** (no partial adoption)

### Solutions Applied
1. ✅ Dependency graph replaces timelines
2. ✅ Phase 0.6 adds regression tests
3. ✅ Phase 1.3 externalizes prompts
4. ✅ Phase 2.4 adds budget enforcement
5. ✅ Phase 3.3 adds determinism tests
6. ✅ Phase 1.1 uses LLM self-assessment
7. ✅ Phase 2.3 implements batching early
8. ✅ Phase 3.4 adds 50-entity structured protocol
9. ✅ Phase 5.1 lists all doc updates explicitly
10. ✅ Rollback section adds hybrid approach

### Quality Improvements
- **Testing:** Regression, determinism, smoke fixture, structured validation
- **Cost Management:** Enhanced tracker, budget guard, batching, model selection, caching
- **Quality Assurance:** LLM self-assessment, review agent, convergence detection
- **Maintainability:** Externalized prompts, observability, troubleshooting guide
- **Documentation:** 8 architecture docs updated, user FAQ, handoff doc

---

## Confidence Assessment

### Before Review
**Confidence:** Medium (70%)
**Concerns:**
- No regression prevention
- Cost management unclear
- Validation process vague

### After Review
**Confidence:** High (85%)
**Rationale:**
- All critical gaps addressed
- Testing strategy comprehensive
- Cost controls in place
- Documentation plan explicit
- Rollback options clear

---

## Next Steps

### Immediate (Phase 0)
1. [ ] Execute Phase 0.1: Enhanced baseline capture
2. [ ] Execute Phase 0.4: Enhanced cost tracker
3. [ ] Execute Phase 0.5: Parser simplification spec
4. [ ] Execute Phase 0.6: Regression test setup

### Phase 1 (PoC)
5. [ ] Implement LLMAnalyzer with prompt externalization
6. [ ] Run stratified PoC (10 entities)
7. [ ] **Decision Gate:** Go/No-Go based on 80% reconstructability

### Phase 2+ (If PoC Passes)
8. [ ] Follow dependency graph through Phases 2-6
9. [ ] Update all documentation (Phase 5.1)
10. [ ] Final validation and merge

---

## Approval Status

✅ **Plan Approved with Recommendations**
- All critical recommendations incorporated
- All high-priority recommendations incorporated
- Most medium-priority recommendations incorporated

**Reviewer:** Code Review Agent (2025-11-10)
**Status:** Ready for Phase 0 execution
**Next Review:** After Phase 1 PoC completion
