# Implementation Plan: --help Flag

**Feature:** Add `--help` flag to display CLI usage information

**Estimated Time:** 45 minutes (updated based on review feedback)

**Complexity:** Low

**Phase:** Quick Win / UX Enhancement

**Review Status:** ✅ Approved with recommendations (see FEEDBACK-HELP-FLAG-PLAN.md)

---

## Review Feedback Addressed

This plan has been updated to address all recommendations from FEEDBACK-HELP-FLAG-PLAN.md:

### Must Implement (Completed)
1. ✅ **Added `--version` flag implementation** (Recommendation 1) - Parsing added to Step 2, tests added to Step 5
2. ✅ **Verified `--focus` and `--max-iterations` status** (Issues 1-2) - Marked as "PLANNED OPTIONS (Not Yet Implemented)" in help text

### Should Implement (Completed)
3. ✅ **Added JSDoc to `printHelp()`** (Recommendation 2) - Included in Step 3 with maintenance reminder
4. ✅ **Clarified VERSION constant** (Recommendation 4) - Added note in Step 4 about existing constant
5. ✅ **Added help structure snapshot test** (Recommendation 3) - Comprehensive test added to Step 5

### Additional Improvements
6. ✅ **Updated manual verification checklist** (Recommendation 5) - Added version flag testing
7. ✅ **Documented `--detail` flag status** - Added to help text with implementation note
8. ✅ **Updated time estimate** - Increased from 30 to 45 minutes

---

## Overview

Add a `--help` flag to the CLI that displays comprehensive usage information including commands, options, examples, and exit codes. This follows standard CLI conventions and improves discoverability.

---

## Requirements

### Functional Requirements
1. `--help` flag should display usage information and exit with code 0
2. Help text should include:
   - Brief tool description
   - Command syntax (baseline/finalize)
   - All available options organized by category
   - Example usage for common scenarios
   - Exit code explanations
3. Help should be displayed when:
   - User explicitly passes `--help`
   - No arguments provided (debatable - could default to current directory)
4. Help display should bypass all validation (no API keys needed, no project root checks)

### Non-Functional Requirements
1. Help text should be maintainable (easy to update when flags change)
2. Output should be readable in standard terminal widths (80+ columns)
3. Should follow existing code style and patterns

---

## Implementation Steps

### Step 1: Update CLI Types (src/orchestrator/cli.ts)

**Task:** Add `help` field to `CliArgs` interface

**Note:** The `--version` flag is already implemented in the codebase (see src/orchestrator/index.ts:16-19), but not parsed in cli.ts. We need to add parsing for consistency.

```typescript
export interface CliArgs {
  command: 'baseline' | 'finalize';
  projectRoot: string;
  help?: boolean;      // ADD THIS
  version?: boolean;   // Already exists, verify it's present
  deterministic?: boolean;
  // ... rest of fields
}
```

**Test:** Type-check passes (`npm run typecheck`)

---

### Step 2: Add Help and Version Flag Parsing (src/orchestrator/cli.ts)

**Task:** Add `--help` and `--version` cases to the argument parser

Location: `parseArgs()` function, within the `if (arg.startsWith('--'))` block

```typescript
if (arg === '--help') {
  args.help = true;
} else if (arg === '--version') {
  args.version = true;
} else if (arg === '--deterministic') {
  // existing code...
```

**Note:** Place these checks EARLY in the if-else chain (before other flags) so they take precedence

**Test Cases:**
- `parseArgs(['node', 'cli.js', '--help'])` should return `{ help: true, ... }`
- `parseArgs(['node', 'cli.js', '--version'])` should return `{ version: true, ... }`
- `parseArgs(['node', 'cli.js', 'finalize', '--help'])` should return `{ help: true, command: 'finalize', ... }`
- Help/version flags combined with other flags should still set `help: true` / `version: true`

---

### Step 3: Create Help Text Function (src/orchestrator/cli.ts)

**Task:** Add `printHelp()` function at the end of the file (before exports)

**Content Structure:**
1. Tool name and version (accept version as parameter)
2. One-line description (from SADS.md §1.1)
3. Usage syntax
4. Commands section
5. Options organized by category:
   - General (`--help`, `--version`)
   - LLM Configuration (`--llm`, `--llm-provider`, etc.)
   - Execution Control (`--deterministic`, `--max-workers`)
   - Snapshot Control (`--no-snapshot`)
   - Finalization-specific (`--answers`, `--dry-run`, etc.)
6. Examples section (3-4 common use cases)
7. Exit codes reference
8. Environment variables (API keys)

**Implementation Notes:**
- Use template literal for multi-line string
- Keep line length ≤100 characters for readability
- Use consistent indentation (2 spaces for option descriptions)
- Group related flags together
- Add blank lines between sections for clarity
- Add JSDoc comment with maintenance reminder (addresses Review Recommendation 2)

**Signature:**
```typescript
/**
 * Displays comprehensive CLI usage information.
 *
 * IMPORTANT: Update this function when CLI flags change.
 * See SADS.md §6.2 for authoritative flag list.
 *
 * @param version - Version string to display (default: '0.2.0')
 */
export function printHelp(version: string = '0.2.0'): void {
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
  ANTHROPIC_API_KEY    Required when --llm-provider is anthropic (default)
  OPENAI_API_KEY       Required when --llm-provider is openai

For more information, see: https://github.com/anthropics/ceps
`);
}
```

**Test:** Function compiles and output is well-formatted (manual verification)

---

### Step 4: Integrate Help Display (src/orchestrator/index.ts)

**Task:** Check for `args.help` and display help before validation

Location: In `run()` function, after `parseArgs()` but before `validateArgs()`

**Note on VERSION constant:** The VERSION constant already exists at the top of src/orchestrator/index.ts (line 9) as `const VERSION = '0.2.0'`. We'll use this existing constant. (Addresses Review Recommendation 4)

**Import Update Required:**
```typescript
// At top of file, update import:
import { parseArgs, validateArgs, printHelp } from './cli.js';
```

**Integration Code:**
```typescript
export async function run(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);

    // ADD THIS BLOCK (before --version check)
    if (args.help) {
      printHelp(VERSION);
      return 0;
    }

    // Handle --version flag (already exists)
    if (args.version) {
      console.log(`ceps v${VERSION}`);
      return 0;
    }

    validateArgs(args);
    // ... rest of function
```

**Test:**
- Running with `--help` should print help and exit 0
- Running with `--version` should print version and exit 0
- No validation errors should occur
- No project root checks should happen

---

### Step 5: Add Unit Tests (tests/unit/orchestrator/cli.test.ts)

**Task:** Add test cases for help flag parsing and display

Add to existing test file:

```typescript
describe('CLI --help flag', () => {
  it('should parse --help flag', () => {
    const args = parseArgs(['node', 'cli.js', '--help']);
    expect(args.help).toBe(true);
  });

  it('should parse --help with other flags', () => {
    const args = parseArgs(['node', 'cli.js', '--help', '--llm', 'off']);
    expect(args.help).toBe(true);
    expect(args.llm).toBe('off');
  });

  it('should parse --help with finalize command', () => {
    const args = parseArgs(['node', 'cli.js', 'finalize', '--help']);
    expect(args.help).toBe(true);
    expect(args.command).toBe('finalize');
  });

  it('should parse --version flag', () => {
    const args = parseArgs(['node', 'cli.js', '--version']);
    expect(args.version).toBe(true);
  });

  it('should print help text without errors', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    printHelp('0.2.0-test');
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('ceps v0.2.0-test');
    expect(output).toContain('USAGE:');
    expect(output).toContain('COMMANDS:');
    expect(output).toContain('OPTIONS:');
    expect(output).toContain('EXAMPLES:');
    consoleSpy.mockRestore();
  });

  // Addresses Review Recommendation 3: Help structure snapshot test
  it('should document all CLI flags in help text', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    printHelp('0.2.0-test');
    const output = consoleSpy.mock.calls[0][0];

    // Assert all major sections present
    expect(output).toContain('USAGE:');
    expect(output).toContain('COMMANDS:');
    expect(output).toContain('GENERAL OPTIONS:');
    expect(output).toContain('LLM CONFIGURATION:');
    expect(output).toContain('EXECUTION CONTROL:');
    expect(output).toContain('SNAPSHOT CONTROL:');
    expect(output).toContain('FINALIZATION OPTIONS:');
    expect(output).toContain('EXAMPLES:');
    expect(output).toContain('EXIT CODES:');
    expect(output).toContain('ENVIRONMENT VARIABLES:');

    // Assert implemented flags are documented
    const requiredFlags = [
      '--help', '--version', '--llm', '--llm-provider', '--llm-model',
      '--llm-budget', '--no-llm-cache', '--deterministic', '--max-workers',
      '--no-snapshot', '--answers', '--dry-run', '--reconcile',
      '--finalize-max-hops', '--finalize-max-nodes', '--finalize-scope'
    ];

    for (const flag of requiredFlags) {
      expect(output).toContain(flag);
    }

    consoleSpy.mockRestore();
  });
});
```

**Test:** Run `npm test -- cli.test.ts` and verify all tests pass

---

### Step 6: Add Integration Test (tests/integration/cli-help.test.ts)

**Task:** Create new integration test file for end-to-end help display

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../../src/orchestrator/index.js';

describe('CLI Help Integration', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should display help and exit with code 0', async () => {
    const exitCode = await run(['node', 'cli.js', '--help']);

    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalled();

    const output = consoleLogSpy.mock.calls.map((call: any) => call[0]).join('\n');
    expect(output).toContain('ceps v');
    expect(output).toContain('USAGE:');
    expect(output).toContain('baseline');
    expect(output).toContain('finalize');
  });

  it('should display help without requiring API keys', async () => {
    // Temporarily clear API keys
    const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const originalOpenaiKey = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const exitCode = await run(['node', 'cli.js', '--help']);

    expect(exitCode).toBe(0);

    // Restore keys
    if (originalAnthropicKey) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    if (originalOpenaiKey) process.env.OPENAI_API_KEY = originalOpenaiKey;
  });

  it('should display help without requiring valid project root', async () => {
    const exitCode = await run(['node', 'cli.js', '/nonexistent/path', '--help']);
    expect(exitCode).toBe(0);
  });
});
```

**Test:** Run `npm test -- cli-help.test.ts` and verify all tests pass

---

### Step 7: Manual Verification

**Task:** Test the feature manually in real terminal

```bash
# Build the project
npm run build

# Test help display
node dist/orchestrator/index.js --help

# Test version display (Addresses Review Recommendation 5)
node dist/orchestrator/index.js --version

# Test with different commands
node dist/orchestrator/index.js baseline --help
node dist/orchestrator/index.js finalize --help

# Test with npm start
npm start -- --help
npm start -- --version
```

**Verify (Addresses Review Recommendation 5):**
- [ ] Help text displays correctly
- [ ] Version flag works (`node dist/orchestrator/index.js --version`)
- [ ] No errors or warnings
- [ ] Exit code is 0 for both --help and --version (`echo $?` after running)
- [ ] Formatting looks good in terminal
- [ ] All flags in CliArgs interface are documented
- [ ] Examples are correct and runnable
- [ ] No API key errors when displaying help

---

## Test Coverage Requirements

### Unit Tests (cli.test.ts)
- ✅ Parse `--help` flag alone
- ✅ Parse `--help` with other flags
- ✅ Parse `--help` with commands
- ✅ `printHelp()` outputs expected content

### Integration Tests (cli-help.test.ts)
- ✅ End-to-end help display with exit code 0
- ✅ Help works without API keys
- ✅ Help works without valid project root
- ✅ Help bypasses validation

**Target:** 100% coverage for new code paths

---

## Edge Cases & Considerations

### Edge Case 1: Help with Invalid Flags
**Scenario:** `ceps --help --invalid-flag`

**Expected:** Display help and exit 0 (ignore invalid flags when help is present)

**Rationale:** Help should always work, even if other args are malformed

**Implementation:** Check `args.help` before any validation in `validateArgs()`

### Edge Case 2: Help Position
**Scenario:** `ceps /some/path --llm off --help`

**Expected:** Display help and exit 0 (help flag takes precedence)

**Rationale:** Standard CLI behavior - help overrides everything

**Current Implementation:** Already handled by checking in `run()` before validation

### Edge Case 3: No Arguments
**Scenario:** `ceps` (no arguments)

**Expected:** Use current directory as project root (existing behavior)

**Decision:** DO NOT show help automatically - maintain backward compatibility

**Alternative:** Could add this as future enhancement if users request it

---

## Documentation Updates

### AGENTS.md
Add to "## Planned CLI Interface (SADS.md §6)" section:

```markdown
--help                                # Show usage information
```

### CHANGELOG.md (if exists)
Add entry:

```markdown
## [Unreleased]
### Added
- `--help` flag to display comprehensive CLI usage information
```

---

## Rollout Plan

### Step 1: Implementation (20 min)
1. Add types and parsing logic
2. Write `printHelp()` function
3. Integrate into `run()` function

### Step 2: Testing (10 min)
1. Write unit tests
2. Write integration tests
3. Run full test suite: `npm test`
4. Verify coverage: `npm run test:coverage`

### Step 3: Manual QA (5 min)
1. Build project: `npm run build`
2. Test various `--help` scenarios
3. Verify formatting in terminal
4. Check exit codes

### Step 4: Commit
```bash
git add src/orchestrator/cli.ts src/orchestrator/index.ts tests/
git commit -m "Add --help flag to display CLI usage information

- Add help flag parsing to CLI argument parser
- Create printHelp() function with comprehensive usage docs
- Integrate help display before validation (no API keys needed)
- Add unit tests for flag parsing and help output
- Add integration tests for end-to-end help behavior
- Maintain backward compatibility (no args = use cwd)

All tests passing. Coverage maintained at 93%+."
```

---

## Success Criteria

- [ ] `--help` flag displays comprehensive usage information
- [ ] Help includes all commands, options, examples, and exit codes
- [ ] Help works without API keys or valid project root
- [ ] Help exits with code 0
- [ ] All unit tests pass (100% coverage of new code)
- [ ] All integration tests pass
- [ ] Manual testing confirms good UX
- [ ] Full test suite still passes: `npm test`
- [ ] Coverage remains ≥93%: `npm run test:coverage`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

---

## Risks & Mitigations

### Risk 1: Breaking Existing Behavior
**Likelihood:** Low

**Impact:** Medium

**Mitigation:**
- Check `args.help` early but after parsing (preserves all existing logic)
- Extensive testing of edge cases
- No changes to validation logic

### Risk 2: Help Text Becomes Stale
**Likelihood:** Medium (as flags are added/changed)

**Impact:** Low (incorrect docs)

**Mitigation:**
- Add comment in `printHelp()` to update when CLI changes
- Consider adding test that compares `CliArgs` interface fields to documented flags (future enhancement)

### Risk 3: Test Coverage Drop
**Likelihood:** Low

**Impact:** High (CI would fail)

**Mitigation:**
- Comprehensive unit and integration tests
- Check coverage locally before committing
- CI enforces coverage requirements

---

## Future Enhancements (Out of Scope)

1. **Auto-generate help from schema:** Parse `CliArgs` interface and flag descriptions from comments
2. **Man page:** Generate traditional Unix man page
3. **Command-specific help:** `ceps finalize --help` shows only finalize-relevant flags
4. **Interactive mode:** `ceps --help | less` for better scrolling
5. **Help validation test:** Automated check that all `CliArgs` fields are documented in help

---

## Time Estimate Breakdown

**Original Estimate:** 32 minutes

**Revised Estimate (with review recommendations):**
- Step 1 (Types): 2 min
- Step 2 (Parsing + Version flag): 5 min (+2 min for version)
- Step 3 (Help Text + JSDoc): 12 min (+2 min for JSDoc and unimplemented flags)
- Step 4 (Integration): 2 min
- Step 5 (Unit Tests + Snapshot test): 8 min (+3 min for comprehensive snapshot test)
- Step 6 (Integration Tests): 5 min
- Step 7 (Manual QA + Version testing): 6 min (+1 min for version testing)
- Documentation updates: 5 min (AGENTS.md)
- **Total: ~45 minutes**

---

## Reviewers

Please review:
1. **Help text accuracy:** Are all flags documented correctly?
2. **Examples relevance:** Do examples reflect common use cases?
3. **Edge case handling:** Are all scenarios covered in tests?
4. **Code quality:** Does it follow TDD principles and existing patterns?
5. **Documentation:** Are updates to AGENTS.md clear?

---

## References

- SADS.md §6: Interfaces & Configuration (CLI)
- AGENTS.md: Implementation Approach (TDD-First)
- src/orchestrator/cli.ts: Existing CLI parser
- tests/unit/orchestrator/cli.test.ts: Existing unit tests
