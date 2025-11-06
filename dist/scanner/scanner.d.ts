import { FileIndex } from '../types/index.js';
import { IgnoreRulesOptions } from './ignore-rules.js';
export declare class Scanner {
    private rootPath;
    private ignoreRules;
    constructor(rootPath: string, ignoreOptions?: IgnoreRulesOptions);
    scan(): Promise<FileIndex>;
    private classifyFile;
}
//# sourceMappingURL=scanner.d.ts.map