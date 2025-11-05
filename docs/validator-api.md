# Grounding Validator API Reference

**Status:** Interface Frozen (Stage A1 Complete)
**Date:** 2025-11-05
**CTS Reference:** CTS-02 §4.2, §4.4, §6

---

## Overview

The Grounding Validator ensures LLM-generated behavior chunks remain faithful to factSets per SADS §8. It enforces:
- Entity/relation existence checks (no hallucinations)
- Numeric/enum accuracy with tolerance
- Scope enforcement (chunks only reference their declared factSetIds)
- Lexicon normalization (synonyms → canonical terms)
- Pronoun resolution (antecedents within chunk scope)

---

## Core Interface

### `Validator`

```typescript
interface Validator {
  validate(draft: string, factSetIds: string[], metadata: ChunkMetadata): GroundingResult;
}
```

**Parameters:**
- `draft` (string): LLM-generated text to validate
- `factSetIds` (string[]): Array of factSet IDs this chunk must reference
- `metadata` (ChunkMetadata): Chunk context for diagnostics

**Returns:** `GroundingResult` with status and diagnostics

---

## Types

### `ValidationOutcome`

```typescript
type ValidationOutcome = 'accept' | 'retry' | 'fallback';
```

- **`accept`**: Chunk passes all validation rules; use LLM text
- **`retry`**: Validation failed; retry with stricter prompt (R1 or R2)
- **`fallback`**: Persistent failure or budget exhausted; use template baseline

### `GroundingResult`

```typescript
interface GroundingResult {
  status: ValidationOutcome;
  diagnostics: GroundingDiagnostic[];
  retryMetadata?: RetryMetadata;
}
```

**Fields:**
- `status`: Outcome of validation
- `diagnostics`: Array of failed rule diagnostics (empty if status='accept')
- `retryMetadata`: Retry orchestration metadata (present if status='retry')

### `GroundingDiagnostic`

```typescript
interface GroundingDiagnostic {
  chunkId: string;
  rule: 'entity' | 'relation' | 'numeric' | 'enum' | 'scope' | 'lexicon' | 'pronoun';
  reason: string;
  context?: { expected?: unknown; actual?: unknown; location?: string };
}
```

**Fields:**
- `chunkId`: ID of chunk being validated
- `rule`: Which validation rule failed
- `reason`: Human-readable explanation
- `context`: Optional structured details (expected vs actual values, location hint)

**Rule Types:**
- **`entity`**: Referenced entity not found in KB
- **`relation`**: Referenced relation (call/import) not observed
- **`numeric`**: Numeric claim outside tolerance (±5% relative delta)
- **`enum`**: Enum value not in registry (e.g., invalid HTTP method)
- **`scope`**: Reference outside declared factSetIds
- **`lexicon`**: Term not in canonical lexicon (unrecognized synonym)
- **`pronoun`**: Pronoun without valid antecedent in chunk

### `ChunkMetadata`

```typescript
interface ChunkMetadata {
  chunkId: string;
  targetEntityId: string;
  factSetIds: string[];
  confidence: 'High' | 'Medium' | 'Low';
}
```

**Fields:**
- `chunkId`: Generated chunk ID
- `targetEntityId`: Entity this chunk documents
- `factSetIds`: Attribution to factSets (grounding basis)
- `confidence`: Confidence band from KB scoring

### `RetryMetadata`

```typescript
interface RetryMetadata {
  attempt: 0 | 1 | 2;
  promptKey: 'O' | 'R1' | 'R2';
}
```

**Fields:**
- `attempt`: Retry count (0=original, 1=first retry, 2=second retry)
- `promptKey`: Prompt template key for LLM gateway
  - `O`: Original (permissive)
  - `R1`: Retry 1 (stricter constraints)
  - `R2`: Retry 2 (most restrictive, bullet-only)

---

## MockValidator

For testing and integration before full validator implementation:

```typescript
import { MockValidator } from '@/validation/mock-validator.js';

const mock = new MockValidator();

// Default behavior: accept
const result1 = mock.validate(draft, factSetIds, metadata);
// => { status: 'accept', diagnostics: [] }

// Simulate retry scenario
mock.setNextResult({
  status: 'retry',
  diagnostics: [
    {
      chunkId: 'chunk-42',
      rule: 'entity',
      reason: 'Entity "UserService" not found in KB',
      context: { expected: 'UserService', actual: undefined },
    },
  ],
  retryMetadata: { attempt: 1, promptKey: 'R1' },
});

const result2 = mock.validate(draft, factSetIds, metadata);
// => { status: 'retry', diagnostics: [...], retryMetadata: {...} }
```

**Methods:**
- `setNextResult(result: GroundingResult)`: Configure next validation result
  - Validates schema at runtime (throws if invalid)
- `validate(draft, factSetIds, metadata)`: Returns configured result

---

## Usage Examples

### Example 1: Accept Path

```typescript
const validator = new GroundingValidator(kb);

const result = validator.validate(
  'Validates user credentials against database.',
  ['fs-auth-1'],
  {
    chunkId: 'chunk-101',
    targetEntityId: 'func-validateUser',
    factSetIds: ['fs-auth-1'],
    confidence: 'High',
  }
);

if (result.status === 'accept') {
  // Use LLM-generated text
  generator.usePolishedText(result);
}
```

### Example 2: Retry Path

```typescript
const result = validator.validate(
  'Calls AdminService to verify permissions.',
  ['fs-auth-1'],
  metadata
);

if (result.status === 'retry') {
  console.log('Validation failed:', result.diagnostics);
  // => [{ rule: 'entity', reason: 'AdminService not found', ... }]

  const promptKey = result.retryMetadata?.promptKey; // 'R1'
  // LLM gateway uses promptKey to select stricter template
  const retriedText = await llm.retry(promptKey, factSets);
  const result2 = validator.validate(retriedText, factSetIds, metadata);
}
```

### Example 3: Fallback Path

```typescript
const result = validator.validate(draft, factSetIds, metadata);

if (result.status === 'fallback') {
  // After 2 retries or budget exhaustion
  console.warn('Falling back to template:', result.diagnostics);
  generator.useTemplateBaseline(metadata);
}
```

---

## Validation Algorithm

**Decision Flow:**

1. **Extract identifiers** from draft (backticks, PascalCase, camelCase, dotted paths)
2. **Normalize text** using lexicon map; resolve pronouns
3. **Lookup identifiers** via EntityNameIndex (built from `kb.getAllEntities()`)
4. **Validate numerics/enums** against factSet payloads:
   - Unit conversion (ms↔s, KB↔MB, etc.)
   - Tolerance: `|converted - original| / original ≤ 0.05` (5% relative delta)
   - Enums: exact match required
5. **Scope check**: identifiers must belong to declared factSetIds
6. **On failure**: emit diagnostic + retry signal; after 2nd failure → fallback

**Numeric Tolerance Examples:**
- ✅ `5123ms` → "5 seconds" (5000ms, 2.4% delta)
- ❌ `5123ms` → "6 seconds" (6000ms, 17% delta)
- ✅ `127KB` → "0.1 MB" (128KB, 0.8% delta)

**Pronoun Rules:**
- Scope: single chunk only
- First mention must be explicit
- Pronouns allowed after antecedent within chunk

---

## Integration Points

### WS-F2 (LLM Gateway Integration)

```typescript
// LLM gateway wraps validator
const draft = await llm.polish(factSets, style);
const result = validator.validate(draft, factSetIds, metadata);

switch (result.status) {
  case 'accept':
    return draft;
  case 'retry':
    const retryDraft = await llm.retry(result.retryMetadata.promptKey, factSets);
    return validator.validate(retryDraft, factSetIds, metadata);
  case 'fallback':
    return templateGenerator.render(factSets);
}
```

### WS-H (Orchestrator Gates)

```typescript
// Grounding gate checks all chunks
const chunks = kb.getAllChunks();
const failed: GroundingDiagnostic[] = [];

for (const chunk of chunks) {
  if (!chunk.factSetIds || chunk.factSetIds.length === 0) {
    failed.push({
      chunkId: chunk.id,
      rule: 'scope',
      reason: 'Chunk missing factSetIds',
    });
  }
}

if (failed.length > 0) {
  console.error('Grounding gate failed:', failed);
  process.exit(2); // Exit code 2 = gate failure per SADS §6.3
}
```

---

## CTS Traceability

| Interface | CTS Section | Notes |
|-----------|-------------|-------|
| `Validator.validate()` | CTS-02 §6 | Primary validation interface |
| `ValidationOutcome` | CTS-02 §4.3 | Accept/retry/fallback outcomes |
| `GroundingDiagnostic` | CTS-02 §4.2 | Rule-specific diagnostics |
| `RetryMetadata` | CTS-02 §4.4 | Prompt key mapping (O/R1/R2) |
| Numeric tolerance (±5%) | Phase 4 Plan §3.1 | Implementation elaboration |
| Pronoun resolution | Phase 4 Plan §3.1 | Implementation elaboration |

---

## Testing

**Unit tests:** `src/validation/__tests__/validator-contract.test.ts`
**Adversarial suite:** `fixtures/adversarial/phase4/` (Stage G)
**Coverage target:** ≥80% branch coverage

---

## Changelog

- **2025-11-05 (Stage A1):** Initial interface freeze with types and mock validator
- **2025-11-?? (Stage B-D):** Full validator implementation
- **2025-11-?? (Stage E):** Retry controller integration
- **2025-11-?? (Stage F):** Diagnostics and debug traces
- **2025-11-?? (Stage G):** Adversarial test suite
