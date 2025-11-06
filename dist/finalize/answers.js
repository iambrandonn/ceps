import fs from 'fs';
import path from 'path';
import { KBError } from '../kb/knowledge-base.js';
const QID_REGEX = /^q:[A-Za-z0-9]{10}(?:[A-Za-z0-9]{6})?(?:-[0-9]{1,2})?$/;
const CONTINUATION_PREFIX = '    ';
function finalizeEntry(pending, result) {
    if (!pending)
        return;
    const text = pending.lines.join('\n').replace(/[\s\n]+$/u, '');
    result.entries.push({
        qid: pending.qid,
        answer: text,
        lines: { start: pending.startLine, end: pending.endLine }
    });
}
/**
 * Parse raw Markdown containing QID→answer mappings.
 * The grammar supports `q:<QID>: answer` entries with optional 4-space indented continuations,
 * blank lines, and comments beginning with `#`.
 */
export function parseAnswers(markdown, _options = {}) {
    const lines = markdown.split(/\r?\n/);
    const result = { entries: [], errors: [], warnings: [] };
    let current = null;
    const pushError = (line, message, raw) => {
        result.errors.push({ line, message, raw });
    };
    lines.forEach((rawLine, index) => {
        const lineNumber = index + 1;
        if (rawLine.startsWith(CONTINUATION_PREFIX)) {
            if (!current) {
                pushError(lineNumber, 'Unexpected indentation (continuation without preceding QID).', rawLine);
                return;
            }
            current.lines.push(rawLine.slice(CONTINUATION_PREFIX.length));
            current.endLine = lineNumber;
            return;
        }
        const trimmed = rawLine.trim();
        if (trimmed === '') {
            if (current) {
                current.lines.push('');
                current.endLine = lineNumber;
            }
            return;
        }
        if (trimmed.startsWith('#')) {
            return;
        }
        const match = rawLine.match(/^(q:[^\s:]+)\s*:\s*(.*)$/);
        if (match) {
            finalizeEntry(current, result);
            current = {
                qid: match[1],
                lines: [match[2]],
                startLine: lineNumber,
                endLine: lineNumber
            };
            return;
        }
        if (current) {
            finalizeEntry(current, result);
            current = null;
        }
        pushError(lineNumber, 'Invalid answer entry. Expected `q:<QID>: answer` or indented continuation.', rawLine);
    });
    finalizeEntry(current, result);
    return result;
}
/**
 * Convenience helper that reads an answers file from disk (UTF-8) and parses its contents.
 */
export function parseAnswersFromFile(filePath, options = {}) {
    const absolute = path.resolve(filePath);
    let source;
    try {
        source = fs.readFileSync(absolute, 'utf8');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read answers file at ${absolute}: ${message}`);
    }
    return parseAnswers(source, options);
}
/**
 * Validate and apply parsed answers against the supplied KnowledgeBase.
 * Returns structured diagnostics suitable for CLI dry-run output.
 */
export function ingestAnswers(kb, parseResult, options = {}) {
    const maxAnswerLength = options.maxAnswerLength ?? 2000;
    const now = options.now ?? (() => new Date().toISOString());
    const report = {
        validAnswers: [],
        invalidEntries: [],
        unknownQids: [],
        warnings: [],
        summary: {
            totalEntries: parseResult.entries.length,
            validCount: 0,
            invalidCount: 0,
            unknownCount: 0
        }
    };
    parseResult.errors.forEach((error) => {
        report.invalidEntries.push({ line: error.line, error: error.message });
    });
    const openQuestions = new Map(kb.getAllOpenQuestions().map((oq) => [oq.qid, oq]));
    const seenQids = new Set();
    const unknownQids = new Set();
    for (const entry of parseResult.entries) {
        const lineNumber = entry.lines.start;
        if (!QID_REGEX.test(entry.qid)) {
            report.invalidEntries.push({ line: lineNumber, qid: entry.qid, error: 'Invalid QID format.' });
            continue;
        }
        if (seenQids.has(entry.qid)) {
            report.invalidEntries.push({ line: lineNumber, qid: entry.qid, error: 'Duplicate QID entry.' });
            continue;
        }
        seenQids.add(entry.qid);
        const question = openQuestions.get(entry.qid);
        if (!question) {
            report.invalidEntries.push({ line: lineNumber, qid: entry.qid, error: 'Unknown QID.' });
            unknownQids.add(entry.qid);
            continue;
        }
        if (entry.answer.length > maxAnswerLength) {
            const warning = `Answer for ${entry.qid} exceeds limit (${entry.answer.length}/${maxAnswerLength}).`;
            report.warnings.push(warning);
        }
        try {
            const record = kb.attachAnswer(entry.qid, entry.answer, { appliedAt: now() });
            report.validAnswers.push(record);
        }
        catch (error) {
            const message = error instanceof KBError ? error.message : error.message;
            report.invalidEntries.push({ line: lineNumber, qid: entry.qid, error: message });
        }
    }
    report.summary.validCount = report.validAnswers.length;
    report.summary.invalidCount = report.invalidEntries.length;
    report.summary.unknownCount = unknownQids.size;
    report.unknownQids = Array.from(unknownQids).sort();
    return report;
}
//# sourceMappingURL=answers.js.map