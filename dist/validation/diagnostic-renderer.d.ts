/**
 * Phase 4 WS-F1 Stage F: Diagnostic Formatting
 *
 * Renders validation diagnostics in deterministic, debug-friendly formats.
 * Supports text and JSON output with optional non-deterministic value stripping.
 */
import type { GroundingDiagnostic } from './types.js';
/**
 * Options for rendering diagnostics.
 */
export interface DiagnosticRenderOptions {
    debug: boolean;
    format?: 'text' | 'json';
    stripNonDeterministic?: boolean;
}
/**
 * Render validation diagnostics to string.
 *
 * @param diagnostics - Array of diagnostics to render
 * @param options - Rendering options
 * @returns Formatted diagnostic string (empty if debug is off)
 */
export declare function renderDiagnostics(diagnostics: GroundingDiagnostic[], options: DiagnosticRenderOptions): string;
//# sourceMappingURL=diagnostic-renderer.d.ts.map