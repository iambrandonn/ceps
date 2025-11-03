import { Entity, FactSet, BehaviorChunk, Relation } from './models.js';
import { EntityKind, Confidence } from '../types/index.js';
import { generateQID } from './id-generation.js';

export class KBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KBError';
  }
}

interface KBState {
  entities: Map<string, Entity>;
  relations: Relation[]; // NOTE: Unused in Phase 1; populated by Parser in Phase 2
  factSets: Map<string, FactSet>;
  chunks: Map<string, BehaviorChunk>;
  byPath: Map<string, Set<string>>; // FIX: Use Set to prevent duplicates
  byKind: Map<EntityKind, Set<string>>;
  exported: Set<string>;
  qids: Set<string>; // Track allocated QIDs
}

export class KnowledgeBase {
  private state: KBState;
  private batch: KBState | null = null;

  constructor() {
    this.state = this.createEmptyState();
  }

  private createEmptyState(): KBState {
    return {
      entities: new Map(),
      relations: [],
      factSets: new Map(),
      chunks: new Map(),
      byPath: new Map(),
      byKind: new Map(),
      exported: new Set(),
      qids: new Set(),
    };
  }

  private getActiveState(): KBState {
    return this.batch ?? this.state;
  }

  // FIX CRITICAL-1 & HIGH-2: Deep clone state properly (including nested arrays/objects)
  private deepCloneEntity(entity: Entity): Entity {
    return {
      ...entity,
      // Clone nested arrays
      anchors: entity.anchors ? [...entity.anchors] : undefined,
      qids: entity.qids ? [...entity.qids] : undefined,
      // Clone nested attributes object and its arrays
      attributes: entity.attributes
        ? {
            sideEffects: entity.attributes.sideEffects
              ? [...entity.attributes.sideEffects]
              : undefined,
            errors: entity.attributes.errors ? [...entity.attributes.errors] : undefined,
            configInfluences: entity.attributes.configInfluences
              ? [...entity.attributes.configInfluences]
              : undefined,
            concurrencyNotes: entity.attributes.concurrencyNotes
              ? [...entity.attributes.concurrencyNotes]
              : undefined,
          }
        : undefined,
    };
  }

  private deepCloneFactSet(factSet: FactSet): FactSet {
    return {
      ...factSet,
      // Clone nested arrays
      facts: factSet.facts.map((f) => ({ ...f })),
      sources: factSet.sources.map((s) => ({ ...s })),
      parents: factSet.parents ? [...factSet.parents] : undefined,
    };
  }

  private deepCloneBehaviorChunk(chunk: BehaviorChunk): BehaviorChunk {
    return {
      ...chunk,
      // Clone nested arrays
      factSetIds: [...chunk.factSetIds],
      assumptions: chunk.assumptions ? [...chunk.assumptions] : undefined,
    };
  }

  private deepCloneState(state: KBState): KBState {
    return {
      // Deep clone entities (clone Map, Entity objects, and nested arrays/objects)
      entities: new Map(
        Array.from(state.entities.entries()).map(([k, v]) => [k, this.deepCloneEntity(v)])
      ),
      // Clone relations array
      relations: [...state.relations],
      // Deep clone factSets (clone Map, FactSet objects, and nested arrays)
      factSets: new Map(
        Array.from(state.factSets.entries()).map(([k, v]) => [k, this.deepCloneFactSet(v)])
      ),
      // Deep clone chunks (clone Map, BehaviorChunk objects, and nested arrays)
      chunks: new Map(
        Array.from(state.chunks.entries()).map(([k, v]) => [k, this.deepCloneBehaviorChunk(v)])
      ),
      // Deep clone index Sets
      byPath: new Map(Array.from(state.byPath.entries()).map(([k, v]) => [k, new Set(v)])),
      byKind: new Map(Array.from(state.byKind.entries()).map(([k, v]) => [k, new Set(v)])),
      // Clone exported Set
      exported: new Set(state.exported),
      // Clone QIDs Set
      qids: new Set(state.qids),
    };
  }

  // -------- Entity Operations --------
  insertEntity(entity: Entity): void {
    const state = this.getActiveState();
    const existingEntity = state.entities.get(entity.id);

    // FIX CRITICAL-3: Remove old index entries if entity already exists (upsert)
    if (existingEntity) {
      this.removeFromIndices(existingEntity, state);
    }

    state.entities.set(entity.id, entity);

    // Update indices with new entity
    if (!state.byPath.has(entity.path)) {
      state.byPath.set(entity.path, new Set());
    }
    state.byPath.get(entity.path)!.add(entity.id);

    if (!state.byKind.has(entity.kind)) {
      state.byKind.set(entity.kind, new Set());
    }
    state.byKind.get(entity.kind)!.add(entity.id);

    if (entity.exported) {
      state.exported.add(entity.id);
    }
  }

  // FIX CRITICAL-4: Update indices when entity properties change
  updateEntity(id: string, updates: Partial<Entity>): void {
    const state = this.getActiveState();
    const entity = state.entities.get(id);
    if (!entity) {
      throw new KBError(`Entity not found: ${id}`);
    }

    // Remove old index entries if indexed properties changed
    const pathChanged = updates.path !== undefined && updates.path !== entity.path;
    const kindChanged = updates.kind !== undefined && updates.kind !== entity.kind;
    const exportedChanged = updates.exported !== undefined && updates.exported !== entity.exported;

    if (pathChanged || kindChanged || exportedChanged) {
      this.removeFromIndices(entity, state);
    }

    // Apply updates
    Object.assign(entity, updates);

    // Re-add to indices with new values
    if (pathChanged || kindChanged || exportedChanged) {
      if (!state.byPath.has(entity.path)) {
        state.byPath.set(entity.path, new Set());
      }
      state.byPath.get(entity.path)!.add(entity.id);

      if (!state.byKind.has(entity.kind)) {
        state.byKind.set(entity.kind, new Set());
      }
      state.byKind.get(entity.kind)!.add(entity.id);

      if (entity.exported) {
        state.exported.add(entity.id);
      } else {
        state.exported.delete(entity.id);
      }
    }
  }

  private removeFromIndices(entity: Entity, state: KBState): void {
    // Remove from byPath
    const pathSet = state.byPath.get(entity.path);
    if (pathSet) {
      pathSet.delete(entity.id);
      if (pathSet.size === 0) {
        state.byPath.delete(entity.path);
      }
    }

    // Remove from byKind
    const kindSet = state.byKind.get(entity.kind);
    if (kindSet) {
      kindSet.delete(entity.id);
      if (kindSet.size === 0) {
        state.byKind.delete(entity.kind);
      }
    }

    // Remove from exported
    if (entity.exported) {
      state.exported.delete(entity.id);
    }
  }

  getEntity(id: string): Entity | undefined {
    return this.getActiveState().entities.get(id);
  }

  findByPath(path: string): Entity[] {
    const state = this.getActiveState();
    const ids = state.byPath.get(path);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => state.entities.get(id)!)
      .filter(Boolean);
  }

  listExported(): Entity[] {
    const state = this.getActiveState();
    return Array.from(state.exported)
      .map((id) => state.entities.get(id)!)
      .filter(Boolean);
  }

  // -------- FactSet Operations --------
  insertFactSet(factSet: FactSet): void {
    this.getActiveState().factSets.set(factSet.id, factSet);
  }

  getFactSet(id: string): FactSet | undefined {
    return this.getActiveState().factSets.get(id);
  }

  // -------- BehaviorChunk Operations --------
  insertChunk(chunk: BehaviorChunk): void {
    this.getActiveState().chunks.set(chunk.id, chunk);
  }

  getChunk(id: string): BehaviorChunk | undefined {
    return this.getActiveState().chunks.get(id);
  }

  // -------- Stub APIs (Phase 3 Implementation) --------

  /**
   * Stub: Confidence scoring algorithm (Phase 3).
   * Always returns "Medium" in Phase 1.
   */
  scoreConfidence(_factSetIds: string[]): Confidence {
    // TODO Phase 3: Implement weighted scoring algorithm (CTS-01 §3)
    return 'Medium';
  }

  /**
   * Stub: Query related entities by relation type (Phase 3).
   * Returns empty array in Phase 1.
   */
  neighbors(_entityId: string, _relation: string): Entity[] {
    // TODO Phase 3: Implement using callGraph/importGraph/reverseDeps indices
    return [];
  }

  /**
   * Stub: List all open questions (Phase 3).
   * Returns empty array in Phase 1.
   */
  listOpenQuestions(): Array<{ qid: string; entityId: string; text: string }> {
    // TODO Phase 3: Implement by iterating entities with qids[]
    return [];
  }

  /**
   * Allocate a QID for an ambiguity (idempotent).
   * Uses generateQID and tracks allocated QIDs.
   * FIX HIGH-1: Make idempotent (same inputs → same QID)
   */
  allocateQID(filePath: string, entityKey: string, ambiguityKind: string): string {
    const state = this.getActiveState();

    // Generate deterministic QID without collision handling
    const deterministicQID = generateQID(filePath, entityKey, ambiguityKind, new Set());

    // If already allocated, return existing (idempotent behavior)
    if (state.qids.has(deterministicQID)) {
      return deterministicQID;
    }

    // Otherwise, generate with collision handling against all allocated QIDs
    const actualQID = generateQID(filePath, entityKey, ambiguityKind, state.qids);
    state.qids.add(actualQID);
    return actualQID;
  }

  /**
   * Validate that a QID is unique (not already allocated).
   */
  validateQIDUniqueness(qid: string): boolean {
    const state = this.getActiveState();
    return !state.qids.has(qid);
  }

  /**
   * No-op in Phase 1: Anchors are computed inline during entity creation.
   * Phase 3 may add batch anchor computation for existing entities.
   */
  computeAnchors(): void {
    // TODO Phase 3: Batch anchor computation if needed
  }

  // -------- Batch Operations --------
  beginBatch(): void {
    if (this.batch) {
      throw new KBError('Batch already in progress');
    }
    // FIX CRITICAL-1 & 2: Deep clone current state
    this.batch = this.deepCloneState(this.state);
  }

  commit(): void {
    if (!this.batch) {
      throw new KBError('No batch in progress');
    }
    this.state = this.batch;
    this.batch = null;
  }

  rollback(): void {
    if (!this.batch) {
      throw new KBError('No batch in progress');
    }
    this.batch = null;
  }
}
