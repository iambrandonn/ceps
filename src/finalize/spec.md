# src/finalize

**Directory Overview:** This directory contains 7 entities.

## answers.ts

<a id="A3G816X7je"></a>

### parseAnswers

**Signature:** `(markdown: string, _options: AnswerParseOptions = {}): import("/src/finalize/answers").AnswerParseResult`

**Visibility:** Public (exported)

**Behavior:**

- Function parseAnswers: 
Parse raw Markdown containing QID→answer mappings.
The grammar supports `q:<QID>: answer` entries with optional 4-space indented continuations,
blank lines, and comments beginning with `#`.

<a id="ieCddpmuTx"></a>

### parseAnswersFromFile

**Signature:** `(filePath: string, options: AnswerParseOptions = {}): import("/src/finalize/answers").AnswerParseResult`

**Visibility:** Public (exported)

**Behavior:**

- Function parseAnswersFromFile: 
Convenience helper that reads an answers file from disk (UTF-8) and parses its contents.

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(`Failed to read answers file at ${absolute}: ${message}`);

<a id="fnHuvuBa3b"></a>

### ingestAnswers

**Signature:** `(kb: KnowledgeBase, parseResult: AnswerParseResult, options: AnswerIngestionOptions = {}): import("/src/finalize/answers").AnswerIngestionReport`

**Visibility:** Public (exported)

**Behavior:**

- Function ingestAnswers: 
Validate and apply parsed answers against the supplied KnowledgeBase.
Returns structured diagnostics suitable for CLI dry-run output.

## impact-scope.ts

<a id="bb3mpB2vtc"></a>

### computeImpactReport

**Signature:** `(kb: KnowledgeBase, resolvedQids: string[], options: ImpactScopeOptions = {}): import("/src/finalize/impact-scope").ImpactReport`

**Visibility:** Public (exported)

**Behavior:**

- Function computeImpactReport (intent unclear from static analysis)

## reanalysis.ts

<a id="93hgptxV55"></a>

### reanalyzeEntities

**Signature:** `(kb: KnowledgeBase, impactReport: ImpactReport, options: ReanalysisOptions): Promise<import("/src/finalize/reanalysis").ReanalysisResult>`

**Visibility:** Public (exported)

**Behavior:**

- Function reanalyzeEntities (intent unclear from static analysis)

**Side effects:**
- filesystem

<a id="3jaaI8o5VJ"></a>

### SnapshotMismatchError

**Visibility:** Public (exported)

**Behavior:**

- Class SnapshotMismatchError (intent unclear from static analysis)

**Open Questions:**
- q:mWTRnvCsN7: What are the responsibilities and contract of class `SnapshotMismatchError` at src/finalize/reanalysis.ts?

## spec-patcher.ts

<a id="vrydbUpGHG"></a>

### patchSpecificationFiles

**Signature:** `(projectRoot: string, kb: KnowledgeBase, impactReport: ImpactReport, reanalysis: ReanalysisResult, options: SpecPatchOptions = {}): import("/src/finalize/spec-patcher").SpecPatchReport`

**Visibility:** Public (exported)

**Behavior:**

- Function patchSpecificationFiles (intent unclear from static analysis)

**Side effects:**
- filesystem

