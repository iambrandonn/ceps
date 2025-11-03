export type EntityKind =
  | 'module'
  | 'file'
  | 'export'
  | 'class'
  | 'method'
  | 'function'
  | 'constant'
  | 'config'
  | 'endpoint'
  | 'event';

export const VALID_ENTITY_KINDS: EntityKind[] = [
  'module',
  'file',
  'export',
  'class',
  'method',
  'function',
  'constant',
  'config',
  'endpoint',
  'event',
];

export type Confidence = 'High' | 'Medium' | 'Low';

export interface SourceRange {
  start: number; // byte offset
  end: number; // exclusive
}

export interface Source {
  kind: 'ast' | 'aux' | 'derived';
  file?: string;
  range?: SourceRange;
  reader?: string;
}
