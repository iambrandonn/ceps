import { EntityKind, Confidence, Source } from '../types/index.js';
export interface Relation {
    subjectId: string;
    predicate: 'imports' | 'exports' | 'calls' | 'reads' | 'writes' | 'publishes' | 'subscribes' | 'uses-config' | 'uses-env';
    objectId?: string | null;
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
    evidenceScore: number;
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
export interface Entity {
    id: string;
    kind: EntityKind;
    name: string;
    path: string;
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
export declare function createEntity(data: Partial<Entity> & {
    id: string;
    kind: EntityKind;
    name: string;
    path: string;
}): Entity;
export declare function createFactSet(data: Partial<FactSet> & {
    id: string;
    facts: Fact[];
    sources: Source[];
    evidenceScore: number;
}): FactSet;
export declare function createBehaviorChunk(data: BehaviorChunk): BehaviorChunk;
export interface OpenQuestion {
    qid: string;
    entityId: string;
    question: string;
    confidence: number;
    factSetIds: string[];
    createdAt?: Date;
}
//# sourceMappingURL=models.d.ts.map