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
    if (!fs.existsSync(args.projectRoot)) {
        throw new Error(`Project root does not exist: ${args.projectRoot}`);
    }
    if (!fs.statSync(args.projectRoot).isDirectory()) {
        throw new Error(`Project root is not a directory: ${args.projectRoot}`);
    }
}
//# sourceMappingURL=cli.js.map