/**
 * Phase 4 WS-H Stage D: Run Summary Renderer
 *
 * Renders run summaries in JSON and console table formats.
 * Supports structured JSON output and human-readable console display.
 *
 * **CTS Reference:** CTS-07 §10 (Metrics & Logging), Phase 4 §3.3
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
/**
 * Validates run summary against JSON Schema.
 * @param summary - Run summary to validate
 * @returns True if valid, throws if invalid
 */
export function validateRunSummary(summary) {
    const ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);
    const schemaPath = path.join(process.cwd(), 'schemas', 'run-summary.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const validate = ajv.compile(schema);
    const valid = validate(summary);
    if (!valid) {
        throw new Error('Run summary validation failed: ' +
            JSON.stringify(validate.errors, null, 2));
    }
    return true;
}
/**
 * Renders run summary as formatted JSON string.
 * @param summary - Run summary to render
 * @param validateSchema - Whether to validate against schema before rendering (default: true)
 * @returns Formatted JSON string
 */
export function renderJSON(summary, validateSchema = true) {
    if (validateSchema) {
        validateRunSummary(summary);
    }
    return JSON.stringify(summary, null, 2);
}
/**
 * Renders run summary as console table for human readability.
 * @param summary - Run summary to render
 * @returns Formatted console output
 */
export function renderConsole(summary) {
    const lines = [];
    // Header
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                    ceps Run Summary                       ');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    // Runtime Gates Section
    lines.push('Runtime Gates (affect exit code):');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(formatGateLine('Coverage', summary.gates.coverage.status, `${summary.gates.coverage.documented}/${summary.gates.coverage.exported} documented, ${summary.gates.coverage.qids} QIDs`));
    lines.push(formatGateLine('Link', summary.gates.link.status, `${summary.gates.link.anchors} anchors, ${summary.gates.link.broken} broken`));
    lines.push(formatGateLine('Grounding', summary.gates.grounding.status, `${summary.gates.grounding.chunks} chunks (${summary.gates.grounding.validated} validated, ${summary.gates.grounding.fallback} fallback)`));
    lines.push(formatGateLine('Determinism', summary.gates.determinism.status, summary.gates.determinism.status === 'skip' ? 'not enabled' :
        `${summary.gates.determinism.reruns} reruns, ${summary.gates.determinism.diffs} diffs`));
    lines.push(formatGateLine('Confidence', summary.gates.confidence.status, `${summary.gates.confidence.openQuestions} open questions`));
    lines.push(formatGateLine('Monorepo', summary.gates.monorepo.status, summary.gates.monorepo.packagesLinked === 0 ? 'not a monorepo' :
        `${summary.gates.monorepo.packagesLinked} packages linked`));
    lines.push('');
    // Validation Gates Section
    lines.push('Validation Gates (advisory only):');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(formatGateLine('Cost', summary.validation.cost.status, `${summary.validation.cost.used}/${summary.validation.cost.budget} tokens (${summary.validation.cost.remaining} remaining)`));
    lines.push(formatGateLine('Adversarial', summary.validation.adversarial.status, summary.validation.adversarial.total === 0 ? 'no tests' :
        `${summary.validation.adversarial.rejected}/${summary.validation.adversarial.total} rejected`));
    lines.push(formatGateLine('Test Coverage', summary.validation.testCoverage.status, `${summary.validation.testCoverage.coverage.toFixed(1)}% (threshold: ${summary.validation.testCoverage.threshold}%)`));
    lines.push(formatGateLine('Readability', summary.validation.readability.status, summary.validation.readability.avgScore ?
        `${summary.validation.readability.avgScore.toFixed(1)}/10 (threshold: ${summary.validation.readability.threshold})` :
        'no review data'));
    lines.push('');
    // Token Usage
    if (summary.tokens.total > 0) {
        lines.push('Token Usage:');
        lines.push('─────────────────────────────────────────────────────────');
        lines.push(`  Total:  ${summary.tokens.total.toLocaleString()} tokens`);
        lines.push(`  Budget: ${summary.tokens.budget.toLocaleString()} tokens`);
        for (const [provider, usage] of Object.entries(summary.tokens.providers)) {
            lines.push(`  ${provider}: ${usage.toLocaleString()} tokens`);
        }
        lines.push('');
    }
    // Warnings
    if (summary.warnings.length > 0) {
        lines.push('Warnings:');
        lines.push('─────────────────────────────────────────────────────────');
        for (const warning of summary.warnings) {
            lines.push(`  ⚠  ${warning}`);
        }
        lines.push('');
    }
    // Exit Code
    lines.push('─────────────────────────────────────────────────────────');
    const exitCodeLabel = getExitCodeLabel(summary.exitCode);
    const exitCodeSymbol = summary.exitCode === 0 ? '✓' : '✗';
    lines.push(`${exitCodeSymbol} Exit Code: ${summary.exitCode} (${exitCodeLabel})`);
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    return lines.join('\n');
}
/**
 * Formats a single gate line with status symbol and details.
 */
function formatGateLine(name, status, details) {
    const symbol = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '○';
    const statusLabel = status.toUpperCase().padEnd(5);
    const namePadded = name.padEnd(15);
    return `  ${symbol} [${statusLabel}] ${namePadded} ${details}`;
}
/**
 * Gets human-readable label for exit code.
 */
function getExitCodeLabel(exitCode) {
    switch (exitCode) {
        case 0:
            return 'Success';
        case 1:
            return 'Internal Error';
        case 2:
            return 'Gate Failure';
        case 3:
            return 'Snapshot Mismatch';
        default:
            return 'Unknown';
    }
}
/**
 * Writes run summary to JSON file.
 * @param summary - Run summary to write
 * @param filePath - Absolute path to output file
 */
export function writeJSONSummary(summary, filePath) {
    const json = renderJSON(summary, true);
    fs.writeFileSync(filePath, json, 'utf8');
}
/**
 * Writes run summary to console and optionally to JSON file.
 * @param summary - Run summary to write
 * @param options - Rendering options
 */
export function emitRunSummary(summary, options = {}) {
    const { jsonPath, console: emitConsole = true } = options;
    // Emit console output
    if (emitConsole) {
        const consoleOutput = renderConsole(summary);
        console.log(consoleOutput);
    }
    // Write JSON file if path provided
    if (jsonPath) {
        writeJSONSummary(summary, jsonPath);
    }
}
//# sourceMappingURL=run-summary-renderer.js.map