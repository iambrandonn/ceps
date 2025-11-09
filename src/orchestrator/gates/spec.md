# src/orchestrator/gates

**Directory Overview:** This directory contains 27 entities.

## gate-registry.ts

<a id="NctTIgBv8d"></a>

### GateRegistry

**Visibility:** Public (exported)

**Behavior:**

- Class GateRegistry: 
Gate registry for evaluating all gates and producing run summary.

**Open Questions:**
- q:GzxHCk8l0I: What are the responsibilities and contract of class `GateRegistry` at src/orchestrator/gates/gate-registry.ts?

<a id="m9quDbA6pb"></a>

### registerRuntimeGate

**Signature:** `(name: string, evaluator: GateEvaluator<TInput, TResult>): void`

**Visibility:** Public (exported)

**Behavior:**

- Method registerRuntimeGate (intent unclear from static analysis)

**Open Questions:**
- q:bDtgGHwSat: What is the behavior of method `registerRuntimeGate` at src/orchestrator/gates/gate-registry.ts?

<a id="wVTkDx11Kl"></a>

### registerValidationGate

**Signature:** `(name: string, evaluator: GateEvaluator<TInput, TResult>): void`

**Visibility:** Public (exported)

**Behavior:**

- Method registerValidationGate (intent unclear from static analysis)

**Open Questions:**
- q:yDNReJQJTO: What is the behavior of method `registerValidationGate` at src/orchestrator/gates/gate-registry.ts?

<a id="fQKHl336aP"></a>

### evaluateAll

**Signature:** `(inputs: GateInputs): RunSummary`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluateAll (intent unclear from static analysis)

**Open Questions:**
- q:FxqcGr2RpX: What is the behavior of method `evaluateAll` at src/orchestrator/gates/gate-registry.ts?

<a id="60E4XLLzVV"></a>

### getFailedRuntimeGates

**Signature:** `(summary: RunSummary): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getFailedRuntimeGates: Retrieves data or value

**Open Questions:**
- q:OOdAedWkhL: What is the behavior of method `getFailedRuntimeGates` at src/orchestrator/gates/gate-registry.ts?

<a id="kghernsxnH"></a>

### getFailedGatesExitCode2

**Signature:** `(summary: RunSummary): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getFailedGatesExitCode2: Retrieves data or value

**Open Questions:**
- q:zcbFKdmGrO: What is the behavior of method `getFailedGatesExitCode2` at src/orchestrator/gates/gate-registry.ts?

<a id="fszmWPzpKL"></a>

### getFailedValidationGates

**Signature:** `(summary: RunSummary): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getFailedValidationGates: Retrieves data or value

**Open Questions:**
- q:frGfDdn3te: What is the behavior of method `getFailedValidationGates` at src/orchestrator/gates/gate-registry.ts?

## runtime-gates.ts

<a id="bLUeCuJavK"></a>

### CoverageGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class CoverageGateEvaluator: 
Coverage Gate: Ensures all exported entities are documented or carry QIDs.
Per SADS §10, 100% of exported/public surfaces must be documented or carry Open Questions.

**Open Questions:**
- q:0sAdIy4Hcw: What are the responsibilities and contract of class `CoverageGateEvaluator` at src/orchestrator/gates/runtime-gates.ts?

<a id="VMClCUoAD1"></a>

### evaluate

**Signature:** `(input: CoverageGateInput): CoverageGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="U8mmJ1cjPP"></a>

### LinkGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class LinkGateEvaluator: 
Link Gate: Validates all cross-file anchor references.
Per SADS §10, no broken cross-links allowed.

**Open Questions:**
- q:fxFH8RHuCg: What are the responsibilities and contract of class `LinkGateEvaluator` at src/orchestrator/gates/runtime-gates.ts?

<a id="PFSeuP1ZAY"></a>

### evaluate

**Signature:** `(input: LinkGateInput): LinkGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="hFCFzoHbr0"></a>

### GroundingGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class GroundingGateEvaluator: 
Grounding Gate: Ensures all chunks have factSetIds and passed validation or fell back.
Per SADS §10, every paragraph/bullet must have a factSetId; no chunk without grounding.

**Open Questions:**
- q:DXS6omsrP8: What are the responsibilities and contract of class `GroundingGateEvaluator` at src/orchestrator/gates/runtime-gates.ts?

<a id="dOllBagWdd"></a>

### evaluate

**Signature:** `(input: GroundingGateInput): GroundingGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="83BdkVXhbH"></a>

### DeterminismGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class DeterminismGateEvaluator: 
Determinism Gate: Validates identical output across reruns when --deterministic enabled.
Only active when --deterministic flag supplied; skips otherwise.

**Open Questions:**
- q:lZcXMfFA0b: What are the responsibilities and contract of class `DeterminismGateEvaluator` at src/orchestrator/gates/runtime-gates.ts?

<a id="3VJSm49flT"></a>

### evaluate

**Signature:** `(input: DeterminismGateInput): DeterminismGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="wnnDmbbrsT"></a>

### ConfidenceGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class ConfidenceGateEvaluator: 
Confidence Gate: Ensures proper handling of low-confidence items.
Low confidence items must become Open Questions (never asserted).
Gate fails only if invalid confidence bands detected.

**Open Questions:**
- q:ZtQfJyZRxV: What are the responsibilities and contract of class `ConfidenceGateEvaluator` at src/orchestrator/gates/runtime-gates.ts?

<a id="utSHYks4pp"></a>

### evaluate

**Signature:** `(input: ConfidenceGateInput): ConfidenceGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="G43sZhMQAU"></a>

### MonorepoGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MonorepoGateEvaluator: 
Monorepo Gate: Ensures root overview exists and package specs linked correctly.
Per SADS §10, root overview must be present and package specs must link correctly.

**Open Questions:**
- q:PnzRO0bJnX: What are the responsibilities and contract of class `MonorepoGateEvaluator` at src/orchestrator/gates/runtime-gates.ts?

<a id="BjgvB6W5tc"></a>

### evaluate

**Signature:** `(input: MonorepoGateInput): MonorepoGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

**Open Questions:**
- q:nXIDM2WSjD: What is the behavior of method `evaluate` at src/orchestrator/gates/runtime-gates.ts?

## validation-gates.ts

<a id="SQjEzYAofe"></a>

### CostGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class CostGateEvaluator: 
Cost Gate: Validates token usage against budget and per-fixture thresholds.
Advisory only - budget exhaustion does not fail the run.

Per Phase 4 §5.2:
- Express API: ≤30k tokens
- React app: ≤40k tokens
- Small monorepo: ≤100k tokens

**Open Questions:**
- q:rBoIm6EOb2: What are the responsibilities and contract of class `CostGateEvaluator` at src/orchestrator/gates/validation-gates.ts?

<a id="p4QeYpr0gh"></a>

### evaluate

**Signature:** `(input: CostGateInput): CostGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="RgfQivsj5k"></a>

### AdversarialGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class AdversarialGateEvaluator: 
Adversarial Gate: Validates that validator rejects all adversarial test cases.
Advisory only - adversarial suite failures logged as warnings.

Per Phase 4 §5.2, 100% of adversarial tests must be rejected.

**Open Questions:**
- q:ICfm4YHkFj: What are the responsibilities and contract of class `AdversarialGateEvaluator` at src/orchestrator/gates/validation-gates.ts?

<a id="0NyllAEiIi"></a>

### evaluate

**Signature:** `(input: AdversarialGateInput): AdversarialGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="lTkx8tsIs9"></a>

### TestCoverageGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class TestCoverageGateEvaluator: 
Test Coverage Gate: Validates branch coverage meets threshold.
Advisory only - coverage below threshold logged as warning.

Per Phase 4 §5.2, target ≥80% branch coverage for all workstreams.

**Open Questions:**
- q:HSfZ1kG42U: What are the responsibilities and contract of class `TestCoverageGateEvaluator` at src/orchestrator/gates/validation-gates.ts?

<a id="f7WH2IzB9J"></a>

### evaluate

**Signature:** `(input: TestCoverageGateInput): TestCoverageGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="xoyZ5iHFXs"></a>

### ReadabilityGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class ReadabilityGateEvaluator: 
Readability Gate: Validates manual review scores if available.
Advisory only - manual review is optional.

Per Phase 4 §5.2:
- LLM-on target: ≥7/10 aggregate score
- Template baseline target: ≥5/10 aggregate score
- Manual review log: docs/PHASE4_READABILITY_REVIEW.md

**Open Questions:**
- q:8mzdul5kPG: What are the responsibilities and contract of class `ReadabilityGateEvaluator` at src/orchestrator/gates/validation-gates.ts?

<a id="JLkEhRYx4V"></a>

### evaluate

**Signature:** `(input: ReadabilityGateInput): ReadabilityGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

**Open Questions:**
- q:W2oIRVM6OS: What is the behavior of method `evaluate` at src/orchestrator/gates/validation-gates.ts?

