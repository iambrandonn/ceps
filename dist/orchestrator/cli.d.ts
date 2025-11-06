export interface FileSystem {
    existsSync(path: string): boolean;
    statSync(path: string): {
        isDirectory(): boolean;
    };
}
export interface CliArgs {
    command: 'baseline' | 'finalize';
    projectRoot: string;
    deterministic?: boolean;
    maxWorkers?: number;
    detail?: 'spec-ready' | 'exhaustive' | 'minimal';
    llm?: 'on' | 'off';
    llmProvider?: 'anthropic' | 'openai' | 'azure' | 'local';
    llmModel?: string;
    llmBudget?: number;
    noLlmCache?: boolean;
    version?: boolean;
    noSnapshot?: boolean;
    answersPath?: string;
    dryRun?: boolean;
    reconcile?: boolean;
    finalizeMaxHops?: number;
    finalizeMaxNodes?: number;
    finalizeScope?: 'auto' | 'full';
}
export declare function parseArgs(argv: string[]): CliArgs;
export declare function validateArgs(args: CliArgs, filesystem?: FileSystem): void;
//# sourceMappingURL=cli.d.ts.map