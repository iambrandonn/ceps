export interface SnapshotFileEntry {
  path: string; // repo-relative POSIX path
  hash: string; // hex-encoded SHA-256 hash of normalized content
  bytes: number; // raw byte size on disk
}

export interface SnapshotDocument {
  version: '1.0';
  algorithm: 'sha256';
  rootHash: string; // hex-encoded Merkle root
  generatedAt: string; // ISO timestamp
  files: SnapshotFileEntry[];
}

export interface MerkleLeaf {
  path: string;
  hash: string;
}
