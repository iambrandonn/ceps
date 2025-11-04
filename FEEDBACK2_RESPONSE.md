# FEEDBACK2.md Response - Private Methods in Spec

## Issue: KB Docs Still Expose Private Helpers

**Problem:** Generated spec continued to list private helper methods (`computeBaseEvidence`, `computeReinforcers`, `computePenalties`, `mergeFactSets`, etc.) as public API despite having `@internal` tags in the code.

**Status:** ✅ **RESOLVED**

---

## Root Cause Analysis

The `@internal` JSDoc tags were added to the code (commit c240afc), but the issue persisted because:

1. **Parser extracts ALL methods**: `fact-extractor.ts` line 111 called `cls.getMethods()` which returns ALL methods including private ones
2. **All methods marked as exported**: Line 134 marked methods with `exported: isExported`, inheriting the class's export status
3. **Spec generator trusts `exported` field**: `markdown-renderer.ts` line 39 simply checks `entity.exported` to determine "Public (exported)" visibility

**Result:** Private methods were extracted as entities, marked as exported, and documented as public API.

**Why @internal tags didn't help:** The parser never checked for `@internal` tags or the `private` modifier - it extracted everything.

---

## Solution

**Added private method filtering to the parser** (commit 0c970dd):

```typescript
// src/parser/fact-extractor.ts:110-115
// Extract methods (skip private methods - they shouldn't be in public API)
cls.getMethods().forEach((method) => {
  // Skip private methods - they're implementation details, not public API
  if (method.hasModifier(SyntaxKind.PrivateKeyword)) {
    return;
  }
  // ... rest of extraction
});
```

**Impact:**
- Extracted entities reduced from **133 to 103** (30 private methods filtered)
- Private helper methods no longer appear in generated specs
- Only true public API is documented

---

## Verification

### Before Fix

```bash
$ grep "computeBaseEvidence\|computeReinforcers" src/kb/spec.md
286:### computeBaseEvidence
296:### computeReinforcers
306:### computePenalties
316:### mergeFactSets
326:### getSubjectId
...
```

### After Fix

```bash
$ grep "computeBaseEvidence\|computeReinforcers" src/kb/spec.md
(no output - private methods removed from spec)

$ grep "getConfidenceScore\|scoreToConfidenceBand\|scoreConfidence" src/kb/spec.md
186:### getConfidenceScore
196:### scoreToConfidenceBand
206:### scoreConfidence
```

**KB Spec Now Shows Only Public Confidence Scoring API:**
- ✅ `getConfidenceScore(factSetIds: string[]): number`
- ✅ `scoreToConfidenceBand(score: number): Confidence`
- ✅ `scoreConfidence(factSetIds: string[]): Confidence`

**Private Helpers Removed:**
- ❌ `computeBaseEvidence`
- ❌ `computeReinforcers`
- ❌ `computePenalties`
- ❌ `mergeFactSets`
- ❌ `getSubjectId`
- ❌ `hasFactPredicate`
- ❌ `clamp`

### Tests Still Pass

```bash
✓ pnpm typecheck    # No TypeScript errors
✓ pnpm test         # 356 tests passing
✓ 94.02% coverage   # Maintained
```

---

## Why Original Approach Didn't Work

**Original attempt (commit c240afc):** Added `@internal` JSDoc tags to private methods.

**Why it failed:**
- Parser doesn't check JSDoc tags during extraction
- Spec generator doesn't filter based on `@internal`
- Both components trust the `exported` field only

**Lesson:** Documentation tags don't affect extraction behavior. Must filter at the source (parser) based on language-level modifiers (`private`, `protected`).

---

## Future Considerations

### Should We Also Check @internal Tags?

**Current implementation:** Only checks `private` modifier

**Potential enhancement:** Also skip methods with `@internal` tag, even if not marked `private`:

```typescript
if (method.hasModifier(SyntaxKind.PrivateKeyword) ||
    hasJSDocTag(method, 'internal')) {
  return;
}
```

**Decision:** Not needed for Phase 3. The `private` modifier is the correct TypeScript way to mark internal implementation. `@internal` tags are primarily for tools like TypeDoc, not for determining extraction behavior.

### What About Protected Methods?

**Current behavior:** Protected methods ARE extracted (only `private` filtered)

**Rationale:** Protected methods are part of the public API for subclasses. They should be documented for users who extend the class.

**If needed:** Can add protected filtering later with same approach:
```typescript
if (method.hasModifier(SyntaxKind.PrivateKeyword) ||
    method.hasModifier(SyntaxKind.ProtectedKeyword)) {
  return;
}
```

---

## Status

✅ **Issue resolved** (commit 0c970dd)

**The spec now correctly reflects the public API contract.**

**Agent 2 can proceed** - KB confidence scoring API is frozen and properly documented:
- `getConfidenceScore()` for numeric scores
- `scoreToConfidenceBand()` for band mapping
- `scoreConfidence()` for direct band computation

All private implementation details are hidden from the public spec.
