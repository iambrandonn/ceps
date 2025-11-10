# LLM Polish Gap Analysis

**Date:** 2025-11-09
**Issue:** Why doesn't the LLM fill in details when static analysis is lacking?
**Status:** 🔴 **ARCHITECTURAL GAP IDENTIFIED**

---

## Problem Statement

User observation: When running ceps with `--llm on`, low-confidence entities (constants/functions with "intent unclear from static analysis") are **not** being improved by the LLM. The LLM polish that should enhance these descriptions is not happening.

---

## Root Cause Analysis

### Current Architecture

The ceps pipeline has two distinct phases:

1. **REASONING Phase** (IntentLifter)
   - Generates `BehaviorChunk.textDraft` from factSets
   - Uses pattern matching (PatternRegistry + PatternMatcher)
   - Falls back to generic templates when no patterns match
   - **Output:** `textDraft = "Function foo (intent unclear from static analysis)"`

2. **GENERATION Phase** (SpecGenerator + MarkdownRenderer)
   - Takes existing `textDraft` from chunks
   - Renders them into Markdown specs
   - **Current behavior:** Directly outputs `chunk.textDraft` without modification
   - **LLM involvement:** None (or minimal)

### The Gap

**Expected behavior** (per SADS.md):
> "LLM budget governor and targeted polishing (only low-confidence/complex modules)"

**Actual behavior:**
- LLM is wired into Generator but **not being invoked** for chunk text
- `textDraft` from IntentLifter is passed through **unchanged** to output
- Low-confidence chunks remain as-is: "intent unclear from static analysis"

---

## Evidence

### 1. IntentLifter generates textDraft (REASONING phase)

```typescript
// src/reasoning/IntentLifter.ts:150
private buildGenericText(entity: Entity, factSet: FactSet): string {
  const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
  if (jsDoc) {
    return `${this.getEntityKindLabel(entity.kind)} ${entity.name}: ${jsDoc}`;
  }

  // No JSDoc or patterns - return generic description
  return `${this.getEntityKindLabel(entity.kind)} ${entity.name} (intent unclear from static analysis)`;
}
```

### 2. MarkdownRenderer outputs textDraft unchanged (GENERATION phase)

```typescript
// src/generator/markdown-renderer.ts:52
if (chunks && chunks.length > 0) {
  md += '**Behavior:**\n\n';
  for (const chunk of chunks) {
    md += `- ${chunk.textDraft}\n`;  // ← Direct output, no LLM polish
  }
}
```

### 3. Spec Generator has LLM wiring but doesn't use it for chunks

```typescript
// src/generator/spec-generator.ts
export interface GeneratorMetrics {
  llmPolished: number;        // ← Tracked but never incremented
  templateFallback: number;   // ← Tracked but never incremented
  budgetExhausted: boolean;
  // ...
}
```

---

## Design Intent vs. Implementation

### From SADS.md

> **§7.2 LLM Gateway**
> "Targeted polishing (only low-confidence/complex modules)"

> **§8 Spec Generator**
> "Draft (templates) → LLM Polish (grounded)"

### From CTS-02 (LLM Gateway)

> "Selective polishing (only low-confidence/complex areas)"

### Current Implementation

- ✅ Templates generated in REASONING phase
- ❌ LLM polish **NOT** applied in GENERATION phase
- ❌ Low-confidence chunks pass through unchanged

---

## Why This Matters

### Quality Improvement Sprint Results

During our quality improvement sprint:
- **Baseline:** 7% High confidence (31/443 entities)
- **After pattern improvements:** 42% High confidence (187/443 entities)
- **Remaining:** 45 Low-confidence entities (10.2%)

**Those 45 Low-confidence entities should be candidates for LLM polish**, but they're being output as-is with "intent unclear from static analysis".

### User's Original Complaint

> "I ran with LLM on. I know some of the code it references is not present... but still... I'm not happy with the specs. There is no way I could regenerate the functionality with the spec it produced."

**Root cause:** The LLM polish step is not implemented. Low-confidence chunks remain generic.

---

## Proposed Solution

### Option 1: Add LLM Polish to IntentLifter (REASONING phase)

**Pros:**
- Chunks get polished text immediately
- KB stores improved descriptions
- Natural place for "understanding" code

**Cons:**
- IntentLifter becomes async (breaking change)
- Mixes reasoning with LLM generation
- Harder to track LLM budget per-file

### Option 2: Add LLM Polish to MarkdownRenderer (GENERATION phase)

**Pros:**
- Matches SADS design: "templates → LLM polish"
- Keeps reasoning deterministic
- Per-file budget tracking easier
- Can be selective based on confidence

**Cons:**
- Chunks in KB still have template text (not polished)
- Polish happens multiple times if entity appears in multiple files

### Option 3: Add LLM Polish Layer Between Reasoning and Generation

**Pros:**
- Clean separation of concerns
- Chunks in KB get polished text once
- Can batch polish for efficiency
- Easy to implement selective polishing

**Cons:**
- Adds new pipeline phase
- Requires KB updates after reasoning

---

## Recommended Approach

**Option 3: New "Polish" Phase**

1. **Add new pipeline phase:** `POLISHING` (between `REASONING` and `PRE_VALIDATION`)

2. **Selective polishing criteria:**
   - Confidence = Low
   - Confidence = Medium AND textDraft contains "intent unclear"
   - Or: any chunk without JSDoc and no pattern match

3. **Implementation:**
   ```typescript
   private async runPolishing(): Promise<void> {
     if (!this.options.llm || !this.llmGateway) {
       return; // Skip if LLM disabled
     }

     const chunks = this.kb.getAllChunks();
     const candidateChunks = chunks.filter(chunk =>
       chunk.confidence === 'Low' ||
       (chunk.confidence === 'Medium' && chunk.textDraft.includes('intent unclear'))
     );

     for (const chunk of candidateChunks) {
       if (this.budgetTracker && this.budgetTracker.isExhausted()) {
         break;
       }

       const entity = this.kb.getEntity(chunk.targetEntityId);
       const factSets = chunk.factSetIds.map(id => this.kb.getFactSet(id));

       const polishedText = await this.llmGateway.polish(
         chunk.textDraft,
         entity,
         factSets
       );

       // Update chunk in KB
       this.kb.updateChunk(chunk.id, {
         ...chunk,
         textDraft: polishedText,
         confidence: 'Medium' // Upgrade confidence after polish
       });
     }
   }
   ```

4. **Add LLMGateway.polish() method:**
   ```typescript
   async polish(
     draftText: string,
     entity: Entity,
     factSets: FactSet[]
   ): Promise<string> {
     const prompt = this.buildPolishPrompt(draftText, entity, factSets);
     return this.callProvider(prompt, { maxTokens: 200 });
   }
   ```

---

## Impact Assessment

### User Experience
- **Before:** "Function buildCache (intent unclear from static analysis)"
- **After:** "Builds and returns a memoized cache object keyed by the provided prefix. Used for performance optimization in data-intensive operations."

### Quality Metrics (Projected)
- Low confidence: 45 → ~10 (estimated 80% improvement)
- High confidence: 187 → ~220 (entities promoted from Low → High via LLM)
- **Gap to target:** 93 entities → ~60 entities remaining

### Cost
- Selective polishing: ~45 Low-confidence entities × 200 tokens = ~9,000 tokens
- At $0.003/1K tokens (Claude Haiku): $0.027 per run on research-coi
- Scalable and cost-effective

---

## Implementation Priority

**Priority:** 🔴 **HIGH**

**Reason:** This is a **fundamental architecture gap** that prevents the tool from delivering on its core promise of "LLM-assisted, not LLM-dependent" specs. Without LLM polish, low-confidence entities remain unusable.

**Effort:** Medium (2-3 hours)
- Add polish phase to orchestrator
- Implement LLMGateway.polish()
- Add tests for selective polishing
- Update metrics tracking

**Blocking:** None (can implement in parallel with pattern work)

---

## Testing Strategy

1. **Unit tests:**
   - Test selective polishing criteria
   - Test LLMGateway.polish() with mock provider
   - Test confidence upgrade after polish

2. **Integration tests:**
   - Run on research-coi with mock LLM
   - Verify only Low/Medium chunks are polished
   - Verify budget tracking works

3. **End-to-end validation:**
   - Run on research-coi with real LLM (Claude Haiku)
   - Compare before/after quality metrics
   - Measure token usage

---

## Conclusion

**Yes, this will be fixed.** The LLM polish step is a designed feature that was never implemented. Adding it as a selective POLISHING phase will:

1. ✅ Improve Low-confidence entities from "intent unclear" to meaningful descriptions
2. ✅ Reduce user frustration with unusable specs
3. ✅ Close the gap to our 63% High-confidence target
4. ✅ Deliver on the SADS promise of "targeted polishing"
5. ✅ Do so cost-effectively (~$0.03 per run on small projects)

**Next step:** Implement Option 3 (Polish Phase) as part of Phase 6 Wave 2 or as a hotfix for Wave 1.
