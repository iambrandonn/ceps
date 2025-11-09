# src/kb

**Directory Overview:** This directory contains 51 entities.

## id-generation.ts

<a id="zGwEulRHrR"></a>

### normalizeContent

**Signature:** `(text: string): string`

**Visibility:** Public (exported)

**Behavior:**

- Function normalizeContent (intent unclear from static analysis)

<a id="VK3K8vYQne"></a>

### generateAnchor

**Signature:** `(slug: string, content: string, existingAnchors: Set<string> = new Set()): string`

**Visibility:** Public (exported)

**Behavior:**

- Function generateAnchor (intent unclear from static analysis)

**Errors thrown:**
- new Error('Anchor collision limit exceeded (99 suffixes)');

<a id="Qd8dKiusxm"></a>

### generateQID

**Signature:** `(filePath: string, entityKey: string, ambiguityKind: string, existingQIDs: Set<string> = new Set()): string`

**Visibility:** Public (exported)

**Behavior:**

- Function generateQID (intent unclear from static analysis)

**Errors thrown:**
- new Error('QID collision limit exceeded (99 suffixes)');

## knowledge-base.ts

<a id="plbKDgBvaV"></a>

### KBError

**Visibility:** Public (exported)

**Behavior:**

- Class KBError (intent unclear from static analysis)

**Open Questions:**
- q:IHulNAZ2VS: What are the responsibilities and contract of class `KBError` at src/kb/knowledge-base.ts?

<a id="iwzxkJuwci"></a>

### KnowledgeBase

**Visibility:** Public (exported)

**Behavior:**

- Class KnowledgeBase (intent unclear from static analysis)

**Open Questions:**
- q:MJwHyqbLkZ: What are the responsibilities and contract of class `KnowledgeBase` at src/kb/knowledge-base.ts?

<a id="j51xwK0SPP"></a>

### insertEntity

**Signature:** `(entity: Entity): void`

**Visibility:** Public (exported)

**Behavior:**

- Method insertEntity (intent unclear from static analysis)

**Open Questions:**
- q:9NG32rE9Bf: What is the behavior of method `insertEntity` at src/kb/knowledge-base.ts?

<a id="vUseOXd4Dh"></a>

### updateEntity

**Signature:** `(id: string, updates: Partial<Entity>): void`

**Visibility:** Public (exported)

**Behavior:**

- Method updateEntity: Updates or modifies data

**Errors thrown:**
- new KBError(`Entity not found: ${id}`);

<a id="z9DK4gI6Aw"></a>

### getEntity

**Signature:** `(id: string): any`

**Visibility:** Public (exported)

**Behavior:**

- Method getEntity: Retrieves data or value

**Open Questions:**
- q:2K0rmU0mWH: What is the behavior of method `getEntity` at src/kb/knowledge-base.ts?

<a id="hZOTYZzBUg"></a>

### findByPath

**Signature:** `(path: string): Entity[]`

**Visibility:** Public (exported)

**Behavior:**

- Method findByPath (intent unclear from static analysis)

**Open Questions:**
- q:N6RhJhEZSf: What is the behavior of method `findByPath` at src/kb/knowledge-base.ts?

<a id="a9KYnARDDG"></a>

### listExported

**Signature:** `(): Entity[]`

**Visibility:** Public (exported)

**Behavior:**

- Method listExported (intent unclear from static analysis)

**Open Questions:**
- q:3wnIpJAR1u: What is the behavior of method `listExported` at src/kb/knowledge-base.ts?

<a id="Smy25I3Fno"></a>

### insertFactSet

**Signature:** `(factSet: FactSet): void`

**Visibility:** Public (exported)

**Behavior:**

- Method insertFactSet (intent unclear from static analysis)

**Open Questions:**
- q:KdTiDG8zob: What is the behavior of method `insertFactSet` at src/kb/knowledge-base.ts?

<a id="QIowuZrw6p"></a>

### getFactSet

**Signature:** `(id: string): any`

**Visibility:** Public (exported)

**Behavior:**

- Method getFactSet: Retrieves data or value

**Open Questions:**
- q:HySXOiNgS2: What is the behavior of method `getFactSet` at src/kb/knowledge-base.ts?

<a id="3zFh0XtB1X"></a>

### getFactSetsBySubject

**Signature:** `(entityId: string): FactSet[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getFactSetsBySubject: Retrieves data or value

**Open Questions:**
- q:BG7iWvuCWI: What is the behavior of method `getFactSetsBySubject` at src/kb/knowledge-base.ts?

<a id="earsSbYjln"></a>

### insertChunk

**Signature:** `(chunk: BehaviorChunk): void`

**Visibility:** Public (exported)

**Behavior:**

- Method insertChunk (intent unclear from static analysis)

**Open Questions:**
- q:Ayj1FPO3UF: What is the behavior of method `insertChunk` at src/kb/knowledge-base.ts?

<a id="737wRiehGm"></a>

### getChunk

**Signature:** `(id: string): any`

**Visibility:** Public (exported)

**Behavior:**

- Method getChunk: Retrieves data or value

**Open Questions:**
- q:q9pcNFU3zC: What is the behavior of method `getChunk` at src/kb/knowledge-base.ts?

<a id="pXM1YRY9rt"></a>

### getAllChunks

**Signature:** `(): BehaviorChunk[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getAllChunks: Retrieves data or value

**Open Questions:**
- q:C5KRx7sMkv: What is the behavior of method `getAllChunks` at src/kb/knowledge-base.ts?

<a id="XxC82zDJ7f"></a>

### getChunksByEntity

**Signature:** `(entityId: string): BehaviorChunk[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getChunksByEntity: Retrieves data or value

**Open Questions:**
- q:ddg1D3sfHo: What is the behavior of method `getChunksByEntity` at src/kb/knowledge-base.ts?

<a id="DFeVxJzcJc"></a>

### updateChunk

**Signature:** `(id: string, updates: Partial<BehaviorChunk>): void`

**Visibility:** Public (exported)

**Behavior:**

- Method updateChunk: Updates or modifies data

**Errors thrown:**
- new KBError(`Chunk ${id} not found`);

<a id="aM8atzhc6L"></a>

### insertOpenQuestion

**Signature:** `(oq: OpenQuestion): void`

**Visibility:** Public (exported)

**Behavior:**

- Method insertOpenQuestion (intent unclear from static analysis)

**Open Questions:**
- q:7lGCLPeJQU: What is the behavior of method `insertOpenQuestion` at src/kb/knowledge-base.ts?

<a id="hUXPFFhkwT"></a>

### getOpenQuestionsByEntity

**Signature:** `(entityId: string): OpenQuestion[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getOpenQuestionsByEntity: Retrieves data or value

**Open Questions:**
- q:CnFwqU3pcM: What is the behavior of method `getOpenQuestionsByEntity` at src/kb/knowledge-base.ts?

<a id="LO8UwtcUUA"></a>

### getAllOpenQuestions

**Signature:** `(): OpenQuestion[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getAllOpenQuestions: Retrieves data or value

**Open Questions:**
- q:rtjdQdIFI8: What is the behavior of method `getAllOpenQuestions` at src/kb/knowledge-base.ts?

<a id="R2FFeSAqZ6"></a>

### getAnswer

**Signature:** `(qid: string): any`

**Visibility:** Public (exported)

**Behavior:**

- Method getAnswer: Retrieves data or value

**Open Questions:**
- q:pFwCN1WCa6: What is the behavior of method `getAnswer` at src/kb/knowledge-base.ts?

<a id="Vk515Jq8qV"></a>

### getAllAnswers

**Signature:** `(): AnswerRecord[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getAllAnswers: Retrieves data or value

**Open Questions:**
- q:1Cy7ndG3oM: What is the behavior of method `getAllAnswers` at src/kb/knowledge-base.ts?

<a id="S0V9odLOtm"></a>

### attachAnswer

**Signature:** `(qid: string, answer: string, options: { appliedAt?: string } = {}): AnswerRecord`

**Visibility:** Public (exported)

**Behavior:**

- Method attachAnswer (intent unclear from static analysis)

**Errors thrown:**
- new KBError(`Cannot attach answer; unknown QID: ${qid}`);

<a id="s6BdPF0LsQ"></a>

### markQIDResolved

**Signature:** `(qid: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Method markQIDResolved (intent unclear from static analysis)

**Open Questions:**
- q:oJGNw3Pn5B: What is the behavior of method `markQIDResolved` at src/kb/knowledge-base.ts?

<a id="Od5sRW09Kq"></a>

### insertRelation

**Signature:** `(relation: Relation): void`

**Visibility:** Public (exported)

**Behavior:**

- Method insertRelation (intent unclear from static analysis)

**Open Questions:**
- q:NwLFrK9zOv: What is the behavior of method `insertRelation` at src/kb/knowledge-base.ts?

<a id="IDKlQhvNB9"></a>

### getRelations

**Signature:** `(entityId?: string): Relation[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getRelations: Retrieves data or value

**Open Questions:**
- q:Vd4enU0wnF: What is the behavior of method `getRelations` at src/kb/knowledge-base.ts?

<a id="EIgF1v95x7"></a>

### replaceRelations

**Signature:** `(relations: Relation[]): void`

**Visibility:** Public (exported)

**Behavior:**

- Method replaceRelations (intent unclear from static analysis)

**Open Questions:**
- q:RjNsm24ZZV: What is the behavior of method `replaceRelations` at src/kb/knowledge-base.ts?

<a id="aYh0gG993Q"></a>

### getConfidenceScore

**Signature:** `(factSetIds: string[]): number`

**Visibility:** Public (exported)

**Behavior:**

- Method getConfidenceScore: Retrieves data or value

**Open Questions:**
- q:rwAcJdRvHD: What is the behavior of method `getConfidenceScore` at src/kb/knowledge-base.ts?

<a id="cWbqWyYfFJ"></a>

### scoreToConfidenceBand

**Signature:** `(score: number): Confidence`

**Visibility:** Public (exported)

**Behavior:**

- Method scoreToConfidenceBand (intent unclear from static analysis)

**Open Questions:**
- q:MKlrZ6KPG3: What is the behavior of method `scoreToConfidenceBand` at src/kb/knowledge-base.ts?

<a id="TgqSMsy50t"></a>

### scoreConfidence

**Signature:** `(factSetIds: string[]): Confidence`

**Visibility:** Public (exported)

**Behavior:**

- Method scoreConfidence (intent unclear from static analysis)

**Open Questions:**
- q:Anw3kjjRe7: What is the behavior of method `scoreConfidence` at src/kb/knowledge-base.ts?

<a id="DJzhC2dZkC"></a>

### neighbors

**Signature:** `(_entityId: string, _relation: string): Entity[]`

**Visibility:** Public (exported)

**Behavior:**

- Method neighbors (intent unclear from static analysis)

**Open Questions:**
- q:4KAdd2eiby: What is the behavior of method `neighbors` at src/kb/knowledge-base.ts?

<a id="AtST8hfcwI"></a>

### listOpenQuestions

**Signature:** `(): { qid: string; entityId: string; text: string; }[]`

**Visibility:** Public (exported)

**Behavior:**

- Method listOpenQuestions (intent unclear from static analysis)

**Open Questions:**
- q:aDBLzNzTyM: What is the behavior of method `listOpenQuestions` at src/kb/knowledge-base.ts?

<a id="ru1eRgbcPl"></a>

### getAllEntities

**Signature:** `(): Entity[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getAllEntities: Retrieves data or value

**Open Questions:**
- q:0oAOzdwOju: What is the behavior of method `getAllEntities` at src/kb/knowledge-base.ts?

<a id="3sbIbSqnUZ"></a>

### getAllFactSets

**Signature:** `(): FactSet[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getAllFactSets: Retrieves data or value

**Open Questions:**
- q:jpDajts0pB: What is the behavior of method `getAllFactSets` at src/kb/knowledge-base.ts?

<a id="Kf6xb5EDL4"></a>

### allocateQID

**Signature:** `(filePath: string, entityKey: string, ambiguityKind: string): string`

**Visibility:** Public (exported)

**Behavior:**

- Method allocateQID (intent unclear from static analysis)

**Open Questions:**
- q:5OXow5lq4F: What is the behavior of method `allocateQID` at src/kb/knowledge-base.ts?

<a id="tLrcVQtNqW"></a>

### validateQIDUniqueness

**Signature:** `(qid: string): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Method validateQIDUniqueness: Validates or checks a condition

**Open Questions:**
- q:1iyjmuB9wL: What is the behavior of method `validateQIDUniqueness` at src/kb/knowledge-base.ts?

<a id="pw9TewFWjP"></a>

### computeAnchors

**Signature:** `(): void`

**Visibility:** Public (exported)

**Behavior:**

- Method computeAnchors (intent unclear from static analysis)

**Open Questions:**
- q:hroUvozbsK: What is the behavior of method `computeAnchors` at src/kb/knowledge-base.ts?

<a id="owtvme9BpA"></a>

### beginBatch

**Signature:** `(): void`

**Visibility:** Public (exported)

**Behavior:**

- Method beginBatch (intent unclear from static analysis)

**Errors thrown:**
- new KBError('Batch already in progress');

<a id="mvXIsySlg6"></a>

### commit

**Signature:** `(): void`

**Visibility:** Public (exported)

**Behavior:**

- Method commit (intent unclear from static analysis)

**Errors thrown:**
- new KBError('No batch in progress');

<a id="kgYO1HvMuj"></a>

### rollback

**Signature:** `(): void`

**Visibility:** Public (exported)

**Behavior:**

- Method rollback (intent unclear from static analysis)

**Errors thrown:**
- new KBError('No batch in progress');

<a id="O8vUjATUDX"></a>

### getCallGraph

**Signature:** `(): Map<string, Set<string>>`

**Visibility:** Public (exported)

**Behavior:**

- Method getCallGraph: Retrieves data or value

**Open Questions:**
- q:CGZ72HMLAk: What is the behavior of method `getCallGraph` at src/kb/knowledge-base.ts?

<a id="ewsWmKwQvj"></a>

### getImportGraph

**Signature:** `(): Map<string, Set<string>>`

**Visibility:** Public (exported)

**Behavior:**

- Method getImportGraph: Retrieves data or value

**Open Questions:**
- q:6yMt5lEYHc: What is the behavior of method `getImportGraph` at src/kb/knowledge-base.ts?

<a id="ZDva24Vg5q"></a>

### getReverseDeps

**Signature:** `(entityIdOrPath: string): Set<string>`

**Visibility:** Public (exported)

**Behavior:**

- Method getReverseDeps: Retrieves data or value

**Open Questions:**
- q:g4PHU9zXAn: What is the behavior of method `getReverseDeps` at src/kb/knowledge-base.ts?

<a id="HRp6cgE4A6"></a>

### serialize

**Signature:** `(): string`

**Visibility:** Public (exported)

**Behavior:**

- Method serialize (intent unclear from static analysis)

**Open Questions:**
- q:vxpB3LEkm0: What is the behavior of method `serialize` at src/kb/knowledge-base.ts?

<a id="6vqm147RuS"></a>

### deserialize

**Signature:** `(json: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Method deserialize (intent unclear from static analysis)

**Errors thrown:**
- new KBError(`KB version mismatch: expected 1.0, got ${parsed.version}`);

<a id="NwUvyDyQpk"></a>

### serializeToFile

**Signature:** `(filepath: string): Promise<void>`

**Visibility:** Public (exported)

**Behavior:**

- Method serializeToFile (intent unclear from static analysis)

**Side effects:**
- filesystem

**Open Questions:**
- q:wwRJITly0d: What is the behavior of method `serializeToFile` at src/kb/knowledge-base.ts?

<a id="iQa6hcHRFT"></a>

### deserializeFromFile

**Signature:** `(filepath: string): Promise<void>`

**Visibility:** Public (exported)

**Behavior:**

- Method deserializeFromFile (intent unclear from static analysis)

**Side effects:**
- filesystem

**Errors thrown:**
- new KBError(`KB state file not found: ${filepath}`);

## models.ts

<a id="QRiSS0HEp0"></a>

### createEntity

**Signature:** `(data: Partial<Entity> & { id: string; kind: EntityKind; name: string; path: string }): import("/src/kb/models").Entity`

**Visibility:** Public (exported)

**Behavior:**

- Function createEntity: Creates or constructs a new instance

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

**Behavior:**

- Function createFactSet: Creates or constructs a new instance

**Errors thrown:**
- new Error('evidenceScore must be between 0 and 100');

<a id="vQXvV6r0IN"></a>

### createBehaviorChunk

**Signature:** `(data: BehaviorChunk): import("/src/kb/models").BehaviorChunk`

**Visibility:** Public (exported)

**Behavior:**

- Function createBehaviorChunk: Creates or constructs a new instance

**Errors thrown:**
- new Error('BehaviorChunk must reference at least one factSet');

