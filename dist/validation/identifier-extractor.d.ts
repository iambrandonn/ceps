/**
 * Phase 4 WS-F1 Stage B: Identifier Extraction
 *
 * Extracts identifiers from behavior chunk text using regex patterns.
 * Handles backticked, PascalCase, camelCase, and dotted path identifiers.
 * Excludes code blocks and deduplicates results.
 */
/**
 * IdentifierExtractor class for extracting identifiers from text.
 * Not strictly needed but provides encapsulation for future enhancements.
 */
export declare class IdentifierExtractor {
    extract(text: string): string[];
}
/**
 * Extract identifiers from text using pattern matching.
 *
 * @param text - Behavior chunk text to analyze
 * @returns Array of unique identifiers in order of first appearance
 */
export declare function extractIdentifiers(text: string): string[];
//# sourceMappingURL=identifier-extractor.d.ts.map