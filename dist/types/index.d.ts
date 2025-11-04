export type EntityKind = 'module' | 'file' | 'export' | 'class' | 'method' | 'function' | 'constant' | 'config' | 'endpoint' | 'event';
export declare const VALID_ENTITY_KINDS: EntityKind[];
export type Confidence = 'High' | 'Medium' | 'Low';
export interface SourceRange {
    start: number;
    end: number;
}
export interface Source {
    kind: 'ast' | 'aux' | 'derived';
    file?: string;
    range?: SourceRange;
    reader?: string;
}
export interface FileEntry {
    path: string;
    absolutePath: string;
    kind: 'code' | 'test' | 'config' | 'contract';
    packageId?: string;
    size: number;
}
export interface PackageMap {
    packages: Array<{
        id: string;
        name: string;
        path: string;
        files: string[];
    }>;
}
export interface FileIndex {
    entries: FileEntry[];
    packages: PackageMap;
    rootPath: string;
}
export interface ParseResult {
    filePath: string;
    entities: any[];
    relations: any[];
    factSets: any[];
    errors: ParseError[];
}
export interface ParseError {
    filePath: string;
    message: string;
    severity: 'warning' | 'error';
    location?: {
        line: number;
        column: number;
    };
}
//# sourceMappingURL=index.d.ts.map