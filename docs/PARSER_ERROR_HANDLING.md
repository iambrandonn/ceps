# Parser Error Handling Documentation

**For Downstream Agents (Agent 3 - Spec Generator)**

---

## Overview

The Parser (`src/parser/parser.ts`) provides two methods for parsing source code:
1. `parse(filePath, source)` - Returns `ParseResult` with errors
2. `parseAndStore(filePath, source, kb)` - Parses and writes to KB, may throw

This document describes error scenarios and how downstream agents should handle them.

---

## Error Scenarios

### 1. Parse Failures (Syntax Errors)

**What happens:**
- ts-morph parser encounters syntax errors
- Errors added to `ParseResult.errors[]` with severity `'error'`
- Entities may be partially extracted (up to error point)
- Parser does **not** throw exceptions

**Example:**
```typescript
const result = await parser.parse('broken.ts', 'export function broken( {');
// result.errors[0].severity === 'error'
// result.errors[0].message contains diagnostic info
// result.entities may be empty or partial
```

**How Agent 3 should handle:**
- ✅ Check `result.errors` before generating specs
- ✅ Include error notes in spec output (e.g., "⚠️ Parse error: ...")
- ✅ Generate specs for successfully parsed entities
- ❌ Don't fail entire spec generation due to one file

---

### 2. KB Write Failures

**What happens:**
- `parseAndStore()` uses batch transactions
- If KB write fails, transaction is rolled back
- Method **throws** the error to caller
- No partial data written to KB

**Example:**
```typescript
try {
  await parser.parseAndStore(filePath, source, kb);
} catch (error) {
  // KB transaction failed and was rolled back
  // Handle error appropriately
}
```

**How Agent 3 should handle:**
- ✅ Wrap `parseAndStore()` calls in try-catch
- ✅ Log errors and continue with next file
- ✅ Track failed files for summary report
- ❌ Don't let one file failure stop entire scan

---

### 3. Pattern Warnings (Dynamic Code)

**What happens:**
- Pattern detector finds dynamic patterns (eval, Proxy, dynamic imports, etc.)
- Warnings added to `ParseResult.errors[]` with severity `'warning'`
- Parsing continues normally
- Entities extracted successfully

**Example:**
```typescript
const result = await parser.parse('dynamic.ts', 'eval(code)');
// result.errors[0].severity === 'warning'
// result.errors[0].message === 'Dynamic pattern detected: eval() reduces static resolvability'
// result.entities still extracted
```

**How Agent 3 should handle:**
- ✅ Generate specs normally
- ✅ Optionally include warnings as notes in spec
- ✅ Flag entities with dynamic patterns for review
- ❌ Don't skip spec generation due to warnings

---

### 4. Babel Fallback (Limited Extraction)

**What happens:**
- ts-morph fails to parse file
- Parser falls back to Babel parser
- Babel parses AST but **limited entity extraction**
- Warning emitted: "Using Babel fallback parser (limited fact extraction)"
- Entities array will be empty or minimal

**Example:**
```typescript
// Edge syntax that ts-morph can't handle
const result = await parser.parse('edge.js', edgeSyntax);
// result.errors[0].message === 'Using Babel fallback parser (limited fact extraction)'
// result.entities.length === 0 (or minimal)
```

**Babel fallback limitations:**
- ❌ No entity extraction (factSets empty)
- ❌ No relation extraction
- ✅ File doesn't crash parser
- ✅ Warning documented in errors array

**How Agent 3 should handle:**
- ✅ Check for Babel fallback warning
- ✅ Generate minimal spec with warning note
- ✅ Skip file if no entities extracted
- ❌ Don't expect full entity data from Babel fallback

---

## ParseResult Structure

```typescript
interface ParseResult {
  filePath: string;           // File that was parsed
  entities: Entity[];         // Extracted entities (may be empty)
  relations: Relation[];      // Extracted relations (may be empty)
  factSets: FactSet[];       // Facts with provenance (may be empty)
  errors: ParseError[];      // Errors and warnings (may be empty)
}

interface ParseError {
  filePath: string;
  message: string;
  severity: 'warning' | 'error';
  location?: {                // Optional location info
    line: number;
    column: number;
  };
}
```

---

## Integration Pattern for Agent 3

### Recommended Approach

```typescript
async function processFile(filePath: string, source: string, kb: KnowledgeBase) {
  try {
    // Parse and store in KB
    const result = await parser.parseAndStore(filePath, source, kb);

    // Check for errors
    const errors = result.errors.filter(e => e.severity === 'error');
    const warnings = result.errors.filter(e => e.severity === 'warning');

    if (errors.length > 0) {
      console.warn(`Parse errors in ${filePath}:`, errors);
      // Still generate specs for partial entities
    }

    if (warnings.length > 0) {
      console.info(`Parse warnings in ${filePath}:`, warnings);
      // Include warnings as notes in spec
    }

    // Check for Babel fallback
    const babelFallback = warnings.some(w => w.message.includes('Babel fallback'));
    if (babelFallback && result.entities.length === 0) {
      console.warn(`Skipping ${filePath} - Babel fallback with no entities`);
      return null; // Skip spec generation
    }

    // Generate spec normally
    return generateSpec(result);

  } catch (error) {
    // KB write failed
    console.error(`Failed to parse ${filePath}:`, error);
    return null; // Skip this file
  }
}
```

---

## Auxiliary Reader Behavior

### TestReader

- **Supported frameworks:** Jest, Vitest, Mocha (describe/it/test syntax)
- **Unsupported:** Jasmine specs, Cypress custom syntax
- **Error handling:** Returns empty factSets if no tests found
- **Never throws:** Safe to call on any file

### ConfigReader

- **Supported formats:** JSON only
- **Unsupported:** YAML, .env (planned for Phase 6)
- **Error handling:** Returns empty factSets on parse errors
- **Never throws:** Safe to call on any file

---

## Common Questions

### Q: What if a file is completely unparseable?

**A:** Parser will:
1. Try ts-morph (fails)
2. Try Babel (may fail)
3. Return `ParseResult` with errors array populated
4. Entities/relations will be empty
5. **Does not throw** - safe to continue

### Q: What if KB write fails during `parseAndStore()`?

**A:** Method will:
1. Rollback transaction
2. **Throw error** to caller
3. No partial data in KB
4. Caller should catch and handle

### Q: How do I know if Babel fallback was used?

**A:** Check for warning:
```typescript
const babelFallback = result.errors.some(e =>
  e.severity === 'warning' &&
  e.message.includes('Babel fallback')
);
```

### Q: Should I skip files with parse errors?

**A:** No, generate specs for partial entities:
- Parse errors often affect only part of file
- Successfully parsed entities are still valid
- Include error notes in spec output
- Only skip if entities array is completely empty

### Q: What about Type errors in TypeScript files?

**A:** Parser captures diagnostics:
- Type errors appear in `errors` array
- Severity is `'error'`
- Entities still extracted (TypeScript continues despite type errors)
- Agent 3 can generate specs normally

---

## Summary for Agent 3

✅ **DO:**
- Check `result.errors` before spec generation
- Generate specs for partial entities (even with errors)
- Catch exceptions from `parseAndStore()`
- Include warnings as notes in spec output
- Skip files only if entities array is empty

❌ **DON'T:**
- Throw errors on parse failures (continue with next file)
- Skip spec generation due to warnings
- Expect full entities from Babel fallback
- Assume all files will parse successfully

---

**Prepared by:** Agent 2 (Parser & Patterns)
**For:** Agent 3 (Spec Generator) Integration
**Date:** 2025-11-03
