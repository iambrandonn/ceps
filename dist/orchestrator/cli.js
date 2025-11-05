import * as fs from 'fs';
import * as path from 'path';
export function parseArgs(argv) {
    const args = {
        projectRoot: process.cwd(),
        deterministic: false,
        maxWorkers: undefined,
        detail: 'spec-ready',
        llm: 'on',
        version: false,
    };
    // Skip 'node' and script name
    const positional = [];
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            if (arg === '--deterministic') {
                args.deterministic = true;
            }
            else if (arg === '--version') {
                args.version = true;
            }
            else if (arg === '--no-llm-cache') {
                args.noLlmCache = true;
            }
            else if (arg === '--max-workers') {
                // FIX CRITICAL: Validate that value exists before parsing
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--max-workers requires a value');
                }
                const value = argv[++i];
                const parsed = parseInt(value, 10);
                if (isNaN(parsed) || parsed <= 0) {
                    throw new Error('--max-workers must be a positive integer');
                }
                args.maxWorkers = parsed;
            }
            else if (arg === '--llm') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--llm requires a value');
                }
                const value = argv[++i];
                if (value !== 'on' && value !== 'off') {
                    throw new Error('--llm must be either "on" or "off"');
                }
                args.llm = value;
            }
            else if (arg === '--llm-provider') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--llm-provider requires a value');
                }
                const value = argv[++i];
                args.llmProvider = value;
            }
            else if (arg === '--llm-model') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--llm-model requires a value');
                }
                args.llmModel = argv[++i];
            }
            else if (arg === '--llm-budget') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--llm-budget requires a value');
                }
                const value = argv[++i];
                // Check for decimal point to catch non-integers like "100.5"
                if (value.includes('.')) {
                    args.llmBudget = parseFloat(value);
                }
                else {
                    args.llmBudget = parseInt(value, 10);
                }
            }
            // Add more flags here
        }
        else {
            positional.push(arg);
        }
    }
    if (positional.length > 0) {
        args.projectRoot = path.resolve(positional[0]);
    }
    return args;
}
export function validateArgs(args) {
    // Validate --llm off + other LLM flags interaction
    if (args.llm === 'off') {
        const hasLlmFlags = args.llmProvider !== undefined ||
            args.llmModel !== undefined ||
            args.llmBudget !== undefined ||
            args.noLlmCache !== undefined;
        if (hasLlmFlags) {
            const flags = [];
            if (args.llmProvider !== undefined)
                flags.push('--llm-provider');
            if (args.llmModel !== undefined)
                flags.push('--llm-model');
            if (args.llmBudget !== undefined)
                flags.push('--llm-budget');
            if (args.noLlmCache !== undefined)
                flags.push('--no-llm-cache');
            console.warn(`Warning: --llm is off; ignoring ${flags.join(', ')}`);
            // Clear the flags
            args.llmProvider = undefined;
            args.llmModel = undefined;
            args.llmBudget = undefined;
            args.noLlmCache = undefined;
        }
    }
    // Validate --llm-provider is in allow list
    if (args.llmProvider !== undefined) {
        const validProviders = ['anthropic', 'openai', 'azure', 'local'];
        if (!validProviders.includes(args.llmProvider)) {
            throw new Error(`Invalid provider: ${args.llmProvider}. Supported: ${validProviders.join(', ')}`);
        }
    }
    // Validate --llm-budget is positive integer
    if (args.llmBudget !== undefined) {
        if (args.llmBudget <= 0 || !Number.isInteger(args.llmBudget)) {
            throw new Error('--llm-budget must be a positive integer');
        }
    }
    // Validate --no-llm-cache when --llm off
    if (args.noLlmCache && args.llm === 'off') {
        console.warn('Warning: --no-llm-cache has no effect when --llm is off');
    }
    // Existing validations
    if (!fs.existsSync(args.projectRoot)) {
        throw new Error(`Project root does not exist: ${args.projectRoot}`);
    }
    if (!fs.statSync(args.projectRoot).isDirectory()) {
        throw new Error(`Project root is not a directory: ${args.projectRoot}`);
    }
}
//# sourceMappingURL=cli.js.map