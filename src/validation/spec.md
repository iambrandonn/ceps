# src/validation

**Directory Overview:** This directory contains 24 entities.

## cross-link-validator.ts

<a id="3dLhKhJgUx"></a>

### CrossLinkValidator

**Visibility:** Public (exported)

This class represents cross link validator.

<a id="rboifkt5E5"></a>

### validatePreGeneration

**Signature:** `(): ValidationResult`

**Visibility:** Public (exported)

This method validates input.

<a id="m9JODHtFms"></a>

### buildAnchorMap

**Signature:** `(specFiles: SpecFile[]): Map<string, Anchor>`

**Visibility:** Public (exported)

This method performs an operation.

<a id="9WFtIBUAYY"></a>

### validatePostGeneration

**Signature:** `(specFiles: SpecFile[], anchorMap: Map<string, Anchor>): ValidationResult`

**Visibility:** Public (exported)

This method validates input.

## diagnostic-renderer.ts

<a id="IXMn5N0dcn"></a>

### renderDiagnostics

**Signature:** `(diagnostics: GroundingDiagnostic[], options: DiagnosticRenderOptions): string`

**Visibility:** Public (exported)

This function performs an operation.

## entity-name-index.ts

<a id="5Pz0ZZNGul"></a>

### EntityNameIndex

**Visibility:** Public (exported)

This class represents entity name index.

<a id="2Rj2fNT2o7"></a>

### find

**Signature:** `(name: string): string[]`

**Visibility:** Public (exported)

This method performs an operation.

## enums.ts

<a id="VCSppH1pAx"></a>

### getAllowedEnumValues

**Signature:** `(predicate: string): Set<string>`

**Visibility:** Public (exported)

This function retrieves data.

<a id="gowsZSHYNJ"></a>

### ENUM_REGISTRY

**Visibility:** Public (exported)

This constant defines e n u m_ r e g i s t r y.

## fact-schema-interpreter.ts

<a id="V8KZFfkdkN"></a>

### parseFactNumeric

**Signature:** `(factValue: unknown): import("/src/validation/fact-schema-interpreter").NumericFact`

**Visibility:** Public (exported)

This function performs an operation.

## identifier-extractor.ts

<a id="VOh17TplwO"></a>

### extractIdentifiers

**Signature:** `(text: string): string[]`

**Visibility:** Public (exported)

This function performs an operation.

<a id="1Tu8hgrGQ7"></a>

### IdentifierExtractor

**Visibility:** Public (exported)

This class represents identifier extractor.

<a id="hQ83ovBm41"></a>

### extract

**Signature:** `(text: string): string[]`

**Visibility:** Public (exported)

This method performs an operation.

## identifier-validator.ts

<a id="8G0ZySCpuC"></a>

### IdentifierValidator

**Visibility:** Public (exported)

This class represents identifier validator.

<a id="7iUwNcCEI6"></a>

### validate

**Signature:** `(identifiers: string[], factSetIds: string[]): ValidationResult`

**Visibility:** Public (exported)

This method validates input.

<a id="9SicnGDgmn"></a>

### validateRelations

**Signature:** `(subjectEntityId: string, targetIdentifiers: string[], factSetIds: string[]): ValidationResult`

**Visibility:** Public (exported)

This method validates input.

<a id="bwJKNC7XRc"></a>

### validatePronouns

**Signature:** `(text: string): ValidationResult`

**Visibility:** Public (exported)

This method validates input.

## mock-validator.ts

<a id="trGO3ElBLG"></a>

### MockValidator

**Visibility:** Public (exported)

This class represents mock validator.

<a id="DRZIUtKLA4"></a>

### setNextResult

**Signature:** `(result: GroundingResult): void`

**Visibility:** Public (exported)

This method performs an operation.

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

This method validates input.

## numeric-validator.ts

<a id="N7rGlSSihK"></a>

### NumericValidator

**Visibility:** Public (exported)

This class represents numeric validator.

<a id="f9aN8HHXes"></a>

### validate

**Signature:** `(draftText: string, factSetIds: string[]): ValidationResult`

**Visibility:** Public (exported)

This method validates input.

## retry-controller.ts

<a id="2AdawA57CI"></a>

### RetryController

**Visibility:** Public (exported)

This class represents retry controller.

<a id="rchFZJu5n1"></a>

### decide

**Signature:** `(validationResult: GroundingResult, metadata: ChunkMetadata, attemptCount: number): import("/src/validation/retry-controller").RetryDecision`

**Visibility:** Public (exported)

This method performs an operation.

