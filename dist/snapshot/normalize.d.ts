/**
 * Normalize file content according to CTS-04 requirements.
 *
 * @param buffer - Raw file contents
 * @returns Normalized text (UTF-8, LF endings, trimmed trailing whitespace)
 */
export declare function normalizeContent(buffer: Buffer): string;
/**
 * Read a file from disk and return normalized content along with the raw byte size.
 */
export declare function readAndNormalizeFile(path: string): {
    normalized: string;
    bytes: number;
};
//# sourceMappingURL=normalize.d.ts.map