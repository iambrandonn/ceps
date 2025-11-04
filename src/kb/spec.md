# src/kb

**Directory Overview:** This directory contains 37 entities.

## id-generation.ts

<a id="zGwEulRHrR"></a>

### normalizeContent

**Signature:** `(text: string): string`

**Visibility:** Public (exported)

This function performs an operation.

<a id="VK3K8vYQne"></a>

### generateAnchor

**Signature:** `(slug: string, content: string, existingAnchors: Set<string> = new Set()): string`

**Visibility:** Public (exported)

This function performs an operation.

**Errors thrown:**
- new Error('Anchor collision limit exceeded (99 suffixes)');

<a id="Qd8dKiusxm"></a>

### generateQID

**Signature:** `(filePath: string, entityKey: string, ambiguityKind: string, existingQIDs: Set<string> = new Set()): string`

**Visibility:** Public (exported)

This function performs an operation.

**Errors thrown:**
- new Error('QID collision limit exceeded (99 suffixes)');

## knowledge-base.ts

<a id="plbKDgBvaV"></a>

### KBError

**Visibility:** Public (exported)

This class represents k b error.

<a id="pmPHIoNkIp"></a>

### KnowledgeBase

**Visibility:** Public (exported)

This class represents knowledge base.

<a id="SsXcZhJr4Z"></a>

### createEmptyState

**Signature:** `(): KBState`

**Visibility:** Public (exported)

This method persists data.

<a id="XICE34LPSN"></a>

### getActiveState

**Signature:** `(): KBState`

**Visibility:** Public (exported)

This method retrieves data.

<a id="GOwdaZ3IQh"></a>

### deepCloneEntity

**Signature:** `(entity: Entity): Entity`

**Visibility:** Public (exported)

This method performs an operation.

<a id="Dcf0I5rZCa"></a>

### deepCloneFactSet

**Signature:** `(factSet: FactSet): FactSet`

**Visibility:** Public (exported)

This method performs an operation.

<a id="TO6ojQZaN1"></a>

### deepCloneBehaviorChunk

**Signature:** `(chunk: BehaviorChunk): BehaviorChunk`

**Visibility:** Public (exported)

This method performs an operation.

<a id="b8ibfG9MTr"></a>

### deepCloneState

**Signature:** `(state: KBState): KBState`

**Visibility:** Public (exported)

This method performs an operation.

<a id="j51xwK0SPP"></a>

### insertEntity

**Signature:** `(entity: Entity): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="vUseOXd4Dh"></a>

### updateEntity

**Signature:** `(id: string, updates: Partial<Entity>): void`

**Visibility:** Public (exported)

This method modifies data.

**Errors thrown:**
- new KBError(`Entity not found: ${id}`);

<a id="9o7TxUMGvS"></a>

### removeFromIndices

**Signature:** `(entity: Entity, state: KBState): void`

**Visibility:** Public (exported)

This method removes data.

<a id="z9DK4gI6Aw"></a>

### getEntity

**Signature:** `(id: string): any`

**Visibility:** Public (exported)

This method retrieves data.

<a id="hZOTYZzBUg"></a>

### findByPath

**Signature:** `(path: string): Entity[]`

**Visibility:** Public (exported)

This method performs an operation.

<a id="a9KYnARDDG"></a>

### listExported

**Signature:** `(): Entity[]`

**Visibility:** Public (exported)

This method performs an operation.

<a id="Smy25I3Fno"></a>

### insertFactSet

**Signature:** `(factSet: FactSet): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="QIowuZrw6p"></a>

### getFactSet

**Signature:** `(id: string): any`

**Visibility:** Public (exported)

This method retrieves data.

<a id="earsSbYjln"></a>

### insertChunk

**Signature:** `(chunk: BehaviorChunk): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="737wRiehGm"></a>

### getChunk

**Signature:** `(id: string): any`

**Visibility:** Public (exported)

This method retrieves data.

<a id="P0pAccYbFN"></a>

### insertRelation

**Signature:** `(relation: Relation): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="IDKlQhvNB9"></a>

### getRelations

**Signature:** `(entityId?: string): Relation[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="boPjOxxBVp"></a>

### scoreConfidence

**Signature:** `(_factSetIds: string[]): Confidence`

**Visibility:** Public (exported)

This method performs an operation.

<a id="DJzhC2dZkC"></a>

### neighbors

**Signature:** `(_entityId: string, _relation: string): Entity[]`

**Visibility:** Public (exported)

This method performs an operation.

<a id="AtST8hfcwI"></a>

### listOpenQuestions

**Signature:** `(): { qid: string; entityId: string; text: string; }[]`

**Visibility:** Public (exported)

This method performs an operation.

<a id="ru1eRgbcPl"></a>

### getAllEntities

**Signature:** `(): Entity[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="3sbIbSqnUZ"></a>

### getAllFactSets

**Signature:** `(): FactSet[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="Kf6xb5EDL4"></a>

### allocateQID

**Signature:** `(filePath: string, entityKey: string, ambiguityKind: string): string`

**Visibility:** Public (exported)

This method performs an operation.

<a id="tLrcVQtNqW"></a>

### validateQIDUniqueness

**Signature:** `(qid: string): boolean`

**Visibility:** Public (exported)

This method validates input.

<a id="pw9TewFWjP"></a>

### computeAnchors

**Signature:** `(): void`

**Visibility:** Public (exported)

This method computes values.

<a id="owtvme9BpA"></a>

### beginBatch

**Signature:** `(): void`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new KBError('Batch already in progress');

<a id="mvXIsySlg6"></a>

### commit

**Signature:** `(): void`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new KBError('No batch in progress');

<a id="kgYO1HvMuj"></a>

### rollback

**Signature:** `(): void`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new KBError('No batch in progress');

## models.ts

<a id="QRiSS0HEp0"></a>

### createEntity

**Signature:** `(data: Partial<Entity> & { id: string; kind: EntityKind; name: string; path: string }): import("/src/kb/models").Entity`

**Visibility:** Public (exported)

This function persists data.

**Errors thrown:**
- new Error(`Invalid entity kind: ${data.kind}`);

<a id="zdCuwU3086"></a>

### createFactSet

**Signature:** `(data: Partial<FactSet> & {
    id: string;
    facts: Fact[];
    sources: Source[];
    evidenceScore: number;
  }): import("/src/kb/models").FactSet`

**Visibility:** Public (exported)

This function persists data.

**Errors thrown:**
- new Error('evidenceScore must be between 0 and 100');

<a id="vQXvV6r0IN"></a>

### createBehaviorChunk

**Signature:** `(data: BehaviorChunk): import("/src/kb/models").BehaviorChunk`

**Visibility:** Public (exported)

This function persists data.

**Errors thrown:**
- new Error('BehaviorChunk must reference at least one factSet');

