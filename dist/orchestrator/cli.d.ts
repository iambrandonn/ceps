export interface FileSystem {
    existsSync(path: string): boolean;
    statSync(path: string): {
        isDirectory(): boolean;
    };
}
export interface CliArgs {
    command: 'baseline' | 'finalize';
    projectRoot: string;
    help?: boolean;
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
/**
 * Displays comprehensive CLI usage information.
 *
 * IMPORTANT: Update this function when CLI flags change.
 * See SADS.md §6.2 for authoritative flag list.
 *
 * @param version - Version string to display (default: '0.2.0')
 */
export declare function printHelp(version?: string): void;
//# sourceMappingURL=cli.d.ts.map