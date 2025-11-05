# src/validation

**Directory Overview:** This directory contains 7 entities.

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

