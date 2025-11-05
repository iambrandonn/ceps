# src/orchestrator/gates

**Directory Overview:** This directory contains 27 entities.

## gate-registry.ts

<a id="NctTIgBv8d"></a>

### GateRegistry

**Visibility:** Public (exported)

This class represents gate registry.

<a id="m9quDbA6pb"></a>

### registerRuntimeGate

**Signature:** `(name: string, evaluator: GateEvaluator<TInput, TResult>): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="wVTkDx11Kl"></a>

### registerValidationGate

**Signature:** `(name: string, evaluator: GateEvaluator<TInput, TResult>): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="fQKHl336aP"></a>

### evaluateAll

**Signature:** `(inputs: GateInputs): RunSummary`

**Visibility:** Public (exported)

This method performs an operation.

<a id="60E4XLLzVV"></a>

### getFailedRuntimeGates

**Signature:** `(summary: RunSummary): string[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="kghernsxnH"></a>

### getFailedGatesExitCode2

**Signature:** `(summary: RunSummary): string[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="fszmWPzpKL"></a>

### getFailedValidationGates

**Signature:** `(summary: RunSummary): string[]`

**Visibility:** Public (exported)

This method retrieves data.

## runtime-gates.ts

<a id="bLUeCuJavK"></a>

### CoverageGateEvaluator

**Visibility:** Public (exported)

This class represents coverage gate evaluator.

<a id="VMClCUoAD1"></a>

### evaluate

**Signature:** `(input: CoverageGateInput): CoverageGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="U8mmJ1cjPP"></a>

### LinkGateEvaluator

**Visibility:** Public (exported)

This class represents link gate evaluator.

<a id="PFSeuP1ZAY"></a>

### evaluate

**Signature:** `(input: LinkGateInput): LinkGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="hFCFzoHbr0"></a>

### GroundingGateEvaluator

**Visibility:** Public (exported)

This class represents grounding gate evaluator.

<a id="dOllBagWdd"></a>

### evaluate

**Signature:** `(input: GroundingGateInput): GroundingGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="83BdkVXhbH"></a>

### DeterminismGateEvaluator

**Visibility:** Public (exported)

This class represents determinism gate evaluator.

<a id="3VJSm49flT"></a>

### evaluate

**Signature:** `(input: DeterminismGateInput): DeterminismGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="wnnDmbbrsT"></a>

### ConfidenceGateEvaluator

**Visibility:** Public (exported)

This class represents confidence gate evaluator.

<a id="utSHYks4pp"></a>

### evaluate

**Signature:** `(input: ConfidenceGateInput): ConfidenceGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="G43sZhMQAU"></a>

### MonorepoGateEvaluator

**Visibility:** Public (exported)

This class represents monorepo gate evaluator.

<a id="BjgvB6W5tc"></a>

### evaluate

**Signature:** `(input: MonorepoGateInput): MonorepoGateResult`

**Visibility:** Public (exported)

This method performs an operation.

## validation-gates.ts

<a id="SQjEzYAofe"></a>

### CostGateEvaluator

**Visibility:** Public (exported)

This class represents cost gate evaluator.

<a id="p4QeYpr0gh"></a>

### evaluate

**Signature:** `(input: CostGateInput): CostGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="RgfQivsj5k"></a>

### AdversarialGateEvaluator

**Visibility:** Public (exported)

This class represents adversarial gate evaluator.

<a id="0NyllAEiIi"></a>

### evaluate

**Signature:** `(input: AdversarialGateInput): AdversarialGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="lTkx8tsIs9"></a>

### TestCoverageGateEvaluator

**Visibility:** Public (exported)

This class represents test coverage gate evaluator.

<a id="f7WH2IzB9J"></a>

### evaluate

**Signature:** `(input: TestCoverageGateInput): TestCoverageGateResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="xoyZ5iHFXs"></a>

### ReadabilityGateEvaluator

**Visibility:** Public (exported)

This class represents readability gate evaluator.

<a id="JLkEhRYx4V"></a>

### evaluate

**Signature:** `(input: ReadabilityGateInput): ReadabilityGateResult`

**Visibility:** Public (exported)

This method performs an operation.

