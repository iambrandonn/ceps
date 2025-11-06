# src/orchestrator

**Directory Overview:** This directory contains 10 entities.

## cli.ts

<a id="8VB8UVyOMM"></a>

### parseArgs

**Signature:** `(argv: string[]): import("/src/orchestrator/cli").CliArgs`

**Visibility:** Public (exported)

This function performs an operation.

**Errors thrown:**
- new Error('--max-workers requires a value');
- new Error('--max-workers must be a positive integer');
- new Error('--llm requires a value');
- new Error('--llm must be either "on" or "off"');
- new Error('--llm-provider requires a value');
- new Error('--llm-model requires a value');
- new Error('--llm-budget requires a value');
- new Error('--answers requires a value');
- new Error('--finalize-max-hops requires a value');
- new Error('--finalize-max-nodes requires a value');
- new Error('--finalize-scope requires a value');
- new Error('--finalize-out is not supported in Phase 5');
- new Error(`Unknown command: ${first}. Supported commands: ${knownCommands.join(', ')}`);

<a id="komzCYtZpT"></a>

### validateArgs

**Signature:** `(args: CliArgs, filesystem: FileSystem = fs): void`

**Visibility:** Public (exported)

This function validates input.

**Errors thrown:**
- new Error(
        `Invalid provider: ${args.llmProvider}. Supported: ${validProviders.join(', ')}`
      );
- new Error('--llm-budget must be a positive integer');
- new Error('finalize command requires --answers <path>');
- new Error('--finalize-max-hops must be a positive integer');
- new Error('--finalize-max-nodes must be a positive integer');
- new Error('--finalize-scope must be either "auto" or "full"');
- new Error('--no-snapshot is only valid for baseline command');
- new Error(`Answers file does not exist: ${args.answersPath}`);
- new Error('Baseline run required before finalization: .ceps/kb-state.json not found');
- new Error(`Project root does not exist: ${args.projectRoot}`);
- new Error(`Project root is not a directory: ${args.projectRoot}`);

## index.ts

<a id="Z5moFTlBE4"></a>

### run

**Signature:** `(argv: string[]): Promise<number>`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

## orchestrator.ts

<a id="YGvV6odFq9"></a>

### Orchestrator

**Visibility:** Public (exported)

This class represents orchestrator.

<a id="8duzXi7JdW"></a>

### run

**Signature:** `(): Promise<void>`

**Visibility:** Public (exported)

This method performs an operation.

<a id="0VkuvO050d"></a>

### runUntil

**Signature:** `(targetPhase: PipelinePhase): Promise<void>`

**Visibility:** Public (exported)

This method performs an operation.

<a id="GHRwJlWdUe"></a>

### getKnowledgeBase

**Signature:** `(): import("/src/kb/knowledge-base").KnowledgeBase`

**Visibility:** Public (exported)

This method retrieves data.

<a id="2lDjctGoZ7"></a>

### getStatus

**Signature:** `(): import("/src/orchestrator/orchestrator").PipelineStatus`

**Visibility:** Public (exported)

This method retrieves data.

<a id="4JYM9algAR"></a>

### getRunSummary

**Signature:** `(): any`

**Visibility:** Public (exported)

This method retrieves data.

<a id="wOwuLnlIsc"></a>

### runFinalize

**Signature:** `(config: {
    answersPath: string;
    dryRun: boolean;
    reconcile: boolean;
    deterministicMode: boolean;
    scope: 'auto' | 'full';
    maxHops: number;
    maxNodes: number;
    llmEnabled: boolean;
    llmGateway?: LLMGateway;
    validator?: Validator;
    budgetTracker?: BudgetTracker;
  }): Promise<{ summary: any; exitCode: 0 | 3 | 4; }>`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- new Error('Snapshot mismatch: use --reconcile to proceed anyway');
- new Error('Failed to parse answers.md');

