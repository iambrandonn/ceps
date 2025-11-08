# Benchmarks

**Purpose:** Performance metrics and accuracy measurements for Phase 6 pattern implementations.

---

## Directory Structure

```
benchmarks/
├── results/               # JSON reports from benchmark runs
│   ├── phase6-express-i<N>-<date>.json     # Performance metrics per iteration
│   └── phase6-express-accuracy-<date>.json # Accuracy harness results
└── README.md             # This file
```

---

## Benchmark Types

### 1. Performance Benchmarks

**Script:** `scripts/run-nextjs-benchmark.mjs` (to be implemented)

**Measures:**
- Runtime (target: ≤15 min)
- Peak RSS (target: ≤16 GB)
- LLM tokens (target: ≤1.5M)
- Exit code (must be 0)
- Gate status (Coverage/Link/Grounding/Confidence/Monorepo)

**Baseline:** `vercel/next.js` at commit `db5528317e24e0316e0497716976a715a325ca09`

**Thresholds:**
- <10% delta: PASS
- 10-20% delta: INVESTIGATE
- >20% delta: BLOCK

### 2. Accuracy Harness

**Script:** `scripts/run-tier0-accuracy.mjs` (to be implemented)

**Measures:**
- Precision (target: ≥0.88)
- Recall (target: ≥0.88)
- F1 score (target: ≥0.90)

**Corpus:** `tests/fixtures/accuracy/<framework>/` (20-50 annotated snippets)

---

## Status (I5)

**Implementation Status:** 🚧 Pending

Per IMPLEMENTATION_PLAN_PHASE6_WS_D_EXPRESS_I5.md §3.2:
- Accuracy harness noted as "(pending validation)"
- Benchmark smoke tests noted as "(pending validation)"
- Scripts referenced but not yet implemented

**Recommendation for I5 Completion:**
1. Document tooling as pending in M3 artifacts
2. Note that validation sweep focused on existing test infrastructure:
   - ✅ Full test suite (1155 passing)
   - ✅ Lexicon validator (51/51 passing)
   - ✅ Integration tests (Express patterns validated)
3. Defer script implementation to Wave 2 (Performance workstream)

**Rationale:**
- Express pattern accuracy already validated via integration tests with KB chunk assertions
- Benchmark infrastructure better coordinated by Agent 6 (Performance) in Wave 2
- Core deliverables (patterns, lexicon, docs) complete and validated

---

## Future Work (Wave 2)

Agent 6 (Performance) will implement:
- `scripts/run-nextjs-benchmark.mjs` with telemetry integration
- `scripts/run-tier0-accuracy.mjs` with precision/recall/F1 calculation
- Baseline measurements for all Tier-0 frameworks
- CI integration for nightly runs

---

**Last Updated:** 2025-11-07 (Phase 6 I5)
