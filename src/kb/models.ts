import { EntityKind, Confidence, Source, VALID_ENTITY_KINDS } from '../types/index.js';

export interface Relation {
  subjectId: string;
  predicate:
    | 'imports'
    | 'exports'
    | 'calls'
    | 'reads'
    | 'writes'
    | 'publishes'
    | 'subscribes'
    | 'uses-config'
    | 'uses-env';
  objectId?: string | null;  // null indicates unresolved relation (per STEP0 spec)
  details?: Record<string, unknown>;
  source?: Source;
}

export interface Fact {
  subjectId: string;
  predicate: string;
  object?: unknown;
  qualifiers?: Record<string, unknown>;
  source?: Source;
}

export interface FactSet {
  id: string;
  facts: Fact[];
  sources: Source[];
  evidenceScore: number; // 0..100
  parents?: string[];
}

export interface BehaviorChunk {
  id: string;
  targetEntityId: string;
  textDraft: string;
  factSetIds: string[];
  confidence: Confidence;
  assumptions?: string[];
}

export interface AnswerRecord {
  qid: string;
  entityId: string;
  answer: string;
  appliedAt: string;
  factSetIds: string[];
}

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  path: string; // repo-relative POSIX path
  packageId?: string;
  signature?: string;
  visibility?: 'public' | 'internal';
  exported?: boolean;
  attributes?: {
    sideEffects?: string[];
    errors?: string[];
    configInfluences?: string[];
    concurrencyNotes?: string[];
  };
  anchors?: string[];
  qids?: string[];
}

// Factory functions with validation
export function createEntity(
  data: Partial<Entity> & { id: string; kind: EntityKind; name: string; path: string }
): Entity {
  // FIX: Add runtime validation for entity kind
  if (!VALID_ENTITY_KINDS.includes(data.kind)) {
    throw new Error(`Invalid entity kind: ${data.kind}`);
  }

  return {
    ...data,
    path: data.path.replace(/\\/g, '/'), // Normalize to POSIX
  };
}

export function createFactSet(
  data: Partial<FactSet> & {
    id: string;
    facts: Fact[];
    sources: Source[];
    evidenceScore: number;
  }
): FactSet {
  if (data.evidenceScore < 0 || data.evidenceScore > 100) {
    throw new Error('evidenceScore must be between 0 and 100');
  }
  return { ...data };
}

export function createBehaviorChunk(data: BehaviorChunk): BehaviorChunk {
  if (!data.factSetIds || data.factSetIds.length === 0) {
    throw new Error('BehaviorChunk must reference at least one factSet');
  }
  return data;
}

// Phase 3 Step 4: OpenQuestion model
export interface OpenQuestion {
  qid: string;              // Format: Q-<entity-kind>-<counter>
  entityId: string;
  question: string;
  confidence: number;       // Original score before band conversion
  factSetIds: string[];
  createdAt?: Date;
}
