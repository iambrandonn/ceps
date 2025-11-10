# Quality Improvement Test Harness Setup

**Date:** 2025-11-09
**Status:** Ready for development iterations

---

## Summary

Established a test-driven workflow for improving ceps spec generation quality using a real-world backend codebase as a baseline.

**Test Fixture:** `output-test/research-coi` (Kuali COI backend - Express/Mongoose)

**Baseline Quality:**
- High: 31 (7%)
- Medium: 177 (40%)
- Low: 235 (53%)

**Identified Issues:**
1. 209 constants marked "intent unclear" (highest priority)
2. 70 functions marked "intent unclear"
3. 28 generic array operation descriptions

**Target Quality (after improvements):**
- High: 280+ (63%)
- Low: <25 (5%)

---

## What Was Created

### 1. Baseline Analysis
`output-test/research-coi/BASELINE_QUALITY_REPORT.md`
- Detailed breakdown of quality issues
- Categorized problem patterns
- Improvement targets with ROI estimates

### 2. Progress Tracking Script
`output-test/research-coi/check-quality.sh`
- Quick quality metrics check
- Problem pattern counts
- Progress towards targets
- Test case validation

### 3. Development Workflow
`docs/process/quality-improvement-workflow.md`
- Step-by-step TDD process
- How to test improvements against real code
- Acceptance criteria
- Rollback procedures

### 4. Fixture Documentation
`output-test/research-coi/README.md`
- Quick start guide
- Key test cases
- Integration instructions

### 5. AGENTS.md Updates
Added "Quality Improvement Workflow" section with baseline metrics and process overview.

---

## How to Use

### Quick Progress Check

```bash
cd output-test/research-coi
./check-quality.sh
```

### After Making Changes

```bash
# Build ceps
npm run build

# Re-run on fixture
cd output-test/research-coi
rm -rf .ceps/ spec.md src/*/spec.md
../../bin/ceps.js . --llm off

# Check progress
./check-quality.sh
```

### Development Cycle (TDD)

1. Write failing unit test for new pattern
2. Implement pattern with 80%+ coverage
3. Re-run on research-coi fixture
4. Validate with check-quality.sh
5. Spot-check 2-3 sample entities
6. Commit if improvement confirmed

**See:** `docs/process/quality-improvement-workflow.md` for details

---

## Improvement Roadmap

### Target #1: Inline Constants (1-2 days)
**Impact:** 209 Low → High (+47% coverage)
- Extract initializer values from KB facts
- Generate descriptive prose for enums/config objects
- Set confidence to High for inline-able constants

**Test case:** `DISCLOSURE_STATUS` constant
**Validation:** `check-quality.sh` shows 0 "intent unclear" constants

---

### Target #2: Semantic Function Descriptions (2-3 days)
**Impact:** 28-42 Medium/Low → High (+7-9% coverage)
- Use function name + parameter names for context
- Replace "Filters array" with "Filters comment records..."
- Add domain hints based on variable names

**Test case:** `filterComments` function
**Validation:** Generic array descriptions <10

---

### Target #3: Factory Pattern Detection (1 day)
**Impact:** 5-8 Low → High (+1-2% coverage)
- Detect conditional returns based on environment
- Recognize factory patterns (if/else returning different implementations)
- Generate "Factory that returns X or Y based on Z"

**Test case:** `buildCache` function
**Validation:** `check-quality.sh` shows buildCache confidence = High

---

## Success Metrics

**Overall:**
- High confidence: 31 → 280+ (7% → 63%)
- Low confidence: 235 → <25 (53% → <5%)

**Per Target:**
- Target #1: 209 entities improved
- Target #2: 32 entities improved
- Target #3: 8 entities improved
- **Total:** ~250 entities improved

**Timeline:** 1 week for all three targets

---

## Next Steps

1. Start with **Target #1 (Inline Constants)** - highest ROI
2. Follow TDD workflow in `docs/process/quality-improvement-workflow.md`
3. Use `check-quality.sh` to validate progress after each change
4. Commit when target fully achieved (0 remaining issues)

---

## Files to Track

**Do track in git:**
- `output-test/research-coi/README.md`
- `output-test/research-coi/BASELINE_QUALITY_REPORT.md`
- `output-test/research-coi/check-quality.sh`
- Source code (JavaScript files in fixture)

**Do NOT track:**
- `output-test/research-coi/.ceps/` (regenerated on each run)
- `output-test/research-coi/spec.md` (generated output)
- `output-test/research-coi/src/*/spec.md` (generated output)

---

## Notes

- Fixture is a **snapshot** of production code (safe to analyze)
- Use `--llm off` during development for deterministic results
- Test with `--llm on` before considering improvements complete
- This workflow replaces ad-hoc testing on toy examples
- Can add more fixtures as needed for coverage validation

---

## References

- **Main workflow:** `docs/process/quality-improvement-workflow.md`
- **Baseline analysis:** `output-test/research-coi/BASELINE_QUALITY_REPORT.md`
- **Quality analysis:** `docs/internal/analysis/research-coi-spec-quality-analysis.md`
- **Project overview:** `AGENTS.md` (Quality Improvement Workflow section)
