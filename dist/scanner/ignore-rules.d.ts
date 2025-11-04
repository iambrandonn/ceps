export interface IgnoreRulesOptions {
    ignore?: string[];
    include?: string[];
    gitignorePatterns?: string[];
    respectGitignore?: boolean;
}
export declare class IgnoreRules {
    private rootPath;
    private ignorer;
    constructor(rootPath: string, options?: IgnoreRulesOptions);
    shouldIgnore(filePath: string): boolean;
}
//# sourceMappingURL=ignore-rules.d.ts.map