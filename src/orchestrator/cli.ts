import * as fs from 'fs';
import * as path from 'path';

export interface FileSystem {
  existsSync(path: string): boolean;
  statSync(path: string): { isDirectory(): boolean };
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
  // Phase 5: Finalization flags
  answersPath?: string;
  dryRun?: boolean;
  reconcile?: boolean;
  finalizeMaxHops?: number;
  finalizeMaxNodes?: number;
  finalizeScope?: 'auto' | 'full';
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: 'baseline',
    projectRoot: process.cwd(),
    deterministic: false,
    maxWorkers: undefined,
    detail: 'spec-ready',
    llm: 'on',
    version: false,
    noSnapshot: false,
    dryRun: false,
    reconcile: false,
    finalizeMaxHops: 3,
    finalizeMaxNodes: 250,
    finalizeScope: 'auto',
  };

  // Skip 'node' and script name
  const positional: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      if (arg === '--deterministic') {
        args.deterministic = true;
      } else if (arg === '--version') {
        args.version = true;
      } else if (arg === '--no-llm-cache') {
        args.noLlmCache = true;
      } else if (arg === '--max-workers') {
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
      } else if (arg === '--llm') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--llm requires a value');
        }
        const value = argv[++i];
        if (value !== 'on' && value !== 'off') {
          throw new Error('--llm must be either "on" or "off"');
        }
        args.llm = value;
      } else if (arg === '--llm-provider') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--llm-provider requires a value');
        }
        const value = argv[++i] as any;
        args.llmProvider = value;
      } else if (arg === '--llm-model') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--llm-model requires a value');
        }
        args.llmModel = argv[++i];
      } else if (arg === '--llm-budget') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--llm-budget requires a value');
        }
        const value = argv[++i];
        // Check for decimal point to catch non-integers like "100.5"
        if (value.includes('.')) {
          args.llmBudget = parseFloat(value);
        } else {
          args.llmBudget = parseInt(value, 10);
        }
      } else if (arg === '--no-snapshot') {
        args.noSnapshot = true;
      } else if (arg === '--answers') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--answers requires a value');
        }
        args.answersPath = argv[++i];
      } else if (arg === '--dry-run') {
        args.dryRun = true;
      } else if (arg === '--reconcile') {
        args.reconcile = true;
      } else if (arg === '--finalize-max-hops') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--finalize-max-hops requires a value');
        }
        const value = argv[++i];
        const parsed = parseInt(value, 10);
        args.finalizeMaxHops = parsed;
      } else if (arg === '--finalize-max-nodes') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--finalize-max-nodes requires a value');
        }
        const value = argv[++i];
        const parsed = parseInt(value, 10);
        args.finalizeMaxNodes = parsed;
      } else if (arg === '--finalize-scope') {
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--finalize-scope requires a value');
        }
        const value = argv[++i];
        args.finalizeScope = value as any;
      } else if (arg === '--finalize-out') {
        throw new Error('--finalize-out is not supported in Phase 5');
      }
      // Add more flags here
    } else {
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
    } else if (first === 'baseline') {
      args.command = 'baseline';
      if (positional.length > 1) {
        args.projectRoot = path.resolve(positional[1]);
      }
    } else {
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

  return args;
}

export function validateArgs(args: CliArgs, filesystem: FileSystem = fs): void {
  // Validate --llm off + other LLM flags interaction
  if (args.llm === 'off') {
    const hasLlmFlags =
      args.llmProvider !== undefined ||
      args.llmModel !== undefined ||
      args.llmBudget !== undefined ||
      args.noLlmCache !== undefined;

    if (hasLlmFlags) {
      const flags: string[] = [];
      if (args.llmProvider !== undefined) flags.push('--llm-provider');
      if (args.llmModel !== undefined) flags.push('--llm-model');
      if (args.llmBudget !== undefined) flags.push('--llm-budget');
      if (args.noLlmCache !== undefined) flags.push('--no-llm-cache');

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
      throw new Error(
        `Invalid provider: ${args.llmProvider}. Supported: ${validProviders.join(', ')}`
      );
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
