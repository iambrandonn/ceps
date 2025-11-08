import * as fs from 'fs';
import * as path from 'path';
export function parseArgs(argv) {
    const args = {
        command: 'baseline',
        projectRoot: process.cwd(),
        deterministic: false,
        maxWorkers: undefined,
        detail: 'spec-ready',
        llm: 'on',
        version: false,
        noSnapshot: false,
        noModuleScopeCalls: false,
        dryRun: false,
        reconcile: false,
        finalizeMaxHops: 3,
        finalizeMaxNodes: 250,
        finalizeScope: 'auto',
    };
    // Skip 'node' and script name
    const positional = [];
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            if (arg === '--help') {
                args.help = true;
            }
            else if (arg === '--version') {
                args.version = true;
            }
            else if (arg === '--deterministic') {
                args.deterministic = true;
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
            else if (arg === '--no-snapshot') {
                args.noSnapshot = true;
            }
            else if (arg === '--no-module-scope-calls') {
                args.noModuleScopeCalls = true;
            }
            else if (arg === '--answers') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--answers requires a value');
                }
                args.answersPath = argv[++i];
            }
            else if (arg === '--dry-run') {
                args.dryRun = true;
            }
            else if (arg === '--reconcile') {
                args.reconcile = true;
            }
            else if (arg === '--finalize-max-hops') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--finalize-max-hops requires a value');
                }
                const value = argv[++i];
                const parsed = parseInt(value, 10);
                args.finalizeMaxHops = parsed;
            }
            else if (arg === '--finalize-max-nodes') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--finalize-max-nodes requires a value');
                }
                const value = argv[++i];
                const parsed = parseInt(value, 10);
                args.finalizeMaxNodes = parsed;
            }
            else if (arg === '--finalize-scope') {
                if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
                    throw new Error('--finalize-scope requires a value');
                }
                const value = argv[++i];
                args.finalizeScope = value;
            }
            else if (arg === '--finalize-out') {
                throw new Error('--finalize-out is not supported in Phase 5');
            }
            // Add more flags here
        }
        else {
            positional.push(arg);
        }
    }
    // Parse command (first positional arg might be 'finalize' or a path)
    if (positional.length > 0) {
        const first = positional[0];
        if (first === 'finalize') {
            args.command = 'finalize';
            // Project root can be specified as second positional arg
            if (positional.length > 1) {
                args.projectRoot = path.resolve(positional[1]);
            }
        }
        else if (first === 'baseline') {
            args.command = 'baseline';
            if (positional.length > 1) {
                args.projectRoot = path.resolve(positional[1]);
            }
        }
        else {
            // Check if it looks like a command (starts with lowercase letter, no path separators)
            const knownCommands = ['baseline', 'finalize'];
            const looksLikeCommand = /^[a-z][a-z-]*$/.test(first) && !first.includes('/') && !first.includes('\\');
            if (looksLikeCommand && !knownCommands.includes(first)) {
                throw new Error(`Unknown command: ${first}. Supported commands: ${knownCommands.join(', ')}`);
            }
            // Otherwise treat as project path for baseline command
            args.command = 'baseline';
            args.projectRoot = path.resolve(first);
        }
    }
    // Check environment variables (CLI flags take precedence)
    if (!args.noModuleScopeCalls && process.env.CEPS_MODULE_SCOPE_CALLS === 'false') {
        args.noModuleScopeCalls = true;
    }
    return args;
}
export function validateArgs(args, filesystem = fs) {
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
    // Phase 5: Finalize-specific validations
    if (args.command === 'finalize') {
        // --answers is required for finalize
        if (!args.answersPath) {
            throw new Error('finalize command requires --answers <path>');
        }
        // FIRST: Validate flag values (type/range checks)
        if (args.finalizeMaxHops !== undefined && (args.finalizeMaxHops <= 0 || !Number.isInteger(args.finalizeMaxHops))) {
            throw new Error('--finalize-max-hops must be a positive integer');
        }
        if (args.finalizeMaxNodes !== undefined && (args.finalizeMaxNodes <= 0 || !Number.isInteger(args.finalizeMaxNodes))) {
            throw new Error('--finalize-max-nodes must be a positive integer');
        }
        if (args.finalizeScope && args.finalizeScope !== 'auto' && args.finalizeScope !== 'full') {
            throw new Error('--finalize-scope must be either "auto" or "full"');
        }
        // Validate flag combinations
        if (args.noSnapshot) {
            throw new Error('--no-snapshot is only valid for baseline command');
        }
        // THEN: Check file/directory existence (after flag validation)
        if (!filesystem.existsSync(args.answersPath)) {
            throw new Error(`Answers file does not exist: ${args.answersPath}`);
        }
        const kbStatePath = path.join(args.projectRoot, '.ceps', 'kb-state.json');
        if (!filesystem.existsSync(kbStatePath)) {
            throw new Error('Baseline run required before finalization: .ceps/kb-state.json not found');
        }
        // FINALLY: Warnings (non-blocking)
        if (args.reconcile && args.dryRun) {
            console.warn('Warning: --reconcile has no effect in --dry-run mode');
        }
        if (args.finalizeScope === 'full' && (args.finalizeMaxHops !== 3 || args.finalizeMaxNodes !== 250)) {
            console.warn('Warning: --finalize-scope full ignores --finalize-max-hops and --finalize-max-nodes');
        }
    }
    // Existing validations
    if (!filesystem.existsSync(args.projectRoot)) {
        throw new Error(`Project root does not exist: ${args.projectRoot}`);
    }
    if (!filesystem.statSync(args.projectRoot).isDirectory()) {
        throw new Error(`Project root is not a directory: ${args.projectRoot}`);
    }
}
/**
 * Displays comprehensive CLI usage information.
 *
 * IMPORTANT: Update this function when CLI flags change.
 * See SADS.md §6.2 for authoritative flag list.
 *
 * @param version - Version string to display (default: '0.2.0')
 */
export function printHelp(version = '0.2.0') {
    console.log(`
ceps v${version} - Codebase to Specification

Reverse-engineers JavaScript/TypeScript codebases into human-readable
Markdown specifications using static analysis and optional LLM assistance.

USAGE:
  ceps [command] [project-root] [options]

COMMANDS:
  baseline    Generate initial specifications (default)
              Analyzes codebase and creates spec.md files

  finalize    Update specs based on answered questions
              Requires prior baseline run and --answers file

GENERAL OPTIONS:
  --help                     Show this help message
  --version                  Show version number

LLM CONFIGURATION:
  --llm on|off              Enable/disable LLM polish (default: on)
  --llm-provider <name>     LLM provider: anthropic|openai|azure|local
                            (default: anthropic)
  --llm-model <name>        Specific model to use
  --llm-budget <tokens>     Token budget limit (default: 1000000)
  --no-llm-cache           Disable LLM response caching

EXECUTION CONTROL:
  --deterministic           Lock output variance (stable hashes/wording)
  --max-workers <n>         Max parallel workers for parsing

DETAIL LEVEL:
  --detail <level>          spec-ready (default) | exhaustive | minimal
                            Note: Implemented in types but not in orchestrator yet

SNAPSHOT CONTROL:
  --no-snapshot            Skip snapshot capture (baseline only)

PARSER CONTROL:
  --no-module-scope-calls  Disable module-scope call extraction (default: enabled)
                          Useful for debugging or emergency rollback

PLANNED OPTIONS (Not Yet Implemented):
  --focus public-api        Limit analysis to public API only
  --max-iterations <n>      Max reasoning iterations (hardcoded to 10)

FINALIZATION OPTIONS:
  --answers <path>          Path to answers.md file (required)
  --dry-run                Preview changes without writing files
  --reconcile              Allow changed codebase since baseline
  --finalize-max-hops <n>  Max dependency hops for impact scope (default: 3)
  --finalize-max-nodes <n> Max nodes in impact scope (default: 250)
  --finalize-scope auto|full  Scope strategy (default: auto)

EXAMPLES:
  # Generate specs for current directory
  ceps .

  # Analyze specific project with LLM disabled
  ceps /path/to/project --llm off

  # Use OpenAI with custom model and budget
  ceps . --llm-provider openai --llm-model gpt-4 --llm-budget 500000

  # Finalize after answering questions (dry-run first)
  ceps finalize --answers ./answers.md --dry-run
  ceps finalize --answers ./answers.md

EXIT CODES:
  0  Success
  1  Internal error (invalid arguments, file system errors)
  2  Quality gates failed (coverage, grounding, or validation)
  3  Snapshot mismatch during finalize (use --reconcile to override)

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY           Required when --llm-provider is anthropic (default)
  OPENAI_API_KEY              Required when --llm-provider is openai
  CEPS_MODULE_SCOPE_CALLS     Set to 'false' to disable module-scope extraction
                             (equivalent to --no-module-scope-calls)

For more information, see: https://github.com/anthropics/ceps
`);
}
//# sourceMappingURL=cli.js.map