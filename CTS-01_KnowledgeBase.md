# CTS-01 — Knowledge Base & Fact Model

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Entity schema, factSet model, confidence scoring, IDs (anchors/QIDs), storage & indexing, APIs, acceptance.

---

## 1) Purpose & Position
The **Knowledge Base (KB)** is ceps’s authoritative internal model. It stores entities (modules/functions/classes/etc.), relations, factSets (with provenance), behavior chunks, confidence bands, anchors, and QIDs. All downstream components (reasoning, LLM, generator, finalization) operate on the KB contracts.

---

## 2) Data Model

### 2.1 TypeScript Interfaces (Implementation Contracts)

```typescript
// ---------- Core enums & utility types ----------
export type EntityKind =
  | 'module' | 'file' | 'export' | 'class' | 'method' | 'function'
  | 'constant' | 'config' | 'endpoint' | 'event';

export type Confidence = 'High' | 'Medium' | 'Low';

export interface SourceRange {
  start: number; // byte offset in normalized text
  end: number;   // exclusive
}

export interface Source {
  kind: 'ast' | 'aux' | 'derived';
  file?: string;                 // repo-relative POSIX path
  range?: SourceRange;           // offsets (not line/col) for determinism
  reader?: string;               // e.g., 'openapi', 'tests', 'env', 'sql'
}

// ---------- Graph facts ----------
export interface Relation {
  subjectId: string;             // entity id
  predicate:
    | 'imports' | 'exports' | 'calls'
    | 'reads' | 'writes' | 'publishes' | 'subscribes'
    | 'uses-config' | 'uses-env';
  objectId?: string;             // target entity id (if applicable)
  details?: Record<string, unknown>; // e.g., HTTP method, topic name
  source?: Source;               // provenance
}

export interface Fact {
  subjectId: string;
  predicate: string;             // normalized predicate key (see Relation)
  object?: unknown;
  qualifiers?: Record<string, unknown>;
  source?: Source;
}

// ---------- FactSet & behavior chunks ----------
export interface FactSet {
  id: string;                    // content-addressed (hash)
  facts: Fact[];                 // atomic, normalized
  sources: Source[];             // union of fact sources
  evidenceScore: number;         // 0..100 (used for weighting)
  parents?: string[];            // lineage for derived facts
}

export interface BehaviorChunk {
  id: string;
  targetEntityId: string;
  textDraft: string;             // prose/bullets (pre-style-normalization)
  factSetIds: string[];          // usually 1..3
  confidence: Confidence;
  assumptions?: string[];        // optional, for Medium confidence
}

// ---------- Entities & KB ----------
export interface Entity {
  id: string;                    // content-addressed stable id
  kind: EntityKind;
  name: string;
  path: string;                  // repo-relative POSIX path
  packageId?: string;
  signature?: string;            // human-readable signature (if applicable)
  visibility?: 'public' | 'internal';
  exported?: boolean;
  attributes?: {
    sideEffects?: string[];      // e.g., 'writes: db.users', 'network: GET /api/x'
    errors?: string[];           // e.g., 'throws AuthError'
    configInfluences?: string[]; // e.g., 'uses RATE_LIMIT'
    concurrencyNotes?: string[]; // e.g., 'async retry with backoff'
  };
  anchors?: string[];            // generated stable anchors
  qids?: string[];               // open question ids associated with this entity
}

// KB holds both embedded relations and global indices.
export interface KnowledgeBase {
  entities: Map<string, Entity>;
  relations: Relation[];         // append-only list
  factSets: Map<string, FactSet>;
  chunks: Map<string, BehaviorChunk>;
  // Indices
  byPath: Map<string, string[]>; // path -> [entityId]
  byKind: Map<EntityKind, string[]>;
  exported: Set<string>;         // entityIds
  callGraph: Map<string, string[]>;      // caller -> callees
  importGraph: Map<string, string[]>;    // module -> imports
  reverseDeps: Map<string, string[]>;    // entity -> dependents
}
```

### 2.2 Relation Storage
Relations are stored in **both** locations:
- **Embedded:** `Entity.attributes` for human-friendly summaries
- **Global:** `relations[]` list plus graph indices (`callGraph`, `importGraph`, `reverseDeps`) for algorithms and finalization scope. The global list is the **source of truth** used by generators and validators.

### 2.3 IDs & Hashing
- **Hash algorithm:** SHA-256, base62-encoded
- **Anchors:** first 60 bits → 10 base62 chars (slugified heading + short content hash)
- **QIDs:** `q:<10-char base62 hash>` over `(filePath + entityKey + ambiguityKind)`
  - On collision → extend to 96 bits (16 chars)
  - If still collides → suffix `-n` with sequential integers starting at 2 (cap at `-99`)
- **Content normalization:** Unicode NFKC, lowercase, collapse whitespace to single spaces, trim, strip surrounding punctuation. Path separators normalized to POSIX `/`.

---

## 3) Confidence Scoring

### 3.1 Algorithm
- **Starting score:** 0 (all evidence is additive)
- **Combination logic:** Simple additive model of applicable weights
- **Clamping:** Final score clamped to `[0, 100]`

### 3.2 Weighted Rule Model (initial defaults)
- **Base evidence:** direct code facts (+30), consistent multi-site usage (+15), types present (+10), clear JSDoc/comment (+25)
- **Reinforcers:** matched framework pattern (+15), corroborating test/assertion (+10), config tie-in (+5)
- **Penalties:** dynamic/reflective pattern (−30), contradictory test vs code (−20), unresolved indirection (−15)

### 3.3 Concrete Example
Scenario: `fetchUser(id: string): Promise<User>`
- Base evidence (direct code facts): **+30** → 30
- Has TypeScript types: **+10** → 40
- Has JSDoc comment: **+25** → 65
- Called consistently in 3 places: **+15** → 80
- Uses `eval()`: **−30** → 50
- Matches Express pattern (middleware/controller): **+15** → **65**

**Final score:** **65 → Medium** (40–69)

### 3.4 Multiple FactSets per Chunk
When multiple factSets contribute to one chunk:
- **Weighted mean:** `score = max(0, min(100, Σ(score_i × w_i) / Σ w_i))` where `w_i = evidenceScore_i`
- **Confidence band:** `min(band_i)` across contributing factSets (prevents single strong fact from masking weak/contradictory evidence)

### 3.5 Thresholds & Output Mapping
- **High ≥ 70** → assertive prose
- **Medium 40–69** → assertive prose + optional *Assumptions*
- **Low < 40** → **Open Question**; do not assert

### 3.6 Triage at Max Iterations
Remaining Low items become Open Questions with:
- **Critical** tag if exported/public or on cross-module flows
- **Standard** tag otherwise

---

## 4) Storage, Indexing, and APIs

### 4.1 Storage Model
- **In-memory store** with content-addressed IDs; designed for project-scale
- **Mutability:** Mutable with batch operations; in-place updates permitted
- **Transactions:** `beginBatch()/commit()/rollback()` for multi-entity changes (anchors/QIDs/index rebuilds)
- **Observers:** Optional observer channel for diagnostics (events not required for pipeline logic)

### 4.2 Indices
- By `path`, `exported`, `kind`
- Graph indices: `callGraph`, `importGraph`, `reverseDeps` (for finalization impact scoping)

### 4.3 APIs (Synchronous)
All KB APIs are **synchronous** (in-memory operations):
- `insertEntity`, `updateEntity`, `getEntity`, `findByPath`, `neighbors(entityId, relation)`
- `insertFactSet`, `linkChunkToFactSets`, `scoreConfidence`, `listOpenQuestions`
- `computeAnchors`, `allocateQID`, `validateQIDUniqueness`
- `beginBatch()`, `commit()`, `rollback()`

**Error handling:** Throws typed `KBError` on failure

---

## 5) Acceptance & Tests

- **Grounding Gate**: every emitted chunk cites ≥1 factSet; linkable provenance.  
- **Confidence Gate**: scoring reproduces thresholds; Low → Open Question.  
- **QID/Anchor**: uniqueness and stability across a run; collision policy verified.  
- **Reverse-deps**: correctness tested on synthetic graphs; performance within bounds.

---

## 6) Risks & Mitigations
- Overfitting confidence weights → keep table configurable; calibrate with fixtures.  
- Memory pressure on large repos → prune ASTs; store only normalized facts; lazy-load indices.
