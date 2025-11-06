import { SnapshotDocument } from './types.js';
export interface CaptureOptions {
    root: string;
    include?: string[];
    exclude?: string[];
}
/**
 * Capture a deterministic snapshot of the workspace rooted at {@link CaptureOptions.root}.
 * Files are filtered using allowed extensions and ignore rules, normalised per CTS-04,
 * and hashed to produce a Merkle root recorded in the returned document.
 */
export declare function captureSnapshot({ root, include, exclude }: CaptureOptions): Promise<SnapshotDocument>;
/**
 * Persist a snapshot document to disk using an atomic write (temp file + rename).
 */
export declare function writeSnapshot(document: SnapshotDocument, outputPath: string): void;
//# sourceMappingURL=capture.d.ts.map