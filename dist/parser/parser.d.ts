import { ParseResult } from '../types/index.js';
import { KnowledgeBase } from '../kb/knowledge-base.js';
export interface ParserOptions {
    moduleScopeCalls?: boolean;
}
export declare class Parser {
    private project;
    private factExtractor;
    private patternDetector;
    private options;
    constructor(options?: ParserOptions);
    parse(filePath: string, source: string): Promise<ParseResult>;
    parseAndStore(filePath: string, source: string, kb: KnowledgeBase): Promise<ParseResult>;
}
//# sourceMappingURL=parser.d.ts.map