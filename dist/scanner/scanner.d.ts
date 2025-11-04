import { FileIndex } from '../types';
import { IgnoreRulesOptions } from './ignore-rules';
export declare class Scanner {
    private rootPath;
    private ignoreRules;
    constructor(rootPath: string, ignoreOptions?: IgnoreRulesOptions);
    scan(): Promise<FileIndex>;
    private classifyFile;
}
//# sourceMappingURL=scanner.d.ts.map