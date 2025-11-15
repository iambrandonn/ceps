# LLM-First Conversion Plan: Critical Updates

**Date:** 2025-11-10
**Source:** Code Review Agent feedback (docs/reviews/phase6/llm-first-conversion-plan-review.md)
**Status:** Implementation checklist

---

## Critical Updates (Must Address Before Phase 0)

### 1. ✅ Remove Timeline Estimates
- **Issue:** AI agents make timelines irrelevant
- **Action:** Replace with task dependency graph (DONE in plan)
- **Location:** Entire document

### 2. ✅ Add Regression Testing Strategy (Phase 0.6)
- **Issue:** No strategy to prevent quality regressions
- **Action:** Capture current output as regression baseline before pivoting
- **File:** `tests/regression/llm-first-quality.test.ts`
- **Tests:**
  - Maintains/improves High confidence percentage (≥42% baseline)
  - Maintains/improves Low confidence percentage (≤10% baseline)
  - All baseline entities have descriptions

### 3. ✅ Externalize Prompts to Config (Phase 1.3 + 2.4)
- **Issue:** Prompts are critical but not versioned
- **Action:** Move prompts to `src/llm/prompts/` directory
- **Files:**
  - `analysis-system-prompt.txt` (base system prompt, reused)
  - `analysis-entity-context.template` (Handlebars template per entity)
  - `review-system-prompt.txt` (for review agent)
- **Benefits:** A/B testing, git history, non-engineer tuning

###4. ✅ Implement Budget Enforcement (Phase 2.4)
- **Issue:** `--llm-budget` mentioned but never implemented
- **Action:** Add budget guard in LLMAnalyzer constructor
- **Logic:**
  ```typescript
  if (this.budgetLimit && currentCost >= this.budgetLimit) {
    throw new BudgetExceededError(`LLM budget exceeded ($${currentCost.toFixed(2)} >= $${this.budgetLimit})`);
  }
  ```
- **CLI:** `--llm-budget 5.00` (dollars)

### 5. ✅ Add Determinism Testing (Phase 3.3)
- **Issue:** SADS requires determinism but plan doesn't test it
- **Action:** Create test that runs same entity 3x and verifies identical output
- **File:** `tests/integration/llm-determinism.test.ts`
- **Test:**
  ```typescript
  const run1 = await analyzer.analyzeEntity(entity, source, context);
  const run2 = await analyzer.analyzeEntity(entity, source, context);
  expect(run1.textDraft).toBe(run2.textDraft);
  ```

### 6. ✅ Enhanced Confidence Inference (Phase 1.1)
- **Issue:** Keyword heuristic is simplistic
- **Recommendation:** Use LLM self-assessment
- **Prompt addition:**
  ```
  After your description, rate your confidence (0-100) that a capable LLM
  could reconstruct equivalent code from this description alone.

  Output format:
  DESCRIPTION: [2-4 sentences]
  CONFIDENCE: [0-100]
  ```
- **Alternative:** Validate heuristic against manual review in PoC

---

## High Priority Updates (Address in Early Phases)

### 7. ✅ Enhanced Cost Tracker (Phase 0.4)
- **Issue:** Basic implementation missing call tracking
- **Add fields:**
  - `calls: Array<{ model, inputTokens, outputTokens, timestamp, entityId }>`
  - `exportCSV()` method for analysis
  - Average latency calculation
  - Model-by-model cost breakdown

### 8. ✅ Move Batching to Phase 2 (not Phase 3)
- **Issue:** PoC → Phase 2 transition will show massive cost increase without batching
- **Action:** Implement batching in Phase 2.3 (not 3.2)
- **Format:** Use line-by-line parsing (not JSON) for robustness
  ```
  1: [description]
  2: [description]
  ```

### 9. ✅ Structured Validation Protocol (Phase 3.4)
- **Issue:** "Manually verify 2-3 entities" is vague
- **Protocol:**
  - Sample 50 entities (25 simple, 15 medium, 10 complex)
  - Scoring: Yes=100%, Mostly=75%, Partially=50%, No=0%
  - Threshold: Average ≥90% to pass
- **Tool:** `scripts/validate-reconstructability.ts` (interactive reviewer)

### 10. ✅ AST-Based Complexity (Phase 3.1)
- **Issue:** Regex-based complexity is brittle
- **Action:** Calculate cyclomatic complexity from AST
- **Method:** `calculateCyclomaticComplexity(node: ts.Node): number`
- **Benefit:** More accurate model selection

### 11. ✅ Parser Simplification Spec (Phase 0.5)
- **Issue:** Unclear which facts are preserved vs. deleted
- **Action:** Create `docs/internal/analysis/parser-simplification-spec.md`
- **Content:**
  - **Keep:** Entity metadata, import/export graph, call sites
  - **Remove:** Predicate/object facts, factSet attribution, ambiguity queue

---

## Medium Priority Updates (Address in Later Phases)

### 12. ✅ Smoke Test Fixture (Phase 1.4)
- **Issue:** research-coi is large (443 entities), slow feedback
- **Action:** Create `tests/fixtures/llm-first-smoke/` with 10 entities
- **Usage:**
  - `npm run test:llm-smoke` (~30 sec, $0.10)
  - `npm run test:llm-full` (~5 min, $3.50)

### 13. ✅ Add Memory Usage to Benchmarks (Phase 6.1)
- **Metric:** `process.memoryUsage().heapUsed` before/after
- **Track:** Rate limit hits (retry overhead)

### 14. ✅ Troubleshooting Section (Phase 6.2)
- **Add to handoff doc:**
  - LLM produces vague descriptions → check complexity threshold
  - Cost exceeds budget → increase Haiku usage
  - Descriptions inaccurate → enable review pass
  - Performance slow → increase concurrency

### 15. ✅ User Migration FAQ (Phase 5.3)
- **File:** `docs/user/llm-first-migration-faq.md`
- **Sections:**
  - What changed? (LLM semantic analysis)
  - Do I need to do anything? (No, CLI unchanged)
  - Will it cost more? (Yes, $2-5 vs. $0.03)
  - Can I control costs? (Yes, --llm-budget)

### 16. ✅ Observability/Debug Logging (Throughout)
- **Add:** `process.env.DEBUG_LLM` flag
- **Log:** Prompts and responses to `llm-debug.log`
- **Per-entity timing:** `✓ entityName (120ms, 450 tokens)`

### 17. ✅ Smart Source Truncation (Phase 4.1)
- **Issue:** Review prompt may truncate mid-function
- **Method:** `smartTruncate(code, maxChars)` truncates at function boundary
- **Fallback:** If no clean boundary, truncate with `// ... [truncated]`

---

## Documentation Updates (Phase 5.1)

### Files to Update

#### SADS.md
- **Section 3.1 (Components):** Remove PatternMatcher, IntentLifter, AmbiguityResolver, GroundingValidator
- **Section 3.2 (Lifecycle):** Update flow: Scan → Parse → LLM Analyze → Generate → Validate
- **Section 8 (LLM Gateway):** Describe semantic analysis role (not just polish)
- **Section 10 (Quality Gates):** Remove grounding gate

#### AGENTS.md
- **Current Status:** Reflect LLM-first architecture in Phase 6
- **Core Architecture:** Update component list (7 components, not 11)
- **Implementation Status:** Add "Phase 6 Wave 2: LLM-First Pivot"

#### STATUS.md
- **Current Step:** Update to "LLM-First Conversion (Phase 0)"
- **Recent Decisions:** Add pivot decision and rationale
- **Quality Metrics:** Update after each phase completion

#### IMPLEMENTATION_PLAN.md
- **Phase 6 Description:** Update to reflect LLM-first approach (not pattern libraries)
- **Workstream Changes:** Document removal of pattern matching, addition of LLM analysis

#### CTS-02_LLM_Gateway_and_Grounding.md
- **Remove:** Grounding validator sections
- **Add:** LLMAnalyzer specification
- **Update:** Prompts and retry logic for semantic analysis

#### CTS-05_Static_Analysis_and_Pattern_Detection.md
- **Mark:** Pattern detection as "no longer used for intent lifting"
- **Clarify:** Still used for side-effect detection, dynamic patterns

#### CTS-06_Reasoning_and_Ambiguity_Resolver.md
- **Status:** Mark as deprecated/removed
- **Note:** "Replaced by LLM semantic analysis in Phase 6 pivot"

#### PIVOT.md
- **Add:** "Implementation Complete" section (after Phase 6)
- **Link:** To this conversion plan
- **Document:** Final metrics (quality, cost, performance)

---

## Rollback Enhancements

### Partial Adoption Path
If LLM-first works for complex entities but is too expensive:
1. Keep LLM for: classes, complex functions (complexity > 10)
2. Revert to patterns for: constants, simple functions, exports
3. Adjust cost targets accordingly
4. **Threshold:** If cost >$10 but quality >80%, consider hybrid

### Preserve PoC Learnings
Before rollback, export insights:
- What worked (e.g., LLM excelled at conditional logic)
- What didn't (e.g., Haiku vague for domain-specific code)
- Insights for Option B (e.g., loosen grounding for env vars)

---

## Implementation Checklist

### Phase 0 (Critical)
- [x] Remove timeline estimates → Replace with dependency graph
- [ ] 0.1 Enhanced baseline capture (quantitative + qualitative)
- [ ] 0.2 Branch creation
- [ ] 0.3 Dependency mapping
- [ ] 0.4 Enhanced cost tracker
- [ ] 0.5 Parser simplification spec
- [ ] 0.6 Regression test setup

### Phase 1 (Critical)
- [ ] 1.1 LLMAnalyzer with LLM self-assessment confidence
- [ ] 1.2 PoC script with stratified sampling (10 entities: 3 simple, 3 medium, 2 complex, 1 class, 1 edge)
- [ ] 1.3 Prompt externalization (system prompt + entity template)
- [ ] 1.4 Smoke test fixture (10 entities)
- [ ] **GATE 1:** ≥80% reconstructability, <$0.50 per 10 entities

### Phase 2 (High Priority)
- [ ] 2.1 Parser updates (source snippet extraction with 2000-char cap)
- [ ] 2.2 Component deletion (~8,000 lines)
- [ ] 2.3 LLMAnalyzer integration + batching (line-by-line format)
- [ ] 2.4 Budget enforcement (--llm-budget flag)
- [ ] 2.5 Integration tests with MockLLMGateway
- [ ] **GATE 2:** All tests pass, smoke fixture green

### Phase 3 (High Priority)
- [ ] 3.1 AST-based complexity estimation
- [ ] 3.2 Result caching with disk persistence
- [ ] 3.3 Determinism testing (3x run, identical output)
- [ ] 3.4 Research-COI validation (50-entity protocol)
- [ ] **GATE 3:** Quality >75%, Cost <$5, Determinism verified

### Phase 4 (Medium Priority)
- [ ] 4.1 ReviewAgent with smart source truncation
- [ ] 4.2 Integration with convergence detection
- [ ] 4.3 Testing
- [ ] **GATE 4:** Review improves quality 5-10%

### Phase 5-6 (Documentation)
- [ ] 5.1 Update all architecture docs (SADS, CTS, AGENTS, STATUS, IMPLEMENTATION_PLAN)
- [ ] 5.2 PRD compliance (80 entity reviews across 3 projects)
- [ ] 5.3 User migration FAQ
- [ ] 6.1 Benchmarks (with memory usage)
- [ ] 6.2 Handoff doc (with troubleshooting)
- [ ] **FINAL GATE:** All metrics, docs complete, ready to merge

---

## Summary

**Total Critical Items:** 6 (must address before Phase 0)
**Total High Priority:** 5 (address in Phases 1-3)
**Total Medium Priority:** 6 (address in Phases 4-6)

**Confidence in Success:** High (85%) with these updates incorporated

**Next Action:** Begin Phase 0.1 (Enhanced Baseline Capture)
