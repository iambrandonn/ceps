import { describe, it, expect } from 'vitest';
import { buildMerkleRoot, computeLeafHash, sha256, EMPTY_HASH } from '../hash.js';
describe('hash utilities', () => {
    it('computes sha256 hash consistently', () => {
        const first = sha256('hello');
        const second = sha256('hello');
        expect(first).toBe(second);
        expect(first).toHaveLength(64);
    });
    it('computes leaf hash incorporating path and content hash', () => {
        const contentHash = sha256('data');
        const leafHash = computeLeafHash('src/example.ts', contentHash);
        expect(leafHash).toHaveLength(64);
        const sameContentDifferentPath = computeLeafHash('src/other.ts', contentHash);
        expect(leafHash).not.toBe(sameContentDifferentPath);
    });
    it('returns EMPTY_HASH when no leaves provided', () => {
        expect(buildMerkleRoot([])).toBe(EMPTY_HASH);
    });
    it('builds deterministic Merkle root regardless of input order', () => {
        const leavesA = [
            { path: 'a.ts', hash: sha256('a') },
            { path: 'b.ts', hash: sha256('b') },
            { path: 'c.ts', hash: sha256('c') },
        ];
        const leavesB = [...leavesA].reverse();
        const rootA = buildMerkleRoot(leavesA);
        const rootB = buildMerkleRoot(leavesB);
        expect(rootA).toBe(rootB);
    });
    it('duplicates final hash when odd number of nodes', () => {
        const leaves = [
            { path: 'a.ts', hash: sha256('a') },
            { path: 'b.ts', hash: sha256('b') },
            { path: 'c.ts', hash: sha256('c') },
            { path: 'd.ts', hash: sha256('d') },
            { path: 'e.ts', hash: sha256('e') },
        ];
        const root = buildMerkleRoot(leaves);
        expect(root).toHaveLength(64);
    });
});
//# sourceMappingURL=hash.test.js.map