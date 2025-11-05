/**
 * Phase 4 WS-H Stage D: Run Summary Renderer
 *
 * Renders run summaries in JSON and console table formats.
 * Supports structured JSON output and human-readable console display.
 *
 * **CTS Reference:** CTS-07 §10 (Metrics & Logging), Phase 4 §3.3
 */
import type { RunSummary } from '../types/run-summary.js';
/**
 * Validates run summary against JSON Schema.
 * @param summary - Run summary to validate
 * @returns True if valid, throws if invalid
 */
export declare function validateRunSummary(summary: RunSummary): boolean;
/**
 * Renders run summary as formatted JSON string.
 * @param summary - Run summary to render
 * @param validateSchema - Whether to validate against schema before rendering (default: true)
 * @returns Formatted JSON string
 */
export declare function renderJSON(summary: RunSummary, validateSchema?: boolean): string;
/**
 * Renders run summary as console table for human readability.
 * @param summary - Run summary to render
 * @returns Formatted console output
 */
export declare function renderConsole(summary: RunSummary): string;
/**
 * Writes run summary to JSON file.
 * @param summary - Run summary to write
 * @param filePath - Absolute path to output file
 */
export declare function writeJSONSummary(summary: RunSummary, filePath: string): void;
/**
 * Writes run summary to console and optionally to JSON file.
 * @param summary - Run summary to write
 * @param options - Rendering options
 */
export declare function emitRunSummary(summary: RunSummary, options?: {
    jsonPath?: string;
    console?: boolean;
}): void;
//# sourceMappingURL=run-summary-renderer.d.ts.map