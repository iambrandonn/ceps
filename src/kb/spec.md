# src/kb

**Directory Overview:** This directory contains 51 entities.

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

<a id="iwzxkJuwci"></a>

### KnowledgeBase

**Visibility:** Public (exported)

This class represents knowledge base.

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

<a id="3zFh0XtB1X"></a>

### getFactSetsBySubject

**Signature:** `(entityId: string): FactSet[]`

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

<a id="pXM1YRY9rt"></a>

### getAllChunks

**Signature:** `(): BehaviorChunk[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="XxC82zDJ7f"></a>

### getChunksByEntity

**Signature:** `(entityId: string): BehaviorChunk[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="DFeVxJzcJc"></a>

### updateChunk

**Signature:** `(id: string, updates: Partial<BehaviorChunk>): void`

**Visibility:** Public (exported)

This method modifies data.

**Errors thrown:**
- new KBError(`Chunk ${id} not found`);

<a id="aM8atzhc6L"></a>

### insertOpenQuestion

**Signature:** `(oq: OpenQuestion): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="hUXPFFhkwT"></a>

### getOpenQuestionsByEntity

**Signature:** `(entityId: string): OpenQuestion[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="LO8UwtcUUA"></a>

### getAllOpenQuestions

**Signature:** `(): OpenQuestion[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="R2FFeSAqZ6"></a>

### getAnswer

**Signature:** `(qid: string): any`

**Visibility:** Public (exported)

This method retrieves data.

<a id="Vk515Jq8qV"></a>

### getAllAnswers

**Signature:** `(): AnswerRecord[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="S0V9odLOtm"></a>

### attachAnswer

**Signature:** `(qid: string, answer: string, options: { appliedAt?: string } = {}): AnswerRecord`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new KBError(`Cannot attach answer; unknown QID: ${qid}`);

<a id="s6BdPF0LsQ"></a>

### markQIDResolved

**Signature:** `(qid: string): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="Od5sRW09Kq"></a>

### insertRelation

**Signature:** `(relation: Relation): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="IDKlQhvNB9"></a>

### getRelations

**Signature:** `(entityId?: string): Relation[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="EIgF1v95x7"></a>

### replaceRelations

**Signature:** `(relations: Relation[]): void`

**Visibility:** Public (exported)

This method performs an operation.

<a id="aYh0gG993Q"></a>

### getConfidenceScore

**Signature:** `(factSetIds: string[]): number`

**Visibility:** Public (exported)

This method retrieves data.

<a id="cWbqWyYfFJ"></a>

### scoreToConfidenceBand

**Signature:** `(score: number): Confidence`

**Visibility:** Public (exported)

This method performs an operation.

<a id="TgqSMsy50t"></a>

### scoreConfidence

**Signature:** `(factSetIds: string[]): Confidence`

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

<a id="O8vUjATUDX"></a>

### getCallGraph

**Signature:** `(): Map<string, Set<string>>`

**Visibility:** Public (exported)

This method retrieves data.

<a id="ewsWmKwQvj"></a>

### getImportGraph

**Signature:** `(): Map<string, Set<string>>`

**Visibility:** Public (exported)

This method retrieves data.

<a id="ZDva24Vg5q"></a>

### getReverseDeps

**Signature:** `(entityIdOrPath: string): Set<string>`

**Visibility:** Public (exported)

This method retrieves data.

<a id="HRp6cgE4A6"></a>

### serialize

**Signature:** `(): string`

**Visibility:** Public (exported)

This method performs an operation.

<a id="6vqm147RuS"></a>

### deserialize

**Signature:** `(json: string): void`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new KBError(`KB version mismatch: expected 1.0, got ${parsed.version}`);

<a id="NwUvyDyQpk"></a>

### serializeToFile

**Signature:** `(filepath: string): Promise<void>`

**Visibility:** Public (exported)

This method performs an operation.

**Side effects:**
- filesystem

<a id="iQa6hcHRFT"></a>

### deserializeFromFile

**Signature:** `(filepath: string): Promise<void>`

**Visibility:** Public (exported)

This method performs an operation.

**Side effects:**
- filesystem

**Errors thrown:**
- new KBError(`KB state file not found: ${filepath}`);

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

