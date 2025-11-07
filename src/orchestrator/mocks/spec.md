# src/orchestrator/mocks

**Directory Overview:** This directory contains 30 entities.

## mock-gate-evaluators.ts

<a id="2KpNcE1s3y"></a>

### MockCoverageGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockCoverageGateEvaluator: 
Configurable mock for Coverage Gate.
Default behavior: pass if all exported entities documented or have QIDs.

**Open Questions:**
- q:kfXZu5pCDQ: What are the responsibilities and contract of class `MockCoverageGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="8z7tTr0OgK"></a>

### setNextResult

**Signature:** `(result: CoverageGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="8T0VDeLgtf"></a>

### evaluate

**Signature:** `(input: CoverageGateInput): CoverageGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="9cjlspig0m"></a>

### MockLinkGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockLinkGateEvaluator: 
Configurable mock for Link Gate.
Default behavior: pass if no broken links.

**Open Questions:**
- q:amay9o7aii: What are the responsibilities and contract of class `MockLinkGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="li3DX2YXja"></a>

### setNextResult

**Signature:** `(result: LinkGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="eeRIQzINlt"></a>

### evaluate

**Signature:** `(input: LinkGateInput): LinkGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="o80U7ZuhSm"></a>

### MockGroundingGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockGroundingGateEvaluator: 
Configurable mock for Grounding Gate.
Default behavior: pass if all chunks have factSetIds and (validated or fallback).

**Open Questions:**
- q:IWuisnf97q: What are the responsibilities and contract of class `MockGroundingGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="HJVnMDe6xo"></a>

### setNextResult

**Signature:** `(result: GroundingGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="3CCHwZEej9"></a>

### evaluate

**Signature:** `(input: GroundingGateInput): GroundingGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="GcYiO71i5v"></a>

### MockDeterminismGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockDeterminismGateEvaluator: 
Configurable mock for Determinism Gate.
Default behavior: pass if no diffs, skip if not enabled.

**Open Questions:**
- q:HWnD106xqf: What are the responsibilities and contract of class `MockDeterminismGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="yI4SW8U7CI"></a>

### setNextResult

**Signature:** `(result: DeterminismGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="qFEAKnzTPc"></a>

### evaluate

**Signature:** `(input: DeterminismGateInput): DeterminismGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="d8TyMTM9HS"></a>

### MockConfidenceGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockConfidenceGateEvaluator: 
Configurable mock for Confidence Gate.
Default behavior: always pass (Low confidence → Open Questions is acceptable).

**Open Questions:**
- q:W7idOZXCXs: What are the responsibilities and contract of class `MockConfidenceGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="gLA8Bk26MZ"></a>

### setNextResult

**Signature:** `(result: ConfidenceGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="m6obSAwFI9"></a>

### evaluate

**Signature:** `(input: ConfidenceGateInput): ConfidenceGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="wL8eSpHEil"></a>

### MockMonorepoGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockMonorepoGateEvaluator: 
Configurable mock for Monorepo Gate.
Default behavior: pass if root spec exists and no broken package links.

**Open Questions:**
- q:oIFV16aEeJ: What are the responsibilities and contract of class `MockMonorepoGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="YUruqb2ihC"></a>

### setNextResult

**Signature:** `(result: MonorepoGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="E89eRjDowH"></a>

### evaluate

**Signature:** `(input: MonorepoGateInput): MonorepoGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="WcDMumsxNp"></a>

### MockCostGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockCostGateEvaluator: 
Configurable mock for Cost Gate (validation only).
Default behavior: pass if under budget.

**Open Questions:**
- q:E4LIXqAQsr: What are the responsibilities and contract of class `MockCostGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="nH686iBDUg"></a>

### setNextResult

**Signature:** `(result: CostGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="rAWbZPWrA4"></a>

### evaluate

**Signature:** `(input: CostGateInput): CostGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="v2jrYcZSFJ"></a>

### MockAdversarialGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockAdversarialGateEvaluator: 
Configurable mock for Adversarial Gate (validation only).
Default behavior: pass if all adversarial cases rejected.

**Open Questions:**
- q:UoaOyov5Jt: What are the responsibilities and contract of class `MockAdversarialGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="IYEnhIkCsL"></a>

### setNextResult

**Signature:** `(result: AdversarialGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="uGHbRBh7pD"></a>

### evaluate

**Signature:** `(input: AdversarialGateInput): AdversarialGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="v5kQDSrkg7"></a>

### MockTestCoverageGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockTestCoverageGateEvaluator: 
Configurable mock for Test Coverage Gate (validation only).
Default behavior: pass if coverage meets threshold.

**Open Questions:**
- q:9adL1XeUcr: What are the responsibilities and contract of class `MockTestCoverageGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="ljW8PzjIkK"></a>

### setNextResult

**Signature:** `(result: TestCoverageGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

<a id="LLJ7qGWSxj"></a>

### evaluate

**Signature:** `(input: TestCoverageGateInput): TestCoverageGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

<a id="HABvE87zwr"></a>

### MockReadabilityGateEvaluator

**Visibility:** Public (exported)

**Behavior:**

- Class MockReadabilityGateEvaluator: 
Configurable mock for Readability Gate (validation only).
Default behavior: skip (manual review optional).

**Open Questions:**
- q:XpONNJaeNB: What are the responsibilities and contract of class `MockReadabilityGateEvaluator` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="9MiXdgcGHC"></a>

### setNextResult

**Signature:** `(result: ReadabilityGateResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

**Open Questions:**
- q:wmtLWvKdUP: What is the behavior of method `setNextResult` at src/orchestrator/mocks/mock-gate-evaluators.ts?

<a id="mV1QgGbgsn"></a>

### evaluate

**Signature:** `(input: ReadabilityGateInput): ReadabilityGateResult`

**Visibility:** Public (exported)

**Behavior:**

- Method evaluate (intent unclear from static analysis)

**Open Questions:**
- q:wWrbCfwUOZ: What is the behavior of method `evaluate` at src/orchestrator/mocks/mock-gate-evaluators.ts?

