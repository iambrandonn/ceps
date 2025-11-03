# ceps Knowledge Base API — v1.1 (Phase 1-2)

**Status:** FROZEN (no signature changes to existing APIs)
**Date:** 2025-11-03 (Updated with Phase 2 relation APIs)

---

## Entity Operations

### `insertEntity(entity: Entity): void`
Inserts or updates an entity in the KB.

**Parameters:**
- `entity`: Entity object (id, kind, name, path, ...)

**Behavior:**
- If entity.id already exists, replaces the entity (upsert semantics)
- Updates byPath, byKind, and exported indices automatically
- No duplicate index entries created

**Errors:**
- None (always succeeds)

**Example:**
```typescript
kb.insertEntity({
  id: 'entity-1',
  kind: 'function',
  name: 'fetchUser',
  path: 'src/api/users.ts',
  exported: true
});
```

### `updateEntity(id: string, updates: Partial<Entity>): void`
Updates an existing entity's properties.

**Parameters:**
- `id`: Entity ID
- `updates`: Partial entity object with fields to update

**Behavior:**
- Modifies entity in place
- Updates indices if path, kind, or exported properties change
- Throws if entity not found

**Errors:**
- `KBError`: Entity not found

**Example:**
```typescript
kb.updateEntity('entity-1', { signature: 'fetchUser(id: string): Promise<User>' });
```

### `getEntity(id: string): Entity | undefined`
Retrieves an entity by ID.

**Returns:** Entity object or undefined if not found.

### `findByPath(path: string): Entity[]`
Finds all entities in a given file path.

**Parameters:**
- `path`: Repo-relative POSIX path

**Returns:** Array of entities (may be empty)

### `listExported(): Entity[]`
Lists all entities marked as exported.

**Returns:** Array of exported entities

---

## FactSet Operations

### `insertFactSet(factSet: FactSet): void`
Inserts a factSet into the KB.

### `getFactSet(id: string): FactSet | undefined`
Retrieves a factSet by ID.

---

## BehaviorChunk Operations

### `insertChunk(chunk: BehaviorChunk): void`
Inserts a behavior chunk into the KB.

### `getChunk(id: string): BehaviorChunk | undefined`
Retrieves a chunk by ID.

---

## ID Allocation

### `allocateQID(filePath: string, entityKey: string, ambiguityKind: string): string`
Allocates a unique QID for an open question (idempotent).

**Parameters:**
- `filePath`: File path where ambiguity occurs
- `entityKey`: Entity identifier
- `ambiguityKind`: Type of ambiguity (e.g., 'missing-return-type')

**Returns:** QID string (e.g., `q:a1b2c3d4e5`)

**Behavior:**
- Idempotent: Calling with same inputs multiple times returns the same QID
- Deterministic: Same inputs always produce the same hash
- Handles collisions automatically (extends hash or appends suffix)
- Tracks allocated QIDs internally
- Safe to call multiple times for the same ambiguity

### `validateQIDUniqueness(qid: string): boolean`
Checks if a QID is unique (not already allocated).

**Returns:** `true` if unique, `false` if collision

---

## Batch Operations

### `beginBatch(): void`
Starts a batch transaction.

**Behavior:**
- Creates a deep clone of current state
- All operations after this call modify the batch state
- Throws if batch already in progress

### `commit(): void`
Commits the batch transaction.

**Behavior:**
- Replaces main state with batch state
- Throws if no batch in progress

### `rollback(): void`
Rolls back the batch transaction.

**Behavior:**
- Discards batch state
- Main state remains unchanged
- Throws if no batch in progress

---

## Relation Operations (Phase 2)

### `insertRelation(relation: Relation): void`
Inserts a relation into the KB.

**Parameters:**
- `relation`: Relation object with the following structure:
  - `subjectId`: Entity ID (subject of the relation)
  - `predicate`: Relation type ('imports', 'exports', 'calls', 'reads', 'writes', 'publishes', 'subscribes', 'uses-config', 'uses-env')
  - `objectId`: Entity ID or module specifier (object of the relation)
  - `source` (optional): Source provenance (kind, file, range)
  - `details` (optional): Additional relation metadata

**Behavior:**
- Appends relation to internal relations array
- Used by Parser to store import/export/call relations
- Available in batch transactions (relations are cloned during batch)
- No duplicate checking (relations can be inserted multiple times)

**Errors:**
- None (always succeeds)

**Example:**
```typescript
kb.insertRelation({
  subjectId: 'func-fetchUser-abc123',
  predicate: 'calls',
  objectId: 'func-validateUser-def456',
  source: { kind: 'ast', file: 'src/api/users.ts' }
});
```

### `getRelations(entityId?: string): Relation[]`
Retrieves relations filtered by entity ID.

**Parameters:**
- `entityId` (optional): Filter relations by subject or object entity ID

**Returns:**
- If `entityId` provided: All relations where the entity appears as subject OR object
- If no `entityId`: All relations in the KB

**Example:**
```typescript
// Get all relations involving a specific entity
const relations = kb.getRelations('func-fetchUser-abc123');

// Get all relations in KB
const allRelations = kb.getRelations();
```

---

## Stub APIs (Phase 3 Implementation)

The following APIs are present but stubbed in Phase 1:

### `scoreConfidence(factSetIds: string[]): Confidence`
**Phase 1:** Always returns "Medium"
**Phase 3:** Implements weighted scoring algorithm (CTS-01 §3)

### `neighbors(entityId: string, relation: string): Entity[]`
**Phase 1:** Returns empty array
**Phase 3:** Queries callGraph/importGraph/reverseDeps

### `listOpenQuestions(): Array<{ qid: string; entityId: string; text: string }>`
**Phase 1:** Returns empty array
**Phase 3:** Iterates entities with QIDs and returns formatted questions

### `computeAnchors(): void`
**Phase 1:** No-op (anchors computed inline)
**Phase 3:** May add batch anchor computation

---

## Deferred APIs (Not Yet Implemented)

The following APIs will be added in later phases:

- `buildCallGraph(): void` — Phase 3
- `buildImportGraph(): void` — Phase 3
- `computeReverseDeps(): void` — Phase 3

---

## Error Handling

All errors throw `KBError` with descriptive messages:
- "Entity not found: {id}"
- "Batch already in progress"
- "No batch in progress"

---

## Determinism

When using batch transactions:
- Rollback fully restores state (no side effects)
- Commit atomically replaces state

All operations are synchronous and deterministic.
