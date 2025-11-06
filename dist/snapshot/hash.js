import crypto from 'crypto';
/**
 * SHA-256 hash for an empty string (hex-encoded).
 * Used when snapshot contains no files.
 */
export const EMPTY_HASH = sha256('');
/**
 * Compute a SHA-256 hex digest for the supplied content.
 *
 * @param content - String or buffer to hash
 */
export function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}
/**
 * Compute per-file leaf hash combining path and content hash.
 * This keeps the Merkle root stable even if two files share identical content.
 *
 * @param path - Repo-relative path of the file
 * @param contentHash - SHA-256 hash of the normalized file content
 */
export function computeLeafHash(path, contentHash) {
    return sha256(`${path}\0${contentHash}`);
}
/**
 * Build a deterministic Merkle root from sorted leaves.
 * When the leaf count is odd, the final hash is duplicated (classic Merkle tree behaviour).
 *
 * @param leaves - Leaf nodes containing repo-relative paths and content hashes
 */
export function buildMerkleRoot(leaves) {
    if (leaves.length === 0) {
        return EMPTY_HASH;
    }
    const sortedLeaves = [...leaves].sort((a, b) => a.path.localeCompare(b.path));
    let level = sortedLeaves.map((leaf) => computeLeafHash(leaf.path, leaf.hash));
    while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            if (i + 1 < level.length) {
                next.push(sha256(level[i] + level[i + 1]));
            }
            else {
                // Duplicate the last hash when odd number of nodes
                next.push(sha256(level[i] + level[i]));
            }
        }
        level = next;
    }
    return level[0] ?? EMPTY_HASH;
}
//# sourceMappingURL=hash.js.map