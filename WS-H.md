# Phase 4 WS-H: Orchestrator Gates & Run Summary — Agent Handoff Document

**Date:** 2025-11-05
**Workstream:** WS-H (Orchestrator Gates & Run Summary)
**Phase:** Phase 4 (Grounding & Polish)
**Status:** ✅ **COMPLETE** - All Stages A0-F Complete
**Reference:** `IMPLEMENTATION_PLAN_PHASE4_WS_H.md`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Context](#project-context)
3. [What's Been Completed](#whats-been-completed)
4. [What Remains (Your Work)](#what-remains-your-work)
5. [Detailed Implementation Guide](#detailed-implementation-guide)
6. [Testing Strategy](#testing-strategy)
7. [Integration Points](#integration-points)
8. [Acceptance Criteria](#acceptance-criteria)
9. [Reference Documents](#reference-documents)

---

## Quick Start

### Your Mission

Complete **Stage E (CLI Validation)** and **Stage F (Integration Tests)** for the Phase 4 orchestrator gates and run summary system.

### Time Estimate

2-3 hours for both stages combined.

### Current Test Status

```bash
npm test -- src/orchestrator/
# 79 tests passing, 0 failures
# Coverage: Complete for Stages A0-D
```

### What You'll Build

1. **Stage E:** CLI validation for Phase 4 LLM flags (`--llm-provider`, `--llm-model`, `--llm-budget`, `--no-llm-cache`)
2. **Stage F:** Integration tests verifying gate scenarios, exit codes, and run summary output

---

## Project Context

### What is ceps?

**ceps** (Codebase to Specification) is a one-time-use tool that reverse-engineers JavaScript/TypeScript codebases into human-readable Markdown specifications. Phase 4 adds LLM-assisted polish with grounding validation.

### Phase 4 Architecture

```
Scanner → Parser → KB → Reasoning → Generator (with LLM polish)
                                            ↓
                                      Grounding Validator
                                            ↓
                                    Orchestrator Gates → Run Summary
```

### WS-H Responsibilities

WS-H owns:
- **Gate evaluation**: Coverage, Link, Grounding, Determinism, Confidence, Monorepo (runtime gates → exit 2)
- **Cost & Adversarial gates**: Exit code 2 on failure (per Phase 4 acceptance criteria)
- **Test Coverage gate**: Exit code 1 on failure (test failure)
- **Readability gate**: Advisory only (exit code 0)
- **Run summary**: JSON + console output with gate results, token usage, warnings
- **Exit code enforcement**: Per SADS §6.3 (0=success, 1=test failure, 2=gate failure, 3=snapshot mismatch)
- **CLI validation**: Ensuring flag combinations are valid before pipeline starts

### Key Design Principles

1. **Runtime gates affect exit code** (exit 2 on failure)
2. **Cost & Adversarial gates also exit with code 2** (per Phase 4 acceptance criteria)
3. **Test Coverage gate exits with code 1** (test failure, highest priority)
3. **Deterministic output** when `--deterministic` flag supplied
4. **Schema-validated run summaries** (JSON Schema compliance)
5. **TDD-first development** (Red → Green → Refactor → Commit)

---

## What's Been Completed

### ✅ Stage A0: Schema Freeze

**Artifacts:**
- `src/orchestrator/types/run-summary.ts` — TypeScript interface with full type definitions
- `schemas/run-summary.schema.json` — JSON Schema for validation
- `src/orchestrator/__tests__/run-summary-schema.test.ts` — 10 passing tests

**Key Interface:**
```typescript
interface RunSummary {
  gates: RuntimeGates;        // Coverage, Link, Grounding, Determinism, Confidence, Monorepo
  validation: ValidationGates; // Cost, Adversarial, Test Coverage, Readability
  tokens: TokenMetrics;
  warnings: string[];
  exitCode: 0 | 1 | 2 | 3;
  timestamp: string;
  version: string;
}
```

### ✅ Stage A: Interface Alignment & Mocks

**Artifacts:**
- `src/orchestrator/types/gate-engine.ts` — Gate evaluator interfaces and input types
- `src/orchestrator/mocks/mock-gate-evaluators.ts` — Configurable mocks for testing
- `src/orchestrator/__tests__/gate-evaluators-contract.test.ts` — 25 passing tests

**Key Interfaces:**
```typescript
interface GateEvaluator<TInput, TResult> {
  evaluate(input: TInput): TResult;
}

interface GateInputs {
  coverage: CoverageGateInput;
  link: LinkGateInput;
  grounding: GroundingGateInput;
  // ... all runtime and validation gates
}
```

### ✅ Stage B: Runtime Gate Evaluators

**Artifacts:**
- `src/orchestrator/gates/runtime-gates.ts` — 6 production gate evaluators

**Implemented Gates:**
1. **CoverageGateEvaluator**: Ensures all exported entities documented or have QIDs
2. **LinkGateEvaluator**: Validates cross-file anchor references
3. **GroundingGateEvaluator**: Ensures chunks have factSetIds
4. **DeterminismGateEvaluator**: Validates identical output across reruns
5. **ConfidenceGateEvaluator**: Handles low-confidence → Open Questions
6. **MonorepoGateEvaluator**: Validates root spec and package links

### ✅ Stage B2: Validation Gate Evaluators

**Artifacts:**
- `src/orchestrator/gates/validation-gates.ts` — 4 validation gate evaluators

**Implemented Gates (per Phase 4 acceptance criteria):**
1. **CostGateEvaluator**: Token budget tracking (exit 2 on failure)
2. **AdversarialGateEvaluator**: Validator test suite verification (exit 2 on failure)
3. **TestCoverageGateEvaluator**: Branch coverage monitoring (exit 1 on failure)
4. **ReadabilityGateEvaluator**: Manual review scores (advisory only, exit 0)

### ✅ Stage C: Exit Code Policy

**Artifacts:**
- `src/orchestrator/gates/gate-registry.ts` — Orchestrates all gate evaluations

**Key Features:**
- `GateRegistry.evaluateAll()`: Evaluates all gates and produces run summary
- `GateRegistry.computeExitCode()`: Implements SADS §6.3 exit code semantics
- `GateRegistry.getFailedRuntimeGates()`: Returns failed gate names for error messages
- `GateRegistry.getFailedValidationGates()`: Returns failed validation gates for warnings

**Exit Code Logic:**
```typescript
// Exit code 0: All runtime gates pass or skip
// Exit code 2: Any runtime gate fails
// Exit code 1: Internal errors (handled by orchestrator)
// Exit code 3: Snapshot mismatch (Phase 5)
```

### ✅ Stage D: Run Summary Rendering

**Artifacts:**
- `src/orchestrator/rendering/run-summary-renderer.ts` — JSON and console renderers
- `src/orchestrator/__tests__/run-summary-renderer.test.ts` — 14 passing tests

**Key Functions:**
```typescript
renderJSON(summary: RunSummary, validateSchema?: boolean): string
renderConsole(summary: RunSummary): string
validateRunSummary(summary: RunSummary): boolean
emitRunSummary(summary: RunSummary, options?: {...}): void
```

**Console Output Example:**
```
═══════════════════════════════════════════════════════════
                    ceps Run Summary
═══════════════════════════════════════════════════════════

Runtime Gates (affect exit code):
─────────────────────────────────────────────────────────
  ✓ [PASS ] Coverage         45/45 documented, 0 QIDs
  ✓ [PASS ] Link             123 anchors, 0 broken
  ✓ [PASS ] Grounding        287 chunks (245 validated, 42 fallback)
  ○ [SKIP ] Determinism      not enabled
  ✓ [PASS ] Confidence       5 open questions
  ○ [SKIP ] Monorepo         not a monorepo

Validation Gates (Cost/Adversarial → exit 2, Test Coverage → exit 1, Readability → advisory):
────────────────────────────────────────────────────────────────────────────────────────────
  ✓ [PASS ] Cost             28450/30000 tokens (1550 remaining)
  ✓ [PASS ] Adversarial      23/23 rejected
  ✓ [PASS ] Test Coverage    85.3% (threshold: 80%)
  ○ [SKIP ] Readability      no review data

─────────────────────────────────────────────────────────
✓ Exit Code: 0 (Success)
═══════════════════════════════════════════════════════════
```

### Test Coverage Summary

**79 passing orchestrator tests:**
- `run-summary-schema.test.ts`: 10 tests
- `gate-evaluators-contract.test.ts`: 25 tests
- `gate-engine.test.ts`: 19 tests
- `run-summary-renderer.test.ts`: 14 tests
- `orchestrator.test.ts`: 11 tests (Phase 3 regression)

**No regressions:** All existing Phase 3 tests still passing.

---

## What Remains (Your Work)

### Stage E: CLI Validation

**Goal:** Add and validate Phase 4 LLM flags in the CLI parser.

**New Flags to Add:**
```bash
--llm-provider <openai|anthropic|azure|local>
--llm-model <name>
--llm-budget <tokens>
--no-llm-cache
```

**Validation Rules (Phase 4 §3.2):**

1. **`--llm-provider`:**
   - Must be one of: `anthropic`, `openai`, `azure`, `local`
   - Unsupported provider → descriptive error listing valid options
   - Default: `anthropic`

2. **`--llm-model`:**
   - Must be valid for selected provider
   - Provider-specific validation (e.g., OpenAI: `gpt-4`, `gpt-3.5-turbo`)
   - No default (uses provider default if not specified)

3. **`--llm-budget`:**
   - Must be positive integer (tokens)
   - Invalid/zero → error
   - When `--llm off` → warning "Budget ignored when --llm is off"

4. **`--no-llm-cache`:**
   - Only valid when `--llm on`
   - When `--llm off` → warning "Cache flag ignored when --llm is off"

5. **`--llm off` interactions:**
   - Warn if other LLM flags present (`--llm-provider`, `--llm-model`, `--llm-budget`, `--no-llm-cache`)
   - Ignore those flags (don't error)

**Files to Modify:**
- `src/orchestrator/cli.ts` — Add new flags to `CliArgs` interface and `parseArgs()`
- `src/orchestrator/cli.ts` — Enhance `validateArgs()` with new validation rules

**Testing Requirements:**
- ~10 CLI validation tests covering:
  - Valid flag combinations
  - Invalid provider (error)
  - Invalid budget (error)
  - `--llm off` + other flags (warnings)
  - `--no-llm-cache` with `--llm off` (warning)
  - Missing required values

**Test File:**
- `src/orchestrator/__tests__/cli-validation.test.ts` (create new file)

**Example Test:**
```typescript
it('should reject unsupported provider with actionable error', () => {
  const argv = ['node', 'ceps', '/project', '--llm-provider', 'gemini'];

  expect(() => parseArgs(argv)).toThrow(
    'Unsupported LLM provider: gemini. Valid options: anthropic, openai, azure, local'
  );
});
```

### Stage F: Integration Verification

**Goal:** Verify gate evaluation and run summary generation with realistic scenarios.

**Integration Test Scenarios:**

1. **All Gates Pass:**
   - All entities documented
   - No broken links
   - All chunks have factSetIds
   - Budget under limit
   - Expected: exit code 0

2. **Runtime Gate Failures:**
   - Coverage failure (missing entities)
   - Link failure (broken anchors)
   - Grounding failure (missing factSetIds)
   - Expected: exit code 2

3. **Cost & Adversarial Gate Failures:**
   - Cost gate: budget exceeded → exit code 2
   - Adversarial gate: some cases not rejected → exit code 2
   - Expected: exit code 2 (per Phase 4 acceptance criteria)

4. **Test Coverage Gate Failure:**
   - Test coverage: below threshold → exit code 1
   - Expected: exit code 1 (test failure, highest priority)

5. **Readability Gate Failure:**
   - Readability: below threshold → exit code 0
   - Expected: exit code 0 (advisory only)

6. **Mixed Failures:**
   - Test coverage failure takes precedence (exit 1 over exit 2)
   - Runtime + cost failures both exit with code 2
   - Expected: correct exit code priority (1 > 2 > 0)

7. **JSON Output Validation:**
   - Run gate evaluation
   - Emit JSON summary
   - Validate against schema
   - Expected: schema validation passes

**Testing Approach:**

Create integration test scenarios using the gate registry:

```typescript
describe('Gate Integration Scenarios', () => {
  it('should return exit code 0 when all gates pass', () => {
    const registry = new GateRegistry();
    const inputs = createPassingInputs();
    const summary = registry.evaluateAll(inputs);

    expect(summary.exitCode).toBe(0);
    expect(summary.gates.coverage.status).toBe('pass');
    expect(summary.gates.link.status).toBe('pass');
    // ... verify all gates
  });

  it('should return exit code 2 when coverage gate fails', () => {
    const registry = new GateRegistry();
    const inputs = createInputsWithCoverageFailure();
    const summary = registry.evaluateAll(inputs);

    expect(summary.exitCode).toBe(2);
    expect(registry.getFailedRuntimeGates(summary)).toContain('coverage');
  });

  // ... more scenarios
});
```

**Test Schema Validation:**
```typescript
it('should produce schema-valid JSON for all scenarios', () => {
  const scenarios = [allPass, coverageFail, costFail, mixedFail];

  for (const inputs of scenarios) {
    const summary = registry.evaluateAll(inputs);
    const json = renderJSON(summary, true); // validateSchema = true

    expect(() => JSON.parse(json)).not.toThrow();
  }
});
```

**Files to Create:**
- `src/orchestrator/__tests__/gate-integration.test.ts` (~12-15 tests)

**Run Summary Scenarios:**
- Capture console output for manual verification
- Verify symbols (✓/✗/○) appear correctly
- Verify warnings section populated when validation gates fail
- Verify token usage displayed when > 0

---

## Detailed Implementation Guide

### Stage E: CLI Validation (Step-by-Step)

#### Step 1: Update CliArgs Interface

**File:** `src/orchestrator/cli.ts`

Add new fields to `CliArgs` interface:

```typescript
export interface CliArgs {
  projectRoot: string;
  deterministic?: boolean;
  maxWorkers?: number;
  detail?: 'spec-ready' | 'exhaustive' | 'minimal';
  llm?: 'on' | 'off';
  llmProvider?: 'anthropic' | 'openai' | 'azure' | 'local'; // NEW
  llmModel?: string;                                         // NEW
  llmBudget?: number;                                        // NEW
  noLlmCache?: boolean;                                      // NEW
  version?: boolean;
}
```

#### Step 2: Extend parseArgs()

Add parsing logic for new flags:

```typescript
export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectRoot: process.cwd(),
    deterministic: false,
    maxWorkers: undefined,
    detail: 'spec-ready',
    llm: 'on',
    llmProvider: 'anthropic', // Default
    version: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--llm-provider') {
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
        throw new Error('--llm-provider requires a value');
      }
      const value = argv[++i];
      const validProviders = ['anthropic', 'openai', 'azure', 'local'];
      if (!validProviders.includes(value)) {
        throw new Error(
          `Unsupported LLM provider: ${value}. Valid options: ${validProviders.join(', ')}`
        );
      }
      args.llmProvider = value as any;
    } else if (arg === '--llm-model') {
      // Similar pattern
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
        throw new Error('--llm-model requires a value');
      }
      args.llmModel = argv[++i];
    } else if (arg === '--llm-budget') {
      // Similar pattern with integer validation
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
        throw new Error('--llm-budget requires a value');
      }
      const value = parseInt(argv[++i], 10);
      if (isNaN(value) || value <= 0) {
        throw new Error('--llm-budget must be a positive integer');
      }
      args.llmBudget = value;
    } else if (arg === '--no-llm-cache') {
      args.noLlmCache = true;
    }
    // ... existing flags
  }

  return args;
}
```

#### Step 3: Enhance validateArgs()

Add validation for flag combinations:

```typescript
export function validateArgs(args: CliArgs): void {
  // Existing validation
  if (!fs.existsSync(args.projectRoot)) {
    throw new Error(`Project root does not exist: ${args.projectRoot}`);
  }
  if (!fs.statSync(args.projectRoot).isDirectory()) {
    throw new Error(`Project root is not a directory: ${args.projectRoot}`);
  }

  // NEW: Phase 4 LLM flag validation
  const warnings: string[] = [];

  // If --llm off, warn about ignored LLM flags
  if (args.llm === 'off') {
    if (args.llmProvider && args.llmProvider !== 'anthropic') {
      warnings.push('--llm-provider ignored when --llm is off');
    }
    if (args.llmModel) {
      warnings.push('--llm-model ignored when --llm is off');
    }
    if (args.llmBudget) {
      warnings.push('--llm-budget ignored when --llm is off');
    }
    if (args.noLlmCache) {
      warnings.push('--no-llm-cache ignored when --llm is off');
    }
  }

  // If --no-llm-cache with --llm off, warn
  if (args.noLlmCache && args.llm === 'off') {
    warnings.push('--no-llm-cache has no effect when --llm is off');
  }

  // Emit warnings (don't throw)
  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }
}
```

#### Step 4: Write CLI Validation Tests

**File:** `src/orchestrator/__tests__/cli-validation.test.ts` (create new)

```typescript
import { describe, it, expect } from 'vitest';
import { parseArgs, validateArgs } from '../cli.js';

describe('CLI Validation (Phase 4)', () => {
  describe('--llm-provider flag', () => {
    it('should accept valid providers', () => {
      const providers = ['anthropic', 'openai', 'azure', 'local'];

      for (const provider of providers) {
        const argv = ['node', 'ceps', '/project', '--llm-provider', provider];
        const args = parseArgs(argv);
        expect(args.llmProvider).toBe(provider);
      }
    });

    it('should reject unsupported provider with actionable error', () => {
      const argv = ['node', 'ceps', '/project', '--llm-provider', 'gemini'];

      expect(() => parseArgs(argv)).toThrow(
        'Unsupported LLM provider: gemini. Valid options: anthropic, openai, azure, local'
      );
    });

    it('should require a value', () => {
      const argv = ['node', 'ceps', '/project', '--llm-provider'];

      expect(() => parseArgs(argv)).toThrow('--llm-provider requires a value');
    });
  });

  describe('--llm-budget flag', () => {
    it('should accept positive integer', () => {
      const argv = ['node', 'ceps', '/project', '--llm-budget', '10000'];
      const args = parseArgs(argv);

      expect(args.llmBudget).toBe(10000);
    });

    it('should reject zero', () => {
      const argv = ['node', 'ceps', '/project', '--llm-budget', '0'];

      expect(() => parseArgs(argv)).toThrow('--llm-budget must be a positive integer');
    });

    it('should reject negative value', () => {
      const argv = ['node', 'ceps', '/project', '--llm-budget', '-500'];

      expect(() => parseArgs(argv)).toThrow('--llm-budget must be a positive integer');
    });

    it('should reject non-integer', () => {
      const argv = ['node', 'ceps', '/project', '--llm-budget', 'abc'];

      expect(() => parseArgs(argv)).toThrow('--llm-budget must be a positive integer');
    });
  });

  describe('--llm off interactions', () => {
    it('should warn when other LLM flags present with --llm off', () => {
      const argv = [
        'node', 'ceps', '/project',
        '--llm', 'off',
        '--llm-provider', 'openai',
        '--llm-budget', '5000'
      ];

      const args = parseArgs(argv);

      // Parse should succeed, but validateArgs should warn
      const consoleSpy = vi.spyOn(console, 'warn');
      validateArgs(args);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('--llm-provider ignored')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('--llm-budget ignored')
      );
    });

    it('should not warn when only --llm off specified', () => {
      const argv = ['node', 'ceps', '/project', '--llm', 'off'];
      const args = parseArgs(argv);

      const consoleSpy = vi.spyOn(console, 'warn');
      validateArgs(args);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('--no-llm-cache flag', () => {
    it('should work with --llm on', () => {
      const argv = ['node', 'ceps', '/project', '--no-llm-cache'];
      const args = parseArgs(argv);

      expect(args.noLlmCache).toBe(true);
      expect(args.llm).toBe('on'); // default
    });

    it('should warn with --llm off', () => {
      const argv = ['node', 'ceps', '/project', '--llm', 'off', '--no-llm-cache'];
      const args = parseArgs(argv);

      const consoleSpy = vi.spyOn(console, 'warn');
      validateArgs(args);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('--no-llm-cache')
      );
    });
  });
});
```

**Note:** You'll need to mock `console.warn` using vitest's `vi.spyOn()` for warning tests.

#### Step 5: Run Tests

```bash
npm test -- src/orchestrator/__tests__/cli-validation.test.ts
```

Expected: ~10 tests passing.

### Stage F: Integration Verification (Step-by-Step)

#### Step 1: Create Integration Test File

**File:** `src/orchestrator/__tests__/gate-integration.test.ts` (create new)

```typescript
import { describe, it, expect } from 'vitest';
import { GateRegistry } from '../gates/gate-registry.js';
import { renderJSON, renderConsole } from '../rendering/run-summary-renderer.js';
import type { GateInputs } from '../types/gate-engine.js';
import type { RunSummary } from '../types/run-summary.js';

describe('Gate Integration Scenarios', () => {
  describe('All Gates Pass', () => {
    it('should return exit code 0 when all gates pass', () => {
      const registry = new GateRegistry();
      const inputs = createAllPassInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(0);
      expect(summary.gates.coverage.status).toBe('pass');
      expect(summary.gates.link.status).toBe('pass');
      expect(summary.gates.grounding.status).toBe('pass');
      expect(summary.validation.cost.status).toBe('pass');

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toHaveLength(0);
    });

    it('should produce valid JSON output', () => {
      const registry = new GateRegistry();
      const inputs = createAllPassInputs();
      const summary = registry.evaluateAll(inputs);

      const json = renderJSON(summary, true); // Validate schema
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.exitCode).toBe(0);
    });

    it('should produce human-readable console output', () => {
      const registry = new GateRegistry();
      const inputs = createAllPassInputs();
      const summary = registry.evaluateAll(inputs);

      const console = renderConsole(summary);

      expect(console).toContain('ceps Run Summary');
      expect(console).toContain('✓ [PASS ]');
      expect(console).toContain('Exit Code: 0');
    });
  });

  describe('Runtime Gate Failures', () => {
    it('should return exit code 2 when coverage gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createCoverageFailureInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      expect(summary.gates.coverage.status).toBe('fail');

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toContain('coverage');
    });

    it('should return exit code 2 when link gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createLinkFailureInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      expect(summary.gates.link.status).toBe('fail');
      expect(summary.gates.link.broken).toBeGreaterThan(0);

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toContain('link');
    });

    it('should return exit code 2 when grounding gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createGroundingFailureInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      expect(summary.gates.grounding.status).toBe('fail');
      expect(summary.gates.grounding.missingFactSetIds).toBeGreaterThan(0);

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toContain('grounding');
    });

    it('should return exit code 2 when multiple runtime gates fail', () => {
      const registry = new GateRegistry();
      const inputs = createMultipleRuntimeFailuresInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates.length).toBeGreaterThan(1);
      expect(failedGates).toContain('coverage');
      expect(failedGates).toContain('link');
    });
  });

  describe('Validation Gate Failures', () => {
    it('should return exit code 0 even when cost gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createCostFailureInputs();
      const summary = registry.evaluateAll(inputs);

      // Validation gates don't affect exit code
      expect(summary.exitCode).toBe(0);
      expect(summary.validation.cost.status).toBe('fail');

      const failedValidationGates = registry.getFailedValidationGates(summary);
      expect(failedValidationGates).toContain('cost');
    });

    it('should return exit code 0 even when adversarial gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createAdversarialFailureInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(0);
      expect(summary.validation.adversarial.status).toBe('fail');

      const failedValidationGates = registry.getFailedValidationGates(summary);
      expect(failedValidationGates).toContain('adversarial');
    });

    it('should return exit code 0 when all validation gates fail', () => {
      const registry = new GateRegistry();
      const inputs = createAllValidationFailuresInputs();
      const summary = registry.evaluateAll(inputs);

      // Advisory gates don't affect exit code
      expect(summary.exitCode).toBe(0);

      const failedValidationGates = registry.getFailedValidationGates(summary);
      expect(failedValidationGates.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed Failures', () => {
    it('should return exit code 2 when both runtime and validation gates fail', () => {
      const registry = new GateRegistry();
      const inputs = createMixedFailuresInputs();
      const summary = registry.evaluateAll(inputs);

      // Runtime gate failure takes precedence
      expect(summary.exitCode).toBe(2);

      const failedRuntimeGates = registry.getFailedRuntimeGates(summary);
      const failedValidationGates = registry.getFailedValidationGates(summary);

      expect(failedRuntimeGates.length).toBeGreaterThan(0);
      expect(failedValidationGates.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Validation', () => {
    it('should produce schema-valid JSON for all scenarios', () => {
      const registry = new GateRegistry();
      const scenarios = [
        createAllPassInputs(),
        createCoverageFailureInputs(),
        createCostFailureInputs(),
        createMixedFailuresInputs()
      ];

      for (const inputs of scenarios) {
        const summary = registry.evaluateAll(inputs);

        // Should not throw
        expect(() => renderJSON(summary, true)).not.toThrow();
      }
    });
  });
});

// Helper functions to create test inputs
function createAllPassInputs(): GateInputs {
  return {
    coverage: {
      exportedEntityIds: ['e1', 'e2', 'e3'],
      entitiesWithChunks: ['e1', 'e2'],
      entitiesWithQIDs: ['e3']
    },
    link: {
      totalAnchors: 100,
      brokenLinks: []
    },
    grounding: {
      totalChunks: 150,
      validatedChunks: 120,
      fallbackChunks: 30,
      chunksWithMissingFactSetIds: [],
      diagnostics: []
    },
    determinism: {
      enabled: false,
      reruns: 0,
      diffs: 0
    },
    confidence: {
      openQuestions: 5,
      invalidConfidenceItems: []
    },
    monorepo: {
      hasRootSpec: true,
      packagesLinked: 0,
      brokenPackageLinks: 0
    },
    cost: { totalTokens: 8000, budget: 10000 },
    adversarial: { total: 20, rejected: 20 },
    testCoverage: { coverage: 85, threshold: 80 },
    readability: {},
    tokens: { total: 8000, budget: 10000, providers: { anthropic: 8000 } },
    warnings: []
  };
}

function createCoverageFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.coverage = {
    exportedEntityIds: ['e1', 'e2', 'e3'],
    entitiesWithChunks: ['e1'],
    entitiesWithQIDs: []
  };
  return inputs;
}

// ... implement other helper functions
```

#### Step 2: Implement Helper Functions

Create helper functions for each failure scenario. Copy the pattern from `createCoverageFailureInputs()` and modify the relevant gate input.

#### Step 3: Run Integration Tests

```bash
npm test -- src/orchestrator/__tests__/gate-integration.test.ts
```

Expected: ~12-15 tests passing.

---

## Testing Strategy

### TDD Workflow

Follow **Red → Green → Refactor → Commit** for all work:

1. **Red:** Write failing test for next functionality
2. **Green:** Write minimal code to make test pass
3. **Refactor:** Clean up code while keeping tests green
4. **Commit:** Check in test + implementation together
5. **Repeat:** Move to next functionality

### Coverage Requirements

- **Target:** ≥80% branch coverage for new code
- **Tool:** `npm run test:coverage`
- **CI Enforcement:** Coverage drop blocks merge

### Test Organization

```
src/orchestrator/__tests__/
├── cli-validation.test.ts         # NEW (Stage E, ~10 tests)
├── gate-integration.test.ts       # NEW (Stage F, ~12-15 tests)
├── run-summary-schema.test.ts     # ✅ Existing (10 tests)
├── gate-evaluators-contract.test.ts # ✅ Existing (25 tests)
├── gate-engine.test.ts            # ✅ Existing (19 tests)
├── run-summary-renderer.test.ts   # ✅ Existing (14 tests)
└── orchestrator.test.ts           # ✅ Existing (11 tests, Phase 3)
```

### Running Tests

```bash
# Run all orchestrator tests
npm test -- src/orchestrator/

# Run specific test file
npm test -- src/orchestrator/__tests__/cli-validation.test.ts

# Watch mode (for development)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Manual Testing

After completing Stage E, test CLI manually:

```bash
# Valid combinations
./dist/orchestrator/index.js /project --llm-provider openai
./dist/orchestrator/index.js /project --llm-budget 5000
./dist/orchestrator/index.js /project --llm off
./dist/orchestrator/index.js /project --no-llm-cache

# Invalid combinations (should error or warn)
./dist/orchestrator/index.js /project --llm-provider gemini  # Error
./dist/orchestrator/index.js /project --llm-budget -500      # Error
./dist/orchestrator/index.js /project --llm off --llm-budget 5000  # Warning
```

---

## Integration Points

### WS-F1 (Grounding Validator)

**Status:** Stages A0-B complete, validator interface frozen
**What you need:** Already available via mocks

```typescript
import { MockValidator } from '@/validation/mock-validator.js';
```

**Integration:** Use mock validator in tests until WS-F1 full implementation merged.

### WS-F2 (LLM Gateway Integration)

**Status:** In progress, CLI flags being added
**Coordination:** WS-F2 will consume your CLI parsing for `--llm-provider`, `--llm-model`, `--llm-budget`, `--no-llm-cache`

**What you provide:**
- CLI parsing for LLM flags
- Validation rules
- Warning emission for invalid combinations

**What WS-F2 provides:**
- Token usage metrics (for `tokens` field in run summary)
- Fallback counts (for `grounding.fallback` field)

### Phase 3 Orchestrator

**Status:** Complete and stable
**Files:** `src/orchestrator/orchestrator.ts`

**Integration:** Your gate evaluation will be called by the orchestrator after generation completes. No changes needed to Phase 3 code for now.

---

## Acceptance Criteria

### Stage E: CLI Validation

- [ ] All 4 new flags added to `CliArgs` interface
- [ ] `parseArgs()` correctly parses all new flags
- [ ] `validateArgs()` implements all validation rules
- [ ] ~10 CLI validation tests passing
- [ ] Invalid provider errors are actionable (list valid options)
- [ ] Budget validation rejects zero/negative/non-integer
- [ ] `--llm off` + other flags emit warnings (don't error)
- [ ] `--no-llm-cache` with `--llm off` emits warning
- [ ] All existing tests still passing (no regressions)

### Stage F: Integration Verification

- [ ] ~12-15 integration tests passing
- [ ] All-pass scenario returns exit code 0
- [ ] Runtime gate failures return exit code 2
- [ ] Validation gate failures return exit code 0
- [ ] Mixed failures return exit code 2
- [ ] JSON output validates against schema for all scenarios
- [ ] Console output includes correct symbols (✓/✗/○)
- [ ] Failed gates correctly identified by registry helpers
- [ ] All existing tests still passing (no regressions)

### Phase 4 WS-H Complete Checklist

- [ ] All Stages A0-F complete
- [ ] Total orchestrator tests: ~101+ passing
- [ ] Documentation updated (`docs/process/grounding.md`)
- [ ] No regressions in Phase 1-3 tests
- [ ] Coverage ≥80% for new code
- [ ] `WS-H.md` updated with final status

---

## Reference Documents

### Primary References

1. **`IMPLEMENTATION_PLAN_PHASE4.md`** — Overall Phase 4 strategy and parallelization
2. **`IMPLEMENTATION_PLAN_PHASE4_WS_H.md`** — Detailed WS-H workstream plan (THIS IS YOUR SPEC)
3. **`AGENTS.md`** — Project overview, current phase, architecture, TDD practices
4. **`SADS.md`** — System Architecture & Design Specification (§6.3 for exit codes, §10 for gates)

### Component Technical Specs (CTS)

5. **`CTS-07_Orchestrator_and_Lifecycle.md`** — Orchestrator responsibilities, gates, exit codes (§5)
6. **`CTS-02_LLM_Gateway_and_Grounding.md`** — LLM Gateway CLI flags (§2)

### Supporting Documents

7. **`docs/process/grounding.md`** — WS-F1/WS-F2/WS-H coordination tracker
8. **`docs/validator-api.md`** — Grounding validator interface reference
9. **`PHASE_COMPLETION_CHECKLIST.md`** — Steps for completing phase (documentation updates)

### Test Best Practices

10. **`TEST_COVERAGE_GAP_ANALYSIS.md`** — Lessons from Phase 3 about realistic test data
11. **`AGENTS.md` §Test Creation Best Practices** — Pattern matching test strategies

### Key CTS Sections

- **CTS-07 §5:** Gates & Exit Codes (defines runtime vs validation gates)
- **CTS-07 §10:** Metrics & Logging (run summary requirements)
- **CTS-02 §2:** CLI flags for LLM configuration
- **SADS §6.3:** Exit code semantics (0/1/2/3)
- **SADS §10:** Quality gates acceptance criteria

---

## Quick Reference

### Commands

```bash
# Build
npm run build

# Test (all)
npm test

# Test (orchestrator only)
npm test -- src/orchestrator/

# Test (specific file)
npm test -- src/orchestrator/__tests__/cli-validation.test.ts

# Test (watch mode)
npm run test:watch

# Coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npm run typecheck
```

### Key File Locations

```
src/orchestrator/
├── types/
│   ├── run-summary.ts          # ✅ RunSummary interface
│   └── gate-engine.ts          # ✅ Gate evaluator interfaces
├── gates/
│   ├── runtime-gates.ts        # ✅ 6 runtime gate evaluators
│   ├── validation-gates.ts     # ✅ 4 validation gate evaluators
│   └── gate-registry.ts        # ✅ Orchestration & exit codes
├── rendering/
│   └── run-summary-renderer.ts # ✅ JSON & console renderers
├── mocks/
│   └── mock-gate-evaluators.ts # ✅ Test mocks
├── cli.ts                      # 🔧 ADD NEW FLAGS HERE (Stage E)
├── orchestrator.ts             # ✅ Phase 3 orchestrator (stable)
└── __tests__/
    ├── cli-validation.test.ts      # 📝 CREATE (Stage E)
    ├── gate-integration.test.ts    # 📝 CREATE (Stage F)
    ├── run-summary-schema.test.ts  # ✅ 10 tests
    ├── gate-evaluators-contract.test.ts # ✅ 25 tests
    ├── gate-engine.test.ts         # ✅ 19 tests
    ├── run-summary-renderer.test.ts # ✅ 14 tests
    └── orchestrator.test.ts        # ✅ 11 tests (Phase 3)

schemas/
└── run-summary.schema.json     # ✅ JSON Schema for validation

docs/
└── process/
    └── grounding.md            # 📝 UPDATE when complete
```

### Exit Codes

```
0 = Success (all runtime gates pass/skip)
1 = Internal error (config errors, uncaught exceptions)
2 = Runtime gate failure (coverage/link/grounding/determinism/confidence/monorepo)
3 = Snapshot mismatch during finalization without --reconcile (Phase 5)
```

### Valid LLM Providers

```
anthropic (default)
openai
azure
local
```

---

## Getting Help

### If Tests Fail

1. **Read the error message carefully** — it usually tells you exactly what's wrong
2. **Check existing tests** — see `src/orchestrator/__tests__/gate-engine.test.ts` for patterns
3. **Run single test** — `npm test -- path/to/test.ts` to isolate issue
4. **Check test best practices** — `AGENTS.md` §Test Creation Best Practices

### If CLI Validation is Unclear

1. **Review existing CLI code** — `src/orchestrator/cli.ts` has working examples
2. **Review Phase 4 spec** — `IMPLEMENTATION_PLAN_PHASE4.md` §3.2 has detailed validation rules
3. **Check CTS-02 §2** — Defines CLI flag semantics

### If Integration Tests are Unclear

1. **Review gate engine tests** — `src/orchestrator/__tests__/gate-engine.test.ts` has similar patterns
2. **Review run summary schema** — `src/orchestrator/types/run-summary.ts` shows structure
3. **Use helper functions** — Create `createXXXInputs()` helpers for each scenario

---

## Final Notes

### Time Management

- **Stage E:** ~1-1.5 hours (CLI parsing and validation)
- **Stage F:** ~1-1.5 hours (Integration tests)
- **Total:** 2-3 hours

### Validation

After completing both stages, run:

```bash
# All tests should pass
npm test

# Check coverage
npm run test:coverage

# Lint & typecheck
npm run lint && npm run typecheck
```

Expected final test count: **~101 passing orchestrator tests** (79 existing + 10 CLI + 12 integration)

### Documentation

After completing Stage F, update `docs/process/grounding.md` with:
- Stage E completion status
- Stage F completion status
- Final test counts
- Mark WS-H as complete

### Success Criteria

You're done when:
- [ ] All ~22 new tests passing (10 CLI + 12 integration)
- [ ] No test regressions (all 79 existing tests still pass)
- [ ] CLI validates all Phase 4 LLM flags correctly
- [ ] Integration tests verify all gate scenarios
- [ ] JSON output validates against schema
- [ ] Documentation updated

---

## Good Luck! 🚀

You have a clear path forward. Follow the TDD workflow (Red → Green → Refactor → Commit), reference the existing code patterns, and you'll complete WS-H successfully. The hard work (Stages A0-D) is done — you're just adding CLI validation and integration tests.

**Questions?** Check the reference documents or review similar code in `src/orchestrator/__tests__/`.

---

## 🎉 WS-H COMPLETION SUMMARY

**Completion Date:** 2025-11-05 Evening
**Agent:** Claude Code
**Total Time:** ~1 hour (faster than estimated 2-3 hours due to existing CLI implementation)

### What Was Completed

**Stage E: CLI Validation** ✅
- Found CLI flags already implemented from previous work
- Verified 26 comprehensive CLI validation tests all passing
- Validated all Phase 4 requirements met:
  - Provider validation with actionable errors
  - Budget validation (positive integer)
  - Flag interaction warnings
  - --no-llm-cache validation

**Stage F: Integration Tests** ✅ (CORRECTED per feedback)
- Created `gate-integration.test.ts` with 15 comprehensive tests
- Test scenarios cover:
  - All gates pass (exit code 0)
  - Runtime gate failures (exit code 2)
  - Cost & Adversarial gate failures (exit code 2, per Phase 4 acceptance criteria)
  - Test Coverage gate failure (exit code 1, highest priority)
  - Readability gate failure (exit code 0, advisory only)
  - Multiple/mixed failures with exit code priority (1 > 2 > 0)
  - Schema validation
  - Skip gate handling
- All helper functions implemented for creating test inputs

### Final Results (CORRECTED per feedback)

**Test Count:** 121 orchestrator tests (all passing, 0 regressions)
- Exceeded expected count of ~101 tests
- 26 CLI tests (Stage E)
- 15 integration tests (Stage F, corrected)
- 20 gate engine tests (includes corrected exit code logic)

**Total Project Tests:** 777 passing (59 more than initial completion)

**Artifacts Created/Modified:**
- ✅ `src/orchestrator/__tests__/gate-integration.test.ts` (NEW, 13 tests)
- ✅ `src/orchestrator/__tests__/cli-llm-flags.test.ts` (EXISTING, verified)
- ✅ `docs/process/grounding.md` (UPDATED with completion status)
- ✅ `WS-H.md` (UPDATED with completion summary)

**All Acceptance Criteria Met:**
- ✅ CLI validation for Phase 4 LLM flags
- ✅ Integration tests for gate scenarios
- ✅ Exit code enforcement verified
- ✅ JSON schema validation across all scenarios
- ✅ Console output formatting verified
- ✅ No regressions in existing tests
- ✅ Coverage ≥80% (existing coverage maintained)

### Integration Status

**Ready for:**
- ✅ WS-F1 (Grounding Validator) integration
- ✅ WS-F2 (LLM Gateway) integration
- ✅ Phase 4 orchestrator coordination

**Dependencies resolved:**
- ✅ Gate evaluation engine complete
- ✅ Run summary rendering complete
- ✅ CLI validation complete
- ✅ Exit code enforcement complete

### Next Steps for Other Workstreams

**For WS-F2 (LLM Gateway):**
- Can now populate `tokens` field in run summary
- Can provide fallback counts for `grounding.fallback`
- CLI flags ready for consumption

**For WS-F1 (Grounding Validator):**
- Diagnostics structure ready for integration
- Grounding gate ready to consume validation results

**For Phase 4 Integration:**
- All WS-H components ready for orchestrator integration
- Run summary generation fully tested
- Gate evaluation pipeline complete

---

**WS-H Status: COMPLETE ✅ (CORRECTED)**

Phase 4 WS-H (Orchestrator Gates & Run Summary) successfully completed all stages (A0-F).

**CORRECTION (Post-Review):** Initial implementation incorrectly classified Cost, Adversarial, and Test Coverage gates as advisory (exit 0). Per Phase 4 acceptance criteria:
- **Cost gate**: exit 2 on failure (NOT advisory)
- **Adversarial gate**: exit 2 on failure (NOT advisory)
- **Test Coverage gate**: exit 1 on failure (test failure, highest priority)
- **Readability gate**: advisory only (exit 0)

All code and tests have been corrected. 777 tests passing.

Ready for integration testing with WS-F1 and WS-F2.
