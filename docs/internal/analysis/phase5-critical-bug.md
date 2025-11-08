# Critical Bug Report: Behavior Extraction Failure

**Report Date:** 2025-11-07
**Discovered During:** Manual testing between Phase 5 and Phase 6
**Severity:** 🔴 **CRITICAL** - Core functionality broken
**Status:** 🔴 **BLOCKING PHASE 6**

---

## Executive Summary

Manual testing of ceps on real codebases reveals that **behavior extraction is not working**. The tool generates structural documentation (signatures, exports, types) but outputs only generic placeholder text like "This function performs an operation" instead of actual behavioral descriptions. Additionally, validation errors leak diagnostic text into final specs.

**Impact:** The tool is essentially unusable for its primary purpose - documenting what code does.

---

## Bug #1: Behavior Extraction Produces Only Generic Placeholders

### Severity: 🔴 CRITICAL

### Description

When running ceps on any codebase (including ceps itself), all behavior descriptions are generic placeholders:
- "This function performs an operation."
- "This method performs an operation."
- "This class represents [name]."

No actual behavioral information is extracted or documented, even when the code has clear, documentable behavior.

### Reproduction Steps

```bash
# Test on ceps codebase itself
cd /media/iambrandonn/Files/ceps
npx tsx dist/orchestrator/index.js . --deterministic --llm off

# Check generated spec
cat src/kb/spec.md
```

**Expected output:** Meaningful behavior descriptions like:
```markdown
### insertEntity

**Signature:** `(entity: Entity): void`

**Visibility:** Public (exported)

**Behavior:**
- Validates entity has required fields (id, kind)
- Inserts entity into KB state map
- Updates indices (by kind, by file, etc.)
- Throws KBError if entity ID already exists
```

**Actual output:**
```markdown
### insertEntity

**Signature:** `(entity: Entity): void`

**Visibility:** Public (exported)

This method performs an operation.
```

### Evidence

1. **Coverage Gate Failure:**
   ```
   ✗ [FAIL ] Coverage        0/268 documented, 0 QIDs
   ```
   Despite finding 268 exported entities, the coverage gate reports 0 documented (no meaningful behavior extracted).

2. **No KB State Persisted:**
   - `.ceps/kb-state.json` is not created
   - Suggests reasoning phase is skipped or failing silently

3. **Generic Template Text Everywhere:**
   - All functions: "This function performs an operation"
   - All methods: "This method performs an operation"
   - All classes: "This class represents [name]"

### Affected Components

- **Reasoning Engine** (`src/reasoning/`) - Not extracting behavior from code
- **KB Behavior Chunks** - Not being created or stored
- **Spec Generator** - Falls back to generic templates when no behavior chunks exist

### Test Cases

**Test 1: ceps on itself (268 entities)**
- ❌ All entities show generic text
- ❌ Coverage gate: 0/268 documented
- ❌ Exit code 2 (gate failure)

**Test 2: Simple single-file script (keytester)**
- ❌ 0 exported entities (expected - it's a standalone script)
- ❌ Empty spec generated
- ℹ️ This is a separate limitation (see Bug #3)

**Test 3: Subdirectory only (src/scanner)**
- ❌ Generic text + diagnostic text leaking (see Bug #2)
- ❌ Validation errors

### Root Cause Hypothesis

1. **Reasoning Engine Not Running:**
   - The orchestrator may be skipping the reasoning phase
   - Or the reasoning phase runs but produces no output

2. **Behavior Chunk Creation Failing:**
   - Pattern matching not finding extractable behavior
   - Confidence scoring rejecting all behavior chunks
   - Integration between parser → reasoning → KB broken

3. **Test Coverage Gap:**
   - All 935 tests pass, but none validate end-to-end behavior extraction on real code
   - Tests may use mocked/simplified fixtures that work, but real code doesn't

### Impact Assessment

**Blocks:**
- ✅ Structural documentation (signatures, exports, types) works
- ❌ Behavioral documentation (what code does) completely broken
- ❌ Tool unusable for primary purpose
- ❌ Phase 6 cannot proceed without fixing this

**User Experience:**
- User runs ceps and gets specs with only signatures and "performs an operation"
- No value provided over reading the TypeScript signatures directly
- Underwhelming and unusable output

---

## Bug #2: Diagnostic Text Leaking into Final Specs

### Severity: 🔴 CRITICAL

### Description

When validation fails and template fallback occurs, internal diagnostic text like `NEEDS_QUESTION` and error messages leak into the final markdown specs instead of being handled gracefully.

### Reproduction Steps

```bash
# Run on a subdirectory (limited context triggers validation failures)
cd /media/iambrandonn/Files/ceps
npx tsx dist/orchestrator/index.js src/scanner --deterministic --llm off

# Check generated spec
cat src/scanner/spec.md
```

**Actual output (lines 7-9):**
```markdown
## ignore-rules.ts

NEEDS_QUESTION

The provided fact only indicates that entity Vc8OG8NrKu has a classification property set to true, but does not provide sufficient information about what class it belongs to, what behavior it exhibits, or any relations to other entities. Additional facts are needed to describe any meaningful behavior.
```

**And later (lines 49-51):**
```markdown
## scanner.ts

```
LfrRKHlK1h is a class.
```
```

### Evidence

See `/media/iambrandonn/Files/ceps/src/scanner/spec.md` (generated Nov 6 19:32)

### Root Cause

**LLM Gateway Template Fallback:**

In `src/llm/gateway.ts:249, 260, 272`, the prompt includes:
```typescript
"If missing critical info: emit NEEDS_QUESTION."
```

When running in `--llm off` mode, the template fallback logic appears to:
1. Detect insufficient facts for behavior extraction
2. Emit `NEEDS_QUESTION` literally (without LLM to process it)
3. Include raw diagnostic text from internal reasoning
4. Output this directly to specs instead of generating a proper Open Question

**Expected behavior:**
- Template fallback should either:
  - Generate a proper Open Question with QID, or
  - Omit the section entirely, or
  - Use clean placeholder text

**Actual behavior:**
- Raw diagnostic strings leak into final output
- Looks unprofessional and broken

### Affected Components

- **LLM Gateway** (`src/llm/gateway.ts`) - Template fallback not sanitizing output
- **Spec Generator** - Not catching/filtering diagnostic text
- **Markdown Renderer** - Outputs raw text without validation

### Impact Assessment

**Severity:**
- Makes tool look broken and unprofessional
- User-facing output contains internal debug strings
- Cannot ship to production in this state

---

## Bug #3: Standalone Scripts Not Documented (Design Limitation)

### Severity: 🟡 MEDIUM (Design Limitation, Not a Bug)

### Description

ceps does not document standalone scripts that have no exports. When run on a script like `test-claude-key.js` (CLI tool with no `module.exports`), the spec shows:

```markdown
## System Overview

This project contains 0 exported entities.
```

No documentation is generated for the script's behavior, CLI arguments, or top-level logic.

### Is This a Bug?

**No, this is by design:**
- ceps is designed to document **public APIs** (exported functions/classes)
- Standalone scripts have no public API surface
- This is a known limitation, not a bug

**However, it should be clearly documented:**
- README should state: "ceps documents exported APIs, not standalone scripts"
- User docs should explain scope and limitations
- Consider adding support for standalone scripts in Phase 6 as an enhancement

### Reproduction

```bash
cd /home/iambrandonn/shared-files/keytester
npx tsx /media/iambrandonn/Files/ceps/dist/orchestrator/index.js . --deterministic --llm off
cat spec.md
```

**Output:**
```markdown
# keytester — Specification

## System Overview

This project contains 0 exported entities.
```

### Recommendation

**Short-term (Phase 5.5):**
- Document this limitation in README.md
- Add to CLI help text: "Note: ceps documents exported APIs. Standalone scripts without exports will not be documented."

**Long-term (Phase 6+):**
- Enhance to detect standalone scripts (no exports)
- Document entry point, CLI args, top-level behavior
- This would be a new feature, not a bug fix

---

## Bug #4: Running on Subdirectories Fails

### Severity: 🟡 MEDIUM

### Description

When running ceps on a subdirectory (e.g., `src/scanner`) instead of the full project root, validation failures occur due to missing context (imports from other directories, type definitions, etc.).

This triggers both:
- Generic placeholder text (Bug #1)
- Diagnostic text leaking (Bug #2)

### Expected Behavior

**Option A:** Detect subdirectory run and warn user:
```
⚠ Warning: Running on subdirectory src/scanner
  Cross-directory imports may not resolve correctly.
  For best results, run on full project root.
```

**Option B:** Support subdirectory runs with degraded mode:
```
ℹ Subdirectory mode: Limited context available
  Documentation may be incomplete for cross-directory references.
```

### Actual Behavior

- Runs without warning
- Produces broken output with diagnostic text
- Coverage gate fails
- No indication to user that subdirectory mode is unsupported

### Recommendation

Add validation at orchestrator start:
```typescript
if (isSubdirectoryOfLargerProject(projectRoot)) {
  logger.warn('Running on subdirectory - results may be incomplete');
  logger.warn('For best results, run on full project root');
}
```

---

## Investigation Plan

### Phase -1: Reproduce and Diagnose (1-2 hours)

**Goal:** Understand exactly where behavior extraction breaks

**Steps:**

1. **Enable debug logging:**
   ```bash
   DEBUG=ceps:reasoning,ceps:kb npx tsx dist/orchestrator/index.js . --deterministic --llm off
   ```

2. **Check if reasoning phase runs:**
   - Add console.log in `src/reasoning/reasoning-engine.ts`
   - Verify `liftBehavior()` is being called
   - Check if behavior chunks are created

3. **Inspect KB state after reasoning:**
   - Force KB serialization after reasoning phase
   - Check if chunks array is empty
   - Examine entity facts - are they meaningful?

4. **Test on tiny-react fixture:**
   ```bash
   cd tests/fixtures/phase5/baseline/tiny-react
   npx tsx ../../../../dist/orchestrator/index.js . --deterministic --llm off
   ```
   - tiny-react has only 6 entities (vs 268 for ceps)
   - Should be easier to debug
   - Check if behavior is extracted for Button/Card components

5. **Compare with Phase 2 smoke tests:**
   - Review `tests/integration/orchestrator.test.ts`
   - Check what level of behavior extraction they validate
   - Determine if tests have false positives (passing without real behavior)

### Phase 0: Identify Root Cause (2-4 hours)

**Hypotheses to test:**

**Hypothesis 1: Reasoning Engine Not Running**
- Check orchestrator flow - is `runReasoning()` being called?
- Verify reasoning phase isn't silently failing
- Confirm pattern matching is attempting to extract behavior

**Hypothesis 2: Pattern Matching Failures**
- Express/React patterns may not apply to ceps' TypeScript patterns
- No generic TypeScript pattern matchers implemented?
- Review `src/reasoning/patterns/` - what patterns exist?

**Hypothesis 3: Confidence Scoring Too Strict**
- All behavior chunks rejected as low confidence?
- Check confidence thresholds
- Review if chunks are created but not used

**Hypothesis 4: KB Integration Broken**
- Behavior chunks created but not stored in KB?
- Chunks created but not linked to entities?
- Spec generator not reading chunks from KB?

**Hypothesis 5: Test Coverage Gap**
- Integration tests use mocked/simple fixtures
- Tests don't validate actual behavior extraction
- Gap between unit tests (passing) and real usage (broken)

### Phase 1: Fix Critical Path (4-8 hours)

**Priority 1: Get basic behavior extraction working**

1. Fix reasoning engine to extract simple behaviors:
   - Function return values
   - Method side effects
   - Error conditions
   - Parameter validation

2. Fix template fallback to not leak diagnostic text:
   - Sanitize `NEEDS_QUESTION` and diagnostic strings
   - Generate proper Open Questions or clean placeholders
   - Never output raw internal state

3. Add end-to-end validation test:
   - Test on real code (not mocked)
   - Assert behavior text is meaningful (not generic)
   - Fail if only placeholder text generated

**Priority 2: Improve user experience**

1. Add subdirectory detection and warning
2. Document standalone script limitation
3. Improve error messages when behavior extraction fails

### Phase 2: Comprehensive Testing (2-4 hours)

1. **Create realistic test fixtures:**
   - Mini Express API with routes and middleware
   - Mini React component library
   - TypeScript utility library
   - Each should have extractable, verifiable behavior

2. **Add behavior extraction integration tests:**
   - Test that specific behaviors are documented
   - Test that generic placeholders are NOT present
   - Test coverage gate actually catches missing behavior

3. **Regression testing:**
   - Run on ceps itself - verify 268 entities get meaningful docs
   - Run on all Phase 5 fixtures
   - Run on keytester (expect 0 entities, document limitation)

---

## Success Criteria

### Minimum Viable Fix

- ✅ Run ceps on `tests/fixtures/tiny-react` and get meaningful behavior for Button/Card
- ✅ No `NEEDS_QUESTION` or diagnostic text in final specs
- ✅ Coverage gate shows >0% documented (not 0/6)
- ✅ KB state persisted with behavior chunks
- ✅ Exit code 0 (success)

### Complete Fix

- ✅ Run ceps on itself (268 entities) and get meaningful behavior for ≥50% of entities
- ✅ Coverage gate shows ≥50% documented
- ✅ No diagnostic text leaking anywhere
- ✅ Subdirectory runs show warning message
- ✅ Standalone script limitation documented in README
- ✅ Integration tests validate actual behavior extraction
- ✅ All existing 935 tests still pass

---

## Priority Assessment

**Must Fix Before Phase 6:**
1. 🔴 Bug #1: Behavior extraction (CRITICAL - core functionality)
2. 🔴 Bug #2: Diagnostic text leaking (CRITICAL - user-facing quality)

**Should Fix Before Phase 6:**
3. 🟡 Bug #4: Subdirectory handling (MEDIUM - user experience)

**Can Document and Defer:**
4. 🟡 Bug #3: Standalone scripts (MEDIUM - design limitation, not bug)

---

## Estimated Effort

**Investigation:** 3-6 hours
**Fixes:** 6-12 hours
**Testing:** 2-4 hours
**Documentation:** 1-2 hours

**Total:** 12-24 hours (1.5-3 days)

---

## References

### Generated Files (Evidence)

- `/media/iambrandonn/Files/ceps/src/scanner/spec.md` - Shows diagnostic text leaking (Bug #2)
- `/media/iambrandonn/Files/ceps/src/kb/spec.md` - Shows generic placeholder text (Bug #1)
- `/home/iambrandonn/shared-files/keytester/spec.md` - Shows 0 entities (Bug #3)

### Relevant Code

- `src/reasoning/reasoning-engine.ts` - Behavior extraction logic
- `src/llm/gateway.ts:249, 260, 272` - Template fallback with `NEEDS_QUESTION`
- `src/orchestrator/orchestrator.ts` - Pipeline flow
- `src/orchestrator/gates/` - Coverage gate implementation
- `src/generator/spec-generator.ts` - Template rendering

### Test Files

- `tests/integration/orchestrator.test.ts` - End-to-end smoke tests (may have false positives)
- `tests/fixtures/tiny-react/` - Small fixture for debugging

### Documentation

- `CTS-06_Reasoning_and_Ambiguity_Resolver.md` - Reasoning engine spec
- `CTS-03_Spec_Generator.md` - Spec generator spec
- `SADS.md` - Overall architecture

---

## Recommendation

**Pause Phase 6 and fix critical bugs first.**

Phase 5 delivered a complete finalization engine, but manual testing reveals the **core behavior extraction doesn't work**. All 935 tests pass, but this is a **test coverage gap** - the tests don't validate that meaningful behavior is extracted from real code.

Proceeding to Phase 6 (framework patterns, performance, docs) without fixing this would be building on a broken foundation. Users would get structural documentation (signatures) but no behavioral documentation (what code does).

**Proposed approach:**
1. Create **Phase 5.5: Critical Bug Fixes** milestone
2. Fix Bugs #1 and #2 (behavior extraction + diagnostic leaks)
3. Add integration tests that validate real behavior extraction
4. Document Bug #3 (standalone scripts) as a limitation
5. Re-validate Phase 5 deliverables with fixed behavior extraction
6. **Then** proceed to Phase 6

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Author:** Claude Code (based on manual testing session with user)
