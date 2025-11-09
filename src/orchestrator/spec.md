# src/orchestrator

**Directory Overview:** This directory contains 11 entities.

## cli.ts

<a id="ZteukfxsXo"></a>

### parseArgs

**Signature:** `(argv: string[]): import("/src/orchestrator/cli").CliArgs`

**Visibility:** Public (exported)

**Behavior:**

- Function parseArgs (intent unclear from static analysis)

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

**Behavior:**

- Function validateArgs (intent unclear from static analysis)

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

<a id="AkzwdkSpC8"></a>

### printHelp

**Signature:** `(version: string = '0.2.0'): void`

**Visibility:** Public (exported)

**Behavior:**

- Function printHelp: 
Displays comprehensive CLI usage information.

IMPORTANT: Update this function when CLI flags change.
See SADS.md §6.2 for authoritative flag list.


## index.ts

<a id="y6iWEPRQSr"></a>

### run

**Signature:** `(argv: string[]): Promise<number>`

**Visibility:** Public (exported)

**Behavior:**

- Function run (intent unclear from static analysis)

**Errors thrown:**
- new Error('Run summary unavailable');

## orchestrator.ts

<a id="uCriIGRqFO"></a>

### Orchestrator

**Visibility:** Public (exported)

**Behavior:**

- Class Orchestrator (intent unclear from static analysis)

**Open Questions:**
- q:hs52xPNjsK: What are the responsibilities and contract of class `Orchestrator` at src/orchestrator/orchestrator.ts?

<a id="8duzXi7JdW"></a>

### run

**Signature:** `(): Promise<void>`

**Visibility:** Public (exported)

**Behavior:**

- Method run (intent unclear from static analysis)

**Open Questions:**
- q:pkMWT4sapd: What is the behavior of method `run` at src/orchestrator/orchestrator.ts?

<a id="0VkuvO050d"></a>

### runUntil

**Signature:** `(targetPhase: PipelinePhase): Promise<void>`

**Visibility:** Public (exported)

**Behavior:**

- Method runUntil (intent unclear from static analysis)

**Open Questions:**
- q:PRgh4iXpwP: What is the behavior of method `runUntil` at src/orchestrator/orchestrator.ts?

<a id="GHRwJlWdUe"></a>

### getKnowledgeBase

**Signature:** `(): import("/src/kb/knowledge-base").KnowledgeBase`

**Visibility:** Public (exported)

**Behavior:**

- Method getKnowledgeBase: Retrieves data or value

**Open Questions:**
- q:z1TPWNP40y: What is the behavior of method `getKnowledgeBase` at src/orchestrator/orchestrator.ts?

<a id="2lDjctGoZ7"></a>

### getStatus

**Signature:** `(): import("/src/orchestrator/orchestrator").PipelineStatus`

**Visibility:** Public (exported)

**Behavior:**

- Method getStatus: Retrieves data or value

**Open Questions:**
- q:CqdE37anuV: What is the behavior of method `getStatus` at src/orchestrator/orchestrator.ts?

<a id="4JYM9algAR"></a>

### getRunSummary

**Signature:** `(): any`

**Visibility:** Public (exported)

**Behavior:**

- Method getRunSummary: Retrieves data or value

**Open Questions:**
- q:ExDdIUB9pM: What is the behavior of method `getRunSummary` at src/orchestrator/orchestrator.ts?

<a id="TdUO4TOcgA"></a>

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

**Behavior:**

- Method runFinalize (intent unclear from static analysis)

**Errors thrown:**
- new Error('Snapshot mismatch: use --reconcile to proceed anyway');
- new Error('Failed to parse answers.md');

