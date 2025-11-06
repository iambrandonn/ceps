# Phase 5 Baseline Fixtures

## Overview
Baseline outputs captured during Step 0 provide “before finalize” artefacts that later steps will diff against when validating the Finalization Engine.

## tiny-react
- **Source:** `tests/fixtures/tiny-react`
- **Baseline assets:**
  - `spec.md` — root specification generated with `--llm off --deterministic`
  - `src/spec.md`, `src/hooks/spec.md`, `src/utils/spec.md` — per-directory specs
  - `qids.json` — inventory of unresolved QIDs (one Low-confidence React `render` method)
  - `impact.report.json` — deterministic impact scope produced by `computeImpactReport` (default caps). Seeds, impacted entity IDs, and diagnostics are used as a golden reference for Step 3 unit tests.
  - `.ceps/snapshot.json` — deterministic snapshot used by Step 1 integration tests
  - `answers.md` — sample finalization answers exercising single- and multi-line entries
  - `answers.parse.json` — golden parser output for Step 2 tests
  - `answers.report.json` — golden ingestion report for Step 2 tests
- **Generation notes:**
  - Specs are rendered via `SpecGenerator` with deterministic mode enabled; class factSets now ensure the Phase 3 orchestrator produces chunks so the coverage gate passes once reasoning is executed.
  - Root spec omits the timestamp when deterministic mode is active to keep fixtures stable.
  - `.ceps/snapshot.json` includes hashes for all five baseline files (answers/impact/qids) and should be regenerated via the snapshot capture utility whenever fixture content changes.
- **Intended use:** Step 5 integration tests will copy this directory, apply `answers.md`, and verify that only the scoped sections change and that `q:GR0v81JJWV` disappears.
