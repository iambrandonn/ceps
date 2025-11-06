import { SnapshotDocument } from './types.js';
export interface SnapshotMismatch {
    added: string[];
    removed: string[];
    changed: string[];
}
export interface VerificationResult {
    match: boolean;
    mismatch?: SnapshotMismatch;
    expected: SnapshotDocument;
    actual: SnapshotDocument;
    reconciled?: boolean;
}
export interface VerificationOptions {
    /**
     * When true, mismatches are considered reconciled (best-effort) instead of hard failures.
     * The result will still surface the mismatch details.
     */
    reconcile?: boolean;
}
/**
 * Compare the current workspace snapshot with a stored snapshot document.
 * Returns a structured result detailing added/removed/changed files.
 *
 * @param root - Workspace root to snapshot
 * @param snapshotPath - Path to existing `.ceps/snapshot.json`
 * @param options - Behaviour flags (e.g., reconcile mode)
 */
export declare function verifySnapshot(root: string, snapshotPath: string, options?: VerificationOptions): Promise<VerificationResult>;
//# sourceMappingURL=verify.d.ts.map