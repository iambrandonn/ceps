# src/orchestrator/rendering

**Directory Overview:** This directory contains 5 entities.

## run-summary-renderer.ts

<a id="PROwSad1Rn"></a>

### validateRunSummary

**Signature:** `(summary: RunSummary): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Function validateRunSummary: 
Validates run summary against JSON Schema.

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(
      'Run summary validation failed: ' +
        JSON.stringify(validate.errors, null, 2)
    );

<a id="7XacG8Xny7"></a>

### renderJSON

**Signature:** `(summary: RunSummary, validateSchema = true): string`

**Visibility:** Public (exported)

**Behavior:**

- Function renderJSON: 
Renders run summary as formatted JSON string.

<a id="aV6FC4c7Fc"></a>

### renderConsole

**Signature:** `(summary: RunSummary): string`

**Visibility:** Public (exported)

**Behavior:**

- Function renderConsole: 
Renders run summary as console table for human readability.

<a id="92pUI4hmTe"></a>

### writeJSONSummary

**Signature:** `(summary: RunSummary, filePath: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Function writeJSONSummary: 
Writes run summary to JSON file.

**Side effects:**
- filesystem

<a id="tPuMAfBJPz"></a>

### emitRunSummary

**Signature:** `(summary: RunSummary, options: { jsonPath?: string; console?: boolean } = {}): void`

**Visibility:** Public (exported)

**Behavior:**

- Function emitRunSummary: 
Writes run summary to console and optionally to JSON file.

