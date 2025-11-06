import { KnowledgeBase } from '../kb/knowledge-base.js';
import type { AnswerRecord } from '../kb/models.js';
export interface AnswerEntry {
    qid: string;
    answer: string;
    lines: {
        start: number;
        end: number;
    };
}
export interface AnswerParseError {
    line: number;
    message: string;
    raw: string;
}
export interface AnswerParseResult {
    entries: AnswerEntry[];
    errors: AnswerParseError[];
    warnings: string[];
}
export interface AnswerParseOptions {
    maxAnswerLength?: number;
}
export interface InvalidAnswerEntry {
    line: number;
    qid?: string;
    error: string;
}
export interface AnswerIngestionReport {
    validAnswers: AnswerRecord[];
    invalidEntries: InvalidAnswerEntry[];
    unknownQids: string[];
    warnings: string[];
    summary: {
        totalEntries: number;
        validCount: number;
        invalidCount: number;
        unknownCount: number;
    };
}
export interface AnswerIngestionOptions {
    maxAnswerLength?: number;
    now?: () => string;
}
/**
 * Parse raw Markdown containing QID→answer mappings.
 * The grammar supports `q:<QID>: answer` entries with optional 4-space indented continuations,
 * blank lines, and comments beginning with `#`.
 */
export declare function parseAnswers(markdown: string, _options?: AnswerParseOptions): AnswerParseResult;
/**
 * Convenience helper that reads an answers file from disk (UTF-8) and parses its contents.
 */
export declare function parseAnswersFromFile(filePath: string, options?: AnswerParseOptions): AnswerParseResult;
/**
 * Validate and apply parsed answers against the supplied KnowledgeBase.
 * Returns structured diagnostics suitable for CLI dry-run output.
 */
export declare function ingestAnswers(kb: KnowledgeBase, parseResult: AnswerParseResult, options?: AnswerIngestionOptions): AnswerIngestionReport;
//# sourceMappingURL=answers.d.ts.map