#!/usr/bin/env node
import { parseArgs, validateArgs } from './cli.js';

const VERSION = '0.1.0';

export async function run(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);

    // Handle --version flag
    if (args.version) {
      console.log(`ceps v${VERSION}`);
      return 0;
    }

    validateArgs(args);

    console.log(`ceps v${VERSION}`);
    console.log(`Project root: ${args.projectRoot}`);
    console.log('Phase 1: KB schema and API contract only');

    // TODO Phase 2: Scanner → Parser → KB → Generator pipeline

    return 0; // success
  } catch (error) {
    console.error('Error:', (error as Error).message);
    return 1; // failure
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv).then((code) => process.exit(code));
}
