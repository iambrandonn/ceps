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

// ============================================
// Phase 2 Types (Scanner, Parser, Generator)
// ============================================

// Scanner outputs (Agent 1)
export interface FileEntry {
  path: string; // Repo-relative POSIX path
  absolutePath: string; // Absolute filesystem path
  kind: 'code' | 'test' | 'config' | 'contract';
  packageId?: string; // For monorepos
  size: number; // File size in bytes
}

export interface PackageMap {
  packages: Array<{
    id: string;
    name: string;
    path: string;
    files: string[]; // Paths relative to package root
  }>;
}

export interface FileIndex {
  entries: FileEntry[];
  packages: PackageMap;
  rootPath: string;
}

// Parser outputs (Agent 2)
export interface ParseResult {
  filePath: string;
  entities: any[]; // Entity[] from KB models
  relations: any[]; // Relation[] from KB models
  factSets: any[]; // FactSet[] from KB models
  errors: ParseError[];
}

export interface ParseError {
  filePath: string;
  message: string;
  severity: 'warning' | 'error';
  location?: { line: number; column: number };
}
