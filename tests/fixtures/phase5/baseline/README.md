# Phase 5 Baseline Fixtures

## Overview
Baseline outputs captured during Step 0 provide “before finalize” artefacts that later steps will diff against when validating the Finalization Engine.

## tiny-react
- **Source:** `tests/fixtures/tiny-react`
- **Baseline assets:**
  - `spec.md` — root specification generated with `--llm off --deterministic`
- `src/spec.md`, `src/hooks/spec.md`, `src/utils/spec.md` — per-directory specs
- `qids.json` — inventory of unresolved QIDs (one Low-confidence React `render` method)
- `.ceps/snapshot.json` — deterministic snapshot used by Step 1 integration tests
- **Generation notes:**
  - Specs are rendered via `SpecGenerator` with deterministic mode enabled; class factSets now ensure the Phase 3 orchestrator produces chunks so the coverage gate passes once reasoning is executed.
  - Root spec omits the timestamp when deterministic mode is active to keep fixtures stable.
- **Intended use:** Step 5 integration tests will copy this directory, apply `answers.md`, and verify that only the scoped sections change and that `q:GR0v81JJWV` disappears.
