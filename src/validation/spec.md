# src/validation

**Directory Overview:** This directory contains 30 entities.

## cross-link-validator.ts

<a id="3dLhKhJgUx"></a>

### CrossLinkValidator

**Visibility:** Public (exported)

**Behavior:**

- Class CrossLinkValidator (intent unclear from static analysis)

**Open Questions:**
- q:ISDncA2QWm: What are the responsibilities and contract of class `CrossLinkValidator` at src/validation/cross-link-validator.ts?

<a id="rboifkt5E5"></a>

### validatePreGeneration

**Signature:** `(): ValidationResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validatePreGeneration (intent unclear from static analysis)

**Open Questions:**
- q:CblUBFenqS: What is the behavior of method `validatePreGeneration` at src/validation/cross-link-validator.ts?

<a id="m9JODHtFms"></a>

### buildAnchorMap

**Signature:** `(specFiles: SpecFile[]): Map<string, Anchor>`

**Visibility:** Public (exported)

**Behavior:**

- Method buildAnchorMap (intent unclear from static analysis)

**Open Questions:**
- q:fbz3bYeYd0: What is the behavior of method `buildAnchorMap` at src/validation/cross-link-validator.ts?

<a id="9WFtIBUAYY"></a>

### validatePostGeneration

**Signature:** `(specFiles: SpecFile[], anchorMap: Map<string, Anchor>): ValidationResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validatePostGeneration (intent unclear from static analysis)

**Open Questions:**
- q:EWrjTyD140: What is the behavior of method `validatePostGeneration` at src/validation/cross-link-validator.ts?

## diagnostic-renderer.ts

<a id="IXMn5N0dcn"></a>

### renderDiagnostics

**Signature:** `(diagnostics: GroundingDiagnostic[], options: DiagnosticRenderOptions): string`

**Visibility:** Public (exported)

**Behavior:**

- Function renderDiagnostics: 
Render validation diagnostics to string.


## entity-name-index.ts

<a id="5Pz0ZZNGul"></a>

### EntityNameIndex

**Visibility:** Public (exported)

**Behavior:**

- Class EntityNameIndex: 
Entity name index for fast name-based lookups.
Workaround for KB lacking `findEntityByName()` API.

**Open Questions:**
- q:kmlrVH1yvy: What are the responsibilities and contract of class `EntityNameIndex` at src/validation/entity-name-index.ts?

<a id="2Rj2fNT2o7"></a>

### find

**Signature:** `(name: string): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Method find (intent unclear from static analysis)

**Open Questions:**
- q:xpb9PY3gfb: What is the behavior of method `find` at src/validation/entity-name-index.ts?

## enums.ts

<a id="VCSppH1pAx"></a>

### getAllowedEnumValues

**Signature:** `(predicate: string): Set<string>`

**Visibility:** Public (exported)

**Behavior:**

- Function getAllowedEnumValues: 
Get allowed enum values for a predicate, if any.


<a id="gowsZSHYNJ"></a>

### ENUM_REGISTRY

**Visibility:** Public (exported)

**Behavior:**

- Constant ENUM_REGISTRY (intent unclear from static analysis)

**Open Questions:**
- q:roD0gDTEsZ: What is the purpose of constant `ENUM_REGISTRY` at src/validation/enums.ts?

## fact-schema-interpreter.ts

<a id="V8KZFfkdkN"></a>

### parseFactNumeric

**Signature:** `(factValue: unknown): import("/src/validation/fact-schema-interpreter").NumericFact`

**Visibility:** Public (exported)

**Behavior:**

- Function parseFactNumeric: 
Parse a fact object value into normalized numeric representation.


## grounding-validator.ts

<a id="7PXVQT24v4"></a>

### GroundingValidator

**Visibility:** Public (exported)

**Behavior:**

- Class GroundingValidator: 
GroundingValidator orchestrates all validation rules.
Main entry point for Phase 4 grounding validation.

**Open Questions:**
- q:Gb3OoLSM8L: What are the responsibilities and contract of class `GroundingValidator` at src/validation/grounding-validator.ts?

<a id="rERC2QN9QD"></a>

### validate

**Signature:** `(draftText: string, factSetIds: string[], metadata: ChunkMetadata): GroundingResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validate (intent unclear from static analysis)

## identifier-extractor.ts

<a id="VOh17TplwO"></a>

### extractIdentifiers

**Signature:** `(text: string): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Function extractIdentifiers: 
Extract identifiers from text using pattern matching.


<a id="1Tu8hgrGQ7"></a>

### IdentifierExtractor

**Visibility:** Public (exported)

**Behavior:**

- Class IdentifierExtractor: 
IdentifierExtractor class for extracting identifiers from text.
Not strictly needed but provides encapsulation for future enhancements.

**Open Questions:**
- q:HEJ9PMZ41c: What are the responsibilities and contract of class `IdentifierExtractor` at src/validation/identifier-extractor.ts?

<a id="hQ83ovBm41"></a>

### extract

**Signature:** `(text: string): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Method extract (intent unclear from static analysis)

**Open Questions:**
- q:9WMsU9vswh: What is the behavior of method `extract` at src/validation/identifier-extractor.ts?

## identifier-validator.ts

<a id="bY0HYz1NsC"></a>

### IdentifierValidator

**Visibility:** Public (exported)

**Behavior:**

- Class IdentifierValidator: 
IdentifierValidator validates identifiers against KB.

**Open Questions:**
- q:Q8SnyTLV78: What are the responsibilities and contract of class `IdentifierValidator` at src/validation/identifier-validator.ts?

<a id="7iUwNcCEI6"></a>

### validate

**Signature:** `(identifiers: string[], factSetIds: string[]): ValidationResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validate (intent unclear from static analysis)

**Open Questions:**
- q:Sr1LEtgMyV: What is the behavior of method `validate` at src/validation/identifier-validator.ts?

<a id="9SicnGDgmn"></a>

### validateRelations

**Signature:** `(subjectEntityId: string, targetIdentifiers: string[], factSetIds: string[]): ValidationResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validateRelations (intent unclear from static analysis)

**Open Questions:**
- q:rqHBGEOs5U: What is the behavior of method `validateRelations` at src/validation/identifier-validator.ts?

<a id="bwJKNC7XRc"></a>

### validatePronouns

**Signature:** `(text: string): ValidationResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validatePronouns (intent unclear from static analysis)

**Open Questions:**
- q:WgrSCQHTNt: What is the behavior of method `validatePronouns` at src/validation/identifier-validator.ts?

## lexicon-validator.ts

<a id="juVWXOSR7m"></a>

### LexiconValidator

**Visibility:** Public (exported)

**Behavior:**

- Class LexiconValidator (intent unclear from static analysis)

**Open Questions:**
- q:HunFaXnx96: What are the responsibilities and contract of class `LexiconValidator` at src/validation/lexicon-validator.ts?

<a id="30Qa8oGdpx"></a>

### loadFromMarkdown

**Signature:** `(markdownPath: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Method loadFromMarkdown (intent unclear from static analysis)

**Side effects:**
- filesystem

**Open Questions:**
- q:tIKPqRWSkf: What is the behavior of method `loadFromMarkdown` at src/validation/lexicon-validator.ts?

<a id="wCnxpxcWZ3"></a>

### getRules

**Signature:** `(): Map<string, import("/src/validation/lexicon-validator").LexiconRule>`

**Visibility:** Public (exported)

**Behavior:**

- Method getRules (intent unclear from static analysis)

**Open Questions:**
- q:80n3zri1nf: What is the behavior of method `getRules` at src/validation/lexicon-validator.ts?

<a id="woW0QIpCdP"></a>

### validate

**Signature:** `(draftText: string, factSetIds: string[], metadata: ChunkMetadata): GroundingResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validate (intent unclear from static analysis)

**Open Questions:**
- q:6uNMSbfLws: What is the behavior of method `validate` at src/validation/lexicon-validator.ts?

## mock-validator.ts

<a id="trGO3ElBLG"></a>

### MockValidator

**Visibility:** Public (exported)

**Behavior:**

- Class MockValidator: 
Mock validator that returns configurable results.
Default behavior: accept all chunks.
Use setNextResult() to simulate retry/fallback scenarios in tests.

**Open Questions:**
- q:WgTQYSV2Uz: What are the responsibilities and contract of class `MockValidator` at src/validation/mock-validator.ts?

<a id="DRZIUtKLA4"></a>

### setNextResult

**Signature:** `(result: GroundingResult): void`

**Visibility:** Public (exported)

**Behavior:**

- Method setNextResult (intent unclear from static analysis)

**Errors thrown:**
- new Error(
        `Invalid status: ${result.status}. Must be one of: ${validStatuses.join(', ')}`
      );
- new Error('diagnostics must be an array');
- new Error(
          `Invalid retry attempt: ${result.retryMetadata.attempt}. Must be 0, 1, or 2`
        );
- new Error(
          `Invalid promptKey: ${result.retryMetadata.promptKey}. Must be O, R1, or R2`
        );

<a id="iDuwrco8GQ"></a>

### validate

**Signature:** `(_draft: string, _factSetIds: string[], _metadata: ChunkMetadata): GroundingResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validate (intent unclear from static analysis)

**Open Questions:**
- q:rnUepgyNj2: What is the behavior of method `validate` at src/validation/mock-validator.ts?

## numeric-validator.ts

<a id="JkBqgK5dBU"></a>

### NumericValidator

**Visibility:** Public (exported)

**Behavior:**

- Class NumericValidator: 
NumericValidator validates numeric claims and enum values.

**Open Questions:**
- q:stg3X6EpUI: What are the responsibilities and contract of class `NumericValidator` at src/validation/numeric-validator.ts?

<a id="f9aN8HHXes"></a>

### validate

**Signature:** `(draftText: string, factSetIds: string[]): ValidationResult`

**Visibility:** Public (exported)

**Behavior:**

- Method validate (intent unclear from static analysis)

**Open Questions:**
- q:8F17KhWo1j: What is the behavior of method `validate` at src/validation/numeric-validator.ts?

## retry-controller.ts

<a id="2AdawA57CI"></a>

### RetryController

**Visibility:** Public (exported)

**Behavior:**

- Class RetryController: 
RetryController manages validation retry logic and template fallback.

**Open Questions:**
- q:B5xPLP4CxA: What are the responsibilities and contract of class `RetryController` at src/validation/retry-controller.ts?

<a id="rchFZJu5n1"></a>

### decide

**Signature:** `(validationResult: GroundingResult, metadata: ChunkMetadata, attemptCount: number): import("/src/validation/retry-controller").RetryDecision`

**Visibility:** Public (exported)

**Behavior:**

- Method decide (intent unclear from static analysis)

**Open Questions:**
- q:pjIz2PJSw6: What is the behavior of method `decide` at src/validation/retry-controller.ts?

