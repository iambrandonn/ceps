# Phase 6 — WS‑D Express Iteration I5 Plan (Polish & Integration)
**Owner:** Agent 1 (Express)  
**Date:** 2025‑11‑07  
**Status:** Ready for execution  
**Context:** Iteration I4 (Mongoose) is merged with all blocking issues resolved (`FEEDBACK_I4_MONGOOSE_FIXES_COMPLETE.md`). I5 is the final pass to harden artifacts, finish documentation, and ensure every Phase 6 gate is green before handing the baton to the next Tier‑0 agents.

---

## 1. Goals
1. **Documentation & UX completeness:** Coverage matrix, release notes, lexicon approval log, and internal API docs reflect all Express/Mongoose capabilities and limitations.  
2. **Validation sweep:** Accuracy harness, confidence calibration, golden regressions, lexicon validator, finalization, and benchmark smoke all run from scratch with 100 % pass/accept rates.  
3. **Runbook & lessons:** Summarize changes, pitfalls, and scripts in `PHASE6_EXPRESS_LESSONS.md` so React/Redux/GraphQL/HTTP agents can reuse tooling/process.  
4. **Decision log & approvals:** Record final metrics, update DECISIONS.md (hardware baseline verification, accuracy F1, benchmark results), and obtain architect + product sign-off.

---

## 2. Inputs & Constraints
- Lessons learned (§10) from `FEEDBACK_I4_MONGOOSE_FIXES_COMPLETE.md`, specifically:  
  - Run the **full** test suite (`npm test`) before claiming completion.  
  - Cross-workstream DoD (lexicon validator tests, golden regressions) is mandatory.  
  - Word-boundary anti-pattern logic must stay validated with regression tests.  
- All I4 code merged on `main` (commit TBD) with green CI.  
- Pinned benchmark repo (`../next.js`, commit `db5528317e24e0316e0497716976a715a325ca09`).  
- Architect availability for reviews within 24 h SLA.

---

## 3. Work Breakdown
### 3.1 Docs & Communication (Day 9 AM)
1. **Coverage matrix:** Update `docs/pattern-coverage.md` row with final Express/Mongoose behaviors, confidence bands, gaps, and auxiliary dependencies.  
2. **Release notes:** Add bullet to Phase 6 section summarizing Express/Mongoose support, lexicon fixes, and user-facing impact.  
3. **Lexicon approval table:** Insert I5 row (date, reviewer, term/anti-pattern counts).  
4. **Mongoose facts API doc:** Final pass ensuring Agent 4 feedback from Day 7 is addressed; flag “ready for consumption”.  
5. **Lessons doc:** Create/finish `docs/internal/PHASE6_EXPRESS_LESSONS.md` covering: Phase ‑1 analysis template, fixture strategy, accuracy harness workflow, lexicon testing checklist, benchmarking tips.  
6. **Decision log:** Add entries for (a) accuracy F1 ≥0.90, (b) benchmark metrics, (c) gate status, (d) approvals.  
7. **Grounding validator verification:** Confirm `tests/llm-gateway/grounding-validator.test.ts` includes all Express + Mongoose terminology (route, middleware, handler, mount, status code, schema, model, hook, reference, query, validator) and adversarial cases (e.g., “servlet”, “controller”, “SQL JOIN”). If any gaps remain, add tests before the validation sweep.

### 3.2 Validation Sweep (Day 9 PM)
Follow lessons-learned sequencing to avoid misses:
1. **Accuracy harness (frozen corpus):**
   ```bash
   npm run scripts/run-tier0-accuracy.mjs -- express
   ```
   - Verify F1 ≥0.90, precision ≥0.88, recall ≥0.88.  
   - Commit JSON report under `benchmarks/results/phase6-express-i5-<date>.json`.
2. **Confidence calibration:** Run targeted suite; ensure deltas within ±5.  
3. **Golden regressions:** Re-run the Express golden snapshot suite:
   ```bash
   npm test -- --run tests/integration/snapshot-capture.test.ts --grep tiny-express
   ```
   or the dedicated spec test if present (`tests/integration/express-golden-spec.test.ts`). Require 100 % accept rate for all generated prose (no template drift).  
4. **Lexicon validator:** Run `npm test -- src/validation/__tests__/lexicon-validator.test.ts` ensuring new word-boundary logic stays green (51/51).  
5. **Full test suite:** `npm test` (all 1155+) to confirm no regressions beyond targeted suites.  
6. **Finalization scenario:** Generate QID scenario, run `ceps finalize --answers answers.md --llm off`, assert QID removal and Finalization Summary.  
7. **Benchmark smoke:** Run `scripts/run-nextjs-benchmark.mjs --llm off --focus public-api` and the full variant (default scope). Compare results against the **post-I4 baseline** stored in `benchmarks/results/phase6-express-i4-<date>.json` (commit `<I4 merge hash>`). Thresholds: <10 % delta → PASS, 10‑20 % → investigate before merge, >20 % → block until optimized. Upload new metrics to `benchmarks/results/phase6-express-i5-<date>.json` and note deltas in the lessons doc + decision log.

### 3.3 Governance & Approvals (Day 10)
1. **Gate report:** Collate Coverage/Link/Grounding/Confidence/Monorepo gate status from last run; screenshot/log attached to PR.  
2. **M3 prep artifacts (Express contribution):** Prepare Express-specific snippets for Agent 6’s master §8.1 package—accuracy table (precision/recall/F1 + corpus size), benchmark delta table (runtime/RSS/tokens vs I4 baseline), gate status summary (Coverage/Link/Grounding/Confidence), list of open issues (expected: none), and link to `PHASE6_EXPRESS_LESSONS.md`. Deliver via `#ceps-phase6` so Agent 6 can assemble the combined Tier‑0 document.  
3. **Reviews:**  
   - Architect review: coverage matrix, lessons doc, accuracy/benchmark reports.  
   - Product review: release notes + user-facing impact summary.  
4. **PR merge:** Once approvals in place and CI green, merge final I5 PR.  
5. **Announcement:** Post wrap-up message in `#ceps-phase6` with metrics + lessons link; signal that React detailed plan can start.

---

## 4. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Full-suite test regression surfaces late | Delays handoff | Run `npm test` immediately after targeted suites; prioritize fixes over docs polish if failure occurs. |
| Benchmark variance >10 % | Blocks sign-off | Compare with earlier JSON; if regression detected, profile worker pools + KB chunk volume before merging. |
| Documentation review backlog | Slips schedule | Share drafts with Agent 7 early Day 9; escalate if SLA missed. |
| Lessons doc incomplete | Other agents repeat mistakes | Keep notes during validation; ensure doc at least covers 5 lessons from feedback file. |
| Approval bottleneck (architect/product unavailable) | Delays go/no-go | Confirm reviewer availability on Day 9 AM; if unavailable, Agent 6 provides interim approval per master plan SLA, records it in decision log, and secures final approval asynchronously. |

---

## 5. Exit Criteria
- [ ] Coverage matrix + release notes merged.  
- [ ] Lessons doc + decision log updated.  
- [ ] Accuracy harness, calibration, lexicon validator, golden regression, finalization, benchmark, and full test suite all green (evidence attached).  
- [ ] Gate report shows PASS for Coverage/Link/Grounding/Confidence; benchmark regression <10 %.  
- [ ] Architect & product approvals recorded.  
- [ ] Announcement + artifacts shared with remaining Tier‑0 agents.

Once all boxes are checked, Express workstream is complete and the next detailed plan (React I1) can be kicked off using the shared lessons and tooling.
