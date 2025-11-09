# src/reasoning

**Directory Overview:** This directory contains 10 entities.

## ambiguity-resolver.ts

<a id="FEdm0bgUHf"></a>

### AmbiguityResolver

**Visibility:** Public (exported)

**Behavior:**

- Class AmbiguityResolver (intent unclear from static analysis)

**Open Questions:**
- q:JfLiDDlxpk: What are the responsibilities and contract of class `AmbiguityResolver` at src/reasoning/ambiguity-resolver.ts?

<a id="Lrop4qPveS"></a>

### resolve

**Signature:** `(options: ResolutionOptions = {}): import("/src/reasoning/ambiguity-resolver").ResolutionResult`

**Visibility:** Public (exported)

**Behavior:**

- Method resolve (intent unclear from static analysis)

<a id="8B5rnEONBA"></a>

### getAmbiguityQueue

**Signature:** `(): import("/src/reasoning/ambiguity-resolver").AmbiguityItem[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getAmbiguityQueue: Retrieves data or value

**Open Questions:**
- q:8tY2wTt4d7: What is the behavior of method `getAmbiguityQueue` at src/reasoning/ambiguity-resolver.ts?

## IntentLifter.ts

<a id="EzJg98ytun"></a>

### IntentLifter

**Visibility:** Public (exported)

**Behavior:**

- Class IntentLifter (intent unclear from static analysis)

**Open Questions:**
- q:xkVaq7elmb: What are the responsibilities and contract of class `IntentLifter` at src/reasoning/IntentLifter.ts?

<a id="jV0av49CKi"></a>

### liftIntent

**Signature:** `(factSetIds: string[]): import("/src/kb/models").BehaviorChunk`

**Visibility:** Public (exported)

**Behavior:**

- Method liftIntent (intent unclear from static analysis)

**Errors thrown:**
- new Error('No factSets provided');
- new Error(`FactSet ${factSetIds[0]} not found`);
- new Error(`Entity ${subjectId} not found`);

## PatternMatcher.ts

<a id="DQFWYtZWdH"></a>

### PatternMatcher

**Visibility:** Public (exported)

**Behavior:**

- Class PatternMatcher (intent unclear from static analysis)

**Open Questions:**
- q:2ZYeMMcn6T: What are the responsibilities and contract of class `PatternMatcher` at src/reasoning/PatternMatcher.ts?

<a id="p5tYyljprj"></a>

### match

**Signature:** `(factSet: FactSet): import("/src/reasoning/PatternMatcher").Pattern`

**Visibility:** Public (exported)

**Behavior:**

- Method match (intent unclear from static analysis)

**Open Questions:**
- q:jFgdlgSidH: What is the behavior of method `match` at src/reasoning/PatternMatcher.ts?

## relation-resolver.ts

<a id="nAXe4bO36q"></a>

### RelationResolver

**Visibility:** Public (exported)

**Behavior:**

- Class RelationResolver: 
Resolves call relations by converting expression text to entity IDs.

Phase 2 parser stores call relations with objectId containing expression text
(e.g., 'app.get(...)', 'myFunction()', 'obj.method()'), not entity IDs.
This resolver converts those expressions to entity IDs to enable graph index construction.

**Phase 2 Integration Realities:**
- Import relations: keyed by file path (not entity ID), no named imports list
- Entity IDs: content-based hashes (not source-ordered)
- No parent-child relationships in Entity model

**Disambiguation Strategy:**
1. Import-based: Prefers entities from files the caller imports (path matching heuristic)
2. Local preference: Prefers entities in same file as caller
3. Export preference: Prefers exported entities over internal ones
4. Qualified names: Handles ClassName.methodName patterns

**Known Limitations:**
- Import disambiguation is approximate (we don't know which specific symbols were imported)
- Same-named methods in multiple classes in same file cannot be reliably distinguished
  (no parent IDs or source positions available from Phase 2)
- External library calls (console.log, fs.readFile) correctly remain unresolved

**Accuracy Target:** ≥80% resolution rate for local codebase calls
(achievable with import/local/export heuristics despite Phase 2 schema limitations)

**Open Questions:**
- q:5lSRNZVeIj: What are the responsibilities and contract of class `RelationResolver` at src/reasoning/relation-resolver.ts?

<a id="hLKOKVngpf"></a>

### resolve

**Signature:** `(relations: Relation[]): import("/src/kb/models").Relation[]`

**Visibility:** Public (exported)

**Behavior:**

- Method resolve (intent unclear from static analysis)

**Open Questions:**
- q:qZ0b34KgOu: What is the behavior of method `resolve` at src/reasoning/relation-resolver.ts?

<a id="8m5AhqH2mG"></a>

### buildEntityLookup

**Signature:** `(): Map<string, string[]>`

**Visibility:** Public (exported)

**Behavior:**

- Method buildEntityLookup (intent unclear from static analysis)

**Open Questions:**
- q:DxZdNsohmR: What is the behavior of method `buildEntityLookup` at src/reasoning/relation-resolver.ts?

