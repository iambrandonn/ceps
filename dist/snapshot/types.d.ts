export interface SnapshotFileEntry {
    path: string;
    hash: string;
    bytes: number;
}
export interface SnapshotDocument {
    version: '1.0';
    algorithm: 'sha256';
    rootHash: string;
    generatedAt: string;
    files: SnapshotFileEntry[];
}
export interface MerkleLeaf {
    path: string;
    hash: string;
}
//# sourceMappingURL=types.d.ts.map