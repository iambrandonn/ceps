# Architecture Pivot: From Fact-Based Reasoning to LLM-First Analysis

**Date:** 2025-11-09
**Decision:** Pivot to Option A (LLM-First Architecture)
**Status:** Planning Phase

---

## Executive Summary

After implementing Phase 6 Wave 1 and analyzing output quality on real codebases, we've identified a fundamental architectural mismatch between our implementation approach and the PRD's core objective. We are pivoting from a fact-extraction + pattern-matching + grounding architecture to an LLM-first approach that directly analyzes source code to generate behavioral specifications.

**Core insight:** Static analysis facts are insufficient for behavioral specifications. LLMs analyzing source code directly can infer intent, explain conditional logic, and produce reconstruction-ready specs—which is what the PRD promises.

---

## The Problem Statement

### PRD Promise (PRD2.md)
> "A capable LLM, given only these specs, can reconstruct an equivalent or improved implementation."

### Current Reality (research-coi output)
- `buildCache()`: "Builds cache based on keyPrefix" ❌ Not reconstructable
- `formatDate()`: "Formats date based on date and timezone" ❌ No format details
- 37 constants: Raw initializer text with no semantic meaning
- 28 functions: "intent unclear from static analysis"

### What the Source Code Actually Shows
```javascript
export function buildCache (keyPrefix, options) {
  if (process.env.REDIS_HOST) {
    return redisCache(...)  // Conditional: Redis if env var present
  } else {
    return memCache(...)     // Fallback: LRU cache otherwise
  }
}
```

**The spec SHOULD say:**
> "Conditionally returns a Redis-backed cache if REDIS_HOST environment variable is set, otherwise returns an in-memory LRU cache. Both implementations provide async get/set/del methods with keyPrefix namespacing and TTL support."

**Current spec says:**
> "Builds cache based on keyPrefix."

**Gap:** The parser doesn't extract "checks environment variable and conditionally returns" as facts. The LLM is grounded to useless facts and produces useless output.

---

## Root Cause Analysis

### The Grounding Constraint Paradox

**SADS.md design principle:**
> "LLM-assisted, not LLM-dependent: Deterministic templates + optional LLM polish"

**CTS-02 grounding rules:**
- No new entities not in factSets
- No new relations not in extracted graph
- Numeric/enum strict equality
- Must reference only declared factSet(s)

**Result:** The grounding validator prevents the LLM from stating **obvious truths visible in source code** because they weren't pre-extracted as "facts."

### Why Pattern Matching Hit Diminishing Returns

**Progress so far:**
- Baseline: 7% High confidence (31/443 entities)
- After Express patterns: 42% High confidence (187/443 entities)
- Target: 63% High confidence (280/443 entities)

**Reality check:**
- We've added 8 pattern modules with 220 tests
- We've gone from 7% → 42% (a 6x improvement)
- To reach 63% requires covering the remaining 93 entities
- These are the **long tail**: constants, utility functions, domain-specific logic
- Each needs hyper-specific patterns (e.g., "cache builder pattern", "date formatter pattern", "feature flag pattern")

**Cost-benefit analysis:**
- Pattern development: ~2-3 hours per module
- To cover 93 entities: ~15-20 more pattern modules
- Estimated effort: 30-60 hours
- Maintenance burden: Every new framework/pattern needs new extraction logic
- Brittleness: Small code changes break pattern matches

### What We Learned from the Polish Phase

The polish phase (implemented per llm-polish-gap-analysis.md) was supposed to fix Low-confidence entities. But it's constrained by the same grounding rules:

```typescript
// Polish prompt (src/llm/gateway.ts:264)
"Stay grounded in the facts provided - do not invent behavior"
```

The LLM **can see the facts** but **cannot infer from source code** because we're not giving it the source code. We're giving it extracted facts like:
- `buildCache is-function true`
- `buildCache has-parameter keyPrefix`
- `buildCache has-parameter options`

An LLM analyzing the actual source would immediately understand the Redis/memory branching logic. But our architecture prevents this.

---

## Why LLM-First Works Better

### The Core Insight

**LLMs are excellent at code comprehension.** They can:
- Infer behavioral intent from implementation details
- Explain conditional logic and decision points
- Understand environment variable usage and configuration
- Recognize common patterns (caching, error handling, retries, etc.)
- Synthesize multi-file context
- Express behavior in natural language

**Static analysis is excellent at structural extraction.** It can:
- Build call graphs and dependency trees
- Extract type signatures
- Find imports/exports
- Detect side effects (I/O, network, DB)

**Optimal architecture:** Use static analysis for structure, LLM for semantics.

### Cost-Quality Trade-off

| Metric | Fact-Based (Current) | LLM-First (Proposed) |
|--------|---------------------|----------------------|
| **High confidence %** | 42% | 80%+ (estimated) |
| **Reconstructability** | Low (not PRD-compliant) | High (PRD-compliant) |
| **Development effort** | 30-60 hours remaining | 10-15 hours (simplification) |
| **Maintenance burden** | High (brittle patterns) | Low (prompt tuning) |
| **LLM cost per run** | ~$0.03 (polish only) | ~$2-5 (full analysis) |
| **Determinism** | High | Medium (temp=0 helps) |

**Key insight:** We're spending engineering time to avoid LLM cost, but producing unusable output. Better to spend $2-5 per run and deliver on the PRD.

### Addressing Concerns

**Concern: "Won't the LLM hallucinate?"**
- **Reality:** Grounding isn't preventing hallucination; it's preventing legitimate inference
- **Solution:** LLM sees actual source code (ground truth)
- **Validation:** Cross-reference checker flags invented entities/relations
- **Review process:** Multi-pass review catches inconsistencies

**Concern: "Won't it be non-deterministic?"**
- **Reality:** With temperature=0 and structured prompts, LLMs are quite stable
- **Evidence:** OpenAI/Anthropic's code models are used in production for deterministic tasks
- **Solution:** Seed consistency checks; flag drift in CI

**Concern: "What about the grounding we built?"**
- **Preserve:** Cross-link validation (anchor checking, broken link detection)
- **Preserve:** Entity tracking in KB (prevent duplicates, maintain IDs)
- **Preserve:** Coverage gates (all exports documented)
- **Remove:** Chunk-level factSet grounding, pattern matching, ambiguity resolution

---

## Proposed Architecture (LLM-First)

### High-Level Pipeline

```
Scan → Parse (structure) → LLM Analyze (semantics) → Generate → Validate
```

**Detailed flow:**

1. **Scanner** (Keep as-is)
   - Discover files, build file index
   - Detect monorepo packages
   - Honor ignore rules

2. **Parser** (Simplify)
   - Extract: exports, signatures, imports, AST structure
   - Extract: call sites, I/O operations (for side-effect detection)
   - Store: entity metadata in KB
   - **Remove:** Fact extraction, predicate/object model

3. **LLM Analyzer** (New component)
   - **Input:** Entity metadata + full source code
   - **Process:** Generate behavioral description via LLM
   - **Output:** BehaviorChunk with textDraft + confidence
   - **Batching:** Process entities per file (reduce API calls)
   - **Model selection:** Haiku for simple entities, Sonnet for complex

4. **Review Pass** (New component, optional)
   - **Input:** Generated specs + source code
   - **Process:** LLM reviews specs for completeness/accuracy
   - **Output:** Revision suggestions
   - **Iteration:** Up to 2 review cycles

5. **Generator** (Simplify)
   - Render specs from behavior chunks
   - Generate anchors, cross-links
   - Emit root + per-directory spec.md

6. **Validator** (Simplify)
   - **Keep:** Cross-link validation, coverage gate
   - **Keep:** Broken reference detection
   - **Remove:** Grounding validator, factSet validation

### Components to Remove

**Major deletions (complexity reduction):**
- `IntentLifter` (reasoning/IntentLifter.ts)
- `PatternMatcher` (reasoning/PatternMatcher.ts)
- `PatternRegistry` (reasoning/patterns/*)
- `AmbiguityResolver` (reasoning/ambiguity-resolver.ts)
- `GroundingValidator` (validation/grounding-validator.ts)
- All pattern modules (express, http-clients, shared, mongoose)
- Pattern tests (~220 tests)

**Estimated LOC reduction:** ~8,000 lines (35% of codebase)

**Test reduction:** ~220 tests → ~50 tests (focusing on pipeline, not patterns)

### Components to Preserve

**Keep (high value):**
- Knowledge Base (entity/relation tracking)
- Scanner & Parser (file discovery, AST extraction)
- Spec Generator (Markdown rendering, anchor generation)
- Cross-link Validator (reference integrity)
- Orchestrator (pipeline coordination)
- LLM Gateway (provider adapters, caching, budget)

### New Components

**LLM Analyzer** (~300 lines)
```typescript
export class LLMAnalyzer {
  async analyzeEntity(
    entity: Entity,
    sourceCode: string,
    context: AnalysisContext
  ): Promise<BehaviorChunk> {
    // Build analysis prompt
    const prompt = this.buildPrompt(entity, sourceCode, context);

    // Get description from LLM
    const description = await this.llmGateway.analyze(prompt, {
      model: this.selectModel(entity),
      temperature: 0,
    });

    // Parse response
    return {
      id: generateId(),
      targetEntityId: entity.id,
      textDraft: description,
      confidence: this.inferConfidence(description),
      factSetIds: [], // No longer needed
    };
  }

  private buildPrompt(entity: Entity, source: string, ctx: AnalysisContext): string {
    return `Analyze this ${entity.kind} and generate a behavioral specification.

Entity: ${entity.kind} "${entity.name}"
File: ${entity.path}

Source code:
\`\`\`javascript
${source}
\`\`\`

${ctx.imports ? `Imports: ${ctx.imports.join(', ')}` : ''}
${ctx.exports ? `Exports: ${ctx.exports.join(', ')}` : ''}

Requirements:
- Explain WHAT it does and WHY (behavioral intent)
- Include: inputs, outputs, return values, side effects
- Include: error handling, edge cases, conditional logic
- Include: environment variables, configuration, external dependencies
- Use present tense, active voice (e.g., "validates", "returns", "emits")
- Be concise but complete (2-4 sentences for functions, 1-2 for constants)
- Focus on behavior, not implementation algorithms
- If behavior is obvious from name/signature, still explain key details

Output format (description only, no preamble):`;
  }

  private selectModel(entity: Entity): string {
    // Use Haiku for simple entities (cost optimization)
    if (entity.kind === 'constant' || entity.kind === 'export') {
      return 'claude-3-5-haiku-20241022';
    }
    // Use Sonnet for complex entities (quality optimization)
    if (entity.kind === 'class' || this.isComplexFunction(entity)) {
      return 'claude-sonnet-4-5-20250929';
    }
    return 'claude-3-5-haiku-20241022';
  }
}
```

**Review Agent** (~200 lines, optional for v1)
```typescript
export class ReviewAgent {
  async review(
    spec: SpecDocument,
    sourceFiles: Map<string, string>
  ): Promise<ReviewFeedback[]> {
    const prompt = this.buildReviewPrompt(spec, sourceFiles);

    const feedback = await this.llmGateway.review(prompt, {
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0,
    });

    return this.parseFeedback(feedback);
  }

  private buildReviewPrompt(spec: SpecDocument, sources: Map<string, string>): string {
    return `Review this specification for completeness and accuracy.

Specification:
${spec.content}

Source code available for reference:
${Array.from(sources.entries()).map(([path, code]) => `
File: ${path}
\`\`\`javascript
${code}
\`\`\`
`).join('\n')}

Review checklist:
- Are all exported entities described?
- Do descriptions match actual behavior in source code?
- Are side effects (I/O, network, state changes) documented?
- Are error conditions and edge cases covered?
- Are environment variables and configuration mentioned?
- Is conditional logic explained?
- Are descriptions reconstructable (could an LLM regenerate code from this)?

For each issue found, provide:
- Entity name
- Issue type (missing detail, inaccurate, incomplete, etc.)
- Suggested improvement

Output format (JSON array of issues):`;
  }
}
```

---

## Migration Strategy

### Phase 1: Proof of Concept (2-3 days)

**Goal:** Validate LLM-first approach produces better output

**Tasks:**
1. Create `LLMAnalyzer` prototype
2. Run on 10 sample entities from research-coi
3. Compare output quality vs current approach
4. Measure token usage and cost
5. Document findings

**Success criteria:**
- 8/10 entities have reconstructable descriptions
- Token cost < $0.50 for 10 entities (~$2.50 per 100)
- Descriptions include conditional logic and side effects

**Decision point:** If PoC fails, revisit Option B (loosen grounding)

### Phase 2: Core Integration (1 week)

**Goal:** Replace pattern-based reasoning with LLM analysis

**Tasks:**
1. Implement `LLMAnalyzer` with full prompt engineering
2. Update Orchestrator pipeline:
   - Remove REASONING phase (IntentLifter)
   - Remove AMBIGUITY_RESOLUTION phase
   - Add LLM_ANALYSIS phase
3. Update Parser to provide source code snippets
4. Add model selection logic (Haiku vs Sonnet)
5. Preserve cross-link validation

**Tests:**
- Integration test: research-coi end-to-end
- Cost test: Measure token usage per entity
- Quality test: Sample 20 entities, verify reconstructability

### Phase 3: Cleanup & Optimization (3-4 days)

**Goal:** Remove legacy components, optimize performance

**Tasks:**
1. Delete pattern modules and tests
2. Delete IntentLifter, PatternMatcher, AmbiguityResolver
3. Delete GroundingValidator
4. Update KB schema (remove factSet grounding)
5. Optimize batching (analyze multiple entities per LLM call)
6. Add caching for repeated entities

**Tests:**
- Verify all existing integration tests pass
- Coverage should remain >90% (fewer lines to cover)
- Performance: research-coi completes in <5 minutes

### Phase 4: Review Agent (Optional, 2-3 days)

**Goal:** Add quality improvement via LLM review iterations

**Tasks:**
1. Implement ReviewAgent
2. Add review pass to pipeline
3. Add revision iteration logic
4. Document review process

**Tests:**
- Review agent finds real issues in specs
- Revisions improve reconstructability
- Cost remains under $5 per project

### Phase 5: Documentation & Validation (2 days)

**Goal:** Update docs, validate against PRD, prepare for release

**Tasks:**
1. Update SADS.md (architecture changes)
2. Update CTS documents (remove grounding, add LLM Analyzer)
3. Update AGENTS.md (status, approach)
4. Run full test suite
5. Validate PRD compliance on 3 test projects

**Success criteria:**
- Research-coi output is reconstructable
- High confidence >75%
- All tests pass
- Documentation accurate

---

## Risk Assessment

### Technical Risks

**Risk: LLM output quality varies**
- **Mitigation:** Temperature=0, structured prompts, review pass
- **Fallback:** Flag low-quality outputs for human review
- **Probability:** Medium
- **Impact:** Medium

**Risk: Cost exceeds expectations**
- **Mitigation:** Model selection (Haiku for simple entities), batching, caching
- **Fallback:** Add budget caps, warn users
- **Probability:** Low
- **Impact:** Low (already budgeted for LLM usage)

**Risk: Non-determinism causes spec drift**
- **Mitigation:** Seed control, consistency checks, regression tests
- **Fallback:** Accept minor wording variation (not semantic drift)
- **Probability:** Medium
- **Impact:** Low (cosmetic changes acceptable)

### Process Risks

**Risk: Pivot takes longer than expected**
- **Mitigation:** Time-boxed phases, clear decision points
- **Fallback:** Abort if PoC fails, return to Option B
- **Probability:** Medium
- **Impact:** Medium (schedule delay)

**Risk: Removing components breaks existing functionality**
- **Mitigation:** Comprehensive integration tests before deletion
- **Fallback:** Revert to git checkpoint
- **Probability:** Low
- **Impact:** High (requires rework)

### Success Probability

**Overall assessment:** **High confidence (80%)**

**Rationale:**
- LLM code comprehension is proven technology
- Simplification reduces complexity and maintenance burden
- PoC will validate before major investment
- Existing pipeline structure provides solid foundation
- Risk mitigations are concrete and testable

---

## Cost Analysis

### Development Cost

**Current architecture (to reach 63% target):**
- Pattern development: 30-60 hours
- Testing: 15-20 hours
- Maintenance: Ongoing (10-20 hours per year)
- **Total:** 45-80 hours + ongoing maintenance

**LLM-first pivot:**
- PoC: 16-24 hours
- Core integration: 40 hours
- Cleanup: 24-32 hours
- Review agent: 16-24 hours (optional)
- Documentation: 16 hours
- **Total:** 96-120 hours (one-time)

**Break-even:** After 1-2 maintenance cycles, LLM-first is cheaper

### Runtime Cost

**Current architecture:**
- LLM polish: ~$0.03 per run (research-coi, 45 entities)
- Scales linearly with Low-confidence entities

**LLM-first architecture:**
- Small projects (100-200 entities): ~$0.50-1.00
- Medium projects (500-1000 entities): ~$2.00-5.00
- Large projects (2000+ entities): ~$10-20

**Cost optimization strategies:**
- Use Haiku for 70%+ of entities (10x cheaper than Sonnet)
- Batch entities per file (reduce API overhead)
- Cache results for unchanged entities (finalization workflow)
- Budget caps to prevent runaway costs

**User perception:** $2-5 for a one-time codebase analysis is reasonable (comparable to human hours)

---

## Success Metrics

### Quality Metrics (research-coi)

**Current baseline:**
- High confidence: 42% (187/443)
- Low confidence: 10% (45/443)
- Reconstructable: ~30% (estimated)

**LLM-first targets:**
- High confidence: >75% (330+/443)
- Low confidence: <5% (20/443)
- Reconstructable: >90% (400+/443)

**Validation method:**
- Sample 50 entities randomly
- Human review: "Can I reconstruct this from the spec?"
- Pass rate must exceed 90%

### Performance Metrics

**Current baseline:**
- research-coi runtime: ~2 minutes (LLM disabled)
- Test suite: 1155 tests in ~45 seconds

**LLM-first targets:**
- research-coi runtime: <5 minutes (LLM enabled)
- Test suite: ~900 tests in ~30 seconds (fewer pattern tests)

### Maintenance Metrics

**Current baseline:**
- Codebase: ~23,000 lines
- Pattern modules: 8 modules, ~3,000 lines
- Test files: 92 files, ~15,000 lines

**LLM-first targets:**
- Codebase: ~15,000 lines (-35%)
- Pattern modules: 0 (-100%)
- Test files: ~70 files (-24%)

---

## Decision Rationale

### Why Now?

1. **Empirical evidence:** We've implemented the designed architecture and measured its output. The data is conclusive: it doesn't meet the PRD.

2. **Phase 6 timing:** We're at a natural breakpoint. Express patterns are complete but not yet committed to other frameworks. Minimal sunk cost.

3. **Maintenance burden:** Adding 15-20 more pattern modules would commit us to a high-maintenance architecture for diminishing returns.

4. **User feedback:** The original complaint that triggered llm-polish-gap-analysis.md remains valid: "There is no way I could regenerate the functionality with the spec it produced."

### Why Option A (Not Option B)?

**Option B (loosen grounding) doesn't solve the core problem:**
- Still requires fact extraction for every pattern
- Still brittle to code changes
- Still high maintenance burden
- Only marginally improves quality (maybe 50% → 60% reconstructable)

**Option A (LLM-first) addresses root cause:**
- LLM sees source code directly (no fact bottleneck)
- Natural language understanding of semantics
- Low maintenance (prompt tuning vs pattern development)
- Meets PRD promise (>90% reconstructable)

### Alignment with PRD

**PRD2.md core objective:**
> "A capable LLM, given only these specs, can reconstruct an equivalent or improved implementation."

**Current architecture:** ❌ Fails this test (42% quality, ~30% reconstructable)

**LLM-first architecture:** ✅ Designed for this test (>75% quality, >90% reconstructable)

---

## Next Steps

### Immediate Actions (This Week)

1. **Create PoC branch** (`feature/llm-first-poc`)
2. **Implement minimal LLMAnalyzer** (src/llm/analyzer.ts)
3. **Run on 10 entities** from research-coi
4. **Document results** (PIVOT_POC_RESULTS.md)
5. **Team decision:** Go/No-Go on full pivot

### Communication Plan

**Stakeholders to inform:**
- Development team (this document)
- Product owner (if applicable)
- Users (via release notes, only after completion)

**Messaging:**
- "We're improving output quality by simplifying the architecture"
- "Leveraging LLM strengths (code comprehension) while removing brittleness"
- "One-time migration cost, ongoing maintenance savings"

### Rollback Plan

**If PoC fails (<80% reconstructable):**
1. Abandon LLM-first approach
2. Pursue Option B (loosen grounding)
3. Accept 50-60% quality ceiling
4. Communicate PRD limitation to stakeholders

**Rollback triggers:**
- PoC quality <80%
- PoC cost >$1 per 10 entities
- LLM non-determinism unacceptable
- Team consensus against pivot

---

## Conclusion

The fact-based reasoning architecture was a principled design that prioritized determinism and grounding. However, empirical testing reveals it cannot deliver on the PRD's core promise: generating specs that enable code reconstruction.

LLM-first analysis leverages the natural strengths of language models (semantic code understanding) while simplifying our architecture by 35%. The trade-off is reasonable: $2-5 runtime cost and mild non-determinism in exchange for 3x quality improvement and 50% maintenance reduction.

We recommend proceeding with the PoC (2-3 days) to validate this approach. If successful, full migration is estimated at 2-3 weeks with low technical risk.

**The question isn't whether to pivot, but when.** The data says: now.

---

## Appendix: Comparative Examples

### Example 1: buildCache()

**Current output:**
> Builds cache based on keyPrefix.

**LLM-first output (estimated):**
> Conditionally returns a Redis-backed cache if the REDIS_HOST environment variable is set (using ioredis client with optional TLS and authentication), otherwise returns an in-memory LRU cache. Both implementations provide async get/set/del methods with keyPrefix namespacing, JSON serialization, and TTL support via options.stdTTL. The Redis implementation logs warnings on cache errors but continues gracefully.

**Reconstructable?** ✅ Yes (includes environment logic, implementation choice, error handling)

### Example 2: structuredLogger()

**Current output:**
> Creates a structured logging mechanism for server requests, generating verbose, informational, warning, and error log entries with predefined resource and event categories, while validating and tracing request information.

**LLM-first output (estimated):**
> Returns a structured logger for Express requests with log level filtering (verbose/info/warn/error based on LOG_LEVEL environment variable). Validates log payloads require event, msg, and either service or resource keys, logging traces if validation fails. Automatically extracts and attaches request context (URL, method, headers) to all log entries. Exports RESOURCES, EVENTS, and SERVICES constants for standardized log categorization.

**Reconstructable?** ✅ Yes (includes validation logic, log level filtering, request context)

### Example 3: DISCLOSURE_STATUS (constant)

**Current output:**
> Constant `DISCLOSURE_STATUS` is an empty object with no properties.

**LLM-first output (estimated):**
> Constant DISCLOSURE_STATUS maps numeric status codes to descriptive names for disclosure lifecycle states. Includes: IN_PROGRESS (1), SUBMITTED_FOR_APPROVAL (2), UP_TO_DATE (3), REVISION_REQUIRED (4), EXPIRED (5), RESUBMITTED (6), UPDATE_REQUIRED (7), RETURNED (8), and ARCHIVED (9). Used throughout the application for status tracking and UI rendering.

**Reconstructable?** ✅ Yes (includes values, semantics, usage context)

---

**End of Document**
