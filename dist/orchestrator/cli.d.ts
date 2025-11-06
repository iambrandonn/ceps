export interface CliArgs {
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
}
export declare function parseArgs(argv: string[]): CliArgs;
export declare function validateArgs(args: CliArgs): void;
//# sourceMappingURL=cli.d.ts.map