# src/orchestrator

**Directory Overview:** This directory contains 9 entities.

## cli.ts

<a id="HiDsoYnfBC"></a>

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

<a id="TJpbnoBFmd"></a>

### validateArgs

**Signature:** `(args: CliArgs): void`

**Visibility:** Public (exported)

This function validates input.

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(
        `Invalid provider: ${args.llmProvider}. Supported: ${validProviders.join(', ')}`
      );
- new Error('--llm-budget must be a positive integer');
- new Error(`Project root does not exist: ${args.projectRoot}`);
- new Error(`Project root is not a directory: ${args.projectRoot}`);

## index.ts

<a id="cpEnwqJny1"></a>

### run

**Signature:** `(argv: string[]): Promise<number>`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

## orchestrator.ts

<a id="irwStWlfxE"></a>

### Orchestrator

**Visibility:** Public (exported)

This class represents orchestrator.

<a id="y58zvd9Mxy"></a>

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

