# Quality Improvement Workflow

**Purpose:** Test-driven workflow for improving ceps spec generation quality using real-world baseline

**Test Fixture:** `output-test/research-coi` (Kuali COI backend application)

---

## Setup (One-Time)

The baseline has already been captured. Files in place:

```
output-test/research-coi/
├── .ceps/
│   ├── kb-state.json          # Current analysis state
│   └── snapshot.json           # Codebase snapshot
├── BASELINE_QUALITY_REPORT.md  # Detailed baseline analysis
├── check-quality.sh            # Quick progress checker
└── spec.md + subdirs           # Generated specs
```

**Baseline metrics:**
- High: 31 (7%)
- Medium: 177 (40%)
- Low: 235 (53%)
- Problem areas: 209 "intent unclear" constants, 70 "intent unclear" functions, 28 generic array descriptions

---

## Development Workflow

### Step 1: Identify Target Issue

Review `BASELINE_QUALITY_REPORT.md` for improvement targets:

1. **Target #1:** Inline constant values (209 entities, highest ROI)
2. **Target #2:** Semantic function descriptions (28-42 entities)
3. **Target #3:** Factory pattern detection (5-8 entities)

Choose one target per development iteration.

---

### Step 2: Write Tests (TDD)

**Location:** `tests/unit/reasoning/` or `tests/integration/`

**Example for Target #1 (Constants):**

```typescript
// tests/unit/reasoning/constant-inline.test.ts
describe('Constant value inlining', () => {
  it('should inline simple enum object', async () => {
    const code = `
      export const STATUS = {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3
      };
    `;

    const kb = await parseAndReason(code);
    const chunk = kb.getChunkForEntity('STATUS');

    expect(chunk.confidence).toBe('High');
    expect(chunk.textDraft).toContain('PENDING (1)');
    expect(chunk.textDraft).toContain('APPROVED (2)');
    expect(chunk.textDraft).toContain('REJECTED (3)');
    expect(chunk.textDraft).not.toContain('intent unclear');
  });

  it('should inline string enum', async () => {
    const code = `
      export const ROLES = {
        ADMIN: 'admin',
        USER: 'user'
      };
    `;

    const kb = await parseAndReason(code);
    const chunk = kb.getChunkForEntity('ROLES');

    expect(chunk.confidence).toBe('High');
    expect(chunk.textDraft).toContain('ADMIN ("admin")');
    expect(chunk.textDraft).not.toContain('intent unclear');
  });
});
```

**Run tests (should FAIL initially):**
```bash
npm test -- constant-inline.test.ts
```

---

### Step 3: Implement Solution

**Example locations:**
- **Parser facts:** `src/parser/fact-extractor.ts` (if extracting new facts)
- **Reasoning patterns:** `src/reasoning/patterns/shared/constant-inliner.ts` (new pattern)
- **Reasoning engine:** `src/reasoning/reasoning-engine.ts` (wire up new pattern)

**Implementation approach for constants:**

1. Create pattern matcher that detects exported object literals
2. Extract key-value pairs from initializer facts
3. Generate descriptive prose based on value types:
   - Numeric values → "enumeration"
   - String values → "string constants mapping"
   - Mixed → "configuration object"
4. Set confidence to High when all values are literals

---

### Step 4: Verify Unit Tests Pass

```bash
npm test -- constant-inline.test.ts
```

All tests should pass (Green phase of TDD).

---

### Step 5: Test on Real Codebase

**Re-run ceps on test fixture:**

```bash
cd /media/iambrandonn/Files/ceps
npm run build  # or npm run dev if using tsx

cd output-test/research-coi
rm -rf .ceps/ spec.md src/spec.md src/server/spec.md  # Clean previous run
../../bin/ceps.js . --llm off  # Run with your changes
```

**Check progress:**
```bash
./check-quality.sh
```

**Expected output after Target #1 completion:**
```
=== Spec Quality Report ===

Confidence Distribution:
  High:   240 (54.2%)    # Was 31 (7%)
  Medium: 177 (40.0%)    # Unchanged
  Low:    26 (5.9%)      # Was 235 (53%)

Problem Patterns:
  Constants 'intent unclear': 0      # Was 209 ✅
  Functions 'intent unclear': 70     # Unchanged
  Generic array descriptions: 28     # Unchanged

Test Cases:
  buildCache confidence: Medium                # Unchanged
  DISCLOSURE_STATUS confidence: High           # Was Low ✅

Progress Towards Targets:
  Target #1 (Constants): 0 remaining (target: 0)  ✅
  Target #2 (Generic arrays): 28 remaining (target: <10)
  Target #3 (buildCache): Medium (target: High)

Overall Progress:
  High confidence target: 280 (63%)
  🟡 High confidence CLOSE: 240
```

---

### Step 6: Manual Spot-Check

**Check specific entities improved:**

```bash
# Check DISCLOSURE_STATUS constant
jq -r '.entities[] | select(.name == "DISCLOSURE_STATUS") | .id' .ceps/kb-state.json | \
  xargs -I {} jq -r '.chunks[] | select(.targetEntityId == "{}") | .textDraft' .ceps/kb-state.json
```

**Expected output:**
```
Enumeration of disclosure lifecycle states: IN_PROGRESS (1), SUBMITTED_FOR_APPROVAL (2), UP_TO_DATE (3), REVISION_REQUIRED (4), EXPIRED (5), RESUBMITTED (6), UPDATE_REQUIRED (7), RETURNED (8), ARCHIVED (9).
```

**Check generated spec.md:**
```bash
grep -A 5 "DISCLOSURE_STATUS" src/spec.md
```

Should show meaningful description, not "intent unclear."

---

### Step 7: Commit Changes

Once satisfied with improvements:

```bash
git add tests/unit/reasoning/constant-inline.test.ts
git add src/reasoning/patterns/shared/constant-inliner.ts
git add src/reasoning/reasoning-engine.ts
git commit -m "feat(reasoning): inline constant values to eliminate 'intent unclear'

- Add constant-inliner pattern for exported object literals
- Extract enum values from initializer facts
- Generate descriptive prose based on value types
- Test coverage: 95%
- Impact on research-coi: 209 Low → High (+47% coverage)

Closes #XXX"
```

**Update baseline if this is final for the target:**
```bash
cd output-test/research-coi
cp .ceps/kb-state.json .ceps/kb-state-after-target1.json
```

---

## Iteration Cycle

Repeat Steps 1-7 for each target:

**Iteration 1 (Target #1):** Inline constants → +209 High confidence
**Iteration 2 (Target #2):** Semantic function names → +32 High confidence
**Iteration 3 (Target #3):** Factory patterns → +8 High confidence

**Expected final metrics:**
- High: 280+ (63%+)
- Medium: 140 (32%)
- Low: <23 (<5%)

---

## Progress Tracking

### Quick Check (After Every Change)

```bash
cd output-test/research-coi
./check-quality.sh
```

### Detailed Diff (Before/After Comparison)

```bash
# After baseline
cp .ceps/kb-state.json .ceps/kb-state-BASELINE.json

# After improvements
jq '.chunks | map({id, conf: .confidence, text: .textDraft})' .ceps/kb-state-BASELINE.json > /tmp/before.json
jq '.chunks | map({id, conf: .confidence, text: .textDraft})' .ceps/kb-state.json > /tmp/after.json
diff -u /tmp/before.json /tmp/after.json | grep "^[+-]" | head -50
```

### Full Validation Suite

```bash
# Run all tests
npm test

# Run integration tests with research-coi
npm test -- --run tests/integration/research-coi-baseline.test.ts
```

---

## Acceptance Criteria

Each improvement iteration must meet:

1. ✅ **Unit tests pass** (80%+ coverage for new code)
2. ✅ **Progress on metrics** (check-quality.sh shows improvement)
3. ✅ **No regressions** (existing High-confidence entities remain High)
4. ✅ **Manual spot-check** (2-3 sample entities show good output)
5. ✅ **Integration tests pass** (full test suite green)

---

## Rollback Procedure

If an improvement causes regressions:

```bash
# Revert changes
git revert <commit-hash>

# Or discard uncommitted work
git checkout -- src/reasoning/

# Re-run to confirm baseline restored
cd output-test/research-coi
rm -rf .ceps/ spec.md src/*/spec.md
../../bin/ceps.js . --llm off
./check-quality.sh
```

---

## Adding New Test Fixtures

If research-coi becomes insufficient, add more:

```bash
# Create new fixture
mkdir -p output-test/another-codebase
cd output-test/another-codebase

# Run baseline
../../bin/ceps.js . --llm off

# Create baseline report
cp ../../research-coi/check-quality.sh .
./check-quality.sh > BASELINE_QUALITY_REPORT.txt
```

Update workflow to test against multiple fixtures.

---

## Notes

- **LLM off during development:** Use `--llm off` for deterministic testing
- **LLM on for final validation:** Test with `--llm on` before considering complete
- **Coverage target:** Aim for 60%+ High confidence on diverse backend codebases
- **Real-world validation:** Test on user's actual codebases before claiming success

---

## Quick Reference Commands

```bash
# Build ceps
npm run build

# Run on test fixture (LLM off for speed)
cd output-test/research-coi && ../../bin/ceps.js . --llm off

# Check progress
cd output-test/research-coi && ./check-quality.sh

# Run unit tests
npm test -- <test-file-pattern>

# Run full test suite
npm test

# Check specific entity
cd output-test/research-coi
jq -r '.entities[] | select(.name == "YOUR_ENTITY") | .id' .ceps/kb-state.json | \
  xargs -I {} jq -r '.chunks[] | select(.targetEntityId == "{}") | .textDraft' .ceps/kb-state.json
```
