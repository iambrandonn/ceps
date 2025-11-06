import fs from 'fs';
import { captureSnapshot } from './capture.js';
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
export async function verifySnapshot(root: string, snapshotPath: string, options: VerificationOptions = {}): Promise<VerificationResult> {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found at ${snapshotPath}`);
  }

  const snapshot: SnapshotDocument = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  if (snapshot.version !== '1.0') {
    throw new Error(`Unsupported snapshot version ${snapshot.version}`);
  }

  const current = await captureSnapshot({ root });

  const expectedMap = new Map(snapshot.files.map((file) => [file.path, file.hash]));
  const actualMap = new Map(current.files.map((file) => [file.path, file.hash]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [pathKey, hash] of actualMap.entries()) {
    if (!expectedMap.has(pathKey)) {
      added.push(pathKey);
    } else if (expectedMap.get(pathKey) !== hash) {
      changed.push(pathKey);
    }
  }

  for (const pathKey of expectedMap.keys()) {
    if (!actualMap.has(pathKey)) {
      removed.push(pathKey);
    }
  }

  const mismatchPresent = added.length > 0 || removed.length > 0 || changed.length > 0 || snapshot.rootHash !== current.rootHash;

  if (!mismatchPresent) {
    return { match: true, expected: snapshot, actual: current };
  }

  return {
    match: false,
    mismatch: {
      added: added.sort(),
      removed: removed.sort(),
      changed: changed.sort()
    },
    expected: snapshot,
    actual: current,
    reconciled: options.reconcile === true ? true : undefined
  };
}
