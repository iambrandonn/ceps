# src/reasoning

**Directory Overview:** This directory contains 10 entities.

## ambiguity-resolver.ts

<a id="FEdm0bgUHf"></a>

### AmbiguityResolver

**Visibility:** Public (exported)

This class represents ambiguity resolver.

<a id="Lrop4qPveS"></a>

### resolve

**Signature:** `(options: ResolutionOptions = {}): import("/src/reasoning/ambiguity-resolver").ResolutionResult`

**Visibility:** Public (exported)

This method performs an operation.

<a id="8B5rnEONBA"></a>

### getAmbiguityQueue

**Signature:** `(): import("/src/reasoning/ambiguity-resolver").AmbiguityItem[]`

**Visibility:** Public (exported)

This method retrieves data.

## IntentLifter.ts

<a id="qMZ3CPf9hT"></a>

### IntentLifter

**Visibility:** Public (exported)

This class represents intent lifter.

<a id="039lFUJcqB"></a>

### liftIntent

**Signature:** `(factSetIds: string[]): import("/src/kb/models").BehaviorChunk`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new Error('No factSets provided');
- new Error(`FactSet ${factSetIds[0]} not found`);
- new Error(`Entity ${subjectId} not found`);

## PatternMatcher.ts

<a id="ZniGtThgOb"></a>

### PatternMatcher

**Visibility:** Public (exported)

This class represents pattern matcher.

<a id="p5tYyljprj"></a>

### match

**Signature:** `(factSet: FactSet): import("/src/reasoning/PatternMatcher").Pattern`

**Visibility:** Public (exported)

This method performs an operation.

## relation-resolver.ts

<a id="nAXe4bO36q"></a>

### RelationResolver

**Visibility:** Public (exported)

This class represents relation resolver.

<a id="hLKOKVngpf"></a>

### resolve

**Signature:** `(relations: Relation[]): import("/src/kb/models").Relation[]`

**Visibility:** Public (exported)

This method performs an operation.

<a id="8m5AhqH2mG"></a>

### buildEntityLookup

**Signature:** `(): Map<string, string[]>`

**Visibility:** Public (exported)

This method performs an operation.

