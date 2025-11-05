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
export function renderDiagnostics(
  diagnostics: GroundingDiagnostic[],
  options: DiagnosticRenderOptions
): string {
  // If debug is off, return empty string
  if (!options.debug) {
    return '';
  }

  // If no diagnostics, return empty string
  if (diagnostics.length === 0) {
    return '';
  }

  // Process diagnostics
  const processed = options.stripNonDeterministic
    ? diagnostics.map(stripNonDeterministicValues)
    : diagnostics;

  // Sort diagnostics for deterministic output
  const sorted = sortDiagnostics(processed);

  // Render based on format
  const format = options.format || 'text';
  if (format === 'json') {
    return renderJSON(sorted);
  } else {
    return renderText(sorted);
  }
}

/**
 * Sort diagnostics for deterministic output.
 * Sorted by: chunkId, rule, reason
 *
 * @param diagnostics - Diagnostics to sort
 * @returns Sorted diagnostics
 */
function sortDiagnostics(diagnostics: GroundingDiagnostic[]): GroundingDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    // Sort by chunkId
    if (a.chunkId !== b.chunkId) {
      return a.chunkId.localeCompare(b.chunkId);
    }

    // Then by rule
    if (a.rule !== b.rule) {
      return a.rule.localeCompare(b.rule);
    }

    // Then by reason
    return a.reason.localeCompare(b.reason);
  });
}

/**
 * Strip non-deterministic values from diagnostic.
 *
 * @param diagnostic - Diagnostic to process
 * @returns Diagnostic with non-deterministic values removed
 */
function stripNonDeterministicValues(diagnostic: GroundingDiagnostic): GroundingDiagnostic {
  const result = { ...diagnostic };

  if (result.context) {
    const cleanContext: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(result.context)) {
      // Skip timestamp fields
      if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
        continue;
      }

      // Skip fields with "id" suffix that look random
      if (key.endsWith('Id') && typeof value === 'string' && /[0-9a-f]{8,}/.test(value)) {
        continue;
      }

      // Skip generatedId fields
      if (key === 'generatedId' || key === 'randomId') {
        continue;
      }

      cleanContext[key] = value;
    }

    result.context = Object.keys(cleanContext).length > 0 ? cleanContext : undefined;
  }

  return result;
}

/**
 * Render diagnostics as JSON.
 *
 * @param diagnostics - Sorted diagnostics
 * @returns JSON string
 */
function renderJSON(diagnostics: GroundingDiagnostic[]): string {
  return JSON.stringify(diagnostics, null, 2);
}

/**
 * Render diagnostics as human-readable text.
 *
 * @param diagnostics - Sorted diagnostics
 * @returns Text string
 */
function renderText(diagnostics: GroundingDiagnostic[]): string {
  const lines: string[] = [];

  for (const diagnostic of diagnostics) {
    lines.push(`[${diagnostic.rule}] ${diagnostic.chunkId}: ${diagnostic.reason}`);

    if (diagnostic.context) {
      const contextStr = JSON.stringify(diagnostic.context, null, 2);
      // Indent context
      const indented = contextStr
        .split('\n')
        .map(line => '  ' + line)
        .join('\n');
      lines.push(indented);
    }
  }

  return lines.join('\n');
}
