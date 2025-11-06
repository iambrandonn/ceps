import { MerkleLeaf } from './types.js';
/**
 * SHA-256 hash for an empty string (hex-encoded).
 * Used when snapshot contains no files.
 */
export declare const EMPTY_HASH: string;
/**
 * Compute a SHA-256 hex digest for the supplied content.
 *
 * @param content - String or buffer to hash
 */
export declare function sha256(content: string | Buffer): string;
/**
 * Compute per-file leaf hash combining path and content hash.
 * This keeps the Merkle root stable even if two files share identical content.
 *
 * @param path - Repo-relative path of the file
 * @param contentHash - SHA-256 hash of the normalized file content
 */
export declare function computeLeafHash(path: string, contentHash: string): string;
/**
 * Build a deterministic Merkle root from sorted leaves.
 * When the leaf count is odd, the final hash is duplicated (classic Merkle tree behaviour).
 *
 * @param leaves - Leaf nodes containing repo-relative paths and content hashes
 */
export declare function buildMerkleRoot(leaves: MerkleLeaf[]): string;
//# sourceMappingURL=hash.d.ts.map