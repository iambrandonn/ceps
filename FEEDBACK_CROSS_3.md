# WS-F2 Cross-Review Feedback - Deep Technical Review

**Review Date:** 2025-11-05 (Second Pass)
**Reviewer:** WS-H Cross-Review (Technical Deep Dive)
**Status:** ⚠️ **BLOCKED - Critical Implementation Gap Found**

---

## Executive Summary

**Verdict:** ⚠️ **BLOCKED BY CRITICAL BUG**

Upon deeper technical review, I found a **critical implementation gap** that breaks the core retry mechanism:

🚨 **CRITICAL: Retry prompts (O/R1/R2) are not differentiated** 🚨

The gateway accepts `promptKey` parameter but does not use it to generate different prompts for retry attempts. All three attempts (O → R1 → R2) use the identical prompt, making retries ineffective. This violates CTS-02 §4.4 specification and undermines the validator integration.

**Impact:** The retry mechanism appears to work (tests pass) but provides no actual benefit since the LLM receives the same instructions on each retry.

---

## Critical Issues (Must Fix)

### 🚨 Issue #1: Prompt Key Not Implemented (BLOCKER)

**Severity:** **CRITICAL - BLOCKS PRODUCTION**

**Location:** `src/llm/gateway.ts:216-244` (buildSummarizePrompt method)

**Problem:**
The `buildSummarizePrompt()` method accepts `options.promptKey` but never uses it to differentiate prompts. All retry attempts use the same prompt text.

**Evidence:**
```typescript
// gateway.ts:216-244
private buildSummarizePrompt(
  factSets: FactSet[],
  style: string,
  options: SummarizeOptions
): string {
  // ... factsText formatting ...

  // CTS-02 §3: Original prompt (O)  ❌ ALWAYS USES "O" PROMPT
  return `Write a concise paragraph describing the behavior using only the facts provided.
Use canonical names; do not add entities, relations, or numbers not present in the facts.
If unsure, return NEEDS_QUESTION.

Style: ${style}
${options.deterministic ? 'Mode: Deterministic (no paraphrasing variance)\n' : ''}
Facts:
${factsText}

Output:`;
  // ❌ options.promptKey is NEVER CHECKED - same prompt for O, R1, R2!
}
```

**CTS-02 §4.4 Specification:**
The spec clearly defines THREE DIFFERENT prompts:

**Original (O):**
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
[Specification implies even stricter constraints]
```

**Why Tests Pass:**
The tests in `validator-retry.test.ts:100-190` only verify that `promptKey` is *passed* correctly (O, R1, R2), but don't verify that the *prompts are actually different*:

```typescript
// validator-retry.test.ts:187-189
expect(calls[0][2].promptKey).toBe('O');   // ✅ Key is passed
expect(calls[1][2].promptKey).toBe('R1');  // ✅ Key is passed
expect(calls[2][2].promptKey).toBe('R2');  // ✅ Key is passed
// ❌ BUT NO CHECK that prompts are actually different!
```

**Impact:**
- Retry mechanism provides no benefit - same prompt yields same failures
- Validator sees identical LLM output on each retry
- Wastes tokens (3x calls with same input)
- Undermines grounding validator integration
- Defeats purpose of retry strategy

**Required Fix:**
```typescript
private buildSummarizePrompt(
  factSets: FactSet[],
  style: string,
  options: SummarizeOptions
): string {
  const factsText = /* ... formatting ... */;

  // Differentiate prompts based on promptKey
  switch (options.promptKey) {
    case 'R2':
      // Strictest: Bullet-only, exact canonical names, no inference
      return `OUTPUT BULLETS ONLY. Use EXACT canonical names from facts.
Include ONLY numbers/enums explicitly present.
NO synonyms. NO inference. NO new entities.
If missing critical info: emit NEEDS_QUESTION.

Facts:
${factsText}

Output (bullets only):`;

    case 'R1':
      // Stricter: Bullet format, canonical names, strict enumeration
      return `Output **bullets only**. Use exact canonical names from FACTS (no synonyms).
Include only numbers/enums from FACTS.
No new entities/relations. If missing info, emit NEEDS_QUESTION.

Facts:
${factsText}

Output:`;

    case 'O':
    default:
      // Original: Paragraph format, reasonable paraphrasing
      return `Write a concise paragraph describing the behavior using only the facts provided.
Use canonical names; do not add entities, relations, or numbers not present in the facts.
If unsure, return NEEDS_QUESTION.

Style: ${style}
${options.deterministic ? 'Mode: Deterministic (no paraphrasing variance)\n' : ''}
Facts:
${factsText}

Output:`;
  }
}
```

**Testing Gap:**
Add integration test verifying different prompts generate different outputs:
```typescript
it('should use different prompts for O/R1/R2', async () => {
  const promptsSeen: string[] = [];
  const mockGateway = {
    summarize: vi.fn().mockImplementation(async (factSets, style, options) => {
      // Capture the actual prompt that would be sent
      const gateway = new LLMGateway(/* ... */);
      const prompt = gateway['buildSummarizePrompt'](factSets, style, options);
      promptsSeen.push(prompt);
      return 'test output';
    }),
  };

  // Force 3 retries
  // ...

  // Verify prompts are different
  expect(promptsSeen[0]).toContain('concise paragraph');  // O
  expect(promptsSeen[1]).toContain('bullets only');       // R1
  expect(promptsSeen[2]).toContain('BULLETS ONLY');       // R2
  expect(new Set(promptsSeen).size).toBe(3);  // All unique
});
```

---

### ⚠️ Issue #2: Coverage Below Target

**Severity:** **MAJOR - BLOCKS SIGN-OFF**

**Problem:** Several modules fall below 80% coverage target

**Coverage Report** (from `pnpm test:coverage src/llm src/generator`):

| Module | Lines | Branches | Status |
|--------|-------|----------|--------|
| gateway.ts | 71.54% | 58.82% | ❌ Below 80% |
| anthropic.ts | 56.96% | 66.66% | ❌ Below 80% |
| openai.ts | 30% | 0% | ❌ Below 80% |
| cli.ts | 0% | 0% | ⚠️ Not tested in this run |

**Why This Matters:**
- Plan requirement: ≥80% branch coverage (§4)
- Low adapter coverage suggests error paths untested
- OpenAI adapter almost completely untested (30%)

**Required Fixes:**

1. **Gateway coverage (71.54% → ≥80%):**
   - Test cache hit/miss paths
   - Test provider switching
   - Test error handling during summarize()

2. **Anthropic adapter (56.96% → ≥80%):**
   - Test API errors (rate limits, invalid keys, network failures)
   - Test token counting edge cases
   - Test model pricing for different models

3. **OpenAI adapter (30% → ≥80%):**
   - Currently almost untested
   - Add comprehensive test suite matching Anthropic adapter coverage

**Estimated Effort:** 3-4 hours to add missing tests

---

### ⚠️ Issue #3: Guidance Not Passed to Retry Prompts

**Severity:** **MAJOR**

**Location:** `src/generator/spec-generator.ts:365-373`

**Problem:**
The generator collects validation diagnostics but does not pass them to the gateway for use in retry prompts. Per CTS-02 §4.4, retry prompts should include guidance based on failed rules.

**Current Code:**
```typescript
// spec-generator.ts:365-373
} else if (result.status === 'retry' && attempt < maxAttempts - 1) {
  attempt++;
  promptKey = attempt === 1 ? 'R1' : 'R2';
  const reason = result.diagnostics[0]?.reason || 'unknown';
  console.debug(`Retry ${attempt} for ${entity.id}: ${reason}`);
  this.metrics.diagnostics.push(...result.diagnostics);
  continue;  // ❌ Diagnostics logged but NOT passed to gateway
}
```

**Expected Behavior:**
Diagnostics should be passed to gateway so R1/R2 prompts can include specific guidance:

```typescript
// Example improved prompt with guidance:
"Previous attempt failed: entity validation (AdminService not found in KB).
Output **bullets only**. Use ONLY entity names present in FACTS below.
Do not infer or add entities not explicitly listed.
..."
```

**Required Fix:**
1. Extend `SummarizeOptions` to include `guidance?: string[]`
2. Extract guidance from diagnostics: `const guidance = result.diagnostics.map(d => d.reason)`
3. Pass to gateway: `summarize(factSets, style, { promptKey, guidance })`
4. Include in R1/R2 prompts: `"Previous failures:\n${guidance.join('\n')}\n\n..."`

**Note:** This may be a design decision (keep prompts generic vs. specific). Requires stakeholder clarification.

---

## Major Issues (Should Fix)

### Issue #4: Deterministic Mode Tests Incomplete

**Severity:** **MODERATE**

**Plan Requirement (Stage G):**
> Execute Phase 3 golden harness with `--llm off --deterministic` (byte-identical) and `--llm on --deterministic` (structural verification)

**Current Status:**
- ✅ `llm-orchestration.test.ts:62-73`: Tests deterministic bypass (llm off)
- ❌ No test for byte-identical output across multiple runs
- ⚠️ No golden harness with multiple generation runs

**Why This Matters:**
- Determinism gate requirement not fully validated
- Can't verify identical inputs → identical outputs
- Missing confidence in deterministic mode implementation

**Required Fix:**
```typescript
it('should produce byte-identical outputs across runs (--llm off --deterministic)', () => {
  const options: GeneratorOptions = {
    llmEnabled: false,
    deterministicMode: true,
  };

  const generator1 = new SpecGenerator(kb, undefined, options);
  const result1 = generator1.generateDirectorySpecs('.');

  const generator2 = new SpecGenerator(kb, undefined, options);
  const result2 = generator2.generateDirectorySpecs('.');

  // Byte-identical comparison
  expect(result1).toEqual(result2);

  // Hash comparison for large outputs
  const hash1 = crypto.createHash('sha256').update(JSON.stringify(result1)).digest('hex');
  const hash2 = crypto.createHash('sha256').update(JSON.stringify(result2)).digest('hex');
  expect(hash1).toBe(hash2);
});
```

**Estimated Effort:** 1 hour

---

### Issue #5: Monorepo Fixture Missing

**Severity:** **MODERATE**

**Plan Requirement (Stage G):**
> `fixtures/integration/monorepo-small` (token budget aggregate reporting, ≤100k)

**Current Status:**
- ✅ Express fixture (≤30k threshold)
- ✅ React fixture (≤40k threshold)
- ❌ Monorepo fixture (≤100k threshold) - NOT FOUND

**Why This Matters:**
- Cost gate threshold for monorepo (100k) not integration-tested
- Can't verify budget tracking across multiple packages
- Plan explicitly requires all three fixture types

**Options:**
1. **Add monorepo-small fixture** (~2 hours effort)
2. **Document that monorepo testing is deferred** with rationale
3. **Use existing tiny-express + tiny-react as pseudo-monorepo** (adjust test)

**Recommendation:** Option 2 (document deferral) if monorepo support is Phase 5 scope

---

## Minor Issues (Nice to Have)

### Issue #6: Artifacts Directory Missing

**Plan Requirement (Completion Checklist):**
> Test execution logs, coverage reports, and run summaries archived under `.ceps/artifacts/phase4/ws-f2/`

**Status:** Directory does not exist

**Impact:** Low - Test results are visible, archival is for documentation

**Fix:** 15 minutes to create directory and copy artifacts

---

### Issue #7: Real Provider Script Undocumented

**Plan Requirement (Stage G):**
> Provide mock-backed CI scenario + optional manual (real provider) script; document strategy

**Status:** Mock strategy implemented, real provider script not documented

**Impact:** Low - Plan marks this as optional

**Fix:** 30 minutes to add usage instructions to README

---

## Test Quality Assessment

### ✅ Strengths

1. **Comprehensive CLI testing:** 26 tests covering all flag combinations
2. **Good retry flow testing:** 10 tests verifying O → R1 → R2 transitions
3. **Budget helper coverage:** 13 tests for budget management
4. **Integration fixtures:** Express + React fixtures operational

### ⚠️ Weaknesses

1. **Prompt differentiation not tested:** Tests verify *keys* are passed, not *prompts* are different
2. **Low adapter coverage:** Anthropic 56.96%, OpenAI 30%
3. **Error paths undertested:** Gateway error handling not covered
4. **Golden harness incomplete:** Byte-identical determinism not verified

---

## Compliance Re-Assessment

### CTS-02 §4.4 Retry Strategy ❌ NON-COMPLIANT

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Original prompt (O) | ✅ | gateway.ts:235-244 |
| Retry #1 (R1) different | ❌ | **Uses same prompt as O** |
| Retry #2 (R2) different | ❌ | **Uses same prompt as O** |
| Stricter constraints on retry | ❌ | **No differentiation** |

**Verdict:** ❌ **DOES NOT MEET CTS-02 §4.4**

### Plan Stage E Requirements ⚠️ PARTIAL

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Honor validator contract | ✅ | spec-generator.ts:337-406 |
| Retry transitions | ✅ | Lines 365-373 |
| Fallback scenario | ✅ | Lines 375-383 |
| **Prompt key verification** | ❌ | **Keys passed but unused** |
| Warning logging | ✅ | Lines 370, 378, 403 |
| FactSetId preservation | ✅ | Line 355 |

**Verdict:** ⚠️ **5/6 requirements met** - prompt differentiation missing

---

## Recommended Action Plan

### 🚨 Priority 1: BLOCKING (Must Fix Before Sign-Off)

1. **Implement prompt differentiation** (~2 hours)
   - Modify `buildSummarizePrompt()` to use switch on `promptKey`
   - Add R1/R2 prompt variations per CTS-02 §4.4
   - Add test verifying prompts are actually different

2. **Improve test coverage to ≥80%** (~3 hours)
   - Gateway: cache, provider switching, error handling
   - Anthropic adapter: error scenarios, token edge cases
   - OpenAI adapter: comprehensive test suite

### Priority 2: Should Fix (Quality)

3. **Add byte-identical determinism test** (~1 hour)
   - Golden harness with multiple runs
   - Hash comparison for outputs

4. **Clarify monorepo fixture status** (~5 minutes)
   - Document deferral, OR
   - Add monorepo-small fixture (~2 hours)

### Priority 3: Documentation

5. **Create artifacts directory** (~15 minutes)
6. **Document real provider script** (~30 minutes)

---

## Revised Assessment

**Status:** ⚠️ **BLOCKED - Cannot Sign Off**

### Critical Path:
1. Fix prompt differentiation bug (Issue #1) - **BLOCKER**
2. Raise coverage to ≥80% (Issue #2) - **BLOCKER**
3. Add determinism test (Issue #4) - Quality gate
4. Address Issues #3, #5-7 - Follow-up work

### Estimated Effort to Unblock:
- Priority 1 fixes: **~5 hours**
- Priority 2 fixes: **~3 hours**
- Priority 3: **~1 hour**
- **Total: ~9 hours to full compliance**

---

## Strengths (Unchanged)

The first review findings still stand:
- ✅ Excellent Phase -1 analysis
- ✅ Budget management with graceful fallback
- ✅ Comprehensive CLI validation
- ✅ Strong orchestration logic
- ✅ Clear schema alignment with WS-H

**However:** The prompt differentiation bug undermines the retry mechanism, which is a core feature of the LLM integration.

---

## Updated Verdict

**First Review (FEEDBACK_CROSS_2.md):** ✅ APPROVED FOR INTEGRATION

**Second Review (This Document):** ⚠️ **BLOCKED BY CRITICAL BUG**

**Reasoning:**
Surface-level review showed strong implementation. Deep dive revealed that retry mechanism is fundamentally broken - all retries use identical prompts, making them ineffective. This violates CTS-02 specification and undermines validator integration.

**Recommendation:**
1. **BLOCK integration** until Issue #1 (prompt differentiation) is fixed
2. **BLOCK sign-off** until Issue #2 (coverage) is resolved
3. Proceed with Issues #3-7 as follow-up work after unblocking

---

**Reviewed by:** WS-H Cross-Review (Deep Technical Pass)
**Sign-off:** ⚠️ **BLOCKED - CRITICAL BUG MUST BE FIXED**
**Blocking issues:** #1 (prompt differentiation), #2 (coverage)
**Next step:** Fix blocking issues, then re-review

---

## Comparison: Surface vs. Deep Review

| Aspect | Surface Review (FEEDBACK_CROSS_2) | Deep Review (This Doc) |
|--------|----------------------------------|------------------------|
| **Overall Status** | ✅ Production-ready | ⚠️ Blocked by bug |
| **Prompt Differentiation** | ✅ Assumed working (tests pass) | ❌ Not implemented |
| **Test Coverage** | ⚠️ Not verified | ❌ Below 80% |
| **Retry Mechanism** | ✅ Appears functional | ❌ Broken (same prompts) |
| **Integration Readiness** | ✅ Ready | ⚠️ Blocked |

**Key Learning:** Tests passing ≠ requirements met. The tests verified API contract (keys passed) but not implementation correctness (prompts differentiated).

---

## Appendix: Test Gap Analysis

### What Tests Check ✅

- ✅ `promptKey` parameter is passed to gateway
- ✅ Retry transitions occur (O → R1 → R2)
- ✅ Attempt counters increment correctly
- ✅ Template fallback after max retries

### What Tests DON'T Check ❌

- ❌ Prompts are actually different for O/R1/R2
- ❌ R1 is stricter than O
- ❌ R2 is stricter than R1
- ❌ Failed rules influence retry prompts
- ❌ LLM receives different instructions on retry

**This gap allowed the bug to persist through testing.**

---

**Date:** 2025-11-05
**Next Review:** After Priority 1 fixes complete
