# src/orchestrator

**Directory Overview:** This directory contains 8 entities.

## cli.ts

<a id="gcSNCt5Elc"></a>

### parseArgs

**Signature:** `(argv: string[]): import("/src/orchestrator/cli").CliArgs`

**Visibility:** Public (exported)

This function performs an operation.

**Errors thrown:**
- new Error('--max-workers requires a value');
- new Error('--max-workers must be a positive integer');

<a id="lPEJ9a15T8"></a>

### validateArgs

**Signature:** `(args: CliArgs): void`

**Visibility:** Public (exported)

This function validates input.

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(`Project root does not exist: ${args.projectRoot}`);
- new Error(`Project root is not a directory: ${args.projectRoot}`);

## index.ts

<a id="jGCgdikVQf"></a>

### run

**Signature:** `(argv: string[]): Promise<number>`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

## orchestrator.ts

<a id="lLguhmXutC"></a>

### Orchestrator

**Visibility:** Public (exported)

This class represents orchestrator.

<a id="a9rpQpThu3"></a>

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

